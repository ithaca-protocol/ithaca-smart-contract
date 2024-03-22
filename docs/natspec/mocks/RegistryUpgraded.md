# RegistryUpgraded









## Methods

### UPGRADE_INTERFACE_VERSION

```solidity
function UPGRADE_INTERFACE_VERSION() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### deployLedger

```solidity
function deployLedger(address underlying, address strike, uint8 precisionUnderlying, uint8 precisionStrike) external nonpayable
```

Deploys a new Ithaca market

*should be called by priviledged account with {ADMIN_ROLE}*

#### Parameters

| Name | Type | Description |
|---|---|---|
| underlying | address | address of underlying token |
| strike | address | address of strike token |
| precisionUnderlying | uint8 | undelying token precision used by Ithaca backend |
| precisionStrike | uint8 | strike precision used by Ithaca backend |

### deployedLedgers

```solidity
function deployedLedgers() external view returns (address[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined |

### fundLock

```solidity
function fundLock() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### initialize

```solidity
function initialize(address accessController_, address ledgerBeacon_, address tokenValidator_, address fundLock_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| accessController_ | address | undefined |
| ledgerBeacon_ | address | undefined |
| tokenValidator_ | address | undefined |
| fundLock_ | address | undefined |

### isValidLedger

```solidity
function isValidLedger(address ledger) external view returns (bool)
```



*Function to check if given ledger exists in registry*

#### Parameters

| Name | Type | Description |
|---|---|---|
| ledger | address | address of contract to validate |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### ledgerBeacon

```solidity
function ledgerBeacon() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### newFunction

```solidity
function newFunction() external pure returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```



*Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### setFundLock

```solidity
function setFundLock(address fundLock_) external nonpayable
```

Setter for {FundLock} address

*should be called by priviledged account with {ADMIN_ROLE}*

#### Parameters

| Name | Type | Description |
|---|---|---|
| fundLock_ | address | address of {FundLock} contract |

### setLedgerBeacon

```solidity
function setLedgerBeacon(address ledgerBeacon_) external nonpayable
```

Setter for {LedgerBeacon} address

*should be called by priviledged account with {ADMIN_ROLE}*

#### Parameters

| Name | Type | Description |
|---|---|---|
| ledgerBeacon_ | address | address of {LedgerBeacon} contract |

### setTokenValidator

```solidity
function setTokenValidator(address tokenValidator_) external nonpayable
```

Setter for {TokenValidator} address

*should be called by priviledged account with {ADMIN_ROLE}*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenValidator_ | address | address of {TokenValidator} contract |

### tokenValidator

```solidity
function tokenValidator() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

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

### FundLockUpdated

```solidity
event FundLockUpdated(address fundLock)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| fundLock  | address | undefined |

### Initialized

```solidity
event Initialized(uint64 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint64 | undefined |

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

### NotInitializing

```solidity
error NotInitializing()
```



*The contract is not initializing.*


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







