// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IFundlock
 * @notice Fundlock is a smart contract managing client deposits.
 */
interface IFundlock {
    struct Withdrawal {
        uint256 amount;
        uint32 timestamp;
    }

    error ZeroAmount();
    error ZeroAddress();
    error NotWhitelisted(address token);
    error OnlyLedger(address caller);
    error InsufficientFunds(uint256 value, uint256 balance);
    error ReleaseLockActive(uint32 withdrawTimestamp, uint32 currentTimestamp);
    error FundFromWithdrawnFailed(
        address trader,
        address assetAddress,
        uint256 toFundFromStructs
    );
    error WithdrawalNotFound();
    error NoEmptySlot(address withdrawer, address token);
    error ZeroTradeLockInterval();
    error InvalidReleaseLockInterval();
    error OnlyTokenStrategy();

    /**
     * @notice Emitted upon successful deposit
     * @param client - address of depositor
     * @param token - address of token
     * @param amount - deposited amount
     */
    event Deposit(
        address indexed client,
        address indexed token,
        uint256 amount
    );

    /**
     * @notice Emitted when funds are added to withdrawal queue
     * @param client - address of a user withdrawing
     * @param token - address of token
     * @param amount - amount to be withdrawn
     * @param index - withdrawal request(index)
     * @dev Each user is only allowed to make 5 withdrawal requests at once.
     */
    event Withdraw(
        address indexed client,
        address indexed token,
        uint256 amount,
        uint8 index
    );

    /**
     * @notice Event fired upon releasing funds (tokens) from Fundlock to a user's wallet.
     * @param client - address of the user to whom funds are released
     * @param token - address of the token released
     * @param amount - amount of token released
     * @param index - withdrawal request(index) that was released
     */
    event Release(
        address indexed client,
        address indexed token,
        uint256 amount,
        uint8 index
    );

    event RegistryUpdated(address registry);

    /**
     * @notice Event fired upod setting the {ReleaseLock} interval.
     * @param interval - the amount of time in seconds which user has to wait between {withdraw()} and {release()}
     */
    event ReleaseLockSet(uint32 interval);

    /**
     * @notice Event fired upod setting the {TradeLock} interval.
     * @param interval - the amount of time in seconds during which user's funds
     *  can still be used for trading after {withdraw()} request
     */
    event TradeLockSet(uint32 interval);

    event TokenStrategySet(address token, address strategy);

    /**
     * @notice Event fired upon successful client balance update,
     * which signifies the end of the settlement transaction.
     * @param clients - client addresses for which balance has been updated
     * @param tokens - token addresses for which balance has been updated
     * @param amounts - amount by which balance has been updated
     * @param backendId - Java Backend batch ID used for tracking
     */
    event BalancesUpdated(
        address[] clients,
        address[] tokens,
        int256[] amounts,
        uint64 indexed backendId
    );

    /**
     * @notice Event fired when funds are taken from user's withdrawal queue when user
     * balance is not sufficient to settle the trade.
     * @dev funds are taken only within the trade lock period.
     * @param client - address of a user
     * @param token - address of the token
     * @param amount - amount of token taken
     * @param index - withdrawal request(index) from which the funds were taken
     */
    event FundedFromWithdrawal(
        address indexed client,
        address indexed token,
        uint256 amount,
        uint256 index
    );

    event YieldDistributed(address client, address token, uint256 amount);

    function updateBalances(
        address[] calldata clients,
        address[] calldata tokens,
        int256[] calldata amounts,
        uint64 backendId
    ) external;

    function utilizeFund(address token, uint256 amount) external;

    function balanceSheet(
        address client,
        address token
    ) external view returns (uint256);

    function distributeYield(
        address client,
        address token,
        uint256 amount
    ) external;

    function activeWithdrawals() external view returns (uint256);
}
