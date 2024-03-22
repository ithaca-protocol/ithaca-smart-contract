# BeaconProxy







*This contract implements a proxy that gets the implementation address for each call from an {UpgradeableBeacon}. The beacon address can only be set once during construction, and cannot be changed afterwards. It is stored in an immutable variable to avoid unnecessary storage reads, and also in the beacon storage slot specified by https://eips.ethereum.org/EIPS/eip-1967[EIP1967] so that it can be accessed externally. CAUTION: Since the beacon address can never be changed, you must ensure that you either control the beacon, or trust the beacon to not upgrade the implementation maliciously. IMPORTANT: Do not use the implementation logic to modify the beacon storage slot. Doing so would leave the proxy in an inconsistent state where the beacon storage slot does not match the beacon address.*


## Events

### BeaconUpgraded

```solidity
event BeaconUpgraded(address indexed beacon)
```



*Emitted when the beacon is changed.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| beacon `indexed` | address | undefined |



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


### FailedInnerCall

```solidity
error FailedInnerCall()
```



*A call to an address target failed. The target may have reverted.*



