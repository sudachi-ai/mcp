import type {
  Asset,
  AssetList,
  ProviderCapabilities,
  ProviderId,
} from "../types/asset.js";
import { Quote, QuoteRequest } from "../types/quote.js";

/**
 * Base interface that all swap providers must implement
 */
export interface SwapProvider {
  /**
   * Get the provider's unique identifier
   */
  getName(): ProviderId;

  /**
   * Get the provider's capabilities (cross-chain, supported chains, etc.)
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Get all available swap assets from this provider
   */
  getSwapAssets(): Promise<AssetList>;

  /**
   * Get a swap quote from this provider
   */
  getSwapQuote(request: QuoteRequest): Promise<Quote>;

  // Future methods (uncomment as needed):
  // getSwapQuote(request: QuoteRequest): Promise<Quote>;
  // getTransactionStatus(txId: string): Promise<TransactionStatus>;
}

/**
 * Abstract base class with common provider functionality
 */
export abstract class BaseSwapProvider implements SwapProvider {
  protected readonly name: ProviderId;
  protected readonly capabilities: ProviderCapabilities;

  constructor(name: ProviderId, capabilities: ProviderCapabilities) {
    this.name = name;
    this.capabilities = capabilities;
  }

  getName(): ProviderId {
    return this.name;
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  abstract getSwapAssets(): Promise<AssetList>;
  abstract getSwapQuote(request: QuoteRequest): Promise<Quote>;
}
