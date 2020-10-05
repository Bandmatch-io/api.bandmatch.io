var session = require('express-session')
var MongoDBStore = require('connect-mongodb-session')(session)
const config = require('config')

/**
 * ---
 * $callback:
 *  description: passed into MongoDBStore
 *  args:
 *    err: Error
 *    data: Mongo Data
 * ---
 * Initializes user sessions either in memory (dev) or db (prod)
 */
module.exports = function (callback) {
  const sessionsCFG = config.get('Sessions')
  const sessionsDB = sessionsCFG.Database
  if (process.env.NODE_ENV === 'production') {
    // Creating sessions store
    let url
    if (process.env.NODE_ENV === 'production') {
      url = `mongodb+srv://${sessionsDB.user}:${sessionsDB.pwd}@${sessionsDB.url}/${sessionsDB.db}`
    } else {
      url = `mongodb://${sessionsDB.user}:${sessionsDB.pwd}@${sessionsDB.url}:${sessionsDB.port}/${sessionsDB.db}`
    }
    var store = new MongoDBStore({
      uri: url,
      collection: 'userSessions',
      connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
      }
    }, callback)

    return session({
      secret: sessionsCFG.secret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * sessionsCFG.ageInDays,
        sameSite: 'none',
        secure: true
      },
      store: store,
      saveUninitialized: false,
      resave: false
    })
  } else {
    return session({
      secret: sessionsCFG.secret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * sessionsCFG.ageInDays
      },
      saveUninitialized: false,
      resave: false
    })
  }
}
