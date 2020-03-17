import * as yup from 'yup'
import { startOfHour, isBefore, parseISO, format, subHours } from 'date-fns'
import pt from 'date-fns/locale/pt-BR'
import Appointment from '../models/Appointment'
import User from '../models/User'
import File from '../models/File'
import Notification from '../schemas/Notification'

import CancellationMail from '../jobs/CancellationMail'
import Queue from '../../lib/Queue'

class AppointmentController {
  async index(req, res) {
    const appointments = await Appointment.findAll({
      attributes: ['id', 'date', 'past', 'cancelable'],
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

    const checkIsProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    })

    if (!checkIsProvider) {
      return res
        .status(400)
        .json({ error: 'You can only create appointments with providers!' })
    }

    const hourStart = startOfHour(parseISO(date))
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past date are not permited.' })
    }

    const checkAvaliability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    })

    if (checkAvaliability) {
      return res
        .status(400)
        .json({ error: 'Appointent date is not avaliable.' })
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    })

    const user = await User.findByPk(req.userId)
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', ás' H:mm'h'",
      { locale: pt }
    )

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    })

    return res.json(appointment)
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    })

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      })
    }

    const dateWithSub = subHours(appointment.date, 2)
    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: "You can't cancel appoint with less than 2 hours.",
      })
    }

    appointment.canceled_at = new Date()
    await appointment.save()

    Queue.add(CancellationMail.key, { appointment })
    return res.json(appointment)
  }
}

export default new AppointmentController()
