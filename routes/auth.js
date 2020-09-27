var express = require('express')
var AuthController = require('../Controllers/AuthController')
var StatController = require('../Controllers/StatController')
var UserController = require('../Controllers/UserController')

module.exports = (passport) => {
  var router = express.Router()

  router.patch('/password/update', AuthController.updatePassword)

  router.patch('/password/:str', AuthController.setNewPassword)

  router.post('/new', AuthController.createUser)

  /**
   * ---
   * $route:
   *  method: POST
   *  endpoint: /users/
   * $body:
   *  type: application/json
   *  content:
   *    email: string
   *    password: string
   * $returns:
   *  description: success and user
   *  type: JSON
   * ---
   * Logs in the user
   */
  router.post('/', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        next(err)
      }

      // Check for errors with log in
      if (!user) {
        if (info.emailOK !== undefined) {
          res.status(400)
          return res.json({ success: false, error: { email: { invalid: true } } })
        }
        if (info.passwordOK !== undefined) {
          res.status(400)
          return res.json({ success: false, error: { password: { invalid: true } } })
        }
      }

      // log in and increment logins stat
      req.login(user, function (err) {
        if (err) {
          return next(err)
        }

        if (!user.admin) {
          // only incremement stat if user is non-admin
          StatController.incrementStat('logins')
        }
        if (user) {
          res.json({ success: true, user: UserController.sanitiseUser(user) })
        } else {
          res.status(400)
          res.json({ succes: false, error: { credentials: { missing: true } } })
        }
      })
    })
  })

  return router
}
