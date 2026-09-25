import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { getChain } from '../chain/index.js'
import { ah, notFound, objectId, parse } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { Election, FailedTx, Organization, Receipt } from '../models/index.js'
import { election as ser, organization } from '../services/serialize.js'
import { mailEnabled } from '../services/mailer.js'
import * as svc from '../services/elections.js'

const r = Router()
r.use(requireAuth('platform_admin'))

async function chainStatus() {
  try { return { ...(await getChain().status()), ...getChain().info() } } catch (err) { return { ok: false, error: err.message } }
}

r.get('/overview', ah(async (_req, res) => {
  await svc.closeExpired()
  const [orgs, elections, votes, chain, failed] = await Promise.all([
    Organization.find().sort({ createdAt: -1 }),
    Election.find({ state: { $ne: 'draft' } }).sort({ endAt: 1 }),
    Receipt.countDocuments(),
    chainStatus(),
    FailedTx.countDocuments({ at: { $gte: new Date(Date.now() - 86_400_000) } }),
  ])
  const byId = new Map(orgs.map((o) => [String(o._id), o.name]))
  res.json({
    organizations: orgs.map(organization),
    elections: elections.map((e) => ser(e, { extra: { orgName: byId.get(String(e.orgId)) } })),
    votes,
    chain,
    failedLast24h: failed,
  })
}))

r.get('/organizations', ah(async (_req, res) => {
  const orgs = await Organization.find().sort({ createdAt: -1 })
  const counts = await Election.aggregate([{ $group: { _id: '$orgId', n: { $sum: 1 } } }])
  const byOrg = new Map(counts.map((c) => [String(c._id), c.n]))
  res.json({ organizations: orgs.map((o) => ({ ...organization(o), elections: byOrg.get(String(o._id)) || 0 })) })
}))

r.patch('/organizations/:id', ah(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'active', 'suspended']) }), req.body)
  const org = await Organization.findByIdAndUpdate(objectId(req.params.id, 'Organization'), { status }, { new: true })
  if (!org) throw notFound('Organization not found')
  res.json({ organization: organization(org) })
}))

r.get('/elections', ah(async (_req, res) => {
  const list = await Election.find().sort({ startAt: -1 }).limit(500)
  const orgs = await Organization.find({ _id: { $in: list.map((e) => e.orgId) } }, { name: 1 }).lean()
  const byId = new Map(orgs.map((o) => [String(o._id), o.name]))
  res.json({ elections: list.map((e) => ser(e, { extra: { orgName: byId.get(String(e.orgId)) } })) })
}))

r.get('/health', ah(async (_req, res) => {
  const t0 = Date.now()
  const dbOk = mongoose.connection.readyState === 1 && !!(await mongoose.connection.db.admin().ping())
  const dbMs = Date.now() - t0
  const chain = await chainStatus()
  const failed = await FailedTx.find().sort({ at: -1 }).limit(20).lean()
  res.json({
    api: { ok: true, uptimeSec: Math.round(process.uptime()), node: process.version },
    db: { ok: dbOk, latencyMs: dbMs },
    chain,
    mail: { ok: mailEnabled(), note: mailEnabled() ? 'SMTP configured' : 'No SMTP configured. Emails are only logged' },
    failed: failed.map((f) => ({ action: f.action, reason: f.reason, txHash: f.txHash, at: f.at })),
  })
}))

export default r
