// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IERC20, IFundlock, Strategy, SafeERC20} from "./Strategy.sol";
import {IAaveV3Pool} from "./interfaces/IAaveV3Pool.sol";
import {IAToken} from "./interfaces/IAToken.sol";

contract AaveV3Strategy is Strategy {
    using SafeERC20 for IERC20;

    address public aavePool;
    uint256 private _lastAccruedYield;
    uint256 private _lastGeneratedYield;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address accessController_,
        address fundlock_,
        address supplyingAsset_,
        address yieldBearingAsset_,
        uint256 depositThreshold_,
        address aavePool_
    ) external initializer {
        __Strategy_init_unchained(
            accessController_,
            fundlock_,
            supplyingAsset_,
            yieldBearingAsset_,
            depositThreshold_
        );
        aavePool = aavePool_;
    }

    function distributeYield(address account) external override {
        uint256 totalYield = _lastAccruedYield + _accruedYieldLatest();
        uint256 yieldGenerated = totalYield - _lastGeneratedYield;
        uint256 totalValueAll_ = totalValueAll();
        if (totalValueAll_ != 0) {
            _yieldIndex +=
                (yieldGenerated * MULTIPLIER) /
                (totalValueAll_ - totalYield);
            _lastGeneratedYield += yieldGenerated;
            uint256 shares = IFundlock(fundlock).balanceSheet(
                account,
                supplyingAsset
            );
            uint256 userYield_ = (shares *
                (_yieldIndex - _yieldIndexOf[account])) / MULTIPLIER;
            _yieldIndexOf[account] = _yieldIndex;
            if (userYield_ > 0) {
                IFundlock(fundlock).distributeYield(
                    account,
                    supplyingAsset,
                    userYield_
                );
            }
        }
    }

    function userYield(
        address account
    ) external view override returns (uint256) {
        uint256 totalYield = _lastAccruedYield + _accruedYieldLatest();
        uint256 yieldGenerated = totalYield - _lastGeneratedYield;
        uint256 totalValueAll_ = totalValueAll();
        if (totalValueAll_ == 0) return 0;
        uint256 yieldIndex = _yieldIndex +
            (yieldGenerated * MULTIPLIER) /
            (totalValueAll_ - totalYield);
        uint256 shares = IFundlock(fundlock).balanceSheet(
            account,
            supplyingAsset
        );
        uint256 userYield_ = (shares * (yieldIndex - _yieldIndexOf[account])) /
            MULTIPLIER;
        return userYield_;
    }

    function _accruedYieldLatest() internal view returns (uint256) {
        uint256 initialSuppliedAmount = IAToken(yieldBearingAsset)
            .scaledBalanceOf(address(this)) *
            IAToken(yieldBearingAsset).getPreviousIndex(address(this));
        return
            IERC20(yieldBearingAsset).balanceOf(address(this)) -
            (initialSuppliedAmount / 1e27);
    }

    function _utilize(uint256 _amount) internal override {
        _lastAccruedYield += _accruedYieldLatest();
        _lastGeneratedYield = 0;
        IERC20(supplyingAsset).forceApprove(aavePool, _amount);
        IAaveV3Pool(aavePool).supply(supplyingAsset, _amount, address(this), 0);
    }

    function _unutilize(uint256 _amount) internal override returns (uint256) {
        _lastAccruedYield += _accruedYieldLatest();
        _lastGeneratedYield = 0;
        uint256 amountReceived = IAaveV3Pool(aavePool).withdraw(
            supplyingAsset,
            _amount,
            address(this)
        );
        if (managingFund() == 0) _lastAccruedYield = 0;
        return amountReceived;
    }
}
