const express = require('express')
const router = express.Router()
const AdminController = require('../../Controllers/AdminController')

router.get('/', AdminController.searchUsers)

/* GET users listing. */
router.get('/locations', AdminController.locationData)

router.patch('/:id/demote', AdminController.demoteUser)
router.patch('/:id/promote', AdminController.promoteUser)

router.delete('/:id', AdminController.deleteUser)
router.delete('/:id/description', AdminController.clearUserDescription)
router.delete('/:id/displayname', AdminController.clearUserName)

module.exports = router
