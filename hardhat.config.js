require('dotenv').config();

require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-tracer");
require('@openzeppelin/hardhat-upgrades');

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    // See https://hardhat.org/hardhat-runner/docs/advanced/multiple-solidity-versions
    compilers: [
      {
        version: '0.8.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  gasReporter: {
    // https://www.npmjs.com/package/hardhat-gas-reporter
    enabled: (process.env.REPORT_GAS) ? true : false
  }
};

if (process.env.MAINNET_ETH_NODE_URL && process.env.MAINNET_OWNER_PRIVATE_KEY) {
  config.networks.mainnet = {
    chainId: 1,
    url: process.env.MAINNET_ETH_NODE_URL,
    accounts: [process.env.MAINNET_OWNER_PRIVATE_KEY],
  };
}

if (process.env.GOERLI_ETH_NODE_URL && process.env.GOERLI_OWNER_PRIVATE_KEY) {
  config.networks.goerli = {
    chainId: 5,
    url: process.env.GOERLI_ETH_NODE_URL,
    accounts: [process.env.GOERLI_OWNER_PRIVATE_KEY],
  };

  config.networks.staging = {
    chainId: 5,
    url: process.env.GOERLI_ETH_NODE_URL,
    accounts: [process.env.GOERLI_OWNER_PRIVATE_KEY],
  };
  
}

module.exports = config;
