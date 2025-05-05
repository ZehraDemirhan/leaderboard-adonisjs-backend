import env from '#start/env'

const leaderboardConfig = {
  bucketCount: env.get('LEADERBOARD_BUCKET_COUNT', 1000),
  cronJobStartDate: '2025-05-04T17:10:00.020Z',
  intervalPeriod: env.get('LEADERBOARD_INTERVAL_PERIOD', 15),
  apiNinjakey: env.get('API_NINJAS_KEY', '4Hn1dYOdLR4bWL1GIvbDYQ==rzZN0GAIcmhhVMuw'), // Interval in minutes
  maxPlayerId: env.get('LEADERBOARD_MAX_PLAYER_ID', 10000000),
  simulationCount: env.get('LEADERBOARD_SIMULATION_COUNT', 100000),
  maxEarning: env.get('LEADERBOARD_MAX_EARNING', 100000),
  simulateEarningsInterval: env.get('SIMULATE_EARNINGS_INTERVAL', 2),
}

export default leaderboardConfig
