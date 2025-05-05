import router from '@adonisjs/core/services/router'

const LeaderboardController = () => import('#controllers/leaderboard_controller')
const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.get('/leaderboard', [LeaderboardController, 'index'])
    router.get('/leaderboard/autocomplete', [LeaderboardController, 'autocomplete'])
    router.post('/broadcast/channel', [AuthController, 'channel'])
  })
  .prefix('api/v1')
