// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {AccessRestricted} from "../access/AccessRestricted.sol";
import {ITokenValidator} from "../validator/ITokenValidator.sol";
import {IRegistry} from "../registry/IRegistry.sol";
import {ILedger} from "./ILedger.sol";
import {IFundlock} from "../fundlock/IFundlock.sol";
import {UTILITY_ACCOUNT_ROLE} from "../access/Roles.sol";

// @title Ledger contract
// @notice Represents a market for a specific currency pair.
contract Ledger is ILedger, Initializable, AccessRestricted {
    address public underlyingCurrency;
    address public strikeCurrency;
    address public registry;

    int256 internal _underlyingMultiplier;
    int256 internal _strikeMultiplier;

    /**
     * @notice Mapping storing client positions.
     * Each position denotes amount of option contracts each trader has in respective contractId (size).
     * The size can be either negative (Sell) or positive (Buy).
     */
    mapping(uint256 contractId => mapping(address client => int256 positionSize))
        public clientPositions;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address accessController_,
        address underlyingCurrency_,
        address strikeCurrency_
    ) external initializer {
        __AccessRestricted_init_unchained(accessController_);
        underlyingCurrency = underlyingCurrency_;
        strikeCurrency = strikeCurrency_;
        registry = msg.sender;

        address tokenValidator = IRegistry(registry).tokenValidator();
        (, uint8 diffUnderlying) = ITokenValidator(tokenValidator)
            .getTokenDetails(underlyingCurrency);
        (, uint8 diffStrike) = ITokenValidator(tokenValidator).getTokenDetails(
            strikeCurrency
        );

        _underlyingMultiplier = int256(10 ** diffUnderlying);
        _strikeMultiplier = int256(10 ** diffStrike);
    }

    /**
     * @notice Function to update client positions
     * @dev must be called by Ithaca backend with {UTILITY_ACCOUNT_ROLE}
     * @param positions - change in positions
     * @param backendId - ID to keep track of settlement batch
     */
    function updatePositions(
        PositionParam[] calldata positions,
        uint64 backendId
    ) external onlyRole(UTILITY_ACCOUNT_ROLE) {
        if (positions.length == 0) revert EmptyArray();
        _processPositionUpdates(positions);
        emit PositionsUpdated(backendId);
    }

    /**
     * @notice Function to update client funds based on trade settlement
     * @dev amounts are normalised based on difference between ERC20 decimals
     * and precision used by Ithaca backend.
     * @dev signs of the amounts are inverted, negative means client receives tokens,
     * positive means he pays tokens.
     * @param fundMovements - change in client funds
     * @param backendId - ID to keep track of settlement batch
     */
    function updateFundMovements(
        FundMovementParam[] calldata fundMovements,
        uint64 backendId
    ) external onlyRole(UTILITY_ACCOUNT_ROLE) {
        if (fundMovements.length == 0) revert EmptyArray();
        uint256 transferCount = _validateAndCountAmounts(fundMovements);
        _processFundMovement(fundMovements, backendId, transferCount);
        emit FundMovementsUpdated(backendId);
    }

    /**
     * @dev Function that validates that there are no fully zero rows present
     * and counts how many transfers will be needed when reaching FundLock, so we can
     * create correct length transfer arrays for FundLock.
     * @param fundMovements - change in client funds
     * @return transferCount - count of non zero amounts that would make a valid transfer in FundLock
     */
    function _validateAndCountAmounts(
        FundMovementParam[] calldata fundMovements
    ) internal pure returns (uint256 transferCount) {
        uint256 fundMovementsLength = fundMovements.length;
        for (uint256 i; i < fundMovementsLength; ++i) {
            FundMovementParam memory fundMovement = fundMovements[i];
            if (fundMovement.underlyingAmount == 0) {
                if (fundMovement.strikeAmount == 0) {
                    revert EmptyArray();
                }
            }

            if (fundMovement.underlyingAmount != 0) ++transferCount;
            if (fundMovement.strikeAmount != 0) ++transferCount;
        }

        return transferCount;
    }

    function _processPositionUpdates(
        PositionParam[] calldata positions
    ) internal {
        PositionParam memory position;
        uint256 positionsLength = positions.length;
        for (uint256 i; i < positionsLength; ++i) {
            position = positions[i];

            clientPositions[position.contractId][position.client] =
                clientPositions[position.contractId][position.client] +
                position.size;
        }
    }

    function _processFundMovement(
        FundMovementParam[] calldata fundMovements,
        uint64 backendId,
        uint256 transferCount
    ) internal {
        (
            address[] memory clients,
            address[] memory tokens,
            int256[] memory amounts
        ) = _initializeData(fundMovements, transferCount);

        address fundlock = IRegistry(registry).fundLock();
        IFundlock(fundlock).updateBalances(clients, tokens, amounts, backendId);
    }

    /**
     * @notice Function to normalise amounts and create list of clients, amounts,
     * tokens to perform client fund updates
     * @param fundMovements - change in client funds
     * @param transferCount - the number of transfers required
     * @return clients - list of clients
     * @return tokens - list of tokens
     * @return amounts - list of signed amounts
     */
    function _initializeData(
        FundMovementParam[] calldata fundMovements,
        uint256 transferCount
    )
        internal
        view
        returns (
            address[] memory clients,
            address[] memory tokens,
            int256[] memory amounts
        )
    {
        clients = new address[](transferCount);
        tokens = new address[](transferCount);
        amounts = new int256[](transferCount);

        uint256 i;
        uint256 ctr;
        uint256 fundMovementsLength = fundMovements.length;
        int256 strikeMultiplier = _strikeMultiplier;
        int256 underlyingMultiplier = _underlyingMultiplier;
        // get the negative values
        for (ctr; ctr < fundMovementsLength; ++ctr) {
            FundMovementParam memory fundMovement = fundMovements[ctr];
            if (fundMovement.strikeAmount != 0) {
                clients[i] = fundMovement.client;
                tokens[i] = strikeCurrency;
                amounts[i] = -fundMovement.strikeAmount * strikeMultiplier;
                ++i;
            }

            if (fundMovement.underlyingAmount != 0) {
                clients[i] = fundMovement.client;
                tokens[i] = underlyingCurrency;
                amounts[i] =
                    -fundMovement.underlyingAmount *
                    underlyingMultiplier;
                ++i;
            }
        }
    }
}
