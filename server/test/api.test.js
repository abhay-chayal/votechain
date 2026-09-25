// API tests. The blockchain is replaced by an in-memory fake with the same rules as the
// contract (the contract itself is tested in /contracts).

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { connectDb, disconnectDb } from '../src/db.js'
import { createApp } from '../src/app.js'
import { setChain, ChainError } from '../src/chain/index.js'
import { Election, Organization, User } from '../src/models/index.js'

class FakeChain {
  elections = new Map()
  block = 100
  tx() { this.block += 1; return { txHash: '0x' + this.block.toString(16).padStart(64, '0'), block: this.block } }
  createElection(p) {
    if (this.elections.has(p.electionId)) throw new ChainError('ElectionExists', 'exists')
    this.elections.set(p.electionId, { ...p, voted: new Set(), tally: Array(p.candidateCount).fill(0), closed: false })
    return this.tx()
  }
  updateElection(p) { Object.assign(this.elections.get(p.electionId), p); return this.tx() }
  castVote(p) {
    const e = this.elections.get(p.electionId)
    const now = Date.now() / 1000
    if (e.closed || now < e.start || now >= e.end) throw new ChainError('ElectionNotActive', 'Voting is not open for this election.')
    if (e.voted.has(p.voterToken)) throw new ChainError('AlreadyVoted', 'This voter has already voted in this election.')
    if (!Array.isArray(p.proof)) throw new ChainError('InvalidMerkleProof', 'bad proof')
    e.voted.add(p.voterToken)
    e.tally[p.candidate] += 1
    return this.tx()
  }
  closeElection(id) { this.elections.get(id).closed = true; return this.tx() }
  getResults(id) {
    const e = this.elections.get(id)
    if (!e.closed && Date.now() / 1000 < e.end) throw new ChainError('ElectionStillRunning', 'sealed')
    return e.tally
  }
  status() { return { ok: true, block: this.block, chainId: 31337, relayer: '0x0', balanceEth: 10 } }
  info() { return { network: 'Fake', contract: '0xC0FFEE', explorer: '' } }
}

const app = createApp()
const agent = () => request(app)
let orgToken, adminToken, orgId

async function login(email, password = 'password123') {
  const res = await agent().post('/api/auth/login').send({ email, password })
  assert.equal(res.status, 200, res.body.error)
  return res.body.accessToken
}

async function otpLogin(email) {
  const req = await agent().post('/api/auth/otp/request').send({ email })
  assert.equal(req.status, 200, req.body.error)
  const res = await agent().post('/api/auth/otp/verify').send({ email, code: req.body.devCode })
  assert.equal(res.status, 200, res.body.error)
  return res.body.accessToken
}

const hour = 3_600_000
const draft = (overrides = {}) => ({
  title: 'Student Council President',
  description: 'Test election',
  category: 'Student council',
  startAt: new Date(Date.now() - 1000).toISOString(),
  endAt: new Date(Date.now() + 2 * hour).toISOString(),
  candidates: [{ name: 'Ishita' }, { name: 'Kabir' }, { name: 'Neha' }],
  ...overrides,
})

before(async () => {
  setChain(new FakeChain())
  await connectDb()
  await User.create({ name: 'Admin', email: 'admin@test.dev', role: 'platform_admin', passwordHash: await bcrypt.hash('password123', 4) })
  adminToken = await login('admin@test.dev')
})

after(async () => { await disconnectDb() })

describe('organization onboarding', () => {
  it('registers an organization as pending', async () => {
    const res = await agent().post('/api/auth/register-org').send({
      orgName: 'Test College', type: 'College', size: 500, name: 'Org Admin', email: 'org@test.dev', password: 'password123',
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.role, 'org_admin')
    assert.equal(res.body.user.org.status, 'pending')
    orgToken = res.body.accessToken
    orgId = res.body.user.orgId
    assert.match(res.headers['set-cookie'][0], /vc_rt=.*HttpOnly/)
  })

  it('rejects a duplicate email', async () => {
    const res = await agent().post('/api/auth/register-org').send({
      orgName: 'Another', size: 5, name: 'Xavier', email: 'org@test.dev', password: 'password123',
    })
    assert.equal(res.status, 409)
  })

  it('blocks publishing until a platform admin approves the organization', async () => {
    const e = (await agent().post('/api/elections').set('authorization', `Bearer ${orgToken}`).send(draft())).body.election
    await agent().post(`/api/elections/${e.id}/voters`).set('authorization', `Bearer ${orgToken}`).send({ voters: [{ email: 'v1@test.dev' }] })
    const res = await agent().post(`/api/elections/${e.id}/publish`).set('authorization', `Bearer ${orgToken}`)
    assert.equal(res.status, 403)

    const ok = await agent().patch(`/api/admin/organizations/${orgId}`).set('authorization', `Bearer ${adminToken}`).send({ status: 'active' })
    assert.equal(ok.body.organization.status, 'active')
  })

  it('keeps voters and org admins out of admin routes', async () => {
    const res = await agent().get('/api/admin/overview').set('authorization', `Bearer ${orgToken}`)
    assert.equal(res.status, 403)
    assert.equal((await agent().get('/api/elections')).status, 401)
  })
})

describe('election lifecycle and voting', () => {
  let election, voterToken

  it('creates a draft, adds voters and publishes it on-chain', async () => {
    const created = await agent().post('/api/elections').set('authorization', `Bearer ${orgToken}`).send(draft())
    assert.equal(created.status, 201)
    election = created.body.election
    assert.equal(election.state, 'draft')

    const voters = await agent().post(`/api/elections/${election.id}/voters`).set('authorization', `Bearer ${orgToken}`)
      .send({ voters: ['v1', 'v2', 'v3'].map((n) => ({ email: `${n}@test.dev`, name: n.toUpperCase() })) })
    assert.equal(voters.body.eligible, 3)

    const pub = await agent().post(`/api/elections/${election.id}/publish`).set('authorization', `Bearer ${orgToken}`)
    assert.equal(pub.status, 200, pub.body.error)
    assert.equal(pub.body.election.state, 'active')
    assert.ok(pub.body.election.chain.txHash)
    assert.ok(pub.body.election.chain.voterRoot)
    election = pub.body.election
  })

  it('locks the election once voting has started', async () => {
    const res = await agent().put(`/api/elections/${election.id}`).set('authorization', `Bearer ${orgToken}`).send(draft({ title: 'Changed title' }))
    assert.equal(res.status, 409)
  })

  it('lets an invited voter sign in with an email code', async () => {
    voterToken = await otpLogin('v1@test.dev')
    const me = await agent().get('/api/auth/me').set('authorization', `Bearer ${voterToken}`)
    assert.equal(me.body.user.role, 'voter')
    assert.deepEqual(me.body.user.orgIds, [orgId])
  })

  it('refuses a sign-in code for someone who was never invited', async () => {
    const res = await agent().post('/api/auth/otp/request').send({ email: 'stranger@test.dev' })
    assert.equal(res.status, 404)
  })

  it('records a vote, returns a receipt and blocks a second vote', async () => {
    const res = await agent().post(`/api/voter/elections/${election.id}/vote`).set('authorization', `Bearer ${voterToken}`).send({ candidateId: election.candidates[1].id })
    assert.equal(res.status, 201, res.body.error)
    assert.match(res.body.receipt.receipt, /^VC-[0-9A-F]{4}-[0-9A-F]{4}$/)

    const again = await agent().post(`/api/voter/elections/${election.id}/vote`).set('authorization', `Bearer ${voterToken}`).send({ candidateId: election.candidates[0].id })
    assert.equal(again.status, 409)

    const lookup = await agent().get(`/api/public/receipts/${res.body.receipt.receipt}`)
    assert.equal(lookup.body.receipt.txHash, res.body.receipt.txHash)
  })

  it('keeps results sealed while voting is open', async () => {
    const res = await agent().get(`/api/public/elections/${election.id}`)
    assert.equal(res.body.election.votesCast, 1)
    assert.equal(res.body.election.tally, null)
  })

  it('never stores the chosen candidate with the receipt', async () => {
    const res = await agent().get('/api/voter/votes').set('authorization', `Bearer ${voterToken}`)
    assert.equal(res.body.votes.length, 1)
    assert.equal(JSON.stringify(res.body.votes[0]).includes(election.candidates[1].id), false)
  })

  it('stops voters from voting in elections they were not invited to', async () => {
    const other = (await agent().post('/api/elections').set('authorization', `Bearer ${orgToken}`).send(draft({ title: 'Other election' }))).body.election
    await agent().post(`/api/elections/${other.id}/voters`).set('authorization', `Bearer ${orgToken}`).send({ voters: [{ email: 'v9@test.dev' }] })
    await agent().post(`/api/elections/${other.id}/publish`).set('authorization', `Bearer ${orgToken}`)
    const res = await agent().post(`/api/voter/elections/${other.id}/vote`).set('authorization', `Bearer ${voterToken}`).send({ candidateId: other.candidates[0].id })
    assert.equal(res.status, 404)
  })

  it('closes early, reveals the tally and publishes results', async () => {
    const v2 = await otpLogin('v2@test.dev')
    await agent().post(`/api/voter/elections/${election.id}/vote`).set('authorization', `Bearer ${v2}`).send({ candidateId: election.candidates[1].id })

    const closed = await agent().post(`/api/elections/${election.id}/close`).set('authorization', `Bearer ${orgToken}`)
    assert.equal(closed.status, 200, closed.body.error)
    assert.equal(closed.body.election.state, 'closed')
    assert.deepEqual(closed.body.election.tally, {
      [election.candidates[0].id]: 0, [election.candidates[1].id]: 2, [election.candidates[2].id]: 0,
    })

    const v3 = await otpLogin('v3@test.dev')
    const late = await agent().post(`/api/voter/elections/${election.id}/vote`).set('authorization', `Bearer ${v3}`).send({ candidateId: election.candidates[0].id })
    assert.equal(late.status, 409)

    const pub = await agent().post(`/api/elections/${election.id}/publish-results`).set('authorization', `Bearer ${orgToken}`)
    assert.equal(pub.body.election.state, 'published')
    const list = await agent().get('/api/public/elections')
    assert.ok(list.body.elections.some((e) => e.id === election.id && e.tally))
  })

  it('only deletes drafts', async () => {
    const res = await agent().delete(`/api/elections/${election.id}`).set('authorization', `Bearer ${orgToken}`)
    assert.equal(res.status, 409)
  })
})

describe('sessions', () => {
  it('refreshes an access token from the httpOnly cookie', async () => {
    const res = await agent().post('/api/auth/login').send({ email: 'org@test.dev', password: 'password123' })
    const cookie = res.headers['set-cookie']
    const refreshed = await agent().post('/api/auth/refresh').set('Cookie', cookie)
    assert.equal(refreshed.status, 200)
    assert.ok(refreshed.body.accessToken)
  })

  it('rejects a wrong password and a bad sign-in code', async () => {
    assert.equal((await agent().post('/api/auth/login').send({ email: 'org@test.dev', password: 'nope' })).status, 401)
    await agent().post('/api/auth/otp/request').send({ email: 'v1@test.dev' })
    assert.equal((await agent().post('/api/auth/otp/verify').send({ email: 'v1@test.dev', code: '000000' })).status, 400)
  })
})

describe('data stays consistent', () => {
  it('counts eligible voters from the invite list', async () => {
    const e = await Election.findOne({ title: 'Student Council President', state: 'published' })
    assert.equal(e.eligible, 3)
    assert.equal(e.votesCast, 2)
    assert.ok(await Organization.exists({ _id: orgId, status: 'active' }))
  })
})
