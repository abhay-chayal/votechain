import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { connectDb } from './db.js'
import { createApp } from './app.js'
import { getChain } from './chain/index.js'
import { User } from './models/index.js'
import { closeExpired } from './services/elections.js'

async function ensureAdmin() {
  const { email, password, name } = config.admin
  if (!email || !password) return
  if (await User.exists({ email: email.toLowerCase() })) return
  await User.create({ email, name, role: 'platform_admin', passwordHash: await bcrypt.hash(password, 12) })
  console.log(`[setup] Created platform admin ${email}`)
}

async function main() {
  await connectDb()
  const chain = getChain()
  try {
    const s = await chain.status()
    console.log(`[chain] ${chain.info().network} · contract ${chain.info().contract} · block ${s.block} · relayer ${s.relayer} (${s.balanceEth.toFixed(4)} ETH)`)
  } catch (err) {
    console.warn(`[chain] Not reachable yet: ${err.message}`)
  }
  await ensureAdmin()
  if (config.seedOnStart) {
    const { seed } = await import('../scripts/seed-data.js')
    await seed()
  }

  const app = createApp()
  app.listen(config.port, () => console.log(`[api] Listening on http://localhost:${config.port}`))

  // Close elections whose end time has passed and cache their results.
  setInterval(() => closeExpired().catch((err) => console.error('[jobs] closeExpired:', err.message)), 60_000)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
