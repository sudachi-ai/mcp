import {
  Configuration,
  MidgardApi,
  type PoolDetail,
} from "@xchainjs/xchain-midgard";
import type {
  Asset,
  AssetList,
  AssetStatus,
  THORChainAssetMetadata,
} from "../types/asset.js";
import { BaseSwapProvider } from "./base.js";

/**
 * THORChain swap provider implementation
 */
export class THORChainProvider extends BaseSwapProvider {
  private midgardApi: MidgardApi;
  private baseUrl: string;

  constructor(baseUrl = "https://midgard.ninerealms.com") {
    super("thorchain", {
      crossChain: true,
      supportedChains: [
        "BTC",
        "ETH",
        "BSC",
        "AVAX",
        "GAIA",
        "LTC",
        "BCH",
        "DOGE",
      ],
      nativeAssets: true,
      tokens: true,
    });

    this.baseUrl = baseUrl;
    this.midgardApi = new MidgardApi(
      new Configuration({
        basePath: baseUrl,
        // Add x-client-id header for Nine Realms endpoints
        // headers: {
        //   'x-client-id': 'sudachi-mcp'
        // }
      }),
    );
  }

  /**
   * Get all available swap assets from THORChain
   */
  async getSwapAssets(): Promise<AssetList> {
    const response = await this.midgardApi.getPools("available");
    const pools = response.data;
    const assets = pools
      .filter((pool) => pool.status === "available")
      .map((pool) => this.convertPoolToAsset(pool));

    return {
      provider: this.name,
      capabilities: this.capabilities,
      assets,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert a Midgard pool to our standardized Asset type
   */
  private convertPoolToAsset(pool: PoolDetail): Asset {
    const { chain, symbol, address } = this.parseAssetIdentifier(pool.asset);

    // Parse numeric values
    const priceUsd = parseFloat(pool.assetPriceUSD || "0");
    const assetDepth = parseFloat(pool.assetDepth || "0");
    const volume24h = parseFloat(pool.volume24h || "0");
    const decimals = parseInt(pool.nativeDecimal || "8", 10);

    // Calculate liquidity in USD (2 * assetDepth * assetPrice)
    const liquidityUsd = 2 * (assetDepth / 1e8) * priceUsd;

    // Calculate 24h volume in USD
    const volume24hUsd = (volume24h / 1e8) * priceUsd;

    // Build THORChain-specific metadata
    const metadata: THORChainAssetMetadata = {
      runeDepth: pool.runeDepth,
      assetDepth: pool.assetDepth,
      liquidityUnits: pool.liquidityUnits,
      synthSupply: pool.synthSupply || "0",
    };

    return {
      provider: this.name,
      symbol: pool.asset,
      name: symbol,
      chain,
      address,
      decimals,
      priceUsd,
      liquidityUsd,
      volume24hUsd,
      status: pool.status as AssetStatus,
      metadata,
      updatedAt: new Date(),
    };
  }

  /**
   * Parse THORChain asset identifier
   * Format: "CHAIN.SYMBOL" or "CHAIN.SYMBOL-ADDRESS"
   * Examples: "BTC.BTC", "ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
   */
  private parseAssetIdentifier(assetString: string): {
    chain: string;
    symbol: string;
    address?: string;
  } {
    const [chain, symbolPart] = assetString.split(".");

    if (!chain || !symbolPart) {
      throw new Error(`Invalid asset format: ${assetString}`);
    }

    // Check if it's a token with address
    if (symbolPart.includes("-")) {
      const [symbol, address] = symbolPart.split("-");
      return { chain, symbol, address };
    }

    // Native asset
    return { chain, symbol: symbolPart };
  }
}
