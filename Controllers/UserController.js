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
    admin: user.admin,
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
  const email = req.body.email

  if (email === undefined) {
    res.status(400).json({ success: false, error: { email: { absent: true } } })
  }

  const str = crs({ length: 32, type: 'url-safe' })
  User.updateOne({ email: email },
    { $set: { passResetString: str } })
    .exec((err, result) => {
      if (err) {
        next(err)
      } else {
        if (result.n === 1) {
          MailController.sendRequestPassEmail(email, str, (err, info) => {
            if (err) {
              next(err)
            } else {
              res.json({ success: true })
            }
          })
        } else {
          res.status(400).json({ success: false, error: { email: { invalid: true } } })
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
 *  description: The user data with the id from the jwt
 *  type: JSON
 * ---
 */
module.exports.getSelfUser = function (req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    return next()
  }

  User.findById(req.user._id)
    .select('-passwordHash -confirmString')
    .exec((err, user) => {
      if (err) {
        return next(err)
      } else {
        if (!user) {
          next() // direct to 404
        } else {
          return res.json({ success: true, user: sanitiseUser(user) })
        }
      }
    })
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
    return res.status(401).json({ success: false, error: { login: { absent: true } } })
  }
  User.findById(req.user._id, (err, user) => {
    if (err) {
      next(err)
    } else {
      if (req.body.displayName) {
        if (req.body.displayName.length > 16) {
          return res.status(400).json({ success: false, error: { displayName: { invalid: true } } })
        }
        user.displayName = req.body.displayName
      }
    
      // function to clean genre and instruments
      const cleanStr = (str) => { return str.toLowerCase().replace(/[^a-zA-Z\s]+/g, '') }
    
      if (req.body.genres) {
        user.genres = req.body.genres.map(cleanStr)
      }
    
      if (req.body.instruments) {
        user.instruments = req.body.instruments.map(cleanStr)
      }
    
      if (req.body.searchType) {
        if (req.body.searchType === 'Form' || req.body.searchType === 'Join' ||
          req.body.searchType === 'Either' || req.body.searchType === 'Recruit') {
          user.searchType = req.body.searchType
        } else {
          return res.status(400).json({ success: false, error: { searchType: { invalid: true } } })
        }
      }
    
      if (req.body.description) {
        if (req.body.description.length > 512) {
          return res.status(400).json({ success: false, error: { description: { invalid: true } } })
        }
        user.description = req.body.description.trim()
      }
    
      if (req.body.searchRadius) {
        if (req.body.searchRadius < 0) {
          return res.status(400).json({ success: false, error: { searchRadius: { negative: true } } })
        }
        user.searchRadius = req.body.searchRadius
      }
    
      if (req.body.searchLocation.coordinates) {
        user.searchLocation.coordinates = req.body.searchLocation.coordinates
      }
    
      if (req.body.active) {
        user.active = req.body.active
      }
    
      user.save((err, user) => {
        if (err) {
          next(err)
        } else {
          res.json({ success: true, user: sanitiseUser(user) })
        }
      })
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
