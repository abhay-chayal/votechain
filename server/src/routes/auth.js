import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { HttpError, ah, badRequest, conflict, parse } from '../lib/http.js'
import { otpCode, sha256 } from '../lib/crypto.js'
import { Invite, Organization, User } from '../models/index.js'
import { REFRESH_COOKIE, clearRefreshCookie, requireAuth, setRefreshCookie, signAccess, verifyRefresh } from '../middleware/auth.js'
import { organization } from '../services/serialize.js'
import { sendMail, templates } from '../services/mailer.js'

const r = Router()
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: config.isTest ? 1000 : 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } })

const email = z.string().trim().toLowerCase().email()

/** The signed-in user as the client sees it. */
export async function profile(user) {
  const base = { id: String(user._id), name: user.name, email: user.email, role: user.role, memberId: user.memberId, prefs: user.prefs }
  if (user.role === 'org_admin' && user.orgId) {
    const org = await Organization.findById(user.orgId)
    return { ...base, orgId: String(user.orgId), org: org && organization(org) }
  }
  if (user.role === 'voter') {
    const orgIds = (await Invite.distinct('orgId', { email: user.email })).map(String)
    const orgs = await Organization.find({ _id: { $in: orgIds } })
    return { ...base, orgIds, orgs: orgs.map(organization) }
  }
  return base
}

async function issue(res, user) {
  user.lastLoginAt = new Date()
  await user.save()
  setRefreshCookie(res, user)
  res.json({ accessToken: signAccess(user), user: await profile(user) })
}

r.post('/register-org', limiter, ah(async (req, res) => {
  const b = parse(z.object({
    orgName: z.string().trim().min(3).max(120),
    type: z.string().max(40).default('Other'),
    size: z.coerce.number().int().min(2).max(10_000_000),
    website: z.string().trim().max(200).optional().default(''),
    description: z.string().trim().max(1000).optional().default(''),
    name: z.string().trim().min(2).max(80),
    email,
    password: z.string().min(8).max(200),
  }), req.body)
  if (await User.exists({ email: b.email })) throw conflict('An account with this email already exists. Sign in instead.')
  const org = await Organization.create({ name: b.orgName, type: b.type, members: b.size, website: b.website, description: b.description, status: 'pending' })
  const user = await User.create({ name: b.name, email: b.email, role: 'org_admin', orgId: org._id, passwordHash: await bcrypt.hash(b.password, 12) })
  org.admins = [user._id]
  await org.save()
  res.status(201)
  await issue(res, user)
}))

r.post('/login', limiter, ah(async (req, res) => {
  const b = parse(z.object({ email, password: z.string().min(1) }), req.body)
  const user = await User.findOne({ email: b.email })
  if (!user?.passwordHash || !(await bcrypt.compare(b.password, user.passwordHash))) {
    throw new HttpError(401, user && !user.passwordHash ? 'This account signs in with an email code. Use "Email code" instead.' : 'Wrong email or password.')
  }
  await issue(res, user)
}))

// Email one-time code. Voters are created on first sign-in if they have been invited.
r.post('/otp/request', limiter, ah(async (req, res) => {
  const b = parse(z.object({ email }), req.body)
  let user = await User.findOne({ email: b.email })
  if (!user) {
    const invite = await Invite.findOne({ email: b.email })
    if (!invite) throw new HttpError(404, 'No invitation found for this email. Ask your election organizer to add you.')
    user = await User.create({ email: b.email, name: invite.name || b.email.split('@')[0], role: 'voter', memberId: invite.memberId })
  }
  const code = otpCode()
  user.otp = { hash: sha256(code), expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0 }
  await user.save()
  const t = templates.otp(code)
  await sendMail(user.email, t.subject, t.html, t.text)
  res.json({ sent: true, ...(config.exposeOtp ? { devCode: code } : {}) })
}))

r.post('/otp/verify', limiter, ah(async (req, res) => {
  const b = parse(z.object({ email, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }), req.body)
  const user = await User.findOne({ email: b.email })
  if (!user?.otp?.hash || user.otp.expiresAt < new Date()) throw badRequest('This code has expired. Request a new one.')
  if (user.otp.attempts >= 5) throw badRequest('Too many wrong codes. Request a new one.')
  if (user.otp.hash !== sha256(b.code)) {
    user.otp.attempts += 1
    await user.save()
    throw badRequest('That code is not correct.')
  }
  user.otp = undefined
  await issue(res, user)
}))

r.post('/refresh', ah(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (!token) throw new HttpError(401, 'Not signed in')
  let payload
  try { payload = verifyRefresh(token) } catch { clearRefreshCookie(res); throw new HttpError(401, 'Session expired') }
  const user = await User.findById(payload.sub)
  if (!user || user.tokenVersion !== payload.v) { clearRefreshCookie(res); throw new HttpError(401, 'Session expired') }
  setRefreshCookie(res, user)
  res.json({ accessToken: signAccess(user), user: await profile(user) })
}))

r.post('/logout', (req, res) => {
  clearRefreshCookie(res)
  res.json({ ok: true })
})

r.post('/logout-all', requireAuth(), ah(async (req, res) => {
  req.user.tokenVersion += 1
  await req.user.save()
  clearRefreshCookie(res)
  res.json({ ok: true })
}))

r.get('/me', requireAuth(), ah(async (req, res) => res.json({ user: await profile(req.user) })))

r.put('/me', requireAuth(), ah(async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(2).max(80).optional(),
    prefs: z.object({ notifyOpen: z.boolean(), notifyReminder: z.boolean(), notifyResults: z.boolean() }).partial().optional(),
  }), req.body)
  if (b.name) req.user.name = b.name
  if (b.prefs) req.user.prefs = { ...req.user.prefs.toObject?.() ?? req.user.prefs, ...b.prefs }
  await req.user.save()
  res.json({ user: await profile(req.user) })
}))

r.put('/me/password', requireAuth(), ah(async (req, res) => {
  const b = parse(z.object({ current: z.string().optional(), password: z.string().min(8).max(200) }), req.body)
  if (req.user.passwordHash && !(await bcrypt.compare(b.current || '', req.user.passwordHash))) throw badRequest('Your current password is not correct.')
  req.user.passwordHash = await bcrypt.hash(b.password, 12)
  await req.user.save()
  res.json({ ok: true })
}))

export default r
