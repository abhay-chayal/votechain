// Thin fetch wrapper for the VoteChain API. The access token lives in memory only; the
// refresh token is an httpOnly cookie, so a page reload restores the session via /auth/refresh.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

let accessToken = null
let onSessionLost = () => {}
let refreshing = null

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const setAccessToken = (t) => { accessToken = t }
export const setSessionLostHandler = (fn) => { onSessionLost = fn }

export function refreshSession() {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null
      const data = await res.json()
      accessToken = data.accessToken
      return data.user
    })
    .catch(() => null)
    .finally(() => { refreshing = null })
  return refreshing
}

async function request(method, path, body, retry = true) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the VoteChain server. Check your connection and try again.', 0)
  }
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const user = await refreshSession()
    if (user) return request(method, path, body, false)
    accessToken = null
    onSessionLost()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.code)
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  /** Downloads a file from an authenticated endpoint. */
  async download(p, filename) {
    const res = await fetch(BASE + p, { credentials: 'include', headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} })
    if (!res.ok) throw new ApiError('Download failed', res.status)
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
