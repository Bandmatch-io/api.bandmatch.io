module.exports = (rn) => {
  return {
    users: {
      1: {
        _id: '1',
        email: 'a@a.a',
        passwordHash: '$aaaaaaaa',
        timestamps: { lastlogin: rn }
      },
      2: {
        _id: '2',
        email: 'c@c.c',
        passwordHash: '$cccccccc',
        'passReset.token': 'abcdefghijklmnopqrstuvwxyz012345',
        passReset: {
          token: 'abcdefghijklmnopqrstuvwxyz012345',
          timestamp: Date.UTC(2001, 0, 1, 0, 0, 0)
        },
        timestamps: { lastlogin: rn }
      },
      3: {
        _id: '3',
        email: 'd@d.d',
        passwordHash: '$dddddddd',
        'passReset.token': 'abcdefghijklmnopqrstuvwxyz012346',
        passReset: {
          token: 'abcdefghijklmnopqrstuvwxyz012346',
          timestamp: Date.UTC(1999, 0, 1, 0, 0, 0)
        },
        timestamps: { lastlogin: rn }
      }
    }
  }
}
