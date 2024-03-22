import { loadFixture, setStorageAt } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber, BigNumberish, constants } from "ethers";
import { UTILITY_ACCOUNT_ROLE } from "../src/constants";
import { deployIthaca } from "./fixtures/deploy.ithaca";
import {
    USDC_ADDRESS,
    USDC_DECIMAL,
    USDC_PRECISION,
    USDC_SLOT,
    WETH_ADDRESS,
    WETH_DECIMAL,
    WETH_PRECISION,
    WETH_SLOT,
    generalUpgradeTests,
    getBackendIdGenerator,
    scaleUp,
} from "./fixtures/helpers";
import { Ithaca, IthacaLedger } from "./fixtures/ithaca";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ILedger } from "../typechain-types/contracts/ledger/Ledger";
import { BASE_MULTIPLIER } from "./fixtures/fund.lock.helpers";
import { ethers } from "hardhat";
import { LedgerBeaconProxy, LedgerBeaconProxy__factory, LedgerUpgraded__factory } from "../typechain-types";
import { upgradeBeacon } from "../src/deploys";

describe("Ledger", () => {
    const contractIdGenerator = getBackendIdGenerator();
    const backendIdGenerator = getBackendIdGenerator();

    describe("Initialize", () => {
        let ithaca: Ithaca;
        let client: SignerWithAddress;
        beforeEach(async () => {
            ({
                ithaca,
                signers: [client],
            } = await loadFixture(deployIthaca));
        });

        it("deploy", async () => {
            const { ledger, underlying, strike } = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );
            expect(await ledger.registry()).to.eq(ithaca.registry.address);
            expect(await ledger.underlyingCurrency()).to.eq(underlying.token.address);
            expect(await ledger.strikeCurrency()).to.eq(strike.token.address);
            expect(await LedgerBeaconProxy__factory.connect(ledger.address, client).getImplementation()).to.not.equal(
                constants.AddressZero
            );
        });

        it("only utility account is able to call updatePositions", async () => {
            const { ledger } = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );
            await expect(ledger.connect(client).updatePositions([], 0)).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${client.address}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
            );
        });

        it("only utility account is able to call updateFundMovements", async () => {
            const { ledger } = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );
            await expect(ledger.connect(client).updateFundMovements([], 0)).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${client.address}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
            );
        });
    });

    describe("LedgerPositionChange", () => {
        type Balance = { underlying: BigNumber; strike: BigNumber };
        let client1: SignerWithAddress;
        let client2: SignerWithAddress;
        let client3: SignerWithAddress;

        let client1Balance: Balance;
        let client2Balance: Balance;
        let client3Balance: Balance;

        let ledger: IthacaLedger;
        let contractId: BigNumberish;
        let backendId: BigNumberish;

        async function initLedgerFixture() {
            const { signers, ithaca } = await loadFixture(deployIthaca);
            [client1, client2, client3] = signers;
            const depositValue = BigNumber.from(30).mul(BASE_MULTIPLIER);
            const initialUndlyingAmount = 20;
            const initialStrikeAmount = 200;

            ledger = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );

            const clients = [client1, client2, client3];
            const underlying = ledger.underlying.token;
            const strike = ledger.strike.token;
            await clients.reduce(async (acc, client) => {
                await acc;
                // Manipulate local balance
                await setStorageAt(
                    WETH_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, WETH_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
                await setStorageAt(
                    USDC_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, USDC_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
                await ithaca.deposit(client, underlying.address, depositValue);
                await ithaca.deposit(client, strike.address, depositValue);
            }, Promise.resolve());

            contractId = contractIdGenerator();
            backendId = backendIdGenerator();
            // CALL option
            // seller pays collateral, buyer pays premium
            // size = 20, price = 10
            await ledger.updatePositions(
                [
                    { client: client1.address, contractId, size: 20 },
                    { client: client2.address, contractId, size: -20 },
                ],
                backendId
            );

            await ledger.updateFundMovements(
                [
                    {
                        client: client1.address,
                        underlyingAmount: 0,
                        strikeAmount: initialStrikeAmount,
                    },
                    {
                        client: client2.address,
                        underlyingAmount: initialUndlyingAmount,
                        strikeAmount: -initialStrikeAmount,
                    },
                ],
                backendId
            );

            const [underlyingMultiplier, strikeMultiplier] = await Promise.all([
                ledger.underlyingPowerMultiplier(),
                ledger.strikePowerMultiplier(),
            ]);
            await ledger.assertPositionsAndBalances([
                {
                    contractId,
                    client: client1.address,
                    position: 20,
                    underlying: { initial: depositValue, diff: 0 },
                    strike: {
                        initial: depositValue,
                        diff: BigNumber.from(initialStrikeAmount).mul(strikeMultiplier).mul(-1),
                    },
                },
                {
                    contractId,
                    client: client2.address,
                    position: -20,
                    underlying: {
                        initial: depositValue,
                        diff: BigNumber.from(initialUndlyingAmount).mul(underlyingMultiplier).mul(-1),
                    },
                    strike: {
                        initial: depositValue,
                        diff: BigNumber.from(initialStrikeAmount).mul(strikeMultiplier),
                    },
                },
            ]);
            [client1Balance, client2Balance, client3Balance] = await Promise.all(
                [client1, client2, client3].map((client) => ledger.balanceOf(client.address))
            );
        }

        beforeEach(async () => {
            await loadFixture(initLedgerFixture);
        });

        describe("short position", () => {
            it("partial exit", async () => {
                // size = 10, price = 10
                const baseUnderlyingAmount = 10;
                const baseStrikeAmount = 100;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client2.address, contractId, size: 10 },
                        { client: client3.address, contractId, size: -10 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client2.address,
                            underlyingAmount: baseUnderlyingAmount * -1,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client3.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        position: 20,
                        underlying: { initial: client1Balance.underlying, diff: 0 },
                        strike: { initial: client1Balance.strike, diff: 0 },
                    },
                    {
                        contractId,
                        client: client2.address,
                        position: -10,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount),
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount).mul(-1),
                        },
                    },
                    {
                        contractId,
                        client: client3.address,
                        position: -10,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                    },
                ]);
            });

            it("full exit", async () => {
                // size = 20, price = 10
                const baseUnderlyingAmount = 20;
                const baseStrikeAmount = 200;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client2.address, contractId, size: 20 },
                        { client: client3.address, contractId, size: -20 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client2.address,
                            underlyingAmount: baseUnderlyingAmount * -1,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client3.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        underlying: { initial: client1Balance.underlying, diff: 0 },
                        strike: { initial: client1Balance.strike, diff: 0 },
                        position: 20,
                    },
                    {
                        contractId,
                        client: client2.address,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount),
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount).mul(-1),
                        },
                        position: 0,
                    },
                    {
                        contractId,
                        client: client3.address,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                        position: -20,
                    },
                ]);
            });

            it("switch to long", async function () {
                const baseUnderlyingAmount = 30;
                const baseStrikeAmount = 300;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client2.address, contractId, size: 30 },
                        { client: client3.address, contractId, size: -30 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client2.address,
                            underlyingAmount: (baseUnderlyingAmount - 10) * -1,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client3.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        position: 20,
                        underlying: { initial: client1Balance.underlying, diff: 0 },
                        strike: { initial: client1Balance.strike, diff: 0 },
                    },
                    {
                        contractId,
                        client: client2.address,
                        position: 10,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount - 10),
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount).mul(-1),
                        },
                    },
                    {
                        contractId,
                        client: client3.address,
                        position: -30,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                    },
                ]);
            });
        });

        describe("long position", () => {
            it("partial exit", async function () {
                const baseUnderlyingAmount = 10;
                const baseStrikeAmount = 100;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client3.address, contractId, size: 10 },
                        { client: client1.address, contractId, size: -10 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client3.address,
                            underlyingAmount: 0,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client1.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        position: 10,
                        underlying: {
                            initial: client1Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client1Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                    },
                    {
                        contractId,
                        client: client2.address,
                        position: -20,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: 0,
                        },
                    },
                    {
                        contractId,
                        client: client3.address,
                        position: 10,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount).mul(-1),
                        },
                    },
                ]);
            });

            it("full exit", async function () {
                const baseUnderlyingAmount = 20;
                const baseStrikeAmount = 200;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client3.address, contractId, size: 20 },
                        { client: client1.address, contractId, size: -20 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client3.address,
                            underlyingAmount: 0,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client1.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        position: 0,
                        underlying: {
                            initial: client1Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client1Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                    },
                    {
                        contractId,
                        client: client2.address,
                        position: -20,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: 0,
                        },
                    },
                    {
                        contractId,
                        client: client3.address,
                        position: 20,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.mulStrikePowerMultiplier(baseStrikeAmount).mul(-1),
                        },
                    },
                ]);
            });

            it("switch to short", async function () {
                const baseUnderlyingAmount = 30;
                const baseStrikeAmount = 300;

                backendId = backendIdGenerator();

                await ledger.updatePositions(
                    [
                        { client: client3.address, contractId, size: 30 },
                        { client: client1.address, contractId, size: -30 },
                    ],
                    backendId
                );

                await ledger.updateFundMovements(
                    [
                        {
                            client: client3.address,
                            underlyingAmount: 0,
                            strikeAmount: baseStrikeAmount,
                        },
                        {
                            client: client1.address,
                            underlyingAmount: baseUnderlyingAmount,
                            strikeAmount: baseStrikeAmount * -1,
                        },
                    ],
                    backendId
                );

                await ledger.assertPositionsAndBalances([
                    {
                        contractId,
                        client: client1.address,
                        position: -10,
                        underlying: {
                            initial: client1Balance.underlying,
                            diff: ledger.underlyingPowerMultiplier().mul(baseUnderlyingAmount).mul(-1),
                        },
                        strike: {
                            initial: client1Balance.strike,
                            diff: ledger.strikePowerMultiplier().mul(baseStrikeAmount),
                        },
                    },
                    {
                        contractId,
                        client: client2.address,
                        position: -20,
                        underlying: {
                            initial: client2Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client2Balance.strike,
                            diff: 0,
                        },
                    },
                    {
                        contractId,
                        client: client3.address,
                        position: 30,
                        underlying: {
                            initial: client3Balance.underlying,
                            diff: 0,
                        },
                        strike: {
                            initial: client3Balance.strike,
                            diff: ledger.mulStrikePowerMultiplier(baseStrikeAmount).mul(-1),
                        },
                    },
                ]);
            });
        });
    });

    describe("LedgerPositionLogic", () => {
        async function initLedgerFixture() {
            const { signers, ithaca } = await loadFixture(deployIthaca);

            const ledger = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );

            const [client1, client2, client3, client4] = signers;
            const depositValue = BigNumber.from(30);

            const [underlying, strike] = [ledger.underlying.token, ledger.strike.token];

            await [client1, client2, client3, client3].reduce(async (acc, client) => {
                await acc;
                // Manipulate local balance
                await setStorageAt(
                    WETH_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, WETH_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
                await setStorageAt(
                    USDC_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, USDC_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
                await ithaca.deposit(client, underlying.address, await scaleUp(underlying, depositValue));
                await ithaca.deposit(client, strike.address, await scaleUp(strike, depositValue));
            }, Promise.resolve());

            return {
                signers,
                ithaca,
                ledger,
                client1,
                client2,
                client3,
                client4,
            };
        }

        let ithaca: Ithaca;
        let ledger: IthacaLedger;
        let client1: SignerWithAddress;
        let client2: SignerWithAddress;
        let client3: SignerWithAddress;
        let client4: SignerWithAddress;
        let positions: ILedger.PositionParamStruct[];
        let fundMovements: ILedger.FundMovementParamStruct[];
        let contractId: number;

        beforeEach(async () => {
            ({ ithaca, ledger, client1, client2, client3, client4 } = await loadFixture(initLedgerFixture));
            contractId = contractIdGenerator();
            positions = [
                { client: client1.address, contractId, size: 1 },
                { client: client2.address, contractId, size: -1 },
                { client: client3.address, contractId, size: -1 },
                { client: client4.address, contractId, size: 1 },
            ];
            fundMovements = [
                { client: client1.address, underlyingAmount: 1, strikeAmount: 1 },
                { client: client2.address, underlyingAmount: -1, strikeAmount: -1 },
                { client: client3.address, underlyingAmount: 1, strikeAmount: 1 },
                { client: client4.address, underlyingAmount: -1, strikeAmount: -1 },
            ];
        });

        describe("revert with invalid arguments", () => {
            it("should revert if positions array is empty", async function () {
                await expect(ledger.updatePositions(positions, backendIdGenerator())).to.be.fulfilled;

                await expect(ledger.updatePositions([], backendIdGenerator())).to.be.rejectedWith("EmptyArray()");
            });

            it("should revert if fund movements array is empty", async function () {
                await expect(ledger.updateFundMovements(fundMovements, backendIdGenerator())).to.be.fulfilled;

                await expect(ledger.updateFundMovements([], backendIdGenerator())).to.be.rejectedWith("EmptyArray()");
            });

            it("should not match if data is valid and sender is not an utility account", async function () {
                await expect(ledger.ledger.updatePositions(positions, backendIdGenerator())).to.be.rejectedWith(
                    `AccessControlUnauthorizedAccount(\\"${await ledger.ithaca.admin.getAddress()}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
                );

                await expect(ledger.ledger.updateFundMovements(fundMovements, backendIdGenerator())).to.be.rejectedWith(
                    `AccessControlUnauthorizedAccount(\\"${await ledger.ithaca.admin.getAddress()}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
                );
            });

            it("should revert when FundsMovement has a row with 0 as underlying amount as well as strike amount", async function () {
                await expect(
                    ledger.updateFundMovements(
                        [{ client: client1.address, underlyingAmount: 0, strikeAmount: 0 }],
                        backendIdGenerator()
                    )
                ).to.be.rejectedWith("EmptyArray()");
            });
        });

        describe("update with valid arguments", () => {
            it("should successfully match when provided data is valid and sender is utility account", async function () {
                await expect(ledger.updatePositions(positions, backendIdGenerator())).to.be.fulfilled;

                await expect(ledger.updateFundMovements(fundMovements, backendIdGenerator())).to.be.fulfilled;
            });

            it("should fire Emitter update events with correct backendId on position update", async function () {
                const backendId = backendIdGenerator();
                const tx = await ledger.updatePositions(positions, backendId);
                await expect(tx).to.emit(ledger.ledger, "PositionsUpdated").withArgs(backendId);
            });

            it("should fire FundLock and Emitter update events with correct backendId on fund movement update", async function () {
                const backendId = backendIdGenerator();
                const tx = await ledger.updateFundMovements(fundMovements, backendId);
                await expect(tx).to.emit(ledger.ledger, "FundMovementsUpdated").withArgs(backendId);

                const traders = fundMovements.flatMap((movement) =>
                    (movement.underlyingAmount !== 0 ? [movement.client] : []).concat(
                        movement.strikeAmount !== 0 ? [movement.client] : []
                    )
                );
                const amounts = await Promise.all(
                    fundMovements.map(async (movement) => [
                        ledger
                            .strikePowerMultiplier()
                            .mul(await movement.strikeAmount)
                            .mul(-1),
                        ledger
                            .underlyingPowerMultiplier()
                            .mul(await movement.underlyingAmount)
                            .mul(-1),
                    ])
                );
                const tokens = Array.from({ length: amounts.length }, (_, index) =>
                    index % 2 === 0 ? ledger.strike.token.address : ledger.underlying.token.address
                );
                await expect(tx)
                    .to.emit(ledger.ithaca.fundLock, "BalancesUpdated")
                    .withArgs(traders, tokens, amounts.flat(), backendId);
            });

            it("should update clientPositions correctly", async function () {
                const positionsBefore = await Promise.all(
                    [client1, client2, client3, client4].map((client) => {
                        return ledger.position(contractId, client.address);
                    })
                );

                await ledger.updatePositions(positions, backendIdGenerator());

                const positionsAfter = await Promise.all(
                    [client1, client2, client3, client4].map((client) => {
                        return ledger.position(contractId, client.address);
                    })
                );

                positionsAfter.forEach((after, idx) =>
                    expect(after.sub(positionsBefore[idx])).to.eq(positions[idx].size)
                );
            });

            it("should update FundLock balances correctly", async function () {
                const balanceBefore = await Promise.all(
                    [client1, client2, client3, client4].map((client) => ledger.balanceOf(client.address))
                );
                await ledger.updateFundMovements(fundMovements, backendIdGenerator());
                const balanceAfter = await Promise.all(
                    [client1, client2, client3, client4].map((client) => ledger.balanceOf(client.address))
                );

                await Promise.all(
                    balanceAfter.map(async ({ underlying, strike }, idx) => {
                        expect(underlying.sub(balanceBefore[idx].underlying)).to.eq(
                            ledger
                                .underlyingPowerMultiplier()
                                .mul(await fundMovements[idx].underlyingAmount)
                                .mul(-1)
                        );
                        expect(strike.sub(balanceBefore[idx].strike)).to.eq(
                            ledger
                                .strikePowerMultiplier()
                                .mul(await fundMovements[idx].strikeAmount)
                                .mul(-1)
                        );
                    })
                );
            });

            it("should update and use fundsToWithdraw", async function () {
                const backendId = backendIdGenerator();
                const balanceBeforeWithdraw = await ithaca.fundLock.balanceSheet(
                    client2.address,
                    ledger.strike.token.address
                );
                expect(balanceBeforeWithdraw).to.gt(0);

                const toWithdraw = balanceBeforeWithdraw.div(2);

                await ithaca.fundLock.connect(client2).withdraw(ledger.strike.token.address, toWithdraw);
                const balanceAfterWithdraw = await ithaca.fundLock.balanceSheet(
                    client2.address,
                    ledger.strike.token.address
                );
                const { value: withdrawBalanceAfterWithdraw } = await ithaca.fundLock.fundsToWithdraw(
                    client2.address,
                    ledger.strike.token.address,
                    0
                );
                expect(withdrawBalanceAfterWithdraw).to.eq(toWithdraw);
                expect(balanceAfterWithdraw).to.eq(balanceBeforeWithdraw.sub(toWithdraw));

                const fundMovements2 = [{ ...fundMovements[0] }, { ...fundMovements[1] }];
                fundMovements2[0].strikeAmount = balanceAfterWithdraw
                    .div(await ledger.strikePowerMultiplier())
                    .add(2)
                    .mul(-1);
                fundMovements2[1].strikeAmount = balanceAfterWithdraw.div(await ledger.strikePowerMultiplier()).add(2);

                await ledger.updatePositions(positions.slice(0, 2), backendId);

                await ledger.updateFundMovements(fundMovements2, backendId);

                expect(await ithaca.fundLock.balanceSheet(client2.address, ledger.strike.token.address)).to.eq(0);
                expect(
                    (await ithaca.fundLock.fundsToWithdraw(client2.address, ledger.strike.token.address, 0)).value
                ).to.eq(withdrawBalanceAfterWithdraw.sub(ledger.mulStrikePowerMultiplier(2)));
            });

            it("should revert when a user's fundsToWithdraw are insufficient", async function () {
                const balanceBeforeWithdraw = await ithaca.fundLock.balanceSheet(
                    client1.address,
                    ledger.strike.token.address
                );
                const toWithdraw = balanceBeforeWithdraw.div(2);

                await ithaca.fundLock.connect(client1).withdraw(ledger.strike.token.address, toWithdraw);

                const fundMovements2 = [{ ...fundMovements[0] }, { ...fundMovements[1] }];
                fundMovements2[0].strikeAmount = balanceBeforeWithdraw.div(ledger.strikePowerMultiplier()).add(10);
                fundMovements2[1].strikeAmount = balanceBeforeWithdraw
                    .div(ledger.strikePowerMultiplier())
                    .add(10)
                    .mul(-1);

                const backendId = backendIdGenerator();
                await expect(ledger.updateFundMovements(fundMovements2, backendId)).to.be.rejectedWith(
                    `FundFromWithdrawnFailed(\\"${client1.address}\\", \\"${ledger.strike.token.address}\\", 15001000)`
                );
            });
        });
    });

    describe("LedgerPosition", () => {
        async function initLedgerFixture() {
            const { signers, ithaca } = await loadFixture(deployIthaca);

            const ledger = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );

            const [client1, client2, client3] = signers;
            const depositValue = BigNumber.from(30000);

            await [client1, client2, client3].reduce(async (acc, client) => {
                await acc;
                // Manipulate local balance
                await setStorageAt(
                    WETH_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, WETH_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
                await setStorageAt(
                    USDC_ADDRESS,
                    ethers.utils.solidityKeccak256(["uint256", "uint256"], [client.address, USDC_SLOT]),
                    ethers.utils.formatBytes32String(depositValue.toString())
                );
            }, Promise.resolve());

            return {
                signers,
                ithaca,
                ledger,
                client1,
                client2,
                client3,
            };
        }

        let ithaca: Ithaca;
        let ledger: IthacaLedger;
        let client1: SignerWithAddress;
        let client2: SignerWithAddress;
        let client3: SignerWithAddress;

        beforeEach(async () => {
            ({ ithaca, ledger, client1, client2, client3 } = await loadFixture(initLedgerFixture));
        });

        it("Single Call", async () => {
            const contractId = contractIdGenerator();
            // FL Client1 (BTC/USD): 1/1000
            // FL Client2 (BTC/USD): 1/1000
            // FL Client3 (BTC/USD): 1/1000

            const deposits = [
                {
                    address: client1,
                    underlyingAmount: 1,
                    strikeAmount: 1000,
                },
                {
                    address: client2,
                    underlyingAmount: 1,
                    strikeAmount: 1000,
                },
                {
                    address: client3,
                    underlyingAmount: 1,
                    strikeAmount: 1000,
                },
            ];

            await deposits.reduce(async (acc, { address, underlyingAmount, strikeAmount }) => {
                await acc;
                await ithaca.deposit(
                    address,
                    ledger.underlying.token.address,
                    await scaleUp(ledger.underlying.token, underlyingAmount)
                );
                await ithaca.deposit(
                    address,
                    ledger.strike.token.address,
                    await scaleUp(ledger.strike.token, strikeAmount)
                );
                return null;
            }, Promise.resolve(null));

            // ---- Match#1
            // Client1 sells call positions, quantity 1BTC
            // Client2 buys call positions, quantity 1BTC
            // Price $100.

            // -- Original movements:
            // Client2 -($100)-> Client1 (premium)
            // Cilent1 -(1BTC)-> Pool (collateral)

            // -- Position updates:
            // Client1 CALL -1
            // Client2 CALL +1

            // -- New function arguments:
            // NOTE: values are scaled up. BTC precision 10^8. USD precision 10^4.
            // UpdatePosition:
            // Address  [Client1,    Client2]
            // Contract [CALL,       CALL]
            // Position [-100_000_000, +100_000_000]

            // MoveFunds, arguments:
            // Address        [Client1,   Client2]
            // Target         [FundLock,  FundLock]
            // UnderlierAmount  [100_000_000, 0]
            // StrikeAmount     [-1_000_000,  1_000_000]
            await (async () => {
                const positions = [
                    {
                        client: client1.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(-1),
                    },
                    {
                        client: client2.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(1),
                    },
                ];
                const fundMovements = [
                    {
                        client: client1.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(1),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(-100),
                    },
                    {
                        client: client2.address,
                        underlyingAmount: 0,
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(100),
                    },
                ];

                const backendId = backendIdGenerator();
                const positionsTx = await ledger.updatePositions(positions, backendId);
                const fundMovementsTx = await ledger.updateFundMovements(fundMovements, backendId);

                // -- Results:
                // Total amount in the pool (BTC/USD): 100_000_000/0

                // CALL Position client1:               -100_000_000
                expect(await ledger.position(contractId, client1.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(-1)
                );
                // CALL Position client2:               +100_000_000
                expect(await ledger.position(contractId, client2.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(1)
                );
                // FL client1 (BTC/USD):               0/11_000_000
                const client1Balance = await ledger.balanceOf(client1.address);
                expect(client1Balance.underlying).to.eq(0);
                expect(client1Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(1100));
                // FL client2 (BTC/USD):               100_000_000/9_000_000
                const client2Balance = await ledger.balanceOf(client2.address);
                expect(client2Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier());
                expect(client2Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(900));
                await expect(positionsTx).to.emit(ledger.ledger, "PositionsUpdated").withArgs(backendId);
                await expect(fundMovementsTx).to.emit(ledger.ledger, "FundMovementsUpdated").withArgs(backendId);
            })();
            // ---- Match#2
            // Client1 buys 1 call positions, quantity 1BTC
            // Client3 sells 1 call positions, quantity 1BTC
            // Price $70.

            // -- Original movements:
            // Client1 -($70)-> Client3 (premium)
            // Cilent3 -(1BTC)-> Pool (collateral)
            // Pool    -(1BTC)-> Client1 (collateral back)

            // -- Position updates:
            // Client1 CALL +1
            // Client3 CALL -1

            // -- New function arguments:
            // NOTE: values are scaled up. BTC precision 10^8. USD precision 10^4.
            // UpdatePosition:
            //  Address  [Client1,    Client3]
            //  Contract [CALL,       CALL]
            //  Position [+100_000_000, -100_000_000]

            // MoveFunds, arguments
            //  Address        [Client1,    Client3]
            //  Target         [FundLock,   FundLock]
            //  UnderlierAmount  [-100_000_000, 100_000_000]
            //  StrikeAmount       [700_000,     -700_000]
            await (async () => {
                const positions = [
                    {
                        client: client1.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier(),
                    },
                    {
                        client: client3.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(-1),
                    },
                ];
                const fundMovements = [
                    {
                        client: client1.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(-1),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(70),
                    },
                    {
                        client: client3.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(1),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(-70),
                    },
                ];
                const backendId = backendIdGenerator();

                const positionsTx = await ledger.updatePositions(positions, backendId);
                const fundMovementsTx = await ledger.updateFundMovements(fundMovements, backendId);

                // -- Results:
                // Total amount in the pool (BTC/USD): 100_000_000/0

                // CALL Position client1:               0
                expect(await ledger.position(contractId, client1.address)).to.eq(0);
                // CALL Position client2:               +100_000_000
                expect(await ledger.position(contractId, client2.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(1)
                );
                // CALL Position client3:               -100_000_000
                expect(await ledger.position(contractId, client3.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(-1)
                );

                // FL client1 (BTC/USD):               100_000_000/10_300_000
                const client1Balance = await ledger.balanceOf(client1.address);
                expect(client1Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(1));
                expect(client1Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(1030));

                // FL client2 (BTC/USD):               100_000_000/9_000_000
                const client2Balance = await ledger.balanceOf(client2.address);
                expect(client2Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(1));
                expect(client2Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(900));

                // FL client3 (BTC/USD):               0/10_700_000
                const client3Balance = await ledger.balanceOf(client3.address);
                expect(client3Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client3Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(1070));

                await expect(positionsTx).to.emit(ledger.ledger, "PositionsUpdated").withArgs(backendId);
                await expect(fundMovementsTx).to.emit(ledger.ledger, "FundMovementsUpdated").withArgs(backendId);
            })();
        });

        it("Single Put", async () => {
            const contractId = contractIdGenerator();
            // ---- Original balance
            // FL Client1 (BTC/USD): 0/30_000
            // FL Client2 (BTC/USD): 0/30_000
            // FL Client3 (BTC/USD): 0/30_000
            await [
                {
                    address: client1,
                    underlyingAmount: 0,
                    strikeAmount: 30_000,
                },
                {
                    address: client2,
                    underlyingAmount: 0,
                    strikeAmount: 30_000,
                },
                {
                    address: client3,
                    underlyingAmount: 0,
                    strikeAmount: 30_000,
                },
            ].reduce(async (acc, { address, underlyingAmount, strikeAmount }) => {
                await acc;
                if (underlyingAmount > 0) {
                    await ithaca.deposit(
                        address,
                        ledger.underlying.token.address,
                        ledger.underlyingDecimalsMultiplier().mul(underlyingAmount)
                    );
                }
                if (strikeAmount > 0) {
                    await ithaca.deposit(
                        address,
                        ledger.strike.token.address,
                        ledger.strikeDecimalsMultiplier().mul(strikeAmount)
                    );
                }
            }, Promise.resolve());

            // ---- Match#1
            // Client1 sells put positions, quantity 2BTC
            // Client2 buys put positions, quantity 2BTC
            // Price $100. Strike $10_000.

            // -- Original movements:
            // Client2 -($200)-> Client1 (premium)
            // Cilent1 -($20_000)-> Pool (collateral)

            // -- Position updates:
            // Client1 PUT -2
            // Client2 PUT +2

            // -- New function arguments:
            // NOTE: values are scaled up. BTC precision 10^8. USD precision 10^4.
            // UpdatePosition:
            // Address  [Client1,    Client2]
            // Contract [PUT,        PUT]
            // Position [-200_000_000, +200_000_000]

            // MoveFunds, arguments:
            // Address        [Client1,    Client2]
            // Target         [FundLock,   FundLock]
            // UnderlierAmount  [0,          0]
            // StrikeAmount       [198_000_000,  2_000_000]
            await (async () => {
                const positions = [
                    {
                        client: client1.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(-2),
                    },
                    {
                        client: client2.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(2),
                    },
                ];
                const fundMovements = [
                    {
                        client: client1.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(0),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(19800),
                    },
                    {
                        client: client2.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(0),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(200),
                    },
                ];
                const backendId = backendIdGenerator();

                const positionsTx = await ledger.updatePositions(positions, backendId);
                const fundMovementsTx = await ledger.updateFundMovements(fundMovements, backendId);

                // -- Results:
                // Total amount in the pool (BTC/USD): 0/200_000_000

                // PUT Position client1:               -200_000_000
                expect(await ledger.position(contractId, client1.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(-2)
                );
                // PUT Position client2:               +200_000_000
                expect(await ledger.position(contractId, client2.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(2)
                );
                // FL client1 (BTC/USD):               0/102_000_000
                const client1Balance = await ledger.balanceOf(client1.address);
                expect(client1Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client1Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(10200));
                // FL client2 (BTC/USD):               0/298_000_000
                const client2Balance = await ledger.balanceOf(client2.address);
                expect(client2Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client2Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(29800));

                await expect(positionsTx).to.emit(ledger.ledger, "PositionsUpdated").withArgs(backendId);
                await expect(fundMovementsTx).to.emit(ledger.ledger, "FundMovementsUpdated").withArgs(backendId);
            })();

            // ---- Match#2
            // Client1 buys put positions, quantity 1BTC
            // Client3 sells put positions, quantity 1BTC
            // Price $70.

            // -- Original movements:
            // Client1 -($70)-> Client3 (premium)
            // Cilent3 -($10000)-> Pool (collateral)
            // Pool    -($10000)-> Client1 (collateral back)

            // -- Position updates:
            // Client1 PUT +1
            // Client3 PUT -1

            // -- New function arguments:
            // NOTE: values are scaled up. BTC precision 10^8. USD precision 10^4.
            // UpdatePosition:
            //  Address  [Client1,    Client3]
            //  Contract [PUT,        PUT]
            //  Position [+100_000_000, -100_000_000]

            // MoveFunds, arguments:
            //  Address        [Client1,    Client3]
            //  Target         [FundLock,   FundLock]
            //  UnderlierAmount  [0,          0]
            //  StrikeAmount       [-99_300_000,  99_300_000]
            await (async () => {
                const positions = [
                    {
                        client: client1.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(1),
                    },
                    {
                        client: client3.address,
                        contractId,
                        size: ledger.underlyingPrecisionMultiplier().mul(-1),
                    },
                ];
                const fundMovements = [
                    {
                        client: client1.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(0),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(-9930),
                    },
                    {
                        client: client3.address,
                        underlyingAmount: ledger.underlyingPrecisionMultiplier().mul(0),
                        strikeAmount: ledger.strikePrecisionMultiplier().mul(9930),
                    },
                ];
                const backendId = backendIdGenerator();

                const positionsTx = await ledger.updatePositions(positions, backendId);
                const fundMovementsTx = await ledger.updateFundMovements(fundMovements, backendId);

                // -- Results:
                // Total amount in the pool (BTC/USD): 0/200_000_000

                // PUT Position client1:               -100_000_000
                expect(await ledger.position(contractId, client1.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(-1)
                );
                // PUT Position client2:               +200_000_000
                expect(await ledger.position(contractId, client2.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(2)
                );
                // PUT Position client3:               -100_000_000
                expect(await ledger.position(contractId, client3.address)).to.eq(
                    ledger.underlyingPrecisionMultiplier().mul(-1)
                );
                // FL client1 (BTC/USD):               0/201_300_000
                const client1Balance = await ledger.balanceOf(client1.address);
                expect(client1Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client1Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(20130));
                // FL client2 (BTC/USD):               0/298_000_000
                const client2Balance = await ledger.balanceOf(client2.address);
                expect(client2Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client2Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(29800));
                // FL client3 (BTC/USD):               0/200_700_00
                const client3Balance = await ledger.balanceOf(client3.address);
                expect(client3Balance.underlying).to.eq(ledger.underlyingDecimalsMultiplier().mul(0));
                expect(client3Balance.strike).to.eq(ledger.strikeDecimalsMultiplier().mul(20070));

                await expect(positionsTx).to.emit(ledger.ledger, "PositionsUpdated").withArgs(backendId);
                await expect(fundMovementsTx).to.emit(ledger.ledger, "FundMovementsUpdated").withArgs(backendId);
            })();
        });
    });

    describe("Upgradeability", () => {
        let ithaca: Ithaca;
        let ithacaLedger: IthacaLedger;
        let admin: SignerWithAddress;
        let beaconProxy: LedgerBeaconProxy;

        const upgrade = async () => {
            beaconProxy = await ethers.getContractAt("LedgerBeaconProxy", ithacaLedger.ledger.address);
            await upgradeBeacon(beaconProxy, new LedgerUpgraded__factory(admin));
        };

        beforeEach(async () => {
            ({ ithaca, admin } = await loadFixture(deployIthaca));
            ithacaLedger = await ithaca.deployLedger(
                { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
                { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
            );
            await loadFixture(upgrade);
        });

        it("should pass general upgrade tests", async () => {
            await generalUpgradeTests(beaconProxy, new LedgerUpgraded__factory(admin), true);
        });
    });
});
