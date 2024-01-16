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
      NodoGem: {
        initArgs: ["Nodo Gem", "NDG"],
      },
      GemTreasury: {
        initArgs: [
          "address:NodoGem",
          "config:minCashoutAmount",
          "config:maxCashoutAmount",
        ],
      },
    },
  });

  // Grant roles
  await contractDeployer.grantRoles();

  // await test(contractDeployer);
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

const test = async (contractDeployer) => {
  let nodoGem = await contractDeployer.loadContract("NodoGem");
  let gemTreasury = await contractDeployer.loadContract("GemTreasury");

  const user = "0xd2Dceb3DD56ADc9Ab52E08Ad9BEBc13c305F30C4";

  console.log("\nuser:", user);

  const balance = await nodoGem.balanceOf(user);
  console.log("balance:", toEther(balance.toString()));

  let rs = await gemTreasury.getUserAllocation(user);
  console.log("getUserAllocation:", toEther(rs.toString()));

  rs = await gemTreasury.getUserCashout(user);
  console.log("getUserCashout:", toEther(rs.toString()));
};

module.exports = deployAll;
