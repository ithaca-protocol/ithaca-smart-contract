# Fundlock



> Fundlock

Fundlock is a smart contract managing client deposits.



## Methods

### ALLOWED_WITHDRAWAL_LIMIT

```solidity
function ALLOWED_WITHDRAWAL_LIMIT() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

### UPGRADE_INTERFACE_VERSION

```solidity
function UPGRADE_INTERFACE_VERSION() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

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

Returns the amount of tokens owned by `client`.



#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | undefined |
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### deposit

```solidity
function deposit(address client, address token, uint256 amount) external nonpayable
```

Function to deposit tokens, to be used in Ithaca



#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | - address of depositor |
| token | address | - address of token |
| amount | uint256 | - amount to deposit |

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

### fundsToWithdraw

```solidity
function fundsToWithdraw(address client, address token, uint8 index) external view returns (uint256 value, uint32 timestamp)
```

Getter used to pull data about client&#39;s withdraw requests.



#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | - address of the client who sent withdrawal request(s) |
| token | address | - address of the token withdrawn |
| index | uint8 | - index of the particular withdrawal request (max of 5) |

#### Returns

| Name | Type | Description |
|---|---|---|
| value | uint256 | - the amount of funds marked for withdrawal |
| timestamp | uint32 | - timestamp of the exact time withdrawal request was submitted |

### fundsToWithdrawTotal

```solidity
function fundsToWithdrawTotal(address client, address token) external view returns (uint256)
```

Returns the total amount of token flagged for withdrawal for a particular user  that still has active {tradeLock}. This is the SUM of all withdraw requests for a particular token and user.



#### Parameters

| Name | Type | Description |
|---|---|---|
| client | address | - address of the user to get balance for |
| token | address | - address of the token to get balance for |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | total amount of client&#39;s funds marked for withdrawal |

### initialize

```solidity
function initialize(address accessController_, uint32 tradeLock_, uint32 releaseLock_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accessController_ | address | undefined |
| tradeLock_ | uint32 | undefined |
| releaseLock_ | uint32 | undefined |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```



*Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### registry

```solidity
function registry() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### release

```solidity
function release(address token, uint8 index) external nonpayable
```

Function to release funds after withdrawal request

*release lock should not be active*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | - address of the token to be released |
| index | uint8 | - index in the withdrawal queue |

### releaseLock

```solidity
function releaseLock() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### setRegistry

```solidity
function setRegistry(address registry_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| registry_ | address | undefined |

### setReleaseLockInterval

```solidity
function setReleaseLockInterval(uint32 interval) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| interval | uint32 | undefined |

### setTokenStrategy

```solidity
function setTokenStrategy(address token, address strategy) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| strategy | address | undefined |

### setTradeLockInterval

```solidity
function setTradeLockInterval(uint32 interval) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| interval | uint32 | undefined |

### tokenStrategies

```solidity
function tokenStrategies(address token) external view returns (address strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| strategy | address | undefined |

### tradeLock

```solidity
function tradeLock() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined |

### updateBalances

```solidity
function updateBalances(address[] clients, address[] tokens, int256[] amounts, uint64 backendId) external nonpayable
```

Function to update clients balances

*can only be called by ledger contracts*

#### Parameters

| Name | Type | Description |
|---|---|---|
| clients | address[] | - array of all client accounts of the settlement batch |
| tokens | address[] | - array of token addresses for each update row |
| amounts | int256[] | - array of amounts of funds to update client balances with |
| backendId | uint64 | - identificator created by Ithaca Backend to track settlement progress |

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```



*Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |
| data | bytes | undefined |

### utilizeFund

```solidity
function utilizeFund(address token, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| amount | uint256 | undefined |

### withdraw

```solidity
function withdraw(address token, uint256 amount) external nonpayable
```

Function to add funds to withdrawal queue

*Withdrawal in queue can be utilised for trades if balance in fundlock is insufficient and trade lock is active,*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | - address of token |
| amount | uint256 | - amount to withdraw |



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

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

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

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```



*Emitted when the implementation is upgraded.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |

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

### AddressEmptyCode

```solidity
error AddressEmptyCode(address target)
```



*There&#39;s no code at `target` (it is not a contract).*

#### Parameters

| Name | Type | Description |
|---|---|---|
| target | address | undefined |

### AddressInsufficientBalance

```solidity
error AddressInsufficientBalance(address account)
```



*The ETH balance of the account is not enough to perform the operation.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### ERC1967InvalidImplementation

```solidity
error ERC1967InvalidImplementation(address implementation)
```



*The `implementation` of the proxy is invalid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation | address | undefined |

### ERC1967NonPayable

```solidity
error ERC1967NonPayable()
```



*An upgrade function sees `msg.value &gt; 0` that may be lost.*


### FailedInnerCall

```solidity
error FailedInnerCall()
```



*A call to an address target failed. The target may have reverted.*


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

### InvalidInitialization

```solidity
error InvalidInitialization()
```



*The contract is already initialized.*


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

### NotInitializing

```solidity
error NotInitializing()
```



*The contract is not initializing.*


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

### SafeERC20FailedOperation

```solidity
error SafeERC20FailedOperation(address token)
```



*An operation with an ERC20 token failed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

### UUPSUnauthorizedCallContext

```solidity
error UUPSUnauthorizedCallContext()
```



*The call is from an unauthorized context.*


### UUPSUnsupportedProxiableUUID

```solidity
error UUPSUnsupportedProxiableUUID(bytes32 slot)
```



*The storage `slot` is unsupported as a UUID.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| slot | bytes32 | undefined |

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







