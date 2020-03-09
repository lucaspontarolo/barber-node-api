import jwt from 'jsonwebtoken'
import * as yup from 'yup'

import authconfig from '../../config/auth'
import User from '../models/User'

class SessionController {
  async store(req, res) {
    const schema = yup.object().shape({
      email: yup
        .string()
        .email()
        .required(),
      password: yup.string().required(),
    })

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation error!' })
    }

    const { email, password } = req.body
    const user = await User.findOne({ where: { email } })

    if (!user) {
      return res.status(401).json({ message: 'User not found!' })
    }

    if (!(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Password does not match!' })
    }

    const { id, name } = user
    return res.json({
      user: { id, name, email },
      token: jwt.sign({ id }, authconfig.secret, {
        expiresIn: authconfig.expiresIn,
      }),
    })
  }
}

export default new SessionController()
