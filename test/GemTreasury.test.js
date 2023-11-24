const { expect } = require("chai");
const { ethers } = require("hardhat");
const abi = require("ethereumjs-abi");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

function toWei(amount) {
  return ethers.utils.parseEther(`${amount}`).toString();
}

describe("GemTreasury contract", function () {
  const minCashoutAmount = toWei(1);
  const maxCashoutAmount = toWei(1000);

  let proxyAdmin, gem, gemTreasury;
  let deployer,
    operator,
    minter,
    transfer,
    burner,
    pauser,
    attacker,
    user1,
    user2;

  beforeEach(async () => {
    [
      deployer,
      operator,
      minter,
      transfer,
      burner,
      pauser,
      attacker,
      user1,
      user2,
    ] = await ethers.getSigners();

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

    // GemTreasury
    {
      const GemTreasury = await ethers.getContractFactory("GemTreasury");
      const NodoProxy = await ethers.getContractFactory("NodoProxy");
      const _logic = await GemTreasury.deploy();
      const _proxy = await NodoProxy.deploy(_logic.address, proxyAdmin.address);

      gemTreasury = await ethers.getContractAt("GemTreasury", _proxy.address);

      await gemTreasury.initialize(
        gem.address,
        minCashoutAmount,
        maxCashoutAmount
      );
      await gemTreasury.grantRole(
        await gemTreasury.OPERATOR_ROLE(),
        operator.address
      );

      await gem.grantRole(await gem.MINTER_ROLE(), gemTreasury.address);
      await gem.grantRole(await gem.TRANSFER_ROLE(), gemTreasury.address);
      await gem.grantRole(await gem.BURNER_ROLE(), gemTreasury.address);
    }
  });

  it("should successfully allocate gem", async function () {
    const requestId = 1;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];
    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);
  });

  it("should successfully revert duplicate allocate gem", async function () {
    const requestId = 1;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    await expect(
      gemTreasury.connect(operator).allocateGems(requestId, receivers, amounts)
    ).to.be.revertedWith("GemTreasury: request is exists.");
  });

  it("should successfully create gemToAirtime request", async function () {
    let requestId = 1;
    let requestType = 0;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");
  });

  it("should successfully complete gemToAirtime request", async function () {
    let requestId = 1;
    let requestType = 0;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");

    await expect(gemTreasury.connect(operator).completeRequest(requestId + 1))
      .to.emit(gemTreasury, "RequestCompleted")
      .withArgs(requestId + 1, requestType);

    await expect(
      gemTreasury.connect(operator).completeRequest(requestId + 1)
    ).to.be.revertedWith("GemTreasury: request already closed.");
  });

  it("should successfully reject gemToAirtime request", async function () {
    let requestId = 1;
    let requestType = 0;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToAirtime(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");

    await expect(gemTreasury.connect(operator).rejectRequest(requestId + 1))
      .to.emit(gemTreasury, "RequestRejected")
      .withArgs(requestId + 1, requestType);

    await expect(
      gemTreasury.connect(operator).rejectRequest(requestId + 1)
    ).to.be.revertedWith("GemTreasury: request already closed.");
  });

  it("should successfully create gemToCoin request", async function () {
    let requestId = 1;
    let requestType = 1;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");
  });

  it("should successfully reject gemToCoin request", async function () {
    let requestId = 1;
    let requestType = 1;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    expect(await gem.balanceOf(user1.address)).to.equal(0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");

    await expect(gemTreasury.connect(operator).rejectRequest(requestId + 1))
      .to.emit(gemTreasury, "RequestRejected")
      .withArgs(requestId + 1, requestType);

    await expect(
      gemTreasury.connect(operator).rejectRequest(requestId + 1)
    ).to.be.revertedWith("GemTreasury: request already closed.");

    expect(await gem.balanceOf(user1.address)).to.equal(amount);
  });

  it("should successfully complete gemToCoin request", async function () {
    let requestId = 1;
    let requestType = 1;
    const receivers = [user1.address, user2.address];
    const amounts = [toWei(100), toWei(120)];

    await gemTreasury
      .connect(operator)
      .allocateGems(requestId, receivers, amounts);

    expect(await gem.balanceOf(receivers[0])).to.equal(amounts[0]);
    expect(await gem.balanceOf(receivers[1])).to.equal(amounts[1]);

    const amount = amounts[0];

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    )
      .to.emit(gemTreasury, "RequestCreated")
      .withArgs(requestId + 1, user1.address, requestType, amount, 0);

    expect(await gem.balanceOf(user1.address)).to.equal(0);

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 1, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: request is exists.");

    await expect(
      gemTreasury
        .connect(operator)
        .cashoutGemToCoin(requestId + 2, user1.address, amount)
    ).to.be.revertedWith("GemTreasury: insufficient balance.");

    await expect(gemTreasury.connect(operator).completeRequest(requestId + 1))
      .to.emit(gemTreasury, "RequestCompleted")
      .withArgs(requestId + 1, requestType);

    await expect(
      gemTreasury.connect(operator).completeRequest(requestId + 1)
    ).to.be.revertedWith("GemTreasury: request already closed.");

    expect(await gem.balanceOf(user1.address)).to.equal(0);
  });
});
