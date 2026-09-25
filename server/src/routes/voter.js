import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config } from '../config.js'
import { ah, forbidden, notFound, objectId, parse } from '../lib/http.js'
import { requireAuth } from '../middleware/auth.js'
import { Election, Invite, Organization, Receipt } from '../models/index.js'
import { election as ser, isFinal, receipt } from '../services/serialize.js'
import * as svc from '../services/elections.js'

const r = Router()
r.use(requireAuth('voter'))

const voteLimiter = rateLimit({ windowMs: 60_000, limit: config.isTest ? 1000 : 20, message: { error: 'Too many requests. Please wait a moment.' } })

async function invitedElection(req) {
  const id = objectId(req.params.id, 'Election')
  const invite = await Invite.findOne({ electionId: id, email: req.user.email })
  if (!invite) throw notFound('Election not found')
  const e = await Election.findOne({ _id: id, state: { $ne: 'draft' } })
  if (!e) throw notFound('Election not found')
  const org = await Organization.findById(e.orgId)
  if (org?.status === 'suspended') throw forbidden('This organization has been suspended.')
  return { e, invite }
}

r.get('/elections', ah(async (req, res) => {
  await svc.closeExpired()
  const invites = await Invite.find({ email: req.user.email }).lean()
  const suspended = (await Organization.find({ status: 'suspended' }, { _id: 1 }).lean()).map((o) => String(o._id))
  const elections = await Election.find({ _id: { $in: invites.map((i) => i.electionId) }, state: { $ne: 'draft' } }).sort({ endAt: 1 })
  const receipts = await Receipt.find({ userId: req.user._id }).lean()
  const voted = new Set(receipts.map((x) => String(x.electionId)))
  res.json({
    elections: elections.filter((e) => !suspended.includes(String(e.orgId))).map((e) => ser(e, { extra: { hasVoted: voted.has(String(e._id)) } })),
  })
}))

r.get('/elections/:id', ah(async (req, res) => {
  const { e } = await invitedElection(req)
  const tally = isFinal(e) && !e.tally ? await svc.finalizeTally(e) : undefined
  const mine = await Receipt.findOne({ userId: req.user._id, electionId: e._id })
  res.json({ election: ser(e, { tally, extra: { hasVoted: !!mine } }), receipt: mine && receipt(mine) })
}))

r.post('/elections/:id/vote', voteLimiter, ah(async (req, res) => {
  const { candidateId } = parse(z.object({ candidateId: z.string().min(1) }), req.body)
  const { e } = await invitedElection(req)
  const rc = await svc.castVote(e, req.user, candidateId)
  res.status(201).json({ receipt: receipt(rc) })
}))

r.get('/votes', ah(async (req, res) => {
  const rows = await Receipt.find({ userId: req.user._id }).sort({ castAt: -1 }).lean()
  const elections = await Election.find({ _id: { $in: rows.map((x) => x.electionId) } })
  const byId = new Map(elections.map((e) => [String(e._id), e]))
  const orgs = await Organization.find({ _id: { $in: elections.map((e) => e.orgId) } }, { name: 1 }).lean()
  const orgName = new Map(orgs.map((o) => [String(o._id), o.name]))
  res.json({
    votes: rows.filter((x) => byId.has(String(x.electionId))).map((x) => {
      const e = byId.get(String(x.electionId))
      return { ...receipt(x), election: { id: String(e._id), title: e.title, state: e.state, startAt: e.startAt, endAt: e.endAt, orgName: orgName.get(String(e.orgId)) } }
    }),
  })
}))

r.get('/receipts/:id', ah(async (req, res) => {
  const { e } = await invitedElection(req)
  const rc = await Receipt.findOne({ userId: req.user._id, electionId: e._id })
  if (!rc) throw notFound('You have not voted in this election')
  const org = await Organization.findById(e.orgId, { name: 1 })
  res.json({ receipt: receipt(rc), election: ser(e, { extra: { orgName: org?.name } }) })
}))

export default r
