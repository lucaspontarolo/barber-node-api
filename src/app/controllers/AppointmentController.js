import * as yup from 'yup'
import { startOfHour, isBefore, parseISO } from 'date-fns'
import Appointment from '../models/Appointment'
import User from '../models/User'
import File from '../models/File'

class AppointmentController {
  async index(req, res) {
    const appointments = await Appointment.findAll({
      attributes: ['id', 'date'],
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    })

    return res.json(appointments)
  }

  async store(req, res) {
    const { provider_id, date } = req.body

    const schema = yup.object().shape({
      date: yup.date().required(),
      provider_id: yup.number().required(),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error!' })
    }

    /** Check if user is a provider */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    })

    const hourStart = startOfHour(parseISO(date))
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past date are not permited.' })
    }

    const checkAvaliability = await Appointment.findOne({
      where: {
        provider_id,
        cancelled_at: null,
        date: hourStart,
      },
    })

    if (checkAvaliability) {
      return res
        .status(400)
        .json({ error: 'Appointent date is not avaliable.' })
    }

    if (!isProvider) {
      return res
        .status(400)
        .json({ error: 'You can only create appointments with providers!' })
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    })

    return res.json(appointment)
  }
}

export default new AppointmentController()
