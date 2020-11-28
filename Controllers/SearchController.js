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

  User.findById(req.user._id, (err, currUser) => {
    if (err) {
      next(err)
    } else {
      if (!currUser) {
        return res.status(401).json({ success: false, error: { login: { absent: true } } })
      }
      // Match search types
      let types = []
      if (currUser.searchType === 'Join') {
        types = ['Recruit']
      } else if (currUser.searchType === 'Form') {
        types = ['Form', 'Either']
      } else if (currUser.searchType === 'Either') {
        types = ['Form', 'Recruit']
      } else if (currUser.searchType === 'Recruit') {
        types = ['Join', 'Either']
      }

      User.find({
        searchLocation: {
          $near: {
            $maxDistance: currUser.searchRadius * 1000, // searchRadius to km
            $geometry: { type: 'Point', coordinates: currUser.searchLocation.coordinates }
          }
        },
        genres: { $in: currUser.genres },
        instruments: { $in: currUser.instruments },
        _id: { $ne: currUser._id },
        searchType: { $in: types },
        active: true
      })
        .select('_id displayName searchType fullSearchType genres instruments description')
        .exec((err, users) => {
          if (err) {
            next(err)
          } else {
            res.json({ success: true, matches: users })

            if (!currUser.admin) { // Don't incremement stat is admin
              StatController.incrementStat('searches')
            }
          }
        })
    }
  })
}
