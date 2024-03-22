import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ADMIN_ROLE, DEFAULT_RELEASE_LOCK, DEFAULT_TRADE_LOCK } from "../src/constants";
import {
    deployAccessControllerContract,
    deployFundLockContract,
    deployRegistryContract,
    deployTokenValidatorContract,
} from "../src/deploys";
import { generalUpgradeTests } from "./fixtures/helpers";
import {
    AccessController,
    ERC20,
    Fundlock,
    LedgerBeacon,
    LedgerBeacon__factory,
    Ledger__factory,
    MockERC20__factory,
    Registry,
    RegistryUpgraded__factory,
    TokenValidator,
} from "../typechain-types";

describe("Registry", () => {
    let admin: SignerWithAddress;
    let mockAddress: string;
    let underlying: ERC20;
    let underlyingCurrency: string;
    let strike: ERC20;
    let strikeCurrency: string;
    let signers: SignerWithAddress[];
    let accessController: AccessController;
    let tokenValidator: TokenValidator;
    let fundLock: Fundlock;
    let ledgerBeacon: LedgerBeacon;
    let registry: Registry;

    async function deployRegistryFixture() {
        [admin, { address: mockAddress }, ...signers] = await ethers.getSigners();
        accessController = (await deployAccessControllerContract(admin)) as AccessController;

        tokenValidator = await deployTokenValidatorContract(admin, accessController.address);

        underlying = await new MockERC20__factory(admin).deploy("UnderlyingCurrency", "UC", 18);
        await underlying.deployTransaction.wait();
        underlyingCurrency = underlying.address;

        strike = await new MockERC20__factory(admin).deploy("StrikeCurrency", "SC", 18);
        await strike.deployTransaction.wait();
        strikeCurrency = strike.address;

        fundLock = await deployFundLockContract(
            admin,
            accessController.address,
            DEFAULT_TRADE_LOCK,
            DEFAULT_RELEASE_LOCK
        );

        const baseLedgerImplementation = await new Ledger__factory(admin).deploy();
        await baseLedgerImplementation.deployTransaction.wait();
        ledgerBeacon = await new LedgerBeacon__factory(admin).deploy(
            accessController.address,
            baseLedgerImplementation.address
        );

        registry = await deployRegistryContract(
            admin,
            accessController.address,
            ledgerBeacon.address,
            tokenValidator.address,
            fundLock.address
        );
    }
    beforeEach(async function () {
        await loadFixture(deployRegistryFixture);
    });

    describe("should correctly set and get registry storage variables", () => {
        it("#init", async () => {
            expect(await registry.tokenValidator()).to.eq(tokenValidator.address);
            expect(await registry.fundLock()).to.eq(fundLock.address);
        });

        it("#tokenValidator", async () => {
            const tx = await registry.connect(admin).setTokenValidator(mockAddress);
            expect(tx).to.emit(registry, "TokenValidatorUpdated").withArgs(mockAddress);
            expect(await registry.tokenValidator()).to.eq(mockAddress);
        });

        it("#fundLock", async () => {
            const tx = await registry.connect(admin).setFundLock(mockAddress);
            expect(tx).to.emit(registry, "FundLockUpdated").withArgs(mockAddress);
            expect(await registry.fundLock()).to.eq(mockAddress);
        });

        it("#ledgerBeacon", async () => {
            const tx = await registry.connect(admin).setLedgerBeacon(mockAddress);
            expect(tx).to.emit(registry, "LedgerBeaconUpdated").withArgs(mockAddress);
            expect(await registry.ledgerBeacon()).to.eq(mockAddress);
        });

        it("can not be reinitialized", async () => {
            await expect(
                (registry as Registry).initialize(
                    accessController.address,
                    ledgerBeacon.address,
                    tokenValidator.address,
                    fundLock.address
                )
            ).to.rejectedWith("InvalidInitialization");
        });
    });

    describe("Deploy and verify", () => {
        it("registry deploys and initialise Ledger contract", async () => {
            const precision = 7;

            await accessController
                .connect(admin)
                .grantRole(ADMIN_ROLE, registry.address)
                .then((tx) => tx.wait());

            const deployTx = await registry
                .connect(admin)
                .deployLedger(underlyingCurrency, strikeCurrency, precision, precision);

            await expect(deployTx).to.emit(registry, "LedgerDeployed");

            const events = (await deployTx.wait()).logs
                .filter(
                    (log) =>
                        log.address.toLowerCase() == registry.address.toLowerCase() &&
                        log.topics[0] == registry.interface.getEventTopic("LedgerDeployed")
                )
                .map((log) => registry.interface.parseLog(log));
            const ledger = Ledger__factory.connect(events[0].args[0], admin);
            expect(await ledger.underlyingCurrency()).to.eq(underlyingCurrency);
            expect(await ledger.strikeCurrency()).to.eq(strikeCurrency);
            expect(await tokenValidator.isWhitelisted(underlyingCurrency)).to.be.true;
            expect(await tokenValidator.isWhitelisted(strikeCurrency)).to.be.true;
        });

        it("admin role is required to deploy and initialise Initialize contract", async () => {
            const precision = 7;
            await expect(
                registry.deployLedger(underlyingCurrency, strikeCurrency, precision, precision)
            ).to.be.rejectedWith(`AccessControlUnauthorizedAccount("${registry.address}", "${ADMIN_ROLE}")`);
        });

        it("should not deploy if underlying currency and strike currency are same", async () => {
            const precision = 7;

            await accessController
                .connect(admin)
                .grantRole(ADMIN_ROLE, registry.address)
                .then((tx) => tx.wait());

            await expect(
                registry.deployLedger(underlyingCurrency, underlyingCurrency, precision, precision)
            ).to.be.rejectedWith("InvalidMarket");
        });

        it("Test #isValidLedger", async () => {
            expect(await registry.isValidLedger(ethers.constants.AddressZero)).to.be.false;
            expect(await registry.isValidLedger(mockAddress)).to.be.false;
        });

        it("#setFundLock() should set address properly", async function () {
            const prevFL = await registry.fundLock();
            await registry.connect(admin).setFundLock(mockAddress);
            const newFL = await registry.fundLock();
            expect(newFL).to.eq(mockAddress);
            expect(newFL).to.not.eq(prevFL);
        });
    });

    describe("Upgradeability", () => {
        it("Should pass general upgrade tests", async () => {
            await generalUpgradeTests(registry, new RegistryUpgraded__factory(admin));
        });
    });
});
