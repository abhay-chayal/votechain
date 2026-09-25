const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time, loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree')

const token = (s) => ethers.keccak256(ethers.toUtf8Bytes(s))
const ORG = ethers.zeroPadValue('0x01', 32)
const DETAILS = token('details-v1')
const ID = 1n

async function deploy() {
  const [admin, relayer, stranger] = await ethers.getSigners()
  const vc = await (await ethers.getContractFactory('VoteChain')).deploy(admin.address, relayer.address)
  const voters = ['alice', 'bob', 'carol', 'dave'].map(token)
  const tree = StandardMerkleTree.of(voters.map((v) => [v]), ['bytes32'])
  const proof = (v) => tree.getProof([v])
  const now = await time.latest()
  const start = BigInt(now + 60)
  const end = BigInt(now + 3600)
  await vc.connect(relayer).createElection(ID, ORG, start, end, 3, tree.root, DETAILS)
  return { vc, admin, relayer, stranger, voters, tree, proof, start, end }
}

async function open() {
  const f = await loadFixture(deploy)
  await time.increaseTo(f.start)
  return f
}

describe('VoteChain', () => {
  describe('createElection', () => {
    it('stores the election and emits ElectionCreated', async () => {
      const { vc, tree, start, end } = await loadFixture(deploy)
      const e = await vc.getElection(ID)
      expect(e.exists).to.equal(true)
      expect(e.startTime).to.equal(start)
      expect(e.endTime).to.equal(end)
      expect(e.candidateCount).to.equal(3)
      expect(e.voterRoot).to.equal(tree.root)
      expect(e.detailsHash).to.equal(DETAILS)
    })

    it('rejects a duplicate election ID', async () => {
      const { vc, relayer, tree, start, end } = await loadFixture(deploy)
      await expect(vc.connect(relayer).createElection(ID, ORG, start, end, 3, tree.root, DETAILS))
        .to.be.revertedWithCustomError(vc, 'ElectionExists')
    })

    it('rejects bad parameters', async () => {
      const { vc, relayer, tree, start, end } = await loadFixture(deploy)
      await expect(vc.connect(relayer).createElection(2, ORG, end, start, 3, tree.root, DETAILS)).to.be.revertedWithCustomError(vc, 'InvalidWindow')
      await expect(vc.connect(relayer).createElection(2, ORG, start, end, 1, tree.root, DETAILS)).to.be.revertedWithCustomError(vc, 'InvalidCandidateCount')
      await expect(vc.connect(relayer).createElection(2, ORG, start, end, 51, tree.root, DETAILS)).to.be.revertedWithCustomError(vc, 'InvalidCandidateCount')
      await expect(vc.connect(relayer).createElection(2, ORG, start, end, 3, ethers.ZeroHash, DETAILS)).to.be.revertedWithCustomError(vc, 'InvalidVoterRoot')
    })

    it('only lets the relayer create elections', async () => {
      const { vc, stranger, tree, start, end } = await loadFixture(deploy)
      await expect(vc.connect(stranger).createElection(2, ORG, start, end, 3, tree.root, DETAILS))
        .to.be.revertedWithCustomError(vc, 'AccessControlUnauthorizedAccount')
    })
  })

  describe('updateElection', () => {
    it('allows changes before voting opens', async () => {
      const { vc, relayer, tree, start, end } = await loadFixture(deploy)
      await expect(vc.connect(relayer).updateElection(ID, start, end + 60n, 4, tree.root, token('details-v2')))
        .to.emit(vc, 'ElectionUpdated')
      expect((await vc.getElection(ID)).candidateCount).to.equal(4)
    })

    it('blocks changes once voting has started', async () => {
      const { vc, relayer, tree, start, end } = await open()
      await expect(vc.connect(relayer).updateElection(ID, start, end, 4, tree.root, DETAILS))
        .to.be.revertedWithCustomError(vc, 'AlreadyStarted')
    })
  })

  describe('castVote', () => {
    it('records a valid vote without revealing the choice in the event', async () => {
      const { vc, relayer, voters, proof } = await open()
      await expect(vc.connect(relayer).castVote(ID, voters[0], 1, proof(voters[0])))
        .to.emit(vc, 'VoteCast').withArgs(ID, voters[0], 1)
      expect(await vc.hasVoted(ID, voters[0])).to.equal(true)
      expect((await vc.getElection(ID)).voteCount).to.equal(1)
    })

    it('rejects a second vote from the same voter', async () => {
      const { vc, relayer, voters, proof } = await open()
      await vc.connect(relayer).castVote(ID, voters[0], 1, proof(voters[0]))
      await expect(vc.connect(relayer).castVote(ID, voters[0], 2, proof(voters[0])))
        .to.be.revertedWithCustomError(vc, 'AlreadyVoted')
    })

    it('rejects voters who are not on the list', async () => {
      const { vc, relayer, voters, proof } = await open()
      await expect(vc.connect(relayer).castVote(ID, token('mallory'), 0, proof(voters[0])))
        .to.be.revertedWithCustomError(vc, 'InvalidMerkleProof')
    })

    it('rejects an invalid candidate index', async () => {
      const { vc, relayer, voters, proof } = await open()
      await expect(vc.connect(relayer).castVote(ID, voters[0], 3, proof(voters[0])))
        .to.be.revertedWithCustomError(vc, 'InvalidCandidate')
    })

    it('rejects votes before the start and after the end', async () => {
      const f = await loadFixture(deploy)
      await expect(f.vc.connect(f.relayer).castVote(ID, f.voters[0], 0, f.proof(f.voters[0])))
        .to.be.revertedWithCustomError(f.vc, 'ElectionNotActive')
      await time.increaseTo(f.end)
      await expect(f.vc.connect(f.relayer).castVote(ID, f.voters[0], 0, f.proof(f.voters[0])))
        .to.be.revertedWithCustomError(f.vc, 'ElectionNotActive')
    })

    it('rejects votes on an unknown election', async () => {
      const { vc, relayer, voters, proof } = await open()
      await expect(vc.connect(relayer).castVote(99, voters[0], 0, proof(voters[0])))
        .to.be.revertedWithCustomError(vc, 'ElectionNotFound')
    })

    it('only lets the relayer submit votes', async () => {
      const { vc, stranger, voters, proof } = await open()
      await expect(vc.connect(stranger).castVote(ID, voters[0], 0, proof(voters[0])))
        .to.be.revertedWithCustomError(vc, 'AccessControlUnauthorizedAccount')
    })
  })

  describe('closing and results', () => {
    it('keeps results sealed while voting is open', async () => {
      const { vc } = await open()
      await expect(vc.getResults(ID)).to.be.revertedWithCustomError(vc, 'ElectionStillRunning')
    })

    it('lets the relayer close early and then reveals the tally', async () => {
      const { vc, relayer, voters, proof } = await open()
      await vc.connect(relayer).castVote(ID, voters[0], 0, proof(voters[0]))
      await vc.connect(relayer).castVote(ID, voters[1], 2, proof(voters[1]))
      await vc.connect(relayer).castVote(ID, voters[2], 2, proof(voters[2]))
      await expect(vc.connect(relayer).closeElection(ID)).to.emit(vc, 'ElectionClosed').withArgs(ID, 3, relayer.address)
      expect(await vc.getResults(ID)).to.deep.equal([1n, 0n, 2n])
      await expect(vc.connect(relayer).castVote(ID, voters[3], 0, proof(voters[3])))
        .to.be.revertedWithCustomError(vc, 'ElectionNotActive')
      await expect(vc.connect(relayer).closeElection(ID)).to.be.revertedWithCustomError(vc, 'ElectionAlreadyClosed')
    })

    it('stops anyone else closing before the end, but allows it after', async () => {
      const { vc, stranger, end } = await open()
      await expect(vc.connect(stranger).closeElection(ID)).to.be.revertedWithCustomError(vc, 'ElectionStillRunning')
      await time.increaseTo(end)
      expect(await vc.isFinal(ID)).to.equal(true)
      await expect(vc.connect(stranger).closeElection(ID)).to.emit(vc, 'ElectionClosed')
    })

    it('reveals results automatically once the end time passes', async () => {
      const { vc, relayer, voters, proof, end } = await open()
      await vc.connect(relayer).castVote(ID, voters[0], 1, proof(voters[0]))
      await time.increaseTo(end)
      expect(await vc.getResults(ID)).to.deep.equal([0n, 1n, 0n])
    })
  })
})
