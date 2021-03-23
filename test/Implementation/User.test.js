/* eslint-disable */
const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiExclude = require('chai-exclude')

chai.use(chaiExclude)
chai.use(chaiHttp)

const expect = chai.expect
const should = chai.should()
const app = require('../../app')
const UserController = require('../../Controllers/UserController')

const rn = Date.UTC(2000, 0, 1, 0, 0, 0)
let db = require('./testdata/users.data')(rn)
function restoreDB() {
  db = require('./testdata/users.data')(rn)
}

UserController.util.rightNow = () => { return rn }
UserController.util.findSomeUsers = (q) => {
  return new Promise((resolve, reject) => {
    let usrs = Object.values(db.users).filter((usr) => {
      for (const [k, v] of Object.entries(q)) {
        if (usr[k] !== v) {
          return false
        }
      }
      return true
    })
    resolve(usrs)
  })
}

UserController.util.findOneUser = (q) => {
  return new Promise((resolve, reject) => {
    UserController.util.findSomeUsers(q)
      .then((user) => {
        resolve(user[0])
      })
      .catch(err => reject(err))
  })
}

UserController.util.deleteOneUser = (id) => {
  return new Promise((resolve, reject) => {
    resolve({ ok: true })
  })
}

UserController.util.deleteConvosForUser = (id, next) => {
  next(false)
}

UserController.util.saveUser = (newUser) => {
  return new Promise((resolve, reject) => {
    db.users[newUser._id] = newUser
    resolve(newUser)
  })
}

UserController.util.sendConfEmail = (a, b, c) => {
  return new Promise((res, rej) => {
    res()
  })
}

UserController.util.sendReqPassEmail = (a, b, c) => {
  return new Promise((res, rej) => {
    res()
  })
}

describe('POST /users/confirm/:str', () => {
  var tests = [
    { name: "Correctly confirms user",
      confString: 'abcdefghijklmnopqrstuvwxyz123456', user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects missing confString",
      confString: '', user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 404,
        body: { reason: { message: "Not Found" }, status: 404 }
      }
    },
    { name: "Rejects incorrect confString",
      confString: 'abcdefghijklmnopqrstuvwxyz123123', user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 400,
        body: { success: false, error: { user: { notfound: true } } }
      }
    },
    { name: "Rejects missing user",
      confString: 'abcdefghijklmnopqrstuvwxyz123123', user: '',
      want: {
        code: 401,
        body: { success: false, error: { login: { absent: true } } }
      }
    },
    { name: "Rejects incorrect user",
      confString: 'abcdefghijklmnopqrstuvwxyz123123', user: '5f9d628979c1b872f2a6a002',
      want: {
        code: 400,
        body: { success: false, error: { user: { notfound: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .post(`/users/confirm/${test.confString}?tkn=${test.user}&eztkn=true`)
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


describe('POST /users/confirm/:str', () => {
  var tests = [
    { name: "Correctly resends email",
      user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects if missing user",
      user: '',
      want: {
        code: 401,
        body: { success: false, error: { login: { absent: true } } }
      }
    },
    { name: "Rejects if user invalid",
      user: '5f9d628979c1b872f2a6a00z',
      want: {
        code: 400,
        body: { success: false, error: { email: { invalid: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .patch(`/users/confirm/resend?tkn=${test.user}&eztkn=true`)
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

describe('GET /users/profile/confirm_token/<token>', () => {
  var tests = [
    { name: "Correctly finds user",
      user: '5f9d628979c1b872f2a6a001', token: 'abcdefghijklmnopqrstuvwxyz123456',
      want: {
        code: 200,
        body: { success: true,
          user: {
          _id: '5f9d628979c1b872f2a6a001', email: 'a@a.a',
          timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Rejects invalid token",
      user: '5f9d628979c1b872f2a6a001', token: 'abcdefghijklmnopqrstuvwxyz123123',
      want: {
        code: 400,
        body: { success: false, error: { token: { invalid: true } }}
      }
    },
    { name: "Rejects missing token",
      user: '5f9d628979c1b872f2a6a001', token: '',
      want: {
        code: 400,
        body: { success: false, error: { user: { notfound: true } }}
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .get(`/users/profile/confirm_token/${test.token}?tkn=${test.user}&eztkn=true`)
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

describe('PATCH /users/password/request', () => {
  var tests = [
    { name: "Correctly finds user",
      body: { email: 'a@a.a' },
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects missing email",
      body: {  },
      want: {
        code: 400,
        body: { success: false, error: { email: { missing: true } } }
      }
    },
    { name: "Rejects invalid email",
      body: { email: '' },
      want: {
        code: 400,
        body: { success: false, error: { email: { invalid: true } } }
      }
    },
    { name: "Rejects incorrect email",
      body: { email: 'z@z.z' },
      want: {
        code: 400,
        body: { success: false, error: { email: { invalid: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .patch(`/users/password/request`)
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

describe('GET /users/profile', () => {
  var tests = [
    { name: "Correctly returns user",
      token: '5f9d628979c1b872f2a6a001',
      want: {
        code: 200,
        body: { success: true,
          user: {
            _id: '5f9d628979c1b872f2a6a001', email: 'a@a.a',
            timestamps: { lastlogin: rn }
          }
        }
      }
    },
    { name: "Rejects missing login",
      token: '',
      want: {
        code: 401,
        body: { success: false, error: { login:{ absent: true } }}
      }
    }
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .get(`/users/profile?tkn=${test.token}&eztkn=true`)
        .set('content-type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

describe('GET /users/profile/<id>', () => {
  var tests = [
    { name: "Correctly returns user",
      token: '5f9d628979c1b872f2a6a001', user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 200,
        body: { success: true,
          user: {
            _id: '5f9d628979c1b872f2a6a001', email: 'a@a.a',
            timestamps: { lastlogin: rn }
          }
        }
      }
    },
    { name: "Rejects missing login",
      token: '', user: '5f9d628979c1b872f2a6a001',
      want: {
        code: 401,
        body: { success: false, error: { login:{ absent: true } }}
      }
    },
    { name: "Rejects invalid user",
      token: '5f9d628979c1b872f2a6a001', user: undefined,
      want: {
        code: 400,
        body: { success: false, error: { user: { notfound: true } }}
      }
    },
    { name: "Rejects missing user",
      token: '5f9d628979c1b872f2a6a001', user: '5f9d628979c1b872f2a6a00z',
      want: {
        code: 400,
        body: { success: false, error: { user: { notfound: true } }}
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .get(`/users/profile/${test.user}?tkn=${test.token}&eztkn=true`)
        .set('content-type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

describe('GET /users/admins/list', () => {
  var tests = [
    { name: "Correctly returns user",
      token: '5f9d628979c1b872f2a6a001',
      want: {
        code: 200,
        body: {
          success: true,
          users: [
            { _id: '5f9d628979c1b872f2a6a002', email: 'b@b.b', admin: true }
          ] 
        }
      }
    }
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .get(`/users/admins/list?tkn=${test.token}&eztkn=true`)
        .set('content-type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

describe('PATCH /users/profile', () => {
  var tests = [
    { name: "Correctly updates displayName",
      token: '5f9d628979c1b872f2a6a003', body: { displayName: 'test' },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', displayName: 'test', timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Rejects invalid displayName",
      token: '5f9d628979c1b872f2a6a003', body: { displayName: 'longer than 16 characters' },
      want: {
        code: 400,
        body: {
          success: false,
          error: { displayName: { invalid: true } }
        }
      }
    },
    { name: "Correctly updates genres",
      token: '5f9d628979c1b872f2a6a003', body: { genres: ['test', 'other002/%^&'] },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', genres: ['test', 'other'], timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Correctly updates instruments",
      token: '5f9d628979c1b872f2a6a003', body: { instruments: ['test', 'other00)(*&:~@2'] },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', instruments: ['test', 'other'], timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Correctly updates searchType",
      token: '5f9d628979c1b872f2a6a003', body: { searchType: 'Form' },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', searchType: 'Form', timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Rejects invalid searchType",
      token: '5f9d628979c1b872f2a6a003', body: { searchType: 'longer than 16 characters' },
      want: {
        code: 400,
        body: {
          success: false,
          error: { searchType: { invalid: true } }
        }
      }
    },
    { name: "Correctly updates description",
      token: '5f9d628979c1b872f2a6a003', body: { description: 'Form' },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', description: 'Form', timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Rejects invalid description",
      token: '5f9d628979c1b872f2a6a003', body: { description: '0'.repeat(513) },
      want: {
        code: 400,
        body: {
          success: false,
          error: { description: { invalid: true } }
        }
      }
    },
    { name: "Correctly updates searchRadius",
      token: '5f9d628979c1b872f2a6a003', body: { searchRadius: 50 },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', searchRadius: 50, timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Rejects invalid searchRadius",
      token: '5f9d628979c1b872f2a6a003', body: { searchRadius: -1 },
      want: {
        code: 400,
        body: {
          success: false,
          error: { searchRadius: { negative: true } }
        }
      }
    },
    { name: "Correctly updates searchLocation.coordinates",
      token: '5f9d628979c1b872f2a6a003', body: { searchLocation: { coordinates: [50, 50] } },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', searchLocation: { coordinates: [50, 50] }, timestamps: { lastlogin: rn } }
        }
      }
    },
    { name: "Correctly updates active",
      token: '5f9d628979c1b872f2a6a003', body: { active: true },
      want: {
        code: 200,
        body: {
          success: true,
          user: { _id: '5f9d628979c1b872f2a6a003', email: 'c@c.c', active: true, timestamps: { lastlogin: rn } }
        }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .patch(`/users/profile?tkn=${test.token}&eztkn=true`)
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

describe('DELETE /users', () => {
  var tests = [
    { name: "Correctly deletes user",
      token: '5f9d628979c1b872f2a6a003',
      want: {
        code: 200,
        body: { success: true }
      }
    }
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .delete(`/users?tkn=${test.token}&eztkn=true`)
        .set('content-type', 'application/json')
        .end((err, res) => {
          expect(err).to.be.null;
          res.should.have.status(test.want.code)
          expect(res.body).excludingEvery('_id').to.deep.equal(test.want.body)
          done()
        })
    })
  })
})

