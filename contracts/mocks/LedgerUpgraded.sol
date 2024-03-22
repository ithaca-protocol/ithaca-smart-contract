// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../ledger/Ledger.sol";
import "./MockUpgraded.sol";

// solhint-disable-next-line no-empty-blocks
contract LedgerUpgraded is Ledger, MockUpgraded {}
