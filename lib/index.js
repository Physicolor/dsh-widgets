import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { promises } from "node:fs";
//#region src/index.ts
/**
* Harness Widgets — host (node) half.
*
* Registers two same-origin HTTP routes:
*  - `/api/opencode-usage`: proxies the OpenCode Go usage endpoint (the browser
*    never issues a cross-origin request — the OpenCode API requires a Bearer
*    header and does not allow browser CORS; the key resolves through the
*    credentials seam, the same key the Models settings page configures).
*  - `/api/widgets-state`: GET/PUT the persisted widget-rail state. The state
*    lives in a JSON file under the profile data dir, so it survives browser
*    local-storage quirks (private mode, site-data clearing, and the *origin
*    gap*: `localhost:3080` vs `127.0.0.1:3080` are different browser origins
*    with separate localStorage — the shared host file is what makes the
*    configuration follow any browser/address that hits the same DSH service).
*/
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const KEY_ENV = "OPENCODE_GO_API_KEY";
/** Max accepted PUT body (a prefs JSON is a few KB; this is a hard safety cap). */
const MAX_STATE_BYTES = 2097152;
/** Required services: the web server (route registration) and the credentials seam (API key). */
const inject = ["webServer", "credentials"];
/** Widget-rail state file under the profile data dir (same dir as the patch file). */
function stateFilePath() {
	const home = process.env.DSH_HOME;
	const base = home !== void 0 && home.length > 0 ? home : join(homedir(), ".dsh");
	return join(base, "profiles", "web", "dsh-widgets-state.json");
}
/** Accumulate a Node IncomingMessage body into a JSON value (size-capped). */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
		size += buf.length;
		if (size > MAX_STATE_BYTES) throw new Error("state payload too large");
		chunks.push(buf);
	}
	if (chunks.length === 0) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		return {};
	}
}
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
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/widgets-state",
		handler: async (req, res) => {
			const method = req?.method ?? "GET";
			const file = stateFilePath();
			if (method === "GET") {
				let body = JSON.stringify({
					savedAt: 0,
					state: {}
				});
				try {
					if (await promises.stat(file) !== void 0) body = await promises.readFile(file, "utf8");
				} catch {}
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
				return;
			}
			if (method === "PUT" || method === "POST") {
				try {
					const data = await readJsonBody(req);
					const text = JSON.stringify(data);
					await promises.mkdir(dirname(file), { recursive: true });
					const tmp = `${file}.tmp`;
					await promises.writeFile(tmp, text, "utf8");
					await promises.rename(tmp, file);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ ok: true }));
				} catch (error) {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
				}
				return;
			}
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "method not allowed" }));
		}
	}));
}
//#endregion
export { apply, inject };
