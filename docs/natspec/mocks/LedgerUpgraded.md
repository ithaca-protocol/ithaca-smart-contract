# LedgerUpgraded









## Methods

### clientPositions

```solidity
function clientPositions(uint256 contractId, address client) external view returns (int256 positionSize)
```

Mapping storing client positions. Each position denotes amount of option contracts each trader has in respective contractId (size). The size can be either negative (Sell) or positive (Buy).



#### Parameters

| Name | Type | Description |
|---|---|---|
| contractId | uint256 | undefined |
| client | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| positionSize | int256 | undefined |

### initialize

```solidity
function initialize(address accessController_, address underlyingCurrency_, address strikeCurrency_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accessController_ | address | undefined |
| underlyingCurrency_ | address | undefined |
| strikeCurrency_ | address | undefined |

### newFunction

```solidity
function newFunction() external pure returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### registry

```solidity
function registry() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### strikeCurrency

```solidity
function strikeCurrency() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### underlyingCurrency

```solidity
function underlyingCurrency() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### updateFundMovements

```solidity
function updateFundMovements(ILedger.FundMovementParam[] fundMovements, uint64 backendId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fundMovements | ILedger.FundMovementParam[] | undefined |
| backendId | uint64 | undefined |

### updatePositions

```solidity
function updatePositions(ILedger.PositionParam[] positions, uint64 backendId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| positions | ILedger.PositionParam[] | undefined |
| backendId | uint64 | undefined |



## Events

### FundMovementsUpdated

```solidity
event FundMovementsUpdated(uint64 indexed backendId)
```

Emitted after successful settlement of fund movements, emitted once per settlement batch.



#### Parameters

| Name | Type | Description |
|---|---|---|
| backendId `indexed` | uint64 | - special identificator created by Java Backend to track settlement progress |

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

### PositionsUpdated

```solidity
event PositionsUpdated(uint64 indexed backendId)
```

Emitted after successful settlement of positions, emitted once per settlement batch.



#### Parameters

| Name | Type | Description |
|---|---|---|
| backendId `indexed` | uint64 | - special identificator created by Java Backend to track settlement progress |



## Errors

### EmptyArray

```solidity
error EmptyArray()
```






### InvalidInitialization

```solidity
error InvalidInitialization()
```



*The contract is already initialized.*


### NotInitializing

```solidity
error NotInitializing()
```



*The contract is not initializing.*



