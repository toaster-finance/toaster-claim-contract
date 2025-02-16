import { ContractFactory } from "ethers";
import { ethers } from "hardhat";

async function main() {
  const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
  const merkleAirdropAbi = MerkleAirdrop.interface.formatJson();

  console.log("MerkleAirdrop ABI:");
  console.log(merkleAirdropAbi);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
