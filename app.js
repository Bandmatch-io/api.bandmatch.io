const createError = require('http-errors')
const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const debug = require('debug')('band-match:api')
const compression = require('compression')
const config = require('config')
const cors = require('cors')
const helmet = require('helmet')

const airbrake = require('./bin/airbrake')()
// var passport = require('./bin/passport')()
const jwt = require('./bin/jwt')

const indexRouter = require('./routes/index')()
const usersRouter = require('./routes/users')()
const conversationsRouter = require('./routes/conversations')()
const reportsRouter = require('./routes/reports')()
const adminRouter = require('./routes/admin/index')()
const authRouter = require('./routes/auth')()

const app = express()

app.use(compression())

app.use(helmet())

const corsOptions = {
  origin:  function(origin, callback){
    // allow requests with no origin 
    if(!origin) return callback(null, true)
    if(config.get('cors_whitelist').indexOf(origin) === -1){
      var message = 'The CORS policy for this origin doesn\'t allow access from the particular origin.'
      return callback(new Error(message), false)
    }
    return callback(null, true)
  },
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true
}

app.use(cors(corsOptions))

/**
 * Set up user sessions. Memory store for dev, mongoDB for prod
 */
app.use(require('./bin/sessions')((err) => {
  if (err) {
    debug(err)
  }
}))

// view engine setup
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// app.use(passport.initialize())
// app.use(passport.session())

app.use(airbrake.middleware)

const wl = config.get('anon_whitelist')
const StatController = require('./Controllers/StatController')

app.all('*', function (req, res, next) {
  let allowThrough = false
  wl.forEach((url) => {
    const regex = new RegExp(url, 'g')
    if (regex.exec(req.url.split('?')[0]) !== null) {
      allowThrough = true
    }
  })
  if (allowThrough) {
    return next()
  }

  if (req.headers.authorization !== undefined) {
    const token = req.headers.authorization.split(' ')[1]
    if (token !== undefined) {
      const decoded = jwt.verifyTokenSync(token)
      if (decoded) {
        req.user = {
          _id: decoded.sub._id
        }
      }
    }
  }

  if (req.user === undefined) {
    return res.status(401).json({ success: false, error: { login: { absent: true } } })
  }
  return next()
})

app.use('/', indexRouter)
app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/conversations', conversationsRouter)
app.use('/reports', reportsRouter)
app.use('/admin', adminRouter)

app.post('/ref', (req, res, next) => {
  if (req.query.r) {
    StatController.addReferrer(req.query.r)
  }
  res.json({ success: true })
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  
  if (req.app.get('env') !== 'production') {
    debug(err)
    res.json({ status: 500, reason: err })
  } else {
    res.json({ status: err.status || 500 })
  }
})

app.use(airbrake.errorHandler)

module.exports = app
