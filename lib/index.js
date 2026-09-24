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
/** Official Command Code account endpoints (recorded in the market entry as
*  the verified live-account set; all four are account-scope reads). */
const COMMANDCODE_BASE = "https://api.commandcode.ai/alpha";
const COMMANDCODE_ENDPOINTS = {
	whoami: `${COMMANDCODE_BASE}/whoami`,
	usage: `${COMMANDCODE_BASE}/usage/summary`,
	credits: `${COMMANDCODE_BASE}/billing/credits`,
	subscription: `${COMMANDCODE_BASE}/billing/subscriptions`
};
const COMMANDCODE_KEY_ENV = "COMMANDCODE_API_KEY";
/** Every Command Code pool key the host aggregates, in display order: the primary
*  key above, then spares following the credentials-provider naming convention
*  (…_API_KEY_2 … _4). A ref that resolves to nothing is simply not in the pool. */
const COMMANDCODE_POOL_ENVS = [
	COMMANDCODE_KEY_ENV,
	`${COMMANDCODE_KEY_ENV}_2`,
	`${COMMANDCODE_KEY_ENV}_3`,
	`${COMMANDCODE_KEY_ENV}_4`
];
/** Per-endpoint fetch timeout (ms) so one slow upstream never stalls the rail. */
const COMMANDCODE_TIMEOUT_MS = 8e3;
/** One retry for a slice that failed fast (see `fetchSlice`): the pause before
*  it, and the shorter budget it gets so the worst case stays near the single
*  timeout above. */
const COMMANDCODE_RETRY_DELAY_MS = 250;
const COMMANDCODE_RETRY_TIMEOUT_MS = 4e3;
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
/** How long a JSON route body may be re-served without recomputing it.
*
*  The rail is allowed to poll (a Command Code window moves while the reader
*  watches), and a reader may keep several tabs open, so without a cache every
*  tab buys its own round of upstream calls and its own log fold. 20 s is short
*  enough that no client sees a stale number it could have acted on, and long
*  enough to collapse a burst — including the degraded-payload retry — into one
*  upstream pass. Errors are never cached. */
const ROUTE_CACHE_MS = 2e4;
/** A route answer that must NOT be cached and that carries its own status. */
var RouteError = class extends Error {
	status;
	body;
	constructor(status, body) {
		super(`route responded ${status}`);
		this.status = status;
		this.body = body;
	}
};
/**
* Per-key TTL + single-flight memo for a route body.
*
* `force` (the `?refresh=1` path) skips the TTL but still JOINS an in-flight
* computation, so two tabs asking at the same instant still produce one fold.
* A rejected computation is never stored.
*
* @param ttlMs - how long a stored value stays fresh.
* @returns a reader that computes on miss and shares one promise on a burst.
*/
function memoTtl(ttlMs) {
	const values = /* @__PURE__ */ new Map();
	const inflight = /* @__PURE__ */ new Map();
	return (key, compute, force = false) => {
		const hit = values.get(key);
		if (!force && hit !== void 0 && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
		const pending = inflight.get(key);
		if (pending !== void 0) return pending;
		const next = Promise.resolve().then(compute).then((value) => {
			values.set(key, {
				at: Date.now(),
				value
			});
			inflight.delete(key);
			return value;
		}, (error) => {
			inflight.delete(key);
			throw error;
		});
		inflight.set(key, next);
		return next;
	};
}
/** Minimum gap between two on-demand rescans (ms). The card asks for a refresh
*  when a turn settles; a handful of cards/browsers settling together must not
*  queue a scan each. */
const REFRESH_THROTTLE_MS = 5e3;
/**
* Daily token totals from the optional usage-center service.
*
* `provider` narrows the fold to ONE route. This is not cosmetic: the map feeds
* 「额度管理」's credit→token rate and 今日用量, and the machine-wide map mixes every
* provider the harness talked to that day into a plan that only bills one of them
* (measured 2026-09-20: 758M for the day against 474M actually served by Command
* Code). The mode must be `only` — usage-center's `all`/`merge` modes keep the
* whole window on purpose and would hand a named route the machine-wide map back.
*
* @param ctx - host context.
* @param provider - provider route to scope to, or undefined for every route.
* @returns `{ available: false, reason }` when the service is absent, else the
*   date → tokens map plus the day count the service reported.
*/
function readAuthoritativeDaily(ctx, provider) {
	const service = ctx.get?.("usageCenter");
	if (service === void 0 || service === null || typeof service.getActivity !== "function") return {
		available: false,
		reason: "usage-center-unavailable"
	};
	const scoped = typeof provider === "string" && provider.length > 0;
	try {
		const payload = scoped ? service.getActivity(provider, void 0, "only") : service.getActivity();
		const rows = Array.isArray(payload?.activity) ? payload.activity : [];
		const daily = {};
		for (const row of rows) {
			const date = typeof row?.date === "string" ? row.date : null;
			const total = typeof row?.totalTokens === "number" && Number.isFinite(row.totalTokens) ? row.totalTokens : null;
			if (date !== null && total !== null) daily[date] = total;
		}
		if (Object.keys(daily).length === 0) return {
			available: false,
			reason: "usage-center-empty"
		};
		return {
			available: true,
			source: "usage-center",
			...scoped ? { provider } : {},
			days: rows.length,
			daily
		};
	} catch (error) {
		return {
			available: false,
			reason: error instanceof Error ? error.message : String(error)
		};
	}
}
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
/**
* Build the `/api/commandcode-usage` body: the four official account endpoints
* for EVERY configured pool key, aggregated into one same-origin payload.
*
*   { ...fourSlices,                        // = the first pool member
*     keys: [{ ref, label, tail, data }] }  // every member, in pool order
*
* The browser never talks to api.commandcode.ai directly. The top-level slices
* keep their pre-pool shape (the first member), so a single-pool install — and
* any consumer written before pools existed — reads exactly what it read
* before. `keys` is what makes the card family switchable; each member's label
* is the account name from ITS OWN `/alpha/whoami`, so the card subtitle reads
* the real account (`Physicolor` / `Sparxie`) rather than `Key 2`. The AllUser
* total is deliberately NOT computed here: the plan -> monthly-allowance table
* lives in the client (`cc-view`), which is the only side that can size a
* two-plan allowance correctly.
*
* Each endpoint is fetched and timed out independently: one failing endpoint
* yields null for that slice, one failing KEY yields `data: null` for that
* member, and the rest still render. A missing pool is a `RouteError` (503) so
* the memo above never caches it as an answer.
*
* @param ctx - host context carrying the credentials seam.
* @returns the JSON body.
*/
async function buildCommandCodeBody(ctx) {
	const pool = [];
	for (const ref of COMMANDCODE_POOL_ENVS) {
		const key = (await ctx.credentials.resolve(ref).catch(() => void 0))?.value;
		if (key !== void 0 && key !== "") pool.push({
			ref,
			key
		});
	}
	if (pool.length === 0) throw new RouteError(503, JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }));
	const fetchSliceOnce = async (key, name, timeoutMs) => {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), timeoutMs);
			try {
				const upstream = await fetch(COMMANDCODE_ENDPOINTS[name], {
					headers: { Authorization: `Bearer ${key}` },
					signal: ctrl.signal
				});
				const text = await upstream.text();
				if (!upstream.ok) return {
					value: null,
					retryable: upstream.status >= 500 || upstream.status === 429
				};
				try {
					return {
						value: JSON.parse(text),
						retryable: false
					};
				} catch {
					return {
						value: null,
						retryable: true
					};
				}
			} finally {
				clearTimeout(timer);
			}
		} catch {
			return {
				value: null,
				retryable: true
			};
		}
	};
	const fetchSlice = async (key, name) => {
		const started = Date.now();
		const first = await fetchSliceOnce(key, name, COMMANDCODE_TIMEOUT_MS);
		if (first.value !== null || !first.retryable) return first.value;
		if (Date.now() - started > COMMANDCODE_TIMEOUT_MS / 2) return null;
		await new Promise((resolve) => setTimeout(resolve, COMMANDCODE_RETRY_DELAY_MS));
		return (await fetchSliceOnce(key, name, COMMANDCODE_RETRY_TIMEOUT_MS)).value;
	};
	const readAccount = async (key) => {
		const [whoami, usage, credits, subscription] = await Promise.all([
			fetchSlice(key, "whoami"),
			fetchSlice(key, "usage"),
			fetchSlice(key, "credits"),
			fetchSlice(key, "subscription")
		]);
		return {
			whoami,
			usage,
			credits,
			subscription
		};
	};
	const members = await Promise.all(pool.map(async ({ ref, key }) => ({
		ref,
		tail: key.slice(-4),
		data: await readAccount(key)
	})));
	const used = /* @__PURE__ */ new Set();
	const keys = members.map(({ ref, tail, data }, i) => {
		const user = data.whoami?.user;
		const name = typeof user?.name === "string" && user.name !== "" ? user.name : typeof user?.userName === "string" && user.userName !== "" ? user.userName : "";
		const base = name !== "" ? name : `Key ${i + 1}`;
		const label = used.has(base) ? `${base} (${tail})` : base;
		used.add(base);
		return {
			ref,
			label,
			tail,
			data
		};
	});
	const primary = keys[0]?.data ?? {
		whoami: null,
		usage: null,
		credits: null,
		subscription: null
	};
	return JSON.stringify({
		...primary,
		keys
	});
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
	const commandCodeBody = memoTtl(ROUTE_CACHE_MS);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/commandcode-usage",
		handler: async (_req, res) => {
			try {
				const body = await commandCodeBody("pool", () => buildCommandCodeBody(ctx));
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
			} catch (error) {
				if (error instanceof RouteError) {
					res.writeHead(error.status, { "Content-Type": "application/json" });
					res.end(error.body);
					return;
				}
				res.writeHead(502, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
			}
		}
	}));
	let lastRefreshAt = 0;
	const dailyBody = memoTtl(ROUTE_CACHE_MS);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/widgets-usage-daily",
		handler: async (req, res) => {
			const url = req?.url ?? "";
			let provider;
			try {
				provider = new URL(url, "http://localhost").searchParams.get("provider")?.trim() || void 0;
			} catch {
				provider = void 0;
			}
			const force = url.includes("refresh=1");
			if (force && Date.now() - lastRefreshAt >= REFRESH_THROTTLE_MS) {
				lastRefreshAt = Date.now();
				const service = ctx.get?.("usageCenter");
				try {
					await service?.refresh?.();
				} catch {}
			}
			const body = await dailyBody(provider ?? "*", () => JSON.stringify(readAuthoritativeDaily(ctx, provider)), force);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(body);
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
		/** Utilization sample history for the sparklines (newest last). */
		const history = [];
		const HISTORY_CAP = 120;
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
				history.push({
					t: now,
					cpu: util,
					gpu: gpu?.util ?? null
				});
				if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP);
				const payload = {
					ts: now,
					cpu: { util },
					mem: {
						used: memUsed,
						total: totalBytes,
						percent: totalBytes > 0 ? Math.round(memUsed / totalBytes * 1e3) / 10 : 0
					},
					gpu,
					history: {
						ts: history.map((h) => h.t),
						cpu: history.map((h) => h.cpu),
						gpu: history.map((h) => h.gpu)
					}
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
