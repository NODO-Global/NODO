// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface INodoGem {
  event TransferDisabledUpdated(bool value);

  function setTransferDisabled(bool value) external;
}
