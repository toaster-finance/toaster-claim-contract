import { ethers, network } from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// 환경 변수 로드
dotenvConfig({ path: resolve(__dirname, "../.env") });

async function main() {
  // 현재 사용할 네트워크 설정 (기본값: 현재 하드햇 네트워크)
  const networkName = network.name;
  const manualNetwork = process.env.NETWORK || networkName;

  // 네트워크에 따른 컨트랙트 주소 설정
  let rewardTokenAddress: string;

  if (manualNetwork === "boba") {
    rewardTokenAddress = process.env.BOBA_REWARD_TOKEN_ADDRESS || "";
  } else if (manualNetwork === "metis") {
    rewardTokenAddress = process.env.METIS_REWARD_TOKEN_ADDRESS || "";
  } else {
    throw new Error(`Unsupported network: ${manualNetwork}`);
  }

  if (!rewardTokenAddress) {
    throw new Error(`REWARD_TOKEN_ADDRESS for ${manualNetwork} network is not set in .env file`);
  }

  if (!process.env.TOKEN_DECIMALS) throw new Error("TOKEN_DECIMALS not set");

  // 네트워크 정보 표시
  console.log(`현재 네트워크: ${networkName}`);
  console.log(`사용 중인 설정: ${manualNetwork}`);

  // 첫 번째 계정(배포자) 가져오기
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  // 토큰 컨트랙트 인스턴스 가져오기
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

  // 토큰 잔액 조회
  const balance = await token.balanceOf(deployerAddress);
  const decimals = Number(process.env.TOKEN_DECIMALS);

  // 읽기 쉬운 형태로 변환
  const readableBalance = ethers.formatUnits(balance, decimals);

  // 계정 ETH 잔액 확인 (네이티브 토큰)
  const ethBalance = await ethers.provider.getBalance(deployerAddress);
  const readableEthBalance = ethers.formatEther(ethBalance);

  console.log("-------------------------------------------------------");
  console.log(`네트워크: ${networkName} (설정: ${manualNetwork})`);
  console.log(`지갑 주소: ${deployerAddress}`);
  console.log(`ETH 잔액: ${readableEthBalance} ETH`);
  console.log(`토큰 주소: ${rewardTokenAddress}`);
  console.log(`토큰 이름: ${tokenName}`);
  console.log(`토큰 심볼: ${tokenSymbol}`);
  console.log(`토큰 잔액: ${readableBalance} ${tokenSymbol}`);
  console.log("-------------------------------------------------------");

  // 에어드롭 금액과 비교
  if (process.env.AIRDROP_AMOUNT) {
    const airdropAmount = process.env.AIRDROP_AMOUNT;
    console.log(`설정된 에어드롭 금액: ${airdropAmount} ${tokenSymbol}`);

    const balanceNum = parseFloat(readableBalance);
    const airdropNum = parseFloat(airdropAmount);

    if (balanceNum < airdropNum) {
      console.log(
        `⚠️ 경고: 지갑 잔액(${readableBalance})이 에어드롭 금액(${airdropAmount})보다 적습니다!`,
      );
    } else {
      console.log(`✅ 지갑 잔액이 충분합니다. 에어드롭을 진행할 수 있습니다.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("스크립트 실행 실패:");
    console.error(error);
    process.exit(1);
  });
