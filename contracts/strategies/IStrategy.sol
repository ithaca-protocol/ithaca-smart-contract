// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IStrategy {
    error RatioOutOfRange();
    error OnlyFundlock();

    event FundPulled(address indexed _vault, uint256 _amount);
    event FundReturned(address indexed _vault, uint256 _amount);
    event MaxManagingRatioSet(uint256 _ratio);

    function distributeYield(address account) external;

    function returnFund(uint256 _amount) external;
}
