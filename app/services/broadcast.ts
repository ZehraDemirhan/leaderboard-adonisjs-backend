import Pusher from 'pusher'
import { createHmac } from 'node:crypto'
import { broadcastingConfig } from '#config/broadcasting'

class Broadcast {
  private pusher = new Pusher({
    appId: broadcastingConfig.appId,
    key: broadcastingConfig.appKey,
    secret: broadcastingConfig.appSecret,
    cluster: 'eu',
    useTLS: true,
  })

  public async channel(channel: string, event: string, data: any) {
    return this.pusher.trigger(channel, event, data)
  }

  public authorizeChannel(socketId: string, channel: string) {
    const hmac = createHmac(broadcastingConfig.authorizationAlgorithm, broadcastingConfig.appSecret)
    hmac.update(`${socketId}:${channel}`)
    return { auth: `${broadcastingConfig.appKey}:${hmac.digest('hex')}` }
  }
}

export default new Broadcast()
