const express = require('express')
const router = express.Router()
const AdminController = require('../../Controllers/AdminController')

router.get('/', AdminController.getReports)
router.delete('/:id', AdminController.deleteReport)

/* GET users listing. */
// router.get('/locations', AdminController.)

module.exports = router
