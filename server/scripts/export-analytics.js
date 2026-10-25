// Exports VoteChain data for the Big Data Analysis pipeline (analytics/), in exactly the
// same CSV format as the synthetic dataset, so both run through the same MapReduce, Hive
// and Spark jobs.
//
//   participation.csv  one row per invited voter: demographics + whether/when they voted.
//                      Never contains the chosen candidate (the secret-ballot rule).
//   elections.csv      one row per finished election: turnout and the top two totals.
//
// Usage:  node scripts/export-analytics.js [outDir]      (default: ../analytics/data-live)
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { connectDb, disconnectDb } from '../src/db.js'
import { Activity, Election, Invite, Organization, Receipt, User } from '../src/models/index.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(process.argv[2] || path.join(here, '..', '..', 'analytics', 'data-live'))

const day = (d) => new Date(d).toISOString().slice(0, 10)
const stamp = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ')
// A short one-way reference, so rows can be counted without exposing any email or token.
const anon = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 12)

await connectDb()
try {
  fs.mkdirSync(outDir, { recursive: true })
  const orgs = new Map((await Organization.find().lean()).map((o) => [String(o._id), o]))
  const elections = await Election.find({ state: { $ne: 'draft' } }).lean()
  const reminded = new Set((await Activity.find({ text: /^Reminder sent/ }, { electionId: 1 }).lean()).map((a) => String(a.electionId)))
  const signedIn = new Set((await User.find({ lastLoginAt: { $ne: null } }, { email: 1 }).lean()).map((u) => u.email))

  const p = ['voter_ref,election_id,election_date,org_type,state,birth_year,gender,invited_at,reminded,signed_in,voted,voted_at']
  const e = ['election_id,org_type,state,election_date,eligible_voters,votes_cast,num_candidates,winner_votes,runner_up_votes']
  const clean = (s) => String(s ?? '').replace(/,/g, ' ')

  for (const el of elections) {
    const id = String(el._id)
    const orgType = clean(orgs.get(String(el.orgId))?.type || 'Other')
    const invites = await Invite.find({ electionId: el._id }).lean()
    const receipts = new Map((await Receipt.find({ electionId: el._id }).lean()).map((r) => [r.voterToken, r]))
    for (const inv of invites) {
      const r = receipts.get(inv.voterToken)
      p.push([anon(inv.voterToken), id, day(el.startAt), orgType, clean(inv.state || 'Unknown'), inv.birthYear || '',
        clean(inv.gender || 'Prefer not to say'), stamp(inv.createdAt), reminded.has(id) ? 1 : 0,
        r || signedIn.has(inv.email) ? 1 : 0, r ? 1 : 0, r ? stamp(r.castAt) : ''].join(','))
    }
    if (el.tally && (el.state === 'closed' || el.state === 'published')) {
      const totals = Object.values(el.tally).sort((a, b) => b - a)
      e.push([id, orgType, 'Unknown', day(el.startAt), el.eligible, el.votesCast, el.candidates.length, totals[0] || 0, totals[1] || 0].join(','))
    }
  }

  fs.writeFileSync(path.join(outDir, 'participation.csv'), p.join('\n') + '\n')
  fs.writeFileSync(path.join(outDir, 'elections.csv'), e.join('\n') + '\n')
  console.log(`[export] ${p.length - 1} participation rows, ${e.length - 1} finished elections -> ${outDir}`)
} finally {
  await disconnectDb()
}
