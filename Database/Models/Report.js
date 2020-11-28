const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = mongoose.ObjectId

const reportSchema = new Schema({
  target: { type: String, enum: ['User', 'Conversation'], required: true },
  reportedUser: { type: ObjectId, ref: 'User' },
  reportedConversation: { type: ObjectId, ref: 'Conversation' },
  reason: { type: String, required: true, reason: ['Offensive', 'Harrassment', 'Spam', 'FakeProfile'] },
  extraInformation: { type: String, maxlength: 256 }
})

module.exports = mongoose.model('Report', reportSchema)
