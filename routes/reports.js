var express = require('express')

var ReportController = require('../Controllers/ReportController')

module.exports = () => {
  var router = express.Router()

  /**
   * ---
   * $body:
   *  target: 'User' or 'Conversation'
   *  reportedUser: _id
   *  reportedConversation: _id
   *  reason: 'Offensive', 'Harrassment', 'Spam', or 'FakeProfile'
   * $returns:
   *  description: success true or false
   *  type: JSON
   * ---
   */
  router.post('/', ReportController.createReport)

  return router
}
