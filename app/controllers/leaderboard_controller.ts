import type { HttpContext } from '@adonisjs/core/http'
import { getLeaderboard, poolKey } from '#services/leaderboard_service'
import Redis from '@adonisjs/redis/services/main'
import leaderboardConfig from '#config/leaderboard'

export default class LeaderboardController {
  public async index({ request, response }: HttpContext) {
    const searchTerm = request.input('searchTerm', '').trim()

    const data = await getLeaderboard(searchTerm)

    // prize poolx
    const poolVal = await Redis.connection('cluster').get(poolKey())
    const pool = poolVal ? Number.parseFloat(poolVal) : 0

    // next reset time (ISO string)
    console.log(await Redis.connection('cluster').get('leaderboard:nextResetAt'))
    const nextResetAt =
      (await Redis.connection('cluster').get('leaderboard:nextResetAt')) ||
      new Date(Date.now() + leaderboardConfig.intervalPeriod * 60 * 1000).toISOString()

    console.log(nextResetAt)

    return response.ok({
      status: 'success',
      data,
      pool,
      nextResetAt,
    })
  }
}
