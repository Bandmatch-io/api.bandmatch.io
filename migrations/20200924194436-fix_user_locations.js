module.exports = {
  async up (db, client) {
    db.collection('users').updateMany({
      'searchLocation.coordinates': [0.1278, 51.5074]
    },
    {
      $set: { 'searchLocation.coordinates': [0, 0] }
    })
  },

  async down (db, client) {
    db.collection('users').updateMany({
      'searchLocation.coordinates': [0, 0]
    },
    {
      $set: {
        'searchLocation.coordinates': [0.1278, 51.5074]
      }
    })
  }
}
