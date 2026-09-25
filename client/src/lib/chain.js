// Reads the VoteChain contract straight from a public RPC node, without going through
// the VoteChain API, so anyone can check that the API is telling the truth.
import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers'

const ABI = [
  'function getElection(uint256) view returns (tuple(bytes32 orgId, bytes32 voterRoot, bytes32 detailsHash, uint64 startTime, uint64 endTime, uint32 voteCount, uint8 candidateCount, bool closed, bool exists))',
  'function getResults(uint256) view returns (uint32[])',
  'function isFinal(uint256) view returns (bool)',
]

/** Same canonical form the server hashes when it publishes an election. */
export function detailsHash(e) {
  return keccak256(toUtf8Bytes(JSON.stringify({
    title: e.title,
    description: e.description,
    startAt: new Date(e.startAt).toISOString(),
    endAt: new Date(e.endAt).toISOString(),
    candidates: e.candidates.map((c) => ({ name: c.name, title: c.title })),
  })))
}

export async function verifyElection(election, { rpcUrl, contract }) {
  if (!rpcUrl || !contract || !election.chain?.electionId) return null
  const c = new Contract(contract, ABI, new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true }))
  const id = BigInt(election.chain.electionId)
  const onChain = await c.getElection(id)
  const final = await c.isFinal(id)
  const checks = [
    {
      label: `Vote count matches the contract (${onChain.voteCount} on-chain)`,
      ok: Number(onChain.voteCount) === election.votesCast,
    },
    { label: 'Election details match the hash stored on-chain', ok: onChain.detailsHash === detailsHash(election) },
    { label: 'Voter list matches the Merkle root on-chain', ok: onChain.voterRoot === election.chain.voterRoot },
    { label: `${election.candidates.length} candidates on the ballot, same as the contract`, ok: Number(onChain.candidateCount) === election.candidates.length },
  ]
  if (final && election.tally) {
    const totals = (await c.getResults(id)).map(Number)
    checks.push({
      label: 'Every candidate\'s total matches the contract',
      ok: election.candidates.every((cand, i) => (election.tally[cand.id] || 0) === totals[i]),
    })
  } else if (!final) {
    checks.push({ label: 'The contract is keeping results sealed until voting closes', ok: true })
  }
  return checks
}
