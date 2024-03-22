# IRegistry



> Registry interface

Registry keeps track of all contracts in the protocol



## Methods

### fundLock

```solidity
function fundLock() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### isValidLedger

```solidity
function isValidLedger(address _contract) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _contract | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### tokenValidator

```solidity
function tokenValidator() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |



## Events

### FundLockUpdated

```solidity
event FundLockUpdated(address fundLock)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fundLock  | address | undefined |

### LedgerBeaconUpdated

```solidity
event LedgerBeaconUpdated(address ledgerBeacon)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| ledgerBeacon  | address | undefined |

### LedgerDeployed

```solidity
event LedgerDeployed(address ledger)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| ledger  | address | undefined |

### TokenValidatorUpdated

```solidity
event TokenValidatorUpdated(address tokenValidator)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenValidator  | address | undefined |



## Errors

### InvalidMarket

```solidity
error InvalidMarket()
```






### LedgerAlreadyDeployed

```solidity
error LedgerAlreadyDeployed(address undelying, address strike, address ledger)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| undelying | address | undefined |
| strike | address | undefined |
| ledger | address | undefined |

### ZeroAddress

```solidity
error ZeroAddress()
```







