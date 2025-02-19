import { ethers } from "hardhat";

async function main() {
  const airdrop = await ethers.getContractAt(
    "MerkleAirdrop",
    "0x71A605BF77099Fc27E2bBf249286d5C9683E2184",
  );

  console.log("Withdrawing unclaimed tokens...");
  const tx = await airdrop.withdrawUnclaimed();
  await tx.wait();
  console.log("Successfully withdrawn unclaimed tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
