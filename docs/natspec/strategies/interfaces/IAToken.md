# IAToken

*Aave*

> IAToken

Defines the basic interface for an AToken.



## Methods

### getPreviousIndex

```solidity
function getPreviousIndex(address user) external view returns (uint256)
```

Returns last index interest was accrued to the user&#39;s balance



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The last index interest was accrued to the user&#39;s balance, expressed in ray |

### scaledBalanceOf

```solidity
function scaledBalanceOf(address user) external view returns (uint256)
```

Returns the scaled balance of the user.

*The scaled balance is the sum of all the updated stored balance divided by the reserve&#39;s liquidity index at the moment of the update*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user whose balance is calculated |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The scaled balance of the user |




