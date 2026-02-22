/**
 * Asset types for multi-provider swap aggregation
 */

/**
 * Provider-specific metadata types
 */
export interface THORChainAssetMetadata {
  /** Depth of RUNE in the pool (8 decimals) */
  runeDepth: string;
  /** Depth of the asset in the pool (8 decimals) */
  assetDepth: string;
  /** Total liquidity provider units */
  liquidityUnits: string;
  /** Total synthetic supply of this asset */
  synthSupply: string;
}

/**
 * Base metadata type that other providers can extend
 */
export type AssetMetadata = THORChainAssetMetadata | Record<string, unknown>;

/**
 * Asset status types
 */
export type AssetStatus = "available" | "staged" | "suspended" | "delisted";

/**
 * Supported provider identifiers
 */
export type ProviderId = "thorchain"; // add lifi, kyberswap, maya, etc

/**
 * Provider capability flags
 */
export interface ProviderCapabilities {
  /** Provider supports cross-chain swaps */
  crossChain: boolean;
  /** Chains this provider supports */
  supportedChains: string[];
  /** Provider supports native gas token swaps */
  nativeAssets: boolean;
  /** Provider supports ERC-20 and similar token swaps */
  tokens: boolean;
}

/**
 * Represents a tradable asset across any provider
 */
export interface Asset {
  /** Provider identifier (e.g., "thorchain", "lifi") */
  provider: ProviderId;

  /**
   * Asset identifier in the format expected by the provider
   * - THORChain: "BTC.BTC", "ETH.ETH", "ETH.USDC-0xA0b86..."
   * - LI.FI/others: chain-specific format
   */
  symbol: string;

  /** Human-readable name (e.g., "Bitcoin", "USD Coin") */
  name: string;

  /** Chain identifier (e.g., "BTC", "ETH", "AVAX") */
  chain: string;

  /** Contract address (for tokens), undefined for native assets */
  address?: string;

  /** Number of decimal places */
  decimals: number;

  /** Current price in USD */
  priceUsd: number;

  /** Total liquidity in USD */
  liquidityUsd: number;

  /** 24h trading volume in USD */
  volume24hUsd: number;

  /** Asset status */
  status: AssetStatus;

  /** Provider-specific metadata */
  metadata?: AssetMetadata;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Collection of assets from a single provider
 */
export interface AssetList {
  /** Provider identifier */
  provider: ProviderId;

  /** Provider capabilities */
  capabilities: ProviderCapabilities;

  /** List of assets */
  assets: Asset[];

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Multi-provider asset collection
 */
export interface MultiProviderAssets {
  /** Assets grouped by provider */
  providers: Record<ProviderId, AssetList>;

  /** Total number of unique assets across all providers */
  totalAssets: number;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Type guard to check if metadata is THORChain-specific
 */
export function isTHORChainMetadata(
  metadata: AssetMetadata | undefined,
): metadata is THORChainAssetMetadata {
  return (
    metadata !== undefined &&
    "runeDepth" in metadata &&
    "assetDepth" in metadata
  );
}
