# ERC1967Utils







*This abstract contract provides getters and event emitting update functions for https://eips.ethereum.org/EIPS/eip-1967[EIP1967] slots.*


## Events

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```



*Emitted when the admin account has changed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| previousAdmin  | address | undefined |
| newAdmin  | address | undefined |

### BeaconUpgraded

```solidity
event BeaconUpgraded(address indexed beacon)
```



*Emitted when the beacon is changed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| beacon `indexed` | address | undefined |

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

### ERC1967InvalidAdmin

```solidity
error ERC1967InvalidAdmin(address admin)
```



*The `admin` of the proxy is invalid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| admin | address | undefined |

### ERC1967InvalidBeacon

```solidity
error ERC1967InvalidBeacon(address beacon)
```



*The `beacon` of the proxy is invalid.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| beacon | address | undefined |

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



