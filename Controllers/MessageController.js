const User = require('../Database/Models/User')
const Message = require('../Database/Models/Message')
const Conversation = require('../Database/Models/Conversation')
const mongoose = require('mongoose')
const MailController = require('./MailController')

/**
 * ---
 * $returns:
 *  description: Fetches all the conversations for a person
 *  type: JSON
 * ---
 * Fetches the signed in user's conversations, sorted by timestamp
 */
module.exports.fetchAllConversations = function (req, res, next) {
  // Find conversations related to signed in user.
  // Populate with users, the last message and sort by timestamp
  Conversation.find({ participants: { $in: req.user._id } })
    .populate('participants', 'displayName')
    .populate('lastMessage', 'read _id sender timestamp')
    .sort('timestamp')
    .select('-__v')
    .exec((err, conversation) => {
      if (err) {
        res.status(500)
        res.json({ success: false })
      } else {
      // Remove the logged in users id from participants
        // conversation.forEach(c => c.participants.remove(req.user._id))
        res.json({ success: true, conversations: conversation.reverse() })
      }
    })
}

module.exports.sendMessage = function (req, res, next) {
  const recipientID = req.body.recipientID
  const messageContent = req.body.messageContent

  if (!mongoose.Types.ObjectId.isValid(recipientID)) {
    res.status(400)
    return res.json({ success: false, error: { recipient: { invalid: true } } })
  }

  const msg = new Message({
    content: messageContent,
    sender: req.user._id
  })

  // Find the conversation, or create one if it doesn't exists
  Conversation.findOneAndUpdate({ participants: { $all: [req.user._id, recipientID] } },
    {},
    { new: true, upsert: true }, (err, conversation) => {
      if (err) {
        res.status(500)
        res.json({ success: false })
      } else {
        // save the new message
        msg.conversation = conversation._id
        msg.save((err, msg) => {
          if (err) {
            res.status(500)
            res.json({ success: false })
          } else {
            // Update the conversation
            Conversation.findOneAndUpdate({ _id: conversation._id },
              { $set: { lastMessage: msg._id } }, (err, conversation, res) => {
                if (err) {
                  res.status(500)
                  res.json({ success: false })
                } else {
                  // Find user to send new message email
                  User.find({ _id: recipientID }, (err, user) => {
                    if (err) {
                      res.json({ success: true, message: msg })
                    } else {
                      if (user) {
                        // needs to redirect whether MailController errors or not, so just skip those args
                        MailController.sendNewMessageEmail(user.email, conversation._id)
                      }
                      res.json({ success: true, message: msg })
                    }
                  }) // User.find
                }
              }) // Conversation.findOneAndUpdate
          }
        }) // msg.save
      }
    })
}

/**
 * ---
 * $returns:
 *  description: Opens the new conversation page
 *  type: Redirect to the conversation screen
 * ---
 * Creates a new conversation, adds a new message to it, and then redirects to that conversation page if there is no error.
 * Also sends a new message email.
 */
module.exports.sendMessageOld = function (req, res, next) {
  const convo = new Conversation({
    participants: [req.user._id, req.body.recipientID]
  })

  convo.save((err, conversation) => {
    if (err) {
      console.log(err)
      next(err)
    } else {
      const message = new Message({
        content: req.body.content.trim(),
        conversation: conversation._id,
        sender: req.user._id
      })

      // Save the message, then redirect to view the page
      message.save((err, message) => {
        if (err) {
          console.log(err)
          next(err)
        } else {
          // needs to redirect whether MailController errors or not, so just skip those args
          MailController.sendNewMessageEmail(null, conversation._id, () => {
            res.redirect('/messages/conversation/' + conversation._id)
          })
        }
      })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: Sends a new message in a conversation
 *  type: Redirect
 * ---
 * Adds a new message to a conversation, email notifies the recipient and finally redirects to that conversation page.
 */
module.exports.replyToConversation = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next()
  }

  const message = new Message({
    conversation: req.params.id,
    content: req.body.content.trim(),
    sender: req.user._id
  })

  message.save((err, message) => {
    if (err) {
      next(err)
    } else {
      // Can't be in pre hook because of cyclic dependancy
      Conversation.updateOne({ _id: req.params.id },
        { $set: { lastMessage: message._id } })
        .exec()

      // needs to redirect whether MailController errors or not, so just skip those args
      MailController.sendNewMessageEmail(null, req.params.id, () => {
        res.redirect('/messages/conversation/' + req.params.id)
      })
    }
  })
}

/**
 * ---
 * $returns:
 *  description: Data for a conversation
 *  type: JSON
 * ---
 * Fetches conversation data for conversation id, unless user is not a participant or admin.
 */
module.exports.getConversationData = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.json({ success: false })
  }

  // get the sender's name for each message in the conversation
  Message.find({ conversation: req.params.id })
    .populate('sender', '_id displayName')
    .populate('conversation')
    .exec((err, messages) => {
      if (err) {
        res.json({ success: false })
      } else {
        if (!messages) {
          res.json({ success: false })
        } else {
          if (messages.length < 1) {
            res.status(400)
            res.json({ success: false })
          }
          // Ensure only participants and admins can view the conversation
          if (messages[0].conversation.participants.includes(req.user._id) ||
              req.user.admin === true) {
            res.json({ success: true, messages: messages })
          } else {
            res.status(401)
            res.json({ success: false, error: { unauthorized: true } })
          }
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: The number of unread messages.
 *  type: JSON
 * ---
 * Gets the number of unreads for the logged in user.
 */
module.exports.unreadMessageCount = function (req, res, next) {
  Conversation.find({ participants: { $in: req.user._id } })
    .populate('lastMessage') // we only need the lastMessage field for each conversation
    .exec((err, conversations) => {
      if (err) {
        res.status(500)
        res.json({ success: false })
      } else {
        if (!conversations) {
          res.json({ success: true, count: 0 })
        } else {
        // Get the number of conversations where the last message was not sent by the logged in user, read = false
          const count = conversations.filter(c => c.lastMessage !== undefined &&
                                                !c.lastMessage.read &&
                                                c.lastMessage.sender._id.toString() !== req.user._id.toString()).length
          res.json({ success: true, count: count })
        }
      }
    })
}

/**
 * ---
 * $returns:
 *  description: success true|false
 *  type: JSON
 * ---
 * Marks a conversation as read, if the logged in user is the recipient
 */
module.exports.markAsRead = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400)
    return res.json({ success: false, error: { conversation: { invalid: true } } })
  }

  // Update the message with id if the sender is not the user logged in
  Message.updateOne({ _id: req.params.id, sender: { $ne: req.user._id } }, { $set: { read: true } })
    .exec((err, msg) => {
      if (err) {
        res.status(500)
        res.json({ success: false })
      } else {
        res.json({ success: true })
      }
    })
}

/**
 * ---
 * $returns:
 *  description: success true|false
 *  type: JSON
 * ---
 * Deletes a conversation and it's messages, returns json
 */
module.exports.deleteConvo = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400)
    return res.json({ success: false, error: { conversation: { invalid: true } } })
  }

  Conversation.find({ _id: req.params.id })
    .exec((err, convos) => {
      if (err) {
        res.status(500)
        res.json({ success: false })
      } else {
        convos.forEach((convo) => {
          Message.deleteMany({ conversation: convo._id })
            .exec((err) => {
              if (err) {
                res.status(500)
                res.json({ success: false })
              } else {
                convo.deleteOne()
                res.json({ success: true })
              }
            })
        })
      }
    })
}

/**
 * ---
 * id: The ID of the user to delete
 * $callback:
 *  description: calls the next function in the chain
 *  args:
 *    err: The error, if it exists
 * ---
 * Deletes all the conversations for a user.
 */
module.exports.deleteConvosForUser = function (id, next) {
  Conversation.find({ participants: { $in: id } })
    .exec((err, convos) => {
      if (err) {
        next(err)
      } else {
        convos.forEach((convo) => {
          Message.deleteMany({ conversation: convo._id }).exec()
          convo.deleteOne()
        })

        next()
      }
    })
}
