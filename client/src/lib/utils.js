export const cn = (...c) => c.filter(Boolean).join(' ')

const DAY = 86_400_000
const HOUR = 3_600_000
export const fromNow = (days = 0, hours = 0) => new Date(Date.now() + days * DAY + hours * HOUR).toISOString()

// Deterministic pseudo-random hex so seeded hashes stay stable between reloads.
export function seededHex(seed, length = 64) {
  let h = 2166136261
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let out = ''
  while (out.length < length) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    out += (h >>> 0).toString(16).padStart(8, '0')
  }
  return out.slice(0, length)
}

export const randomHex = (length = 64) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length / 2)), (b) => b.toString(16).padStart(2, '0')).join('')

export const shortHash = (h, head = 6, tail = 4) => (h ? `${h.slice(0, head + 2)}…${h.slice(-tail)}` : '')

export function electionStatus(e, now = Date.now()) {
  if (e.state === 'draft') return 'draft'
  if (e.state === 'closed' || e.state === 'published') return e.state
  const start = new Date(e.startAt).getTime()
  const end = new Date(e.endAt).getTime()
  if (now < start) return 'scheduled'
  if (now < end) return 'live'
  return 'closed'
}

export const totalVotes = (e) => Object.values(e.tally || {}).reduce((a, b) => a + b, 0)
export const turnout = (e) => (e.eligible ? Math.round((totalVotes(e) / e.eligible) * 1000) / 10 : 0)

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n)

export function relTime(iso) {
  const diff = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < HOUR) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour')
  return rtf.format(Math.round(diff / DAY), 'day')
}

export function countdownParts(iso) {
  let ms = Math.max(0, new Date(iso).getTime() - Date.now())
  const d = Math.floor(ms / DAY); ms -= d * DAY
  const h = Math.floor(ms / HOUR); ms -= h * HOUR
  const m = Math.floor(ms / 60_000); ms -= m * 60_000
  const s = Math.floor(ms / 1000)
  return { d, h, m, s }
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#2563eb', '#dc2626']
export const colorFor = (seed = '') => PALETTE[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]
