const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = mongoose.ObjectId

const reportSchema = new Schema({
  target: { type: String, enum: ['User', 'Conversation'], required: true },
  reportedUser: { type: ObjectId, ref: 'User' },
  reportedConversation: { type: ObjectId, ref: 'Conversation' },
  reason: { type: String, required: true, enum: ['Offensive', 'Harrassment', 'Spam', 'FakeProfile'] },
  extraInformation: { type: String, maxlength: 256 },
  timestamps: {
    created_at: { type: Date, default: Date.now }
  }
})

module.exports = mongoose.model('Report', reportSchema)
