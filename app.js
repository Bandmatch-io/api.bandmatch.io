var createError = require('http-errors')
var express = require('express')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var debug = require('debug')('band-match:api')
var compression = require('compression')
var config = require('config')
var cors = require('cors')
var helmet = require('helmet')

var airbrake = require('./bin/airbrake')()
// var passport = require('./bin/passport')()
var jwt = require('./bin/jwt')

var indexRouter = require('./routes/index')()
var usersRouter = require('./routes/users')()
var conversationsRouter = require('./routes/conversations')()
var reportsRouter = require('./routes/reports')()
var adminRouter = require('./routes/admin/index')()
var authRouter = require('./routes/auth')()

var app = express()

app.use(compression())

app.use(helmet())

var corsOptions = {
  origin: 'http://localhost:3000',
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

var wl = config.get('anon_whitelist')
var StatController = require('./Controllers/StatController')


app.all('*', function (req, res, next) {
  if (req.query.ref) {
    StatController.addReferrer(req.query.ref)
  }

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
    let token = req.headers.authorization.split(" ")[1]
    console.log("found auth header", req.headers.authorization)
    if (token !== undefined) {
      let decoded = jwt.verifyTokenSync(token)
      if (decoded) {
        req.user = {
          _id: decoded.sub._id
        }
      }
    }
  }

  if (req.user === undefined) {
    // res.status(401)
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
  // res.render('error')
  if (req.app.get('env') !== 'production') {
    console.error(err)
    res.json({ status: 500, reason: err})
  } else {
    res.json({ status: err.status || 500 })
  }
})

app.use(airbrake.errorHandler)

module.exports = app
