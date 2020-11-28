const nodemailer = require('nodemailer')
const htmlToText = require('nodemailer-html-to-text').htmlToText
const ejs = require('ejs')
const debug = require('debug')('api.bandmatch.io:mailer')
const config = require('config')

module.exports = (opts) => {
  const mailCFG = config.get('Mailer')
  let transporter

  if (mailCFG.test === true) {
    debug('Using fake mailer')
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        debug(err)
      } else {
        // create reusable transporter object using the default SMTP transport
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: account.user, // generated ethereal user
            pass: account.pass // generated ethereal password
          }
        })

        transporter.use('compile', htmlToText())
      }
    })
  } else {
    debug(`using ${mailCFG.host}:${mailCFG.port}`)
    transporter = nodemailer.createTransport({
      host: mailCFG.host,
      port: mailCFG.port,
      secure: true, // true for 465, false for other ports
      auth: {
        user: mailCFG.auth.user, // generated ethereal user
        pass: mailCFG.auth.pass // generated ethereal password
      }
    })

    transporter.verify((err, success) => {
      if (err) {
        debug(err)
      } else {
        debug('Verified with server')
        transporter.use('compile', htmlToText())
      }
    })
  }

  /**
   * ---
   * options: The options needed to send mail, requires recipient, subject and template
   * $callback:
   *  description: Called when this function finishes
   *  args:
   *    err: The error returned
   *    data: Information on the email sent.
   * ---
   */
  const sendMail = function (options, callback) {
    if (!options.recipient) {
      if (callback) {
        return callback(new Error('No recipient'), null)
      }
      return undefined
    }

    if (!options.subject) {
      if (callback) {
        return callback(new Error('No subject'), null)
      }
      return undefined
    }

    if (!options.template) {
      if (callback) {
        return callback(new Error('No template'), null)
      }
      return undefined
    }

    if (!transporter) {
      if (callback) {
        return callback(new Error('No transporter'), null)
      }
      return undefined
    }

    ejs.renderFile('views/' + options.template, options.renderOptions, (err, html) => {
      if (err) {
        return callback(err, null)
      } else {
        transporter.sendMail({
          from: mailCFG.auth.user, // sender address
          to: options.recipient, // list of receivers
          subject: options.subject, // Subject line
          html: html // html body
        }, (err, info) => {
          if (err) {
            if (callback) {
              return callback(err)
            }
          } else {
            debug(`Message Sent: ${info.messageId}`)

            // Only with Ethereal accounts
            debug(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`)

            if (callback) {
              return callback(undefined, info)
            }
          }
        })
      }
    })
  }

  return { sendMail: sendMail }
}
