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
  let gemTreasury = await contractDeployer.loadContract("GemTreasury");

  const maxCashoutAmount = await contractDeployer.formatValue(
    "config:maxCashoutAmount"
  );
  const currentMaxCashoutAmount = await gemTreasury.maxCashoutAmount();
  if (`${currentMaxCashoutAmount.toString()}` != `${maxCashoutAmount}`) {
    const rs = await gemTreasury.setMaxCashoutAmount(maxCashoutAmount);
    console.log("setMaxCashoutAmount:", maxCashoutAmount, rs.tx);
  }
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
