// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "../strategies/AaveV3Strategy.sol";
import "./MockUpgraded.sol";

// solhint-disable-next-line no-empty-blocks
contract AaveV3StrategyUpgraded is AaveV3Strategy, MockUpgraded {}
