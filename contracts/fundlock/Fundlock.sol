// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AccessRestricted} from "../access/AccessRestricted.sol";
import {ITokenValidator} from "../validator/ITokenValidator.sol";
import {IRegistry} from "../registry/IRegistry.sol";
import {IStrategy} from "../strategies/IStrategy.sol";
import {IFundlock} from "./IFundlock.sol";
import {ADMIN_ROLE} from "../access/Roles.sol";

/**
 * @title Fundlock
 * @notice Fundlock is a smart contract managing client deposits.
 */
contract Fundlock is UUPSUpgradeable, AccessRestricted, IFundlock {
    using SafeERC20 for IERC20;

    uint8 public constant ALLOWED_WITHDRAWAL_LIMIT = 5;

    address public registry;
    uint32 public releaseLock;
    uint32 public tradeLock;
    uint256 public activeWithdrawals;

    mapping(address client => mapping(address token => uint256 balance))
        internal _balances;
    mapping(address client => mapping(address token => uint8 slot))
        internal _withdrawalSlots;
    mapping(address client => mapping(address token => Withdrawal[ALLOWED_WITHDRAWAL_LIMIT]))
        internal _withdrawals;
    mapping(address token => address strategy) public tokenStrategies;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address accessController_,
        uint32 tradeLock_,
        uint32 releaseLock_
    ) external initializer {
        __AccessRestricted_init(accessController_);
        _setTradeLockInterval(tradeLock_);
        _setReleaseLockInterval(releaseLock_);
    }

    /**
     * @notice Function to deposit tokens, to be used in Ithaca
     * @param client - address of depositor
     * @param token - address of token
     * @param amount - amount to deposit
     */
    function deposit(address client, address token, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        address tokenValidator = IRegistry(registry).tokenValidator();
        if (!ITokenValidator(tokenValidator).isWhitelisted(token)) {
            revert NotWhitelisted(token);
        }
        address tokenStrategy = tokenStrategies[token];
        if (tokenStrategy != address(0)) {
            IStrategy(tokenStrategy).distributeYield(client);
        }
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _balances[client][token] = _balances[client][token] + amount;
        emit Deposit(client, token, amount);
    }

    /**
     * @notice Function to add funds to withdrawal queue
     * @dev Withdrawal in queue can be utilised for trades if balance in fundlock
     * is insufficient and trade lock is active,
     * @param token - address of token
     * @param amount - amount to withdraw
     */
    function withdraw(address token, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        address tokenValidator = IRegistry(registry).tokenValidator();
        if (!ITokenValidator(tokenValidator).isWhitelisted(token)) {
            revert NotWhitelisted(token);
        }

        address tokenStrategy = tokenStrategies[token];
        if (tokenStrategy != address(0)) {
            IStrategy(tokenStrategy).distributeYield(msg.sender);
        }

        uint256 balance = _balances[msg.sender][token];
        if (amount > balance) {
            revert InsufficientFunds(amount, balance);
        }

        _balances[msg.sender][token] = balance - amount;
        uint8 slot = _findEmptySlot(msg.sender, token);
        _fillSlot(msg.sender, token, slot);
        _withdrawals[msg.sender][token][slot] = Withdrawal({
            amount: amount,
            timestamp: uint32(block.timestamp)
        });
        activeWithdrawals += amount;

        emit Withdraw(msg.sender, token, amount, slot);
    }

    /**
     * @notice Function to release funds after withdrawal request
     * @dev release lock should not be active
     * @param token - address of the token to be released
     * @param index - index in the withdrawal queue
     */
    function release(address token, uint8 index) external {
        Withdrawal memory withdrawal = _withdrawals[msg.sender][token][index];
        if (withdrawal.timestamp == 0) revert WithdrawalNotFound();

        if (uint32(block.timestamp) <= withdrawal.timestamp + releaseLock) {
            revert ReleaseLockActive(
                withdrawal.timestamp,
                uint32(block.timestamp)
            );
        }

        address tokenStrategy = tokenStrategies[token];
        if (tokenStrategy != address(0)) {
            IStrategy(tokenStrategy).distributeYield(msg.sender);
        }

        _withdrawals[msg.sender][token][index] = Withdrawal({
            amount: 0,
            timestamp: 0
        });
        activeWithdrawals -= withdrawal.amount;
        _emptySlot(msg.sender, token, index);
        uint256 availableBalance = IERC20(token).balanceOf(address(this));
        if (availableBalance < withdrawal.amount) {
            uint256 shortage = withdrawal.amount - availableBalance;
            IStrategy(tokenStrategy).returnFund(shortage);
        }
        IERC20(token).safeTransfer(msg.sender, withdrawal.amount);
        emit Release(msg.sender, token, withdrawal.amount, index);
    }

    /**
     * @notice Function to update clients balances
     * @dev can only be called by ledger contracts
     * @param clients - array of all client accounts of the settlement batch
     * @param tokens - array of token addresses for each update row
     * @param amounts - array of amounts of funds to update client balances with
     * @param backendId - identificator created by Ithaca Backend to track settlement progress
     */
    function updateBalances(
        address[] calldata clients,
        address[] calldata tokens,
        int256[] calldata amounts,
        uint64 backendId
    ) external {
        if (!IRegistry(registry).isValidLedger(msg.sender)) {
            revert OnlyLedger(msg.sender);
        }
        uint256 clientLength = clients.length;
        for (uint256 i; i < clientLength; ++i) {
            _updateBalance(clients[i], tokens[i], amounts[i]);
        }
        emit BalancesUpdated(clients, tokens, amounts, backendId);
    }

    /**
     * @notice Returns the amount of tokens owned by `client`.
     */
    function balanceSheet(
        address client,
        address token
    ) external view returns (uint256) {
        return _balances[client][token];
    }

    /**
     * @notice Getter used to pull data about client's withdraw requests.
     * @param client - address of the client who sent withdrawal request(s)
     * @param token - address of the token withdrawn
     * @param index - index of the particular withdrawal request (max of 5)
     * @return value - the amount of funds marked for withdrawal
     * @return timestamp - timestamp of the exact time withdrawal request was submitted
     */
    function fundsToWithdraw(
        address client,
        address token,
        uint8 index
    ) external view returns (uint256 value, uint32 timestamp) {
        Withdrawal memory withdrawal = _withdrawals[client][token][index];
        value = withdrawal.amount;
        timestamp = withdrawal.timestamp;
    }

    /**
     * @notice Returns the total amount of token flagged for withdrawal for a particular user
     *  that still has active {tradeLock}. This is the SUM of all withdraw requests for a particular token and user.
     * @param client - address of the user to get balance for
     * @param token - address of the token to get balance for
     * @return total amount of client's funds marked for withdrawal
     */
    function fundsToWithdrawTotal(
        address client,
        address token
    ) external view returns (uint256) {
        uint256 withdrawnSum;
        for (uint256 k; k < ALLOWED_WITHDRAWAL_LIMIT; ++k) {
            Withdrawal memory withdrawal = _withdrawals[client][token][k];
            if (withdrawal.timestamp + tradeLock > block.timestamp) {
                withdrawnSum += withdrawal.amount;
            }
        }

        return withdrawnSum;
    }

    function utilizeFund(address token, uint256 amount) external {
        if (tokenStrategies[token] != msg.sender) {
            revert OnlyTokenStrategy();
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function distributeYield(
        address client,
        address token,
        uint256 amount
    ) external {
        if (tokenStrategies[token] != msg.sender) {
            revert OnlyTokenStrategy();
        }
        _balances[client][token] = _balances[client][token] + amount;
        emit YieldDistributed(client, token, amount);
    }

    function setRegistry(address registry_) external onlyRole(ADMIN_ROLE) {
        _setRegistry(registry_);
    }

    function setTradeLockInterval(
        uint32 interval
    ) external onlyRole(ADMIN_ROLE) {
        _setTradeLockInterval(interval);
    }

    function setReleaseLockInterval(
        uint32 interval
    ) external onlyRole(ADMIN_ROLE) {
        _setReleaseLockInterval(interval);
    }

    function setTokenStrategy(
        address token,
        address strategy
    ) external onlyRole(ADMIN_ROLE) {
        address tokenValidator = IRegistry(registry).tokenValidator();
        if (!ITokenValidator(tokenValidator).isWhitelisted(token)) {
            revert NotWhitelisted(token);
        }
        address tokenStrategy = tokenStrategies[token];
        if (tokenStrategy != address(0)) {
            IStrategy(tokenStrategy).returnFund(type(uint256).max);
        }
        tokenStrategies[token] = strategy;
        emit TokenStrategySet(token, strategy);
    }

    function _findEmptySlot(
        address withdrawer,
        address token
    ) internal view returns (uint8) {
        uint8 bitmap = _withdrawalSlots[withdrawer][token];
        for (uint8 i; i < ALLOWED_WITHDRAWAL_LIMIT; ++i) {
            if ((bitmap & (1 << i)) == 0) {
                return i;
            }
        }
        revert NoEmptySlot(withdrawer, token);
    }

    function _fillSlot(address user, address token, uint8 slot) internal {
        _withdrawalSlots[user][token] |= uint8(1 << slot);
    }

    function _emptySlot(address user, address token, uint8 slot) internal {
        _withdrawalSlots[user][token] &= ~uint8(1 << slot);
    }

    function _fundFromWithdrawal(
        address client,
        address token,
        uint256 amount
    ) internal returns (bool funded) {
        uint256 fundedSum;
        for (uint8 index; index < ALLOWED_WITHDRAWAL_LIMIT; ++index) {
            Withdrawal memory withdrawal = _withdrawals[client][token][index];
            if (withdrawal.timestamp + tradeLock > block.timestamp) {
                uint256 leftToFund = amount - fundedSum;
                uint256 availableAmount = withdrawal.amount;
                if (availableAmount <= leftToFund) {
                    fundedSum = fundedSum + availableAmount;
                    _withdrawals[client][token][index] = Withdrawal({
                        amount: 0,
                        timestamp: 0
                    });
                    activeWithdrawals -= availableAmount;
                    _emptySlot(client, token, index);
                    emit FundedFromWithdrawal(
                        client,
                        token,
                        availableAmount,
                        index
                    );
                } else {
                    fundedSum = fundedSum + leftToFund;
                    _withdrawals[client][token][index].amount =
                        availableAmount -
                        leftToFund;
                    activeWithdrawals -= leftToFund;
                    emit FundedFromWithdrawal(client, token, leftToFund, index);
                }
            }

            if (fundedSum == amount) {
                funded = true;
                break;
            }
        }
    }

    function _updateBalance(
        address client,
        address token,
        int256 amount
    ) internal {
        int256 changeInBalance;

        uint256 clientBalance = _balances[client][token];
        if (amount > 0 || clientBalance >= uint256(-amount)) {
            changeInBalance = amount;
        } else {
            uint256 amountToDeduct = uint256(-amount);
            changeInBalance = -int256(clientBalance);
            uint256 shortage = amountToDeduct - clientBalance;
            if (!_fundFromWithdrawal(client, token, shortage)) {
                revert FundFromWithdrawnFailed(client, token, shortage);
            }
        }

        _balances[client][token] = uint256(
            int256(clientBalance) + changeInBalance
        );
    }

    function _setRegistry(address registry_) internal {
        if (registry_ == address(0)) {
            revert ZeroAddress();
        }
        registry = registry_;
        emit RegistryUpdated(registry_);
    }

    function _setTradeLockInterval(uint32 interval) internal {
        if (interval == 0) {
            revert ZeroTradeLockInterval();
        }
        tradeLock = interval;
        emit TradeLockSet(interval);
    }

    function _setReleaseLockInterval(uint32 interval) internal {
        if (interval > 1 weeks) {
            revert InvalidReleaseLockInterval();
        }
        releaseLock = interval;
        emit ReleaseLockSet(interval);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(ADMIN_ROLE) {} // solhint-disable-line no-empty-blocks
}
