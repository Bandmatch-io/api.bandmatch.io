const express = require('express')
const User = require('../../Database/Models/User')

module.exports = () => {
  const router = express.Router()

  router.all('*', (req, res, next) => {
    User.findById(req.user._id, (err, user) => {
      if (err) {
        next(err)
      } else {
        if (!user) {
          res.status(404).json({ success: false })
        } else {
          if (user.admin === true) {
            next()
          } else {
            res.status(404).json({ success: false })
          }
        }
      }
    })
  })

  router.use('/users', require('./users'))
  router.use('/analytics', require('./analytics'))
  router.use('/newsletters', require('./newsletters'))
  router.use('/reports', require('./reports'))

  return router
}
