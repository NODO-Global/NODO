const path = require("path");
const hre = require("hardhat");
const { ContractDeployerWithHardhat } = require("@evmchain/contract-deployer");

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
      NodoGem: {
        initArgs: ["Nodo Gem", "NDG"],
      },
    },
  });

  // Grant roles
  await contractDeployer.grantRoles();
}

module.exports = deployAll;
