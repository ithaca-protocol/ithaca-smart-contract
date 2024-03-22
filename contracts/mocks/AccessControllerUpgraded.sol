// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../access/AccessController.sol";
import "./MockUpgraded.sol";

// solhint-disable-next-line no-empty-blocks
contract AccessControllerUpgraded is AccessController, MockUpgraded {}
