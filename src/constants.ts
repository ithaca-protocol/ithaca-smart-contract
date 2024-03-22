import { constants, utils } from "ethers";

export const PROXY_TYPE_UUPS = "uups";
export const PROXY_TYPE_BEACON = "beacon";

export const ADMIN_ROLE = constants.HashZero;
export const UTILITY_ACCOUNT_ROLE = utils.keccak256(utils.toUtf8Bytes("UTILITY_ACCOUNT"));

export const DEFAULT_TRADE_LOCK = 1200;
export const DEFAULT_RELEASE_LOCK = 2400;
