const Report = require('../Database/Models/Report')
const mongoose = require('mongoose')

module.exports = {
  util: {
    saveReport: (newReport) => {
      return new Promise((resolve, reject) => {
        Report.findOneAndUpdate({ _id: newReport._id }, newReport, { upsert: true })
          .exec((err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(newReport)
            }
          })
      })
    }
  },
  /**
   * Creates a reporty document in the db
   * @returns A promise resolving with { ok, doc?, error? }
   */
  CreateReport: (target, reportedUser, reason) => {
    return new Promise((resolve, reject) => {
      const report = new Report({
        target: target,
        reportedUser: reportedUser,
        reason: reason
      })

      module.exports.util.saveReport(report)
        .then((doc) => {
          resolve({ ok: true, doc })
        })
        .catch(err => reject(new Error(`Could not save report: ${err}`)))
    })
  }
}
