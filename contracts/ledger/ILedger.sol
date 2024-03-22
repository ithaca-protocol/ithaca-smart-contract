// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// @title ILedger interface
// @notice Interface for Ledger contract.
interface ILedger {
    error EmptyArray();

    /**
     * @notice Emitted after successful settlement of positions, emitted once per settlement batch.
     * @param backendId - special identificator created by Java Backend to track settlement progress
     */
    event PositionsUpdated(uint64 indexed backendId);

    /**
     * @notice Emitted after successful settlement of fund movements, emitted once per settlement batch.
     * @param backendId - special identificator created by Java Backend to track settlement progress
     */
    event FundMovementsUpdated(uint64 indexed backendId);

    struct PositionParam {
        uint256 contractId;
        address client;
        int256 size;
    }

    struct FundMovementParam {
        address client;
        int256 underlyingAmount;
        int256 strikeAmount;
    }
}
