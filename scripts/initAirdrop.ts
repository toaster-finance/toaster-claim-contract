import { ethers } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { MerkleAirdrop } from "../typechain-types";

// Load environment variables
dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {
  if (!process.env.AIRDROP_CONTRACT_ADDRESS) throw new Error("AIRDROP_CONTRACT_ADDRESS not set");
  if (!process.env.REWARD_TOKEN_ADDRESS) throw new Error("REWARD_TOKEN_ADDRESS not set");
  if (!process.env.MERKLE_ROOT) throw new Error("MERKLE_ROOT not set");

  // 컨트랙트 인스턴스 가져오기
  const airdrop = (await ethers.getContractAt(
    "MerkleAirdrop",
    process.env.AIRDROP_CONTRACT_ADDRESS,
  )) as MerkleAirdrop;
  const token = await ethers.getContractAt("IERC20", process.env.REWARD_TOKEN_ADDRESS);

  // 토큰 승인
  const totalAmount = ethers.parseEther("1000000");
  const [deployer] = await ethers.getSigners();

  console.log("Approving tokens...");
  const approveTx = await token.connect(deployer).approve(await airdrop.getAddress(), totalAmount);
  await approveTx.wait();
  console.log("Tokens approved");

  // initAirdrop 실행
  console.log("Initializing airdrop...");
  const tx = await airdrop.initAirdrop(
    await token.getAddress(),
    process.env.MERKLE_ROOT,
    totalAmount,
  );
  await tx.wait();
  console.log("Airdrop initialized successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
