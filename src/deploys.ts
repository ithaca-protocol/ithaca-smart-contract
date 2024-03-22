import { BigNumberish, Contract, ContractFactory, Signer } from "ethers";
import { ethers } from "hardhat";
import { ADMIN_ROLE, UTILITY_ACCOUNT_ROLE } from "./constants";
import {
    AccessController,
    Fundlock,
    Ledger,
    LedgerBeacon,
    LedgerBeaconProxy,
    Registry,
    TokenValidator,
} from "../typechain-types";

export async function deployAccessControllerContract(deployer: Signer): Promise<AccessController> {
    const accessController = (await ethers.deployContract("AccessController", deployer)) as AccessController;
    const encodedInitializationData = accessController.interface.encodeFunctionData("initialize");
    const accessControllerProxy = await ethers.deployContract(
        "ERC1967Proxy",
        [accessController.address, encodedInitializationData],
        deployer
    );
    return ethers.getContractAt("AccessController", accessControllerProxy.address);
}

export async function deployTokenValidatorContract(
    deployer: Signer,
    accessController: string
): Promise<TokenValidator> {
    const tokenValidator = (await ethers.deployContract("TokenValidator", deployer)) as TokenValidator;
    const encodedInitializationData = tokenValidator.interface.encodeFunctionData("initialize", [accessController]);
    const tokenValidatorProxy = await ethers.deployContract(
        "ERC1967Proxy",
        [tokenValidator.address, encodedInitializationData],
        deployer
    );
    return ethers.getContractAt("TokenValidator", tokenValidatorProxy.address);
}

export async function deployRegistryContract(
    deployer: Signer,
    accessController: string,
    ledgerBeacon: string,
    tokenValidator: string,
    fundLock: string
): Promise<Registry> {
    const registry = (await ethers.deployContract("Registry", deployer)) as Registry;
    const encodedInitializationData = registry.interface.encodeFunctionData("initialize", [
        accessController,
        ledgerBeacon,
        tokenValidator,
        fundLock,
    ]);
    const registryProxy = await ethers.deployContract(
        "ERC1967Proxy",
        [registry.address, encodedInitializationData],
        deployer
    );
    return ethers.getContractAt("Registry", registryProxy.address);
}

export async function deployFundLockContract(
    deployer: Signer,
    accessController: string,
    tradeLock: BigNumberish,
    releaseLock: BigNumberish
): Promise<Fundlock> {
    const fundLock = (await ethers.deployContract("Fundlock", deployer)) as Fundlock;
    const encodedInitializationData = fundLock.interface.encodeFunctionData("initialize", [
        accessController,
        tradeLock,
        releaseLock,
    ]);
    const fundLockProxy = await ethers.deployContract(
        "ERC1967Proxy",
        [fundLock.address, encodedInitializationData],
        deployer
    );
    return ethers.getContractAt("Fundlock", fundLockProxy.address);
}

export async function deployLedgerBeacon(deployer: Signer, accessController: string) {
    const ledgerImplementation = (await ethers.deployContract("Ledger", deployer)) as Ledger;
    const ledgerBeacon = (await ethers.deployContract(
        "LedgerBeacon",
        [accessController, ledgerImplementation.address],
        deployer
    )) as LedgerBeacon;
    return { ledgerBeacon, ledgerImplementation };
}

export async function upgradeContract<T extends Contract, S extends ContractFactory>(
    instanceAddress: string,
    factory: S
): Promise<T> {
    const newImplementation = await factory.deploy();
    const proxy = await ethers.getContractAt("UUPSUpgradeable", instanceAddress, factory.signer);
    await proxy.upgradeToAndCall(newImplementation.address, "0x");
    return factory.attach(instanceAddress) as T;
}

export async function upgradeBeacon<T extends Contract, U extends ContractFactory>(
    proxy: LedgerBeaconProxy,
    newFactory: U
): Promise<T> {
    const newImplementation = await newFactory.deploy();
    const beacon = await ethers.getContractAt("LedgerBeacon", await proxy.getBeacon(), newFactory.signer);
    await beacon.upgradeTo(newImplementation.address);
    return newFactory.attach(proxy.address) as T;
}

export async function deployIthaca(
    admin: Signer,
    utilityAccount: Signer,
    tradeLock: number | string,
    releaseLock: number | string
) {
    if (!Number(tradeLock) && Number(tradeLock) > 0) {
        throw new Error("Invalid tradeLock");
    }

    if (!Number(releaseLock) && Number(releaseLock) > 0) {
        throw new Error("Invalid releaseLock");
    }

    // deploy AccessController contract
    const accessController = await deployAccessControllerContract(admin);
    await accessController.grantRole(UTILITY_ACCOUNT_ROLE, utilityAccount.getAddress()).then((tx) => tx.wait());

    // deploy TokenValidator Contract
    const tokenValidator = await deployTokenValidatorContract(admin, accessController.address);

    // deploy Fundlock Contract
    const fundLock = await deployFundLockContract(admin, accessController.address, tradeLock, releaseLock);

    // deploy LedgerBeacon contract
    const { ledgerBeacon, ledgerImplementation } = await deployLedgerBeacon(admin, accessController.address);

    // deploy RegistryContract
    const registry = await deployRegistryContract(
        admin,
        accessController.address,
        ledgerBeacon.address,
        tokenValidator.address,
        fundLock.address
    );
    await accessController.grantRole(ADMIN_ROLE, registry.address).then((tx) => tx.wait());

    await fundLock.setRegistry(registry.address).then((tx) => tx.wait());
    await registry.setFundLock(fundLock.address).then((tx) => tx.wait());

    return {
        accessController,
        tokenValidator,
        registry,
        fundLock,
        ledgerBeacon,
        ledgerImplementation,
    };
}
