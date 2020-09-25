const mongoose = require('mongoose')
const StatController = require('../../Controllers/StatController')
const Conversation = require('./Conversation')
const Schema = mongoose.Schema
const ObjectId = mongoose.ObjectId

const msgSchema = new Schema({
  conversation: { type: ObjectId, ref: 'Conversation' },
  content: { type: String, maxlength: 1024, required: true },
  sender: { type: ObjectId, ref: 'User' },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
})

msgSchema.post('save', function (msg, next) {
  StatController.incrementStat('messagesSent')

  Conversation.updateOne({ _id: msg.conversation },
    { $set: { lastMessage: msg._id } }).exec()

  next()
})

module.exports = mongoose.model('Message', msgSchema)
