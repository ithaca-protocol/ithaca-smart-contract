# Ithaca Finance Smart Contracts


## Proxy Pattern And Upgradability

Ithaca Smart Contracts follow the UUPSUpgradeable pattern, which uses a proxy contract to enable upgrades while preserving the contract's state. 


## Roles & Priviledged Access

**Folder:** `access/*`
- **AccessController.sol** - This contract inherits OpenZeppelin’s role based access control with additional helper function.
- **AccessRestricted.sol** - All contracts that require access control implement this contract.
- **Roles.sol** - Defines the 4 role types: `GOVERNOR_ROLE`, `ADMIN_ROLE`, `OPERATOR_ROLE`, `UTILITY_ACCOUNT_ROLE`

### Role Types 
The Priviledged access is based on privileged roles. An address is granted a privileged role if it is added to the corresponding list by at least one other privileged address of the correct type. An account can hold none, one or multiple roles in the system. The roles and access control is managed by the RoleManager contract. Following roles exists:


**Admin** -  The Admin role is the most privileged role in the system. An account bearing the admin role can:
- add/revoke all other roles, this includes removing the Admin role of other Admins
- can set/remove the allowed tokens
- can set the time of the release lock and other parameters of the FundLock
- is the only role that can deploy an options market contract set

**Governor** - The Governor role is used to operate the system. An account bearing the Governor role can:
- execute all governance functionality such as change entries in the Resolver or update the address of the contracts in the system, e.g. the Registry
- upgrade TokenManager and TokenValidator contracts

**Operator** - The Operator role is a placeholder for now and doesn’t have any permissions


**Utility Account** - Utility Account role is used for the functions execution which are called by Ithaca Java Backend. This account is assigned by Governors.



## FundLock Module

As a module for managing funds of all participants and their balances in the system, `FundLock` is designed as a joint custody solution between Ithaca and the user. Users may deposit and withdraw directly into/from `FundLock`.

This contract handles all clients funds and facilitates deposits, withdrawals and release of funds. Release of funds is subject to completion of release lock period.

Client needs create a withdrawal request first, after the release lock period is over client can request for funds release. Client can create a maximum of 5 withdrawal requests at a time, after that new withdrawal requests can only be made after at least one of the withdrawals is complete (released). While the funds are in withdrawal queue and the trade lock period is not complete yet, then these funds can be used to settle clients new orders if the funds deposited by the client are not sufficient.

This contract also provides helper functions to check client deposits and withdrawal queue. Clients can either deposit and withdraw funds directly if they are on settlement chain or cross-chain through Axelar.

Settlement of funds is done by backend through ledger once orders are matched on the backend.

**Folder:** `fundLock/*`
- **FundLock.sol**

### Core State Variables
- `balanceSheetS`
- `fundsToWithdrawSlots`
- `fundsToWithdrawS`
- `releaseLock`
- `tradeLock`
- `settlementChain`
- `settlementContract`


#### Core Functions
- `setTradeLockInterval`
- `setReleaseLockInterval`
- `balanceSheet` - Getter returning the correct {balanceSheetS} value for the correct token and particular client
- `fundsToWithdraw` - Getter used to pull data about client's withdraw requests
- `fundsToWithdrawTotal` - Returns the total amount of token flagged for withdrawal for a particular user  that still has active {tradeLock}. This is the SUM of all withdraw requests for a particular token and user
- `updateBalances` - Public function used by Ledger to update `balanceSheetS` for all types of accounts. Used by LedgerUpdate flows
- `fundFromWithdrawn` - Private function that is a part of {_updateBalance}. This function is only called when user's funds in {balanceSheets} are not enough and his {fundsToWithdrawS} can be used
- `deposit` - User facing function for depositing funds to be used in Ithaca. `value` deposited will go to the client's {balanceSheetS}
- `withdraw` - Marking funds that need to be withdrawn by the depositor.   This function does NOT do any transfers. It only marks funds  by creating `Funds` structs and mapping them to user and token addresses. 
- `release` - Actual withdrawal through releasing funds and making transfer to the client who called the function. In order to be released, funds   first have to be marked as {fundsToWithdrawS} by the {withdraw()} function  and time interval set as {releaseLock} has to pass since withdraw() was called


## Ledger

Ledger represents a market for a specific currency pair. This is the entry point for backend to tigger trade settlement. Once orders are submitted, backend triggers ledger contracts to update client positions and fund settlement.

**Folder:** `ledger/*`
- `Ledger.sol`


#### Core State Variables:
- `clientPositions`

#### Core Functions:
- `updatePositions` - Entry point for all settlement logic and the function that Java Backend calls to trigger trade settlement. 
- `validateAndCountAmounts` - Function that validates that there are no fully zero rows present and counts how many transfers will be needed when reaching FundLock, so we can create correct length transfer arrays for FundLock
- `processPositionUpdates` - Function for updating `clientPositions` mapping in {Ledger}
- `processFundMovement` - Preparation of the "fund movement" part of the data where we take initial arrays and convert them into arrays that FundLock can understand. 
- `initializeData` - The actual data preparation function in order to move settlement further to FundLock. 

## Axelar Cross Chain 

Contracts in this directory help facilitate cross-chain communication with Ithaca's smart contracts on settlement chain through Axelar.

**Folder**: `axelar/*`
- `FundLockExecutable.sol` -  This contract implements AxelarExecutable contract and will be invoked when a cross-chain call is received and token is transferred on settlement chain.
- `FundLockGateway.sol` - When a client has funds on a chain other than settlement chain they will interact with is contract to deposit, withdraw or release their funds.

#### FundLockGateway Functions
- `deposit` - Makes a cross-chain deposit to the settlement chain
- `withdraw` - Makes a cross-chain withdraw request to the settlement chain
- `release` - Makes a cross-chain release request to the settlement chain



## Registry

This is a factory contract that keeps track of all contracts in the protocol. Admin can create new markets by deploying Ledger contract for a specific currency pair.

**Folder:** `registry/*`
- `Registry.sol`


#### Core Functions
- `verify` - Adding new contract to list of registered contracts
- `isValidContract` - View that checks if contract is present in Registry storage
- `isValidContractOrUtilityBase` - View that checks if contract is present in Registry storage
- `deployLedge`
- `setTokenManager`
- `setTokenValidator`
- `setLedgerBeacon`
- `setFundLock`



## Tokens

**Folder:** `tokens/*`

- `TokenManager.sol` - This contract facilitates safe token transfers from client to FundLock contract.
- `TokenValidator.sol` - This contracts is used to whitelist tokens used in the Ithaca markets, additionally it also provides token precision