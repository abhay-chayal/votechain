# Deploying VoteChain

This takes about an hour the first time. All services used here have free tiers.

| Piece | Service | What you need |
| --- | --- | --- |
| Source code | GitHub | A repository (Vercel and Render deploy from it) |
| Smart contract | Ethereum Sepolia testnet | A wallet, free test ETH, an RPC URL |
| Database | MongoDB Atlas | A free M0 cluster |
| API | Render | A free web service |
| Web app | Vercel | A free project |
| Email | Brevo, Resend or Gmail | SMTP login (optional but needed for real voters) |

> Never commit a private key, a `.env` file or a database password. Paste them only into `.env` files on your own computer or into the Render/Vercel dashboards.

## 1. Push the code to GitHub

Create an empty repository on GitHub, then from `D:\votechain`:

```bash
git remote add origin https://github.com/<you>/votechain.git
git push -u origin main
```

## 2. Wallet and test ETH

1. Install MetaMask and create a new wallet used only for this project. Don't reuse a wallet that holds real money.
2. Add the Sepolia network in MetaMask (Settings → Networks → show test networks).
3. Get free Sepolia ETH from a faucet, for example Google Cloud's Web3 faucet or the Alchemy Sepolia faucet. About 0.1 ETH is plenty: deploying costs roughly 0.005 ETH, and each vote roughly 0.0001 ETH at normal testnet gas prices.
4. Export the account's private key (MetaMask → account details → show private key). This single wallet will act as both deployer and relayer.

## 3. RPC URL

Create a free Alchemy (or Infura) account and a Sepolia app. Copy its HTTPS URL, which looks like `https://eth-sepolia.g.alchemy.com/v2/...`.

## 4. Deploy the contract

```bash
cd contracts
copy .env.example .env
```

Fill in `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `contracts/.env`. Optionally add `ETHERSCAN_API_KEY` from etherscan.io. Then:

```bash
npm run deploy:sepolia
npm run verify:sepolia
```

The deploy writes `server/src/chain/deployment.sepolia.json` (the contract address and ABI, nothing secret). Commit and push it:

```bash
git add server/src/chain/deployment.sepolia.json
git commit -m "Deploy VoteChain contract to Sepolia"
git push
```

## 5. MongoDB Atlas

1. Create a free M0 cluster.
2. Database Access: add a user with a strong password.
3. Network Access: allow `0.0.0.0/0`, because Render's free tier has no fixed IP.
4. Connect → Drivers: copy the connection string and put the database name `votechain` before the `?`.

## 6. API on Render

1. In Render: New → Blueprint, then pick your repository. It reads `render.yaml`.
2. Fill in the values it asks for:
   - `MONGODB_URI`: from step 5.
   - `RPC_URL`: from step 3.
   - `RELAYER_PRIVATE_KEY`: from step 2.
   - `CLIENT_URL`: your Vercel URL from step 7. You can update it afterwards.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`: your own platform admin login.
   - SMTP settings: from step 8, or leave blank for now.
3. Deploy, then open `https://<service>.onrender.com/api/health`. It should return `{"ok":true}`.

On the free plan, Render sleeps after 15 minutes idle, and the first request afterwards takes up to a minute. Open the site a few minutes before a demo.

## 7. Web app on Vercel

1. In `client/vercel.json`, replace `REPLACE-WITH-YOUR-RENDER-SERVICE` with your Render service name. Commit and push.
2. In Vercel: Add New → Project, then import the repository. Set the **Root Directory** to `client`. The framework preset is Vite.
3. Environment variable: `VITE_SHOW_DEMO_ACCOUNTS` = `true` for a college demo, `false` for real use.
4. Deploy. Then put the Vercel URL into Render's `CLIENT_URL` and redeploy the API.

The browser only ever talks to the Vercel domain; `/api` is forwarded to Render. That keeps the sign-in cookie first-party, so sessions work in every browser.

## 8. Email (for real voters)

Voters sign in with a code sent by email. Any SMTP provider works:

- **Brevo** (free, 300 emails/day): SMTP host `smtp-relay.brevo.com`, port 587, plus your SMTP login and key.
- **Gmail**: host `smtp.gmail.com`, port 587, your address, and an App Password (Google Account → Security → 2-Step Verification → App passwords).

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` on Render.

## 9. Demo data (optional)

To fill the live site with the sample organizations and elections, run the seed once from your computer against the production database and Sepolia. It sends about 40 transactions, which costs about 0.005 test ETH.

```bash
cd server
copy .env.example .env
```

In `server/.env`, set `NODE_ENV=production`, `MONGODB_URI`, `CHAIN_NETWORK=sepolia`, `RPC_URL`, `RELAYER_PRIVATE_KEY`, and any long random strings for `JWT_SECRET`, `JWT_REFRESH_SECRET` and `VOTER_TOKEN_SECRET` (required in production mode). Then:

```bash
npm run seed
```

In production the seed does not create the demo platform admin. Use your `ADMIN_EMAIL` account instead.

## Checklist before a real election

- [ ] `VITE_SHOW_DEMO_ACCOUNTS=false`, and no demo data in the database
- [ ] SMTP configured and a test sign-in code received
- [ ] Relayer balance covers the number of voters (see Admin → System health)
- [ ] A trial election with a few people, closed early, checked on the verification page
