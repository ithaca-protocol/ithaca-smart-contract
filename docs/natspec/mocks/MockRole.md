# MockRole









## Methods

### anyoneCanCallFunc

```solidity
function anyoneCanCallFunc() external nonpayable
```






### onlyAdminCanCallFunc

```solidity
function onlyAdminCanCallFunc() external nonpayable
```






### onlyUtilityAccountCanCallFunc

```solidity
function onlyUtilityAccountCanCallFunc() external nonpayable
```








## Events

### AnyoneCanCallFuncCalled

```solidity
event AnyoneCanCallFuncCalled(address caller)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller  | address | undefined |

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

### OnlyAdminCanCallFuncCalled

```solidity
event OnlyAdminCanCallFuncCalled(address caller)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller  | address | undefined |

### OnlyUtilityAccountCanCallFuncCalled

```solidity
event OnlyUtilityAccountCanCallFuncCalled(address caller)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| caller  | address | undefined |



## Errors

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



