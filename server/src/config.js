import 'dotenv/config'

const env = process.env
const isProd = env.NODE_ENV === 'production'

function required(name, devDefault) {
  const v = env[name]
  if (v) return v
  if (!isProd && devDefault !== undefined) return devDefault
  throw new Error(`Missing required environment variable ${name}`)
}

// Hardhat's well-known account #1. Only ever used against a local Hardhat node.
const HARDHAT_RELAYER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'

const network = env.CHAIN_NETWORK || 'localhost'

export const config = {
  isProd,
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT || 4000),
  mongoUri: env.MONGODB_URI || '', // empty → embedded in-memory MongoDB (development only)
  clientUrls: (env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  publicAppUrl: env.PUBLIC_APP_URL || (env.CLIENT_URL || 'http://localhost:5173').split(',')[0],

  jwtSecret: required('JWT_SECRET', 'dev-access-secret-change-me'),
  refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  voterTokenSecret: required('VOTER_TOKEN_SECRET', 'dev-voter-token-secret-change-me'),
  accessTtl: '15m',
  refreshTtlDays: 7,

  chain: {
    network,
    rpcUrl: env.RPC_URL || (network === 'localhost' ? 'http://127.0.0.1:8545' : ''),
    // A public, key-free RPC the browser can use to verify results independently.
    publicRpcUrl: env.PUBLIC_RPC_URL || (network === 'localhost' ? 'http://127.0.0.1:8545' : ''),
    relayerKey: env.RELAYER_PRIVATE_KEY || (network === 'localhost' ? HARDHAT_RELAYER_KEY : ''),
    contractAddress: env.CONTRACT_ADDRESS || '',
    explorer: env.EXPLORER_URL || (network === 'sepolia' ? 'https://sepolia.etherscan.io' : ''),
    networkName: env.CHAIN_NAME || (network === 'sepolia' ? 'Sepolia Testnet' : 'Hardhat Local'),
    confirmations: Number(env.CHAIN_CONFIRMATIONS || 1),
  },

  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT || 587),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'VoteChain <no-reply@votechain.app>',
  },

  // In development the one-time sign-in code is returned in the API response so the
  // app can be used without an email provider. Never enable this in production.
  exposeOtp: !isProd && env.EXPOSE_OTP !== 'false',
  seedOnStart: env.SEED_ON_START === 'true',

  admin: { email: env.ADMIN_EMAIL || '', password: env.ADMIN_PASSWORD || '', name: env.ADMIN_NAME || 'Platform Admin' },
}
