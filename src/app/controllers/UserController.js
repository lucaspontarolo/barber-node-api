import * as yup from 'yup'
import User from '../models/User'

class UserController {
  async store(req, res) {
    const schema = yup.object().shape({
      name: yup.string().required(),
      email: yup
        .string()
        .email()
        .required(),
      password: yup
        .string()
        .min(6)
        .required(),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error!' })
    }

    const userExists = await User.findOne({
      where: { email: req.body.email },
    })

    if (userExists) {
      return res.status(400).json({ message: 'User already exists!' })
    }

    const { id, name, email, provider } = await User.create(req.body)
    return res.json({ id, name, email, provider })
  }

  async update(req, res) {
    const schema = yup.object().shape({
      name: yup.string(),
      email: yup.string().email(),
      old_password: yup.string().min(6),
      password: yup
        .string()
        .min(6)
        .when('old_password', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirm_password: yup
        .string()
        .when('password', (password, field) =>
          password ? field.required().oneOf([yup.ref('password')]) : field
        ),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error!' })
    }

    const { email, old_password: oldPassword } = req.body

    const user = await User.findByPk(req.userId)
    if (email !== user.email) {
      const userExists = await User.findOne({
        where: { email: req.body.email },
      })

      if (userExists) {
        return res.status(400).json({ message: 'User already exists!' })
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(400).json({ message: 'Password does not match!' })
    }

    const { id, name, provider } = await user.update(req.body)
    return res.json({ id, name, email, provider })
  }
}

export default new UserController()
