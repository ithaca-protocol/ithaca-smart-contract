// SPDX-License-Identifier: AGPL-3.0
// Forked and minimized from https://github.com/aave/aave-v3-core/blob/master/contracts/interfaces/IAToken.sol
pragma solidity 0.8.20;

/**
 * @title IAToken
 * @author Aave
 * @notice Defines the basic interface for an AToken.
 */
interface IAToken {
    /**
     * @notice Returns the scaled balance of the user.
     * @dev The scaled balance is the sum of all the updated stored balance divided by the reserve's liquidity index
     * at the moment of the update
     * @param user The user whose balance is calculated
     * @return The scaled balance of the user
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Returns last index interest was accrued to the user's balance
     * @param user The address of the user
     * @return The last index interest was accrued to the user's balance, expressed in ray
     */
    function getPreviousIndex(address user) external view returns (uint256);
}
