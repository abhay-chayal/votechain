# VoteChain

Tamper-proof elections for any organization. Votes are recorded by a Solidity smart contract; the product (accounts, organizations, candidates, invites) runs on React, Node/Express and MongoDB.

## Status

| Part | Folder | Status |
| --- | --- | --- |
| Frontend (React + Tailwind) | `client/` | Clickable prototype, all screens, sample data |
| Smart contract (Solidity + Hardhat) | `contracts/` | Not started |
| REST API (Node + Express + MongoDB) | `server/` | Not started |

## Run the frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 and use **Try the demo** on the sign-in page to enter as a voter, an organization admin or the platform admin. Everything you do (votes, new elections, approvals) is kept in your browser; **Profile → Reset demo** restores the sample data.

## Screens

| Area | Routes |
| --- | --- |
| Public | `/` landing · `/login` · `/register` · `/verify` and `/verify/:id` public results · `/receipt` receipt check |
| Organization admin | `/org` overview · `/org/elections` · `/org/elections/new` 4-step wizard · `/org/elections/:id` overview, candidates, voters, results, audit log · `/org/settings` |
| Voter | `/vote` my elections · `/vote/elections/:id` · `/vote/elections/:id/ballot` · `/vote/receipt/:id` · `/vote/history` · `/vote/profile` |
| Platform admin | `/admin` · `/admin/organizations` · `/admin/elections` · `/admin/health` |

## Where the backend plugs in

- `client/src/data/seed.js` holds the sample data. Each object has the shape the API and contract should return.
- `client/src/store/AppStore.jsx` holds every action (login, create election, cast vote, close, publish, approve org). Each one is commented with the API call that will replace it, e.g. `castVote` → `POST /votes` → relayer → `contract.castVote`.
