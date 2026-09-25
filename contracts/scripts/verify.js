// Publishes the contract source on Etherscan so anyone can read the code that counts votes.
const path = require('path')
const hre = require('hardhat')

async function main() {
  const dep = require(path.join(__dirname, '..', '..', 'server', 'src', 'chain', `deployment.${hre.network.name}.json`))
  const [deployer] = await hre.ethers.getSigners()
  await hre.run('verify:verify', { address: dep.address, constructorArguments: [deployer.address, dep.relayer] })
}

main().catch((err) => { console.error(err); process.exitCode = 1 })
