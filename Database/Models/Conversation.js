const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = mongoose.ObjectId

const convSchema = new Schema({
  participants: [{ type: ObjectId, ref: 'User' }],
  lastMessage: { type: ObjectId, ref: 'Message' }
})

module.exports = mongoose.model('Conversation', convSchema)
