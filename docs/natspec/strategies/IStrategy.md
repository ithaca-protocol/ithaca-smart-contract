# IStrategy









## Methods

### distributeYield

```solidity
function distributeYield(address account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### returnFund

```solidity
function returnFund(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined |



## Events

### FundPulled

```solidity
event FundPulled(address indexed _vault, uint256 _amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _vault `indexed` | address | undefined |
| _amount  | uint256 | undefined |

### FundReturned

```solidity
event FundReturned(address indexed _vault, uint256 _amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _vault `indexed` | address | undefined |
| _amount  | uint256 | undefined |

### MaxManagingRatioSet

```solidity
event MaxManagingRatioSet(uint256 _ratio)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ratio  | uint256 | undefined |



## Errors

### OnlyFundlock

```solidity
error OnlyFundlock()
```






### RatioOutOfRange

```solidity
error RatioOutOfRange()
```







