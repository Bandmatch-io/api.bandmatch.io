const express = require('express')
const AuthController = require('../Controllers/AuthController')

module.exports = () => {
  const router = express.Router()

  router.patch('/password', async (req, res, next) => {
    const oldPwd = req.body.oldPassword
    const newPwd = req.body.newPassword
    const confPwd = req.body.confirmPassword

    if (!oldPwd) {
      return res.status(400).json({ success: false, error: { oldPassword: { missing: true } } })
    }
    if (!newPwd) {
      return res.status(400).json({ success: false, error: { password: { missing: true } } })
    }
    if (newPwd !== confPwd) {
      return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
    }
    if (newPwd.length < 8) {
      return res.status(400).json({ success: false, error: { password: { invalid: true } } })
    }

    const result = await AuthController.UpdateUserPassword(req.user._id, oldPwd, newPwd).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    return res.json({ success: true })
  })

  router.patch('/password/:passStr', async (req, res, next) => {
    const passStr = req.params.passStr
    const newPwd = req.body.password
    const confPwd = req.body.confirmPassword

    if (!newPwd) {
      return res.status(400).json({ success: false, error: { password: { missing: true } } })
    }
    if (newPwd !== confPwd) {
      return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
    }
    if (newPwd.length < 8) {
      return res.status(400).json({ success: false, error: { password: { invalid: true } } })
    }

    const result = await AuthController.SetNewUserPassword(passStr, newPwd).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true })
  })

  router.post('/new', async (req, res, next) => {
    const email = req.body.email
    const name = req.body.name
    const pwd = req.body.password
    const confPwd = req.body.confirmPassword
    const agreement = req.body.agreement

    if (!agreement) {
      return res.status(400).json({ success: false, error: { consent: { missing: true } } })
    }

    // Validate fields
    if (!email) {
      return res.status(400).json({ success: false, error: { email: { missing: true } } })
    }
    if (email.length > 254) {
      return res.status(400).json({ success: false, error: { email: { invalid: true } } })
    }

    if (!name) {
      return res.status(400).json({ success: false, error: { name: { missing: true } } })
    }
    if (name.length > 16) {
      return res.status(400).json({ success: false, error: { name: { invalid: true } } })
    }

    if (!pwd) {
      return res.status(400).json({ success: false, error: { password: { missing: true } } })
    }
    if (pwd !== confPwd) {
      return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
    }
    if (pwd.length < 8) {
      return res.status(400).json({ success: false, error: { password: { invalid: true } } })
    }

    const result = await AuthController.CreateUser(email, name, pwd).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    return res.json({ success: true, token: result.doc })
  })

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
  router.post('/', async (req, res, next) => {
    if (req.body.email === undefined) {
      return res.status(400).json({ success: false, error: { email: { missing: true } } })
    }
    if (req.body.password === undefined) {
      return res.status(400).json({ success: false, error: { password: { missing: true } } })
    }
    const email = req.body.email.toLowerCase()
    const password = req.body.password

    const result = await AuthController.CheckUserLogin(email, password).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    return res.json({ success: true, token: result.token })
  })

  return router
}
