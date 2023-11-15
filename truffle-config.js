require("dotenv").config();

const HDWalletProvider = require("@truffle/hdwallet-provider");

const WALLET_TESTNET = process.env.DEPLOY_PRIVATE_KEY_TESTNET;
const WALLET_MAINNET = process.env.DEPLOY_PRIVATE_KEY_MAINNET;

module.exports = {
  networks: {
    // development: {
    //   host: "127.0.0.1",
    //   port: 9545,
    //   network_id: "*",
    // },
    "polygon-uat": {
      provider: () => new HDWalletProvider(WALLET_TESTNET, `https://polygon-mumbai.infura.io/v3/a90d83d72d0c4b7682e2272d61a1f59b`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 400000,
      skipDryRun: true,
      networkCheckTimeout: 999999,
      maxFeePerGas: 60000000000,
      maxPriorityFeePerGas: 60000000000,
    },    
  },

  mocha: {
    timeout: 100000,
  },

  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },

  db: {
    enabled: false,
  },
};
