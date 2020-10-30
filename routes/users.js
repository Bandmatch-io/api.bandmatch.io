var express = require('express')
var mongoose = require('mongoose')

var UserController = require('../Controllers/UserController')

var User = require('../Database/Models/User')
var Conversation = require('../Database/Models/Conversation')

module.exports = () => {
  var router = express.Router()

  router.get('/profile', UserController.getSelfUser)

  router.get('/profile/:id', UserController.getOtherUser)

  router.patch('/profile', UserController.updateSelfUser)

  router.patch('/password/request', UserController.requestNewPassword)

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
  router.delete('/', UserController.deleteUser)

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
   *  endpoint: /users/confirm/:str
   * $params:
   *  str: The confirm email string
   * $returns:
   *  description: success and user
   *  type: JSON
   * ---
   * Renders the sign in page on invalid data
   */
  router.get('/confirm/:str', UserController.confirmEmailAddress)

  return router
}
