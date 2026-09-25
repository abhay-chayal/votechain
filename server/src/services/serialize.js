import { getChain } from '../chain/index.js'

export function isFinal(e, now = Date.now()) {
  return e.state === 'closed' || e.state === 'published' || (e.state === 'active' && new Date(e.endAt).getTime() <= now)
}

function chainInfo(e) {
  if (!e.chain?.electionId) return null
  let contract
  try { contract = getChain().info().contract } catch {}
  return { electionId: e.chain.electionId, voterRoot: e.chain.voterRoot, detailsHash: e.chain.detailsHash, txHash: e.chain.txHash, block: e.chain.block, closeTxHash: e.chain.closeTxHash, contract }
}

/**
 * The election shape the client uses. `tally` is only included once voting is final,
 * because the contract refuses to reveal totals before then.
 */
export function election(e, { tally, turnoutSeries, extra } = {}) {
  const final = isFinal(e)
  return {
    id: String(e._id),
    orgId: String(e.orgId?._id || e.orgId),
    title: e.title,
    description: e.description,
    category: e.category,
    startAt: e.startAt,
    endAt: e.endAt,
    state: e.state,
    candidates: e.candidates.map((c) => ({ id: String(c._id), name: c.name, title: c.title, bio: c.bio, manifesto: c.manifesto })),
    eligible: e.eligible,
    votesCast: e.votesCast,
    tally: final ? tally || (e.tally ? Object.fromEntries(e.tally) : null) : null,
    turnoutSeries: turnoutSeries || [],
    chain: chainInfo(e),
    closedAt: e.closedAt,
    publishedAt: e.publishedAt,
    createdAt: e.createdAt,
    ...extra,
  }
}

export function organization(o) {
  return {
    id: String(o._id), name: o.name, type: o.type, description: o.description, website: o.website,
    allowedDomain: o.allowedDomain, members: o.members, status: o.status, createdAt: o.createdAt,
    admins: (o.admins || []).map((a) => (a?.name ? { id: String(a._id), name: a.name, email: a.email } : String(a))),
  }
}

export function receipt(r) {
  return { electionId: String(r.electionId), receipt: r.code, txHash: r.txHash, block: r.block, castAt: r.castAt, voterToken: r.voterToken }
}
