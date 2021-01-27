const Report = require('../Database/Models/Report')
const mongoose = require('mongoose')

/**
 * ---
 * $returns:
 *  description: success true|false
 *  type: JSON
 * ---
 * Creates a report in the system from.
 */
module.exports.createReport = function (req, res, next) {
  const target = req.body.target
  const reportedUser = req.body.reportedUser
  const reportedConversation = req.body.reportedConversation
  const reason = req.body.reason

  // Check that all required fields are present
  if (target === undefined) {
    return res.status(400).json({ success: false, error: { target: { absent: true } } })
  }

  if (reason === undefined) {
    return res.status(400).json({ success: false, error: { reason: { absent: true } } })
  }

  // Check given ids are valid
  if (reportedConversation !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(reportedConversation)) {
      return res.status(400).json({ success: false, error: { reportedConversation: { invalid: true } } })
    }
  }

  if (reportedUser !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(reportedUser)) {
      return res.status(400).json({ success: false, error: { reportedUser: { invalid: true } } })
    }
  }

  if (reportedUser === undefined && reportedConversation === undefined) {
    return res.status(400).json({ success: false, error: { reportTarget: { absent: true } } })
  }

  const report = new Report({
    target: target,
    reportedUser: reportedUser,
    reportedConversation: reportedConversation,
    reason: reason
  })

  report.save((err, report) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true })
    }
  })
}
