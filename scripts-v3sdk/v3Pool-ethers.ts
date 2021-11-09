//
// TO RUN THIS SCRIPT: npx ts-node v3Pool-ethers.ts
//
import { ethers } from "ethers";
import { Address } from "cluster";

const INFURA_PROVIDER = process.env.MAINNET_PROVIDER_URL;
//MAINNET_PROVIDER_URL=https://mainnet.infura.io/v3/xxx
const provider = new ethers.providers.JsonRpcProvider(INFURA_PROVIDER);

//V3 Pool address USDC-ETH pool 
const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";

//Pool inmterface
const poolImmutablesAbi = [
    "function factory() external view returns (address)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
    "function tickSpacing() external view returns (int24)",
    "function maxLiquidityPerTick() external view returns (uint128)",
];

//Local model of smart contract using ethers.js to move data around off-chain
const poolContract = new ethers.Contract(
  poolAddress,
  poolImmutablesAbi,
  provider
);

//data exchange interface
interface Immutables {
  factory: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickSpacing: number;
  maxLiquidityPerTick: number;
}

//query EVM using ethers.js and assign returned values immutable interface defined above
async function getPoolImmutables() {
  const PoolImmutables: Immutables = {
    factory: await poolContract.factory(),
    token0: await poolContract.token0(),
    token1: await poolContract.token1(),
    fee: await poolContract.fee(),
    tickSpacing: await poolContract.tickSpacing(),
    maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
  };
  return PoolImmutables;
}

//Call function 
getPoolImmutables().then((result) => {
  console.log(result);
});

  
