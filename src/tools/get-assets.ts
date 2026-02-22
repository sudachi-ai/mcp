import type { CallToolResult } from "@modelcontextprotocol/server";
import type { ProviderId } from "../types/asset.js";
import type { ProviderRegistry } from "../providers/registry.js";

/**
 * Input arguments for get_swap_assets tool
 */
export interface GetAssetsArgs {
  /** Optional: filter by specific provider (e.g., "thorchain") */
  provider?: ProviderId;
}

/**
 * Create the get_swap_assets tool handler
 *
 * This tool retrieves available swap assets from registered providers.
 * Returns asset details including symbol, chain, price, liquidity, and trading volume.
 */
export function createGetAssetsHandler(registry: ProviderRegistry) {
  return async (args: GetAssetsArgs): Promise<CallToolResult> => {
    try {
      // If provider specified, get assets from that provider only
      if (args.provider) {
        const assetList = await registry.getAssets(args.provider);

        // Create summary text
        const summary = [
          `Retrieved ${assetList.assets.length} assets from ${assetList.provider}`,
          ``,
          `Provider capabilities:`,
          `• Cross-chain: ${assetList.capabilities.crossChain ? "Yes" : "No"}`,
          `• Supported chains: ${assetList.capabilities.supportedChains.join(", ")}`,
          `• Native assets: ${assetList.capabilities.nativeAssets ? "Yes" : "No"}`,
          `• Token support: ${assetList.capabilities.tokens ? "Yes" : "No"}`,
        ].join("\n");

        // Group assets by chain for better readability
        const assetsByChain = assetList.assets.reduce(
          (acc, asset) => {
            if (!acc[asset.chain]) {
              acc[asset.chain] = [];
            }
            acc[asset.chain].push(asset);
            return acc;
          },
          {} as Record<string, typeof assetList.assets>,
        );

        const chainSummary = Object.entries(assetsByChain)
          .map(([chain, assets]) => `  ${chain}: ${assets.length} assets`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `${summary}\n\nAssets by chain:\n${chainSummary}`,
            },
          ],
          // Convert to plain object with proper serialization
          structuredContent: {
            provider: assetList.provider,
            capabilities: assetList.capabilities,
            assets: assetList.assets.map((asset) => ({
              ...asset,
              updatedAt: asset.updatedAt.toISOString(),
            })),
            updatedAt: assetList.updatedAt.toISOString(),
            totalAssets: assetList.assets.length,
          },
        };
      }

      // Get assets from all providers
      const multiProviderAssets = await registry.getAllAssets();
      const providerNames = Object.keys(multiProviderAssets.providers);

      // Create summary text
      const summary = [
        `Retrieved ${multiProviderAssets.totalAssets} total assets from ${providerNames.length} provider(s)`,
        ``,
        `Providers:`,
        ...providerNames.map((name) => {
          const provider = multiProviderAssets.providers[name as ProviderId];
          return `• ${name}: ${provider.assets.length} assets (chains: ${provider.capabilities.supportedChains.join(", ")})`;
        }),
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
        // Convert to plain object with proper serialization
        structuredContent: {
          providers: Object.fromEntries(
            Object.entries(multiProviderAssets.providers).map(
              ([name, assetList]) => [
                name,
                {
                  provider: assetList.provider,
                  capabilities: assetList.capabilities,
                  assets: assetList.assets.map((asset) => ({
                    ...asset,
                    updatedAt: asset.updatedAt.toISOString(),
                  })),
                  updatedAt: assetList.updatedAt.toISOString(),
                },
              ],
            ),
          ),
          totalAssets: multiProviderAssets.totalAssets,
          updatedAt: multiProviderAssets.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        content: [
          {
            type: "text",
            text: `Error fetching assets: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  };
}
