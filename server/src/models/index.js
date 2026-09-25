import mongoose from 'mongoose'

const { Schema, model, Types } = mongoose
const opts = { timestamps: true }

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: String,
  role: { type: String, enum: ['platform_admin', 'org_admin', 'voter'], required: true },
  orgId: { type: Types.ObjectId, ref: 'Organization' }, // org admins only
  memberId: String,
  otp: { hash: String, expiresAt: Date, attempts: { type: Number, default: 0 } },
  tokenVersion: { type: Number, default: 0 }, // bump to revoke every refresh token
  prefs: {
    notifyOpen: { type: Boolean, default: true },
    notifyReminder: { type: Boolean, default: true },
    notifyResults: { type: Boolean, default: false },
  },
  lastLoginAt: Date,
}, opts)

const OrganizationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, default: 'Other' },
  description: { type: String, default: '' },
  website: { type: String, default: '' },
  allowedDomain: { type: String, default: '' },
  members: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  admins: [{ type: Types.ObjectId, ref: 'User' }],
}, opts)

const CandidateSchema = new Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, default: '' },
  bio: { type: String, default: '' },
  manifesto: { type: [String], default: [] },
})

const ElectionSchema = new Schema({
  orgId: { type: Types.ObjectId, ref: 'Organization', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Other' },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  // draft → active (on-chain) → closed → published
  state: { type: String, enum: ['draft', 'active', 'closed', 'published'], default: 'draft', index: true },
  candidates: { type: [CandidateSchema], default: [] },
  eligible: { type: Number, default: 0 },
  votesCast: { type: Number, default: 0 },
  tally: { type: Map, of: Number }, // cached from the contract once final
  chain: {
    electionId: String, // uint256 as a decimal string
    voterRoot: String,
    detailsHash: String,
    txHash: String,
    block: Number,
    closeTxHash: String,
  },
  createdBy: { type: Types.ObjectId, ref: 'User' },
  closedAt: Date,
  publishedAt: Date,
}, opts)

const InviteSchema = new Schema({
  electionId: { type: Types.ObjectId, ref: 'Election', required: true },
  orgId: { type: Types.ObjectId, ref: 'Organization', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  memberId: { type: String, default: '' },
  voterToken: { type: String, required: true },
  status: { type: String, enum: ['invited', 'pending', 'voted'], default: 'invited' },
  votedAt: Date,
}, opts)
InviteSchema.index({ electionId: 1, email: 1 }, { unique: true })
InviteSchema.index({ email: 1 })

// A receipt proves a vote was recorded. It never stores the candidate.
const ReceiptSchema = new Schema({
  electionId: { type: Types.ObjectId, ref: 'Election', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, unique: true },
  voterToken: { type: String, required: true },
  txHash: { type: String, required: true, unique: true },
  block: Number,
  castAt: { type: Date, default: Date.now },
})
ReceiptSchema.index({ userId: 1, electionId: 1 }, { unique: true })

const ActivitySchema = new Schema({
  orgId: { type: Types.ObjectId, ref: 'Organization', index: true },
  electionId: { type: Types.ObjectId, ref: 'Election', index: true },
  kind: { type: String, default: 'edit' },
  text: { type: String, required: true },
  actor: { type: String, default: 'System' },
  at: { type: Date, default: Date.now },
})

const FailedTxSchema = new Schema({
  electionId: { type: Types.ObjectId, ref: 'Election' },
  action: String,
  reason: String,
  txHash: String,
  at: { type: Date, default: Date.now },
})

export const User = model('User', UserSchema)
export const Organization = model('Organization', OrganizationSchema)
export const Election = model('Election', ElectionSchema)
export const Invite = model('Invite', InviteSchema)
export const Receipt = model('Receipt', ReceiptSchema)
export const Activity = model('Activity', ActivitySchema)
export const FailedTx = model('FailedTx', FailedTxSchema)
