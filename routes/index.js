var express = require('express')
var SearchController = require('../Controllers/SearchController')

module.exports = () => {
  var router = express.Router()

  /* GET users listing. */
  router.get('/search', SearchController.search)

  return router
}
