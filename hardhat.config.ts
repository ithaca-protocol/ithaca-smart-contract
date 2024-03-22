import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@primitivefi/hardhat-dodoc";
import "@typechain/hardhat";
import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";
import "hardhat-gas-reporter";

dotenv.config({ path: resolve(__dirname, ".env") });

const config: HardhatUserConfig = {
    solidity: { version: "0.8.20" },
    networks: {
        "arb-goerli": {
            url: "https://arbitrum-goerli.publicnode.com",
            chainId: 421613,
            accounts: [process.env.ADMIN_SECRET_KEY!, process.env.UTILITY_ACCOUNT_SECRET_KEY!],
        },
    },
    dodoc: { runOnCompile: true, outputDir: "docs/natspec" },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "TRUE" ? true : false,
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
        currency: "USD",
        excludeContracts: ["contracts/mocks"],
    },
    mocha: { timeout: 10000000 },
};

export default config;
