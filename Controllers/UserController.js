var User = require('../Database/Models/User')
var mongoose = require('mongoose')
var crs = require('crypto-random-string')
var MailController = require('./MailController')
var MessageController = require('./MessageController')

/**
 * ---
 * user: The user to sanitise
 * $returns: The sanitised user
 * ---
 * Sanitises a user object.
 */
const sanitiseUser = function (user) {
  return {
    _id: user._id,
    displayName: user.displayName,
    email: user.email,
    genres: user.genres,
    instruments: user.instruments,
    active: user.active,
    description: user.description,
    searchRadius: user.searchRadius,
    searchLocation: user.searchLocation,
    searchType: user.searchType
  }
}
module.exports.sanitiseUser = sanitiseUser

/**
 * ---
 * $returns:
 *  description: success true|false
 *  type: JSON
 * ---
 * Validates a user's email in the db.
 */
module.exports.confirmEmailAddress = function (req, res, next) {
  // sets the email address to confirmed if correct string is provded for logged in user
  User.updateOne({ confirmString: req.params.str, _id: req.user._id },
    { $set: { emailConfirmed: true, confirmString: '' } })
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
 *  description: success
 *  type: JSON
 * ---
 * Adds a passResetString to the logged in user, then sends an email to the user.
 */
module.exports.requestNewPassword = function (req, res, next) {
  const email = req.params.email

  if (email === undefined) {
    res.status(400)
    res.json({ success: false, error: { email: { absent: true } } })
  }

  const str = crs({ length: 32, type: 'url-safe' })
  User.updateOne({ email: email },
    { $set: { passResetString: str } })
    .exec((err, result) => {
      if (err) {
        next(err)
      } else {
        if (result.n === 1) {
          MailController.sendRequestPassEmail(email, str, () => {
            if (err) {
              next(err)
            } else {
              res.json({ success: true })
            }
          })
        } else {
          res.status(400)
          res.json({ success: false })
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: A user profile
 *  type: JSON
 * ---
 * returns a user's profile
 */
module.exports.getOtherUser = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next()
  }

  User.findById(req.params.id)
    .select('-passwordHash -confirmString ')
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        if (!user) {
          next() // direct to 404
        } else {
          res.json({ success: true, user: sanitiseUser(user) })
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: The logged in user's data
 *  type: JSON
 * ---
 */
module.exports.getSelfUser = function (req, res) {
  res.json({ user: sanitiseUser(req.user) })
}

/**
 * ---
 * $returns:
 *  description: success, error and user
 *  type: JSON
 * ---
 * Updates the logged in user's data
 */
module.exports.updateSelfUser = function (req, res, next) {
  // sanity check, should not be accessible if not logged in but check anyway.
  if (req.user === undefined) {
    res.status(401)
    return res.json({ success: false, error: { login: { absent: true } } })
  }

  if (req.body.name) {
    if (req.body.name.length > 16) {
      res.status(400)
      return res.json({ success: false, error: { name: { invalid: true } } })
    }
    req.user.displayName = req.body.name
  }

  // function to clean genre and instruments
  const cleanStr = (str) => { return str.toLowerCase().replace(/[^a-zA-Z\s]+/g, '') }

  if (req.body.genres) {
    req.user.genres = req.body.genres.map(cleanStr)
  }

  if (req.body.instruments) {
    req.user.instruments = req.body.instruments.map(cleanStr)
  }

  if (req.body.type) {
    if (req.body.type === 'Form' || req.body.type === 'Join' ||
      req.body.type === 'Either' || req.body.type === 'Recruit') {
      req.user.searchType = req.body.type
    } else {
      res.status(400)
      return res.json({ success: false, error: { type: { invalid: true } } })
    }
  }

  if (req.body.description) {
    if (req.body.description.length > 512) {
      res.status(400)
      return res.json({ success: false, error: { description: { invalid: true } } })
    }
    req.user.description = req.body.description.trim()
  }

  if (req.body.radius) {
    if (req.body.radius < 0) {
      res.status(400)
      return res.json({ success: false, error: { radius: { negative: true } } })
    }
    req.user.searchRadius = req.body.radius
  }

  if (req.body.location) {
    req.user.searchLocation.coordinates = [req.body.location.lng, req.body.location.lat]
  }

  if (req.body.active !== undefined) {
    req.user.active = req.body.active
  }

  req.user.save((err, user) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true, user: sanitiseUser(user) })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: success
 *  type: JSON
 * ---
 * Deletes a user from the website
 */
module.exports.deleteUser = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    return next()
  }

  const id = req.user._id
  User.findById(id)
    .deleteOne()
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        MessageController.deleteConvosForUser(id, (err) => {
          if (err) {
            next(err)
          } else {
            req.logout()
            res.json({ success: true })
          }
        })
      }
    })
}
