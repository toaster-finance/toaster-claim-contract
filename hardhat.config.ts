import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      // 로컬 테스트넷 설정
    },
    metis: {
      url: "https://andromeda.metis.io/?owner=1088",
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 1088,
    },
    boba: {
      url: "https://mainnet.boba.network",
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 288,
    },
  },
};

export default config;
