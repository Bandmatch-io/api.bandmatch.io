var jwt = require('jsonwebtoken')
var fs = require('fs')

var options = {
  expiresIn: '31d',
  algorithm: 'RS256'
}

module.exports.issueToken = function(payload, done) {
  let privateKey = fs.readFileSync('auth/jwt.key') 
  // WHen using RS256, a private and public key is needed

  jwt.sign({ sub: payload, iat: Date.now() }, privateKey, options, (err, encoded) => {
    if (err) {
      done(err)
    } else {
      let token = {
        token: encoded,
        expiresIn: options.expiresIn
      }
      done(false, token)
    }
  })
}

module.exports.verifyToken = function (token, done) {
  let publicKey = fs.readFileSync('auth/jwt.pem') 
  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      done(err)
    } else {
      done(false, decoded)
    }
  })
}

module.exports.verifyTokenSync = function (token) {
  let publicKey = fs.readFileSync('auth/jwt.pem') 
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] })
  } catch(err) {
    return undefined
  }
}