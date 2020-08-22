'use strict'

const knex = require('knex')

module.exports = async function (t, tableName) {
  const k = knex({
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: ':memory:'
    }
  })

  t.tearDown(() => k.destroy())

  return k.schema
    .createTable(tableName, function (t) {
      t.increments('id').primary()
      t.string('name').notNullable()
      t.string('description').default('')
      t.integer('order').default(0)
    })
    .then(() => k)
}
