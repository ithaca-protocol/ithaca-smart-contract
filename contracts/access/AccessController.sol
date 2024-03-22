// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable, AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {IAccessController} from "./IAccessController.sol";
import {ADMIN_ROLE} from "./Roles.sol";

contract AccessController is
    IAccessController,
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external override initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function checkRole(bytes32 role, address account) external view override {
        _checkRole(role, account);
    }

    function renounceRole(
        bytes32 role,
        address callerConfirmation
    ) public override(AccessControlUpgradeable, IAccessControl) {
        uint256 roleMemberCount = getRoleMemberCount(role);
        if (roleMemberCount == 1) revert AccessControlLastMember();
        super.renounceRole(role, callerConfirmation);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(ADMIN_ROLE) {} // solhint-disable-line no-empty-blocks
}
