import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ADMIN_ROLE, UTILITY_ACCOUNT_ROLE } from "../src/constants";
import { deployAccessControllerContract, deployTokenValidatorContract } from "../src/deploys";
import { AccessController, MockERC20, MockERC20__factory, TokenValidator } from "../typechain-types";

describe("TokenValidator", () => {
    const precision1 = 7;
    const precision2 = 4;
    const precision3 = 3;
    let admin: SignerWithAddress;
    let utilityAccount: SignerWithAddress;
    let signers: SignerWithAddress[];
    let token1: MockERC20;
    let token2: MockERC20;
    let token3: MockERC20;
    let token4: MockERC20;
    let token5: MockERC20;
    let accessController: AccessController;
    let tokenValidator: TokenValidator;

    async function deployTokenValidatorFixture() {
        [admin, utilityAccount, ...signers] = await ethers.getSigners();
        accessController = (await deployAccessControllerContract(admin)) as AccessController;
        await accessController.grantRole(ADMIN_ROLE, admin.address);
        await accessController.grantRole(UTILITY_ACCOUNT_ROLE, utilityAccount.address);

        tokenValidator = (await deployTokenValidatorContract(admin, accessController.address)) as TokenValidator;

        token1 = await new MockERC20__factory(admin).deploy("Token1", "T1", 18);
        await token1.deployTransaction.wait();
        token2 = await new MockERC20__factory(admin).deploy("Token2", "T2", 8);
        await token2.deployTransaction.wait();
        token3 = await new MockERC20__factory(admin).deploy("Token3", "T3", 6);
        await token3.deployTransaction.wait();
        token4 = await new MockERC20__factory(admin).deploy("Token4", "T4", 6);
        await token4.deployTransaction.wait();
        token5 = await new MockERC20__factory(admin).deploy("Token5", "T5", 6);
        await token5.deployTransaction.wait();
    }

    beforeEach(async () => {
        await loadFixture(deployTokenValidatorFixture);
    });

    describe("Token validation against whitelist", () => {
        it("should validate single token", async () => {
            await tokenValidator
                .connect(admin)
                .addTokensToWhitelist([{ token: token1.address, precision: precision1 }])
                .then((tx) => tx.wait());
            expect(await tokenValidator.isWhitelisted(token1.address)).to.be.true;
            expect(await tokenValidator.isWhitelisted(token2.address)).to.be.false;
        });

        it("should revert for user without admin role", async function () {
            await expect(
                tokenValidator
                    .connect(utilityAccount)
                    .addTokensToWhitelist([{ token: token1.address, precision: precision1 }])
            ).to.be.rejectedWith(`AccessControlUnauthorizedAccount("${utilityAccount.address}", "${ADMIN_ROLE}")`);

            await expect(
                tokenValidator.connect(utilityAccount).addTokensToWhitelist([
                    { token: token1.address, precision: precision1 },
                    { token: token2.address, precision: precision2 },
                    { token: token3.address, precision: precision3 },
                ])
            ).to.be.rejectedWith(`AccessControlUnauthorizedAccount("${utilityAccount.address}", "${ADMIN_ROLE}")`);
        });

        it("should add, remove and validate tokens", async function () {
            await tokenValidator.connect(admin).addTokensToWhitelist([
                { token: token1.address, precision: precision1 },
                { token: token2.address, precision: precision2 },
            ]);
            await tokenValidator
                .connect(admin)
                .addTokensToWhitelist([{ token: token3.address, precision: precision3 }]);

            expect(await tokenValidator.isWhitelisted(token1.address)).to.be.true;
            expect(await tokenValidator.isWhitelisted(token2.address)).to.be.true;
            expect(await tokenValidator.isWhitelisted(token3.address)).to.be.true;

            await tokenValidator.connect(admin).removeTokenFromWhitelist(token2.address);
            await tokenValidator.connect(admin).removeTokenFromWhitelist(token3.address);

            expect(await tokenValidator.isWhitelisted(token1.address)).to.be.true;
            expect(await tokenValidator.isWhitelisted(token2.address)).to.be.false;
            expect(await tokenValidator.isWhitelisted(token3.address)).to.be.false;
        });

        it("should revert if whitelisting with zero precision", async function () {
            await expect(
                tokenValidator.connect(admin).addTokensToWhitelist([{ token: token1.address, precision: 0 }])
            ).to.be.rejectedWith(`ZeroPrecision("${token1.address}")`);
        });

        it("#getTokenDetails() returns correct values", async function () {
            await tokenValidator.connect(admin).addTokensToWhitelist([
                { token: token1.address, precision: precision1 },
                { token: token2.address, precision: precision2 },
            ]);

            const { precision: precFromSc1, decimalPrecisionDiff: powFromSc1 } = await tokenValidator.getTokenDetails(
                token1.address
            );
            const { precision: precFromSc2, decimalPrecisionDiff: powFromSc2 } = await tokenValidator.getTokenDetails(
                token2.address
            );

            expect(precFromSc1).to.equal(precision1);
            expect(powFromSc1).to.equal(18 - precision1);
            expect(precFromSc2).to.equal(precision2);
            expect(powFromSc2).to.equal(8 - precision2);
        });
    });

    describe("emits events with appropriate values", () => {
        it("addTokensToWhitelist() check", async function () {
            const tx = tokenValidator
                .connect(admin)
                .addTokensToWhitelist([{ token: token1.address, precision: precision1 }]);

            await expect(tx)
                .to.emit(tokenValidator, "AddedToWhitelist")
                .withArgs(token1.address, precision1, 18 - precision1);
        });

        it("removeTokenFromWhitelist() can not be called if token is not in whitelist", async function () {
            await expect(tokenValidator.connect(admin).removeTokenFromWhitelist(token1.address)).to.be.rejectedWith(
                `ZeroPrecision("${token1.address}")`
            );
        });

        it("removeTokenFromWhitelist() check", async function () {
            await tokenValidator
                .connect(admin)
                .addTokensToWhitelist([{ token: token1.address, precision: precision1 }]);
            await expect(tokenValidator.connect(admin).removeTokenFromWhitelist(token1.address))
                .to.emit(tokenValidator, "RemovedFromWhitelist")
                .withArgs(token1.address);
        });
    });
});
