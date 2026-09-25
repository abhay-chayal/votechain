// Deploys VoteChain and writes its address + ABI to server/src/chain/deployment.<network>.json
// so the API can find it. Usage: npm run deploy:local | npm run deploy:sepolia
const fs = require('fs')
const path = require('path')
const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  // The relayer is the backend's wallet. Locally it is Hardhat account #1; on a testnet
  // set RELAYER_ADDRESS (it can be the same wallet as the deployer).
  const relayer = process.env.RELAYER_ADDRESS || (await hre.ethers.getSigners())[1]?.address || deployer.address

  console.log(`Network:  ${hre.network.name}`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Relayer:  ${relayer}`)

  const VoteChain = await hre.ethers.getContractFactory('VoteChain')
  const contract = await VoteChain.deploy(deployer.address, relayer)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  const receipt = await contract.deploymentTransaction().wait()
  console.log(`VoteChain deployed at ${address} (block ${receipt.blockNumber})`)

  const artifact = await hre.artifacts.readArtifact('VoteChain')
  const out = path.join(__dirname, '..', '..', 'server', 'src', 'chain', `deployment.${hre.network.name}.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    address,
    deployBlock: receipt.blockNumber,
    relayer,
    abi: artifact.abi,
  }, null, 2))
  console.log(`Wrote ${path.relative(process.cwd(), out)}`)
}

main().catch((err) => { console.error(err); process.exitCode = 1 })
