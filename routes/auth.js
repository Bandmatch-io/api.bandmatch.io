const express = require('express')
const AuthController = require('../Controllers/AuthController')

module.exports = () => {
  const router = express.Router()

  router.patch('/password', AuthController.updatePassword)

  router.patch('/password/:passStr', AuthController.setNewPassword)

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
