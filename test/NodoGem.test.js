const { expect } = require("chai");
const { ethers } = require("hardhat");
const abi = require("ethereumjs-abi");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

function toWei(amount) {
  return ethers.utils.parseEther(`${amount}`).toString();
}

describe("NodoGem contract", function () {
  let proxyAdmin, gem;
  let deployer, minter, transfer, burner, pauser, attacker, user1, user2;

  beforeEach(async () => {
    [deployer, minter, transfer, burner, pauser, attacker, user1, user2] =
      await ethers.getSigners();

    const ProxyAdmin = await ethers.getContractFactory("NodoProxyAdmin");
    proxyAdmin = await ProxyAdmin.deploy();

    // NodoGem
    {
      const NodoGem = await ethers.getContractFactory("NodoGem");
      const NodoProxy = await ethers.getContractFactory("NodoProxy");
      const _logic = await NodoGem.deploy();
      const _proxy = await NodoProxy.deploy(_logic.address, proxyAdmin.address);

      gem = await ethers.getContractAt("NodoGem", _proxy.address);

      await gem.initialize("Nodo Gem", "NDG");
      await gem.grantRole(await gem.MINTER_ROLE(), minter.address);
      await gem.grantRole(await gem.TRANSFER_ROLE(), transfer.address);
      await gem.grantRole(await gem.BURNER_ROLE(), burner.address);
      await gem.grantRole(await gem.PAUSER_ROLE(), pauser.address);
    }
  });

  it("should successfully mint gem", async function () {
    const mintAmount = toWei(10);
    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);
  });

  it("should successfully revert mint gem by attacker", async function () {
    const mintAmount = toWei(10);
    await expect(
      gem.connect(attacker).mint(user1.address, mintAmount)
    ).to.be.revertedWith("NodoGem: caller does not have MINTER_ROLE");
  });

  it("should successfully burn gem", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await gem.connect(burner).burnFrom(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal("0");
  });

  it("should successfully revert burn gem by attacker", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await expect(
      gem.connect(attacker).burnFrom(user1.address, mintAmount)
    ).to.be.revertedWith("NodoGem: caller does not have BURNER_ROLE");
  });

  it("should successfully transfer gem", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await gem
      .connect(transfer)
      .transferFrom(user1.address, user2.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal("0");
    expect(await gem.balanceOf(user2.address)).to.equal(mintAmount);
  });

  it("should successfully revert transfer gem by attacker", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await expect(
      gem.connect(user1).transfer(user2.address, mintAmount)
    ).to.be.revertedWith("NodoGem: caller does not have TRANSFER_ROLE");

    await expect(
      gem
        .connect(attacker)
        .transferFrom(user1.address, user2.address, mintAmount)
    ).to.be.revertedWith("NodoGem: caller does not have TRANSFER_ROLE");
  });

  it("should successfully stop transfer when paused", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await gem.connect(pauser).pause();

    await expect(
      gem
        .connect(transfer)
        .transferFrom(user1.address, user2.address, mintAmount)
    ).to.be.revertedWith("NodoGem: token transfer while paused");
  });

  it("should successfully transfer when unpaused", async function () {
    const mintAmount = toWei(10);

    await gem.connect(minter).mint(user1.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal(mintAmount);

    await gem.connect(pauser).pause();

    await expect(
      gem
        .connect(transfer)
        .transferFrom(user1.address, user2.address, mintAmount)
    ).to.be.revertedWith("NodoGem: token transfer while paused");

    await gem.connect(pauser).unpause();

    await gem
      .connect(transfer)
      .transferFrom(user1.address, user2.address, mintAmount);
    expect(await gem.balanceOf(user1.address)).to.equal("0");
    expect(await gem.balanceOf(user2.address)).to.equal(mintAmount);
  });
});
