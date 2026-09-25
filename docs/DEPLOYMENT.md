# Deploying VoteChain

The live setup is **one Render web service**. It runs the API and serves the web app, so everything is on one domain. It uses a MongoDB Atlas database and the VoteChain contract on the Sepolia test network. Every service below has a free tier; a custom domain is the only optional cost.

> Never commit a private key, `.env` file or password, and never paste them in chat. They go only into `.env` files on your computer or the Render dashboard.

## Accounts you need

| # | Account | Used for | Cost |
| --- | --- | --- | --- |
| 1 | GitHub | Hosting the code; Render deploys from it | Free |
| 2 | MetaMask | The relayer wallet that pays gas for every vote | Free |
| 3 | A Sepolia faucet | Free test ETH for that wallet | Free |
| 4 | Alchemy | A private RPC URL so the server can reach Sepolia | Free |
| 5 | MongoDB Atlas | The database | Free (M0) |
| 6 | Brevo | Sending sign-in codes and invites by email | Free (300 emails/day) |
| 7 | Render | Running the app | Free, or $7/month so it never sleeps |
| 8 | A domain (optional) | e.g. `votechain.in` instead of `votechain.onrender.com` | About ₹600–1,000/year |

## 1. Push the code to GitHub

Create an empty **private** repository on github.com (no README), then in `D:\votechain`:

```bash
git remote add origin https://github.com/<your-username>/votechain.git
git push -u origin main
```

## 2. Create the relayer wallet and get test ETH

1. Install the MetaMask browser extension. Create a **new** wallet just for this project, and write the recovery phrase on paper.
2. In MetaMask, turn on "Show test networks" and switch to **Sepolia**.
3. Copy your wallet address (0x…) and request test ETH from a faucet, such as Google Cloud's Web3 faucet (Ethereum Sepolia) or Alchemy's Sepolia faucet. Aim for 0.1–0.2 ETH. Deploying costs about 0.005 and each vote about 0.0001, so 0.1 ETH covers roughly 900 votes.
4. MetaMask → ⋮ → Account details → **Show private key**. You'll need it in steps 4 and 7. Treat it like a password.

## 3. Get an RPC URL

Sign up at alchemy.com, create an app, and choose **Ethereum → Sepolia**. Copy the HTTPS URL, which looks like `https://eth-sepolia.g.alchemy.com/v2/abc123…`.

## 4. Deploy the contract (from your computer)

```bash
cd D:\votechain\contracts
copy .env.example .env
```

Open `contracts\.env` and fill in `SEPOLIA_RPC_URL` (step 3) and `DEPLOYER_PRIVATE_KEY` (step 2). Leave `RELAYER_ADDRESS` empty so the same wallet is the relayer. Then:

```bash
npm run deploy:sepolia
```

It prints the contract address and writes `server\src\chain\deployment.sepolia.json`. That file is public information and Render needs it, so commit it:

```bash
cd D:\votechain
git add server/src/chain/deployment.sepolia.json
git commit -m "Deploy VoteChain contract to Sepolia"
git push
```

Optional: get a free API key at etherscan.io, add it as `ETHERSCAN_API_KEY`, and run `npm run verify:sepolia` in `contracts`. Anyone can then read the contract's source code on Etherscan.

## 5. Create the database

1. On mongodb.com/atlas, create a free **M0** cluster.
2. **Database Access** → add a user with a password. Avoid `@` or `/` in the password.
3. **Network Access** → add `0.0.0.0/0` (Render's free plan has no fixed IP address).
4. **Connect → Drivers** → copy the connection string, and add the database name before the `?`:
   `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/votechain?retryWrites=true&w=majority`

## 6. Set up email

Voters sign in with a 6-digit code sent by email, so the live site needs this. **Without it, nobody can sign in with an email code.**

1. Sign up at brevo.com and verify the sender email you want to use.
2. SMTP & API → SMTP: note the **login** and generate an **SMTP key**.

## 7. Deploy on Render

1. On render.com → **New → Blueprint** → connect GitHub → pick the repository. It reads `render.yaml`.
2. Fill in the values it asks for:

| Variable | Value |
| --- | --- |
| `CLIENT_URL` | `https://votechain.onrender.com` (the service's URL, or your domain later) |
| `MONGODB_URI` | from step 5 |
| `RPC_URL` | from step 3 |
| `RELAYER_PRIVATE_KEY` | from step 2 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the platform admin login you want |
| `SMTP_USER`, `SMTP_PASS` | from step 6 |
| `MAIL_FROM` | e.g. `VoteChain <your-verified-sender@gmail.com>` |

3. Click **Apply**. The first build takes about 5 minutes. Then open `https://<service>.onrender.com`.
4. Check: sign in with your admin email, then open **System health**. The database, blockchain RPC and relayer should all show "Operational".

On the free plan the service sleeps after 15 minutes idle, and the next visit takes up to a minute. For a live election or a demo, upgrade to the Starter plan ($7/month), or open the site a few minutes beforehand.

## 8. Use your own domain (optional)

1. Buy a domain from any registrar (GoDaddy, Namecheap, Hostinger, …).
2. Render → your service → **Settings → Custom Domains** → add `votechain.in` and `www.votechain.in`.
3. At your registrar, add the DNS records Render shows you (an `A` record for the root, a `CNAME` for `www`). HTTPS is set up automatically.
4. Change `CLIENT_URL` on Render to `https://votechain.in` and redeploy, so links in emails point to your domain.

## 9. First real use

1. Sign in as the platform admin.
2. Register an organization at `/register` using another email, then approve it under **Admin → Organizations**.
3. As that organization, create an election, add 3–4 real email addresses, and publish.
4. Vote from those accounts, close the election early, publish the results, and open the public results page. All integrity checks should pass.

## Optional: demo data on the live site

To show the sample organizations and elections live, run the seed once from your computer against the live database. It sends about 40 Sepolia transactions (about 0.005 test ETH).

In `server\.env`, set `NODE_ENV=production`, `MONGODB_URI`, `CHAIN_NETWORK=sepolia`, `RPC_URL`, `RELAYER_PRIVATE_KEY`, and any long random values for `JWT_SECRET`, `JWT_REFRESH_SECRET` and `VOTER_TOKEN_SECRET`. Then:

```bash
cd D:\votechain\server
npm run seed
```

For the demo-account buttons on the sign-in page, set `VITE_SHOW_DEMO_ACCOUNTS=true` on Render and redeploy. The demo password is public, so turn this off before a real election.

## Checklist before a real election

- [ ] `VITE_SHOW_DEMO_ACCOUNTS=false`, and no demo data in the database
- [ ] A sign-in code arrives by email (check the spam folder once)
- [ ] The relayer has enough test ETH: about 0.0001 per voter, plus a margin (Admin → System health)
- [ ] Render is on a plan that doesn't sleep, or the site was opened just before voting starts
- [ ] A trial election with a few people, closed early and checked on the public results page
