import env from '#start/env'

const leaderboardConfig = {
  bucketCount: env.get('LEADERBOARD_BUCKET_COUNT', 1000),
  cronJobStartDate: '2025-05-04T17:10:00.020Z',
  intervalPeriod: env.get('LEADERBOARD_INTERVAL_PERIOD', 50),
  apiNinjakey: env.get('API_NINJAS_KEY', '4Hn1dYOdLR4bWL1GIvbDYQ==rzZN0GAIcmhhVMuw'), // Interval in minutes
  maxPlayerId: 10000000,
  simulationCount: 100000,
  maxEarning: 100000,
}

export default leaderboardConfig
