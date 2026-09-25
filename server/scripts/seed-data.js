// Demo data. Every vote below goes through the real contract via the relayer, so the
// seeded elections are fully verifiable on-chain. Safe to run twice: it skips if data exists.
import bcrypt from 'bcryptjs'
import { config } from '../src/config.js'
import { Election, Organization, User } from '../src/models/index.js'
import * as svc from '../src/services/elections.js'

export const DEMO_PASSWORD = 'demo1234'
const H = 3_600_000

const students = [
  ['Aarav Mehta', 'aarav.mehta', 'NIT-22CS041'], ['Diya Patel', 'diya.patel', 'NIT-22CS018'], ['Rohan Kulkarni', 'rohan.kulkarni', 'NIT-23EC007'],
  ['Sneha Reddy', 'sneha.reddy', 'NIT-21ME112'], ['Mohit Agarwal', 'mohit.agarwal', 'NIT-24CS090'], ['Tanvi Deshmukh', 'tanvi.deshmukh', 'NIT-22BT033'],
  ['Yash Thakur', 'yash.thakur', 'NIT-23CS055'], ['Aisha Siddiqui', 'aisha.siddiqui', 'NIT-22MB004'], ['Karthik Iyer', 'karthik.iyer', 'NIT-21PH019'],
  ['Meghna Sen', 'meghna.sen', 'NIT-24EE061'], ['Pooja Menon', 'pooja.menon', 'NIT-21CS077'], ['Rahul Gupta', 'rahul.gupta', 'NIT-22CS009'],
].map(([name, handle, memberId]) => ({ name, email: `${handle}@northfield.edu`, memberId }))

const residents = [
  ['Sunil Bhatia', 'sunil.b'], ['Lakshmi Narayan', 'lakshmi.n'], ['Vivek Joshi', 'vivek.j'], ['Nandini Rao', 'nandini.r'],
  ['Imran Shaikh', 'imran.s'], ['Kavya Pillai', 'kavya.p'], ['Harpreet Kaur', 'harpreet.k'],
].map(([name, handle], i) => ({ name, email: `${handle}@greenviewheights.in`, memberId: `GV-${['B', 'E', 'A', 'C', 'D', 'F', 'B'][i]}${1000 + i * 101}` }))
  .concat([{ name: 'Aarav Mehta', email: 'aarav.mehta@northfield.edu', memberId: 'GV-C0602' }])

const c = (name, title, bio, manifesto = []) => ({ name, title, bio, manifesto })

async function user(data, password = true) {
  return User.findOneAndUpdate(
    { email: data.email },
    { $setOnInsert: { ...data, ...(password ? { passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) } : {}) } },
    { upsert: true, new: true },
  )
}

async function makeElection(org, admin, data, voters, { publish = true } = {}) {
  const e = await Election.create({ orgId: org._id, createdBy: admin._id, state: 'draft', ...data })
  await svc.addVoters(e, voters)
  if (publish) await svc.publishElection(e, admin.name)
  return e
}

async function vote(e, voter, candidateIndex) {
  const u = await user({ name: voter.name, email: voter.email, role: 'voter', memberId: voter.memberId }, voter.email.startsWith('aarav'))
  return svc.castVote(e, u, e.candidates[candidateIndex]._id)
}

export async function seed({ log = console.log } = {}) {
  if (await Organization.exists({})) { log('[seed] Data already present, skipping'); return }
  log('[seed] Creating demo organizations, users and on-chain elections…')

  // Never create a platform admin with a public demo password in production; use ADMIN_EMAIL / ADMIN_PASSWORD there.
  if (!config.isProd) await user({ name: 'Riya Kapoor', email: 'admin@votechain.app', role: 'platform_admin' })

  const northfield = await Organization.create({ name: 'Northfield Institute of Technology', type: 'University', status: 'active', members: 1240, website: 'northfield.edu', allowedDomain: 'northfield.edu', description: 'Student council and department elections for 4,200 students across 9 departments.' })
  const anil = await user({ name: 'Dr. Anil Verma', email: 'anil.verma@northfield.edu', role: 'org_admin', orgId: northfield._id })
  const meera = await user({ name: 'Prof. Meera Iyer', email: 'meera.iyer@northfield.edu', role: 'org_admin', orgId: northfield._id })
  northfield.admins = [anil._id, meera._id]
  await northfield.save()

  const greenview = await Organization.create({ name: 'Greenview Heights Housing Society', type: 'Housing society', status: 'active', members: 312, website: 'greenviewheights.in', description: 'Resident welfare association for 312 flats across 6 towers.' })
  const sunita = await user({ name: 'Sunita Rao', email: 'sunita.rao@greenviewheights.in', role: 'org_admin', orgId: greenview._id })
  greenview.admins = [sunita._id]
  await greenview.save()

  for (const [name, type, members, description, adminName, email] of [
    ['Seedling Foundation', 'NGO', 95, 'Volunteer-run education NGO electing its governing committee.', 'Farah Khan', 'farah@seedling.org'],
    ['Shutterbugs Photography Club', 'Club', 60, 'Inter-college photography club with 60 members.', 'Rohan Das', 'rohan@shutterbugs.club'],
  ]) {
    const o = await Organization.create({ name, type, members, description, status: 'pending' })
    const a = await user({ name: adminName, email, role: 'org_admin', orgId: o._id })
    o.admins = [a._id]
    await o.save()
  }

  const now = Date.now()

  // 1. Finished and published, including a vote from the demo voter.
  const cultural = await makeElection(northfield, anil, {
    title: 'Cultural Secretary 2025–26', category: 'Club',
    description: 'Elect the Cultural Secretary who leads the annual fest and club calendar.',
    startAt: new Date(now), endAt: new Date(now + H),
    candidates: [
      c('Sana Qureshi', 'B.Des, 3rd year', 'Led the fashion society for two years.', ['Three-day annual fest', 'Monthly open-mic nights']),
      c('Vikram Rao', 'B.Tech ME, 3rd year', 'Music club president.', ['Band nights every fortnight', 'Budget for club equipment']),
      c('Ananya Bose', 'BA English, 2nd year', 'Dramatics club lead.', ['Street theatre festival', 'Inter-college cultural exchange']),
    ],
  }, students.slice(0, 10))
  for (const [i, pick] of [0, 0, 1, 0, 2, 1, 0, 1].entries()) await vote(cultural, students[i], pick)
  await svc.closeElection(cultural, anil.name)
  await svc.publishResults(cultural, anil.name)

  // 2. Live now.
  const council = await makeElection(northfield, anil, {
    title: 'Student Council President 2026–27', category: 'Student council',
    description: 'Elect the President of the Student Council for the 2026–27 academic year. All enrolled undergraduate and postgraduate students may vote.',
    startAt: new Date(now), endAt: new Date(now + 2 * 24 * H),
    candidates: [
      c('Ishita Sharma', 'B.Tech CSE, 3rd year', 'Class representative for two years and founder of the campus coding club.', ['24×7 library access during exams', 'Monthly open forum with the Dean', 'Transparent council budget on the notice board']),
      c('Kabir Singh', 'B.Tech ECE, 3rd year', 'Sports secretary who organised the 2025 inter-college fest with 40 colleges.', ['Upgrade the sports complex', 'Inter-college fest twice a year', 'Mental-health helpline with the counselling cell']),
      c('Neha Joshi', 'MBA, 1st year', 'Former NSS unit lead with 600+ volunteer hours.', ['Placement prep cell for every department', 'Green campus: solar lights and zero plastic', 'Scholarship help desk']),
      c('Arjun Nair', 'B.Sc Physics, 2nd year', 'Debating society captain and editor of the campus magazine.', ['Wi-Fi in every hostel block', 'Student grievance portal with a 7-day SLA', 'Cheaper canteen meal plans']),
    ],
  }, students)
  for (const [i, pick] of [0, 1, 0, 2, 0, 3, 1].entries()) await vote(council, students[i + 1], pick)

  // 3. Scheduled.
  await makeElection(northfield, anil, {
    title: 'CSE Department Representative', category: 'Department',
    description: 'Choose the student representative for the Computer Science department committee.',
    startAt: new Date(now + 3 * 24 * H), endAt: new Date(now + 4 * 24 * H),
    candidates: [
      c('Pooja Menon', 'B.Tech CSE, 4th year', 'Teaching assistant for Data Structures.', ['Weekly doubt-clearing sessions', 'Alumni mentorship programme']),
      c('Rahul Gupta', 'B.Tech CSE, 3rd year', 'Hackathon winner, Smart India Hackathon 2025.', ['24-hour lab access', 'Industry project tie-ups']),
    ],
  }, students.filter((s) => s.memberId.includes('CS')))

  // 4. Draft.
  await makeElection(northfield, anil, {
    title: 'Girls Hostel Mess Committee', category: 'Hostel',
    description: 'Mess committee for Block C. Candidate list still being finalised.',
    startAt: new Date(now + 10 * 24 * H), endAt: new Date(now + 11 * 24 * H),
    candidates: [c('Divya Pillai', 'B.Tech IT, 2nd year', '')],
  }, students.slice(1, 6), { publish: false })

  // 5. Live in a second organization the demo voter belongs to.
  const rwa = await makeElection(greenview, sunita, {
    title: 'RWA Secretary Election 2026', category: 'Committee',
    description: 'One vote per flat owner to elect the RWA Secretary for a two-year term.',
    startAt: new Date(now), endAt: new Date(now + 20 * H),
    candidates: [
      c('Sunil Bhatia', 'Tower B, Flat 1204', 'Retired civil engineer, 11 years in the society.', ['Fix the Tower C lift within 60 days', 'Quarterly audited accounts']),
      c('Lakshmi Narayan', 'Tower E, Flat 302', 'Chartered accountant and former treasurer.', ['Cut maintenance charges by 8%', 'Solar panels on all rooftops']),
    ],
  }, residents)
  for (const [i, pick] of [1, 0, 1, 1, 0].entries()) await vote(rwa, residents[i], pick)

  log(`[seed] Done. Demo accounts (password "${DEMO_PASSWORD}"): admin@votechain.app, anil.verma@northfield.edu, aarav.mehta@northfield.edu`)
}
