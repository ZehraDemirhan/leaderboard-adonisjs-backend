import { addEarnings } from '#services/leaderboard_service'
import leaderboardConfig from '#config/leaderboard'

export default class SimulateEarnings {
  public async run() {
    // 1) Read how many simulations to run
    const total = leaderboardConfig.simulationCount   // e.g. 100_000

    // 2) Build an array of promises
    const tasks = Array.from({ length: total }, () => {
      // pick random player and amount
      const randomPlayerId =
        Math.floor(Math.random() * leaderboardConfig.maxPlayerId) + 1
      const randomAmount =
        Math.floor(Math.random() * leaderboardConfig.maxEarning) + 1

      // return the promise, but catch inside so one error won't reject them all
      return addEarnings(randomPlayerId, randomAmount).catch((err) => {
        console.error(`Error adding for player ${randomPlayerId}:`, err)
      })
    })

    // 3) Await them all in parallel
    await Promise.all(tasks)

    console.log(
      `Cron: Simulated earnings for ${total.toLocaleString()} players (parallel).`
    )
  }
}
