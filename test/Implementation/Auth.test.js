/* eslint-disable */
const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiExclude = require('chai-exclude')

chai.use(chaiExclude)
chai.use(chaiHttp)

const expect = chai.expect
const should = chai.should()
const app = require('../../app')
const AuthController = require('../../Controllers/AuthController')

const rn = Date.UTC(2000, 0, 1, 0, 0, 0)
let db = require('./testdata/auth.data')(rn)
function restoreDB() {
  db = require('./testdata/auth.data')(rn)
}

AuthController.util.rightNow = () => { return rn }
AuthController.util.findOneUser = (q) => {
  return new Promise((resolve, reject) => {
    let usrs = Object.values(db.users).filter((usr) => {
      for (const [k, v] of Object.entries(q)) {
        if (k.includes('.')) {
          let ks = k.split('.')
          let newO = usr[ks[0]]
          if (newO === undefined || (newO !== undefined && newO[ks[1]] !== v)) {
            return false
          }
        }
        if (usr[k] !== v) {
          return false
        }
      }
      return true
    })
    resolve(usrs[0])
  })
}

AuthController.util.hashPassword = (txt) => {
  return new Promise((resolve, reject) => {
    resolve(`$${txt}`)
  })
}
AuthController.util.comparePassword = (txt, hash) => {
  return new Promise((resolve, reject) => {
    resolve(`$${txt}` === hash)
  })
}

AuthController.util.saveUser = (newUser) => {
  return new Promise((resolve, reject) => {
    db.users[newUser._id] = newUser
    resolve(newUser)
  })
}


AuthController.util.encodeToken = (usr) => {
  return new Promise((resolve, reject) => {
    resolve(JSON.stringify({ token: usr._id }))
  })
}

AuthController.util.decodeToken = (token) => {
  return new Promise((resolve, reject) => {
    resolve(JSON.parse(token))
  })
}

AuthController.util.sendEmail = (a, b, c) => {
  return new Promise((res, rej) => {
    res()
  })
}

describe('POST /auth', () => {
  var tests = [
    { name: "Correctly logs in",
      body: { email: 'a@a.a', password: 'aaaaaaaa' },
      want: {
        code: 200,
        body: { success: true, token: '{"token":"5f9d628979c1b872f2a6a001"}' }
      }
    },
    { name: "Rejects on incorrect email",
      body: { email: 'z@z.z', password: 'aaaaaaaa' },
      want: {
        code: 400,
        body: { success: false, error: { email: { invalid: true } } }
      }
    },
    { name: "Rejects on incorrect password",
      body: { email: 'a@a.a', password: 'this is an invalid password' },
      want: {
        code: 400,
        body: { success: false, error: { password: { incorrect: true } } }
      }
    },
    { name: "Rejects missing email",
      body: { password: 'this is an invalid password' },
      want: {
        code: 400,
        body: { success: false, error: { email: { missing: true } } }
      }
    },
    { name: "Rejects missing password",
      body: { email: 'a@a.a' },
      want: {
        code: 400,
        body: { success: false, error: { password: { missing: true } } }
      }
    }
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .post(`/auth`)
        .set('content-type', 'application/json')
        .send(test.body)
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

describe('POST /auth/new', () => {
  var tests = [
    { name: "Correctly signs up",
      body: { email: 'b@b.b', name: 'b', password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects if email in use",
      body: { email: 'a@a.a', name: 'b', password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { user: { exists: true } } }
      }
    },
    { name: "Rejects if email missing",
      body: { name: 'b', password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { email: { missing: true } } }
      }
    },
    { name: "Rejects if name missing",
      body: { email: 'b@b.b', password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { name: { missing: true } } }
      }
    },
    { name: "Rejects if name too long",
      body: { email: 'b@b.b', name:'12345678901234567', password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { name: { invalid: true } } }
      }
    },
    { name: "Rejects if password missing",
      body: { email: 'b@b.b', name: 'b', confirmPassword: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { password: { missing: true } } }
      }
    },
    { name: "Rejects if password too short",
      body: { email: 'b@b.b', name: 'b', password: 'asd', confirmPassword: 'asd', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { password: { invalid: true } } }
      }
    },
    { name: "Rejects if confirmPassword missing",
      body: { email: 'b@b.b', name: 'bbbbbbbb', password: 'bbbbbbbb', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
    { name: "Rejects if passwords are not equal",
      body: { email: 'b@b.b', name: 'bbbbbbbb', password: 'bbbbbbbb', confirmPassword: 'asdasdasd', agreement: true },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
    { name: "Rejects if agreement missing",
      body: { email: 'b@b.b', name: 'b', password: 'bbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { consent: { missing: true } } }
      }
    },
    { name: "Rejects if agreement false",
      body: { email: 'b@b.b', name: 'b', password: 'bbbbbbb', confirmPassword: 'bbbbbbbb', agreement: false },
      want: {
        code: 400,
        body: { success: false, error: { consent: { missing: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .post(`/auth/new`)
        .set('content-type', 'application/json')
        .send(test.body)
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

describe('POST /auth/password', () => {
  var tests = [
    { name: "Correctly updates password",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { oldPassword: 'aaaaaaaa', newPassword: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects if old is missing",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { newPassword: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { oldPassword: { missing: true } } }
      }
    },
    { name: "Rejects if new is missing",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { oldPassword: 'aaaaaaaa', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { missing: true } } }
      }
    },
    { name: "Rejects if new is too short",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { oldPassword: 'aaaaaaaa', newPassword: 'bbb', confirmPassword: 'bbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { invalid: true } } }
      }
    },
    { name: "Rejects if confirm is missing",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { oldPassword: 'bbbbbbbb', newPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
    { name: "Rejects if confirm is not equal",
      auth: { token: '5f9d628979c1b872f2a6a001' },
      body: { oldPassword: 'bbbbbbbb', newPassword: 'bbbbbbbb', confirmPassword: 'cccccccc' },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
    { name: "Rejects if user not valid",
      auth: { token: '5f9d628979c1b872f2a6a00z' },
      body: { oldPassword: 'bbbbbbbb', newPassword: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { login: { absent: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .patch(`/auth/password?tkn=${test.auth.token}&eztkn=true`)
        .set('content-type', 'application/json')
        .send(test.body)
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})


describe('POST /auth/password/<token>', () => {
  var tests = [
    { name: "Correctly resets password",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012345' },
      body: { password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects expired token",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012346' },
      body: { password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { token: { expired: true } } }
      }
    },
    { name: "Rejects invalid token",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012347' },
      body: { password: 'bbbbbbbb', confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { token: { invalid: true } } }
      }
    },
    { name: "Rejects when password missing",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012347' },
      body: { confirmPassword: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { missing: true } } }
      }
    },
    { name: "Rejects when password too short",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012347' },
      body: { password: 'bbb', confirmPassword: 'bbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { invalid: true } } }
      }
    },
    { name: "Rejects when confirmPassword missing",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012347' },
      body: { password: 'bbbbbbbb' },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
    { name: "Rejects when confirmPassword not equal",
      url: { token: 'abcdefghijklmnopqrstuvwxyz012347' },
      body: { password: 'bbbbbbbb', confirmPassword: 'cccccccc' },
      want: {
        code: 400,
        body: { success: false, error: { password: { mismatch: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .patch(`/auth/password/${test.url.token}`)
        .set('content-type', 'application/json')
        .send(test.body)
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})