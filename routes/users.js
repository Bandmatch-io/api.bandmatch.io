var express = require('express')
var router = express.Router()

var UserController = require('../Controllers/UserController')

router.post('/new', UserController.createUser)

router.post('/login', function (req, res, next) {
  res.json({ implemented: false })
})

router.get('/profile/:id', function (req, res, next) {
  res.json({ implemented: false })
})

router.patch('/profile', function (req, res, next) {
  res.json({ implemented: false })
})

router.patch('/password', function (req, res, next) {
  res.json({ implemented: false })
})

router.patch('/password/:str', function (req, res, next) {
  res.json({ implemented: false })
})

router.delete('/', function (req, res, next) {
  res.json({ implemented: false })
})

router.get('/download', function (req, res, next) {
  res.json({ implemented: false })
})

router.patch('/block/:id', function (req, res, next) {
  res.json({ implemented: false })
})

router.patch('/confirm/:str', UserController.confirmEmailAddress)

module.exports = router
