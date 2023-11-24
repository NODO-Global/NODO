// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IGemTreasury {
  enum RequestType {
    GemToAirtime,
    GemToCoin,
    AllocateGem
  }

  enum RequestStatus {
    Pending,
    Rejected,
    Completed
  }

  struct Request {
    uint256 id;
    address user;
    uint256 amount;
    RequestType requestType;
    RequestStatus status;
    uint256 createdAt;
    uint256 finishedAt;
  }

  event MinCashoutAmountChanged(uint256 oldValue, uint256 newValue);

  event MaxCashoutAmountChanged(uint256 oldValue, uint256 newValue);

  event AllocateGem(uint256 requestId, address receiver, uint256 amount);

  event RequestCreated(uint256 requestId, address user, uint256 requestType, uint256 amount, uint256 status);

  event RequestRejected(uint256 requestId, uint256 requestType);

  event RequestCompleted(uint256 requestId, uint256 requestType);

  function allocateGems(uint256 requestId, address[] calldata receivers, uint256[] calldata amounts) external;

  function cashoutGemToAirtime(uint256 requestId, address user, uint256 amount) external;

  function cashoutGemToCoin(uint256 requestId, address user, uint256 amount) external;

  function rejectRequest(uint256 requestId) external;

  function completeRequest(uint256 requestId) external;

  function getRequestInfo(uint256 requestId) external view returns (Request memory);
}
