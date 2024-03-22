// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";

import {IAccessController} from "./IAccessController.sol";

abstract contract AccessRestricted is Initializable {
    // keccak256("_access_controller_")
    bytes32 internal constant _ACCESS_CONTROLLER_SLOT =
        0x3ff07d6b238084e39fc5d050e304626ccf5b5ccb8f457170664beef2c5e4919a;

    modifier onlyRole(bytes32 accountRole) {
        address accessController = _getAccessController();
        IAccessController(accessController).checkRole(accountRole, msg.sender);
        _;
    }

    // solhint-disable-next-line func-name-mixedcase
    function __AccessRestricted_init(
        address accessController
    ) internal virtual onlyInitializing {
        __AccessRestricted_init_unchained(accessController);
    }

    // solhint-disable-next-line func-name-mixedcase
    function __AccessRestricted_init_unchained(
        address accessController
    ) internal virtual onlyInitializing {
        StorageSlot.getAddressSlot(_ACCESS_CONTROLLER_SLOT).value = address(
            accessController
        );
    }

    function _getAccessController() internal view returns (address) {
        return StorageSlot.getAddressSlot(_ACCESS_CONTROLLER_SLOT).value;
    }
}
