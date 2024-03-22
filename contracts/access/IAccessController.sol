// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IAccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/IAccessControlEnumerable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

abstract contract IAccessController is IAccessControlEnumerable, IERC165 {
    error AccessControlLastMember();

    function initialize() external virtual;

    function checkRole(bytes32 role, address account) external view virtual;
}
