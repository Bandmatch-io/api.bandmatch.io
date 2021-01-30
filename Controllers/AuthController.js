const User = require('../Database/Models/User')
const MailController = require('./MailController')
const bcrypt = require('bcrypt')
const crs = require('crypto-random-string')
const jwt = require('../bin/jwt')

// Changing this will result in people not being able to log into the system.
// Should be in config, but the opportunity has passed.
const saltRounds = 10

module.exports = {
  util: {
    findOneUser: (query, opts) => {
      return new Promise((resolve, reject) => {
        User.findOne(query)
          .populate(opts.populate || '')
          .exec((err, user) => {
            if (err) {
              reject(err)
            } else {
              resolve(user)
            }
          })
      })
    },
    saveUser: (newUser) => {
      return new Promise((resolve, reject) => {
        User.findOneAndUpdate({ _id: newUser._id }, newUser, { upsert: true })
          .exec((err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(newUser)
            }
          })
      })
    },
    hashPassword: (plaintext) => {
      return new Promise((resolve, reject) => {
        bcrypt.genSalt(saltRounds, (err, salt) => {
          if (err) {
            reject(err)
          } else {
            bcrypt.hash(plaintext, salt, (err, hashed) => {
              if (err) {
                reject(err)
              } else {
                resolve(hashed)
              }
            })
          }
        })
      })
    },
    comparePassword: (plaintext, hash) => {
      return new Promise((resolve, reject) => {
        bcrypt.compare(plaintext, hash, (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    },
    rightNow: Date.now,
    encodeToken: jwt.issueToken,
    sendEmail: MailController.sendNewUserEmail
  },
  /**
   * Creates a user object in the database
   * @param {string} email The email of the user
   * @param {string} name The name of the user
   * @param {string} password The password to hash and store
   * @returns A Promise resolving with { ok, token?, error? }
   */
  CreateUser: (email, name, password) => {
    return new Promise((resolve, reject) => {
      email = email.toLowerCase()
      module.exports.util.findOneUser({ email: email })
        .then((user) => {
          if (user !== null && user !== undefined) {
            resolve({ ok: false, error: { user: { exists: true } } })
          }

          module.exports.util.hashPassword(password)
            .then((hashedPassword) => {
              // everything validated and secure, save user.
              const user = new User({
                email: email,
                displayName: name,
                passwordHash: hashedPassword,
                confirmString: crs({ length: 32, type: 'url-safe' }),
                timestamps: {
                  signup_at: module.exports.util.rightNow(),
                  last_login: module.exports.util.rightNow()
                }
              })

              User.testValidate(user)
                .then((validUser) => {
                  module.exports.util.saveUser(validUser)
                    .then(async (user) => {
                      // Send new user email, don't care if it errs
                      await module.exports.util.sendEmail(user.email, user.confirmString)
                        .catch(err => reject(new Error(`Error sending email: ${err}`)))
                      // After saving the user, issue a new jwt token for them
                      const token = await module.exports.util.encodeToken({ _id: user._id })
                        .catch(err => reject(new Error(`Error issuing jwt: ${err}`)))
                      resolve({ ok: true, token })
                    })
                    .catch((err) => {
                      reject(new Error(`Error saving user: ${err}`))
                    })
                })
            })
            .catch((err) => {
              reject(new Error(`Error hashing password: ${err}`))
            })
        })
        .catch((err) => {
          reject(new Error(`Error finding user with email[${email}]: ${err}`))
        })
    })
  },
  /**
   * Checks login details against the database
   * @param {string} email- The email of the user
   * @param {string} password - The password of the user
   * @returns A Promise resolving with { ok, token?, error? }
   */
  CheckUserLogin: (email, password) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ email: email }, {})
        .then((user) => {
          if (user === null || user === undefined) {
            resolve({ ok: false, error: { email: { invalid: true } } })
            return
          }
          module.exports.util.comparePassword(password, user.passwordHash)
            .then((result) => {
              if (result === true) {
                module.exports.util.encodeToken({ _id: user._id })
                  .then((token) => {
                    user.timestamps.last_login = module.exports.util.rightNow()
                    module.exports.util.saveUser(user)
                      .then((user) => {
                        resolve({ ok: true, token })
                      })
                      .catch((err) => {
                        reject(new Error(`Error updating user: ${err}`))
                      })
                  })
                  .catch((err) => {
                    reject(new Error(`COuldn't issue jwt: ${err}`))
                  })
              } else {
                resolve({ ok: false, error: { password: { incorrect: true } } })
              }
            })
            .catch((err) => {
              reject(new Error(`Couldn't compare passwords: ${err}`))
            })
        })
        .catch((err) => {
          reject(new Error(`Error finding user with email[${email}]: ${err}`))
        })
    })
  },
  /**
   * Updates a user's password, so long as oldPassword is equal to the one stored in the db
   * @param {*} userID - The _id of the user
   * @param {*} oldPassword - The old password of the user, to check equivalence
   * @param {*} newPassword - The new password of the user, to be hashed
   * @returns A Promise resolving with { ok, doc?, error? }
   */
  UpdateUserPassword: (userID, oldPassword, newPassword) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ _id: userID }, {})
        .then((user) => {
          if (user === null || user === undefined) {
            resolve({ ok: false, error: { login: { absent: true } } })
            return
          }
          module.exports.util.comparePassword(oldPassword, user.passwordHash)
            .then((result) => {
              if (result === true) {
                module.exports.util.hashPassword(newPassword)
                  .then((hashed) => {
                    user.passwordHash = hashed
                    module.exports.util.saveUser(user)
                      .then((user) => {
                        resolve({ ok: true, doc: user })
                      })
                      .catch(err => reject(new Error(`Error updating user: ${err}`)))
                  })
                  .catch(err => reject(new Error(`Error hashing password: ${err}`)))
              } else {
                resolve({ ok: false, error: { password: { incorrect: true } } })
              }
            })
            .catch(err => reject(new Error(`Error comparing passwords: ${err}`)))
        })
        .catch(err => reject(new Error(`Error finding user with id[${userID}]: ${err}`)))
    })
  },
  /**
   * Sets a user's password to a new token, so long as passResetToken is valid
   * @param {String} passResetToken - The token to check against the db
   * @param {String} newPassword - The new password to hash and store
   * @returns A Promise resolving with { ok, doc?, token? }
   */
  SetNewUserPassword: (passResetToken, newPassword) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ 'passReset.token': passResetToken }, {})
        .then((user) => {
          if (user === null || user === undefined) {
            resolve({ ok: false, error: { token: { invalid: true } } })
            return
          } else if (user.passReset.timestamp < module.exports.util.rightNow()) {
            resolve({ ok: false, error: { token: { expired: true } } })
            return
          }
          module.exports.util.hashPassword(newPassword)
            .then((hashed) => {
              user.passwordHash = hashed
              user.passReset = { token: '', timestamp: undefined }
              module.exports.util.saveUser(user)
                .then(newUser => resolve({ ok: true, doc: newUser }))
                .catch(err => reject(new Error(`Error updating user: ${err}`)))
            })
            .catch(err => reject(new Error(`Error hashing password: ${err}`)))
        })
        .catch(err => reject(new Error(`Error finding user with PRToken[${passResetToken}]: ${err}`)))
    })
  }
}
