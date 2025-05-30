/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  REDIS_CONNECTION: Env.schema.enum(['local'] as const),
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT_1: Env.schema.number(),
  REDIS_PORT_2: Env.schema.number(),
  REDIS_PORT_3: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  LEADERBOARD_BUCKET_COUNT: Env.schema.number.optional(),
  ENABLE_SIMULATE_EARNINGS: Env.schema.boolean.optional(),
  LEADERBOARD_INTERVAL_PERIOD: Env.schema.number.optional(),

  API_NINJAS_KEY: Env.schema.string(),
  LEADERBOARD_MAX_PLAYER_ID: Env.schema.number.optional(),
  LEADERBOARD_SIMULATION_COUNT: Env.schema.number.optional(),
  LEADERBOARD_MAX_EARNING: Env.schema.number.optional(),
  SIMULATE_EARNINGS_INTERVAL: Env.schema.number.optional(),
})
