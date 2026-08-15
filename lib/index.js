//#region src/index.ts
/**
* Harness Widgets — host (node) half.
*
* Registers one same-origin HTTP route, `/api/opencode-usage`, that proxies
* the OpenCode Go usage endpoint. The route runs on the Host so the browser
* never issues a cross-origin request (the OpenCode API requires a Bearer
* header and does not allow browser CORS). The API key resolves through the
* credentials seam (`OPENCODE_GO_API_KEY`, the same key the Models settings
* page configures for the opencode-go provider) and is read per request.
*/
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const KEY_ENV = "OPENCODE_GO_API_KEY";
/** Required services: the web server (route registration) and the credentials seam (API key). */
const inject = ["webServer", "credentials"];
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/opencode-usage",
		handler: async (_req, res) => {
			const key = (await ctx.credentials.resolve(KEY_ENV))?.value;
			if (key === void 0 || key === "") {
				res.writeHead(503, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: `${KEY_ENV} is not configured` }));
				return;
			}
			try {
				const upstream = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } });
				const text = await upstream.text();
				res.writeHead(upstream.status, { "Content-Type": "application/json" });
				res.end(text);
			} catch (error) {
				res.writeHead(502, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
			}
		}
	}));
}
//#endregion
export { apply, inject };
