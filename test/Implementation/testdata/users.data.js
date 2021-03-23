module.exports = (rn) => {
  return {
    users: {
      '5f9d628979c1b872f2a6a001': {
        _id: '5f9d628979c1b872f2a6a001',
        email: 'a@a.a',
        passwordHash: '$aaaaaaaa',
        timestamps: { lastlogin: rn },
        confirmString: 'abcdefghijklmnopqrstuvwxyz123456'
      },
      '5f9d628979c1b872f2a6a002': {
        _id: '5f9d628979c1b872f2a6a002', email: 'b@b.b', admin: true
      },
      '5f9d628979c1b872f2a6a003': {
        _id: '5f9d628979c1b872f2a6a003',
        email: 'c@c.c',
        passwordHash: '$cccccccc',
        timestamps: { lastlogin: rn }
      }
    }
  }
}
