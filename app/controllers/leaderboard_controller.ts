import type { HttpContext } from '@adonisjs/core/http'
import { getLeaderboard, getWeekSinceCronJob, poolKey } from '#services/leaderboard_service'
import Redis from '@adonisjs/redis/services/main'
import leaderboardConfig from '#config/leaderboard'
import Player from '#models/player'

export default class LeaderboardController {
  public async index({ request, response }: HttpContext) {
    const searchTerm = request.input('searchTerm', '').trim()

    const data = await getLeaderboard(searchTerm)

    const redis = Redis.connection('cluster')
    const cronJobStartDate = await redis.get('cron:first')
    const weekNumber = getWeekSinceCronJob(cronJobStartDate)
    console.log('WEEK NUMBER', weekNumber, cronJobStartDate)

    const poolVal = await Redis.connection('cluster').get(await poolKey())
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
  public async autocomplete({ request, response }: HttpContext) {
    const q = (request.input('q', '') as string).trim()
    console.log('her', q)

    // only search on 2+ chars
    if (q.length < 2) {
      return response.json([])
    }

    // prefix search, case‐insensitive
    const players = await Player.query()
      .select('id', 'name', 'country')
      .whereRaw(`LOWER(name) LIKE LOWER(?) || '%'`, [q])
      .orderByRaw(`LOWER(name) COLLATE "C" ASC`)
      .limit(10)

    return response.json(players)
  }
}
