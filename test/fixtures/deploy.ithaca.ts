import hre from "hardhat";
import { Ithaca } from "./ithaca";

export const deployIthaca = async () => {
    const [admin, utilityAccount, ...signers] = await hre.ethers.getSigners();

    const ithaca = await Ithaca.deploy(admin, utilityAccount);
    return { admin, utilityAccount, signers, ithaca };
};
