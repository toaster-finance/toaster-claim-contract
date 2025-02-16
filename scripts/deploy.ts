import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", await deployer.getAddress());
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.getAddress())).toString(),
  );

  // Deploy MerkleAirdrop
  const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
  const merkleAirdrop = await MerkleAirdrop.deploy();
  await merkleAirdrop.waitForDeployment();

  const merkleAirdropAddress = await merkleAirdrop.getAddress();
  console.log("MerkleAirdrop deployed to:", merkleAirdropAddress);

  console.log("Deployment completed!");
  console.log("Next steps:");
  console.log("1. Call setToken function to set the ERC20 token address");
  console.log("2. Call setMerkleRoot function to set the Merkle Root");
  console.log("3. Call depositTokens function to deposit airdrop tokens");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
