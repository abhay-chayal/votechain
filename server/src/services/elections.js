import mongoose from 'mongoose'
import { getChain, ChainError } from '../chain/index.js'
import { buildVoterTree, detailsHash, onChainId, orgBytes32, proofFor, receiptCode, voterToken } from '../lib/crypto.js'
import { HttpError, badRequest, conflict, forbidden } from '../lib/http.js'
import { Activity, Election, FailedTx, Invite, Organization, Receipt } from '../models/index.js'
import { isFinal } from './serialize.js'
import { sendBulk, templates } from './mailer.js'

const toSec = (d) => Math.floor(new Date(d).getTime() / 1000)
const treeCache = new Map() // electionId → { root, tree }

export function logActivity(e, text, kind, actor = 'System') {
  return Activity.create({ orgId: e.orgId, electionId: e._id, text, kind, actor })
}

function chainHttpError(err) {
  if (err instanceof ChainError) {
    const status = ['ChainUnavailable', 'InsufficientFunds'].includes(err.code) ? 503 : 409
    return new HttpError(status, err.message, { code: err.code })
  }
  return err
}

async function voterTree(e) {
  const cached = treeCache.get(String(e._id))
  if (cached && cached.root === e.chain?.voterRoot) return cached.tree
  const invites = await Invite.find({ electionId: e._id }, { voterToken: 1 }).sort({ _id: 1 }).lean()
  const tree = buildVoterTree(invites.map((i) => i.voterToken))
  treeCache.set(String(e._id), { root: tree.root, tree })
  return tree
}

/** Adds (or updates) invited voters. Only allowed before voting opens. */
export async function addVoters(e, voters) {
  if (e.state !== 'draft' && Date.now() >= new Date(e.startAt).getTime()) throw conflict('Voters can only be added before voting opens.')
  const org = await Organization.findById(e.orgId)
  const domain = org?.allowedDomain?.replace(/^@/, '').toLowerCase()
  const ops = []
  const rejected = []
  for (const v of voters) {
    const email = v.email.trim().toLowerCase()
    if (domain && !email.endsWith('@' + domain)) { rejected.push(email); continue }
    ops.push({
      updateOne: {
        filter: { electionId: e._id, email },
        update: { $set: { name: v.name || '', memberId: v.memberId || '' }, $setOnInsert: { orgId: e.orgId, voterToken: voterToken(String(e._id), email), status: 'invited' } },
        upsert: true,
      },
    })
  }
  if (ops.length) await Invite.bulkWrite(ops)
  e.eligible = await Invite.countDocuments({ electionId: e._id })
  await e.save()
  if (e.state === 'active') await syncOnChain(e)
  return { added: ops.length, rejected, eligible: e.eligible }
}

export async function removeVoter(e, inviteId) {
  if (e.state !== 'draft' && Date.now() >= new Date(e.startAt).getTime()) throw conflict('Voters can only be removed before voting opens.')
  await Invite.deleteOne({ _id: inviteId, electionId: e._id })
  e.eligible = await Invite.countDocuments({ electionId: e._id })
  await e.save()
  if (e.state === 'active') await syncOnChain(e)
}

function validateForChain(e) {
  if (e.candidates.length < 2) throw badRequest('Add at least two candidates before publishing.')
  if (e.candidates.length > 50) throw badRequest('An election can have at most 50 candidates.')
  if (e.eligible < 1) throw badRequest('Add at least one voter before publishing.')
  if (new Date(e.endAt) <= new Date(e.startAt)) throw badRequest('The end time must be after the start time.')
  if (new Date(e.endAt) <= new Date()) throw badRequest('The end time must be in the future.')
}

/** Deploys a draft election to the contract. */
export async function publishElection(e, actor) {
  if (e.state !== 'draft') throw conflict('This election is already published.')
  const org = await Organization.findById(e.orgId)
  if (org?.status !== 'active') throw forbidden('Your organization must be approved before it can publish elections.')
  if (new Date(e.startAt) < new Date()) e.startAt = new Date() // "start now"
  validateForChain(e)

  const tree = await voterTree(e)
  const hash = detailsHash(e)
  const id = onChainId(e._id)
  try {
    const tx = await getChain().createElection({
      electionId: id, orgId: orgBytes32(e.orgId), start: toSec(e.startAt), end: toSec(e.endAt),
      candidateCount: e.candidates.length, voterRoot: tree.root, detailsHash: hash,
    })
    e.chain = { electionId: id, voterRoot: tree.root, detailsHash: hash, txHash: tx.txHash, block: tx.block }
  } catch (err) {
    await FailedTx.create({ electionId: e._id, action: 'createElection', reason: err.code || err.message })
    throw chainHttpError(err)
  }
  e.state = 'active'
  await e.save()
  await logActivity(e, `${e.title} published on-chain (block ${e.chain.block})`, 'open', actor)

  const invites = await Invite.find({ electionId: e._id }).lean()
  sendBulk(invites, () => templates.invite(e, org)).catch(() => {})
  return e
}

/** Pushes edited details / voter list to the contract. Only possible before voting opens. */
export async function syncOnChain(e) {
  if (e.state !== 'active') return
  if (Date.now() >= new Date(e.startAt).getTime()) throw conflict('Voting has started, so the election can no longer be changed.')
  validateForChain(e)
  treeCache.delete(String(e._id))
  const tree = await voterTree(e)
  const hash = detailsHash(e)
  if (tree.root === e.chain.voterRoot && hash === e.chain.detailsHash) return
  try {
    const tx = await getChain().updateElection({
      electionId: e.chain.electionId, start: toSec(e.startAt), end: toSec(e.endAt),
      candidateCount: e.candidates.length, voterRoot: tree.root, detailsHash: hash,
    })
    e.chain.voterRoot = tree.root
    e.chain.detailsHash = hash
    e.chain.txHash = tx.txHash
    e.chain.block = tx.block
    e.markModified('chain')
    await e.save()
  } catch (err) {
    throw chainHttpError(err)
  }
}

/** Closes voting early on-chain. */
export async function closeElection(e, actor) {
  if (e.state !== 'active') throw conflict('Only a live election can be closed.')
  if (Date.now() < new Date(e.startAt).getTime()) throw conflict('Voting has not started yet. Edit or delete the election instead.')
  try {
    if (!isFinal(e)) {
      const tx = await getChain().closeElection(e.chain.electionId)
      e.chain.closeTxHash = tx.txHash
      e.markModified('chain')
      e.closedAt = new Date()
    }
  } catch (err) {
    if (err.code !== 'ElectionAlreadyClosed') throw chainHttpError(err)
  }
  e.state = 'closed'
  if (!e.closedAt) e.closedAt = new Date(Math.min(Date.now(), new Date(e.endAt).getTime()))
  await finalizeTally(e)
  await e.save()
  await logActivity(e, `Voting closed for ${e.title}`, 'publish', actor)
  return e
}

/** Reads the final per-candidate totals from the contract and caches them. */
export async function finalizeTally(e) {
  if (!e.chain?.electionId || !isFinal(e)) return null
  try {
    const totals = await getChain().getResults(e.chain.electionId)
    e.tally = new Map(e.candidates.map((c, i) => [String(c._id), totals[i] || 0]))
    if (e.state === 'active') e.state = 'closed'
    await e.save()
    return Object.fromEntries(e.tally)
  } catch (err) {
    console.error('[chain] could not read results:', err.message)
    return null
  }
}

export async function publishResults(e, actor) {
  if (!isFinal(e) || e.state === 'draft') throw conflict('Results can only be published after voting closes.')
  if (!e.tally) await finalizeTally(e)
  e.state = 'published'
  e.publishedAt = new Date()
  await e.save()
  await logActivity(e, `Results published for ${e.title}`, 'publish', actor)
  const invites = await Invite.find({ electionId: e._id }).lean()
  sendBulk(invites, () => templates.results(e)).catch(() => {})
  return e
}

/** Casts a vote through the relayer and returns the voter's receipt. */
export async function castVote(e, user, candidateId) {
  const now = Date.now()
  if (e.state !== 'active' || now < new Date(e.startAt).getTime() || now >= new Date(e.endAt).getTime()) throw conflict('Voting is not open for this election.')
  const index = e.candidates.findIndex((c) => String(c._id) === String(candidateId))
  if (index < 0) throw badRequest('That candidate is not on the ballot.')

  // Claim the invite atomically so two simultaneous requests can't both submit.
  const invite = await Invite.findOneAndUpdate({ electionId: e._id, email: user.email, status: 'invited' }, { $set: { status: 'pending' } }, { new: true })
  if (!invite) {
    const existing = await Invite.findOne({ electionId: e._id, email: user.email })
    if (!existing) throw forbidden('You are not on the voter list for this election.')
    throw conflict(existing.status === 'voted' ? 'You have already voted in this election.' : 'Your vote is already being recorded.')
  }

  const tree = await voterTree(e)
  const proof = proofFor(tree, invite.voterToken)
  if (!proof) {
    await Invite.updateOne({ _id: invite._id }, { $set: { status: 'invited' } })
    throw forbidden('You are not on the voter list for this election.')
  }

  let tx
  try {
    tx = await getChain().castVote({ electionId: e.chain.electionId, voterToken: invite.voterToken, candidate: index, proof })
  } catch (err) {
    const already = err.code === 'AlreadyVoted'
    await Invite.updateOne({ _id: invite._id }, { $set: { status: already ? 'voted' : 'invited' } })
    await FailedTx.create({ electionId: e._id, action: 'castVote', reason: err.code || err.message })
    throw chainHttpError(err)
  }

  const r = await Receipt.create({ electionId: e._id, userId: user._id, code: receiptCode(), voterToken: invite.voterToken, txHash: tx.txHash, block: tx.block })
  await Invite.updateOne({ _id: invite._id }, { $set: { status: 'voted', votedAt: r.castAt } })
  await Election.updateOne({ _id: e._id }, { $inc: { votesCast: 1 } })
  await Activity.create({ orgId: e.orgId, electionId: e._id, kind: 'vote', text: `Vote recorded in block ${tx.block.toLocaleString('en-US')}` })
  return r
}

/** Cumulative votes over the voting window, in 14 steps, for the turnout chart. */
export async function turnoutSeries(e) {
  if (!e.votesCast) return []
  const start = new Date(e.startAt).getTime()
  const end = Math.min(Date.now(), new Date(e.closedAt || e.endAt).getTime())
  if (end <= start) return []
  const times = (await Receipt.find({ electionId: e._id }, { castAt: 1 }).lean()).map((r) => r.castAt.getTime()).sort((a, b) => a - b)
  const steps = 14
  const out = []
  let j = 0
  for (let i = 1; i <= steps; i++) {
    const t = start + ((end - start) * i) / steps
    while (j < times.length && times[j] <= t) j++
    out.push(j)
  }
  return out
}

/** Marks elections whose end time has passed as closed and caches their results. */
export async function closeExpired() {
  const due = await Election.find({ state: 'active', endAt: { $lte: new Date() } })
  for (const e of due) {
    e.state = 'closed'
    e.closedAt = e.endAt
    await finalizeTally(e)
    await e.save()
    await logActivity(e, `Voting closed for ${e.title}`, 'publish')
  }
  return due.length
}

export const isValidId = mongoose.isValidObjectId
