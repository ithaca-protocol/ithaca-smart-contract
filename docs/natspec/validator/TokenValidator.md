# TokenValidator



> TokenValidator

Contract used for whitelisting and validating tokens used in Ithaca Markets

*only priviledged account with {ADMIN_ROLE} can whitelist tokens Additionally contract stores precision values for tokens.*

## Methods

### UPGRADE_INTERFACE_VERSION

```solidity
function UPGRADE_INTERFACE_VERSION() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### addTokensToWhitelist

```solidity
function addTokensToWhitelist(ITokenValidator.AddTokenToWhitelistParams[] tokens) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokens | ITokenValidator.AddTokenToWhitelistParams[] | undefined |

### getTokenDetails

```solidity
function getTokenDetails(address token) external view returns (uint8 precision, uint8 decimalPrecisionDiff)
```

Function to get token details



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | address of token to get precision for |

#### Returns

| Name | Type | Description |
|---|---|---|
| precision | uint8 | of a requested token |
| decimalPrecisionDiff | uint8 | difference between ERC20 decimals and backend precision |

### initialize

```solidity
function initialize(address accessController) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accessController | address | undefined |

### isWhitelisted

```solidity
function isWhitelisted(address token) external view returns (bool)
```

Function to check if token is whitelisted



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | address of token to be checked |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | boolean indicating whitelist status |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```



*Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### removeTokenFromWhitelist

```solidity
function removeTokenFromWhitelist(address token) external nonpayable
```

Function to remove token address from {TokenValidator}&#39;s _whitelist



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | address of token to be removed from whitelist |

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

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

### RemovedFromWhitelist

```solidity
event RemovedFromWhitelist(address indexed token)
```

Emitted when a token is removed from whitelist



#### Parameters

| Name | Type | Description |
|---|---|---|
| token `indexed` | address | - address of token removed from whitelist |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```



*Emitted when the implementation is upgraded.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |



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


