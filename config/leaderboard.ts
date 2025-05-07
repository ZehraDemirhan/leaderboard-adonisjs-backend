import env from '#start/env'

const leaderboardConfig = {
  bucketCount: env.get('LEADERBOARD_BUCKET_COUNT', 1000),
  intervalPeriod: env.get('LEADERBOARD_INTERVAL_PERIOD', 3),
  apiNinjakey: env.get('API_NINJAS_KEY', '4Hn1dYOdLR4bWL1GIvbDYQ==rzZN0GAIcmhhVMuw'), // Interval in minutes
  maxPlayerId: env.get('LEADERBOARD_MAX_PLAYER_ID', 100000),
  simulationCount: env.get('LEADERBOARD_SIMULATION_COUNT', 100),
  maxEarning: env.get('LEADERBOARD_MAX_EARNING', 10000),
  simulateEarningsInterval: env.get('SIMULATE_EARNINGS_INTERVAL', 1),
}

export default leaderboardConfig
