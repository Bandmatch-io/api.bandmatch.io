const User = require('../Database/Models/User')
const Report = require('../Database/Models/Report')
const Stat = require('../Database/Models/Statistic')
const MessageController = require('./MessageController')
const mongoose = require('mongoose')

/**
 * ---
 * $returns:
 *  description: All the reports in the system
 *  type: JSON
 * ---
 * Fetches all the reports
 */
module.exports.getReports = function (req, res, next) {
  // Gets all reports
  Report.find({})
    .populate('reportedUser')
    .populate('reportedConversation')
    .exec((err, reports) => {
      if (err) {
        next(err)
      } else {
        res.json({ success: true, reports: reports })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: success true|false
 *  type: JSON
 * ---
 * deletes a report from it's id
 */
module.exports.deleteReport = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }

  Report.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: Users from the system matches ?q=X
 *  type: JSON
 * ---
 * Fetches all the users
 */
module.exports.searchUsers = function (req, res, next) {
  const query = req.query.q

  let re
  try {
    re = new RegExp(query)
  } catch (e) {
    res.status(200).json({ success: false })
    return
  }

  // Find all users
  User.find({ $or: [{ displayName: re }, { email: re }], _id: { $ne: req.user._id } })
    .select('_id displayName email')
    .exec((err, users) => {
      if (err) {
        next(err)
      } else {
        res.json({ success: true, users: users })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Clears a user's description
 */
module.exports.clearUserDescription = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }

  User.updateOne({ _id: req.params.id }, { $set: { description: '' } })
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        res.json({ success: true })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Clears a user's name
 */
module.exports.clearUserName = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }

  User.updateOne({ _id: req.params.id }, { $set: { displayName: 'No Name' } })
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        res.json({ success: true })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Delete's a user from the website.
 */
module.exports.deleteUser = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }
  MessageController.deleteConvosForUser(req.params.id, (err) => {
    if (err) {
      next(err)
    } else {
      User.findById(req.params.id)
        .deleteOne()
        .exec((err, user) => {
          if (err) {
            next(err)
          } else {
            res.json({ success: true })
          }
        })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Promotes a user to admin
 */
module.exports.promoteUser = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }

  User.updateOne({ _id: req.params.id }, { $set: { admin: true } }, (err) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Demotes a user from admin
 */
module.exports.demoteUser = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(401).json({ success: false })
  }

  User.updateOne({ _id: req.params.id }, { $set: { admin: false } }, (err) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * returns an array of stats for the day requested
 */
module.exports.getDailyStats = function (req, res, next) {
  const year = req.query.y
  const month = req.query.m
  const day = req.query.d

  if (year === undefined || month === undefined || day === undefined) {
    return res.status(401).json({ success: false })
  }

  // find the stats for the day specified.
  // month is 0 indexed so subtract 1 from month
  Stat.findOne({ date: new Date(Date.UTC(year, month - 1, day)) },
    '-referrers',
    (err, stats) => {
      if (err) {
        next(err)
      } else {
        if (!stats) {
          res.json({ success: false })
        } else {
          res.json({ success: true, stats: stats })
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Returns an array of statistics for the period specified
 */
module.exports.getPeriodStats = function (req, res, next) {
  const year = req.query.y
  const month = req.query.m
  const day = req.query.d
  const period = req.query.p
  if (year === undefined || month === undefined || day === undefined || period === undefined) {
    return res.status(401).json({ success: false })
  }

  const endDate = new Date(Date.UTC(year, month - 1, day))
  const startDate = new Date(Number(endDate))
  startDate.setDate(startDate.getDate() - Number(period) + 1)

  Stat.find({
    date: {
      $gt: startDate,
      $lte: endDate
    }
  }, '-referrers', (err, stats) => {
    if (err) {
      next(err)
    } else {
      if (!stats) {
        res.json({ success: false })
      } else {
        res.json({ success: true, stats: stats })
      }
    }
  })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Returns the location's of every user.
 */
module.exports.locationData = function (req, res, next) {
  User.find({
    searchLocation: {
      $near: { // Exclude null island, which is default.
        $minDistance: 1,
        $geometry: { type: 'Point', coordinates: [0, 0] }
      }
    }
  })
    .select('searchLocation')
    .exec((err, users) => {
      if (err) {
        next(err)
      } else {
        res.json({ success: true, locations: users })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: whether the function succeeded
 *  type: JSON
 * ---
 * Returns referral data for a period of time specified.
 */
module.exports.refData = function (req, res, next) {
  const year = req.query.y
  const month = req.query.m
  const day = req.query.d
  const period = req.query.p

  if (year === undefined || month === undefined || day === undefined || period === undefined) {
    return res.status(401).json({ success: false })
  }

  const endDate = new Date(Date.UTC(year, month - 1, day))
  const startDate = new Date(Number(endDate))
  startDate.setDate(startDate.getDate() - Number(period) + 1)

  Stat.find({
    date: {
      $gt: startDate,
      $lte: endDate
    }
  }, 'referrers', (err, stats) => {
    if (err) {
      next(err)
    } else {
      if (!stats) {
        res.json({ success: false })
      } else {
        res.json({ success: true, stats: stats })
      }
    }
  })
}
