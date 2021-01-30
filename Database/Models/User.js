const mongoose = require('mongoose')
const Schema = mongoose.Schema
const StatController = require('../../Controllers/StatController')

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true, maxlength: 16 },
  searchType: { type: String, enum: ['Join', 'Form', 'Either', 'Recruit'], default: 'Join' },
  genres: [String],
  instruments: [String],
  searchLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0]
    }
  },
  searchRadius: { type: Number, required: true, default: 5.0 },
  description: { type: String, maxlength: 512, default: '' },
  active: { type: Boolean, default: true },
  admin: { type: Boolean, default: false },
  emailConfirmed: { type: Boolean, default: false },
  confirmString: { type: String, maxlength: 32 },
  passReset: {
    token: { type: String, maxlength: 32, required: false },
    timestamp: { type: Date, required: false }
  },
  timestamps: {
    signup_at: { type: Date, required: true },
    last_login: { type: Date, required: true },
  }
})

userSchema.index({ searchLocation: '2dsphere' })
userSchema.index({ email: 'text', displayName: 'text' })

userSchema.virtual('fullSearchType').get(function () {
  const dict = {
    Join: 'Join an existing band',
    Form: 'Form a new band',
    Either: 'Either join or form a band',
    Recruit: 'Recruit a band member'
  }
  return dict[this.searchType]
})

userSchema.statics.testValidate = function (user) {
  return new Promise((resolve, reject) => {
    const userObj = new this(user)

    userObj.validate((err) => {
      if (err) return reject(err)

      resolve(userObj)
    })
  })
}


userSchema.pre('save', function (next) {
  if (this.isNew) { // make sure is new user, and not modifiy old one
    StatController.incrementStat('signups')
  }

  next()
})

module.exports = mongoose.model('User', userSchema)
