const mongoose = require('mongoose')
var debug = require('debug')('band-finder:server')

const config = require('config')

const dbConfig = config.get('Database')

let url
if (process.env.NODE_ENV === 'production') {
  url = `mongodb+srv://${dbConfig.user}:${dbConfig.pwd}@${dbConfig.url}/${dbConfig.db}`
} else {
  url = `mongodb://${dbConfig.url}:${dbConfig.port}/${dbConfig.db}`
}

mongoose.set('useUnifiedTopology', true)

mongoose.connect(url, { useNewUrlParser: true, useCreateIndex: true })

mongoose.Promise = global.Promise
const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB Connection Error: '))

db.once('open', function () {
  debug('Connected to database!')
})

module.exports = db
