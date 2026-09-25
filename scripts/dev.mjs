// One-command local environment:
//   1. starts a Hardhat blockchain on :8545 (or reuses one that is already running)
//   2. deploys the VoteChain contract to it
//   3. starts the API on :4000 with an in-memory MongoDB and demo data
//   4. starts the web app on :5173
// Ctrl+C stops everything.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const children = []
const isWin = process.platform === 'win32'
const colors = { chain: 35, api: 36, web: 32, deploy: 33 }

function run(name, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, { cwd: path.join(root, cwd), env: { ...process.env, ...env }, shell: isWin })
  const prefix = `\x1b[${colors[name]}m[${name}]\x1b[0m `
  const pipe = (stream, out) => {
    let buf = ''
    stream.on('data', (d) => {
      buf += d
      const lines = buf.split(/\r?\n/)
      buf = lines.pop()
      for (const l of lines) if (l.trim()) out.write(prefix + l + '\n')
    })
  }
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  children.push(child)
  return child
}

const exited = (child) => new Promise((resolve) => child.on('exit', resolve))

async function chainUp() {
  try {
    const res = await fetch('http://127.0.0.1:8545', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }) })
    return res.ok
  } catch { return false }
}

function stopAll() {
  for (const c of children) {
    if (c.exitCode !== null) continue
    if (isWin) spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'])
    else c.kill('SIGINT')
  }
}
process.on('SIGINT', () => { stopAll(); process.exit(0) })
process.on('SIGTERM', () => { stopAll(); process.exit(0) })

if (await chainUp()) {
  console.log('[dev] Reusing the blockchain already running on :8545')
} else {
  run('chain', 'npx', ['hardhat', 'node'], 'contracts')
  for (let i = 0; i < 60 && !(await chainUp()); i++) await new Promise((r) => setTimeout(r, 1000))
  if (!(await chainUp())) { console.error('[dev] Hardhat node did not start'); stopAll(); process.exit(1) }
}

const code = await exited(run('deploy', 'npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], 'contracts'))
if (code !== 0) { console.error('[dev] Contract deployment failed'); stopAll(); process.exit(1) }

run('api', 'node', ['src/index.js'], 'server', { SEED_ON_START: 'true', CHAIN_NETWORK: 'localhost', PORT: '4000' })
run('web', 'npx', ['vite', '--port', '5173', '--strictPort'], 'client')
console.log('\n[dev] Open http://localhost:5173 (demo password: demo1234)\n')
