var express = require('express')
var MessageController = require('../Controllers/MessageController')

module.exports = () => {
  var router = express.Router()

  router.get('/unread', MessageController.unreadMessageCount)

  /* GET users listing. */
  router.get('/', MessageController.fetchAllConversations)

  router.get('/:id', MessageController.getConversationData)

  router.post('/message', MessageController.sendMessage)

  router.delete('/:id', MessageController.deleteConvo)

  router.patch('/read/:id', MessageController.markAsRead)


  return router
}
