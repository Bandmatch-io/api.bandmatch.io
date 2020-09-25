var express = require('express')

var UserController = require('../Controllers/UserController')
var StatController = require('../Controllers/StatController')

module.exports = (passport) => {
  var router = express.Router()

  router.post('/new', UserController.createUser)

  router.get('/profile/:id', UserController.getOtherUser)

  router.get('/profile', UserController.getSelfUser)

  router.patch('/profile', UserController.updateSelfUser)

  router.patch('/password', function (req, res, next) {
    res.json({ implemented: false })
  })

  router.patch('/password/update', UserController.updatePassword)

  router.patch('/password/request', UserController.requestNewPassword)

  router.patch('/password/:str', UserController.set)

  router.delete('/', UserController.deleteUser)

  router.get('/download', function (req, res, next) {
    res.json({ implemented: false })
  })

  router.patch('/block/:id', function (req, res, next) {
    res.json({ implemented: false })
  })

  router.patch('/confirm/:str', UserController.confirmEmailAddress)

  /**
   * ---
   * $route:
   *  method: POST
   *  endpoint: /users/
   * $returns:
   *  description: success and user
   *  type: JSON
   * ---
   * Renders the sign in page on invalid data
   */
  router.post('/', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        next(err)
      }

      // Check for errors with log in
      if (!user) {
        if (info.emailOK !== undefined) {
          return res.json({ success: false, error: { email: { invalid: true } } })
        }
        if (info.passwordOK !== undefined) {
          return res.json({ success: false, error: { password: { invalid: true } } })
        }
      }

      // log in and increment logins stat
      req.logIn(user, function (err) {
        if (err) {
          return next(err)
        }

        if (!user.admin) {
          // only incremement stat if user is non-admin
          StatController.incrementStat('logins')
        }
        res.json({ success: true, user: user })
      })
    })(req, res, next)
  })

  return router
}
