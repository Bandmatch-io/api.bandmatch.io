const express = require('express')
const MessageController = require('../Controllers/MessageController')

module.exports = () => {
  const router = express.Router()

  router.get('/unread', MessageController.unreadMessageCount)

  /* GET users listing. */
  router.get('/', MessageController.fetchAllConversations)

  router.get('/:id', MessageController.getConversationData)

  router.post('/message', MessageController.sendMessage)

  router.delete('/:id', MessageController.deleteConvo)

  router.patch('/read/:id', MessageController.markAsRead)

  return router
}
