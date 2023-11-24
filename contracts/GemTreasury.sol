// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IGemTreasury.sol";
import "./interfaces/INodoGem.sol";

contract GemTreasury is IGemTreasury, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

  address public gem;
  uint public minCashoutAmount;
  uint public maxCashoutAmount;
  uint256 public totalAllocation;
  uint256 public totalCashout;

  // request id => true | false
  mapping(uint256 => bool) _requestIds;

  // request id => request data
  mapping(uint256 => Request) _requests;

  // user address => total user cashout amount
  mapping(address => uint256) _cashouts;

  // user address => total user allocate amount
  mapping(address => uint256) _allocations;

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "GemTreasury: caller is not admin");
    _;
  }

  modifier onlyOperator() {
    require(hasRole(OPERATOR_ROLE, _msgSender()), "GemTreasury: caller is not operator");
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address gem_, uint256 minCashoutAmount_, uint256 maxCashoutAmount_) public virtual initializer {
    __GemTreasury_init(gem_, minCashoutAmount_, maxCashoutAmount_);
  }

  function __GemTreasury_init(address gem_, uint256 minCashoutAmount_, uint256 maxCashoutAmount_) internal onlyInitializing {
    __AccessControl_init();
    __ReentrancyGuard_init();
    __GemTreasury_init_unchained(gem_, minCashoutAmount_, maxCashoutAmount_);
  }

  function __GemTreasury_init_unchained(address gem_, uint256 minCashoutAmount_, uint256 maxCashoutAmount_) internal onlyInitializing {
    gem = gem_;
    minCashoutAmount = minCashoutAmount_;
    maxCashoutAmount = maxCashoutAmount_;

    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OPERATOR_ROLE, _msgSender());
  }

  function setGem(address gem_) external onlyAdmin {
    gem = gem_;
  }

  function setMinCashoutAmount(uint256 newValue) external onlyAdmin {
    uint oldValue = minCashoutAmount;
    minCashoutAmount = newValue;

    emit MinCashoutAmountChanged(oldValue, newValue);
  }

  function setMaxCashoutAmount(uint256 newValue) external onlyAdmin {
    uint oldValue = maxCashoutAmount;
    maxCashoutAmount = newValue;

    emit MaxCashoutAmountChanged(oldValue, newValue);
  }

  function allocateGems(uint256 requestId, address[] calldata receivers, uint256[] calldata amounts) external onlyOperator {
    require(!_requestIds[requestId], "GemTreasury: request is exists.");
    require(receivers.length == amounts.length, "GemTreasury: receivers and amounts are mismatch.");

    for (uint i = 0; i < receivers.length; i++) {
      _allocateGem(requestId, receivers[i], amounts[i]);
    }

    _requestIds[requestId] = true;

    emit RequestCompleted(requestId, uint256(RequestType.AllocateGem));
  }

  function cashoutGemToAirtime(uint256 requestId, address user, uint256 amount) external override onlyOperator {
    _createRequestRequest(requestId, RequestType.GemToAirtime, user, amount);
  }

  function cashoutGemToCoin(uint256 requestId, address user, uint256 amount) external override onlyOperator {
    _createRequestRequest(requestId, RequestType.GemToCoin, user, amount);
  }

  function rejectRequest(uint256 requestId) external override onlyOperator {
    Request storage req = _requests[requestId];
    require(req.id > 0, "GemTreasury: request not found.");
    require(req.status == RequestStatus.Pending, "GemTreasury: request already closed.");

    req.status = RequestStatus.Rejected;
    req.finishedAt = block.timestamp;

    // Refund
    IERC20(gem).transferFrom(address(this), req.user, req.amount);

    emit RequestRejected(req.id, uint256(req.requestType));
  }

  function completeRequest(uint256 requestId) external override onlyOperator {
    Request storage req = _requests[requestId];
    require(req.id > 0, "GemTreasury: request not found.");
    require(req.status == RequestStatus.Pending, "GemTreasury: request already closed.");

    req.status = RequestStatus.Completed;
    req.finishedAt = block.timestamp;

    _cashouts[req.user] += req.amount;
    totalCashout += req.amount;

    INodoGem(gem).burnFrom(address(this), req.amount);

    emit RequestCompleted(req.id, uint256(req.requestType));
  }

  function getRequestInfo(uint256 requestId) external view returns (Request memory) {
    return _requests[requestId];
  }

  function _createRequestRequest(uint256 requestId, RequestType requestType, address user, uint256 amount) internal {
    require(!_requestIds[requestId], "GemTreasury: request is exists.");
    require(amount >= minCashoutAmount && amount <= maxCashoutAmount, "GemTreasury: invalid amount.");
    require(IERC20(gem).balanceOf(user) >= amount, "GemTreasury: insufficient balance.");

    Request memory req = Request({
      id: requestId,
      user: user,
      amount: amount,
      requestType: requestType,
      status: RequestStatus.Pending,
      createdAt: block.timestamp,
      finishedAt: 0
    });
    _requests[requestId] = req;
    _requestIds[requestId] = true;

    // Lock user gem
    IERC20(gem).transferFrom(user, address(this), amount);

    emit RequestCreated(req.id, req.user, uint256(req.requestType), req.amount, uint256(req.status));
  }

  function _allocateGem(uint256 requestId, address receiver, uint256 amount) internal {
    INodoGem(gem).mint(receiver, amount);

    _allocations[receiver] += amount;
    totalAllocation += amount;

    emit AllocateGem(requestId, receiver, amount);
  }

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[50] private __gap;
}
