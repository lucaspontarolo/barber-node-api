import * as yup from 'yup'
import Appointment from '../models/Appointment'
import User from '../models/User'

class AppointmentController {
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
