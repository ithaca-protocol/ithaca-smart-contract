import { beforeEach } from "mocha";
import { Ithaca, IthacaLedger } from "../fixtures/ithaca";
import { loadFixture, mineUpTo, setStorageAt, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployIthaca } from "../fixtures/deploy.ithaca";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AaveV3Strategy, ERC20__factory, IAToken__factory } from "../../typechain-types";
import { ethers } from "hardhat";
import { constants } from "ethers";
import {
    AAVE_V3_POOL_ADDRESS,
    AUSDC_ADDRESS,
    USDC_ADDRESS,
    USDC_DECIMAL,
    USDC_PRECISION,
    USDC_SLOT,
    WETH_DECIMAL,
    WETH_PRECISION,
    generalUpgradeTests,
} from "../fixtures/helpers";
import { expect } from "chai";
import { BASE_MULTIPLIER } from "../fixtures/fund.lock.helpers";
import { AaveV3StrategyUpgraded__factory } from "../../typechain-types/factories/contracts/mocks/AaveV3StrategyUpgraded__factory";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { latestBlock } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import { DEFAULT_RELEASE_LOCK } from "../../src/constants";

describe("AaveV3Strategy", () => {
    let admin: SignerWithAddress;
    let utilityAccount: SignerWithAddress;
    let client1: SignerWithAddress;
    let client2: SignerWithAddress;
    let client3: SignerWithAddress;
    let ithaca: Ithaca;
    let ithacaLedger: IthacaLedger;
    let aaveV3Strategy: AaveV3Strategy;

    beforeEach(async () => {
        ({
            admin,
            utilityAccount,
            signers: [client1, client2, client3],
            ithaca,
        } = await loadFixture(deployIthaca));
        ithacaLedger = await ithaca.deployLedger(
            { decimals: WETH_DECIMAL, precision: WETH_PRECISION },
            { decimals: USDC_DECIMAL, precision: USDC_PRECISION }
        );
        const aaveV3StrategyImpl = await ethers.deployContract("AaveV3Strategy", admin);
        const { accessController, fundLock, registry, tokenValidator } = ithaca;
        const encodedInitializationData = aaveV3StrategyImpl.interface.encodeFunctionData("initialize", [
            accessController.address,
            fundLock.address,
            ithacaLedger.strike.token.address,
            AUSDC_ADDRESS,
            constants.Zero,
            AAVE_V3_POOL_ADDRESS,
        ]);
        const aaveV3StrategyProxy = await ethers.deployContract(
            "ERC1967Proxy",
            [aaveV3StrategyImpl.address, encodedInitializationData],
            admin
        );
        aaveV3Strategy = await ethers.getContractAt("AaveV3Strategy", aaveV3StrategyProxy.address);
        await ithaca.fundLock.setTokenStrategy(USDC_ADDRESS, aaveV3Strategy.address);
    });

    describe("Initialization", () => {
        it("should initialize with correct value", async () => {
            expect(await aaveV3Strategy.fundlock()).to.be.equal(ithaca.fundLock.address);
            expect(await aaveV3Strategy.supplyingAsset()).to.be.equal(USDC_ADDRESS);
            expect(await aaveV3Strategy.yieldBearingAsset()).to.be.equal(AUSDC_ADDRESS);
            expect(await aaveV3Strategy.depositThreshold()).to.be.equal(constants.Zero);
            expect(await aaveV3Strategy.maxManagingRatio()).to.be.equal(BASE_MULTIPLIER);
            expect(await aaveV3Strategy.aavePool()).to.be.equal(AAVE_V3_POOL_ADDRESS);
        });
    });

    describe("Utilize", () => {
        let depositAmount = parseUnits("1000", USDC_DECIMAL);

        beforeEach(async () => {
            // Manipulate local balance
            await setStorageAt(
                USDC_ADDRESS,
                ethers.utils.solidityKeccak256(["uint256", "uint256"], [client1.address, USDC_SLOT]),
                ethers.utils.formatBytes32String(depositAmount.toString())
            );
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
        });

        it("should utilize fundlock balance and supply to aave pool", async () => {
            const fundlockBalanceBefore = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const fundlockBalanceAfter = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);

            expect(fundlockBalanceAfter).to.be.equal(fundlockBalanceBefore.sub(depositAmount));
            expect(await aaveV3Strategy.managingFund()).to.be.gte(depositAmount);
            expect(await aaveV3Strategy.currentManagingRatio()).to.be.equal(BASE_MULTIPLIER);
        });

        it("should emit FundPulled event with correct values", async () => {
            await expect(aaveV3Strategy.connect(utilityAccount).adjustFund())
                .to.emit(aaveV3Strategy, "FundPulled")
                .withArgs(ithaca.fundLock.address, depositAmount);
        });

        it("should unutilize excess funds after managing ratio change", async () => {
            const fundlockBalanceBefore1 = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const fundlockBalanceAfter1 = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);

            const managingFund = await aaveV3Strategy.managingFund();
            expect(fundlockBalanceAfter1).to.be.equal(fundlockBalanceBefore1.sub(depositAmount));
            expect(managingFund).to.be.gte(depositAmount);
            expect(await aaveV3Strategy.currentManagingRatio()).to.be.equal(BASE_MULTIPLIER);

            await aaveV3Strategy.setMaxManagingRatio(parseEther("0.9"));
            const fundlockBalanceBefore2 = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const fundlockBalanceAfter2 = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);

            const totalValueAll = await aaveV3Strategy.totalValueAll();
            const currentManagingRatio = await aaveV3Strategy.currentManagingRatio();
            const expectedManagingFund = totalValueAll.mul(currentManagingRatio).div(BASE_MULTIPLIER);
            const expectedWithdrawal = managingFund.sub(expectedManagingFund);

            expect(fundlockBalanceAfter2).to.be.equal(fundlockBalanceBefore2.add(expectedWithdrawal));
            expect(await aaveV3Strategy.managingFund()).to.be.gte(expectedManagingFund);
            expect(currentManagingRatio).to.be.closeTo(parseEther("0.9"), parseEther("0.001"));
        });
    });

    describe("Unutilize", () => {
        const depositAmount = parseUnits("100", USDC_DECIMAL);

        beforeEach(async () => {
            // Manipulate local balance
            await setStorageAt(
                USDC_ADDRESS,
                ethers.utils.solidityKeccak256(["uint256", "uint256"], [client1.address, USDC_SLOT]),
                ethers.utils.formatBytes32String(depositAmount.toString())
            );
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);
        });

        it("should withdraw from aave pool and return funds to fundlock", async () => {
            const withdrawAmount = parseUnits("10", USDC_DECIMAL);
            const clientBalanceBefore = await ithacaLedger.strike.token.balanceOf(client1.address);
            await ithaca.fundLock.connect(client1).withdraw(ithacaLedger.strike.token.address, withdrawAmount);
            const now = await time.latest();
            await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);
            await ithaca.fundLock.connect(client1).release(ithacaLedger.strike.token.address, 0);
            const clientBalanceAfter = await ithacaLedger.strike.token.balanceOf(client1.address);

            expect(clientBalanceAfter).to.be.equal(clientBalanceBefore.add(withdrawAmount));
        });

        it("should withdraw all funds", async () => {
            const managingFundBefore = await aaveV3Strategy.managingFund();
            const fundlockBalanceBefore = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);
            await ithaca.fundLock.setTokenStrategy(ithacaLedger.strike.token.address, constants.AddressZero);
            const fundlockBalanceAfter = await ithacaLedger.strike.token.balanceOf(ithaca.fundLock.address);

            expect(fundlockBalanceAfter).to.be.gte(fundlockBalanceBefore.add(managingFundBefore));
            expect(await aaveV3Strategy.managingFund()).to.equal(constants.Zero);
            expect(await aaveV3Strategy.currentManagingRatio()).to.equal(constants.Zero);
        });

        it("should emit FundReturned event with correct values", async () => {
            const withdrawAmount = parseUnits("10", USDC_DECIMAL);
            await ithaca.fundLock.connect(client1).withdraw(ithacaLedger.strike.token.address, withdrawAmount);
            const now = await time.latest();
            await time.increaseTo(now + DEFAULT_RELEASE_LOCK + 1);

            await expect(ithaca.fundLock.connect(client1).release(ithacaLedger.strike.token.address, 0))
                .to.emit(aaveV3Strategy, "FundReturned")
                .withArgs(ithaca.fundLock.address, withdrawAmount);
        });
    });

    describe("Yield distribution", () => {
        const depositAmount = parseUnits("1000", USDC_DECIMAL);

        beforeEach(async () => {
            // Manipulate local balance
            await setStorageAt(
                USDC_ADDRESS,
                ethers.utils.solidityKeccak256(["uint256", "uint256"], [client1.address, USDC_SLOT]),
                ethers.utils.formatBytes32String(depositAmount.toString())
            );
            await setStorageAt(
                USDC_ADDRESS,
                ethers.utils.solidityKeccak256(["uint256", "uint256"], [client2.address, USDC_SLOT]),
                ethers.utils.formatBytes32String(depositAmount.toString())
            );
            await setStorageAt(
                USDC_ADDRESS,
                ethers.utils.solidityKeccak256(["uint256", "uint256"], [client3.address, USDC_SLOT]),
                ethers.utils.formatBytes32String(depositAmount.toString())
            );
        });

        it("should emit YieldDistributed event", async () => {
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            await expect(aaveV3Strategy.connect(client1).distributeYield(client1.address)).to.emit(
                ithaca.fundLock,
                "YieldDistributed"
            );
        });

        it("should distribute all yield to client1 when he is the sole depositor", async () => {
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            const currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            const client1Yield = await aaveV3Strategy.userYield(client1.address);
            const clientFundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            await aaveV3Strategy.connect(client1).distributeYield(client1.address);
            const clientFundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);

            expect(clientFundlockBalanceAfter).to.be.gte(clientFundlockBalanceBefore.add(client1Yield));
        });

        it("should distribute yield to all clients equally if duration and amount of deposit is same", async () => {
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await ithacaLedger.strike.token.connect(client2).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client2).deposit(client2.address, USDC_ADDRESS, depositAmount);
            await ithacaLedger.strike.token.connect(client3).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client3).deposit(client3.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();

            const currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            const client1Yield = await aaveV3Strategy.userYield(client1.address);
            const client2Yield = await aaveV3Strategy.userYield(client2.address);
            const client3Yield = await aaveV3Strategy.userYield(client3.address);
            const client1FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);
            const client3FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client3.address, USDC_ADDRESS);

            await aaveV3Strategy.connect(client1).distributeYield(client1.address);
            await aaveV3Strategy.connect(client2).distributeYield(client2.address);
            await aaveV3Strategy.connect(client3).distributeYield(client3.address);

            const client1FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);
            const client3FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client3.address, USDC_ADDRESS);

            expect(client1Yield).to.be.equal(client2Yield).to.be.equal(client3Yield).to.not.equal(0);
            expect(client1FundlockBalanceAfter).to.be.gte(client1FundlockBalanceBefore.add(client1Yield));
            expect(client2FundlockBalanceAfter).to.be.gte(client2FundlockBalanceBefore.add(client2Yield));
            expect(client3FundlockBalanceAfter).to.be.gte(client3FundlockBalanceBefore.add(client3Yield));
        });

        it("should distribute yield to all clients proportionally even if funds of some clients are not supplied to aave", async () => {
            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();
            let currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            await ithacaLedger.strike.token.connect(client2).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client2).deposit(client2.address, USDC_ADDRESS, depositAmount);
            await ithacaLedger.strike.token.connect(client3).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client3).deposit(client3.address, USDC_ADDRESS, depositAmount);
            currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            const client1Yield = await aaveV3Strategy.userYield(client1.address);
            const client2Yield = await aaveV3Strategy.userYield(client2.address);
            const client3Yield = await aaveV3Strategy.userYield(client3.address);
            const client1FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);
            const client3FundlockBalanceBefore = await ithaca.fundLock.balanceSheet(client3.address, USDC_ADDRESS);

            await aaveV3Strategy.connect(client1).distributeYield(client1.address);
            await aaveV3Strategy.connect(client2).distributeYield(client2.address);
            await aaveV3Strategy.connect(client3).distributeYield(client3.address);

            const client1FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);
            const client3FundlockBalanceAfter = await ithaca.fundLock.balanceSheet(client3.address, USDC_ADDRESS);

            expect(client1Yield).to.be.gt(client2Yield);
            expect(client1Yield).to.be.gt(client3Yield);
            expect(client2Yield).to.be.gte(client3Yield);
            expect(client1FundlockBalanceAfter).to.be.gte(client1FundlockBalanceBefore.add(client1Yield));
            expect(client2FundlockBalanceAfter).to.be.gte(client2FundlockBalanceBefore.add(client2Yield));
            expect(client3FundlockBalanceAfter).to.be.gte(client3FundlockBalanceBefore.add(client3Yield));
        });

        it("should not lose yield to funds in withdrawal queue", async () => {
            const withdrawAmount = parseUnits("500", 6);

            await ithacaLedger.strike.token.connect(client1).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client1).deposit(client1.address, USDC_ADDRESS, depositAmount);
            await ithacaLedger.strike.token.connect(client2).approve(ithaca.fundLock.address, depositAmount);
            await ithaca.fundLock.connect(client2).deposit(client2.address, USDC_ADDRESS, depositAmount);
            await aaveV3Strategy.connect(utilityAccount).adjustFund();

            let currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            const client1Yield1 = await aaveV3Strategy.userYield(client1.address);
            const client2Yield1 = await aaveV3Strategy.userYield(client2.address);
            const client1FundlockBalanceBefore1 = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceBefore1 = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);

            await ithaca.fundLock.connect(client1).withdraw(USDC_ADDRESS, withdrawAmount);
            await aaveV3Strategy.connect(client2).distributeYield(client2.address);

            const client1FundlockBalanceAfter1 = await ithaca.fundLock.balanceSheet(client1.address, USDC_ADDRESS);
            const client2FundlockBalanceAfter1 = await ithaca.fundLock.balanceSheet(client2.address, USDC_ADDRESS);

            expect(client1Yield1).to.be.equal(client2Yield1).to.not.equal(0);
            expect(client1FundlockBalanceAfter1).to.be.gte(
                client1FundlockBalanceBefore1.sub(withdrawAmount).add(client1Yield1)
            );
            expect(client2FundlockBalanceAfter1).to.be.gte(client2FundlockBalanceBefore1.add(client2Yield1));

            currentBlock = await latestBlock();
            await mineUpTo(currentBlock + 10);

            const aUSDC = IAToken__factory.connect(AUSDC_ADDRESS, admin);
            const scaledBalance = await aUSDC.scaledBalanceOf(aaveV3Strategy.address);
            const previousIndex = await aUSDC.getPreviousIndex(aaveV3Strategy.address);
            const initialSuppliedAmount = scaledBalance.mul(previousIndex);
            const aUSDCBalance = await ERC20__factory.connect(AUSDC_ADDRESS, admin).balanceOf(aaveV3Strategy.address);
            const totalYieldEarned = aUSDCBalance.sub(initialSuppliedAmount.div(parseUnits("1", 27)));

            const client1Yield2 = await aaveV3Strategy.userYield(client1.address);
            const client2Yield2 = await aaveV3Strategy.userYield(client2.address);

            expect(client1Yield2).to.not.equal(0);
            expect(client1Yield2).to.not.be.equal(client2Yield2);
            expect(client2Yield2).to.be.gte(client1Yield2.mul(2));
            expect(client1Yield1.add(client2Yield1).add(client1Yield2).add(client2Yield2)).to.be.closeTo(
                totalYieldEarned,
                2
            );
        });
    });

    describe("Upgradeability", () => {
        it("should pass general upgrade tests", async () => {
            await generalUpgradeTests(aaveV3Strategy, new AaveV3StrategyUpgraded__factory(admin));
        });
    });
});
