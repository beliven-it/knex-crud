'use strict'

const { test } = require('tap')
const KnexCRUD = require('../knex-crud')
const buildApp = require('./builder')

const tableName = 'test'
const rows = [
  { id: 1, name: 'Hello', order: 1 },
  { id: 2, name: 'World', order: 2 },
  { id: 3, name: 'Carlos', order: 3 },
  { id: 4, name: 'Mickey' },
  { id: 5, name: 'Mary' }
]

test('knex-crud', async t => {
  t.test('without table name', async t => {
    t.plan(1)
    try {
      // eslint-disable-next-line no-unused-vars
      const crud = new KnexCRUD()
      t.fail('should throw an error')
    } catch (err) {
      t.true(!!err, 'should throw an error')
    }
  })

  t.test('with table name', async t => {
    t.plan(1)
    try {
      const crud = new KnexCRUD(tableName)
      t.equal(crud.table, tableName, 'should create a new instance with the given table name')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('binding an invalid knex instance', async t => {
    t.plan(1)
    const crud = new KnexCRUD(tableName)
    try {
      crud.bind()
      t.fail('should throw an error')
    } catch (err) {
      t.true(!!err, 'should throw an error')
    }
  })

  t.test('binding a valid knex instance', async t => {
    t.plan(1)
    const knex = await buildApp(t, tableName)
    const crud = new KnexCRUD(tableName)
    try {
      crud.bind(knex)
      t.equal(crud.knex, knex, 'should assign the internal knex reference')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('listing without additional filters', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      const res = await crud.list()
      const rowIds = rows.map(row => row.id)
      const resIds = res.map(row => row.id)
      t.same(resIds, rowIds, 'should return all existing records')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('listing with additional filters', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    const filter1 = query => query.where('id', '>', 2)
    const filter2 = query => query.whereNot('name', 'Mary')

    try {
      const res = await crud.list([filter1, filter2])
      const rowIds = rows.filter(item => item.id > 2 && item.name !== 'Mary').map(row => row.id)
      const resIds = res.map(row => row.id)
      t.same(resIds, rowIds, 'should return only filtered records')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('paginating with additional filters', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    const filter1 = query => query.where('id', '>', 2)

    try {
      const res = await crud.paginatedList([filter1], 2, 1)
      const rowIds = rows.filter(item => item.id > 2).map(row => row.id).slice(1, 3)
      const resIds = res.rows.map(row => row.id)
      t.same(resIds, rowIds, 'should return only filtered, paginated records')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('getting one missing record', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      const res = await crud.getOneBy(99)
      t.equal(res, null, 'should return null')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('getting one existing record', async t => {
    t.plan(2)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      const res = await crud.getOneBy(rows[1].id)
      t.equal(res.id, rows[1].id, 'should return the requested record')
      t.equal(res.name, rows[1].name, 'should include the requested record data')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('getting one record with a formatter', async t => {
    t.plan(2)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName, {
      formatter: data => ({
        ...data,
        upperName: data.name.toUpperCase()
      })
    })

    crud.bind(knex)

    try {
      const res = await crud.getOneBy(rows[1].id)
      t.equal(res.id, rows[1].id, 'should return the requested record')
      t.equal(res.upperName, rows[1].name.toUpperCase(), 'should include the formatted data')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('inserting one record without data', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      await crud.insertOne()
      t.fail('should throw an error')
    } catch (err) {
      t.true(!!err, 'should throw an error')
    }
  })

  t.test('inserting one record with valid data', async t => {
    t.plan(2)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)
    const data = {
      name: 'another'
    }

    crud.bind(knex)

    try {
      const res = await crud.insertOne(data)
      t.equal(res.id, 6, 'should have inserted a new record')
      t.equal(res.name, data.name, 'the new record should have the provided data')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('updating a missing record', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    const crud = new KnexCRUD(tableName)
    const data = {
      name: 'updated'
    }

    crud.bind(knex)

    try {
      const res = await crud.updateOneBy(data, 99)
      t.equal(res, null, 'should return null')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('updating one existing record', async t => {
    t.plan(2)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)
    const data = {
      name: 'updated'
    }

    crud.bind(knex)

    try {
      const res = await crud.updateOneBy(data, rows[1].id)
      t.equal(res.id, rows[1].id, 'should have updated the existing record')
      t.equal(res.name, data.name, 'should have updated the provided data')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('deleting a missing record', async t => {
    t.plan(1)

    const knex = await buildApp(t, tableName)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      const res = await crud.deleteOneBy(99)
      t.equal(res, false, 'should return false')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })

  t.test('deleting an existing record', async t => {
    t.plan(2)

    const knex = await buildApp(t, tableName)
    await knex(tableName).insert(rows)
    const crud = new KnexCRUD(tableName)

    crud.bind(knex)

    try {
      const res = await crud.deleteOneBy(rows[1].id)
      t.equal(res, true, 'should return true')
      const ids = await knex(tableName).distinct('id').pluck('id')
      t.equal(ids.indexOf(rows[1].id), -1, 'should have deleted the given record')
    } catch (err) {
      console.log(err)
      t.error(err, 'should not throw any error')
    }
  })
})
