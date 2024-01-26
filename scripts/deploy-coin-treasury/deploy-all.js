const path = require("path");
const hre = require("hardhat");
const { ContractDeployerWithHardhat } = require("@evmchain/contract-deployer");
const BigNumber = require("bignumber.js");

async function deployAll() {
  const networkName = hre.network.name;

  const deployConfig = {
    dataFilename: path.resolve("networks", `${networkName}.json`),
    deployData: require(path.resolve("networks", `${networkName}.json`)),
    proxyAdminName: "NodoProxyAdmin",
    proxyName: "NodoProxy",
  };

  const contractDeployer = new ContractDeployerWithHardhat();
  contractDeployer.setConfig(deployConfig);

  // Init
  await contractDeployer.init();

  // Deploy contract
  await contractDeployer.deployAllManifests({
    args: {
      NodoProxyAdmin: {},
      USDC: { initArgs: ["USD Coin", "USDC"] },
      USDT: { initArgs: ["Tether USD", "USDT"] },
      CoinTreasury: {
        initArgs: ["config:minSigner"],
      },
    },
  });

  // Grant roles
  await contractDeployer.grantRoles();

  await setup(contractDeployer);
}

const BN = (value) => {
  // @ts-ignore
  return new BigNumber(`${value}`);
};

const toEther = (value, decimals = 18) => {
  return BN(value)
    .div(10 ** decimals)
    .toFixed(1);
};

const setup = async (contractDeployer) => {
  let coinTreasury = await contractDeployer.loadContract("CoinTreasury");

  const signer1 = await contractDeployer.formatValue("config:signer1.address");
  const isExists = await coinTreasury.isSignerExists(signer1);
  if (!isExists) {
    console.log("addSigner:", signer1);
    await coinTreasury.addSigner(signer1);
  }
};

module.exports = deployAll;
