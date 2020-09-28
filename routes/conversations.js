var express = require('express')
var MessageController = require('../Controllers/MessageController')

module.exports = () => {
  var router = express.Router()

  /* GET users listing. */
  router.get('/', MessageController.fetchAllConversations)

  router.get('/:id', MessageController.getConversationData)

  router.post('/message', MessageController.sendMessage)

  router.delete('/:id', MessageController.deleteConvo)

  router.patch('/read/:id', MessageController.markAsRead)

  router.get('/conversations/unread', MessageController.unreadMessageCount)

  return router
}
