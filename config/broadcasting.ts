import env from '#start/env'

export const broadcastingConfig = {
  host: env.get('BROADCASTING_HOST', 'localhost'),
  port: env.get('BROADCASTING_PORT', '6001'),
  appId: env.get('BROADCASTING_APP_ID', 'app-id'),
  appKey: env.get('BROADCASTING_APP_KEY', 'app-key'),
  appSecret: env.get('BROADCASTING_APP_SECRET', 'app-secret'),
  authorizationAlgorithm: 'sha256',
}
