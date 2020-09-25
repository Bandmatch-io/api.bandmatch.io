var mongoose = require('mongoose')
var Schema = mongoose.Schema

var statSchema = new Schema({
  date: { type: Date, unique: true },
  messagesSent: { type: Number, default: 0 },
  logins: { type: Number, default: 0 },
  signups: { type: Number, default: 0 },
  searches: { type: Number, default: 0 },
  rootViews: { type: Number, default: 0 },
  referrers: [{
    url: { type: String },
    count: { type: Number, default: 0 }
  }]
})

statSchema.virtual('rejections').get(function () {
  return this.rootViews - this.logins - this.signups
})

statSchema.virtual('conversionRate').get(function () {
  return (this.signups) / (this.rootViews - this.logins)
})

statSchema.set('toObject', { virtuals: true })
statSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Statistic', statSchema)
