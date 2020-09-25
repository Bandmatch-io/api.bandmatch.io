const Stat = require('../Database/Models/Statistic')

/**
 * ---
 * field: The statistic name to increment, 'signups'|'logins'|'messagesSent'|'searches'|'rootViews'
 * $returns:
 *  description: Nothing, success is implied
 *  type: Null
 * ---
 * Increments a statistic by one.
 */
module.exports.incrementStat = function (field) {
  let inc = { }
  if (field === 'signups') {
    inc = { signups: 1 }
  } else if (field === 'logins') {
    inc = { logins: 1 }
  } else if (field === 'messagesSent') {
    inc = { messagesSent: 1 }
  } else if (field === 'searches') {
    inc = { searches: 1 }
  } else if (field === 'rootViews') {
    inc = { rootViews: 1 }
  }

  const [date, month, year] = (new Date())
    .toLocaleDateString('en-GB', { timeZone: 'UTC' })
    .split('/')
  Stat.updateOne({ date: new Date(Date.UTC(year, month - 1, date)) },
    { $inc: inc },
    { upsert: true })
    .exec()
}

/**
 * ---
 * ref: The ref string
 * $callback:
 *  description: Called when database has been written to, but this is optional.
 *  args:
 *    err: The error if it exists
 * ---
 */
module.exports.addReferrer = function (ref, cb) {
  if (ref === undefined) {
    if (cb) {
      cb(null)
    }
    return
  }

  const [date, month, year] = (new Date())
    .toLocaleDateString('en-GB', { timeZone: 'UTC' })
    .split('/')

  Stat.findOne({ date: new Date(Date.UTC(year, month - 1, date)) })
    .exec((err, stat) => {
      if (err) {
        if (cb) {
          cb(err)
        }
      } else {
        if (!stat) {
          stat = { referrers: [{ url: '', count: 0 }] }
        }

        const refs = stat.referrers
        const refInd = refs.findIndex(e => e.url === ref)

        if (refInd >= 0) {
          refs[refInd].count += 1
        } else {
          refs.push({ url: ref, count: 1 })
        }

        Stat.updateOne({ date: new Date(Date.UTC(year, month - 1, date)) },
          { referrers: refs },
          { upsert: true })
          .exec((err) => {
            if (err) {
              if (cb) {
                cb(err)
              }
            } else {
              if (cb) {
                cb(null)
              }
            }
          })
      }
    })
}
