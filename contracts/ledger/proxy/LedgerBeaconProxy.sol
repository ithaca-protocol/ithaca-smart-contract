// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract LedgerBeaconProxy is BeaconProxy {
    constructor(
        address beacon,
        bytes memory data
    ) payable BeaconProxy(beacon, data) {} // solhint-disable-line no-empty-blocks

    function getBeacon() external view returns (address) {
        return _getBeacon();
    }

    function getImplementation() external view returns (address) {
        return _implementation();
    }
}
