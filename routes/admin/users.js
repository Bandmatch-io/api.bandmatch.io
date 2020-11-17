var express = require('express')
var router = express.Router()
const AdminController = require('../../Controllers/AdminController')

/* GET users listing. */
router.get('/locations', AdminController.locationData)

module.exports = router
