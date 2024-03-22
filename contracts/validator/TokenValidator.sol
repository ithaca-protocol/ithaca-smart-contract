// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {AccessRestricted} from "../access/AccessRestricted.sol";
import {ITokenValidator} from "./ITokenValidator.sol";
import {ADMIN_ROLE} from "../access/Roles.sol";

/**
 * @title TokenValidator
 * @notice Contract used for whitelisting and validating tokens used in Ithaca Markets
 * @dev only priviledged account with {ADMIN_ROLE} can whitelist tokens
 * Additionally contract stores precision values for tokens.
 */
contract TokenValidator is ITokenValidator, UUPSUpgradeable, AccessRestricted {
    /**
     * @notice Mapping holding whitelisted tokens with their precision
     */
    mapping(address token => TokenDetails precision) private _whitelist;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address accessController) external initializer {
        __AccessRestricted_init(accessController);
    }

    /**
     * @notice Function to check if token is whitelisted
     * @param token address of token to be checked
     * @return boolean indicating whitelist status
     */
    function isWhitelisted(address token) external view returns (bool) {
        if (token != address(0)) {
            if (_whitelist[token].precision != 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Function to get token details
     * @param token address of token to get precision for
     * @return precision of a requested token
     * @return decimalPrecisionDiff difference between ERC20 decimals and backend precision
     */
    function getTokenDetails(
        address token
    ) external view returns (uint8 precision, uint8 decimalPrecisionDiff) {
        TokenDetails memory tokenPrecision = _whitelist[token];
        precision = tokenPrecision.precision;
        decimalPrecisionDiff = tokenPrecision.decimalPrecisionDiff;
    }

    /**
     * @notice Function to add whitelist tokens
     * @dev should be called by priviledged account with {ADMIN_ROLE}
     * @param tokens array of AddTokenToWhitelistParams to be added to {TokenValidator}'s _whitelist
     */
    function addTokensToWhitelist(
        AddTokenToWhitelistParams[] calldata tokens
    ) external onlyRole(ADMIN_ROLE) {
        uint256 tokensLength = tokens.length;

        for (uint256 i; i < tokensLength; ++i) {
            AddTokenToWhitelistParams memory info = tokens[i];
            if (info.token == address(0)) {
                revert ZeroAddress();
            }
            if (info.precision == 0) {
                revert ZeroPrecision(info.token);
            }

            TokenDetails storage tokenDetails = _whitelist[info.token];
            if (tokenDetails.precision == 0) {
                uint8 decimals = IERC20Metadata(info.token).decimals();
                if (decimals < info.precision) {
                    revert PrecisionGtDecimals(
                        info.token,
                        decimals,
                        info.precision
                    );
                }
                uint8 decimalPrecisionDiff = decimals - info.precision;
                tokenDetails.precision = info.precision;
                tokenDetails.decimalPrecisionDiff = decimalPrecisionDiff;

                emit AddedToWhitelist(
                    info.token,
                    info.precision,
                    decimalPrecisionDiff
                );
            }
        }
    }

    /**
     * @notice Function to remove token address from {TokenValidator}'s _whitelist
     * @param token address of token to be removed from whitelist
     */
    function removeTokenFromWhitelist(
        address token
    ) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        if (_whitelist[token].precision == 0) {
            revert ZeroPrecision(token);
        }
        _whitelist[token].precision = 0;
        _whitelist[token].decimalPrecisionDiff = 0;
        emit RemovedFromWhitelist(token);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyRole(ADMIN_ROLE) {} // solhint-disable-line no-empty-blocks
}
