// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./lib/Signature.sol";

import "./interfaces/ICoinTreasury.sol";
import "./interfaces/INodoGem.sol";

contract CoinTreasury is ICoinTreasury, AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
  using Signature for bytes32;
  using SafeERC20 for IERC20;

  bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  uint256 private _minSigner;

  // transfer id => true | false
  mapping(bytes32 => bool) private _transfers;

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CoinTreasury: caller is not admin");
    _;
  }

  modifier onlyOperator() {
    require(hasRole(OPERATOR_ROLE, _msgSender()), "CoinTreasury: caller is not operator");
    _;
  }

  modifier onlyPauser() {
    require(hasRole(PAUSER_ROLE, _msgSender()), "CoinTreasury: caller is not pauser");
    _;
  }

  receive() external payable {}

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(uint256 minSigner_) public virtual initializer {
    __Pausable_init();
    __AccessControlEnumerable_init();
    __ReentrancyGuard_init();

    _minSigner = minSigner_;

    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OPERATOR_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
  }

  function addSigner(address signer) external override onlyAdmin {
    require(!hasRole(SIGNER_ROLE, signer), "CoinTreasury: signer is existed!");
    _setupRole(SIGNER_ROLE, signer);
    emit AddSigner(signer);
  }

  function revokeSigner(address signer) external override onlyAdmin {
    require(hasRole(SIGNER_ROLE, signer), "CoinTreasury: signer is not existed!");
    revokeRole(SIGNER_ROLE, signer);
    emit RevokeSigner(signer);
  }

  function setMinSigner(uint256 min) external override onlyAdmin {
    require(min > 0 && min <= getRoleMemberCount(SIGNER_ROLE), "CoinTreasury: value must greater than zero and less than or equal to signer count");
    _minSigner = min;
  }

  function getMinSigner() external view override returns (uint256) {
    return _minSigner;
  }

  function getSignerCount() external view override returns (uint256) {
    return getRoleMemberCount(SIGNER_ROLE);
  }

  function isSignerExists(address signer) external view override returns (bool) {
    return hasRole(SIGNER_ROLE, signer);
  }

  function pause() external override onlyPauser {
    _pause();
  }

  function unpause() external override onlyPauser {
    _unpause();
  }

  function _verifySigners(address[] calldata signers_) internal view {
    require(signers_.length >= _minSigner, "CoinTreasury: not meet threshold");

    for (uint i = 0; i < signers_.length; i++) {
      require(hasRole(SIGNER_ROLE, signers_[i]), "INVALID_SIGNER");

      // Check duplicate signer
      for (uint j = i + 1; j < signers_.length; j++) {
        if (signers_[i] == signers_[j]) {
          revert("CoinTreasury: duplicate signer");
        }
      }
    }
  }

  function _verifyRequest(Request calldata request_, bytes[] calldata sigs_, address[] calldata signers_) internal view returns (bytes32) {
    _verifySigners(signers_);

    bytes32 transferId = keccak256(abi.encodePacked(request_.requestId, request_.receiver, request_.token, request_.amount));
    require(_transfers[transferId] == false, "CoinTreasury: transfer exists");
    transferId.verifySignatures(sigs_, signers_);
    return transferId;
  }

  function sendToken(Request calldata request_, bytes[] calldata sigs_, address[] calldata signers_) external override onlyOperator whenNotPaused {
    bytes32 transferId = _verifyRequest(request_, sigs_, signers_);

    _transfers[transferId] = true;

    if (request_.token != address(0)) {
      uint256 balance = IERC20(request_.token).balanceOf(address(this));
      require(balance >= request_.amount, "CoinTreasury: insufficient balance.");

      IERC20(request_.token).approve(address(this), request_.amount);
      IERC20(request_.token).safeTransferFrom(address(this), request_.receiver, request_.amount);
    } else {
      // Native token
      uint256 balance = address(this).balance;
      require(balance >= request_.amount, "CoinTreasury: insufficient balance.");

      AddressUpgradeable.sendValue(payable(request_.receiver), request_.amount);
    }

    emit SendToken(request_.requestId, request_.receiver, request_.token, request_.amount, transferId);
  }

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[50] private __gap;
}
