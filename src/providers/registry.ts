import type {
  AssetList,
  MultiProviderAssets,
  ProviderId,
} from "../types/asset.js";
import type { SwapProvider } from "./base.js";

/**
 * Registry for managing multiple swap providers
 */
export class ProviderRegistry {
  private providers: Map<ProviderId, SwapProvider> = new Map();

  /**
   * Register a new provider
   */
  register(provider: SwapProvider): void {
    const name = provider.getName();
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }
    this.providers.set(name, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: ProviderId): SwapProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(
        `Provider '${name}' not found. Available providers: ${this.getAvailableProviders().join(", ")}`,
      );
    }
    return provider;
  }

  /**
   * Get all registered providers
   */
  getAll(): SwapProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get list of available provider names
   */
  getAvailableProviders(): ProviderId[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(name: ProviderId): boolean {
    return this.providers.has(name);
  }

  /**
   * Get assets from a specific provider
   */
  async getAssets(providerName: ProviderId): Promise<AssetList> {
    const provider = this.get(providerName);
    return provider.getSwapAssets();
  }

  /**
   * Get assets from all registered providers
   */
  async getAllAssets(): Promise<MultiProviderAssets> {
    const providers = this.getAll();

    // Fetch assets from all providers in parallel
    const assetLists = await Promise.all(
      providers.map(async (provider) => {
        try {
          return await provider.getSwapAssets();
        } catch (error) {
          console.error(
            `Failed to fetch assets from ${provider.getName()}:`,
            error,
          );
          return null;
        }
      }),
    );

    // Build the multi-provider response
    const providerMap: Record<ProviderId, AssetList> = {} as Record<
      ProviderId,
      AssetList
    >;
    let totalAssets = 0;

    assetLists.forEach((assetList) => {
      if (assetList) {
        providerMap[assetList.provider] = assetList;
        totalAssets += assetList.assets.length;
      }
    });

    return {
      providers: providerMap,
      totalAssets,
      updatedAt: new Date(),
    };
  }
}
