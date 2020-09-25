var passport = require('passport')
var LocalStrategy = require('passport-local')
var bcrypt = require('bcrypt')
var User = require('../Database/Models/User')

module.exports = () => {
  /**
   * Sets up passport to use a local strategy
   */
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function (username, password, done) {
    User.findOne({ email: username.toLowerCase() }, function (err, user) {
      if (err) { return done(err) }
      if (!user) {
        return done(null, false, { emailOK: false })
      }
      bcrypt.compare(password, user.passwordHash, (err, result) => {
        if (err) {
          return done(err)
        } else {
          if (result === true) {
            return done(null, user) // needs full user, not just id for serialize/deserialize
          } else {
            return done(null, false, { passwordOK: false })
          }
        }
      })
    })
  }
  ))

  /**
   * Serializes a user.
   */
  passport.serializeUser(function (user, done) {
    // Serialize user with their id, and admin
    done(null, { id: user._id, admin: user.admin })
  })

  /**
   * Converts an id stored in a sessionID to a user object.
   */
  passport.deserializeUser(function (passportUser, done) {
    // deserialize user from there id
    User.findById(passportUser.id, function (err, user) {
      done(err, user)
    })
  })

  return passport
}
