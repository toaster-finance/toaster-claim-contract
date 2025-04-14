import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // 현재 사용할 네트워크 설정 (기본값: metis)
  const network = process.env.NETWORK || "metis";

  // 네트워크에 따른 컨트랙트 주소 설정
  let airdropContractAddress: string;

  if (network === "boba") {
    airdropContractAddress = process.env.BOBA_AIRDROP_CONTRACT_ADDRESS || "";
    console.log("Withdrawing from Boba Network contract:", airdropContractAddress);
  } else if (network === "metis") {
    airdropContractAddress = process.env.METIS_AIRDROP_CONTRACT_ADDRESS || "";
    console.log("Withdrawing from Metis Network contract:", airdropContractAddress);
  } else {
    throw new Error(`Unsupported network: ${network}`);
  }

  if (!airdropContractAddress) {
    throw new Error(`Airdrop contract address for ${network} network is not set in .env file`);
  }

  const airdrop = await ethers.getContractAt("MerkleAirdrop", airdropContractAddress);

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
