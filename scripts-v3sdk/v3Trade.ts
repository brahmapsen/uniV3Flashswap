import { ethers } from "ethers";
import { Pool, Route, Trade } from "@uniswap/v3-sdk";
import { CurrencyAmount,  Price, Token, TradeType} from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as QuoterABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import JSBI from "jsbi";

const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
const Q192 = JSBI.exponentiate(Q96, JSBI.BigInt(2))

const INFURA_PROVIDER = process.env.ROPSTEN_PROVIDER_URL;
const provider = new ethers.providers.JsonRpcProvider(INFURA_PROVIDER);

//USDC-WETH POOL in ROPSTEN
const poolAddress = "0xee815cdc6322031952a095c6cc6fed036cb1f70d";
//create pool contract using V3Pool ABI instead of a immutable ABI in v3pool-ethers.js
const poolContract = new ethers.Contract(  poolAddress,  IUniswapV3PoolABI,  provider);

//Uniswap V3: Quoter Address
const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider);

//create State and Immutable interfaces to 
interface State {
    liquidity: ethers.BigNumber;
    sqrtPriceX96: ethers.BigNumber;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
}
  
interface Immutables {
    factory: string;
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    maxLiquidityPerTick: ethers.BigNumber;
}
    
    //Fetch immutable data to create a model of the pool
async function getPoolImmutables() {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
    await Promise.all([
        poolContract.factory(),
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.maxLiquidityPerTick(),
    ]);

    const immutables: Immutables = {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
    };
    return immutables;
}

//fetch state data concurrently
async function getPoolState() {
    const [liquidity, slot] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);
  
    const PoolState: State = {
      liquidity,
      sqrtPriceX96: slot[0],
      tick: slot[1],
      observationIndex: slot[2],
      observationCardinality: slot[3],
      observationCardinalityNext: slot[4],
      feeProtocol: slot[5],
      unlocked: slot[6],
    };
  
    return PoolState;
  }

  /**
   * Returns the current mid-price of the pool in terms of token0, 
   * i.e. the ratio of token1 over token0
   */
//   const token0Price = (): Price<Token, Token> => {
//     return (
//       _token0Price ??
//       (_token0Price = new Price(
//         token0,
//         token1,
//         Q192,
//         JSBI.multiply(sqrtRatioX96, sqrtRatioX96)
//       ))
//     )
//   }

async function main() {

    // query the state and immutable variables of the pool  
    const [immutables, state] = await Promise.all([
        getPoolImmutables(),    
        getPoolState(),  
    ]);

    // create instances of the Token object to represent the two tokens in the given pool  
    const TokenA = new Token(3, immutables.token0, 6, "USDC", "USD Coin");
    const TokenB = new Token(3, immutables.token1, 18, "WETH", "Wrapped Ether");
    
    // create an instance of the pool object for the given pool
    const poolExample = new Pool(
        TokenA,
        TokenB,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
      );
    console.log(poolExample);

    // assign an input amount for the swap
    const amountIn = 1500;
  
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
      immutables.token0,
      immutables.token1,
      immutables.fee,
      amountIn.toString(),
      0
    );

    // create an instance of the route object in order to construct a trade object  
    const swapRoute = new Route([poolExample], TokenA, TokenB);

    // create an unchecked trade instance
    const uncheckedTradeExample = await Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(TokenA, amountIn.toString()),
        outputAmount: CurrencyAmount.fromRawAmount(TokenB, quotedAmountOut.toString()),
        tradeType: TradeType.EXACT_INPUT,
    });

    // print the quote and the unchecked trade instance in the console
    console.log("The quoted amount out is ", quotedAmountOut.toString());
    console.log("The unchecked trade object is", uncheckedTradeExample);


    const [immutables2, state2] = await Promise.all([
        getPoolImmutables(),    
        getPoolState(),  
    ]);
    const DAI = new Token(3, immutables2.token0, 18, "DAI", "Stablecoin");
    const USDC = new Token(3, immutables2.token1, 18, "USDC", "USD Coin");
    const DAI_USDC_POOL = new Pool(
        DAI,
        USDC,
        immutables2.fee,
        state2.sqrtPriceX96.toString(),
        state2.liquidity.toString(),
        state2.tick
      )
    const token0Price =  DAI_USDC_POOL.token0Price
    const token1Price = DAI_USDC_POOL.token1Price

    console.log("\nDAI Price: ", token0Price)
    console.log("\nUSDC Price: ", token1Price);

    //const daiPrice = new Price(token0Price, token1Price)
    

  }

  main();