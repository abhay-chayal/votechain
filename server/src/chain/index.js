// Blockchain access for the API. The backend's relayer wallet signs every transaction,
// so voters and organizers never need a wallet or gas.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Contract, JsonRpcProvider, NonceManager, Wallet, formatEther } from 'ethers'
import { config } from '../config.js'

const here = path.dirname(fileURLToPath(import.meta.url))

export class ChainError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.code = code
    this.cause = cause
  }
}

const FRIENDLY = {
  AlreadyVoted: 'This voter has already voted in this election.',
  ElectionNotActive: 'Voting is not open for this election.',
  InvalidMerkleProof: 'This voter is not on the election\'s voter list.',
  InvalidCandidate: 'That candidate is not on the ballot.',
  ElectionExists: 'This election is already on-chain.',
  ElectionNotFound: 'This election was not found on-chain.',
  ElectionAlreadyClosed: 'This election is already closed.',
  ElectionStillRunning: 'Results are sealed until voting closes.',
  AlreadyStarted: 'Voting has already started, so the election can no longer be changed.',
  InvalidWindow: 'The voting window is invalid. The end time must be in the future and after the start time.',
  InvalidCandidateCount: 'An election needs between 2 and 50 candidates.',
  InvalidVoterRoot: 'The voter list is empty.',
}

function loadDeployment() {
  const file = path.join(here, `deployment.${config.chain.network}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

class EthersChain {
  constructor() {
    const dep = loadDeployment()
    this.deployment = dep
    this.address = config.chain.contractAddress || dep?.address
    if (!this.address || !dep?.abi) {
      throw new Error(`No contract deployment found for network "${config.chain.network}". Run the deploy script in /contracts first.`)
    }
    if (!config.chain.rpcUrl || !config.chain.relayerKey) throw new Error('RPC_URL and RELAYER_PRIVATE_KEY must be set')
    this.provider = new JsonRpcProvider(config.chain.rpcUrl)
    this.wallet = new Wallet(config.chain.relayerKey, this.provider)
    this.signer = new NonceManager(this.wallet)
    this.contract = new Contract(this.address, dep.abi, this.signer)
    this.queue = Promise.resolve()
  }

  // Transactions are sent one at a time so nonces never collide under load.
  send(method, args) {
    const run = async () => {
      try {
        const tx = await this.contract[method](...args)
        const rc = await tx.wait(config.chain.confirmations)
        return { txHash: rc.hash, block: rc.blockNumber }
      } catch (err) {
        this.signer.reset()
        throw this.translate(err)
      }
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => {})
    return p
  }

  translate(err) {
    const data = err?.data || err?.info?.error?.data || err?.error?.data
    let name = err?.revert?.name
    if (!name && data) {
      try { name = this.contract.interface.parseError(data)?.name } catch {}
    }
    if (name) return new ChainError(name, FRIENDLY[name] || name, err)
    if (err?.code === 'INSUFFICIENT_FUNDS') return new ChainError('InsufficientFunds', 'The relayer wallet is out of gas funds.', err)
    return new ChainError('ChainUnavailable', 'The blockchain network could not be reached. Please try again.', err)
  }

  async read(fn) {
    try { return await fn() } catch (err) { throw this.translate(err) }
  }

  createElection(p) {
    return this.send('createElection', [BigInt(p.electionId), p.orgId, p.start, p.end, p.candidateCount, p.voterRoot, p.detailsHash])
  }
  updateElection(p) {
    return this.send('updateElection', [BigInt(p.electionId), p.start, p.end, p.candidateCount, p.voterRoot, p.detailsHash])
  }
  castVote(p) {
    return this.send('castVote', [BigInt(p.electionId), p.voterToken, p.candidate, p.proof])
  }
  closeElection(electionId) {
    return this.send('closeElection', [BigInt(electionId)])
  }
  async getResults(electionId) {
    const r = await this.read(() => this.contract.getResults(BigInt(electionId)))
    return r.map(Number)
  }
  async getElection(electionId) {
    const e = await this.read(() => this.contract.getElection(BigInt(electionId)))
    return { voteCount: Number(e.voteCount), closed: e.closed, startTime: Number(e.startTime), endTime: Number(e.endTime), voterRoot: e.voterRoot, detailsHash: e.detailsHash }
  }
  async status() {
    const [block, balance, net] = await Promise.all([
      this.provider.getBlockNumber(), this.provider.getBalance(this.wallet.address), this.provider.getNetwork(),
    ])
    return { ok: true, block, chainId: Number(net.chainId), relayer: this.wallet.address, balanceEth: Number(formatEther(balance)) }
  }
  info() {
    return { network: config.chain.networkName, chainId: this.deployment?.chainId, contract: this.address, explorer: config.chain.explorer, rpcUrl: config.chain.publicRpcUrl || undefined }
  }
}

let impl = null

export function getChain() {
  if (!impl) impl = new EthersChain()
  return impl
}

/** Replace the chain implementation (used by tests). */
export function setChain(chain) {
  impl = chain
}
