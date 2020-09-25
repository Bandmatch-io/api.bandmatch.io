const mailer = require('../bin/mailer')()
const config = require('config')

/**
 * ---
 * email: The email recipient
 * convoID: The ID for linking to the new message
 * $callback:
 *  description: Called once the mailer has sent some mail
 *  args:
 *    err: The error, if there is one
 *    info: The email information.
 * ---
 * Sends an email telling a user that they have a new message.
 */
module.exports.sendNewMessageEmail = function (email, convoID, callback) {
  const options = {
    recipient: email,
    subject: 'New Message!',
    template: 'emails/newmessage.ejs',
    renderOptions: { link: `${config.get('host_name')}/messages/conversation/${convoID}` }
  }

  mailer.sendMail(options, (err, info) => {
    callback(err, info)
  })
}

/**
 * ---
 * email: The email recipient
 * passStr: The string reference allowing the password_reset string in the db
 * $callback:
 *  description: Called when the mailer is finished
 *  args:
 *    err: The error, if there is one
 *    info: Information on the sent email
 * ---
 * Sends an email to a user with a password reset link
 */
module.exports.sendRequestPassEmail = function (email, passStr, callback) {
  const options = {
    recipient: email,
    subject: 'Password reset request',
    template: 'emails/requestPass.ejs',
    renderOptions: { link: `${config.get('host_name')}/users/newpassword?s=${passStr}` }
  }

  mailer.sendMail(options, (err, info) => {
    callback(err, info)
  })
}

/**
 * ---
 * email: The email recipient
 * confString: The confirm_string associated with a user from the db
 * $callback:
 *  description: Called when the mailer is finished
 *  args:
 *    err: The error, if there is one
 *    info: Information on the sent email
 * ---
 * Sends an email to a user when they sign up to verify their email
 */
module.exports.sendNewUserEmail = function (email, confString, callback) {
  const options = {
    recipient: email,
    subject: 'Please confirm your email address',
    template: 'emails/confirmaccount.ejs',
    renderOptions: { link: `${config.get('host_name')}/users/confirmemail/${confString}` }
  }
  console.log(options)

  mailer.sendMail(options, (err, info) => {
    callback(err, info)
  })
}
