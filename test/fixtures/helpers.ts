import { EventFragment, LogDescription } from "@ethersproject/abi";
import { Log } from "@ethersproject/providers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ContractFactory, Event, Signer } from "ethers";
import { ethers } from "hardhat";
import { ADMIN_ROLE } from "../../src/constants";
import { upgradeBeacon, upgradeContract } from "../../src/deploys";
import { LedgerBeaconProxy, Proxy } from "../../typechain-types";

export async function generalUpgradeTests<U extends ContractFactory>(
    proxy: LedgerBeaconProxy | Proxy,
    newFactory: U,
    beacon?: boolean
) {
    const signers = await ethers.getSigners();

    const storageBeforeUpgrade = [];
    for (let i = 0; i < 100; i++) {
        storageBeforeUpgrade.push(await ethers.provider.getStorageAt(proxy.address, i));
    }

    let upgradeFunction;
    if (beacon) {
        upgradeFunction = async (signer: Signer): Promise<Contract> =>
            await upgradeBeacon(proxy as LedgerBeaconProxy, newFactory.connect(signer));
    } else {
        upgradeFunction = async (signer: Signer): Promise<Contract> => {
            return await upgradeContract(proxy.address, newFactory.connect(signer));
        };
    }

    const upgradedContract = await upgradeFunction(newFactory.signer);

    await expect(upgradeFunction(signers[signers.length - 1])).to.be.rejectedWith(
        `AccessControlUnauthorizedAccount(\"${signers[signers.length - 1].address}\", \"${ADMIN_ROLE}\")`
    );

    expect(await upgradedContract.newFunction()).to.be.true;

    expect(proxy.address).to.equals(upgradedContract.address);

    for (let i = 0; i < 100; i++) {
        expect(storageBeforeUpgrade[i]).to.equals(await ethers.provider.getStorageAt(upgradedContract.address, i));
    }
}

export function getEvents<T extends Event>(logs: Log[], contract: Contract, event: EventFragment | string) {
    return logs
        .filter((log) => log.address == contract.address && log.topics[0] == contract.interface.getEventTopic(event))
        .map((log) => contract.interface.parseLog(log)) as (T | LogDescription)[];
}

export function getBackendIdGenerator() {
    let id = 0;
    return () => {
        id += 1;
        return id;
    };
}

export type TokenInfo = {
    decimals: number;
    precision: number;
};

export const scaleUp = async (token: { decimals: () => Promise<number> }, value: BigNumberish) => {
    return BigNumber.from(10)
        .pow(await token.decimals())
        .mul(value);
};

export const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const WETH_SLOT = 51;
export const WETH_DECIMAL = 18;
export const WETH_PRECISION = 7;
export const USDC_ADDRESS = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
export const USDC_SLOT = 51;
export const USDC_DECIMAL = 6;
export const USDC_PRECISION = 4;
export const AAVE_V3_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
export const AUSDC_ADDRESS = "0x625E7708f30cA75bfd92586e17077590C60eb4cD";
export const UNISWAP_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
export const UNISWAP_SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const UNISWAP_WSTETH_ETH_POOL_ADDRESS = "0x35218a1cbaC5Bbc3E57fd9Bd38219D37571b3537";
export const WSTETH_ADDRESS = "0x5979D7b546E38E414F7E9822514be443A4800529";
