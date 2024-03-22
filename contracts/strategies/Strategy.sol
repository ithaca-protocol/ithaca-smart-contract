// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategy} from "./IStrategy.sol";
import {AccessRestricted} from "../access/AccessRestricted.sol";
import {IFundlock} from "../fundlock/IFundlock.sol";
import {ADMIN_ROLE, UTILITY_ACCOUNT_ROLE} from "../access/Roles.sol";

abstract contract Strategy is IStrategy, UUPSUpgradeable, AccessRestricted {
    using SafeERC20 for IERC20;

    address public fundlock;
    address public supplyingAsset;
    address public yieldBearingAsset;
    uint256 public depositThreshold;
    uint256 public maxManagingRatio;

    uint256 public constant MULTIPLIER = 1e18;

    uint256 internal _yieldIndex;
    mapping(address => uint256) internal _yieldIndexOf;

    // solhint-disable-next-line func-name-mixedcase
    function __Strategy_init(
        address accessController_,
        address fundlock_,
        address supplyingAsset_,
        address yieldBearingAsset_,
        uint256 depositThreshold_
    ) internal virtual onlyInitializing {
        __Strategy_init_unchained(
            accessController_,
            fundlock_,
            supplyingAsset_,
            yieldBearingAsset_,
            depositThreshold_
        );
    }

    // solhint-disable-next-line func-name-mixedcase
    function __Strategy_init_unchained(
        address accessController_,
        address fundlock_,
        address supplyingAsset_,
        address yieldBearingAsset_,
        uint256 depositThreshold_
    ) internal virtual onlyInitializing {
        __AccessRestricted_init_unchained(accessController_);
        fundlock = fundlock_;
        supplyingAsset = supplyingAsset_;
        yieldBearingAsset = yieldBearingAsset_;
        depositThreshold = depositThreshold_;

        maxManagingRatio = MULTIPLIER;
    }

    function managingFund() public view returns (uint256) {
        return IERC20(yieldBearingAsset).balanceOf(address(this));
    }

    function currentManagingRatio() external view returns (uint256) {
        return (managingFund() * MULTIPLIER) / totalValueAll();
    }

    function availableFund() public view returns (uint256) {
        return IERC20(supplyingAsset).balanceOf(fundlock);
    }

    function totalValueAll() public view returns (uint256) {
        return
            availableFund() +
            managingFund() -
            IFundlock(fundlock).activeWithdrawals();
    }

    function adjustFund() external onlyRole(UTILITY_ACCOUNT_ROLE) {
        uint256 expectUtilizeAmount = (totalValueAll() * maxManagingRatio) /
            MULTIPLIER;
        uint256 managingFund_ = managingFund();
        if (expectUtilizeAmount > managingFund_) {
            uint256 _shortage = expectUtilizeAmount - managingFund_;
            IFundlock(fundlock).utilizeFund(supplyingAsset, _shortage);
            _utilize(_shortage);
            emit FundPulled(fundlock, _shortage);
        } else {
            uint256 _excess = managingFund_ - expectUtilizeAmount;
            if (_excess != 0) {
                uint256 amountRecieved = _unutilize(_excess);
                IERC20(supplyingAsset).safeTransfer(fundlock, amountRecieved);
                emit FundReturned(fundlock, amountRecieved);
            }
        }
    }

    function returnFund(uint256 _amount) external {
        if (msg.sender != fundlock) revert OnlyFundlock();
        uint256 amountRecieved = _unutilize(_amount);
        IERC20(supplyingAsset).safeTransfer(fundlock, amountRecieved);
        emit FundReturned(fundlock, amountRecieved);
    }

    function distributeYield(address account) external virtual;

    function userYield(address account) external view virtual returns (uint256);

    function setMaxManagingRatio(uint256 _ratio) external onlyRole(ADMIN_ROLE) {
        if (_ratio > MULTIPLIER) revert RatioOutOfRange();
        maxManagingRatio = _ratio;
        emit MaxManagingRatioSet(_ratio);
    }

    function _utilize(uint256 _amount) internal virtual;

    function _unutilize(uint256 _amount) internal virtual returns (uint256);

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyRole(ADMIN_ROLE) {} //solhint-disable-line no-empty-blocks
}
