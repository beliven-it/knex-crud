'use strict'

const defaultFormatter = async data => data

class KnexCRUD {
  constructor (table, opts = {}) {
    if (!table) throw new Error('Missing table name')

    this.table = table
    this.pk = opts.pk || 'id'
    this.defaultOrder = opts.defaultOrder || `${this.pk}:asc`
    this.formatter = opts.formatter || defaultFormatter
  }

  bind (knex) {
    this.knex = knex

    this.checkKnexBinding()

    // TODO: find a better way to decorate the knex instance!
    this.knex.ciLike = (column, value) => {
      return this.knex.raw('LOWER(??) LIKE LOWER(?)', [column, `%${value}%`])
    }
  }

  checkKnexBinding () {
    if (!this.knex) throw new Error('Missing knex binding')
  }

  async filterBy (filters) {
    this.checkKnexBinding()

    const filtersFuncs = filters || []
    let query = this.knex(this.table)

    for (let i = 0; i < filtersFuncs.length; ++i) {
      const filterFunc = filtersFuncs[i]
      if (filterFunc) {
        query = filterFunc(query)
      }
    }

    const res = await query

    return res.map(item => this.formatter(item))
  }

  async getOneBy (value, column) {
    this.checkKnexBinding()

    const lookupField = column || this.pk
    const res = await this.knex(this.table)
      .where(lookupField, value)
      .first()
    const formatted = await this.formatter(res)
    return formatted || null
  }

  async insertOne (data) {
    this.checkKnexBinding()

    const latestID = await this.knex.transaction(async (trx) => {
      await this.knex(this.table)
        .transacting(trx)
        .insert(data)

      const latest = await trx(this.table).select(this.pk).orderBy(this.pk, 'desc').first()
      return latest[this.pk]
    })

    // TODO: optimization
    // This actually requires 3 queries. Where supported,
    // fastify.knex.returning() should  be used instead!
    const res = await this.getOneBy(latestID, this.pk)

    return res
  }

  async updateOneBy (data, value, column) {
    this.checkKnexBinding()

    const lookupField = column || this.pk
    await this.knex(this.table)
      .where(lookupField, value)
      .limit(1)
      .update(data)

    // TODO: optimization
    // This actually requires 2 queries. Where supported,
    // fastify.knex.returning() should  be used instead!
    const res = await this.getOneBy(value, column)

    return res
  }

  async deleteOneBy (value, column) {
    this.checkKnexBinding()

    const lookupField = column || this.pk
    const deletedRows = await this.knex(this.table)
      .where(lookupField, value)
      .del()

    return (deletedRows > 0)
  }

  async searchInQueryBy (query, searchQuery, columns) {
    this.checkKnexBinding()

    if (!query) throw new Error('Missing query')

    if (searchQuery && columns) {
      return query.where(function () {
        const subquery = (columns || []).reduce((total, field, idx) => {
          return (idx === 0)
            ? total.whereRaw(this.knex.ciLike(field, searchQuery))
            : total.orWhere(this.knex.ciLike(field, searchQuery))
        }, this)
        return subquery
      })
    }

    return query
  }

  async orderQueryBy (query, orderQuery) {
    this.checkKnexBinding()

    if (!query) throw new Error('Missing query')

    const [orderField, orderDirection] = (orderQuery || this.defaultOrder).split(':')

    return query.orderBy(
      `${orderField}`,
      orderDirection === 'desc' ? 'desc' : 'asc'
    )
  }

  async paginateQuery (query, limit, offset) {
    this.checkKnexBinding()

    if (!query) throw new Error('Missing query')

    const totalQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .distinct(this.pk)

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    if (offset) {
      query = query.offset(parseInt(offset))
    }

    const rows = await query || []
    const total = await totalQuery || []

    const _total = parseInt(total.length)
    const _offset = parseInt(offset) || 0
    const _limit = parseInt(limit) || _total
    const _page = Math.ceil(_offset / _limit)

    return {
      rows,
      page: _page,
      limit: _limit,
      offset: _offset,
      total: _total
    }
  }
}

module.exports = KnexCRUD
