// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

/**
 * @title Registry interface
 * @notice Registry keeps track of all contracts in the protocol
 */
interface IRegistry {
    error ZeroAddress();
    error InvalidMarket();
    error LedgerAlreadyDeployed(
        address undelying,
        address strike,
        address ledger
    );

    event LedgerDeployed(address ledger);
    event TokenValidatorUpdated(address tokenValidator);
    event LedgerBeaconUpdated(address ledgerBeacon);
    event FundLockUpdated(address fundLock);

    function isValidLedger(address _contract) external view returns (bool);

    function tokenValidator() external view returns (address);

    function fundLock() external view returns (address);
}
