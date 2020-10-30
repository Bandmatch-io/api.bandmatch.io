var express = require('express')
var AuthController = require('../Controllers/AuthController')
var StatController = require('../Controllers/StatController')
var UserController = require('../Controllers/UserController')

module.exports = () => {
  var router = express.Router()

  router.patch('/password/update', AuthController.updatePassword)

  router.patch('/password/:str', AuthController.setNewPassword)

  router.post('/new', AuthController.createUser)

  router.post('/logout', AuthController.removeLogin)

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
  router.post('/', AuthController.loginUser)

  return router
}
