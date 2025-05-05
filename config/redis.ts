import { defineConfig } from '@adonisjs/redis'
import env from '#start/env'

export default defineConfig({
  connection: 'cluster',

  connections: {
    cluster: {
      clusters: [
        { host: env.get('REDIS_HOST_1', 'redis-node-1'), port: env.get('REDIS_PORT_1', 7001) },
        { host: env.get('REDIS_HOST_2', 'redis-node-2'), port: env.get('REDIS_PORT_2', 7002) },
        { host: env.get('REDIS_HOST_3', 'redis-node-3'), port: env.get('REDIS_PORT_3', 7003) },
      ],

      password: env.get('REDIS_PASSWORD', ''),
      keyPrefix: env.get('APP_NAME', 'leaderboard-backend') + ':',
    },
  },
})
