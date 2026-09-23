// Sample data for the UI prototype. Every object here mirrors a MongoDB document
// or a contract read, so the backend can later replace this file field by field.
import { fromNow, seededHex } from '../lib/utils'

export const CHAIN = { name: 'Sepolia Testnet', explorer: 'https://sepolia.etherscan.io', chainId: 11155111 }
export const CONTRACT_ADDRESS = '0x' + seededHex('votechain-contract', 40)

export const users = [
  { id: 'u-admin', name: 'Riya Kapoor', email: 'admin@votechain.app', role: 'platform_admin' },
  { id: 'u-org1', name: 'Dr. Anil Verma', email: 'anil.verma@northfield.edu', role: 'org_admin', orgId: 'org-northfield' },
  { id: 'u-voter1', name: 'Aarav Mehta', email: 'aarav.mehta@northfield.edu', role: 'voter', orgIds: ['org-northfield', 'org-greenview'], memberId: 'NIT-22CS041' },
]

export const organizations = [
  {
    id: 'org-northfield', name: 'Northfield Institute of Technology', type: 'University', status: 'active',
    description: 'Student council and department elections for 4,200 students across 9 departments.',
    members: 1240, admins: ['Dr. Anil Verma', 'Prof. Meera Iyer'], createdAt: fromNow(-210), website: 'northfield.edu',
  },
  {
    id: 'org-greenview', name: 'Greenview Heights Housing Society', type: 'Housing society', status: 'active',
    description: 'Resident welfare association for 312 flats across 6 towers.',
    members: 312, admins: ['Sunita Rao'], createdAt: fromNow(-120), website: 'greenviewheights.in',
  },
  {
    id: 'org-lumen', name: 'Lumen Labs Pvt. Ltd.', type: 'Company', status: 'active',
    description: 'Board resolutions and employee polls for a 180-person product company.',
    members: 180, admins: ['Karan Malhotra'], createdAt: fromNow(-64), website: 'lumenlabs.io',
  },
  {
    id: 'org-seedling', name: 'Seedling Foundation', type: 'NGO', status: 'pending',
    description: 'Volunteer-run education NGO electing its governing committee.',
    members: 95, admins: ['Farah Khan'], createdAt: fromNow(-2), website: 'seedling.org',
  },
  {
    id: 'org-shutter', name: 'Shutterbugs Photography Club', type: 'Club', status: 'pending',
    description: 'Inter-college photography club with 60 members.',
    members: 60, admins: ['Rohan Das'], createdAt: fromNow(-1), website: '',
  },
  {
    id: 'org-quickpoll', name: 'QuickPoll Rewards', type: 'Other', status: 'suspended',
    description: 'Suspended: 2,000 voters invited from one IP range within 3 minutes.',
    members: 2000, admins: ['unknown'], createdAt: fromNow(-9), website: '',
  },
]

const c = (id, name, title, bio, manifesto) => ({ id, name, title, bio, manifesto })

export const elections = [
  {
    id: 'el-council-26', orgId: 'org-northfield', category: 'Student council',
    title: 'Student Council President 2026–27',
    description: 'Elect the President of the Student Council for the 2026–27 academic year. All enrolled undergraduate and postgraduate students may vote.',
    startAt: fromNow(-1, -4), endAt: fromNow(1, 6), state: 'active', eligible: 1240,
    candidates: [
      c('c1', 'Ishita Sharma', 'B.Tech CSE, 3rd year', 'Class representative for two years and founder of the campus coding club.', ['24×7 library access during exams', 'Monthly open forum with the Dean', 'Transparent council budget on the notice board']),
      c('c2', 'Kabir Singh', 'B.Tech ECE, 3rd year', 'Sports secretary who organised the 2025 inter-college fest with 40 colleges.', ['Upgrade the sports complex', 'Inter-college fest twice a year', 'Mental-health helpline run with the counselling cell']),
      c('c3', 'Neha Joshi', 'MBA, 1st year', 'Former NSS unit lead with 600+ volunteer hours.', ['Placement prep cell for every department', 'Green campus: solar lights and zero plastic', 'Scholarship help desk']),
      c('c4', 'Arjun Nair', 'B.Sc Physics, 2nd year', 'Debating society captain and editor of the campus magazine.', ['Wi-Fi in every hostel block', 'Student grievance portal with a 7-day SLA', 'Cheaper canteen meal plans']),
    ],
    tally: { c1: 318, c2: 274, c3: 191, c4: 102 },
    turnoutSeries: [12, 48, 96, 170, 262, 355, 430, 512, 590, 655, 720, 790, 845, 885],
  },
  {
    id: 'el-cse-rep', orgId: 'org-northfield', category: 'Department',
    title: 'CSE Department Representative',
    description: 'Choose the student representative for the Computer Science department committee.',
    startAt: fromNow(3), endAt: fromNow(4), state: 'active', eligible: 420,
    candidates: [
      c('c1', 'Pooja Menon', 'B.Tech CSE, 4th year', 'Teaching assistant for Data Structures.', ['Weekly doubt-clearing sessions', 'Alumni mentorship programme']),
      c('c2', 'Rahul Gupta', 'B.Tech CSE, 3rd year', 'Hackathon winner, Smart India Hackathon 2025.', ['24-hour lab access', 'Industry project tie-ups']),
    ],
    tally: {}, turnoutSeries: [],
  },
  {
    id: 'el-cultural-25', orgId: 'org-northfield', category: 'Club',
    title: 'Cultural Secretary 2025–26',
    description: 'Elect the Cultural Secretary who leads the annual fest and club calendar.',
    startAt: fromNow(-300), endAt: fromNow(-299), state: 'published', eligible: 1180,
    candidates: [
      c('c1', 'Sana Qureshi', 'B.Des, 3rd year', 'Led the fashion society.', ['Three-day annual fest', 'Monthly open-mic nights']),
      c('c2', 'Vikram Rao', 'B.Tech ME, 3rd year', 'Music club president.', ['Band nights every fortnight', 'Budget for club equipment']),
      c('c3', 'Ananya Bose', 'BA English, 2nd year', 'Dramatics club lead.', ['Street theatre festival', 'Inter-college cultural exchange']),
    ],
    tally: { c1: 402, c2: 356, c3: 211 },
    turnoutSeries: [],
  },
  {
    id: 'el-hostel-draft', orgId: 'org-northfield', category: 'Hostel',
    title: 'Girls Hostel Mess Committee',
    description: 'Mess committee for Block C. Candidate list still being finalised.',
    startAt: fromNow(10), endAt: fromNow(11), state: 'draft', eligible: 210,
    candidates: [c('c1', 'Divya Pillai', 'B.Tech IT, 2nd year', '', [])],
    tally: {}, turnoutSeries: [],
  },
  {
    id: 'el-greenview-rwa', orgId: 'org-greenview', category: 'Committee',
    title: 'RWA Secretary Election 2026',
    description: 'One vote per flat owner to elect the RWA Secretary for a two-year term.',
    startAt: fromNow(-2), endAt: fromNow(0, 20), state: 'active', eligible: 312,
    candidates: [
      c('c1', 'Sunil Bhatia', 'Tower B, Flat 1204', 'Retired civil engineer, 11 years in the society.', ['Fix the Tower C lift within 60 days', 'Quarterly audited accounts']),
      c('c2', 'Lakshmi Narayan', 'Tower E, Flat 302', 'Chartered accountant and former treasurer.', ['Cut maintenance charges by 8%', 'Solar panels on all rooftops']),
    ],
    tally: { c1: 104, c2: 121 },
    turnoutSeries: [20, 61, 110, 148, 190, 225],
  },
  {
    id: 'el-lumen-board', orgId: 'org-lumen', category: 'Board resolution',
    title: 'Approve FY27 ESOP Pool Expansion',
    description: 'Shareholder resolution to expand the ESOP pool from 8% to 12%.',
    startAt: fromNow(-20), endAt: fromNow(-13), state: 'closed', eligible: 42,
    candidates: [
      c('c1', 'Approve', 'Resolution 2026/07', '', []),
      c('c2', 'Reject', 'Resolution 2026/07', '', []),
      c('c3', 'Abstain', 'Resolution 2026/07', '', []),
    ],
    tally: { c1: 31, c2: 6, c3: 3 },
    turnoutSeries: [],
  },
]

// Votes the signed-in voter has already cast (the voter's own receipts).
export const myVotes = {
  'el-cultural-25': {
    candidateId: 'c1', txHash: '0x' + seededHex('rcpt-cultural'), block: 6_812_433,
    castAt: fromNow(-299, -5), receipt: 'VC-8F3A-21C9',
  },
}

// Recent on-chain vote transactions per election, as shown on the public verification page.
export function ledgerFor(election, count = 12) {
  const total = Object.values(election.tally).reduce((a, b) => a + b, 0)
  return Array.from({ length: Math.min(count, total) }, (_, i) => ({
    txHash: '0x' + seededHex(`${election.id}-tx-${i}`),
    tokenHash: '0x' + seededHex(`${election.id}-tok-${i}`),
    block: 6_900_000 - i * 3 - (election.id.length % 7),
    at: new Date(Math.min(Date.now(), new Date(election.endAt).getTime()) - i * 97_000).toISOString(),
  }))
}

export const voterRoster = [
  ['Aarav Mehta', 'NIT-22CS041', 'voted'], ['Diya Patel', 'NIT-22CS018', 'voted'], ['Rohan Kulkarni', 'NIT-23EC007', 'registered'],
  ['Sneha Reddy', 'NIT-21ME112', 'voted'], ['Mohit Agarwal', 'NIT-24CS090', 'invited'], ['Tanvi Deshmukh', 'NIT-22BT033', 'voted'],
  ['Yash Thakur', 'NIT-23CS055', 'registered'], ['Aisha Siddiqui', 'NIT-22MB004', 'voted'], ['Karthik Iyer', 'NIT-21PH019', 'invited'],
  ['Meghna Sen', 'NIT-24EE061', 'voted'],
].map(([name, memberId, status], i) => ({ id: `v${i}`, name, memberId, email: `${name.split(' ')[0].toLowerCase()}@northfield.edu`, status }))

export const activity = [
  { at: fromNow(0, -0.2), text: 'Vote recorded in block 6,899,997', kind: 'vote' },
  { at: fromNow(0, -1), text: '48 voters invited to CSE Department Representative', kind: 'invite' },
  { at: fromNow(0, -5), text: 'Student Council President 2026–27 opened for voting', kind: 'open' },
  { at: fromNow(-1), text: 'Candidate Arjun Nair added by Prof. Meera Iyer', kind: 'edit' },
  { at: fromNow(-299), text: 'Results published for Cultural Secretary 2025–26', kind: 'publish' },
]
