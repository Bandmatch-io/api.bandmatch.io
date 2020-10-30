var passport = require('passport')
var LocalStrategy = require('passport-local')
var JwtStrategy = require('passport-jwt').Strategy
var ExtractJwt = require('passport-jwt').ExtractJwt
var bcrypt = require('bcrypt')
var User = require('../Database/Models/User')

module.exports = () => {
  var options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'SECRETKEY',
    // issuer: 'api.bandmatch.io',
    // audience: 'bandmatch.io'
  }

  passport.use(new JwtStrategy(
    options,
    function(jwtPayload, done) { // FINISH THIS PLEASE
      console.log(jwtPayload)
      User.findOne({id: jwt_payload.sub}, function(err, user) {
        if (err) {
            return done(err, false);
        }
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
            // or you could create a new account
        }
    })
  }))


  /**
   * Sets up passport to use a local strategy
   */
  // passport.use(new LocalStrategy({
  //   usernameField: 'email',
  //   passwordField: 'password'
  // },
  // function (username, password, done) {
  //   User.findOne({ email: username.toLowerCase() }, function (err, user) {
  //     if (err) { return done(err) }
  //     if (!user) {
  //       return doneUser.findOne({ email: username.toLowerCase() }, function (err, user) {
  //     if (err) { return done(err) }
  //     if (!user) {
  //       return done(null, false, { emailOK: false })
  //     }
  //     bcrypt.compare(password, user.passwordHash, (err, result) => {
  //       if (err) {
  //         return done(err)
  //       } else {
  //         if (result === true) {
  //           return done(null, user) // needs full user, not just id for serialize/deserialize
  //         } else {
  //           return done(null, false, { passwordOK: false })
  //         }
  //       }
  //     })(null, false, { emailOK: false })
  //     }
  //     bcrypt.compare(password, user.passwordHash, (err, result) => {
  //       if (err) {
  //         return done(err)
  //       } else {
  //         if (result === true) {
  //           return done(null, user) // needs full user, not just id for serialize/deserialize
  //         } else {
  //           return done(null, false, { passwordOK: false })
  //         }
  //       }
  //     })
  //   })
  // })
  // )

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
