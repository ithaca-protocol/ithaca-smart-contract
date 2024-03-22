// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../access/AccessRestricted.sol";
import "../access/Roles.sol";

contract MockRole is AccessRestricted {
    event AnyoneCanCallFuncCalled(address caller);
    event OnlyAdminCanCallFuncCalled(address caller);
    event OnlyUtilityAccountCanCallFuncCalled(address caller);

    constructor(address accessController_) initializer {
        __AccessRestricted_init(accessController_);
    }

    function anyoneCanCallFunc() external {
        emit AnyoneCanCallFuncCalled(msg.sender);
    }

    function onlyAdminCanCallFunc() external onlyRole(ADMIN_ROLE) {
        emit OnlyAdminCanCallFuncCalled(msg.sender);
    }

    function onlyUtilityAccountCanCallFunc()
        external
        onlyRole(UTILITY_ACCOUNT_ROLE)
    {
        emit OnlyUtilityAccountCanCallFuncCalled(msg.sender);
    }
}
