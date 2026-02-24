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
import { Quote, QuoteRequest, THORChainQuoteMetadata } from "../types/quote.js";

/**
 * THORNode raw API response for swap quotes
 * All amounts are in 1e8 format (8 decimals), regardless of native asset decimals
 */
interface THORNodeQuoteResponse {
  inbound_address: string;
  inbound_confirmation_blocks?: number;
  inbound_confirmation_seconds?: number;
  outbound_delay_blocks: number;
  outbound_delay_seconds: number;
  fees: {
    asset: string;
    affiliate: string;
    outbound: string;
    liquidity: string;
    total: string;
    slippage_bps: number;
    total_bps: number;
  };
  router?: string;
  expiry: number;
  warning: string;
  notes: string;
  memo: string;
  expected_amount_out: string;
  max_streaming_quantity: number;
  streaming_swap_blocks: number;
  total_swap_seconds: number;
}

/**
 * Helper to convert THORChain 1e8 values to human-readable decimal strings
 */
function thorchainToDecimal(value: string): string {
  const num = BigInt(value);
  const decimals = 8;
  const divisor = BigInt(10 ** decimals);

  const integerPart = num / divisor;
  const fractionalPart = num % divisor;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmed = fractionalStr.replace(/0+$/, "");

  return `${integerPart}.${trimmed}`;
}

/**
 * Helper to convert human-readable decimal to THORChain 1e8 format
 */
function decimalToThorchain(value: string): string {
  const [integerPart = "0", fractionalPart = "0"] = value.split(".");
  const decimals = 8;

  // Pad or truncate fractional part to 8 decimals
  const paddedFractional = fractionalPart
    .padEnd(decimals, "0")
    .slice(0, decimals);

  const result =
    BigInt(integerPart) * BigInt(10 ** decimals) + BigInt(paddedFractional);
  return result.toString();
}

/**
 * THORChain swap provider implementation
 */
export class THORChainProvider extends BaseSwapProvider {
  private midgardApi: MidgardApi;
  private baseUrl: string;
  private thornodeUrl: string;
  private affiliate: string;
  private affiliateBps: number;

  constructor(
    baseUrl = "https://midgard.ninerealms.com",
    thornodeUrl = "https://thornode.ninerealms.com",
    affiliate = "yzx",
    affiliateBps = 30,
  ) {
    super("thorchain", {
      crossChain: true,
      supportedChains: [
        "BTC",
        "BASE",
        "ETH",
        "BSC",
        // "AVAX",
        // "GAIA",
        "LTC",
        "BCH",
        "DOGE",
      ],
      nativeAssets: true,
      tokens: true,
    });

    this.baseUrl = baseUrl;
    this.thornodeUrl = thornodeUrl;
    this.affiliate = affiliate;
    this.affiliateBps = affiliateBps;

    this.midgardApi = new MidgardApi(
      new Configuration({
        basePath: baseUrl,
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
   * Get a swap quote from THORChain
   */
  async getSwapQuote(request: QuoteRequest): Promise<Quote> {
    // Validate request
    this.validateQuoteRequest(request);

    // Convert human-readable amount to THORChain 1e8 format
    const amountIn1e8 = decimalToThorchain(request.amount);

    // Build query parameters
    const params = new URLSearchParams({
      from_asset: request.fromAssetIdentifier,
      to_asset: request.toAssetIdentifier,
      amount: amountIn1e8,
      destination: request.destination,
      affiliate_bps: this.affiliateBps.toString(),
      affiliate: this.affiliate,
      tolerance_bps: (request.toleranceBps || 300).toString(),
    });

    // Add optional parameters
    if (request.refundAddress) {
      params.append("refund_address", request.refundAddress);
    }

    // Extract THORChain-specific options
    if (request.options) {
      if (request.options.streamingInterval) {
        params.append(
          "streaming_interval",
          String(request.options.streamingInterval),
        );
      }
      if (request.options.streamingQuantity) {
        params.append(
          "streaming_quantity",
          String(request.options.streamingQuantity),
        );
      }
    }

    // Make HTTP request to THORNode
    const url = `${this.thornodeUrl}/thorchain/quote/swap?${params.toString()}`;
    console.log("Fetching quote from:", url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`THORNode API error: ${response.status} ${errorText}`);
    }

    const quoteData: THORNodeQuoteResponse = await response.json();
    console.log("THORNode quote response:", quoteData);

    // Convert to standardized quote
    return this.convertThorNodeQuoteToStandard(quoteData, request);
  }

  /**
   * Validate quote request
   */
  private validateQuoteRequest(request: QuoteRequest): void {
    if (!request.fromChain) {
      throw new Error("fromChain is required");
    }
    if (!request.toChain) {
      throw new Error("toChain is required");
    }
    if (!request.fromAssetIdentifier) {
      throw new Error("fromAsset is required");
    }
    if (!request.toAssetIdentifier) {
      throw new Error("toAsset is required");
    }
    if (!request.amount) {
      throw new Error("amount is required");
    }
    if (!request.destination) {
      throw new Error("destination is required");
    }
  }

  /**
   * Convert THORNode quote response to standardized Quote type
   * All THORChain amounts are converted from 1e8 to human-readable decimals
   */
  private convertThorNodeQuoteToStandard(
    thornodeQuote: THORNodeQuoteResponse,
    request: QuoteRequest,
  ): Quote {
    const metadata: THORChainQuoteMetadata = {
      maxStreamingQuantity: thornodeQuote.max_streaming_quantity,
      streamingSwapBlocks: thornodeQuote.streaming_swap_blocks,
      streamingSwapSeconds: undefined, // Not in raw API response
      totalSwapSeconds: thornodeQuote.total_swap_seconds,
    };

    return {
      request,
      provider: this.name,
      inboundAddress: thornodeQuote.inbound_address,
      inboundConfirmationSeconds: thornodeQuote.inbound_confirmation_seconds,
      outboundDelayBlocks: thornodeQuote.outbound_delay_blocks,
      outboundDelaySeconds: thornodeQuote.outbound_delay_seconds,
      fees: {
        asset: thornodeQuote.fees.asset,
        // Convert all fees from 1e8 to human-readable
        affiliate: thorchainToDecimal(thornodeQuote.fees.affiliate),
        outbound: thorchainToDecimal(thornodeQuote.fees.outbound),
        liquidity: thorchainToDecimal(thornodeQuote.fees.liquidity),
        total: thorchainToDecimal(thornodeQuote.fees.total),
        slippageBps: thornodeQuote.fees.slippage_bps,
        totalBps: thornodeQuote.fees.total_bps,
      },
      router: thornodeQuote.router,
      expiry: thornodeQuote.expiry,
      memo: thornodeQuote.memo,
      // Convert expected output from 1e8 to human-readable
      expectedAmountOut: thorchainToDecimal(thornodeQuote.expected_amount_out),
      warning: thornodeQuote.warning,
      notes: thornodeQuote.notes,
      metadata,
      createdAt: new Date(),
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
    // assetDepth is in 1e8 format
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
      identifier: pool.asset,
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
