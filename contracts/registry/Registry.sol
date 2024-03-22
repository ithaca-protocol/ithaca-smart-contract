// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IRegistry} from "./IRegistry.sol";
import {AccessRestricted} from "../access/AccessRestricted.sol";
import {ITokenValidator} from "../validator/ITokenValidator.sol";
import {LedgerBeaconProxy} from "../ledger/proxy/LedgerBeaconProxy.sol";
import {ADMIN_ROLE} from "../access/Roles.sol";

/**
 * @title Registry
 * @notice Keeps track of all contracts in the protocol
 * @dev Contract is used to deploy new Ithaca markets
 */
contract Registry is IRegistry, UUPSUpgradeable, AccessRestricted {
    address public ledgerBeacon;
    address public tokenValidator;
    address public fundLock;

    address[] private _ledgerAddresses;

    mapping(address underlying => mapping(address strike => address ledger))
        private _ledgers;
    mapping(address ledger => bool isValid) private _deployedLedgers;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address accessController_,
        address ledgerBeacon_,
        address tokenValidator_,
        address fundLock_
    ) external initializer {
        __AccessRestricted_init(accessController_);
        _setLedgerBeacon(ledgerBeacon_);
        _setTokenValidator(tokenValidator_);
        _setFundLock(fundLock_);
    }

    /**
     * @dev Function to check if given ledger exists in registry
     * @param ledger address of contract to validate
     */
    function isValidLedger(address ledger) external view returns (bool) {
        return _deployedLedgers[ledger];
    }

    /**
     * @notice Deploys a new Ithaca market
     * @dev should be called by priviledged account with {ADMIN_ROLE}
     * @param underlying address of underlying token
     * @param strike address of strike token
     * @param precisionUnderlying undelying token precision used by Ithaca backend
     * @param precisionStrike strike precision used by Ithaca backend
     */
    function deployLedger(
        address underlying,
        address strike,
        uint8 precisionUnderlying,
        uint8 precisionStrike
    ) external onlyRole(ADMIN_ROLE) {
        if (underlying == strike) {
            revert InvalidMarket();
        }
        address ledger = _ledgers[underlying][strike];
        if (ledger != address(0)) {
            revert LedgerAlreadyDeployed(underlying, strike, ledger);
        }

        ITokenValidator.AddTokenToWhitelistParams[]
            memory params = new ITokenValidator.AddTokenToWhitelistParams[](2);
        params[0] = ITokenValidator.AddTokenToWhitelistParams({
            token: underlying,
            precision: precisionUnderlying
        });
        params[1] = ITokenValidator.AddTokenToWhitelistParams({
            token: strike,
            precision: precisionStrike
        });

        ITokenValidator(tokenValidator).addTokensToWhitelist(params);

        LedgerBeaconProxy beaconProxy = new LedgerBeaconProxy(
            ledgerBeacon,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                _getAccessController(),
                underlying,
                strike
            )
        );

        address deployedLedger = address(beaconProxy);
        _ledgers[underlying][strike] = deployedLedger;
        _deployedLedgers[deployedLedger] = true;
        _ledgerAddresses.push(deployedLedger);

        emit LedgerDeployed(deployedLedger);
    }

    function deployedLedgers() external view returns (address[] memory) {
        return _ledgerAddresses;
    }

    /**
     * @notice Setter for {LedgerBeacon} address
     * @dev should be called by priviledged account with {ADMIN_ROLE}
     * @param ledgerBeacon_ address of {LedgerBeacon} contract
     */
    function setLedgerBeacon(
        address ledgerBeacon_
    ) external onlyRole(ADMIN_ROLE) {
        _setLedgerBeacon(ledgerBeacon_);
    }

    /**
     * @notice Setter for {TokenValidator} address
     * @dev should be called by priviledged account with {ADMIN_ROLE}
     * @param tokenValidator_ address of {TokenValidator} contract
     */
    function setTokenValidator(
        address tokenValidator_
    ) external onlyRole(ADMIN_ROLE) {
        _setTokenValidator(tokenValidator_);
    }

    /**
     * @notice Setter for {FundLock} address
     * @dev should be called by priviledged account with {ADMIN_ROLE}
     * @param fundLock_ address of {FundLock} contract
     */
    function setFundLock(address fundLock_) external onlyRole(ADMIN_ROLE) {
        _setFundLock(fundLock_);
    }

    function _setLedgerBeacon(address ledgerBeacon_) internal {
        if (ledgerBeacon_ == address(0)) {
            revert ZeroAddress();
        }
        ledgerBeacon = ledgerBeacon_;
        emit LedgerBeaconUpdated(ledgerBeacon_);
    }

    function _setTokenValidator(address tokenValidator_) internal {
        if (tokenValidator_ == address(0)) {
            revert ZeroAddress();
        }
        tokenValidator = tokenValidator_;
        emit TokenValidatorUpdated(tokenValidator_);
    }

    function _setFundLock(address fundLock_) internal {
        if (fundLock_ == address(0)) {
            revert ZeroAddress();
        }
        fundLock = fundLock_;
        emit FundLockUpdated(fundLock_);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(ADMIN_ROLE) {} // solhint-disable-line no-empty-blocks
}
