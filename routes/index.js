const express = require('express')
const SearchController = require('../Controllers/SearchController')

module.exports = () => {
  const router = express.Router()

  /* GET users listing. */
  router.get('/search', SearchController.search)

  return router
}
