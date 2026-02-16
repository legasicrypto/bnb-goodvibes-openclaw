import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "";
const PRIVATE_KEY = process.env.DEPLOYER_PK || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};

export default config;
