var express = require('express')
var router = express.Router()

const AdminController = require('../../Controllers/AdminController')

/* GET users listing. */
router.get('/daily', AdminController.getDailyStats)

router.get('/period', AdminController.getPeriodStats)

router.get('/referrals', AdminController.refData)

module.exports = router
