import User from '../models/User'
import File from '../models/File'

class ProviderController {
  async index(req, res) {
    const providers = await User.findAll({
      attributes: ['id', 'name', 'email', 'avatar_id'],
      where: { provider: true },
      include: [
        {
          model: File,
          as: 'avatar',
          attributes: ['name', 'path', 'url'],
        },
      ],
    })

    return res.json(providers)
  }
}

export default new ProviderController()
