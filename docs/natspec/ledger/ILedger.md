# ILedger










## Events

### FundMovementsUpdated

```solidity
event FundMovementsUpdated(uint64 indexed backendId)
```

Emitted after successful settlement of fund movements, emitted once per settlement batch.



#### Parameters

| Name | Type | Description |
|---|---|---|
| backendId `indexed` | uint64 | - special identificator created by Java Backend to track settlement progress |

### PositionsUpdated

```solidity
event PositionsUpdated(uint64 indexed backendId)
```

Emitted after successful settlement of positions, emitted once per settlement batch.



#### Parameters

| Name | Type | Description |
|---|---|---|
| backendId `indexed` | uint64 | - special identificator created by Java Backend to track settlement progress |



## Errors

### EmptyArray

```solidity
error EmptyArray()
```







