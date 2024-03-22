# ITokenValidator









## Methods

### addTokensToWhitelist

```solidity
function addTokensToWhitelist(ITokenValidator.AddTokenToWhitelistParams[] params) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| params | ITokenValidator.AddTokenToWhitelistParams[] | undefined |

### getTokenDetails

```solidity
function getTokenDetails(address token) external view returns (uint8 precision, uint8 decimalPrecisionDiff)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| precision | uint8 | undefined |
| decimalPrecisionDiff | uint8 | undefined |

### isWhitelisted

```solidity
function isWhitelisted(address token) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |



## Events

### AddedToWhitelist

```solidity
event AddedToWhitelist(address indexed token, uint8 precision, uint8 decimalPrecisionDiff)
```

Emitted when a token is added to whitelist

*precision &lt; ERC20 decimals*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token `indexed` | address | - address of whitelisted token |
| precision  | uint8 | - decimal places used by Ithaca backend |
| decimalPrecisionDiff  | uint8 | - difference between ERC20 decimals and precision |

### RemovedFromWhitelist

```solidity
event RemovedFromWhitelist(address indexed token)
```

Emitted when a token is removed from whitelist



#### Parameters

| Name | Type | Description |
|---|---|---|
| token `indexed` | address | - address of token removed from whitelist |



## Errors

### PrecisionGtDecimals

```solidity
error PrecisionGtDecimals(address token, uint8 decimals, uint8 precision)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |
| decimals | uint8 | undefined |
| precision | uint8 | undefined |

### ZeroAddress

```solidity
error ZeroAddress()
```






### ZeroPrecision

```solidity
error ZeroPrecision(address token)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined |


