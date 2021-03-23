/* eslint-disable */
const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiExclude = require('chai-exclude')

chai.use(chaiExclude)
chai.use(chaiHttp)

const expect = chai.expect
const should = chai.should()
const app = require('../../app')
const ReportController = require('../../Controllers/ReportController')

const rn = Date.UTC(2000, 0, 1, 0, 0, 0)
let db = require('./testdata/reports.data')(rn)
function restoreDB() {
  db = require('./testdata/reports.data')(rn)
}

ReportController.util.saveReport = (newRep) => {
  return new Promise((resolve, reject) => {
    db.reports[newRep._id] = newRep
    resolve(newRep)
  })
}

describe('POST /reports', () => {
  var tests = [
    { name: "Correctly creates report",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'User', reportedUser: '5f9d628979c1b872f2a6a001', reason: 'Offensive'
      },
      want: {
        code: 200,
        body: { success: true }
      }
    },
    { name: "Rejects invalid target",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'Not User', reportedUser: '5f9d628979c1b872f2a6a002', reason: 'Offensive'
      },
      want: {
        code: 400,
        body: { success: false, error: { target: { invalid: true } } }
      }
    },
    { name: "Rejects invalid user",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'User', reportedUser: '', reason: 'Offensive'
      },
      want: {
        code: 400,
        body: { success: false, error: { reportedUser: { invalid: true } } }
      }
    },
    { name: "Rejects invalid reason",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'User', reportedUser: '5f9d628979c1b872f2a6a001', reason: '1982073198273'
      },
      want: {
        code: 400,
        body: { success: false, error: { reason: { invalid: true } } }
      }
    },
    { name: "Rejects missing target",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        reportedUser: '5f9d628979c1b872f2a6a002', reason: 'Offensive'
      },
      want: {
        code: 400,
        body: { success: false, error: { target: { absent: true } } }
      }
    },
    { name: "Rejects missing user",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'User', reason: 'Offensive'
      },
      want: {
        code: 400,
        body: { success: false, error: { reportTarget: { absent: true } } }
      }
    },
    { name: "Rejects missing reason",
      token: '5f9d628979c1b872f2a6a001',
      body: {
        target: 'User', reportedUser: '5f9d628979c1b872f2a6a001'
      },
      want: {
        code: 400,
        body: { success: false, error: { reason: { absent: true } } }
      }
    },
    { name: "Rejects if missing token",
      token: '',
      body: {
        target: 'User', reportedUser: '5f9d628979c1b872f2a6a001', reason: 'Offensive'
      },
      want: {
        code: 401,
        body: { success: false, error: { login: { absent: true } } }
      }
    },
  ]

  tests.forEach((test) => {
    it(test.name, (done) => {
      afterEach(restoreDB)
      chai
        .request(app)
        .post(`/reports?tkn=${test.token}&eztkn=true`)
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
