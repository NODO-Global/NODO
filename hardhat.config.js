require("dotenv").config();

require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-tracer");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    // See https://hardhat.org/hardhat-runner/docs/advanced/multiple-solidity-versions
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    "holesky-dev": {
      chainId: 17000,
      url: "https://ethereum-holesky.publicnode.com",
      accounts: [process.env.DEV_PRIVATE_KEY],
      gasPrice: 10000000000,
    },
    "holesky-uat": {
      chainId: 17000,
      url: "https://ethereum-holesky.publicnode.com",
      accounts: [process.env.UAT_PRIVATE_KEY],
      gasPrice: 10000000000,
    },
    // "holesky-prod": {
    //   chainId: 17000,
    //   url: "https://ethereum-holesky.publicnode.com",
    //   accounts: [process.env.PROD_PRIVATE_KEY],
    //   gasPrice: 8000000000,
    // },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  gasReporter: {
    // https://www.npmjs.com/package/hardhat-gas-reporter
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

module.exports = config;
