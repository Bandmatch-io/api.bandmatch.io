const express = require('express')
const mongoose = require('mongoose')

const UserController = require('../Controllers/UserController')

const User = require('../Database/Models/User')
const Conversation = require('../Database/Models/Conversation')

module.exports = () => {
  const router = express.Router()

  router.get('/profile', async (req, res, next) => {
    const me = req.user._id
    if (!me) {
      return res.status(401).json({ success: false, error: { login: { absent: true } } })
    }

    const result = await UserController.GetUser(me).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true, user: result.doc })
  })

  /**
   * ---
   * $route:
   *  method: GET
   *  endpoint: /users/profile/confirm_token/<token>
   * $returns:
   *  description: success
   *  type: JSON
   * ---
   * Resends the confirm email message
   */
  router.get('/profile/confirm_token/:token', async (req, res, next) => {
    const token = req.params.token

    if (!token) {
      return res.status(400).json({ success: false, error: { token: { missing: true } } })
    }

    const result = await UserController.GetProfileFromConfirmToken(token).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true, user: result.doc })
  })

  router.get('/profile/:id', async (req, res, next) => {
    const usr = req.params.id
    if (!usr) {
      res.status(401).json({ success: false, error: { id: { missing: true } } })
    }

    const result = await UserController.GetUser(usr).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true, user: result.doc })
  })

  router.get('/admins/list', async (req, res, next) => {
    const result = await UserController.GetAdmins().catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false })
    }
    res.json({ success: true, users: result.docs })
  })

  router.patch('/profile', async (req, res, next) => {
    const me = req.user._id
    if (!me) {
      return res.status(401).json({ success: false, error: { login: { absent: true } } })
    }

    const result = await UserController.UpdateSelfUser(me, req.body).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true, user: result.doc })
  })

  router.patch('/password/request', async (req, res, next) => {
    const email = req.body.email

    if (email === undefined) {
      res.status(400).json({ success: false, error: { email: { missing: true } } })
    }

    const result = await UserController.RequestNewPassword(email).catch(err => next(err))
    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true })
  })

  /**
   * ---
   * $route:
   *  method: DELETE
   *  endpoint: /
   * $returns:
   *  description: success
   *  type: JSON
   * ---
   * Deletes the logged in user in the database
   */
  router.delete('/', async (req, res, next) => {
    const me = req.user._id
    if (!me) {
      return res.status(401).json({ success: false, error: { login: { absent: true } } })
    }

    const result = await UserController.DeleteUser(me).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true })
  })

  /**
   * ---
   * $route:
   *  method: POST
   *  endpoint: /users/download
   * $returns:
   *  description: The json data
   *  type: JSON
   * ---
   * Returns the user's data as a json file
   */
  router.get('/download', async function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      return next()
    }

    const response = {}
    response.user = await User.findById(req.user._id).select('email displayName searchType genres instruments searchLocation searchRadius description active').exec()
    response.conversations = await Conversation.aggregate([{ $lookup: { from: 'messages', localField: '_id', foreignField: 'conversation', as: 'messages' } }, { $project: { participants: 1, 'messages.content': 1, 'messages.sender': 1, 'messages.timestamp': 1 } }]).exec()

    const data = JSON.stringify(response, null, '\t')
    res.setHeader('Content-disposition', `attachment; filename= ${response.user.displayName}.json`)
    res.setHeader('Content-type', 'application/json')
    res.send(data)
  })

  /**
   * ---
   * $route:
   *  method: POST
   *  endpoint: /users/block/:id
   * $params:
   *  The id of the user to block.
   * $returns:
   *  description: success
   *  type: JSON
   * ---
   * Adds a user to a blocked list
   */
  router.patch('/block/:id', function (req, res, next) {
    res.json({ implemented: false })
  })

  /**
   * ---
   * $route:
   *  method: GET
   *  endpoint: /users/confirm/resend
   * $returns:
   *  description: success
   *  type: JSON
   * ---
   * Resends the confirm email messag
   */
  router.patch('/confirm/resend', async (req, res, next) => {
    const userID = req.user._id
    if (!userID) {
      return res.status(401).json({ success: false, error: { login: { absent: true } } })
    }

    const result = await UserController.ResendEmailVerification(userID).catch(err => next(err))
    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error })
    }
    res.json({ success: true })
  })

  /**
   * ---
   * $route:
   *  method: POST
   *  endpoint: /users/confirm/:str
   * $params:
   *  str: The confirm email string
   * $returns:
   *  description: success and user
   *  type: JSON
   * ---
   * Renders the sign in page on invalid data
   */
  router.post('/confirm/:str', async (req, res, next) => {
    const confString = req.params.str
    const userID = req.user._id

    if (!confString) {
      return res.status(400).json({ success: false, error: { confirmToken: { missing: true } } })
    }
    if (!userID) {
      return res.status(400).json({ success: false, error: { login: { absent: true } } })
    }

    const result = await UserController.ConfirmEmailAddress(confString, userID).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error })
    }
    return res.json({ success: true })
  })

  return router
}
