import { BigNumber, BigNumberish, Signer } from "ethers";
import { ERC20, ERC20__factory, Fundlock } from "../../typechain-types";

export const BASE_MULTIPLIER = BigNumber.from(10).pow(18);

export async function getFundLockBalance(asset: ERC20, user: string, fundLock: string) {
    const userBalance = await asset.balanceOf(user);
    const fundLockBalance = await asset.balanceOf(fundLock);
    return { userBalance, fundLockBalance };
}

export async function depositToFundLock(
    fundLock: Fundlock,
    asset: string,
    user: Signer,
    depositValue: BigNumberish = BigNumber.from(6).mul(BASE_MULTIPLIER)
) {
    await ERC20__factory.connect(asset, user)
        .approve(fundLock.address, depositValue)
        .then((tx) => tx.wait());
    return await fundLock
        .connect(user)
        .deposit(user.getAddress(), asset, depositValue)
        .then((tx) => {
            tx.wait();
            return tx;
        });
}
