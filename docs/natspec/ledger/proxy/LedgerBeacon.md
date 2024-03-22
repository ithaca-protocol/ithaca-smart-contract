# LedgerBeacon









## Methods

### implementation

```solidity
function implementation() external view returns (address)
```



*Returns the current implementation address.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external nonpayable
```



*Upgrades the beacon to a new implementation. Emits an {Upgraded} event. Requirements: - msg.sender must be the owner of the contract. - `newImplementation` must be a contract.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |



## Events

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```



*Emitted when the implementation returned by the beacon is changed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |



## Errors

### BeaconInvalidImplementation

```solidity
error BeaconInvalidImplementation(address implementation)
```



*The `implementation` of the beacon is invalid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation | address | undefined |

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



