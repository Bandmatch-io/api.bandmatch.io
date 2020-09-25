const User = require('../Database/Models/User')
const StatController = require('../Controllers/StatController')

/**
 * ---
 * $returns:
 *  description: success true|false, matches [User]
 *  type: JSON
 * ---
 * Searches for users based on their user data.
 */
module.exports.search = function (req, res, next) {
  if (req.user === undefined) {
    return next()
  }

  // Match search types
  let types = []
  if (req.user.searchType === 'Join') {
    types = ['Recruit']
  } else if (req.user.searchType === 'Form') {
    types = ['Form', 'Either']
  } else if (req.user.searchType === 'Either') {
    types = ['Form', 'Recruit']
  } else if (req.user.searchType === 'Recruit') {
    types = ['Join', 'Either']
  }

  User.find({
    searchLocation: {
      $near: {
        $maxDistance: req.user.searchRadius * 1000, // searchRadius to km
        $geometry: { type: 'Point', coordinates: req.user.searchLocation.coordinates }
      }
    },
    genres: { $in: req.user.genres },
    instruments: { $in: req.user.instruments },
    _id: { $ne: req.user._id },
    searchType: { $in: types },
    active: true
  })
    .select('_id displayName searchType fullSearchType genres instruments description')
    .exec((err, users) => {
      if (err) {
        res.json({ success: false })
      } else {
        res.json({ success: true, matches: users })

        if (!req.user.admin) { // Don't incremement stat is admin
          StatController.incrementStat('searches')
        }
      }
    })
}
