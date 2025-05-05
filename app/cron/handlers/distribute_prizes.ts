import { distributePrizesAndReset } from '#services/leaderboard_service'
import Redis from '@adonisjs/redis/services/main'
import leaderboardConfig from '#config/leaderboard'

export default class DistributePrizes {
  public async run() {
    const next = new Date(Date.now() + leaderboardConfig.intervalPeriod * 60 * 1000).toISOString()
    console.log(next)
    await Redis.connection('cluster').set('leaderboard:nextResetAt', next)
    await distributePrizesAndReset()
    console.info(`Prize distribution complete. Next at ${next}`)
  }
}
