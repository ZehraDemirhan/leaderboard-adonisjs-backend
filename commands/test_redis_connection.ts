import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Redis from '@adonisjs/redis/services/main'

export default class TestRedisConnection extends BaseCommand {
  static commandName = 'test:redis-connection'
  static description = 'Tests Redis connection'

  static options: CommandOptions = {
    startApp: true,
  }

  declare loaded: boolean

  async run() {
    const redis = Redis.connection('cluster')
    console.log('Redis connection established.')

    await redis.set('test:key', 'REDİS ÇALIŞIYOR!')
    const value = await redis.get('test:key')

    console.log(value)
  }
}
