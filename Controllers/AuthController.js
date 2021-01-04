const User = require('../Database/Models/User')
const MailController = require('./MailController')
const bcrypt = require('bcrypt')
const crs = require('crypto-random-string')
const jwt = require('../bin/jwt')

// Changing this will result in people not being able to log into the system.
// Should be in config, but the opportunity has passed.
const saltRounds = 10

/**
 * ---
 * $callback:
  *  description: Called when the password hash been hashed
  *  args:
  *    err: The error returned, or false
  *    hashed: The hashed password.
 * ---
 * Hashes a plaintext password using bcrypt
 */
const hashPassword = function (plaintext, done) {
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
              confirmString: crs({ length: 32, type: 'url-safe' }),
              timestamps: {
                signup_at: Date.now(),
                last_login: Date.now(),
              }
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

/**
 * ---
 * $returns:
 *  description: success true or false, error and user
 *  type: JSON
 * ---
 * 
 * response takes this form, but only error or token will be present
 * ``` javascript
 * {
 *    success: true|false,
 *    error: {
 *      email: {
 *        invalid: true,
 *        missing: true
 *      },
 *      password: {
 *        incorrect: true,
 *        missing: true
 *      }
 *    },
 *    token: <JWT Token>
 * }
 * ```
 */
module.exports.loginUser = function (req, res, next) {
  if (req.body.email === undefined) {
    return res.status(400).json({ success: false, error: { email: { missing: true } } })
  }
  if (req.body.password === undefined) {
    return res.status(400).json({ success: false, error: { password: { missing: true } } })
  }
  const email = req.body.email.toLowerCase()
  const password = req.body.password
  User.findOne({ email: email }, function (err, user) {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(400).json({ success: false, error: { email: { invalid: true } } })
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
              user.timestamps.last_login = Date.now()
              user.save((err, newUser) => {
                if (err) {
                  next(err)
                } else {
                  return res.json({ success: true, token: token })
                }
              }) // save user
            }
          }) // issue token
        } else {
          return res.status(400).json({ success: false, error: { password: { incorrect: true } } })
        }
      }
    })
  })
}


module.exports.removeLogin = function (req, res, next) {
  if (req.user) {
    req.user = undefined
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
  const oldPwd = req.body.oldPassword
  const newPwd = req.body.newPassword
  const confPwd = req.body.confirmPassword

  if (newPwd !== confPwd) {
    return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    return res.status(400).json({ success: false, error: { password: { invalid: true } } })
  }

  User.findById(req.user._id, (err, user) => { // find user
    if (err) {
      next(err)
    } else {
      // compare old and new
      bcrypt.compare(oldPwd, user.passwordHash, (err, result) => {
        if (err) {
          return next(err)
        } else {
          if (result === true) {
            hashPassword(newPwd, (err, hashedPwd) => {
              if (err) {
                next(err)
              } else {
                User.updateOne({ _id: req.user._id },
                  { $set: { passwordHash: hashedPwd } })
                  .exec((err, result) => {
                    if (err) {
                      next(err)
                    } else {
                      if (result.nModified === 1) {
                        return res.json({ success: true })
                      } else {
                        return res.status(401).json({ success: true, error: { login: { absent: true } } })
                      }
                    }
                  }) // user.updateOne
              }
            }) // hashPassword
          } else { // result = false
            return res.status(400).json({ success: false, error: { password: { incorrect: true } } })
          }
        }
      }) // bcrypt
    }
  }) // user
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
  // const userId = req.body.userId
  const passStr = req.params.passStr
  const newPwd = req.body.password
  const confPwd = req.body.confirmPassword

  // if (!mongoose.Types.ObjectId.isValid(userId)) {
  //   return res.status(400).json({ success: false, error: { userId: { invalid: true } } })
  // }

  if (newPwd !== confPwd) {
    return res.status(400).json({ success: false, error: { password: { mismatch: true } } })
  }
  if (newPwd.length < 8) {
    return res.status(400).json({ success: false, error: { password: { invalid: true } } })
  }

  // salt and hash password
  hashPassword(newPwd, (err, hashedPwd) => {
    if (err) {
      next(err)
    } else {
      User.findOne({ 'passReset.token': passStr }, (err, user) => {
        if (err) {
          next(err)
        } else {
          if (user) {
            if (user.passReset.timestamp > Date.now()) {
              user.passwordHash = hashedPwd
              user.passReset = { token: '', timestamp: undefined }

              user.save((err, user) => {
                res.json({ success: true })
              })
            } else {
              res.status(400).json({ success: false, error: { token: { expired: true } } })
            } /** expired check */
          } else {
            res.status(400).json({ success: false, error: { token: { invalid: true } } })
          } /** user defined heck */
        }
      }) /** User.findOne */
    }
  }) /** hashPassword */
}
