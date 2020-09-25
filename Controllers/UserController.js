const User = require('../Database/Models/User')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const crs = require('crypto-random-string')
const MailController = require('./MailController')
const MessageController = require('./MessageController')

const saltRounds = 10

/**
 * ---
 * recaptcha: The recaptcha instance that will be passed onto the page.
 * $returns:
 *  description: Renders the signin page, or redirects to /
 *  type: HTML / Redirect
 * ---
 * Creates a user in the database.
 * emails will be turned lowercase.
 */
module.exports.createUser = function (req, res, next, recaptcha) {
  const email = req.body.email.toLowerCase()
  const name = req.body.name
  const pwd = req.body.pass
  const confPwd = req.body.confPass
  const agreement = req.body.agreement

  if (!agreement) {
    return res.render('signin', { title: 'Sign in', error: { consent: false }, captcha: recaptcha.render() })
  }

  // Validate fields
  if (email.length > 254) {
    return res.render('signin', { title: 'Sign in', error: { emailLength: false }, captcha: recaptcha.render() })
  }

  if (name.length > 16) {
    return res.render('signin', { title: 'Sign in', error: { nameOK: false }, captcha: recaptcha.render() })
  }

  if (pwd !== confPwd) {
    return res.render('signin', { title: 'Sign in', error: { pwdMatch: false }, captcha: recaptcha.render() })
  }
  if (pwd.length < 8) {
    return res.render('signin', { title: 'Sign in', error: { pwdOK: false }, captcha: recaptcha.render() })
  }

  // Check the email isn't already in use.
  User.findOne({ email: email }, (err, user) => { // Email already exists
    if (err) {
      next(err)
    } else {
      // If the emails is in use, direct back to sign in page.
      if (user !== null) {
        res.render('signin', { title: 'Sign in', error: { emailOK: false }, captcha: recaptcha.render() })
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
                    res.render('signin', { title: 'Sign in', error: {}, captcha: recaptcha.render() })
                  } else {
                    // Send new user email, don't care if it errs
                    MailController.sendNewUserEmail(user.email, user.confirmString, () => {
                      // After saving the user, log in and redirect to profile setup
                      req.login(user, (liErr) => {
                        req.flash('Information', 'Account created.')
                        res.redirect('/users/profile/setup')
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
 *  description: Redirects to /
 *  type: Redirect
 * ---
 * Validates a user in the db.
 */
module.exports.confirmEmailAddress = function (req, res, next) {
  // sets the email address to confirmed if correct string is provded for logged in user
  User.updateOne({ confirmString: req.params.str, _id: req.user._id },
    { $set: { emailConfirmed: true, confirmString: '' } })
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        req.flash('Information', 'Your email has been confirmed.')
        res.redirect('/')
      }
    })
}

/**
 * ---
 * $returns:
 *  description: Rendered HTML for profile edit page.
 *  type: HTML
 * ---
 */
module.exports.viewSelfProfile = function (req, res) {
  res.render('profileedit', { title: req.user.displayName, user: req.user })
}

/**
 * ---
 * $returns:
 *  description: Rendered HTML for profile setup page.
 *  type: HTML
 * ---
 */
module.exports.viewProfileSetup = function (req, res) {
  res.render('profilesetup', { title: 'Profile Setup', error: {} })
}

/**
 * ---
 * $returns:
 *  description: Renders change password page.
 *  type: HTML
 * ---
 */
module.exports.viewChangePassword = function (req, res) {
  res.render('changepassword', { title: 'Change Password' })
}

/**
 * ---
 * $returns:
 *  description: Either change password pageor redirects to /
 *  type: HTML
 * ---
 * Updates a password in the database. Used for changing a user's existing password.
 * - If data supplied is invalid, it will render the change password page
 * - If data is valid it will redirect to /users/profile/self
 */
module.exports.updatePassword = function (req, res, next) {
  const oldPwd = req.body.oldPwd
  const newPwd = req.body.newPwd
  const confPwd = req.body.confPwd

  if (newPwd !== confPwd) {
    return res.render('changepassword', { title: 'Change Password', error: { pwdMatch: false } })
  }
  if (newPwd.length < 8) {
    return res.render('changepassword', { title: 'Change Password', error: { pwdOK: false } })
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
                      req.flash('Information', 'Your password has been changed.')
                      res.redirect('/users/profile/self')
                    }
                  })
              }
            })
          }
        })
      } else {
        return res.render('changepassword', { title: 'Change Password', error: { oldPwdOk: false } })
      }
    }
  })
}

/**
 * ---
 * $returns:
 *  description: Redirects to /
 *  type: HTML
 * ---
 * Adds a passResetString to the logged in user, then sends an email to the user.
 */
module.exports.requestNewPassword = function (req, res, next) {
  const email = req.body.email

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
            }
            res.redirect('/')
          })
        } else {
          res.redirect('/')
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: The new password page
 *  type: html
 * ---
 * Renders the new password page, used for forgotten passwords.
 */
module.exports.viewNewPassword = function (req, res, next) {
  const str = req.query.s

  // Make sure that a blank string redirects to nothing
  if (str === undefined) {
    return next()
  }

  User.findOne({ passResetString: str })
    .select('_id displayName email')
    .exec((err, user) => {
      if (err) {
        next(err)
      } else {
        if (user) {
          res.render('newpassword', { title: 'New Password', user: user })
        } else {
          next()
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: Either change password pageor redirects to /
 *  type: HTML
 * ---
 * Updates a password in the database. Used for changing a user's forgotten password.
 * - If data supplied is invalid, it will render the change password page
 * - If data is valid it will redirect to /
 */
module.exports.setNewPassword = function (req, res, next) {
  const userId = req.body.userId
  const newPwd = req.body.newPwd
  const confPwd = req.body.confPwd

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next()
  }

  if (newPwd !== confPwd) {
    return res.render('newpassword', { title: 'New Password', id: userId, error: { pwdMatch: false } })
  }
  if (newPwd.length < 8) {
    return res.render('newpassword', { title: 'New Password', id: userId, error: { pwdOK: false } })
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
          User.updateOne({ _id: userId }, { $set: { passwordHash: hashedPwd, passResetString: '' } })
            .exec((err, result) => {
              if (err) {
                next(err)
              } else {
                req.flash('Information', 'Your password has been changed.')
                res.redirect('/')
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
 *  type: HTML
 * ---
 * Renders a user's profile
 */
module.exports.viewProfile = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next()
  }

  User.findById(req.params.id, (err, user) => {
    if (err) {
      next(err)
    } else {
      if (!user) {
        next() // direct to 404
      } else {
        res.render('profile', { title: user.displayName, profileInfo: user })
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
 *  description: success true|false
 *  type: JSON
 * ---
 * Updates the logged in user's data
 */
module.exports.updateSelfUser = function (req, res, next) {
  // sanity check, should not be accessible if not logged in but check anyway.
  if (req.user === undefined) {
    return res.json({ success: false })
  }

  if (req.body.name) {
    if (req.body.name.length > 16) {
      return res.json({ success: false })
    }
    req.user.displayName = req.body.name
  }
  if (req.body.email) {
    if (req.body.email.length > 254) {
      return res.json({ success: false })
    }
    req.user.email = req.body.email
  }

  const cleanStr = (str) => { return str.toLowerCase().replace(/[^a-zA-Z\s]+/g, '') }

  req.user.genres = req.body.genres.map(cleanStr)
  req.user.instruments = req.body.instruments.map(cleanStr)
  req.user.searchType = req.body.type

  if (req.body.description.length > 512) {
    return res.json({ success: false })
  }
  req.user.description = req.body.description.trim()

  req.user.searchRadius = req.body.radius
  req.user.searchLocation.coordinates = [req.body.location.lng, req.body.location.lat]

  if (req.body.active !== undefined) {
    req.user.active = req.body.active
  }

  req.user.save((err, user) => {
    if (err) {
      res.json({ success: false })
    } else {
      res.json({ success: true })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: success true|false, content description
 *  type: JSON
 * ---
 * Fetches the logged in user's description
 */
module.exports.getSelfUserDescription = function (req, res) {
  if (req.user === undefined) {
    res.json({ success: false })
  } else {
    res.json({ success: true, content: req.user.description })
  }
}

/**
 * ---
 * $returns:
 *  description: success true|false, content description
 *  type: JSON
 * ---
 * Fetches a user's description
 */
module.exports.getUserDescription = function (req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.json({ success: false })
  }

  User.findById(req.params.id, (err, user) => {
    if (err) {
      return res.json({ success: false })
    } else {
      if (!user) {
        return res.json({ success: false })
      } else {
        return res.json({ success: true, content: user.description })
      }
    }
  })
}

/**
 * ---
 * $returns:
 *  description: redirects to /
 *  type: HTML
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
            req.flash('Information', 'You have been logged out.')
            res.redirect('/')
          }
        })
      }
    })
}
