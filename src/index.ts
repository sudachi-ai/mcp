import { serve } from "@hono/node-server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as z from "zod/v4";
import { ProviderRegistry } from "./providers/registry.js";
import { THORChainProvider } from "./providers/thorchain.js";
import { createGetAssetsHandler } from "./tools/get-assets.js";
import { getQuoteHandler } from "./tools/get-quote.js";

// Initialize provider registry
const registry = new ProviderRegistry();
registry.register(new THORChainProvider());

// Create the MCP server
const server = new McpServer({
  name: "sudachi-ai",
  version: "0.0.1-beta.1",
});

server.registerTool(
  "get_swap_assets",
  {
    title: "Get Swap Assets",
    description:
      "Get all available swap assets from registered providers. Returns asset details including symbol, chain, price, liquidity, and trading volume.",
    inputSchema: z.object({
      provider: z
        .enum(["thorchain"]) // add more providers as needed (ie "lifi", "1inch", etc.)
        .optional()
        .describe("Optional: filter by specific provider (e.g., 'thorchain')"),
    }), //  as any, // temporary workaround until mcp v2 released on npm
  },
  createGetAssetsHandler(registry),
);

server.registerTool(
  "get_swap_quote",
  {
    description: `Get a swap quote from a provider.

    IMPORTANT: Use the exact asset 'identifier' from get_swap_assets response.

    Examples:
    - THORChain: fromAssetIdentifier: "BTC.BTC", toAssetIdentifier: "ETH.ETH"
    - THORChain: fromAssetIdentifier: "ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    `,
    inputSchema: z.object({
      provider: z.enum(["thorchain"]),
      fromAssetIdentifier: z
        .string()
        .describe("Exact 'identifier' from get_swap_assets"),
      toAssetIdentifier: z
        .string()
        .describe("Exact 'identifier' from get_swap_assets"),
      amount: z
        .number()
        .describe("Human readable amount (e.g., 1.5 for 1.5 ETH)"),
      destination: z
        .string()
        .describe("Destination address to receive swapped assets"),
      // refundAddress: z
      //   .string()
      //   .optional()
      //   .describe("Optional refund address if swap fails"),
      toleranceBps: z
        .number()
        .optional()
        .describe("Slippage tolerance in basis points (default: 300 = 3%)"),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Provider-specific options (e.g., streamingInterval, streamingQuantity for THORChain)",
        ),
    }), //  as any, // temporary workaround until mcp v2 released on npm
  },
  getQuoteHandler(registry),
);

// Create a stateless transport (no options = no session management)
const transport = new WebStandardStreamableHTTPServerTransport();

// Create the Hono app
const app = new Hono();

// Enable CORS for all origins
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "mcp-session-id",
      "Last-Event-ID",
      "mcp-protocol-version",
    ],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  }),
);

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// MCP endpoint
app.all("/mcp", (c) => transport.handleRequest(c.req.raw));

// Start the server
const PORT = process.env.MCP_PORT
  ? Number.parseInt(process.env.MCP_PORT, 10)
  : 3000;

await server.connect(transport);

console.log(`Starting Hono MCP server on port ${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);

serve({
  fetch: app.fetch,
  port: PORT,
});
