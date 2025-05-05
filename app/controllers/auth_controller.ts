import type { HttpContext } from '@adonisjs/core/http'

import Broadcast from '#services/broadcast'

export default class AuthController {
  public async channel({ request, response }: HttpContext) {
    const { socket_id, channel_name } = request.only(['socket_id', 'channel_name'])
    return response.json(Broadcast.authorizeChannel(socket_id, channel_name))
  }
}
