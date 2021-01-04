const express = require('express')

const ReportController = require('../Controllers/ReportController')

module.exports = () => {
  const router = express.Router()

  /**
   * ---
   * $body:
   *  target: User or Conversation
   *  reportedUser: ObjectId
   *  reportedConversation: ObjectId
   *  reason: Offensive, Harrassment, Spam, or FakeProfile
   * $returns:
   *  description: success true or false
   *  type: JSON
   * ---
   */
  router.post('/', ReportController.createReport)

  return router
}
