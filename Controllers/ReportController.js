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
  if (target === undefined || reason === undefined) {
    return res.json({ success: false })
  }

  // Check given ids are valid
  if (reportedConversation !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(reportedConversation)) {
      return res.json({ success: false })
    }
  }

  if (reportedUser !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(reportedUser)) {
      return res.json({ success: false })
    }
  }

  const report = new Report({
    target: target,
    reportedUser: reportedUser,
    reportedConversation: reportedConversation,
    reason: reason
  })

  report.save((err, report) => {
    if (err) {
      res.json({ success: false })
    } else {
      res.json({ success: true })
    }
  })
}
