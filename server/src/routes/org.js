import { Router } from 'express'
import { z } from 'zod'
import { ah, badRequest, conflict, notFound, objectId, parse } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { Activity, Election, Invite, Organization, User } from '../models/index.js'
import { election as ser, isFinal, organization } from '../services/serialize.js'
import * as svc from '../services/elections.js'
import { sendBulk, templates } from '../services/mailer.js'

const r = Router()
r.use(requireAuth('org_admin'))

const actor = (req) => req.user.name

async function ownElection(req) {
  const e = await Election.findOne({ _id: objectId(req.params.id, 'Election'), orgId: req.user.orgId })
  if (!e) throw notFound('Election not found')
  return e
}

async function full(e) {
  const tally = isFinal(e) && !e.tally ? await svc.finalizeTally(e) : undefined
  return ser(e, { tally, turnoutSeries: await svc.turnoutSeries(e) })
}

// ---------------------------------------------------------------- organization

r.get('/org', ah(async (req, res) => {
  const org = await Organization.findById(req.user.orgId).populate('admins', 'name email')
  res.json({ org: organization(org) })
}))

r.put('/org', ah(async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(3).max(120), type: z.string().max(40), website: z.string().trim().max(200),
    description: z.string().trim().max(1000), allowedDomain: z.string().trim().max(120),
  }).partial(), req.body)
  const org = await Organization.findByIdAndUpdate(req.user.orgId, { $set: b }, { new: true }).populate('admins', 'name email')
  res.json({ org: organization(org) })
}))

r.get('/org/overview', ah(async (req, res) => {
  await svc.closeExpired()
  const org = await Organization.findById(req.user.orgId)
  const elections = await Election.find({ orgId: req.user.orgId }).sort({ startAt: -1 })
  const activity = await Activity.find({ orgId: req.user.orgId }).sort({ at: -1 }).limit(8).lean()
  const members = (await Invite.distinct('email', { orgId: req.user.orgId })).length
  const list = await Promise.all(elections.map(async (e) => ser(e, { turnoutSeries: e.state === 'active' ? await svc.turnoutSeries(e) : [] })))
  res.json({ org: organization(org), members, elections: list, activity: activity.map((a) => ({ at: a.at, text: a.text, kind: a.kind })) })
}))

// ---------------------------------------------------------------- elections

const candidate = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(160).optional().default(''),
  bio: z.string().trim().max(2000).optional().default(''),
  manifesto: z.array(z.string().trim().max(300)).max(20).optional().default([]),
})
const electionBody = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().max(4000).optional().default(''),
  category: z.string().max(60).optional().default('Other'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  candidates: z.array(candidate).max(50),
})

function applyBody(e, b) {
  if (b.endAt <= b.startAt) throw badRequest('The end time must be after the start time.')
  Object.assign(e, { title: b.title, description: b.description, category: b.category, startAt: b.startAt, endAt: b.endAt })
  e.candidates = b.candidates.map((c) => {
    const keep = c.id && e.candidates.some((x) => String(x._id) === c.id)
    return { ...(keep ? { _id: c.id } : {}), name: c.name, title: c.title, bio: c.bio, manifesto: c.manifesto.filter(Boolean) }
  })
}

r.get('/elections', ah(async (req, res) => {
  await svc.closeExpired()
  const list = await Election.find({ orgId: req.user.orgId }).sort({ startAt: -1 })
  res.json({ elections: list.map((e) => ser(e)) })
}))

r.post('/elections', ah(async (req, res) => {
  const b = parse(electionBody, req.body)
  const e = new Election({ orgId: req.user.orgId, createdBy: req.user._id, state: 'draft' })
  applyBody(e, b)
  await e.save()
  await svc.logActivity(e, `${e.title} created as a draft`, 'edit', actor(req))
  res.status(201).json({ election: await full(e) })
}))

r.get('/elections/:id', ah(async (req, res) => res.json({ election: await full(await ownElection(req)) })))

r.put('/elections/:id', ah(async (req, res) => {
  const e = await ownElection(req)
  const editable = e.state === 'draft' || (e.state === 'active' && Date.now() < new Date(e.startAt).getTime())
  if (!editable) throw conflict('Once voting starts, the election details are locked on-chain.')
  applyBody(e, parse(electionBody, req.body))
  await e.save()
  if (e.state === 'active') await svc.syncOnChain(e)
  await svc.logActivity(e, `${e.title} updated`, 'edit', actor(req))
  res.json({ election: await full(e) })
}))

r.delete('/elections/:id', ah(async (req, res) => {
  const e = await ownElection(req)
  if (e.state !== 'draft') throw conflict('Only drafts can be deleted. Published elections stay on-chain.')
  await Invite.deleteMany({ electionId: e._id })
  await e.deleteOne()
  res.json({ ok: true })
}))

r.post('/elections/:id/publish', ah(async (req, res) => {
  const e = await svc.publishElection(await ownElection(req), actor(req))
  res.json({ election: await full(e) })
}))

r.post('/elections/:id/close', ah(async (req, res) => {
  const e = await svc.closeElection(await ownElection(req), actor(req))
  res.json({ election: await full(e) })
}))

r.post('/elections/:id/publish-results', ah(async (req, res) => {
  const e = await svc.publishResults(await ownElection(req), actor(req))
  res.json({ election: await full(e) })
}))

// ---------------------------------------------------------------- voters

r.get('/elections/:id/voters', ah(async (req, res) => {
  const e = await ownElection(req)
  const q = String(req.query.q || '').trim()
  const filter = { electionId: e._id }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ email: rx }, { name: rx }, { memberId: rx }]
  }
  const limit = Math.min(Number(req.query.limit) || 100, 1000)
  const [voters, total, counts] = await Promise.all([
    Invite.find(filter).sort({ name: 1, email: 1 }).limit(limit).lean(),
    Invite.countDocuments(filter),
    Invite.aggregate([{ $match: { electionId: e._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  // A voter counts as "registered" once they have signed in at least once.
  const registered = new Set((await User.find({ email: { $in: voters.map((v) => v.email) }, lastLoginAt: { $ne: null } }, { email: 1 }).lean()).map((u) => u.email))
  res.json({
    total,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    voters: voters.map((v) => ({
      id: String(v._id), name: v.name, email: v.email, memberId: v.memberId,
      status: v.status === 'voted' ? 'voted' : registered.has(v.email) ? 'registered' : 'invited',
    })),
  })
}))

r.get('/elections/:id/voters.csv', ah(async (req, res) => {
  const e = await ownElection(req)
  const voters = await Invite.find({ electionId: e._id }).sort({ name: 1 }).lean()
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const csv = ['name,email,member_id,status', ...voters.map((v) => [v.name, v.email, v.memberId, v.status === 'voted' ? 'voted' : 'not voted'].map(esc).join(','))].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="voters-${e._id}.csv"`)
  res.send(csv)
}))

r.post('/elections/:id/voters', ah(async (req, res) => {
  const e = await ownElection(req)
  const b = parse(z.object({
    voters: z.array(z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().max(120).optional(), memberId: z.string().trim().max(60).optional() })).min(1).max(10_000),
  }), req.body)
  const result = await svc.addVoters(e, b.voters)
  if (result.added) await svc.logActivity(e, `${result.added} voters added to ${e.title}`, 'invite', actor(req))
  res.json(result)
}))

r.delete('/elections/:id/voters/:inviteId', ah(async (req, res) => {
  const e = await ownElection(req)
  await svc.removeVoter(e, objectId(req.params.inviteId, 'Voter'))
  res.json({ eligible: e.eligible })
}))

r.post('/elections/:id/remind', ah(async (req, res) => {
  const e = await ownElection(req)
  if (e.state !== 'active' || isFinal(e)) throw conflict('Reminders can only be sent while voting is open.')
  const pending = await Invite.find({ electionId: e._id, status: 'invited' }).lean()
  const sent = await sendBulk(pending, () => templates.reminder(e))
  await svc.logActivity(e, `Reminder sent to ${pending.length} voters`, 'invite', actor(req))
  res.json({ sent, total: pending.length })
}))

r.get('/elections/:id/audit', ah(async (req, res) => {
  const e = await ownElection(req)
  const items = await Activity.find({ electionId: e._id }).sort({ at: -1 }).limit(200).lean()
  res.json({ items: items.map((a) => ({ at: a.at, text: a.text, kind: a.kind, actor: a.actor })) })
}))

export default r
