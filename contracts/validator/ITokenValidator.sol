// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface ITokenValidator {
    error ZeroAddress();
    error ZeroPrecision(address token);
    error PrecisionGtDecimals(address token, uint8 decimals, uint8 precision);

    struct TokenDetails {
        uint8 precision;
        uint8 decimalPrecisionDiff;
    }

    struct AddTokenToWhitelistParams {
        address token;
        uint8 precision;
    }

    /**
     * @notice Emitted when a token is added to whitelist
     * @dev precision < ERC20 decimals
     * @param token - address of whitelisted token
     * @param precision - decimal places used by Ithaca backend
     * @param decimalPrecisionDiff - difference between ERC20 decimals and precision
     */
    event AddedToWhitelist(
        address indexed token,
        uint8 precision,
        uint8 decimalPrecisionDiff
    );

    /**
     * @notice Emitted when a token is removed from whitelist
     * @param token - address of token removed from whitelist
     */
    event RemovedFromWhitelist(address indexed token);

    function isWhitelisted(address token) external view returns (bool);

    function getTokenDetails(
        address token
    ) external view returns (uint8 precision, uint8 decimalPrecisionDiff);

    function addTokensToWhitelist(
        AddTokenToWhitelistParams[] calldata params
    ) external;
}
