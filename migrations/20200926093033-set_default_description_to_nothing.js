module.exports = {
  async up(db, client) {
    await db.collection('users').updateMany({ description: '# This is your description' },
      { $set: { description: '' } })
  },

  async down(db, client) {
    await db.collection('users').updateMany({ description: '' },
      { $set: { description: '# This is your description' } })
  }
};
