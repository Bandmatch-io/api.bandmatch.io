var User = require('../Database/Models/User')
var MailController = require('./MailController')
var bcrypt = require('bcrypt')
var crs = require('crypto-random-string')
var UserController = require('./UserController')
var mongoose = require('mongoose')
var jwt = require('../bin/jwt')

// Changing this will result in people not being able to log into the system.
// Should be in config, but the opportunity has passed.
const saltRounds = 10

var hashPassword = function (plaintext, done) {
  bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      done(err)
    } else {
      bcrypt.hash(plaintext, salt, (err, hashed) => {
        if (err) {
          done(err, null)
        } else {
          done(false, hashed)
        }
      })
    }
  })
}
module.exports.hashPassword = hashPassword

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
  const pwd = req.body.password
  const confPwd = req.body.confirmPassword
  const agreement = req.body.agreement

  if (!agreement) {
    return res.status(400).json({ success: false, error: { consent: { missing: true } } })
  }

  // Validate fields
  if (email.length > 254) {
    return res.status(400).json({ success: false, error: { email: { invalid: true } } })
  }

  if (name.length > 16) {
    return res.status(400).json({ success: false, error: { name: { invalid: true } } })
  }

  if (pwd !== confPwd) {
    return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
  }
  if (pwd.length < 8) {
    return res.status(400).json({ success: false, error: { password: { invalid: true } } })
  }

  // Check the email isn't already in use.
  User.findOne({ email: email }, (err, user) => { // Email already exists
    if (err) {
      next(err)
    } else {
      // If the emails is in use, direct back to sign in page.
      if (user !== null) {
        res.status(400).json({ success: false, error: { email: { inUse: true } } })
      } else {
        // salt and hash password
        hashPassword(pwd, (err, hashedPwd) => {
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
                  // After saving the user, issue a new jwt token for them
                  jwt.issueToken({ _id: user._id }, (err, token) => {
                    if (err) {
                      return next(err)
                    } else {
                      return res.json({ success: true, token: token })
                    }
                  })
                })
              }
            })
          }
        })
      }
    }
  })
}

module.exports.loginUser = function (req, res, next){
  console.log(req.body)
  if (req.body.email === undefined) {
    return res.status(400).json({ success: false, error: { email: { missing: true } }})
  }
  if (req.body.password === undefined) {
    return res.status(400).json({ success: false, error: { email: { missing: true } }})
  }
  let email = req.body.email.toLowerCase()
  let password = req.body.password
  User.findOne({ email: email }, function (err, user) {
      if (err) {
        return next(err)
      }
      if (!user) {
        return res.status(400).json({ success: false, error: { email: { invalid: true } }})
      }
      bcrypt.compare(password, user.passwordHash, (err, result) => {
        if (err) {
          return next(err)
        } else {
          if (result === true) {
            jwt.issueToken({ _id: user._id }, (err, token) => {
              if (err) {
                return next(err)
              } else {
                return res.json({ success: true, token: token })
              }
            })
            // return done(null, user) // needs full user, not just id for serialize/deserialize
          } else {
            return res.status(400).json({ success: false, error: { password: { incorrect: true } }})
        }
      }
    })
  })
}

module.exports.removeLogin = function (req, res, next) {
  if (req.user) {
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false })
  }
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
    res.status(400)
    return res.json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    res.status(400)
    return res.json({ success: false, error: { password: { invalid: true } } })
  }

  bcrypt.compare(oldPwd, req.user.passwordHash, (err, result) => {
    if (err) {
      return next(err)
    } else {
      if (result === true) {
        hashPassword(newPwd, (err, hashedPwd) => {
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
      } else {
        res.status(400)
        return res.json({ success: false, error: { password: { incorrect: true } } })
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
    res.status(400)
    return res.json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    res.status(400)
    return res.json({ success: false, error: { password: { valid: true } } })
  }

  // salt and hash password
  hashPassword(newPwd, (err, hashedPwd) => {
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
