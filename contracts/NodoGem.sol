// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/INodoGem.sol";

contract NodoGem is INodoGem, AccessControlUpgradeable, ERC20Upgradeable, PausableUpgradeable {
  bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  modifier onlyMinter() {
    require(hasRole(MINTER_ROLE, _msgSender()), "NodoGem: caller does not have MINTER_ROLE");
    _;
  }

  modifier onlyPauser() {
    require(hasRole(PAUSER_ROLE, _msgSender()), "NodoGem: caller does not have PAUSER_ROLE");
    _;
  }

  modifier onlyTransfer() {
    require(hasRole(TRANSFER_ROLE, _msgSender()), "NodoGem: caller does not have TRANSFER_ROLE");
    _;
  }

  modifier onlyBurner() {
    require(hasRole(BURNER_ROLE, _msgSender()), "NodoGem: caller does not have BURNER_ROLE");
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(string memory name, string memory symbol) public virtual initializer {
    __NodoGem_init(name, symbol);
  }

  function __NodoGem_init(string memory name, string memory symbol) internal onlyInitializing {
    __ERC20_init_unchained(name, symbol);
    __Pausable_init_unchained();
    __AccessControl_init_unchained();
    __NodoGem_init_unchained(name, symbol);
  }

  function __NodoGem_init_unchained(string memory, string memory) internal onlyInitializing {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

    _setupRole(MINTER_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
    _setupRole(BURNER_ROLE, _msgSender());
    _setupRole(TRANSFER_ROLE, _msgSender());
  }

  /**
   * @dev Creates `amount` new tokens for `to`.
   *
   * See {ERC20-_mint}.
   *
   * Requirements:
   *
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(address to, uint256 amount) public virtual onlyMinter {
    _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   *
   * See {ERC20Pausable} and {Pausable-_pause}.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function pause() public virtual onlyPauser {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   *
   * See {ERC20Pausable} and {Pausable-_unpause}.
   *
   * Requirements:
   *
   * - the caller must have the `PAUSER_ROLE`.
   */
  function unpause() public virtual onlyPauser {
    _unpause();
  }

  /**
   * @dev See {IERC20-transfer}.
   *
   * Requirements:
   *
   * - `to` cannot be the zero address.
   * - the caller must have OPERATOR_ROLE
   */
  function transfer(address to, uint256 amount) public virtual override onlyTransfer returns (bool) {
    address sender = _msgSender();
    _transfer(sender, to, amount);
    return true;
  }

  /**
   * @dev See {IERC20-transferFrom}.
   *
   * Emits an {Approval} event indicating the updated allowance. This is not
   * required by the EIP. See the note at the beginning of {ERC20}.
   *
   * NOTE: Does not update the allowance if the current allowance
   * is the maximum `uint256`.
   *
   * Requirements:
   *
   * - `from` and `to` cannot be the zero address.
   * - `from` must have a balance of at least `amount`.
   * - the caller must have OPERATOR_ROLE
   */
  function transferFrom(address from, address to, uint256 amount) public virtual override onlyTransfer returns (bool) {
    _transfer(from, to, amount);
    return true;
  }

  /**
   * @dev Destroys `amount` tokens from the caller.
   *
   * See {ERC20-_burn}.
   *
   * Requirements:
   *
   * - the caller must have OPERATOR_ROLE
   */
  function burn(uint256 amount) public virtual onlyBurner {
    _burn(_msgSender(), amount);
  }

  /**
   * @dev Destroys `amount` tokens from `account`
   *
   * See {ERC20-_burn} and {ERC20-allowance}.
   *
   * Requirements:
   *
   * - the caller must have OPERATOR_ROLE
   */
  function burnFrom(address account, uint256 amount) public virtual onlyBurner {
    _burn(account, amount);
  }

  /**
   * @dev See {ERC20-_beforeTokenTransfer}.
   *
   * Requirements:
   *
   * - the contract must not be paused.
   */
  function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._beforeTokenTransfer(from, to, amount);

    require(!paused(), "NodoGem: token transfer while paused");
  }

  /**
   * @dev This empty reserved space is put in place to allow future versions to add new
   * variables without shifting down storage in the inheritance chain.
   * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[50] private __gap;
}
