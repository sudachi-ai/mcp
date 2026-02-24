import { Hono } from "hono";
import { localhostAllowedHostnames, validateHostHeader } from "@modelcontextprotocol/server";

//#region src/middleware/hostHeaderValidation.ts
/**
* Hono middleware for DNS rebinding protection.
* Validates `Host` header hostname (port-agnostic) against an allowed list.
*/
function hostHeaderValidation(allowedHostnames) {
	return async (c, next) => {
		const result = validateHostHeader(c.req.header("host"), allowedHostnames);
		if (!result.ok) return c.json({
			jsonrpc: "2.0",
			error: {
				code: -32e3,
				message: result.message
			},
			id: null
		}, 403);
		return await next();
	};
}
/**
* Convenience middleware for `localhost` DNS rebinding protection.
*/
function localhostHostValidation() {
	return hostHeaderValidation(localhostAllowedHostnames());
}

//#endregion
//#region src/hono.ts
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
function createMcpHonoApp(options = {}) {
	const { host = "127.0.0.1", allowedHosts } = options;
	const app = new Hono();
	app.use("*", async (c, next) => {
		if (c.get("parsedBody") !== void 0) return await next();
		if (!(c.req.header("content-type") ?? "").includes("application/json")) return await next();
		try {
			const parsed = await c.req.raw.clone().json();
			c.set("parsedBody", parsed);
		} catch {
			return c.text("Invalid JSON", 400);
		}
		return await next();
	});
	if (allowedHosts) app.use("*", hostHeaderValidation(allowedHosts));
	else if ([
		"127.0.0.1",
		"localhost",
		"::1"
	].includes(host)) app.use("*", localhostHostValidation());
	else if (host === "0.0.0.0" || host === "::") console.warn(`Warning: Server is binding to ${host} without DNS rebinding protection. Consider using the allowedHosts option to restrict allowed hosts, or use authentication to protect your server.`);
	return app;
}

//#endregion
export { createMcpHonoApp, hostHeaderValidation, localhostHostValidation };
//# sourceMappingURL=index.mjs.map