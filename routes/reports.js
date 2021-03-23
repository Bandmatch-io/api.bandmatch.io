const express = require('express')
const mongoose = require('mongoose')

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
  router.post('/', async (req, res, next) => {
    const target = req.body.target
    const reportedUser = req.body.reportedUser
    const reason = req.body.reason

    // Check that all required fields are present
    if (target === undefined) {
      return res.status(400).json({ success: false, error: { target: { absent: true } } })
    }
    if (target !== 'User' && target !== 'Conversation') {
      return res.status(400).json({ success: false, error: { target: { invalid: true } } })
    }

    if (reason === undefined) {
      return res.status(400).json({ success: false, error: { reason: { absent: true } } })
    }
    if (reason !== 'Offensive' && reason !== 'Harrassment' && reason !== 'Spam' && reason !== 'FakeProfile') {
      return res.status(400).json({ success: false, error: { reason: { invalid: true } } })
    }

    // Check given ids are valid
    if (reportedUser !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(reportedUser)) {
        return res.status(400).json({ success: false, error: { reportedUser: { invalid: true } } })
      }
    } else {
      return res.status(400).json({ success: false, error: { reportTarget: { absent: true } } })
    }

    const result = await ReportController.CreateReport(target, reportedUser, reason).catch(err => next(err))
    if (!result.ok) {
      return res.status(400).json({ success: false })
    }
    return res.json({ success: true })
  })

  return router
}
