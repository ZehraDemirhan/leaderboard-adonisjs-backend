import SimulateEarnings from '../app/cron/handlers/simulate_earnings.js'
import DistributePrizes from '../app/cron/handlers/distribute_prizes.js'
import env from '#start/env'
import scheduler from 'node-schedule'
import leaderboardConfig from '#config/leaderboard'
import { getWeekSinceCronJob } from '#services/leaderboard_service'
import Redis from '@adonisjs/redis/services/main'

// Every minute
scheduler.scheduleJob(`*/${leaderboardConfig.simulateEarningsInterval} * * * *`, async function () {
  const isSimEarningsEnabled = env.get('ENABLE_SIMULATE_EARNINGS', false)
  if (isSimEarningsEnabled) {
    console.log('SimulateEarnings start!')

    await new SimulateEarnings().run().catch((error) => console.log('SimulateEarnings: %o', error))

    console.info('SimulateEarnings finish!')
  }
})

// “*/20 * * * *” = every 20 minutes (at minute 0, 20, 40)
scheduler.scheduleJob(`*/${leaderboardConfig.intervalPeriod}  * * * *`, async () => {
  const redis = Redis.connection('cluster')
  const firstRunKey = 'cron:first'
  const existing = await redis.get(firstRunKey)
  if (!existing) {
    const now = new Date().toISOString()
    await redis.set(firstRunKey, now)
    console.log(`First cron start recorded at ${now}`)
  }

  const cronJobStartDate = await redis.get(firstRunKey)
  const currentDateMinusOneMinute = new Date()
  currentDateMinusOneMinute.setMinutes(currentDateMinusOneMinute.getMinutes() - 1)
  const weekToDistributePrizesFor = getWeekSinceCronJob(
    cronJobStartDate,
    '',
    currentDateMinusOneMinute
  )

  console.log(weekToDistributePrizesFor, 'Week to distibute prizes for.')
  await redis.set('weekToDistributePrizesFor', weekToDistributePrizesFor)

  console.log('CRON DATE', new Date())
  console.log('here')
  console.log('🔄 Running prize distribution…')
  await new DistributePrizes().run().catch((err) => {
    console.error('DistributePrizes error:', err)
  })
})
