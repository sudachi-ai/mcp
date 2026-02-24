import { Hono, MiddlewareHandler } from "hono";

//#region src/hono.d.ts

/**
 * Options for creating an MCP Hono application.
 */
interface CreateMcpHonoAppOptions {
  /**
   * The hostname to bind to. Defaults to `'127.0.0.1'`.
   * When set to `'127.0.0.1'`, `'localhost'`, or `'::1'`, DNS rebinding protection is automatically enabled.
   */
  host?: string;
  /**
   * List of allowed hostnames for DNS rebinding protection.
   * If provided, host header validation will be applied using this list.
   * For IPv6, provide addresses with brackets (e.g., '[::1]').
   *
   * This is useful when binding to '0.0.0.0' or '::' but still wanting
   * to restrict which hostnames are allowed.
   */
  allowedHosts?: string[];
}
/**
 * Creates a Hono application pre-configured for MCP servers.
 *
 * When the host is `'127.0.0.1'`, `'localhost'`, or `'::1'` (the default is `'127.0.0.1'`),
 * DNS rebinding protection middleware is automatically applied to protect against
 * DNS rebinding attacks on localhost servers.
 *
 * This also installs a small JSON body parsing middleware (similar to `express.json()`)
 * that stashes the parsed body into `c.set('parsedBody', ...)` when `Content-Type` includes
 * `application/json`.
 *
 * @param options - Configuration options
 * @returns A configured Hono application
 */
declare function createMcpHonoApp(options?: CreateMcpHonoAppOptions): Hono;
//#endregion
//#region src/middleware/hostHeaderValidation.d.ts
/**
 * Hono middleware for DNS rebinding protection.
 * Validates `Host` header hostname (port-agnostic) against an allowed list.
 */
declare function hostHeaderValidation(allowedHostnames: string[]): MiddlewareHandler;
/**
 * Convenience middleware for `localhost` DNS rebinding protection.
 */
declare function localhostHostValidation(): MiddlewareHandler;
//#endregion
export { CreateMcpHonoAppOptions, createMcpHonoApp, hostHeaderValidation, localhostHostValidation };
//# sourceMappingURL=index.d.mts.map