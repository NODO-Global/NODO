// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface ICoinTreasury {
  struct Request {
    uint256 requestId;
    address receiver;
    address token; // address(0) if native token
    uint256 amount;
  }

  event AddSigner(address signer);

  event RevokeSigner(address signer);

  event SendToken(uint256 requestId, address receiver, address token, uint256 amount, bytes32 transferId);

  function addSigner(address signer) external;

  function revokeSigner(address signer) external;

  function setMinSigner(uint256 min) external;

  function getMinSigner() external view returns (uint256);

  function getSignerCount() external view returns (uint256);

  function isSignerExists(address signer) external view returns (bool);

  function pause() external;

  function unpause() external;

  function sendToken(Request calldata request_, bytes[] calldata sigs_, address[] calldata signers_) external;
}
