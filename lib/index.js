import { dirname, join } from "node:path";
import { cpus, freemem, homedir, totalmem } from "node:os";
import { promises } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
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
const execFileP = promisify(execFile);
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const KEY_ENV = "OPENCODE_GO_API_KEY";
/** Spare pool keys (dsh-multikey-pool convention) appended after the primary. */
const POOL_KEY_ENVS = [
	"OPENCODE_GO_API_KEY",
	"OPENCODE_GO_POOL_2",
	"OPENCODE_GO_POOL_3",
	"OPENCODE_GO_POOL_4",
	"OPENCODE_GO_POOL_5",
	"OPENCODE_GO_POOL_6",
	"OPENCODE_GO_POOL_7",
	"OPENCODE_GO_POOL_8",
	"OPENCODE_GO_POOL_9"
];
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
		path: "/api/opencode-usage-multi",
		handler: async (_req, res) => {
			const keys = [];
			for (const ref of POOL_KEY_ENVS) {
				const key = (await ctx.credentials.resolve(ref).catch(() => void 0))?.value;
				if (key === void 0 || key === "") continue;
				const entry = {
					ref,
					label: `Key ${keys.length + 1}`,
					tail: key.slice(-4),
					data: null
				};
				try {
					entry.data = await (await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } })).json().catch(() => null);
				} catch {}
				keys.push(entry);
			}
			const read = (win) => {
				const out = [];
				for (const k of keys) {
					const item = k.data?.usage?.[win];
					if (typeof item?.percent !== "number") continue;
					out.push({
						percent: item.percent,
						status: item.status,
						resetsAt: item.resetsAt
					});
				}
				return out;
			};
			const total = (() => {
				const build = (win) => {
					const items = read(win);
					if (items.length === 0) return void 0;
					const max = items.reduce((a, b) => b.percent > a.percent ? b : a);
					return {
						percent: Math.round(items.reduce((a, b) => a + b.percent, 0) / items.length),
						status: max.status ?? "ok",
						resetsAt: max.resetsAt ?? ""
					};
				};
				const rolling = build("rolling");
				const weekly = build("weekly");
				const monthly = build("monthly");
				if (rolling === void 0 && weekly === void 0 && monthly === void 0) return null;
				return { usage: {
					rolling: rolling ?? {
						status: "ok",
						percent: 0,
						resetsAt: ""
					},
					weekly: weekly ?? {
						status: "ok",
						percent: 0,
						resetsAt: ""
					},
					monthly: monthly ?? {
						status: "ok",
						percent: 0,
						resetsAt: ""
					}
				} };
			})();
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				keys,
				total
			}));
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
	ctx.effect(() => {
		let lastCpu = null;
		let cache = null;
		return ctx.webServer.register({
			kind: "exact",
			path: "/api/sysinfo",
			handler: async (_req, res) => {
				const now = Date.now();
				if (cache !== null && now - cache.ts < 1e3) {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(cache.payload));
					return;
				}
				let idle = 0;
				let total = 0;
				for (const c of cpus()) {
					idle += c.times.idle;
					total += c.times.idle + c.times.user + c.times.nice + c.times.sys + c.times.irq;
				}
				let util = null;
				if (lastCpu !== null) {
					const dTotal = total - lastCpu.total;
					const dIdle = idle - lastCpu.idle;
					if (dTotal > 0) util = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 1e3) / 10));
				}
				lastCpu = {
					idle,
					total
				};
				const totalBytes = totalmem();
				const freeBytes = freemem();
				let gpu = null;
				try {
					const stdout = (await execFileP("nvidia-smi", ["--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"], {
						timeout: 3e3,
						windowsHide: true
					})).stdout;
					const line = String(stdout).split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
					if (line !== void 0) {
						const parts = line.split(",").map((s) => s.trim());
						const memUsed = Number(parts[3]);
						const memTotal = Number(parts[4]);
						gpu = {
							name: parts[0] ?? "",
							temp: Number(parts[1]),
							util: Number(parts[2]),
							memUsed,
							memTotal,
							memPercent: memTotal > 0 ? Math.round(memUsed / memTotal * 1e3) / 10 : 0
						};
					}
				} catch {
					gpu = null;
				}
				const memUsed = totalBytes - freeBytes;
				const payload = {
					ts: now,
					cpu: { util },
					mem: {
						used: memUsed,
						total: totalBytes,
						percent: totalBytes > 0 ? Math.round(memUsed / totalBytes * 1e3) / 10 : 0
					},
					gpu
				};
				cache = {
					ts: now,
					payload
				};
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(payload));
			}
		});
	});
}
//#endregion
export { apply, inject };
