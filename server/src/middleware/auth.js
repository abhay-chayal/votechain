import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { HttpError } from '../lib/http.js'
import { User } from '../models/index.js'

export const REFRESH_COOKIE = 'vc_rt'

export function signAccess(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.accessTtl })
}

export function setRefreshCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), v: user.tokenVersion }, config.refreshSecret, { expiresIn: `${config.refreshTtlDays}d` })
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: config.refreshTtlDays * 86_400_000,
  })
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
}

export function verifyRefresh(token) {
  return jwt.verify(token, config.refreshSecret)
}

/** Requires a valid access token; optionally restricts to roles. Sets req.user. */
export function requireAuth(...roles) {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : null
      if (!token) throw new HttpError(401, 'Please sign in')
      let payload
      try { payload = jwt.verify(token, config.jwtSecret) } catch { throw new HttpError(401, 'Your session has expired') }
      const user = await User.findById(payload.sub)
      if (!user) throw new HttpError(401, 'Account not found')
      if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'You do not have access to this')
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
}
