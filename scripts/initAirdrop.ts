import { ethers, network } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { MerkleAirdrop } from "../typechain-types";

// Load environment variables
dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {
  // 현재 사용할 네트워크 설정 (기본값: 현재 하드햇 네트워크)
  const networkName = network.name;
  const manualNetwork = process.env.NETWORK || networkName;

  // 네트워크에 따른 컨트랙트 주소 설정
  let airdropContractAddress: string;
  let rewardTokenAddress: string;

  if (manualNetwork === "boba") {
    airdropContractAddress = process.env.BOBA_AIRDROP_CONTRACT_ADDRESS || "";
    rewardTokenAddress = process.env.BOBA_REWARD_TOKEN_ADDRESS || "";
    console.log("Using Boba Network contracts");
  } else if (manualNetwork === "metis") {
    airdropContractAddress = process.env.METIS_AIRDROP_CONTRACT_ADDRESS || "";
    rewardTokenAddress = process.env.METIS_REWARD_TOKEN_ADDRESS || "";
    console.log("Using Metis Network contracts");
  } else {
    throw new Error(`Unsupported network: ${manualNetwork}`);
  }

  if (!airdropContractAddress) {
    throw new Error(
      `AIRDROP_CONTRACT_ADDRESS for ${manualNetwork} network is not set in .env file`,
    );
  }

  if (!rewardTokenAddress) {
    throw new Error(`REWARD_TOKEN_ADDRESS for ${manualNetwork} network is not set in .env file`);
  }

  if (!process.env.MERKLE_ROOT) throw new Error("MERKLE_ROOT not set");
  if (!process.env.TOKEN_DECIMALS) throw new Error("TOKEN_DECIMALS not set");
  if (!process.env.AIRDROP_AMOUNT) throw new Error("AIRDROP_AMOUNT not set");

  console.log(`네트워크: ${networkName} (설정: ${manualNetwork})`);
  console.log(`에어드롭 컨트랙트 주소: ${airdropContractAddress}`);
  console.log(`리워드 토큰 주소: ${rewardTokenAddress}`);

  // 컨트랙트 인스턴스 가져오기
  const airdrop = (await ethers.getContractAt(
    "MerkleAirdrop",
    airdropContractAddress,
  )) as MerkleAirdrop;
  const token = await ethers.getContractAt("IERC20", rewardTokenAddress);

  // 토큰 승인
  const totalAmount = ethers.parseUnits(
    process.env.AIRDROP_AMOUNT,
    Number(process.env.TOKEN_DECIMALS),
  );
  const [deployer] = await ethers.getSigners();

  console.log("Approving tokens...");
  try {
    const approveTx = await token
      .connect(deployer)
      .approve(await airdrop.getAddress(), totalAmount);
    console.log("Approve 트랜잭션 해시:", approveTx.hash);
    const approveReceipt = await approveTx.wait();
    if (!approveReceipt) throw new Error("Approve 트랜잭션 영수증을 받지 못했습니다.");

    console.log("Approve 트랜잭션 상태:", approveReceipt.status === 1 ? "성공" : "실패");
    console.log("Approve 가스 사용량:", approveReceipt.gasUsed.toString());

    if (approveReceipt.status !== 1) {
      throw new Error("Approve 트랜잭션이 실패했습니다.");
    }
    console.log("Tokens approved successfully");

    // initAirdrop 실행
    console.log("Initializing airdrop...");
    const tx = await airdrop.initAirdrop(
      await token.getAddress(),
      process.env.MERKLE_ROOT,
      totalAmount,
    );
    console.log("InitAirdrop 트랜잭션 해시:", tx.hash);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("InitAirdrop 트랜잭션 영수증을 받지 못했습니다.");

    console.log("InitAirdrop 트랜잭션 상태:", receipt.status === 1 ? "성공" : "실패");
    console.log("InitAirdrop 가스 사용량:", receipt.gasUsed.toString());

    if (receipt.status !== 1) {
      throw new Error("InitAirdrop 트랜잭션이 실패했습니다.");
    }
    console.log("Airdrop initialized successfully!");
  } catch (error) {
    console.error("트랜잭션 실행 중 에러 발생:");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("스크립트 실행 실패:");
    console.error(error);
    process.exit(1);
  });
