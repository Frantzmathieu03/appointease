// Postgres data-layer adapter (Supabase migration).
//
// The controllers were written against Mongoose. Rather than rewriting every
// controller, each model module below re-implements the exact Mongoose-shaped
// surface the controllers use — find / findOne / findById / create /
// findByIdAndUpdate / findOneAndUpdate, .populate(), .sort(), and document
// .save() — on top of plain SQL. Rows are returned as plain objects shaped
// like the old Mongoose documents: the uuid primary key is exposed as `_id`,
// snake_case columns are exposed under their old camelCase names, and jsonb
// columns come back as objects.
//
// Field map convention: { apiName: columnName } — e.g. password -> password_hash.
const { query } = require('../db')

function buildWhere(filter, fields, params) {
  const clauses = []
  for (const [api, val] of Object.entries(filter || {})) {
    const col = api === '_id' ? 'id' : fields[api]
    if (!col) continue
    if (val && typeof val === 'object' && '$regex' in val) {
      params.push('%' + val.$regex + '%')
      clauses.push(`${col} ILIKE $${params.length}`)
    } else {
      params.push(val)
      clauses.push(`${col} = $${params.length}`)
    }
  }
  return clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''
}

function selectCols(projection, fields) {
  if (!projection) return '*'
  const cols = ['id']
  for (const name of String(projection).split(/\s+/)) {
    if (fields[name] && !cols.includes(fields[name])) cols.push(fields[name])
  }
  return cols.join(', ')
}

function serialize(model, api, val) {
  if (val && typeof val === 'object' && model.jsonb.includes(api)) {
    return JSON.stringify(val)
  }
  return val
}

class Query {
  constructor(model, filter, projection) {
    this._model = model
    this._filter = filter
    this._projection = projection
    this._populates = []
    this._sort = null
  }

  populate(path, fields) {
    this._populates.push({ path, fields })
    return this
  }

  sort(spec) {
    this._sort = spec
    return this
  }

  async _exec() {
    const model = this._model
    const params = []
    const where = buildWhere(this._filter, model.fields, params)
    let order = ''
    if (this._sort) {
      const [api, dir] = Object.entries(this._sort)[0]
      const col = api === '_id' ? 'id' : model.fields[api]
      if (col) order = ` ORDER BY ${col} ${dir === -1 ? 'DESC' : 'ASC'}`
    }
    const { rows } = await query(
      `SELECT ${selectCols(this._projection, model.fields)} FROM ${model.table}${where}${order}`,
      params
    )
    let objs = rows.map((r) => model._toApi(r))
    for (const pop of this._populates) {
      objs = await model._populate(objs, pop)
    }
    return objs
  }

  then(res, rej) { return this._exec().then(res, rej) }
  catch(rej) { return this._exec().catch(rej) }
}

function makeModel({ table, fields, jsonb = [], populates = {} }) {
  const colToApi = {}
  for (const [api, col] of Object.entries(fields)) colToApi[col] = api

  const model = {
    table,
    fields,
    jsonb,
    _populates: populates,

    _toApi(row) {
      if (!row) return null
      const obj = {}
      for (const [col, val] of Object.entries(row)) {
        const api = col === 'id' ? '_id' : (colToApi[col] || col)
        obj[api] = val
      }
      // Mongoose-style save(): persist whichever mapped fields are present
      // on the object (controllers mutate fields, then call save()).
      Object.defineProperty(obj, 'save', {
        enumerable: false,
        value: async () => {
          const sets = []
          const params = []
          for (const [api, col] of Object.entries(fields)) {
            if (api === 'updatedAt') continue
            if (api in obj) {
              params.push(serialize(model, api, obj[api]))
              sets.push(`${col} = $${params.length}`)
            }
          }
          params.push(new Date())
          sets.push(`updated_at = $${params.length}`)
          params.push(obj._id)
          await query(
            `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${params.length}`,
            params
          )
          return obj
        }
      })
      return obj
    },

    async _populate(objs, { path, fields: proj }) {
      const getter = populates[path]
      if (!getter || !objs.length) return objs
      const target = getter()
      const ids = [...new Set(objs.map((o) => o[path]).filter((v) => typeof v === 'string'))]
      if (!ids.length) return objs
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
      const { rows } = await query(
        `SELECT ${selectCols(proj, target.fields)} FROM ${target.table} WHERE id IN (${placeholders})`,
        ids
      )
      const byId = {}
      for (const r of rows) {
        const a = target._toApi(r)
        byId[a._id] = a
      }
      for (const o of objs) {
        if (byId[o[path]]) o[path] = byId[o[path]]
      }
      return objs
    },

    find(filter = {}, projection = null) {
      return new Query(model, filter, projection)
    },

    async findOne(filter = {}) {
      const params = []
      const where = buildWhere(filter, fields, params)
      const { rows } = await query(`SELECT * FROM ${table}${where} LIMIT 1`, params)
      return model._toApi(rows[0] || null)
    },

    async findById(id, projection = null) {
      const { rows } = await query(
        `SELECT ${selectCols(projection, fields)} FROM ${table} WHERE id = $1`,
        [id]
      )
      return model._toApi(rows[0] || null)
    },

    async create(data) {
      const cols = []
      const params = []
      const placeholders = []
      for (const [api, val] of Object.entries(data || {})) {
        const col = fields[api]
        if (!col || api === 'createdAt' || api === 'updatedAt') continue
        cols.push(col)
        params.push(serialize(model, api, val))
        placeholders.push(`$${params.length}`)
      }
      const { rows } = await query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        params
      )
      return model._toApi(rows[0])
    },

    async findByIdAndUpdate(id, update) {
      const sets = []
      const params = []
      for (const [api, val] of Object.entries(update || {})) {
        const col = fields[api]
        if (!col || api === 'updatedAt') continue
        params.push(serialize(model, api, val))
        sets.push(`${col} = $${params.length}`)
      }
      params.push(new Date())
      sets.push(`updated_at = $${params.length}`)
      params.push(id)
      const { rows } = await query(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      )
      return model._toApi(rows[0] || null)
    },

    async findOneAndUpdate(filter, update) {
      const params = []
      const where = buildWhere(filter, fields, params)
      const sets = []
      for (const [api, val] of Object.entries(update || {})) {
        const col = fields[api]
        if (!col || api === 'updatedAt') continue
        params.push(serialize(model, api, val))
        sets.push(`${col} = $${params.length}`)
      }
      params.push(new Date())
      sets.push(`updated_at = $${params.length}`)
      const { rows } = await query(
        `UPDATE ${table} SET ${sets.join(', ')}${where} RETURNING *`,
        params
      )
      return model._toApi(rows[0] || null)
    }
  }

  return model
}

module.exports = { makeModel }
