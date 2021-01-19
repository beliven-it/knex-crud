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

  getBaseQuery () {
    this.checkKnexBinding()
    return this.knex(this.table)
  }

  async list (filters) {
    const baseQuery = this.getBaseQuery()
    const query = this.filterQueryBy(baseQuery, filters)

    const res = await query

    return Promise.all(res.map(item => this.formatter(item)))
  }

  async paginatedList (filters, limit, offset) {
    const baseQuery = this.getBaseQuery()
    const filteredQuery = this.filterQueryBy(baseQuery, filters)
    const paginatedQuery = await this.paginateQuery(filteredQuery, limit, offset)

    const rows = await Promise.all(paginatedQuery.rows.map(row => this.formatter(row)))
    const res = {
      ...paginatedQuery,
      rows
    }

    return res
  }

  async getOneBy (value, column) {
    const lookupField = column || this.pk
    const baseQuery = this.getBaseQuery()
    const res = await baseQuery.where(lookupField, value).first()

    if (!res) {
      return null
    }

    const formatted = await this.formatter(res)
    return formatted
  }

  async insertOne (data) {
    const baseQuery = this.getBaseQuery()

    const latestID = await this.knex.transaction(async (trx) => {
      await baseQuery
        .transacting(trx)
        .insert(data)

      const latest = await trx(this.table)
        .select(this.pk)
        .orderBy(this.pk, 'desc')
        .first()

      return latest[this.pk]
    })

    // TODO: optimization
    // This actually requires 3 queries. Where supported,
    // fastify.knex.returning() should  be used instead!
    const res = await this.getOneBy(latestID, this.pk)

    return res
  }

  async updateOneBy (data, value, column) {
    const lookupField = column || this.pk
    const baseQuery = this.getBaseQuery()
    await baseQuery.where(lookupField, value).limit(1).update(data)

    // TODO: optimization
    // This actually requires 2 queries. Where supported,
    // fastify.knex.returning() should  be used instead!
    const res = await this.getOneBy(value, column)

    return res
  }

  async deleteOneBy (value, column) {
    const lookupField = column || this.pk
    const baseQuery = this.getBaseQuery()
    const deletedRows = await baseQuery.where(lookupField, value).del()

    return (deletedRows > 0)
  }

  filterQueryBy (query, filters) {
    if (!query) throw new Error('Missing query')

    let _query = query.clone()

    const filtersFuncs = filters || []
    for (const filterFunc of filtersFuncs) {
      if (filterFunc) {
        _query = filterFunc(_query)
      }
    }

    return _query
  }

  searchInQueryBy (query, searchQuery, columns) {
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

  orderQueryBy (query, orderQuery) {
    if (!query) throw new Error('Missing query')

    const [orderField, orderDirection] = (orderQuery || this.defaultOrder).split(':')

    return query.orderBy(
      `${orderField}`,
      orderDirection === 'desc' ? 'desc' : 'asc'
    )
  }

  async paginateQuery (query, limit, offset) {
    if (!query) throw new Error('Missing query')

    const totalQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .distinct(this.pk)

    if (limit) {
      const _limit = parseInt(limit, 10)
      query = query.limit(_limit)
    }

    if (offset) {
      const _offset = parseInt(offset, 10)
      query = query.offset(_offset)
    }

    const rows = await query || []
    const total = await totalQuery || []

    const _total = parseInt(total.length, 10)
    const _offset = parseInt(offset, 10) || 0
    const _limit = parseInt(limit, 10) || _total
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
