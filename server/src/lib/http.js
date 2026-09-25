import mongoose from 'mongoose'

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const badRequest = (m, d) => new HttpError(400, m, d)
export const notFound = (m = 'Not found') => new HttpError(404, m)
export const forbidden = (m = 'You do not have access to this') => new HttpError(403, m)
export const conflict = (m) => new HttpError(409, m)

/** Wraps an async route so rejected promises reach the error handler. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** Parses req.body (or another source) with a zod schema. */
export function parse(schema, data) {
  const r = schema.safeParse(data)
  if (!r.success) {
    const first = r.error.issues[0]
    throw badRequest(first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input', r.error.flatten())
  }
  return r.data
}

export function objectId(id, label = 'Resource') {
  if (!mongoose.isValidObjectId(id)) throw notFound(`${label} not found`)
  return id
}
