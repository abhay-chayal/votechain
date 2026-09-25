import crypto from 'crypto'
import { keccak256, toUtf8Bytes, zeroPadValue } from 'ethers'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { config } from '../config.js'

/**
 * The anonymous voter token that goes on-chain. It is derived from a server secret, so
 * nobody outside VoteChain can link a token to an email address.
 */
export function voterToken(electionId, email) {
  const mac = crypto.createHmac('sha256', config.voterTokenSecret).update(`${electionId}:${email.toLowerCase()}`).digest('hex')
  return keccak256('0x' + mac)
}

export function buildVoterTree(tokens) {
  return StandardMerkleTree.of(tokens.map((t) => [t]), ['bytes32'])
}

export function proofFor(tree, token) {
  for (const [i, v] of tree.entries()) if (v[0] === token) return tree.getProof(i)
  return null
}

/** Hash of the details voters see, committed on-chain so later edits are detectable. */
export function detailsHash(e) {
  const canonical = JSON.stringify({
    title: e.title,
    description: e.description,
    startAt: new Date(e.startAt).toISOString(),
    endAt: new Date(e.endAt).toISOString(),
    candidates: e.candidates.map((c) => ({ name: c.name, title: c.title })),
  })
  return keccak256(toUtf8Bytes(canonical))
}

export const onChainId = (objectId) => BigInt('0x' + String(objectId)).toString()
export const orgBytes32 = (objectId) => zeroPadValue('0x' + String(objectId), 32)

export function receiptCode() {
  const b = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `VC-${b.slice(0, 4)}-${b.slice(4)}`
}

export const otpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
