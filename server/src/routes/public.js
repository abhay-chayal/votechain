import { Router } from 'express'
import { getChain } from '../chain/index.js'
import { ah, notFound, objectId } from '../lib/http.js'
import { Election, Organization, Receipt } from '../models/index.js'
import { election as ser, isFinal, organization } from '../services/serialize.js'
import * as svc from '../services/elections.js'

const r = Router()

async function visibleOrgIds() {
  return (await Organization.find({ status: 'active' }, { _id: 1 }).lean()).map((o) => o._id)
}

r.get('/chain', ah(async (_req, res) => {
  const chain = getChain()
  let status = { ok: false }
  try { status = await chain.status() } catch {}
  res.json({ ...chain.info(), block: status.block ?? null, online: !!status.ok })
}))

r.get('/elections', ah(async (_req, res) => {
  await svc.closeExpired()
  const list = await Election.find({ state: { $ne: 'draft' }, orgId: { $in: await visibleOrgIds() } }).sort({ endAt: -1 }).limit(200)
  const orgs = await Organization.find({ _id: { $in: list.map((e) => e.orgId) } })
  const byId = new Map(orgs.map((o) => [String(o._id), organization(o)]))
  res.json({ elections: list.map((e) => ser(e, { extra: { org: byId.get(String(e.orgId)) } })) })
}))

r.get('/elections/:id', ah(async (req, res) => {
  const e = await Election.findOne({ _id: objectId(req.params.id, 'Election'), state: { $ne: 'draft' } })
  if (!e) throw notFound('Election not found')
  const org = await Organization.findById(e.orgId)
  if (org?.status !== 'active') throw notFound('Election not found')
  const tally = isFinal(e) && !e.tally ? await svc.finalizeTally(e) : undefined
  res.json({ election: ser(e, { tally, extra: { org: organization(org) } }) })
}))

// Most recent vote transactions (all of this data is public on-chain anyway).
r.get('/elections/:id/ledger', ah(async (req, res) => {
  const id = objectId(req.params.id, 'Election')
  const limit = Math.min(Number(req.query.limit) || 25, 200)
  const rows = await Receipt.find({ electionId: id }, { txHash: 1, block: 1, castAt: 1, voterToken: 1 }).sort({ castAt: -1 }).limit(limit).lean()
  res.json({ items: rows.map((x) => ({ txHash: x.txHash, tokenHash: x.voterToken, block: x.block, at: x.castAt })) })
}))

r.get('/receipts/:code', ah(async (req, res) => {
  const code = String(req.params.code).trim()
  const q = /^0x[0-9a-fA-F]{64}$/.test(code) ? { txHash: code.toLowerCase() } : { code: code.toUpperCase() }
  const rc = await Receipt.findOne(q).lean()
  if (!rc) throw notFound('No vote found for that code')
  const e = await Election.findById(rc.electionId, { title: 1 }).lean()
  res.json({ receipt: { electionId: String(rc.electionId), electionTitle: e?.title, txHash: rc.txHash, block: rc.block, castAt: rc.castAt } })
}))

export default r
