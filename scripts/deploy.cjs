const { ethers } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const Factory = await ethers.getContractFactory("DocumentNotarization");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const output = { address, chainId: (await ethers.provider.getNetwork()).chainId.toString(), deployedAt: new Date().toISOString() };
  fs.mkdirSync(path.join(__dirname, "..", "deployments"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), JSON.stringify(output, null, 2));
  console.log(`DocumentNotarization deployed to ${address} on chain ${output.chainId}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
