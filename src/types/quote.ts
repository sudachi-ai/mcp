import type { ProviderId } from "./asset.js";

/**
 * Request for a swap quote from a provider
 */
export interface QuoteRequest {
  /** Provider identifier (e.g., "thorchain", "lifi", "kyberswap") */
  provider: ProviderId;

  // /** Source chain identifier (e.g., "ETH", "BTC") */
  fromChain: string;

  // /** Source asset identifier (provider-specific format) */
  // fromAsset: string;

  /** Destination chain identifier */
  toChain: string;

  /** Destination asset identifier (provider-specific format) */
  // toAsset: string;

  /**
   * Source asset identifier (use 'identifier' field from get_swap_assets)
   */
  fromAssetIdentifier: string;

  /**
   * Destination asset identifier (use 'identifier' field from get_swap_assets)
   */
  toAssetIdentifier: string;

  /** Amount to swap in the smallest unit (provider-specific) */
  amount: string;

  /** Destination address to receive the swapped assets */
  destination: string;

  /** Optional refund address if the swap fails */
  refundAddress?: string;

  /**
   * Slippage tolerance in basis points (e.g., 300 for 3%, 50 for 0.5%)
   * 1 bp = 0.01%, so 100 bps = 1%
   */
  toleranceBps?: number;

  /**
   * we will pass in set values for affiliate and affiliateBps
   */
  /** Affiliate fee in basis points (1 bp = 0.01%) */
  // affiliateBps?: number;

  /** Affiliate address or identifier */
  // affiliate?: string;

  /**
   * Provider-specific options
   * - THORChain: streamingInterval, streamingQuantity, toleranceBps, liquidityToleranceBps
   * - LI.FI: allowBridges, allowExchanges, integratorAddress, maxPriceImpact
   * - KyberSwap: gasPrice, deadline, feeRecipient
   */
  options?: Record<string, unknown>;
}

/**
 * Fee breakdown for a swap quote
 */
export interface QuoteFees {
  /** Asset in which fees are denominated */
  asset: string;

  /** Affiliate fee amount */
  affiliate?: string;

  /** Outbound fee amount */
  outbound: string;

  /** Liquidity fee amount (slippage) */
  liquidity: string;

  /** Total fee amount */
  total: string;

  /** Slippage in basis points */
  slippageBps: number;

  /** Total fees in basis points */
  totalBps: number;
}

/**
 * THORChain-specific quote metadata
 */
export interface THORChainQuoteMetadata {
  /** Maximum number of streaming swaps allowed */
  maxStreamingQuantity?: number;

  /** Number of blocks for streaming swap */
  streamingSwapBlocks?: number;

  /** Estimated seconds for streaming swap */
  streamingSwapSeconds?: number;

  /** Total estimated swap time in seconds */
  totalSwapSeconds?: number;
}

/**
 * Base metadata type that other providers can extend
 */
export type QuoteMetadata = THORChainQuoteMetadata | Record<string, unknown>;

/**
 * Swap quote from a provider
 */
export interface Quote {
  /** The original request used to generate this quote */
  request: QuoteRequest;

  /** Provider identifier */
  provider: ProviderId;

  /** Inbound address to send funds to */
  inboundAddress: string;

  /** Number of confirmations required */
  // inboundConfirmationBlocks?: number;

  /** Estimated seconds until confirmed */
  inboundConfirmationSeconds?: number;

  /** Outbound delay in blocks */
  outboundDelayBlocks?: number;

  /** Outbound delay in seconds */
  outboundDelaySeconds?: number;

  /** Fee breakdown */
  fees: QuoteFees;

  /** Router contract address (for EVM chains) */
  router?: string;

  /** Quote expiration timestamp (Unix timestamp) */
  expiry: number;

  /** Transaction memo (for UTXO/THORChain-style chains) */
  memo?: string;

  /** Expected amount out (in smallest unit) */
  expectedAmountOut: string;

  // /** Dust threshold (minimum economical amount) */
  // dustThreshold?: string;

  // /** Recommended minimum amount in */
  // recommendedMinAmountIn?: string;

  // /** Recommended gas rate */
  // recommendedGasRate?: string;

  // /** Gas rate units (e.g., "gwei", "satsperbyte") */
  // gasRateUnits?: string;

  /** Warning messages */
  warning?: string;

  /** Additional notes */
  notes?: string;

  /** Provider-specific metadata */
  metadata?: QuoteMetadata;

  /** Timestamp when quote was generated */
  createdAt: Date;
}

/**
 * Type guard to check if metadata is THORChain-specific
 */
export function isTHORChainQuoteMetadata(
  metadata: QuoteMetadata | undefined,
): metadata is THORChainQuoteMetadata {
  return (
    metadata !== undefined &&
    ("maxStreamingQuantity" in metadata || "totalSwapSeconds" in metadata)
  );
}
