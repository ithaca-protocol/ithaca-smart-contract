// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../registry/Registry.sol";
import "./MockUpgraded.sol";

// solhint-disable-next-line no-empty-blocks
contract RegistryUpgraded is Registry, MockUpgraded {}
