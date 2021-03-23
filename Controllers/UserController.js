const User = require('../Database/Models/User')
const mongoose = require('mongoose')
const crs = require('crypto-random-string')
const MailController = require('./MailController')
const MessageController = require('./MessageController')

const config = require('config')
const passCFG = config.get('Password')

/**
 * @param {Object} user The user object from the DB
 * @returns the user object with some fields omitted for safe return to enduser
 */
const sanitiseUser = function (user) {
  return {
    _id: user._id,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailConfirmed,
    genres: user.genres,
    instruments: user.instruments,
    active: user.active,
    admin: user.admin,
    description: user.description,
    searchRadius: user.searchRadius,
    searchLocation: user.searchLocation,
    searchType: user.searchType,
    timestamps: user.timestamps
  }
}

module.exports = {
  util: {
    sanitiseUser: sanitiseUser,
    deleteOneUser: (id) => {
      return new Promise((resolve, reject) => {
        User.findById(id)
          .deleteOne()
          .exec((err, user) => {
            if (err) {
              reject(err)
            } else {
              resolve({ ok: true })
            }
          })
      })
    },
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
    findSomeUsers: (query, opts) => {
      return new Promise((resolve, reject) => {
        User.find(query)
          .populate(opts.populate || '')
          .select(opts.select || '')
          .exec((err, users) => {
            if (err) {
              reject(err)
            } else {
              resolve(users)
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
    combineUser: (old, newObj) => {
      return new Promise((resolve, reject) => {
        if (newObj.displayName) {
          if (newObj.displayName.length > 16) {
            resolve({ ok: false, error: { displayName: { invalid: true } } })
            return
          }
          old.displayName = newObj.displayName
        }

        // function to clean genre and instruments
        const cleanStr = (str) => { return str.toLowerCase().replace(/[^a-zA-Z\s]+/g, '') }

        if (newObj.genres) {
          old.genres = newObj.genres.map(cleanStr)
        }

        if (newObj.instruments) {
          old.instruments = newObj.instruments.map(cleanStr)
        }

        if (newObj.searchType) {
          if (newObj.searchType === 'Form' || newObj.searchType === 'Join' ||
              newObj.searchType === 'Either' || newObj.searchType === 'Recruit') {
            old.searchType = newObj.searchType
          } else {
            resolve({ ok: false, error: { searchType: { invalid: true } } })
            return
          }
        }

        if (newObj.description) {
          if (newObj.description.length > 512) {
            resolve({ ok: false, error: { description: { invalid: true } } })
            return
          }
          old.description = newObj.description.trim()
        }

        if (newObj.searchRadius) {
          if (newObj.searchRadius < 0) {
            resolve({ ok: false, error: { searchRadius: { negative: true } } })
            return
          }
          old.searchRadius = newObj.searchRadius
        }

        if (newObj.searchLocation && newObj.searchLocation.coordinates) {
          if (!old.searchLocation) {
            old.searchLocation = {}
          }
          old.searchLocation.coordinates = newObj.searchLocation.coordinates
        }

        if (newObj.active) {
          old.active = newObj.active
        }
        resolve({ ok: true, doc: old })
      })
    },
    sendReqPassEmail: MailController.sendRequestPassEmail,
    sendConfEmail: MailController.sendVerifyEmail,
    deleteConvosForUser: MessageController.deleteConvosForUser,
    rightNow: Date.now
  },
  /**
   * Verifies the owner of an email.
   * @param {String} confString - The email confirm token
   * @param {String} userID - The id of the user to validate
   * @returns A Promise resolving with { ok, doc?, error? }
   */
  ConfirmEmailAddress: (confString, userID) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ confirmString: confString, _id: userID }, {})
        .then((user) => {
          if (user === null || user === undefined) {
            resolve({ ok: false, error: { user: { notfound: true } } })
            return
          }
          user.emailConfirmed = true
          user.confirmString = ''
          module.exports.util.saveUser(user)
            .then((doc) => {
              resolve({ ok: true, doc })
            })
            .catch(err => reject(new Error(`Could not save user: ${err}`)))
        })
        .catch(err => reject(new Error(`Could not find user with confirmString[${confString}] and id[${userID}]: ${err}`)))
    })
  },
  /**
   * Sends a confirmation email to the user with userID
   * @param {String} userID - The ID of the user to send to
   * @returns A Promise resolving with { ok, error? }
   */
  ResendEmailVerification: (userID) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ _id: userID }, {})
        .then((user) => {
          if (!user) {
            resolve({ ok: false, error: { email: { invalid: true } } })
          } else {
            user.confirmString = crs({ length: 32, type: 'url-safe' })

            module.exports.util.saveUser(user)
              .then((user) => {
                // Send new user
                module.exports.util.sendConfEmail(user.email, user.confirmString)
                  .then((info) => {
                    resolve({ ok: true })
                  })
                  .catch(err => reject(new Error(`Could not send email to address[${user.email}]: ${err}`)))
              })
              .catch(err => reject(new Error(`Could not save user with id[${user._id}]: ${err}`)))
          }
        })
        .catch(err => reject(new Error(`Could not find user with id[${userID}]: ${err}`)))
    })
  },
  /**
   * Fetches A user from their confirm token
   * @param {String} token - The confirm token to search for
   * @returns Promise resolving with { ok, doc?, error?}
   */
  GetProfileFromConfirmToken: (token) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ confirmString: token }, {})
        .then((user) => {
          if (!user) {
            return resolve({ ok: false, error: { token: { invalid: true } } })
          }
          resolve({ ok: true, doc: module.exports.util.sanitiseUser(user) })
        })
        .catch(err => reject(new Error(`Could not find user with token[${token}]: ${err}`)))
    })
  },
  /**
   * Adds a passResetString to the user and, then sends an email
   * @param {String} email - The email of the user
   */
  RequestNewPassword: (email) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ email: email }, {})
        .then((user) => {
          if (!user) {
            resolve({ ok: false, error: { email: { invalid: true } } })
            return
          }

          const str = crs({ length: 32, type: 'url-safe' })
          let ts = new Date()
          ts = ts.setTime(module.exports.util.rightNow() + passCFG.valid_time)
          user.passReset = {
            token: str,
            timestamp: ts
          }
          module.exports.util.saveUser(user)
            .then((user) => {
              module.exports.util.sendReqPassEmail(email, str)
                .then((info) => {
                  resolve({ ok: true })
                })
                .catch(err => reject(new Error(`Could not send email to address[${email}]: ${err}`)))
            })
            .catch(err => reject(new Error(`Could not save user with id[${user._id}]: ${err}`)))
        })
        .catch((err) => {
          reject(new Error(`Could not find user with email[${email}]: ${err}`))
        })
    })
  },
  /**
   * @param {String} id - The id of the user to get
   * @returns A Promise resolving with { ok, doc?, error? }
   */
  GetUser: (id) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ _id: id }, {})
        .then((user) => {
          if (!user) {
            resolve({ ok: false, error: { user: { notfound: true } } })
            return
          }
          resolve({ ok: true, doc: module.exports.util.sanitiseUser(user) })
        })
        .catch(err => reject(new Error(`Could not find user with id[${id}]: ${err}`)))
    })
  },
  /**
   * Returns a list of users registered as admin
   * @returns A Promise resolving with { ok, docs }
   */
  GetAdmins: () => {
    return new Promise((resolve, reject) => {
      module.exports.util.findSomeUsers({ admin: true }, { select: '_id, displayName' })
        .then((users) => {
          resolve({ ok: true, docs: users })
        })
        .catch(err => reject(new Error(`Could not find users: ${err}`)))
    })
  },
  /**
   * Updates a user doc in the db.
   * @returns A promise resolving with { ok, doc? error? }
   */
  UpdateSelfUser: (userID, newUserObj) => {
    return new Promise((resolve, reject) => {
      module.exports.util.findOneUser({ _id: userID })
        .then((user) => {
          if (!user || user === undefined || user === null) {
            resolve({ ok: false, error: { login: { invalid: true } } })
          } else {
            module.exports.util.combineUser(user, newUserObj)
              .then((resp) => {
                if (resp.ok) {
                  const newUser = resp.doc
                  newUser._id = userID
                  module.exports.util.saveUser(newUser)
                    .then((savedUser) => {
                      resolve({ ok: true, doc: module.exports.util.sanitiseUser(savedUser) })
                    })
                    .catch(err => reject(new Error(`Could not save user with id[${userID}]: ${err}`)))
                } else {
                  resolve(resp)
                }
              })
          }
        })
        .catch(err => reject(new Error(`Could not find user with id[${userID}]: ${err}`)))
    })
  },
  /**
   * Deletes a user from the db
   * @returns A promise resolving with { ok }
   */
  DeleteUser: (userID) => {
    return new Promise((resolve, reject) => {
      module.exports.util.deleteOneUser(userID)
        .then((result) => {
          module.exports.util.deleteConvosForUser(userID, (err) => {
            if (err) {
              reject(new Error(`Could not delete conversations for user with id[${userID}]: ${err}`))
            } else {
              resolve({ ok: true })
            }
          })
        })
        .catch(err => reject(new Error(`Could not find and delete user with id[${userID}]: ${err}`)))
    })
  }
}
