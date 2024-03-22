import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { DEFAULT_RELEASE_LOCK, DEFAULT_TRADE_LOCK } from "../../src/constants";
import { deployIthaca } from "../../src/deploys";
import { TokenInfo, USDC_ADDRESS, WETH_ADDRESS, getEvents } from "./helpers";
import {
    AccessController,
    TokenValidator,
    Fundlock,
    Registry,
    MockERC20__factory,
    ERC20__factory,
    MockERC20,
    Ledger,
    Ledger__factory,
} from "../../typechain-types";
import { LedgerDeployedEvent } from "../../typechain-types/contracts/registry/IRegistry";

export class Ithaca {
    constructor(
        public readonly admin: Signer,
        public readonly utilityAccount: Signer,
        public readonly accessController: AccessController,
        public readonly tokenValidator: TokenValidator,
        public readonly fundLock: Fundlock,
        public readonly registry: Registry
    ) {}

    static async deploy(
        admin: Signer,
        utilityAccount: Signer,
        tradeLock = DEFAULT_TRADE_LOCK,
        releaseLock = DEFAULT_RELEASE_LOCK
    ) {
        const { accessController, tokenValidator, fundLock, registry } = await deployIthaca(
            admin,
            utilityAccount,
            tradeLock,
            releaseLock
        );

        return new Ithaca(admin, utilityAccount, accessController, tokenValidator, fundLock, registry);
    }

    async deployLedger(underlyingCurrency: TokenInfo, strikeCurrency: TokenInfo) {
        const underlyingToken = MockERC20__factory.connect(WETH_ADDRESS, this.admin);
        const strikeToken = MockERC20__factory.connect(USDC_ADDRESS, this.admin);
        const deployTx = await this.registry.deployLedger(
            underlyingToken.address,
            strikeToken.address,
            underlyingCurrency.precision,
            strikeCurrency.precision
        );
        const deployTxReceipt = await deployTx.wait();

        const [
            {
                args: { ledger: deployedLedger },
            },
        ] = getEvents<LedgerDeployedEvent>(
            deployTxReceipt.logs,
            this.registry,
            this.registry.interface.getEvent("LedgerDeployed")
        );
        const ledger = Ledger__factory.connect(deployedLedger, this.registry.signer);
        return new IthacaLedger(
            this,
            ledger,
            { ...underlyingCurrency, token: underlyingToken },
            { ...strikeCurrency, token: strikeToken }
        );
    }

    async deposit(client: Signer, assetAddress: string, depositValue: BigNumberish) {
        await ERC20__factory.connect(assetAddress, client)
            .approve(this.fundLock.address, depositValue)
            .then((tx) => tx.wait());
        return await this.fundLock
            .connect(client)
            .deposit(client.getAddress(), assetAddress, depositValue)
            .then((tx) => {
                tx.wait();
                return tx;
            });
    }

    async fundLockBalance(token: string) {
        return await ERC20__factory.connect(token, this.admin).balanceOf(this.fundLock.address);
    }
}

export class IthacaLedger {
    constructor(
        public readonly ithaca: Ithaca,
        public readonly ledger: Ledger,
        public readonly underlying: TokenInfo & { token: MockERC20 },
        public readonly strike: TokenInfo & { token: MockERC20 }
    ) {}

    async assertPositionsAndBalances(
        clientInfos: {
            contractId: BigNumberish;
            client: string;
            position: BigNumberish;
            underlying: { initial: BigNumberish; diff: BigNumberish };
            strike: { initial: BigNumberish; diff: BigNumberish };
        }[]
    ) {
        for (const { contractId, client, underlying, position, strike } of clientInfos) {
            const positionClient = await this.ledger.clientPositions(contractId, client);
            expect(positionClient).to.eq(position, `client(${client}) position`);

            const { underlying: currentUnderlyingBalance, strike: currentStrikeBalance } = await this.balanceOf(client);

            expect(currentUnderlyingBalance.sub(underlying.initial)).to.eq(
                underlying.diff,
                `client(${client}) underlying diff`
            );
            expect(currentStrikeBalance.sub(strike.initial)).to.eq(strike.diff, `client(${client}) strike diff`);
        }
    }

    async balanceOf(client: string) {
        const [underlying, strike] = await Promise.all([
            this.ithaca.fundLock.balanceSheet(client, this.underlying.token.address),
            this.ithaca.fundLock.balanceSheet(client, this.strike.token.address),
        ]);
        return { underlying, strike };
    }

    async position(contractId: BigNumberish, client: string) {
        return this.ledger.clientPositions(contractId, client);
    }

    underlyingPowerMultiplier() {
        return BigNumber.from(10).pow(this.underlying.decimals - this.underlying.precision);
    }

    underlyingDecimalsMultiplier() {
        return BigNumber.from(10).pow(this.underlying.decimals);
    }

    strikeDecimalsMultiplier() {
        return BigNumber.from(10).pow(this.strike.decimals);
    }

    underlyingPrecisionMultiplier() {
        return BigNumber.from(10).pow(this.underlying.precision);
    }

    strikePrecisionMultiplier() {
        return BigNumber.from(10).pow(this.strike.precision);
    }

    strikePowerMultiplier() {
        return BigNumber.from(10).pow(this.strike.decimals - this.strike.precision);
    }

    mulUnderlyingPowerMultiplier(base: BigNumberish) {
        return this.underlyingPowerMultiplier().mul(base);
    }

    mulStrikePowerMultiplier(base: BigNumberish) {
        return this.strikePowerMultiplier().mul(base);
    }

    async updatePositions(...params: Parameters<typeof this.ledger.updatePositions>) {
        return this.ledger.connect(this.ithaca.utilityAccount).updatePositions(...params);
    }

    async updateFundMovements(...params: Parameters<typeof this.ledger.updateFundMovements>) {
        return this.ledger.connect(this.ithaca.utilityAccount).updateFundMovements(...params);
    }
}
