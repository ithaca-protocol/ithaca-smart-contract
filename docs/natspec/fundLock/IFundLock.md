# IFundlock



> IFundlock

Fundlock is a smart contract managing client deposits.



## Methods

### activeWithdrawals

```solidity
function activeWithdrawals() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### balanceSheet

```solidity
function balanceSheet(address client, address token) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | undefined |
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### distributeYield

```solidity
function distributeYield(address client, address token, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | undefined |
| token | address | undefined |
| amount | uint256 | undefined |

### updateBalances

```solidity
function updateBalances(address[] clients, address[] tokens, int256[] amounts, uint64 backendId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| clients | address[] | undefined |
| tokens | address[] | undefined |
| amounts | int256[] | undefined |
| backendId | uint64 | undefined |

### utilizeFund

```solidity
function utilizeFund(address token, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| amount | uint256 | undefined |



## Events

### BalancesUpdated

```solidity
event BalancesUpdated(address[] clients, address[] tokens, int256[] amounts, uint64 indexed backendId)
```

Event fired upon successful client balance update, which signifies the end of the settlement transaction.



#### Parameters

| Name | Type | Description |
|---|---|---|
| clients  | address[] | - client addresses for which balance has been updated |
| tokens  | address[] | - token addresses for which balance has been updated |
| amounts  | int256[] | - amount by which balance has been updated |
| backendId `indexed` | uint64 | - Java Backend batch ID used for tracking |

### Deposit

```solidity
event Deposit(address indexed client, address indexed token, uint256 amount)
```

Emitted upon successful deposit



#### Parameters

| Name | Type | Description |
|---|---|---|
| client `indexed` | address | - address of depositor |
| token `indexed` | address | - address of token |
| amount  | uint256 | - deposited amount |

### FundedFromWithdrawal

```solidity
event FundedFromWithdrawal(address indexed client, address indexed token, uint256 amount, uint256 index)
```

Event fired when funds are taken from user&#39;s withdrawal queue when user balance is not sufficient to settle the trade.

*funds are taken only within the trade lock period.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| client `indexed` | address | - address of a user |
| token `indexed` | address | - address of the token |
| amount  | uint256 | - amount of token taken |
| index  | uint256 | - withdrawal request(index) from which the funds were taken |

### RegistryUpdated

```solidity
event RegistryUpdated(address registry)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| registry  | address | undefined |

### Release

```solidity
event Release(address indexed client, address indexed token, uint256 amount, uint8 index)
```

Event fired upon releasing funds (tokens) from Fundlock to a user&#39;s wallet.



#### Parameters

| Name | Type | Description |
|---|---|---|
| client `indexed` | address | - address of the user to whom funds are released |
| token `indexed` | address | - address of the token released |
| amount  | uint256 | - amount of token released |
| index  | uint8 | - withdrawal request(index) that was released |

### ReleaseLockSet

```solidity
event ReleaseLockSet(uint32 interval)
```

Event fired upod setting the {ReleaseLock} interval.



#### Parameters

| Name | Type | Description |
|---|---|---|
| interval  | uint32 | - the amount of time in seconds which user has to wait between {withdraw()} and {release()} |

### TokenStrategySet

```solidity
event TokenStrategySet(address token, address strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token  | address | undefined |
| strategy  | address | undefined |

### TradeLockSet

```solidity
event TradeLockSet(uint32 interval)
```

Event fired upod setting the {TradeLock} interval.



#### Parameters

| Name | Type | Description |
|---|---|---|
| interval  | uint32 | - the amount of time in seconds during which user&#39;s funds  can still be used for trading after {withdraw()} request |

### Withdraw

```solidity
event Withdraw(address indexed client, address indexed token, uint256 amount, uint8 index)
```

Emitted when funds are added to withdrawal queue

*Each user is only allowed to make 5 withdrawal requests at once.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| client `indexed` | address | - address of a user withdrawing |
| token `indexed` | address | - address of token |
| amount  | uint256 | - amount to be withdrawn |
| index  | uint8 | - withdrawal request(index) |

### YieldDistributed

```solidity
event YieldDistributed(address client, address token, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| client  | address | undefined |
| token  | address | undefined |
| amount  | uint256 | undefined |



## Errors

### FundFromWithdrawnFailed

```solidity
error FundFromWithdrawnFailed(address trader, address assetAddress, uint256 toFundFromStructs)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| trader | address | undefined |
| assetAddress | address | undefined |
| toFundFromStructs | uint256 | undefined |

### InsufficientFunds

```solidity
error InsufficientFunds(uint256 value, uint256 balance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| value | uint256 | undefined |
| balance | uint256 | undefined |

### InvalidReleaseLockInterval

```solidity
error InvalidReleaseLockInterval()
```






### NoEmptySlot

```solidity
error NoEmptySlot(address withdrawer, address token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| withdrawer | address | undefined |
| token | address | undefined |

### NotWhitelisted

```solidity
error NotWhitelisted(address token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

### OnlyLedger

```solidity
error OnlyLedger(address caller)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller | address | undefined |

### OnlyTokenStrategy

```solidity
error OnlyTokenStrategy()
```






### ReleaseLockActive

```solidity
error ReleaseLockActive(uint32 withdrawTimestamp, uint32 currentTimestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| withdrawTimestamp | uint32 | undefined |
| currentTimestamp | uint32 | undefined |

### WithdrawalNotFound

```solidity
error WithdrawalNotFound()
```






### ZeroAddress

```solidity
error ZeroAddress()
```






### ZeroAmount

```solidity
error ZeroAmount()
```






### ZeroTradeLockInterval

```solidity
error ZeroTradeLockInterval()
```







