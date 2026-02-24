// import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CallToolResult } from "@modelcontextprotocol/server";
import { ProviderRegistry } from "../providers/registry.js";
import { ProviderId } from "../types/asset.js";
import {
  Quote,
  QuoteRequest,
  isTHORChainQuoteMetadata,
} from "../types/quote.js";

export interface GetQuoteArgs {
  /** Provider identifier (e.g., "thorchain") */
  provider: ProviderId;
  /** Source asset identifier (from get_swap_assets) */
  fromAssetIdentifier: string;
  /** Destination asset identifier (from get_swap_assets) */
  toAssetIdentifier: string;
  /** Amount to swap (human-readable, e.g., 1.5 for 1.5 ETH) */
  amount: number;
  /** Destination address to receive swapped assets */
  destination: string;
  /** Optional refund address if swap fails */
  refundAddress?: string;
  /** Slippage tolerance in basis points (default: 300 = 3%) */
  toleranceBps?: number;
  /** Provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Extract chain from asset identifier
 * For THORChain format: "ETH.USDC-0xA0b86..." => "ETH"
 * For simple format: "BTC.BTC" => "BTC"
 */
function extractChain(identifier: string): string {
  const dotIndex = identifier.indexOf(".");
  if (dotIndex === -1) {
    throw new Error(`Invalid asset identifier format: ${identifier}`);
  }
  return identifier.substring(0, dotIndex);
}

/**
 * Format a quote into a human-readable summary
 */
function formatQuoteSummary(quote: Quote): string {
  const lines = [
    `=== Swap Quote from ${quote.provider.toUpperCase()} ===`,
    ``,
    `From: ${quote.request.fromAssetIdentifier}`,
    `To: ${quote.request.toAssetIdentifier}`,
    `Amount In: ${quote.request.amount}`,
    `Expected Amount Out: ${quote.expectedAmountOut}`,
    ``,
    `=== Fees ===`,
    `Outbound: ${quote.fees.outbound} ${quote.fees.asset}`,
    `Liquidity: ${quote.fees.liquidity} ${quote.fees.asset}`,
  ];

  if (quote.fees.affiliate) {
    lines.push(`Affiliate: ${quote.fees.affiliate} ${quote.fees.asset}`);
  }

  lines.push(
    `Total: ${quote.fees.total} ${quote.fees.asset}`,
    `Slippage: ${(quote.fees.slippageBps / 100).toFixed(2)}%`,
    `Total Fees: ${(quote.fees.totalBps / 100).toFixed(2)}%`,
    ``,
  );

  if (quote.inboundAddress) {
    lines.push(`Inbound Address: ${quote.inboundAddress}`);
  }

  if (quote.memo) {
    lines.push(`Memo: ${quote.memo}`);
  }

  if (quote.router) {
    lines.push(`Router: ${quote.router}`);
  }

  if (quote.inboundConfirmationSeconds) {
    lines.push(
      `Inbound Confirmation Time: ~${quote.inboundConfirmationSeconds}s`,
    );
  }

  if (quote.outboundDelayBlocks) {
    lines.push(
      `Outbound Delay: ${quote.outboundDelayBlocks} blocks (~${quote.outboundDelaySeconds}s)`,
    );
  }

  // THORChain-specific metadata
  if (isTHORChainQuoteMetadata(quote.metadata)) {
    lines.push(
      ``,
      `=== Streaming Swap ===`,
      `Max Streaming Quantity: ${quote.metadata.maxStreamingQuantity}`,
      `Streaming Swap Blocks: ${quote.metadata.streamingSwapBlocks}`,
      `Streaming Swap Time: ~${quote.metadata.streamingSwapSeconds}s`,
      `Total Swap Time: ~${quote.metadata.totalSwapSeconds}s`,
    );
  }

  if (quote.warning) {
    lines.push(``, `⚠️  Warning: ${quote.warning}`);
  }

  if (quote.notes) {
    lines.push(``, `📝 Notes: ${quote.notes}`);
  }

  const expiryDate = new Date(quote.expiry * 1000);
  lines.push(
    ``,
    `Quote expires: ${expiryDate.toISOString()}`,
    `Generated: ${quote.createdAt.toISOString()}`,
  );

  return lines.join("\n");
}

/**
 * Handler for the "get_swap_quote" tool. Retrieves a swap quote from a specified provider based on the input parameters.
 */
export function getQuoteHandler(registry: ProviderRegistry) {
  return async (args: GetQuoteArgs): Promise<CallToolResult> => {
    try {
      // Validate provider
      if (!args.provider) {
        return {
          content: [
            {
              type: "text",
              text: "Error: provider is required",
            },
          ],
          isError: true,
        };
      }

      // Get the provider
      const provider = registry.get(args.provider);

      // Extract chains from asset identifiers
      const fromChain = extractChain(args.fromAssetIdentifier);
      const toChain = extractChain(args.toAssetIdentifier);

      // Build the quote request
      const quoteRequest: QuoteRequest = {
        provider: args.provider,
        fromChain,
        toChain,
        fromAssetIdentifier: args.fromAssetIdentifier,
        toAssetIdentifier: args.toAssetIdentifier,
        amount: args.amount.toString(),
        destination: args.destination,
        refundAddress: args.refundAddress,
        toleranceBps: args.toleranceBps,
        options: args.options,
      };

      // Get the quote
      const quote = await provider.getSwapQuote(quoteRequest);

      // Format the response
      const summary = formatQuoteSummary(quote);

      // Serialize the quote for structured content (convert Dates to ISO strings)
      const serializedQuote = {
        ...quote,
        createdAt: quote.createdAt.toISOString(),
        request: {
          ...quote.request,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
        structuredContent: serializedQuote,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        content: [
          {
            type: "text",
            text: `Error getting swap quote: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  };
}
