var createError = require('http-errors')
var express = require('express')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var debug = require('debug')('band-match:api')
var compression = require('compression')
var config = require('config')

var airbrake = require('./bin/airbrake')()
var passport = require('./bin/passport')()

var usersRouter = require('./routes/users')
var conversationsRouter = require('./routes/conversations')
var reportsRouter = require('./routes/reports')
var adminRouter = require('./routes/admin/index')

var app = express()

app.use(passport.initialize())
app.use(passport.session())

app.use(compression())

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

app.use(airbrake.middleware)

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
  res.json({ status: err.status || 500 })
})

app.use(airbrake.errorHandler)

module.exports = app
