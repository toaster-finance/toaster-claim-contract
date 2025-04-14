import { ethers, network } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { formatUnits } from "ethers";

// 환경 변수 로드
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

  if (!process.env.TOKEN_DECIMALS) throw new Error("TOKEN_DECIMALS not set");

  const decimals = Number(process.env.TOKEN_DECIMALS);

  console.log(`네트워크: ${networkName} (설정: ${manualNetwork})`);
  console.log(`에어드롭 컨트랙트 주소: ${airdropContractAddress}`);
  console.log(`리워드 토큰 주소: ${rewardTokenAddress}`);

  // 컨트랙트 인스턴스 가져오기
  const airdrop = await ethers.getContractAt("MerkleAirdrop", airdropContractAddress);
  const token = await ethers.getContractAt("IERC20", rewardTokenAddress);

  // 토큰 정보 가져오기
  let tokenSymbol = "Unknown";
  let tokenName = "Unknown Token";
  try {
    // ERC20 토큰 심볼과 이름 조회 시도
    const tokenContract = await ethers.getContractAt("MockERC20", rewardTokenAddress);
    tokenSymbol = await tokenContract.symbol();
    tokenName = await tokenContract.name();
  } catch (error) {
    console.log("토큰 심볼/이름을 가져올 수 없습니다. 기본값 사용");
  }

  // 컨트랙트 내 토큰 잔액 조회
  const balance = await token.balanceOf(airdropContractAddress);

  // 읽기 쉬운 형태로 변환
  const readableBalance = formatUnits(balance, decimals);

  console.log("-------------------------------------------------------");
  console.log(`컨트랙트 주소: ${airdropContractAddress}`);
  console.log(`토큰 주소: ${rewardTokenAddress}`);
  console.log(`토큰 이름: ${tokenName} (${tokenSymbol})`);
  console.log(`컨트랙트 내 잔여 토큰: ${readableBalance} ${tokenSymbol}`);

  // 총 에어드롭 금액과 비교 (설정된 경우)
  if (process.env.AIRDROP_AMOUNT) {
    const totalAirdropAmount = process.env.AIRDROP_AMOUNT;
    const airdropNum = parseFloat(totalAirdropAmount);
    const balanceNum = parseFloat(readableBalance);

    const claimedPercentage = ((airdropNum - balanceNum) / airdropNum) * 100;
    const remainingPercentage = (balanceNum / airdropNum) * 100;

    console.log(`총 에어드롭 금액: ${totalAirdropAmount} ${tokenSymbol}`);
    console.log(
      `청구된 금액: ${(airdropNum - balanceNum).toFixed(2)} ${tokenSymbol} (${claimedPercentage.toFixed(2)}%)`,
    );
    console.log(
      `남은 금액: ${readableBalance} ${tokenSymbol} (${remainingPercentage.toFixed(2)}%)`,
    );
  }
  console.log("-------------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("스크립트 실행 실패:");
    console.error(error);
    process.exit(1);
  });
