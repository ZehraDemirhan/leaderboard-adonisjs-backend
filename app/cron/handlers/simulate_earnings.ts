import { addEarnings } from '#services/leaderboard_service'
import leaderboardConfig from '#config/leaderboard'

export default class SimulateEarnings {
  public async run() {
    const total = leaderboardConfig.simulationCount // e.g. 100_000

    const tasks = Array.from({ length: total }, () => {
      const randomPlayerId = Math.floor(Math.random() * leaderboardConfig.maxPlayerId) + 1
      const randomAmount = Math.floor(Math.random() * leaderboardConfig.maxEarning) + 1

      return addEarnings(randomPlayerId, randomAmount).catch((err) => {
        console.error(`Error adding for player ${randomPlayerId}:`, err)
      })
    })

    await Promise.all(tasks)

    console.log(`Cron: Simulated earnings for ${total.toLocaleString()} players (parallel).`)
  }
}
