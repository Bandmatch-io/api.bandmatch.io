var User = require('../Database/Models/User')
var bcrypt = require('bcrypt')
var mongoose = require('mongoose')
var crs = require('crypto-random-string')
var MailController = require('./MailController')
var MessageController = require('./MessageController')

// Changing this will result in people not being able to log into the system.
// Should be in config, but the opportunity has passed.
const saltRounds = 10

/**
 * ---
 * $returns:
 *  description: success true or false, error and user
 *  type: JSON
 * ---
 * Creates a user in the database.
 * emails will be turned lowercase.
 * response takes the form, but only error or user will be present
 * ``` javascript
 * {
 *    success: true|false,
 *    error: {
 *      email: {
 *        invalid: true,
 *        inUse: true
 *      },
 *      consent: {
 *        missing: true
 *      },
 *      password: {
 *        invalid: true,
 *        mismatchL true
 *      }
 *    },
 *    user: [User object]
 * }
 * ```
 */
module.exports.createUser = function (req, res, next) {
  const email = req.body.email.toLowerCase()
  const name = req.body.name
  const pwd = req.body.pass
  const confPwd = req.body.confPass
  const agreement = req.body.agreement

  if (!agreement) {
    return res.json({ success: false, error: { consent: { missing: true } } })
  }

  // Validate fields
  if (email.length > 254) {
    return res.json({ success: false, error: { email: { invalid: true } } })
  }

  if (name.length > 16) {
    return res.json({ success: false, error: { name: { invalid: true } } })
  }

  if (pwd !== confPwd) {
    return res.json({ success: false, error: { password: { mismatch: true } } })
  }
  if (pwd.length < 8) {
    return res.json({ success: false, error: { password: { invalid: true } } })
  }

  // Check the email isn't already in use.
  User.findOne({ email: email }, (err, user) => { // Email already exists
    if (err) {
      next(err)
    } else {
      // If the emails is in use, direct back to sign in page.
      if (user !== null) {
        res.json({ success: false, error: { email: { inUse: true } } })
      } else {
        // salt and hash password
        bcrypt.genSalt(saltRounds, (err, salt) => {
          if (err) {
            next(err)
          } else {
            bcrypt.hash(pwd, salt, (err, hashedPwd) => {
              if (err) {
                next(err)
              } else {
                // everything validated and secure, save user.
                const user = new User({
                  email: email,
                  displayName: name,
                  passwordHash: hashedPwd,
                  confirmString: crs({ length: 32, type: 'url-safe' })
                })

                user.save((err, user) => {
                  if (err) {
                    next(err)
                  } else {
                    // Send new user email, don't care if it errs
                    MailController.sendNewUserEmail(user.email, user.confirmString, () => {
                      // After saving the user, log in and redirect to profile setup
                      req.login(user, (liErr) => {
                        if (liErr) {
                          next(liErr)
                        } else {
                          res.json({ success: true, user: user })
                        }
                      })
                    })
                  }
                })
              }
            })
          }
        })
      }
    }
  })
}

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
 *  description: success and/or error
 *  type: JSON
 * ---
 * Updates a password in the database. Used for changing a user's existing password.
 * - If data supplied is invalid, it will return no success and an error
 * - If data is valid it will return success
 */
module.exports.updatePassword = function (req, res, next) {
  const oldPwd = req.body.oldPwd
  const newPwd = req.body.newPwd
  const confPwd = req.body.confPwd

  if (newPwd !== confPwd) {
    return res.json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    return res.json({ success: false, error: { password: { invalid: true } } })
  }

  bcrypt.compare(oldPwd, req.user.passwordHash, (err, result) => {
    if (err) {
      return next(err)
    } else {
      if (result === true) {
        bcrypt.genSalt(saltRounds, (err, salt) => {
          if (err) {
            next(err)
          } else {
            bcrypt.hash(newPwd, salt, (err, hashedPwd) => {
              if (err) {
                next(err)
              } else {
                User.updateOne({ _id: req.user.id },
                  { $set: { passwordHash: hashedPwd } })
                  .exec((err) => {
                    if (err) {
                      next(err)
                    } else {
                      return res.json({ success: true })
                    }
                  })
              }
            })
          }
        })
      } else {
        return res.json({ success: false, error: { password: { incorrect: true } } })
      }
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
          res.json({ success: false })
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: success and/or error
 *  type: JSON
 * ---
 * Updates a password in the database. Used for changing a user's forgotten password.
 * - If data supplied is invalid, it will render the change password page
 * - If data is valid it will redirect to /
 */
module.exports.setNewPassword = function (req, res, next) {
  const userId = req.body.userId
  const passStr = req.body.passStr
  const newPwd = req.body.newPwd
  const confPwd = req.body.confPwd

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next()
  }

  if (newPwd !== confPwd) {
    res.json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    res.json({ success: false, error: { password: { valid: true } } })
  }

  // salt and hash password
  bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      next(err)
    } else {
      bcrypt.hash(newPwd, salt, (err, hashedPwd) => {
        if (err) {
          next(err)
        } else {
          User.updateOne({ _id: userId, passResetString: passStr },
            { $set: { passwordHash: hashedPwd, passResetString: '' } })
            .exec((err, result) => {
              if (err) {
                next(err)
              } else {
                res.json({ success: true })
              }
            })
        }
      })
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
          res.json({ success: true, user: user })
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
  console.log(req.session)

  // make sure we don't send password to the frontend
  const selectedUser = {
    displayName: req.user.displayName,
    email: req.user.email,
    genres: req.user.genres,
    instruments: req.user.instruments,
    active: req.user.active,
    description: req.user.description,
    searchRadius: req.user.searchRadius,
    searchLocation: req.user.searchLocation,
    searchType: req.user.searchType
  }
  res.json({ user: selectedUser })
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
    return res.json({ success: false, error: { user: { absent: true } } })
  }

  if (req.body.name) {
    if (req.body.name.length > 16) {
      return res.json({ success: false, error: { name: { invalid: true } } })
    }
    req.user.displayName = req.body.name
  }
  if (req.body.email) {
    if (req.body.email.length > 254) {
      return res.json({ success: false, error: { email: { invalid: true } } })
    }
    req.user.email = req.body.email
  }

  // function to clean genre and instruments
  const cleanStr = (str) => { return str.toLowerCase().replace(/[^a-zA-Z\s]+/g, '') }

  req.user.genres = req.body.genres.map(cleanStr)
  req.user.instruments = req.body.instruments.map(cleanStr)
  req.user.searchType = req.body.type

  if (req.body.description.length > 512) {
    return res.json({ success: false, error: { description: { invalid: true } } })
  }
  req.user.description = req.body.description.trim()

  req.user.searchRadius = req.body.radius
  req.user.searchLocation.coordinates = [req.body.location.lng, req.body.location.lat]

  if (req.body.active !== undefined) {
    req.user.active = req.body.active
  }

  req.user.save((err, user) => {
    if (err) {
      next(err)
    } else {
      res.json({ success: true, user: user })
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
