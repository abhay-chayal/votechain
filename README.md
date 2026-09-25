# VoteChain

Tamper-proof elections for any organization. Colleges, companies, housing societies, NGOs and clubs create elections, invite voters by email, and every vote is recorded by a smart contract on Ethereum. Voters don't need a crypto wallet, and anyone can check the results against the blockchain.

| Part | Folder | Stack |
| --- | --- | --- |
| Smart contract | `contracts/` | Solidity 0.8.24, Hardhat, OpenZeppelin (AccessControl, MerkleProof) |
| REST API | `server/` | Node 20, Express, MongoDB (Mongoose), ethers v6, JWT + bcrypt |
| Web app | `client/` | React 18, Vite, Tailwind CSS 4, React Router |

## Run it locally (one command)

Requires Node.js 20.6 or newer. No MongoDB, Docker or wallet needed.

```bash
npm run setup
npm run dev
```

`npm run dev` starts a local blockchain, deploys the contract, starts the API with demo data (every demo vote is a real transaction), and opens the web app on http://localhost:5173.

- The first start downloads a MongoDB binary (about 600 MB, once).
- Demo accounts use the password `demo1234`: `aarav.mehta@northfield.edu` (voter), `anil.verma@northfield.edu` (organization admin), `admin@votechain.app` (platform admin). They also appear as buttons on the sign-in page.
- With no email server configured, sign-in codes are shown on screen and emails are printed in the terminal.
- Data is in memory, so it resets each time you restart.

## Tests

```bash
npm test
```

- `contracts/`: 17 Hardhat tests. They cover election creation, the voting window, duplicate votes, voters not on the list, invalid candidates, access control, early closing and sealed results.
- `server/`: 17 API tests against an in-memory database and a simulated chain. They cover onboarding and approval, OTP sign-in, the full election lifecycle, double voting, receipt lookup, and that receipts never store the choice.

## How a vote works

1. The organizer publishes an election. The API builds a Merkle tree of anonymous voter tokens (HMAC of election + email) and calls `createElection` with its root, the voting window and a hash of the election details.
2. A voter signs in with an email code and picks a candidate. The API's relayer wallet calls `castVote` with the voter's token and a Merkle proof. The contract checks the window, the proof, the candidate, and that the token hasn't voted.
3. The voter gets a receipt: code, transaction hash and block. The receipt never contains the choice.
4. `getResults` reverts until the election closes. After that, the verification page reads the totals straight from the chain in the browser. It also re-checks the vote count, the details hash and the voter-list root, so a tampered database would show up as a failed check.

## Security model and known limits

- **The contract enforces the rules.** Duplicate votes, votes outside the window and votes from people not on the list are rejected on-chain, not just by the API.
- **Only the relayer can submit votes.** This saves voters from needing wallets, but it means the VoteChain operator could in principle vote on behalf of invited voters who never vote. The mitigations: every voter can check their own receipt, turnout is public per election, and all transactions are public. Voter-signed ballots (EIP-712) would remove this trust and are the next step.
- **Ballot secrecy is partial.** Identities never go on-chain; only anonymous tokens do. But the chosen candidate is visible in the transaction data, and the server can link tokens to emails. A commit-reveal or zero-knowledge scheme would fix this and is listed as future work.
- **This is a college project, not audited election software.** Get an independent audit before any binding election.

## Deploying

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In short: contract on Sepolia, database on MongoDB Atlas, and one Render service that runs the API and serves the web app on a single domain.
