import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber, Signer, constants } from "ethers";
import { ADMIN_ROLE, DEFAULT_RELEASE_LOCK, DEFAULT_TRADE_LOCK } from "../src/constants";
import { MockERC20, MockERC20__factory } from "../typechain-types";
import { deployIthaca } from "./fixtures/deploy.ithaca";
import { BASE_MULTIPLIER, depositToFundLock, getFundLockBalance } from "./fixtures/fund.lock.helpers";
import { getEvents, scaleUp } from "./fixtures/helpers";
import { Ithaca } from "./fixtures/ithaca";
import { WithdrawEvent } from "../typechain-types/contracts/fundlock/Fundlock";

describe("FundLock", () => {
    let admin: Signer;
    let ithaca: Ithaca;
    let token: MockERC20;
    let client: Signer;

    async function deploy() {
        const {
            admin,
            ithaca,
            signers: [client],
        } = await loadFixture(deployIthaca);
        const token = await new MockERC20__factory(admin).deploy("Token", "T", 18);
        await token.deployTransaction.wait();
        await ithaca.tokenValidator.addTokensToWhitelist([
            {
                token: token.address,
                precision: 7,
            },
        ]);
        await token.mint(await client.getAddress(), await scaleUp(token, 1000)).then((tx) => tx.wait());
        return { admin, ithaca, token, client };
    }

    beforeEach(async function () {
        ({ admin, ithaca, token, client } = await loadFixture(deploy));
    });

    describe("client cannot deposit 0.", () => {
        const value = 0;

        it("deposit token should fail", async function () {
            const someBalance = 1000;
            await token.mint(client.getAddress(), someBalance).then((tx) => tx.wait());

            await expect(token.connect(client).approve(ithaca.fundLock.address, someBalance)).to.be.fulfilled;

            await expect(
                ithaca.fundLock.connect(client).deposit(client.getAddress(), token.address, value)
            ).to.be.rejectedWith("ZeroAmount()");
        });
    });

    describe("user can deposit and his token balance and balanceSheet change appropriately.", async () => {
        const { userBalance: clientBalanceBefore, fundLockBalance: fundLockBalanceBefore } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        const depositValue = BigNumber.from(10).pow(18);

        const depositTx = await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);
        await expect(depositTx)
            .to.emit(ithaca.fundLock, "Deposit")
            .withArgs(await client.getAddress(), token.address, depositValue);

        const balanceSheet = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

        expect(balanceSheet).to.eq(depositValue);

        const { userBalance: clientBalanceAfter, fundLockBalance: fundLockBalanceAfter } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        expect(clientBalanceBefore.sub(clientBalanceAfter)).to.eq(depositValue);
        expect(fundLockBalanceAfter.sub(fundLockBalanceBefore)).to.eq(depositValue);

        it("WETH deposit is rejected when token is not added to Ledger whitelist", async function () {
            await expect(depositToFundLock(ithaca.fundLock, token.address, client, 100)).to.be.rejectedWith(
                `ZeroPrecision`
            );
        });
    });

    describe("funds get flagged after calling withdraw() and client can not withdraw yet.", async () => {
        const depositVaule = BigNumber.from(10).pow(18);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositVaule);

        const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, depositVaule);
        await expect(withdrawTx)
            .to.emit(ithaca.fundLock, "Withdraw")
            .withArgs(await client.getAddress(), token.address, depositVaule, 1);
        const block = await ithaca.fundLock.provider.getBlock((await withdrawTx.wait()).blockNumber);

        await expect(ithaca.fundLock.connect(client).release(token.address, block.timestamp)).to.rejectedWith(
            `ReleaseRequeiredTimeNotReach(\\"${await client.getAddress()}\\", \\"${token.address}\\", ${
                block.timestamp
            }`
        );
    });

    describe("fundsToWithdrawSlots get filled after calling withdraw()", async () => {
        const depositVaule = BigNumber.from(10).pow(18);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositVaule);

        let expectedSlot = 0;
        for (let i = 0; i < 5; i++) {
            expectedSlot |= 1 << i;

            const withdrawValue = depositVaule.div(10);
            const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, withdrawValue);
            await expect(withdrawTx)
                .to.emit(ithaca.fundLock, "Withdraw")
                .withArgs(await client.getAddress(), token.address, withdrawValue, i + 1);
        }
    });

    describe("fundsToWithdrawSlots get emptied after calling release()", async () => {
        const depositVaule = BigNumber.from(10).pow(18);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositVaule);

        const withdrawTimestamps = [];
        for (let i = 0; i < 5; i++) {
            const withdrawValue = depositVaule.div(10);
            const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, withdrawValue);
            withdrawTimestamps.push((await client.provider?.getBlock(withdrawTx.blockNumber!))?.timestamp);
        }
        const now = await time.latest();
        await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);

        await ithaca.fundLock.connect(client).release(token.address, withdrawTimestamps[2]!);
        await ithaca.fundLock.connect(client).release(token.address, withdrawTimestamps[4]!);
        const withdrawValue = depositVaule.div(10);
        await ithaca.fundLock.connect(client).withdraw(token.address, withdrawValue);
    });

    describe("client can release funds and fundsToWithdraw gets unflagged", async () => {
        const depositValue = BigNumber.from(10).pow(18);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

        const balanceSheetBefore = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

        const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue);
        const txReceipt = await withdrawTx.wait();

        const block = await ithaca.fundLock.provider.getBlock(txReceipt.blockNumber);

        const balanceSheetAfter = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetBefore.sub(balanceSheetAfter)).to.eq(depositValue);

        const now = await time.latest();
        await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);

        const { userBalance: clientBalanceBefore, fundLockBalance: fundLockBalanceBefore } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        await ithaca.fundLock.connect(client).release(token.address, block.timestamp);

        const totalAfter = await [0, 1, 2, 3, 4].reduce(
            async (acc, idx) => {
                const newAcc = await acc;
                const withdrawStructAfter = await ithaca.fundLock.fundsToWithdraw(
                    await client.getAddress(),
                    token.address,
                    idx
                );
                return newAcc.add(withdrawStructAfter.value);
            },
            Promise.resolve(BigNumber.from(0))
        );

        expect(totalAfter).to.eq(0);

        const { userBalance: clientBalanceAfter, fundLockBalance: fundLockBalanceAfter } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        expect(clientBalanceAfter.sub(clientBalanceBefore)).to.eq(depositValue);
        expect(fundLockBalanceBefore.sub(fundLockBalanceAfter)).to.eq(depositValue);
    });

    describe("if the same client does deposit-release cycle twice balanceSheet changes appropriately.", async () => {
        const depositValue = BigNumber.from(10).pow(18);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

        const balanceSheetDeposit1 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

        const tx = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue);
        const txReceipt = await tx.wait();
        const txBlock = await ithaca.fundLock.provider.getBlock(txReceipt.blockNumber);

        const balanceSheetWithdraw1 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetDeposit1.sub(balanceSheetWithdraw1)).to.eq(depositValue);
        expect(balanceSheetWithdraw1).to.eq(0);

        const now1 = await time.latest();
        await time.increaseTo(now1 + DEFAULT_RELEASE_LOCK + 1);

        await ithaca.fundLock.connect(client).release(token.address, txBlock.timestamp);

        const { userBalance: clientBalanceBefore2, fundLockBalance: fundLockBalanceBefore2 } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        const depositValue2 = BigNumber.from(10).pow(19);
        const tx2 = await depositToFundLock(ithaca.fundLock, token.address, client, depositValue2);

        const balanceSheetDeposit2 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        const withdrawTx2 = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue2);
        const withdrawTx2Receipt = await withdrawTx2.wait();
        const withdrawTx2Block = await ithaca.fundLock.provider.getBlock(withdrawTx2Receipt.blockNumber);

        const balanceSheetWithdraw2 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetWithdraw2).to.eq(0);

        expect(balanceSheetDeposit2.sub(balanceSheetWithdraw2)).eq(depositValue2);

        const now2 = await time.latest();
        await time.increaseTo(now2 + DEFAULT_RELEASE_LOCK + 1);

        await ithaca.fundLock.connect(client).release(token.address, withdrawTx2Block.timestamp);

        const { userBalance: clientBalanceAfter2, fundLockBalance: fundLockBalanceAfter2 } = await getFundLockBalance(
            token,
            await client.getAddress(),
            ithaca.fundLock.address
        );

        expect(clientBalanceAfter2).eq(clientBalanceBefore2);
        expect(fundLockBalanceBefore2).eq(fundLockBalanceAfter2);
    });

    describe("client can deposit the same token twice and withdraw and release partially", async () => {
        const depositValue1 = BigNumber.from(10).pow(18);

        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue1);

        const balanceSheetDeposit1 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetDeposit1).to.eq(depositValue1);

        const depositValue2 = BigNumber.from(10).pow(19);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue2);

        const balanceSheetDeposit2 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetDeposit2).to.eq(depositValue1.add(depositValue2));

        const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue2);
        const withdrawTxReceipt = await withdrawTx.wait();
        const withdrawTs = (await ithaca.fundLock.provider.getBlock(withdrawTxReceipt.blockNumber)).timestamp;
        const [
            {
                args: { amount: toBeWithdrawAmt2 },
            },
        ] = getEvents<WithdrawEvent>(
            withdrawTxReceipt.logs,
            ithaca.fundLock,
            ithaca.fundLock.interface.getEvent("Withdraw")
        );
        expect(toBeWithdrawAmt2).to.eq(depositValue2);

        const now = await time.latest();
        await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);

        await ithaca.fundLock.connect(client).release(token.address, withdrawTs);

        const balanceSheetRelease2 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetRelease2).to.eq(balanceSheetDeposit1);

        const withdrawTx2 = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue1);
        const withdrawTx2Receipt = await withdrawTx2.wait();
        const withdrawTx2Block = await ithaca.fundLock.provider.getBlock(withdrawTx2Receipt.blockNumber);
        const [
            {
                args: { amount: toBeWithdrawAmt1 },
            },
        ] = getEvents<WithdrawEvent>(
            withdrawTx2Receipt.logs,
            ithaca.fundLock,
            ithaca.fundLock.interface.getEvent("Withdraw")
        );

        expect(toBeWithdrawAmt1).to.eq(depositValue1);

        const now1 = await time.latest();
        await time.increaseTo(now1 + DEFAULT_RELEASE_LOCK + 1);

        await ithaca.fundLock.connect(client).release(token.address, withdrawTx2Block.timestamp);

        const balanceSheetRelease1 = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheetRelease1).to.eq(0);
    });

    describe("client can not withdraw more than deposited", async () => {
        const depositValue = BigNumber.from(10).pow(18);

        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

        const balanceSheet = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
        expect(balanceSheet).to.eq(depositValue);
        const withdrawValue = depositValue.add(1);

        await expect(ithaca.fundLock.connect(client).withdraw(token.address, withdrawValue)).to.be.rejectedWith(
            "InsufficientFunds(1000000000000000001, 1000000000000000000)"
        );
    });

    describe("#fundsToWithdrawTotal should return correct total amount of tokens under tradeLock for a particular token", async () => {
        const depositValue = BigNumber.from(10).pow(18).mul(12);
        const singleWithdrawValue = BigNumber.from(10).pow(18).mul(2);
        await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

        await ithaca.fundLock.connect(client).withdraw(token.address, singleWithdrawValue);
        await ithaca.fundLock.connect(client).withdraw(token.address, singleWithdrawValue);

        const now = await time.latest();
        await time.increaseTo(now + DEFAULT_TRADE_LOCK + 10);

        for (let i = 0; i < 3; i++) {
            await ithaca.fundLock.connect(client).withdraw(token.address, singleWithdrawValue);
        }

        const total = await ithaca.fundLock.fundsToWithdrawTotal(await client.getAddress(), token.address);
        expect(total).to.eq(singleWithdrawValue.mul(3));
    });

    describe("only ADMIN role can call setReleaseLockInterval()", () => {
        it(`succeeds for ADMIN_ROLE`, async () => {
            await expect(ithaca.fundLock.connect(admin).setReleaseLockInterval(100)).to.be.fulfilled;
        });

        it("reverts for non-ADMIN role", async () => {
            await expect(ithaca.fundLock.connect(client).setReleaseLockInterval(1000)).to.be.rejectedWith(
                `AccessControlUnauthorizedAccount("${await client.getAddress()}", "${ADMIN_ROLE}")`
            );
        });
    });

    describe("all functions emit events with appropriate values", async () => {
        it("Deposit", async function () {
            const depositValue = BigNumber.from(10).pow(18);
            const depositTx = await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

            await expect(depositTx)
                .to.emit(ithaca.fundLock, "Deposit")
                .withArgs(await client.getAddress(), token.address, depositValue);

            const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, depositValue);
            await expect(withdrawTx)
                .to.emit(ithaca.fundLock, "Withdraw")
                .withArgs(await client.getAddress(), token.address, depositValue, 0);

            const now = await time.latest();
            await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);

            const releaseTx = await ithaca.fundLock.connect(client).release(token.address, 0);
            await expect(releaseTx)
                .to.emit(ithaca.fundLock, "Release")
                .withArgs(await client.getAddress(), token.address, depositValue, 0);
        });
    });

    describe("#withdraw()", () => {
        it("should withdraw partially", async function () {
            const depositValue = BigNumber.from(10).pow(18);
            await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);
            const partialWithdrawAmt = depositValue.div(2);

            const balanceSheetBefore = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

            const withdrawTx = await ithaca.fundLock.connect(client).withdraw(token.address, partialWithdrawAmt);
            const withdrawTxReceipt = await withdrawTx.wait();

            const balanceSheetAfter = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

            expect(balanceSheetBefore.sub(balanceSheetAfter)).to.eq(partialWithdrawAmt);

            const [
                {
                    args: { amount: toBeWithdrawnAmt, index },
                },
            ] = getEvents<WithdrawEvent>(
                withdrawTxReceipt.logs,
                ithaca.fundLock,
                ithaca.fundLock.interface.getEvent("Withdraw")
            );

            expect(toBeWithdrawnAmt).to.eq(partialWithdrawAmt);
            expect(index).to.eq(0);
        });

        it("should NOT withdraw more than deposited", async function () {
            const depositValue = BigNumber.from(10).pow(18);
            await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);
            const improperWithdrawAmt = depositValue.add(1);

            await expect(
                ithaca.fundLock.connect(client).withdraw(token.address, improperWithdrawAmt)
            ).to.be.rejectedWith("InsufficientFunds(1000000000000000001, 1000000000000000000)");
        });

        it("should NOT withdraw more than 5 times for one token", async function () {
            const depositValue = BigNumber.from(10).pow(18);
            await depositToFundLock(ithaca.fundLock, token.address, client, depositValue);

            const partialValue = depositValue.div(8);
            for (let i = 0; i < 5; i++) {
                await ithaca.fundLock.connect(client).withdraw(token.address, partialValue);
            }

            const clientAddress = await client.getAddress();
            await expect(ithaca.fundLock.connect(client).withdraw(token.address, partialValue)).to.be.rejectedWith(
                `NoEmptySlot("${clientAddress}", "${token.address}")`
            );
        });

        it("should NOT flag 0", async function () {
            await depositToFundLock(ithaca.fundLock, token.address, client, BigNumber.from(10).pow(18));

            await expect(ithaca.fundLock.connect(client).withdraw(token.address, 0)).to.be.rejectedWith("ZeroAmount()");
        });

        it("should NOT withdraw when token is removed whitelist", async function () {
            await depositToFundLock(ithaca.fundLock, token.address, client, BigNumber.from(10).pow(18));

            await ithaca.tokenValidator.removeTokenFromWhitelist(token.address).then((tx) => tx.wait());

            await expect(ithaca.fundLock.connect(client).withdraw(token.address, 10)).to.rejectedWith(
                `NotWhitelisted("${token.address}")`
            );
        });
    });

    describe("#release()", async () => {
        it(`should NOT release if withdrawTimestamp is sent as 0`, async function () {
            await expect(ithaca.fundLock.connect(client).release(token.address, 0)).to.be.rejectedWith(
                "WithdrawalNotFound()"
            );
        });

        it(`should NOT release if funds haven't been flagged`, async function () {
            await expect(ithaca.fundLock.connect(client).release(token.address, "4")).to.be.rejectedWith(
                `WithdrawalNotFound()`
            );
        });
    });

    describe("lock intervals", () => {
        it("should setReleaseLockInterval() and emit event with the appropriate value", async function () {
            const releaseLockInterval = 3600;
            const tx = await ithaca.fundLock.connect(admin).setReleaseLockInterval(releaseLockInterval);

            expect(tx).to.emit(ithaca.fundLock, "ReleaseLockSet").withArgs(releaseLockInterval);

            expect(await ithaca.fundLock.releaseLock()).to.eq(releaseLockInterval);
        });

        it("should setTradeLockInterval() and emit event with the appropriate value", async function () {
            const tradeLockInterval = 1800;
            const tx = await ithaca.fundLock.connect(admin).setTradeLockInterval(tradeLockInterval);

            await expect(tx).to.emit(ithaca.fundLock, "TradeLockSet").withArgs(tradeLockInterval);
            expect(await ithaca.fundLock.tradeLock()).to.eq(tradeLockInterval);
        });
    });

    describe("#deposit() with different msg.sender and beneficiary", () => {
        it("client account can NOT deposit to another client account", async function () {
            const depositAmount = BigNumber.from(10).pow(18);
            await expect(
                ithaca.fundLock.connect(client).deposit(client.getAddress(), token.address, depositAmount)
            ).to.be.rejectedWith(
                `ERC20InsufficientAllowance("${ithaca.fundLock.address}", 0, ${depositAmount.toString()})`
            );
        });
    });

    describe("Deposits", () => {
        it("Check balanceSheet after the withdrawal request", async function () {
            const assetDepositValue = BigNumber.from(6).mul(BASE_MULTIPLIER);
            const assetWithdrawalValue = BigNumber.from(2).mul(BASE_MULTIPLIER);

            await depositToFundLock(ithaca.fundLock, token.address, client, assetDepositValue);

            await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

            await ithaca.fundLock.connect(client).withdraw(token.address, assetWithdrawalValue);

            expect(await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address)).to.eq(
                assetDepositValue.sub(assetWithdrawalValue)
            );
        });

        it("After depositing WETH the trader should get WETH back", async function () {
            const wethDepositValue = BigNumber.from(15).mul(BASE_MULTIPLIER);
            const clientWethBalanceBeforeDeposit = await token.balanceOf(await client.getAddress());
            await depositToFundLock(ithaca.fundLock, token.address, client, wethDepositValue);

            let balanceSheet = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);

            expect(balanceSheet).to.eq(wethDepositValue);

            await ithaca.fundLock.connect(client).withdraw(token.address, wethDepositValue);

            balanceSheet = await ithaca.fundLock.balanceSheet(await client.getAddress(), token.address);
            expect(balanceSheet).to.eq(0);

            await time.increaseTo((await time.latest()) + DEFAULT_RELEASE_LOCK + 10000);

            await ithaca.fundLock.connect(client).release(token.address, 0);

            const clientWethBalanceAfterWithdraw = await token.balanceOf(await client.getAddress());
            expect(clientWethBalanceAfterWithdraw).to.eq(clientWethBalanceBeforeDeposit);
        });
    });

    describe("FundLock setters", () => {
        it("should set registry", async () => {
            const tx = await ithaca.fundLock.setRegistry(ithaca.registry.address);
            expect(await ithaca.fundLock.registry()).to.be.equal(ithaca.registry.address);
            expect(tx).to.emit(ithaca.fundLock, "RegistryUpdated").withArgs(ithaca.registry.address);
        });

        it("should revert with zero address for registry", async () => {
            await expect(ithaca.fundLock.setRegistry(constants.AddressZero)).to.rejectedWith("ZeroAddress()");
        });

        it("should set trade lock interval", async () => {
            const tx = await ithaca.fundLock.setTradeLockInterval(1200);
            expect(await ithaca.fundLock.tradeLock()).to.be.equal(1200);
            expect(tx).to.emit(ithaca.fundLock, "TradeLockSet").withArgs(1200);
        });

        it("should revert if trade lock set to zero", async () => {
            await expect(ithaca.fundLock.setTradeLockInterval(0)).to.rejectedWith("ZeroTradeLockInterval()");
        });

        it("should set release lock interval", async () => {
            const tx = await ithaca.fundLock.setReleaseLockInterval(2400);
            expect(await ithaca.fundLock.releaseLock()).to.be.equal(2400);
            expect(tx).to.emit(ithaca.fundLock, "ReleaseLockSet").withArgs(2400);
        });

        it("should revert if release lock set to more than 1 week", async () => {
            await expect(ithaca.fundLock.setReleaseLockInterval(86400 * 8)).to.rejectedWith(
                "InvalidReleaseLockInterval()"
            );
        });
    });

    describe("FundLockExecutable setters", () => {
        it("should set registry", async () => {
            const tx = await ithaca.fundLock.setRegistry(ithaca.registry.address);
            expect(await ithaca.fundLock.registry()).to.be.equal(ithaca.registry.address);
            expect(tx).to.emit(ithaca.fundLock, "RegistryUpdated").withArgs(ithaca.registry.address);
        });

        it("should revert with zero address for registry", async () => {
            await expect(ithaca.fundLock.setRegistry(constants.AddressZero)).to.rejectedWith("ZeroAddress()");
        });

        it("should set trade lock interval", async () => {
            const tx = await ithaca.fundLock.setTradeLockInterval(1200);
            expect(await ithaca.fundLock.tradeLock()).to.be.equal(1200);
            expect(tx).to.emit(ithaca.fundLock, "TradeLockSet").withArgs(1200);
        });

        it("should revert if trade lock set to zero", async () => {
            await expect(ithaca.fundLock.setTradeLockInterval(0)).to.rejectedWith("ZeroTradeLockInterval()");
        });

        it("should set release lock interval", async () => {
            const tx = await ithaca.fundLock.setReleaseLockInterval(2400);
            expect(await ithaca.fundLock.releaseLock()).to.be.equal(2400);
            expect(tx).to.emit(ithaca.fundLock, "ReleaseLockSet").withArgs(2400);
        });

        it("should revert if release lock set to more than 1 week", async () => {
            await expect(ithaca.fundLock.setReleaseLockInterval(86400 * 8)).to.rejectedWith(
                "InvalidReleaseLockInterval()"
            );
        });
    });
});
