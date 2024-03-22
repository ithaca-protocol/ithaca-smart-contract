import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import {
    AccessController,
    AccessControllerUpgraded,
    AccessControllerUpgraded__factory,
    AccessController__factory,
    MockRole,
    MockRole__factory,
} from "../typechain-types";
import { deployAccessControllerContract, upgradeContract } from "../src/deploys";
import { ADMIN_ROLE, UTILITY_ACCOUNT_ROLE } from "../src/constants";
import { generalUpgradeTests } from "./fixtures/helpers";

const { expect } = chai;

describe("AccessController contract module", () => {
    let admin: SignerWithAddress;
    let utilityAccount: SignerWithAddress;
    let signers: SignerWithAddress[];
    let accessController: AccessController;
    let mockRole: MockRole;

    async function deployMockRoleFixture() {
        [admin, utilityAccount, ...signers] = await ethers.getSigners();
        accessController = await deployAccessControllerContract(admin);
        mockRole = await new MockRole__factory(admin).deploy(accessController.address);
    }

    beforeEach(async () => {
        await loadFixture(deployMockRoleFixture);
    });

    describe("Initialization", () => {
        it("should not be able to initialize more than once", async () => {
            await expect(accessController.initialize()).to.rejectedWith("InvalidInitialization");
        });
    });

    describe("No role", () => {
        it("Should be able to call the funcs without any privilege limitation", async () => {
            await expect(mockRole.connect(signers[0]).anyoneCanCallFunc())
                .to.emit(mockRole, "AnyoneCanCallFuncCalled")
                .withArgs(signers[0].address);
        });

        it("Should not be able to call other func with privilege limitation", async () => {
            await expect(mockRole.connect(signers[0]).onlyAdminCanCallFunc()).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${signers[0].address}\\", \\"${ADMIN_ROLE}\\")`
            );
            await expect(mockRole.connect(signers[0]).onlyUtilityAccountCanCallFunc()).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${signers[0].address}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
            );
        });

        it("Should not be able to grant or revoke privileges", async () => {
            await expect(
                accessController.connect(signers[0]).grantRole(UTILITY_ACCOUNT_ROLE, signers[0].address)
            ).to.rejectedWith(`AccessControlUnauthorizedAccount("${signers[0].address}", "${ADMIN_ROLE}")`);

            await expect(
                accessController.connect(signers[0]).revokeRole(UTILITY_ACCOUNT_ROLE, signers[0].address)
            ).to.rejectedWith(`AccessControlUnauthorizedAccount("${signers[0].address}", "${ADMIN_ROLE}")`);
        });
    });

    describe("Admin role", () => {
        it("Admin role should be the role admin of Admin and UtilityAccount", async () => {
            const roleAdminOfAdmin = await accessController.getRoleAdmin(ADMIN_ROLE);
            expect(roleAdminOfAdmin).to.equal(ADMIN_ROLE);

            const roleAdminOfUtilityAccount = await accessController.getRoleAdmin(UTILITY_ACCOUNT_ROLE);
            expect(roleAdminOfUtilityAccount).to.equal(ADMIN_ROLE);
        });

        it("admin should be the role admin of Admin", async () => {
            expect(await accessController.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("admin account should be able to grant Admin privilege and revoke Admin privilege", async () => {
            const signer = signers[0];

            await accessController.grantRole(ADMIN_ROLE, signer.address);
            expect(await accessController.hasRole(ADMIN_ROLE, signer.address)).to.be.true;

            await accessController.revokeRole(ADMIN_ROLE, signer.address);
            expect(await accessController.hasRole(ADMIN_ROLE, signer.address)).to.be.false;
        });

        it("admin account should be able to grant UtilityAccount privilege and revoke UtilityAccount privilege", async () => {
            const signer = signers[0];

            await accessController.grantRole(UTILITY_ACCOUNT_ROLE, signer.address);
            expect(await accessController.hasRole(UTILITY_ACCOUNT_ROLE, signer.address)).to.be.true;

            await accessController.revokeRole(UTILITY_ACCOUNT_ROLE, signer.address);
            expect(await accessController.hasRole(UTILITY_ACCOUNT_ROLE, signer.address)).to.be.false;
        });

        it("admin account should only be able to call the methods with onlyAdmin modifier", async () => {
            expect(mockRole.connect(admin).onlyAdminCanCallFunc())
                .to.emit(mockRole, "OnlyAdminCanCallFuncCalled")
                .withArgs(admin.address);

            await expect(mockRole.connect(admin).onlyUtilityAccountCanCallFunc()).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${admin.address}\\", \\"${UTILITY_ACCOUNT_ROLE}\\")`
            );
        });
    });

    describe("Utility Account role", () => {
        const grantUtilityAccount = async () => {
            await accessController.grantRole(UTILITY_ACCOUNT_ROLE, utilityAccount.address);
        };

        beforeEach(async () => {
            await loadFixture(grantUtilityAccount);
        });

        it("utility account account should not be able to grant privilege and revoke privilege", async () => {
            await expect(
                accessController.connect(utilityAccount).grantRole(UTILITY_ACCOUNT_ROLE, signers[0].address)
            ).to.rejectedWith(`AccessControlUnauthorizedAccount("${utilityAccount.address}", "${ADMIN_ROLE}")`);

            await expect(
                accessController.connect(utilityAccount).revokeRole(UTILITY_ACCOUNT_ROLE, signers[0].address)
            ).to.rejectedWith(`AccessControlUnauthorizedAccount("${utilityAccount.address}", "${ADMIN_ROLE}")`);
        });

        it("utility account account should be able to call the methods with onlyUtilityAccount modifier", async () => {
            await expect(mockRole.connect(utilityAccount).onlyUtilityAccountCanCallFunc())
                .to.emit(mockRole, "OnlyUtilityAccountCanCallFuncCalled")
                .withArgs(utilityAccount.address);
        });

        it("utility account account should not be able to call the methods with onlyAdmin modifier", async () => {
            await expect(mockRole.connect(utilityAccount).onlyAdminCanCallFunc()).to.rejectedWith(
                `AccessControlUnauthorizedAccount(\\"${utilityAccount.address}\\", \\"${ADMIN_ROLE}\\")`
            );
        });
    });

    describe("Upgradeability", () => {
        let upgradedRole: AccessControllerUpgraded;

        const grantGovernor = async () => {
            await accessController.grantRole(UTILITY_ACCOUNT_ROLE, utilityAccount.address);
        };

        const upgrade = async () => {
            upgradedRole = await upgradeContract(
                accessController.address,
                new AccessControllerUpgraded__factory(admin)
            );
        };

        beforeEach(async () => {
            await loadFixture(grantGovernor);
            await loadFixture(upgrade);
        });

        it("should pass general upgrade tests", async () => {
            await generalUpgradeTests(accessController, new AccessControllerUpgraded__factory(admin));
        });

        it("upgraded contract should still have stored same accounts with roles", async () => {
            expect(await upgradedRole.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await upgradedRole.hasRole(UTILITY_ACCOUNT_ROLE, utilityAccount.address)).to.be.true;
        });
    });
});
