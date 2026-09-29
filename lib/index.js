import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cpus, freemem, homedir, tmpdir, totalmem } from "node:os";
import { readdir, stat, statfs } from "node:fs/promises";
import { connect } from "node:net";
//#region src/host/opencode.ts
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
/** Register both OpenCode usage routes; returns the disposer `ctx.effect` wants. */
function registerOpenCodeUsage(ctx) {
	const offUsage = ctx.webServer.register({
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
	});
	const offMulti = ctx.webServer.register({
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
	});
	return () => {
		offUsage();
		offMulti();
	};
}
//#endregion
//#region src/host/http.ts
/**
* dsh-widgets — the shared host HTTP plumbing.
*
* `memoTtl` (the per-key TTL + single-flight cache the channels share),
* `readJsonBody` (the size-capped request body reader) and the two policy
* constants they are written against. Split out of `src/index.ts` (Phase H1).
*/
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
//#endregion
//#region src/host/commandcode.ts
/**
* dsh-widgets — the Command Code account channel.
*
* `/api/commandcode-usage`: the four official account endpoints, fetched and
* timed out independently for EVERY configured pool key, folded into one payload.
* Split out of `src/index.ts` (Phase H2) with the body builder unchanged.
*/
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
/**
* Slices whose upstream answer is SLOW and whose content barely moves.
*
* Measured 2026-09-30 against the live account: `/alpha/billing/credits` answers in
* ~1 s, while `/alpha/whoami`, `/alpha/usage/summary` and
* `/alpha/billing/subscriptions` took **14–21 s on six consecutive calls** (a
* browser-like header set made no difference) — and 3.6–4.2 s twenty minutes later,
* i.e. that upstream's latency for these three is VARIABLE, which is exactly why one
* hard 8 s budget could never be right. During the slow window those three were
* dropped on EVERY poll, and the family degraded exactly as the cards showed it: no
* monthly window (the month is `allowance − remaining` and the allowance comes from
* the subscription's plan), `Key N` labels instead of the account names, and 额度预测
* down to `-%` with 今日推荐 `—`.
*
* So the budget is per slice: the SLOW three get a generous one, and they are
* refreshed OUT OF BAND (see `createSliceStore`) — a card never waits 20 s for them.
*/
const COMMANDCODE_SLOW_TIMEOUT_MS = 3e4;
/** How long a route answer may wait for a slice it has NEVER seen. The three slow
*  slices are only *left behind* after this; their fetch keeps running and lands in
*  the store, so the next poll carries them. Also what keeps a cold route call
*  inside the rail's patience (measured: 1 s of credits + this). */
const COMMANDCODE_COLD_WAIT_MS = 1500;
/** The pause before the fast slice's one retry, and the shorter budget it gets so
*  the worst case stays near the single timeout above. */
const COMMANDCODE_RETRY_DELAY_MS = 250;
const COMMANDCODE_RETRY_TIMEOUT_MS = 4e3;
/** Floor between two refresh ATTEMPTS of the same slice after a failure, so a
*  provider that stays down is retried once a minute rather than once a poll. */
const COMMANDCODE_RETRY_FLOOR_MS = 6e4;
/** The floor for a slice we have NEVER answered: the cards are MISSING a number
*  while it is empty (not showing an old one), and the upstream's answer for these
*  three is slow but reliable — measured 2026-09-30, 14–21 s and 200 on five of six
*  runs, one 500 — so an empty slice is re-attempted on this cadence instead of
*  waiting out the stale-value floor above. */
const COMMANDCODE_EMPTY_RETRY_FLOOR_MS = 15e3;
/**
* One slice's cache policy. `ttlMs` is how long an answer is reused before a
* background refresh; `timeoutMs` is its own fetch budget; `awaitMs` is how long a
* ROUTE CALL may wait for a slice that is not in the store yet (0 = never).
*
* `credits` is the only slice every card needs and the only fast one, so it is
* awaited for its whole budget; the slow three are awaited only for the cold wait.
*/
const SLICE_PLAN = {
	credits: {
		ttlMs: ROUTE_CACHE_MS,
		timeoutMs: COMMANDCODE_TIMEOUT_MS,
		awaitMs: COMMANDCODE_TIMEOUT_MS
	},
	usage: {
		ttlMs: 3e5,
		timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS,
		awaitMs: COMMANDCODE_COLD_WAIT_MS
	},
	subscription: {
		ttlMs: 6e5,
		timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS,
		awaitMs: COMMANDCODE_COLD_WAIT_MS
	},
	whoami: {
		ttlMs: 36e5,
		timeoutMs: COMMANDCODE_SLOW_TIMEOUT_MS,
		awaitMs: COMMANDCODE_COLD_WAIT_MS
	}
};
/** The payload's field order, kept as the four-slice object always had it. */
const SLICE_ORDER = [
	"whoami",
	"usage",
	"credits",
	"subscription"
];
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
* One upstream call, tagged so the caller knows whether a failure is worth another
* round trip. A 4xx (a revoked key, a plan-less account) is an ANSWER and retrying
* it only burns the shared rate limit; a timeout, a connection reset, a 5xx or a
* truncated body is the transient kind.
*/
async function fetchSliceOnce(key, name, timeoutMs) {
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
}
/**
* One slice, fetched with one retry when the first attempt failed FAST.
*
* A dropped slice used to be final for the whole poll: the browser only re-asks on
* mount and when a turn settles, so a transient failure left the card family reading
* a partial pool for the rest of the session (measured 2026-09-20: the 额度管理 card
* answered 20.2% / `账期 10-20` / `今日推荐 59.9M` where the full payload says 16.6%
* / `账期 10-10` / 645M). One retry turns that into a blip — but only when the first
* attempt failed FAST, because a retry after a full timeout would double the wait.
*/
async function fetchSlice(key, name, timeoutMs) {
	const started = Date.now();
	const first = await fetchSliceOnce(key, name, timeoutMs);
	if (first.value !== null || !first.retryable) return first.value;
	if (Date.now() - started > timeoutMs / 2) return null;
	await new Promise((resolve) => setTimeout(resolve, COMMANDCODE_RETRY_DELAY_MS));
	return (await fetchSliceOnce(key, name, Math.min(timeoutMs, COMMANDCODE_RETRY_TIMEOUT_MS))).value;
}
/**
* The per-(member, endpoint) slice store: last good answer + the refresh in flight.
*
* This is what makes a slow upstream survivable. Before it, every route call fetched
* all four endpoints and a slice that missed its budget became `null` for that whole
* poll — with the live 14–21 s answers (see `COMMANDCODE_SLOW_TIMEOUT_MS`) three of
* four slices were null on EVERY poll, so the monthly window could never be drawn.
* Now:
*   - a fresh slice (younger than its TTL) is handed out untouched — the identity and
*     the billing period are re-read once an hour / ten minutes, not every 20 s;
*   - an expired one starts a background refresh and the caller still gets the last
*     good value immediately;
*   - a failed refresh KEEPS the last good value (never blanks a slice we know), and
*     the next attempt waits out `COMMANDCODE_RETRY_FLOOR_MS`.
*/
function createSliceStore() {
	const values = /* @__PURE__ */ new Map();
	const attempts = /* @__PURE__ */ new Map();
	const flights = /* @__PURE__ */ new Map();
	const id = (member, name) => `${member}|${name}`;
	const read = (key, member, name) => {
		const plan = SLICE_PLAN[name];
		const idKey = id(member, name);
		const hit = values.get(idKey);
		const fresh = hit !== void 0 && Date.now() - hit.at < plan.ttlMs;
		let flight = flights.get(idKey) ?? null;
		const sinceAttempt = Date.now() - (attempts.get(idKey) ?? 0);
		const floor = hit === void 0 ? COMMANDCODE_EMPTY_RETRY_FLOOR_MS : Math.min(plan.ttlMs, COMMANDCODE_RETRY_FLOOR_MS);
		if (!fresh && flight === null && sinceAttempt >= floor) {
			attempts.set(idKey, Date.now());
			flight = fetchSlice(key, name, plan.timeoutMs).then((value) => {
				if (value !== null && value !== void 0) values.set(idKey, {
					at: Date.now(),
					value
				});
			}, () => {}).finally(() => {
				flights.delete(idKey);
			});
			flights.set(idKey, flight);
		}
		return {
			value: hit?.value ?? null,
			flight
		};
	};
	return {
		read,
		latest: (member, name) => values.get(id(member, name))?.value ?? null
	};
}
/** Read one pool member's four slices: the slow ones out of band, credits awaited. */
async function readAccount(key, member, slices) {
	const pending = SLICE_ORDER.map((name) => ({
		name,
		...slices.read(key, member, name)
	}));
	await Promise.all(pending.map(({ name, flight }) => {
		if (flight === null) return Promise.resolve();
		const budget = SLICE_PLAN[name].awaitMs;
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, budget);
			flight.then(() => {
				clearTimeout(timer);
				resolve();
			});
		});
	}));
	const out = {};
	for (const { name, value } of pending) out[name] = slices.latest(member, name) ?? value;
	return out;
}
/**
* Resolve every configured pool key, in order. A missing spare is normal, and a
* credentials ref that resolves to nothing is simply not a member.
*/
async function resolvePool(ctx) {
	const pool = [];
	for (const ref of COMMANDCODE_POOL_ENVS) {
		const key = (await ctx.credentials.resolve(ref).catch(() => void 0))?.value;
		if (key !== void 0 && key !== "") pool.push({
			ref,
			key
		});
	}
	return pool;
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
* @param slices - the per-member slice store (see `createSliceStore`).
* @returns the JSON body.
*/
async function buildCommandCodeBody(ctx, slices) {
	const pool = await resolvePool(ctx);
	if (pool.length === 0) throw new RouteError(503, JSON.stringify({ error: `${COMMANDCODE_KEY_ENV} is not configured` }));
	const members = await Promise.all(pool.map(async ({ ref, key }) => ({
		ref,
		tail: key.slice(-4),
		data: await readAccount(key, `${ref}:${key.slice(-4)}`, slices)
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
/** Register the Command Code usage route; returns the disposer `ctx.effect` wants. */
function registerCommandCodeUsage(ctx) {
	const slices = createSliceStore();
	(async () => {
		const pool = await resolvePool(ctx).catch(() => []);
		for (const { ref, key } of pool) {
			const member = `${ref}:${key.slice(-4)}`;
			for (const name of SLICE_ORDER) slices.read(key, member, name);
		}
	})();
	const commandCodeBody = memoTtl(ROUTE_CACHE_MS);
	return ctx.webServer.register({
		kind: "exact",
		path: "/api/commandcode-usage",
		handler: async (_req, res) => {
			try {
				const body = await commandCodeBody("pool", () => buildCommandCodeBody(ctx, slices));
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
	});
}
//#endregion
//#region src/host/usage-daily.ts
/**
* dsh-widgets — the authoritative daily-token channel.
*
* `/api/widgets-usage-daily`: re-serves dsh-usage-center's own per-day fold (the
* heatmap cards' one source of truth), optionally narrowed to one provider and
* optionally forced to rescan now. Split out of `src/index.ts` (Phase H4).
*/
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
/** Register the daily-token route; returns the disposer `ctx.effect` wants. */
function registerUsageDaily(ctx) {
	let lastRefreshAt = 0;
	const dailyBody = memoTtl(ROUTE_CACHE_MS);
	return ctx.webServer.register({
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
	});
}
//#endregion
//#region src/host/exec.ts
/**
* dsh-widgets — the one subprocess seam the host half uses.
*
* Two channels shell out (the NVIDIA query behind `/api/sysinfo`, and the local
* `gh` CLI's credential rung behind `/api/github`), so the promisified
* `execFile` lives here instead of being redeclared per module. Split out of
* `src/index.ts` (Phase H1).
*/
const execFileP = promisify(execFile);
//#endregion
//#region src/host/github.ts
/**
* dsh-widgets — the GitHub channel.
*
* `/api/github`: the contribution calendar and the repo pulse, with the three-rung
* credential ladder (credentials seam -> local `gh` CLI -> anonymous) and five
* separately-cached slices. Split out of `src/index.ts` (Phase H3) unchanged; the
* slice caches stay at module scope, so their lifetime is what it always was.
*/
const GITHUB_API = "https://api.github.com";
/** Credential refs tried in order. Same seam as every other key in this file. */
const GITHUB_TOKEN_REFS = ["GITHUB_TOKEN", "GH_TOKEN"];
/** Per-request upstream timeout: the contribution page has been measured at
*  1.0–8.6 s on this machine, so a 9 s budget keeps a slow scrape from being
*  reported as a failure while still bounding one card's first paint. */
const GITHUB_TIMEOUT_MS = 9e3;
/** The calendar is expensive (225 KB scraped, or one GraphQL call) and moves
*  at most once a day — 30 min is both cheap and honest. */
const GITHUB_CONTRIB_TTL_MS = 18e5;
/** Repo pulse: stars/issues/push move on a human timescale, and this TTL is
*  what keeps an anonymous install inside GitHub's 60/h IP budget
*  (4 repos × 3 calls ÷ 15 min ≈ 48/h worst case, 12/h for the usual one). */
const GITHUB_REPOS_TTL_MS = 9e5;
/** How long a resolved credential is reused before re-resolving (the `gh`
*  fallback spawns a process, so it must never run per request). */
const GITHUB_AUTH_TTL_MS = 3e5;
/** Repos one request may ask for (the widget family's own cap too). */
const GITHUB_MAX_REPOS = 4;
/** GitHub's API etiquette requires a UA; the HTML path pretends to be a
*  browser because that endpoint is not an API. */
const GITHUB_UA = "dsh-widgets (+https://github.com/Physicolor/dsh-widgets)";
const GITHUB_BROWSER_UA = "Mozilla/5.0 (compatible; dsh-widgets/1.8)";
/** Narrow an unknown JSON value to an object (no arrays). */
function asRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
/** A finite number, else `fallback`. */
function num$1(value, fallback = 0) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
/** A non-empty string, else null. */
function str$1(value) {
	return typeof value === "string" && value !== "" ? value : null;
}
/** GET/POST upstream with a hard timeout; returns `{ status, text }` so the
*  caller can tell a rate limit (403/429) from a missing resource (404). */
async function githubFetch(url, init = {}) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), GITHUB_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			...init,
			signal: ctrl.signal
		});
		const text = await res.text();
		return {
			status: res.status,
			text,
			ok: res.ok,
			etag: res.headers.get("etag")
		};
	} finally {
		clearTimeout(timer);
	}
}
/** GitHub REST headers for a token (or none). */
function githubHeaders(token) {
	return {
		"User-Agent": GITHUB_UA,
		"Accept": "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		...token === null ? {} : { Authorization: `Bearer ${token}` }
	};
}
/**
* Resolve the GitHub credential through the three-rung ladder.
*
* Rung 2 exists so the widget works with NO configuration at all for anyone who
* has ever run `gh auth login` — the CLI already holds an OAuth token, and
* reading it is the same kind of host-side capability as the `nvidia-smi` call
* this host already makes. It is deliberately OPTIONAL: no `gh`, no login, a
* sandbox that forbids exec — every failure falls through to anonymous.
*/
async function resolveGitHubCred(ctx) {
	for (const ref of GITHUB_TOKEN_REFS) {
		const value = (await ctx.credentials.resolve(ref).catch(() => void 0))?.value;
		if (value !== void 0 && value !== "") return {
			token: value,
			auth: "credentials"
		};
	}
	try {
		const out = await execFileP("gh", ["auth", "token"], {
			timeout: 3e3,
			windowsHide: true
		});
		const token = String(out.stdout).trim();
		if (token !== "") return {
			token,
			auth: "gh"
		};
	} catch {}
	return {
		token: null,
		auth: "anonymous"
	};
}
/** GitHub's contribution level enum -> the 0..4 bucket the grid draws. */
const GITHUB_LEVELS = {
	NONE: 0,
	FIRST_QUARTILE: 1,
	SECOND_QUARTILE: 2,
	THIRD_QUARTILE: 3,
	FOURTH_QUARTILE: 4
};
/** Chronological day list -> the two run lengths the card shows.
*
*  `streak` counts back from TODAY (or from yesterday when today has no
*  contribution yet) — the day is not over, so an empty today must not read as
*  "streak broken" the way a naive reverse scan would report it. */
function summariseContribDays(days) {
	let longest = 0;
	let run = 0;
	for (const d of days) {
		run = d.count > 0 ? run + 1 : 0;
		if (run > longest) longest = run;
	}
	const todayKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	let i = days.length - 1;
	if (i >= 0 && days[i].date === todayKey && days[i].count === 0) i--;
	let streak = 0;
	for (; i >= 0 && days[i].count > 0; i--) streak++;
	return {
		streak,
		longest
	};
}
/**
* The contribution calendar through the OFFICIAL API (GraphQL — the only
* endpoint that serves it; REST has no contributions resource at all).
*
* One call returns every day with its exact count and GitHub's own level.
*/
async function fetchContributionsGraphQL(login, token) {
	const query = "query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}";
	const res = await githubFetch(`${GITHUB_API}/graphql`, {
		method: "POST",
		headers: {
			...githubHeaders(token),
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			query,
			variables: { login }
		})
	});
	if (!res.ok) return null;
	let parsed;
	try {
		parsed = JSON.parse(res.text);
	} catch {
		return null;
	}
	const calendar = asRecord(asRecord(asRecord(asRecord(parsed)?.data)?.user)?.contributionsCollection)?.contributionCalendar;
	const cal = asRecord(calendar);
	if (cal === null) return null;
	const weeks = Array.isArray(cal.weeks) ? cal.weeks : [];
	const days = [];
	for (const week of weeks) {
		const list = asRecord(week)?.contributionDays;
		if (!Array.isArray(list)) continue;
		for (const raw of list) {
			const day = asRecord(raw);
			const date = str$1(day?.date);
			if (date === null) continue;
			days.push({
				date,
				count: Math.max(0, Math.round(num$1(day?.contributionCount))),
				level: GITHUB_LEVELS[String(day?.contributionLevel ?? "")] ?? 0
			});
		}
	}
	if (days.length === 0) return null;
	days.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
	return {
		login,
		total: days.reduce((sum, d) => sum + d.count, 0),
		source: "graphql",
		days,
		...summariseContribDays(days)
	};
}
/**
* The same calendar SCRAPED from the public contributions page — the token-free
* path. GitHub renders each day as
*   `<td data-date="YYYY-MM-DD" id="contribution-day-component-1-4" data-level="2">`
* and the exact number lives in a sibling
*   `<tool-tip for="contribution-day-component-1-4">3 contributions on …</tool-tip>`
* so the count is read by id, with GitHub's level as the floor when a tooltip
* is missing (a re-localized tooltip still yields the right bucket, only less
* precision). This is a SCRAPE: it is the fallback, it is reported as `html`,
* and a structural change makes the slice fail loudly rather than report zeros.
*/
async function fetchContributionsHtml(login) {
	const res = await githubFetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, { headers: {
		"User-Agent": GITHUB_BROWSER_UA,
		"Accept": "text/html"
	} });
	if (!res.ok) return null;
	const html = res.text;
	const counts = /* @__PURE__ */ new Map();
	const tipRe = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
	for (let m = tipRe.exec(html); m !== null; m = tipRe.exec(html)) {
		const digits = /^(\d+)\s/.exec(m[2].trim());
		counts.set(m[1], digits === null ? 0 : Number(digits[1]));
	}
	const cellRe = /<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g;
	const days = [];
	for (let m = cellRe.exec(html); m !== null; m = cellRe.exec(html)) {
		const tag = m[0];
		const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? "";
		const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? "0");
		const exact = counts.get(id);
		days.push({
			date: m[1],
			count: exact ?? (Number.isFinite(level) ? level : 0),
			level: Number.isFinite(level) ? level : 0
		});
	}
	if (days.length === 0) return null;
	days.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
	return {
		login,
		total: days.reduce((sum, d) => sum + d.count, 0),
		source: "html",
		days,
		...summariseContribDays(days)
	};
}
/** The calendar for one login: official API when a token exists, scrape
*  otherwise. Never throws — the caller records the failure per slice. */
async function fetchContributions(login, cred) {
	try {
		if (cred.token !== null) {
			const viaApi = await fetchContributionsGraphQL(login, cred.token);
			if (viaApi !== null) return {
				value: viaApi,
				error: null
			};
		}
		const viaHtml = await fetchContributionsHtml(login);
		if (viaHtml !== null) return {
			value: viaHtml,
			error: null
		};
		return {
			value: null,
			error: "unavailable"
		};
	} catch (error) {
		return {
			value: null,
			error: error instanceof Error && error.name === "AbortError" ? "timeout" : "unavailable"
		};
	}
}
/**
* One repository's pulse: 4 upstream reads with a token, 3 without.
*
*  - `GET /repos/{o}/{r}` — stars, forks, last push;
*  - `GET /repos/{o}/{r}/issues?state=open&per_page=100` — open issues with
*    PRs FILTERED OUT (the repo payload's `open_issues_count` counts both, so
*    using it would over-report on any repo that takes PRs) plus the newest one;
*  - `GET /repos/{o}/{r}/releases/latest` — 404 simply means "no release yet";
*  - (token only) `GET /search/issues?q=repo:…+is:issue+is:open+comments:0` —
*    how many open issues nobody has answered. Skipped anonymously (search has
*    its own, much smaller budget) and reported as `unanswered: null`, never as
*    a zero the card would have to apologise for.
*/
async function fetchGitHubRepo(fullName, cred) {
	const headers = githubHeaders(cred.token);
	const meta = await githubFetch(`${GITHUB_API}/repos/${fullName}`, { headers });
	if (!meta.ok) return null;
	let metaJson;
	try {
		metaJson = JSON.parse(meta.text);
	} catch {
		return null;
	}
	const repo = asRecord(metaJson);
	if (repo === null) return null;
	let openIssues = 0;
	let capped = false;
	let newestIssue = null;
	try {
		const list = await githubFetch(`${GITHUB_API}/repos/${fullName}/issues?state=open&per_page=100`, { headers });
		if (list.ok) {
			const parsed = JSON.parse(list.text);
			const issues = (Array.isArray(parsed) ? parsed : []).map(asRecord).filter((i) => i !== null && i.pull_request === void 0);
			openIssues = issues.length;
			capped = issues.length >= 100;
			const first = issues[0];
			if (first !== void 0) newestIssue = {
				number: Math.round(num$1(first.number)),
				title: str$1(first.title) ?? "",
				comments: Math.round(num$1(first.comments)),
				updatedAt: str$1(first.updated_at) ?? ""
			};
		}
	} catch {}
	let release = null;
	try {
		const rel = await githubFetch(`${GITHUB_API}/repos/${fullName}/releases/latest`, { headers });
		if (rel.ok) {
			const parsed = asRecord(JSON.parse(rel.text));
			const tag = str$1(parsed?.tag_name);
			if (tag !== null) release = {
				tag,
				name: str$1(parsed?.name) ?? tag,
				publishedAt: str$1(parsed?.published_at)
			};
		}
	} catch {}
	let unanswered = null;
	if (cred.token !== null) try {
		const search = await githubFetch(`${GITHUB_API}/search/issues?q=${encodeURIComponent(`repo:${fullName} is:issue is:open comments:0`)}&per_page=1`, { headers });
		if (search.ok) {
			const parsed = asRecord(JSON.parse(search.text));
			if (parsed !== null) unanswered = Math.round(num$1(parsed.total_count));
		}
	} catch {}
	return {
		fullName: str$1(repo.full_name) ?? fullName,
		stars: Math.round(num$1(repo.stargazers_count)),
		forks: Math.round(num$1(repo.forks_count)),
		openIssues,
		issueCountCapped: capped,
		unanswered,
		pushedAt: str$1(repo.pushed_at),
		release,
		newestIssue
	};
}
/** The notifications slice cache + its ETag, both at module scope for the same
*  reason the other memos are: a reload must not re-spend the caller's budget. */
const githubNotifMemo = memoTtl(3e5);
let githubNotifEtag = null;
/** The last successful notifications payload, so a `304 Not Modified` keeps the
*  card populated instead of blanking it — a 304 means "unchanged", not "empty". */
let githubNotifLast = null;
/** The reasons the 「待我处理」 card gives their own row. */
const NOTIF_REASONS = [
	"review_requested",
	"mention",
	"assign",
	"ci_activity"
];
/** Threads asked for in one page. A FULL page makes `count` a floor, which the
*  payload reports as `capped` (see HostNotifications). */
const NOTIF_PAGE = 30;
/**
* `GET /notifications` — the review queue. AUTHENTICATED ONLY.
*
* Measured 2026-09-29: anonymous answers **401**, not an empty list, so the slice
* is reported as absent (`error: 'anonymous'`) rather than as zero threads — the
* card then does not render at all, which is the honest outcome on a machine with
* no token and no `gh` login.
*
* The ETag is load-bearing: a `304 Not Modified` does NOT consume the account's
* 5000/h budget (measured: the rate-limit counter stayed at 4993 across a 304),
* and GitHub's own `x-poll-interval` is 60 s, so a 5-minute cache costs almost
* nothing while still being fresh enough to act on.
*/
async function fetchNotifications(token) {
	try {
		const headers = {
			...githubHeaders(token),
			"If-None-Match": githubNotifEtag ?? ""
		};
		const res = await githubFetch(`${GITHUB_API}/notifications?all=false&per_page=${NOTIF_PAGE}`, { headers });
		if (res.status === 304) return {
			value: githubNotifLast,
			error: githubNotifLast === null ? "not-modified" : null
		};
		if (res.status === 401 || res.status === 403) return {
			value: null,
			error: `http:${res.status}`
		};
		if (!res.ok) return {
			value: null,
			error: `http:${res.status}`
		};
		if (res.etag !== null) githubNotifEtag = res.etag;
		const parsed = JSON.parse(res.text);
		const list = (Array.isArray(parsed) ? parsed : []).map(asRecord).filter((n) => n !== null);
		const byReason = {};
		for (const key of NOTIF_REASONS) byReason[key] = 0;
		byReason.other = 0;
		for (const thread of list) {
			const reason = str$1(thread.reason) ?? "other";
			byReason[NOTIF_REASONS.includes(reason) ? reason : "other"] += 1;
		}
		const first = list[0];
		const subject = asRecord(first?.subject);
		githubNotifLast = {
			count: list.length,
			capped: list.length >= NOTIF_PAGE,
			byReason,
			newest: first === void 0 ? null : {
				title: str$1(subject?.title) ?? "",
				repo: str$1(asRecord(first.repository)?.full_name) ?? "",
				reason: str$1(first.reason) ?? "",
				updatedAt: str$1(first.updated_at) ?? "",
				url: notificationsHtmlUrl(str$1(subject?.url))
			}
		};
		return {
			value: githubNotifLast,
			error: null
		};
	} catch (error) {
		return {
			value: null,
			error: error instanceof Error && error.name === "AbortError" ? "timeout" : "unavailable"
		};
	}
}
/** `https://api.github.com/repos/o/r/issues/12` -> `https://github.com/o/r/issues/12`. */
function notificationsHtmlUrl(apiUrl) {
	if (apiUrl === null) return null;
	return apiUrl.startsWith(`${GITHUB_API}/`) ? `https://github.com/${apiUrl.slice(23)}` : null;
}
/** The slice caches. Declared at module scope on purpose: the route is registered
*  inside `ctx.effect`, but the memo must outlive a re-registration (a plugin
*  reload would otherwise re-spend the anonymous budget). */
const githubAuthMemo = memoTtl(GITHUB_AUTH_TTL_MS);
const githubViewerMemo = memoTtl(18e5);
const githubRecentMemo = memoTtl(GITHUB_REPOS_TTL_MS);
const githubContribMemo = memoTtl(GITHUB_CONTRIB_TTL_MS);
const githubReposMemo = memoTtl(GITHUB_REPOS_TTL_MS);
/** The authenticated login (`GET /user`) — what an EMPTY `user` config means.
*  This is what makes the family work on somebody else's machine with no
*  configuration: whoever the token belongs to is the calendar's subject. */
async function fetchViewerLogin(cred) {
	if (cred.token === null) return null;
	try {
		const res = await githubFetch(`${GITHUB_API}/user`, { headers: githubHeaders(cred.token) });
		if (!res.ok) return null;
		return str$1(asRecord(JSON.parse(res.text))?.login);
	} catch {
		return null;
	}
}
/** The most recently pushed repos the token can see — what an EMPTY `repos`
*  config means (same zero-config promise as the login above). */
async function fetchRecentRepos(cred) {
	if (cred.token === null) return [];
	try {
		const res = await githubFetch(`${GITHUB_API}/user/repos?sort=pushed&direction=desc&affiliation=owner&per_page=${GITHUB_MAX_REPOS}`, { headers: githubHeaders(cred.token) });
		if (!res.ok) return [];
		const list = JSON.parse(res.text);
		return (Array.isArray(list) ? list : []).map((raw) => str$1(asRecord(raw)?.full_name)).filter((name) => name !== null);
	} catch {
		return [];
	}
}
/** Assemble the `/api/github` body: the calendar and the repos are resolved
*  through their own caches and in PARALLEL, so a 9-second scrape delays the
*  calendar only — the repo numbers land on the first paint either way.
*
*  An empty `login` / empty `repos` are NOT errors: they mean "whatever this
*  machine is signed in as", resolved through the token's own viewer. Without
*  a token there is nothing to resolve, and each empty slice is reported as
*  such (`no-user` / `no-repo`) instead of being silently dropped. */
async function buildGitHubBody(ctx, login, repos, wantNotifications) {
	const cred = await githubAuthMemo("cred", () => resolveGitHubCred(ctx)).catch(() => ({
		token: null,
		auth: "anonymous"
	}));
	const viewer = cred.token === null ? null : await githubViewerMemo("viewer", () => fetchViewerLogin(cred)).catch(() => null);
	const effectiveLogin = login !== "" ? login : viewer ?? "";
	const effectiveRepos = repos.length > 0 ? repos : cred.token === null ? [] : await githubRecentMemo("recent", () => fetchRecentRepos(cred)).catch(() => []);
	const errors = {};
	const [contrib, repoList, notif] = await Promise.all([
		effectiveLogin === "" ? Promise.resolve({
			value: null,
			error: "no-user"
		}) : githubContribMemo(`c:${effectiveLogin}`, () => fetchContributions(effectiveLogin, cred)).catch(() => ({
			value: null,
			error: "unavailable"
		})),
		Promise.all(effectiveRepos.map((full) => githubReposMemo(`r:${full}:${cred.auth}`, () => fetchGitHubRepo(full, cred)).catch(() => null))),
		!wantNotifications ? Promise.resolve({
			value: null,
			error: null
		}) : cred.token === null ? Promise.resolve({
			value: null,
			error: "anonymous"
		}) : githubNotifMemo(`n:${cred.auth}`, () => fetchNotifications(cred.token)).catch(() => ({
			value: null,
			error: "unavailable"
		}))
	]);
	if (contrib.error !== null) errors.contributions = contrib.error;
	if (notif.error !== null) errors.notifications = notif.error;
	if (effectiveRepos.length === 0) errors.repos = "no-repo";
	const kept = [];
	repoList.forEach((repo, i) => {
		if (repo === null) errors[effectiveRepos[i]] = "unavailable";
		else kept.push(repo);
	});
	return JSON.stringify({
		auth: cred.auth,
		login: effectiveLogin,
		contributions: contrib.value,
		repos: kept,
		notifications: notif.value,
		errors
	});
}
/** Register the GitHub route; returns the disposer `ctx.effect` wants. */
function registerGitHub(ctx) {
	return ctx.webServer.register({
		kind: "exact",
		path: "/api/github",
		handler: async (req, res) => {
			const url = req?.url ?? "";
			let login = "";
			let wanted = [];
			let wantNotifications = false;
			try {
				const params = new URL(url, "http://localhost").searchParams;
				login = (params.get("user") ?? "").trim().slice(0, 64);
				wantNotifications = params.get("notif") === "1";
				wanted = (params.get("repos") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s)).slice(0, GITHUB_MAX_REPOS);
				wanted = Array.from(new Set(wanted)).slice(0, GITHUB_MAX_REPOS);
			} catch {}
			try {
				const body = await buildGitHubBody(ctx, login, wanted, wantNotifications);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
			} catch (error) {
				res.writeHead(502, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
			}
		}
	});
}
//#endregion
//#region src/host/state-file.ts
/**
* dsh-widgets — the widget-rail state file.
*
* `/api/widgets-state`: GET/PUT the persisted rail configuration under the profile
* data dir, written atomically (tmp + rename) so a crash mid-write never leaves a
* truncated JSON the next boot would reject. Split out of `src/index.ts` (Phase H6).
*/
/** Widget-rail state file under the profile data dir (same dir as the patch file). */
function stateFilePath() {
	const home = process.env.DSH_HOME;
	const base = home !== void 0 && home.length > 0 ? home : join(homedir(), ".dsh");
	return join(base, "profiles", "web", "dsh-widgets-state.json");
}
/** Register the state route; returns the disposer `ctx.effect` wants. */
function registerWidgetsState(ctx) {
	return ctx.webServer.register({
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
	});
}
//#endregion
//#region src/host/machine.ts
/**
* dsh-widgets — the machine / self-check sampler.
*
* `/api/sysinfo`'s hardware half answers "how busy is this box". This module
* answers the OTHER operational question a long-running harness actually fails
* on: **is the disk filling up, and is the harness itself the reason**. It folds
* three cheap local readings:
*
*   - every mounted FIXED drive's total/free space (`fs.statfs`, probed by drive
*     letter — no `Get-PSDrive` spawn, ~1 ms for all 26);
*   - the DSH home's session-log footprint (file count, bytes, and how many were
*     written in the last hour — the growth signal);
*   - the `dsh web` host process's own RSS / CPU / uptime.
*
* CADENCE: the hardware half changes every poll (5–60 s) while these move on the
* scale of minutes, so each reading is cached with its own TTL — a card polling
* at 5 s does not walk the session directory 12 times a minute. That is why this
* is a sampler object with internal clocks rather than a stateless function.
*/
/** How long each reading is reused before it is measured again (ms). */
const DISK_TTL = 3e4;
const HOME_TTL = 6e4;
/** A drive letter that exists, with its capacity. */
async function probeDrives() {
	const letters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	const found = [];
	for (const letter of letters) {
		const mount = `${letter}:\\`;
		try {
			const s = await statfs(mount);
			const total = Number(s.blocks) * Number(s.bsize);
			const free = Number(s.bavail) * Number(s.bsize);
			if (total > 0) found.push({
				mount: `${letter}:`,
				total,
				free
			});
		} catch {}
	}
	if (found.length > 0) return found;
	try {
		const s = await statfs("/");
		return [{
			mount: "/",
			total: Number(s.blocks) * Number(s.bsize),
			free: Number(s.bavail) * Number(s.bsize)
		}];
	} catch {
		return [];
	}
}
/** The DSH home's session-log footprint, walked once per HOME_TTL. */
async function probeHome(home) {
	const sessions = join(home, "sessions");
	const cutoff = Date.now() - 36e5;
	try {
		const entries = await readdir(sessions, {
			recursive: true,
			withFileTypes: true
		});
		let files = 0;
		let bytes = 0;
		let recent = 0;
		for (const entry of entries) {
			if (!entry.isFile()) continue;
			const full = join(entry.parentPath ?? sessions, entry.name);
			try {
				const s = await stat(full);
				files += 1;
				bytes += s.size;
				if (s.mtimeMs >= cutoff) recent += 1;
			} catch {}
		}
		return {
			sessionsFiles: files,
			sessionsBytes: bytes,
			recentFiles: recent
		};
	} catch {
		return null;
	}
}
/**
* Build the sampler.
*
* @returns an object whose `sample()` returns the current machine reading,
*          reusing each cached half until its TTL expires.
*/
function createMachineSampler() {
	const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
	let diskCache = null;
	let homeCache = null;
	let cpuBase = null;
	let lastCpuPercent = null;
	return { async sample() {
		const now = Date.now();
		if (diskCache === null || now - diskCache.ts > DISK_TTL) diskCache = {
			ts: now,
			value: await probeDrives()
		};
		if (homeCache === null || now - homeCache.ts > HOME_TTL) homeCache = {
			ts: now,
			value: await probeHome(home)
		};
		const cpu = process.cpuUsage();
		if (cpuBase !== null) {
			const elapsedUs = (now - cpuBase.at) * 1e3;
			const usedUs = cpu.user - cpuBase.cpu.user + (cpu.system - cpuBase.cpu.system);
			if (elapsedUs > 0) lastCpuPercent = Math.max(0, Math.round(usedUs / elapsedUs * 1e3) / 10);
		}
		cpuBase = {
			at: now,
			cpu
		};
		const mem = process.memoryUsage();
		return {
			ts: now,
			disks: diskCache.value,
			home: homeCache.value,
			proc: {
				pid: process.pid,
				rss: mem.rss,
				cpuPercent: lastCpuPercent,
				uptimeSec: Math.round(process.uptime())
			}
		};
	} };
}
//#endregion
//#region src/host/sysinfo.ts
/**
* dsh-widgets — the machine hardware snapshot channel.
*
* `/api/sysinfo`: CPU utilization (delta against the previous request — the poll
* window IS the averaging window), memory totals, and the NVIDIA GPU via
* `nvidia-smi`, with a ~1 s cache and a ring buffer for the sparklines. Split out
* of `src/index.ts` (Phase H5) unchanged.
*/
function registerSysinfo(ctx) {
	let lastCpu = null;
	let cache = null;
	/** Utilization sample history for the sparklines (newest last). */
	const history = [];
	const HISTORY_CAP = 120;
	const machine = createMachineSampler();
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
				},
				machine: await machine.sample()
			};
			cache = {
				ts: now,
				payload
			};
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(payload));
		}
	});
}
//#endregion
//#region src/host/overview.ts
/**
* dsh-widgets — the machine operational overview (`/api/host/overview`).
*
* Answers "what is this machine doing, and can work still get in and out of it":
* network throughput, power source, the memory hogs, local service liveness, and
* whether the proxy egress actually works.
*
* WHY ONE ROUTE INSTEAD OF FOUR: measured on this machine (2026-09-29), a full
* pass costs ~1.5 s cold, and the only cheap part is TCP (0.2–1.3 ms per port).
* A `powershell.exe` spawn ALONE costs ~270 ms of floor, so battery + processes +
* network counters + the power scheme are collected by ONE merged script instead
* of four. Everything else is scheduled per section:
*
*   - `services` — plain `node:net` TCP probes, microseconds; answered every call.
*   - `net`       — PowerShell counters are cumulative, so throughput needs TWO
*                   samples: the reading is a delta and therefore has its own clock.
*   - `power` /    — one merged PowerShell snapshot, held for its TTL.
*     `procs`
*   - `proxy`     — an absolute-URI GET has a ~1.3 s median here, so this section
*                   is STALE-WHILE-REVALIDATE: an expired reading is returned as-is
*                   and refreshed in the background. The handler never awaits it.
*
* The route therefore never blocks on the expensive sections after the first call.
*/
/** How long each section's reading is reused (ms). */
const SNAPSHOT_TTL = 2e4;
const PROXY_TTL = 6e4;
/** TCP probe timeout — a listening port answers in ~1 ms on loopback. */
const PROBE_TIMEOUT = 400;
/** The local endpoints worth watching, in display order.
*  A port that is simply not installed reads `down`; that is the point. */
const SERVICE_TARGETS = [
	{
		key: "dsh",
		label: "DSH web",
		host: "127.0.0.1",
		port: 3080
	},
	{
		key: "ollama",
		label: "Ollama",
		host: "127.0.0.1",
		port: 11434
	},
	{
		key: "lmstudio",
		label: "LM Studio",
		host: "127.0.0.1",
		port: 1234
	},
	{
		key: "proxy",
		label: "Proxy",
		host: "127.0.0.1",
		port: 10808
	}
];
/** The proxy this machine's git/gh/web fetches already depend on. */
const PROXY = {
	host: "127.0.0.1",
	port: 10808
};
/** A 204 endpoint: tiny, cacheless, and reachable through the proxy. */
const EGRESS_URL = "http://www.gstatic.com/generate_204";
/** The Win32 `EstimatedRunTime` sentinel meaning "on AC / unknown". */
const WIN32_RUNTIME_UNKNOWN = 71582788;
/** Probe one TCP endpoint; resolves the handshake time or null. */
function probeTcp(host, port) {
	return new Promise((resolve) => {
		const started = Date.now();
		const socket = connect({
			host,
			port
		});
		const done = (value) => {
			socket.destroy();
			resolve(value);
		};
		socket.setTimeout(PROBE_TIMEOUT);
		socket.once("connect", () => done(Date.now() - started));
		socket.once("timeout", () => done(null));
		socket.once("error", () => done(null));
	});
}
/**
* One merged PowerShell snapshot: battery, top processes by working set, network
* raw counters, the active power scheme.
*
* HOW IT IS INVOKED MATTERS (measured 2026-09-29 on this machine): the same script
* costs ~5.9 s passed as a multi-line `-Command` argument and **~450 ms** written
* to a `.ps1` and run with `-File`. So the script is written once to the OS temp
* directory and executed from there. It is ASCII-ONLY on purpose: PowerShell 5.1
* decodes a BOM-less script file with the ANSI code page, so a non-ASCII literal
* would be mangled; output is forced to UTF-8 instead, because process names and
* power-scheme names are not necessarily ASCII.
*/
const PS_SCRIPT = [
	"$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
	"$o = [ordered]@{ battery = $null; procs = @(); net = @(); scheme = $null }",
	"try {",
	"  $b = Get-CimInstance -ClassName Win32_Battery -ErrorAction Stop | Select-Object -First 1",
	"  if ($b -ne $null) { $o.battery = [ordered]@{ status = [int]$b.BatteryStatus; percent = [int]$b.EstimatedChargeRemaining; runtime = [int]$b.EstimatedRunTime } }",
	"} catch { }",
	"try {",
	"  $o.procs = @(Get-Process -ErrorAction Stop | Sort-Object -Property WS -Descending | Select-Object -First 8 | ForEach-Object { [ordered]@{ pid = $_.Id; name = $_.ProcessName; ws = [long]$_.WorkingSet64 } })",
	"} catch { }",
	"try {",
	"  $o.net = @(Get-CimInstance -ClassName Win32_PerfRawData_Tcpip_NetworkInterface -ErrorAction Stop | ForEach-Object { [ordered]@{ name = $_.Name; rx = [double]$_.BytesReceivedPersec; tx = [double]$_.BytesSentPersec } })",
	"} catch { }",
	"try { $o.scheme = ((powercfg /getactivescheme) -join \" \").Trim() } catch { }",
	"$o | ConvertTo-Json -Depth 6 -Compress"
].join("\n");
/** The script file, written once per process (see the cost note above). */
let scriptPath = null;
function ensureScript() {
	if (scriptPath !== null) return scriptPath;
	try {
		const file = join(tmpdir(), "dsh-widgets-overview.ps1");
		writeFileSync(file, PS_SCRIPT, "ascii");
		scriptPath = file;
		return file;
	} catch {
		return null;
	}
}
/** Run the merged snapshot. Resolves null when PowerShell is absent or fails. */
function readSnapshot() {
	const file = ensureScript();
	if (file === null) return Promise.resolve(null);
	return new Promise((resolve) => {
		execFile("powershell.exe", [
			"-NoProfile",
			"-NonInteractive",
			"-File",
			file
		], {
			timeout: 1e4,
			windowsHide: true,
			maxBuffer: 4194304
		}, (error, stdout) => {
			if (error !== null && (stdout ?? "") === "") {
				resolve(null);
				return;
			}
			try {
				const parsed = JSON.parse(String(stdout));
				resolve({
					battery: parsed.battery ?? null,
					procs: Array.isArray(parsed.procs) ? parsed.procs : [],
					net: Array.isArray(parsed.net) ? parsed.net : [],
					scheme: typeof parsed.scheme === "string" && parsed.scheme !== "" ? parsed.scheme : null
				});
			} catch {
				resolve(null);
			}
		});
	});
}
/** Windows battery status 2 = "AC power, charging or full". */
function toPower(raw) {
	const battery = raw.battery;
	const scheme = schemeName(raw.scheme);
	if (battery === null) return scheme === null ? null : {
		onAc: true,
		percent: null,
		minutesLeft: null,
		scheme
	};
	const onAc = battery.status === 2;
	const runtime = battery.runtime;
	return {
		onAc,
		percent: Number.isFinite(battery.percent) ? battery.percent : null,
		minutesLeft: onAc || runtime === WIN32_RUNTIME_UNKNOWN || runtime <= 0 ? null : runtime,
		scheme
	};
}
/**
* `powercfg /getactivescheme` prints a LOCALIZED prefix followed by the scheme in
* parentheses — `电源方案 GUID: …  (平衡)` / `Power Scheme GUID: … (Balanced)`.
* Only the parenthesised name is worth showing, and the prefix must not leak into
* the UI in the wrong language.
*/
function schemeName(raw) {
	if (raw === null) return null;
	const name = (/\(([^()]*)\)\s*$/.exec(raw)?.[1] ?? raw).trim();
	return name === "" ? null : name;
}
/**
* Build the overview sampler.
*
* @returns an object whose `sample()` returns the current overview, refreshing
*          each section on its own clock (see the module comment).
*/
function createOverviewSampler() {
	let snapshot = null;
	let snapshotPending = false;
	/** The previous counter sample, for the throughput delta. */
	let counters = null;
	let net = null;
	let proxy = null;
	let proxyPending = false;
	/**
	* Ask for a fresh merged snapshot when the held one is stale.
	*
	* NEVER awaited by `sample()`: the first reading of a cold PowerShell session
	* costs seconds (see createPsSession), and a card must show a skeleton rather
	* than hold the request. The value appears on a later poll; until then every
	* section it feeds is `null`, which is exactly "not measured yet".
	*/
	const refreshSnapshot = (now) => {
		if (snapshotPending) return;
		if (snapshot !== null && now - snapshot.ts <= SNAPSHOT_TTL) return;
		snapshotPending = true;
		readSnapshot().then((value) => {
			snapshot = {
				ts: Date.now(),
				value
			};
			snapshotPending = false;
			if (value === null) return;
			const hadBaseline = counters !== null;
			foldNet(snapshot.ts, value);
			if (!hadBaseline) setTimeout(() => {
				snapshot = null;
				snapshotPending = false;
				refreshSnapshot(Date.now());
			}, 2500);
		});
	};
	/** Fold fresh counters into a throughput delta (cumulative → per second). */
	const foldNet = (now, raw) => {
		const byName = new Map(raw.net.map((a) => [a.name, {
			rx: a.rx,
			tx: a.tx
		}]));
		if (counters !== null) {
			const seconds = (now - counters.ts) / 1e3;
			if (seconds > 0) {
				const adapters = [];
				for (const [name, current] of byName) {
					const previous = counters.byName.get(name);
					if (previous === void 0) continue;
					const rxBps = Math.max(0, (current.rx - previous.rx) / seconds);
					const txBps = Math.max(0, (current.tx - previous.tx) / seconds);
					adapters.push({
						name,
						rxBps,
						txBps
					});
				}
				adapters.sort((a, b) => b.rxBps + b.txBps - (a.rxBps + a.txBps));
				net = {
					adapters: adapters.slice(0, 4),
					rxBps: adapters.reduce((sum, a) => sum + a.rxBps, 0),
					txBps: adapters.reduce((sum, a) => sum + a.txBps, 0)
				};
			}
		}
		counters = {
			ts: now,
			byName
		};
	};
	/**
	* Absolute-URI GET through the proxy — the ONLY honest egress verdict.
	*
	* Written as a raw socket request on purpose: Node's `fetch` has no proxy
	* option, and a CONNECT probe proves nothing here (the local proxy answers
	* `200 Connection established` even for a domain that does not exist — measured
	* 2026-09-29). Sending `GET http://host/path HTTP/1.1` to the proxy is what
	* makes the proxy resolve the target and carry the bytes, so a status line
	* coming back is proof the egress worked.
	*/
	const readEgress = async (tcpMs) => {
		const target = new URL(EGRESS_URL);
		const started = Date.now();
		const status = await new Promise((resolve) => {
			const socket = connect({
				host: PROXY.host,
				port: PROXY.port
			});
			let buffer = "";
			const fail = (code) => {
				socket.destroy();
				resolve(code);
			};
			socket.setTimeout(5e3);
			socket.once("connect", () => {
				socket.write([
					`GET ${EGRESS_URL} HTTP/1.1`,
					`Host: ${target.host}`,
					"Proxy-Connection: close",
					"Connection: close",
					"User-Agent: dsh-widgets-health",
					"",
					""
				].join("\r\n"));
			});
			socket.on("data", (chunk) => {
				buffer += chunk.toString("latin1");
				const match = /^HTTP\/1\.[01] (\d{3})/.exec(buffer);
				if (match !== null) {
					socket.destroy();
					resolve(Number(match[1]));
				}
				if (buffer.length > 8192) fail("unreadable");
			});
			socket.once("timeout", () => fail("timeout"));
			socket.once("error", (error) => fail(error.code === "ECONNREFUSED" ? "port-closed" : "unreachable"));
		});
		if (typeof status === "string") return {
			host: PROXY.host,
			port: PROXY.port,
			tcpMs,
			egressMs: null,
			ok: false,
			error: status
		};
		return {
			host: PROXY.host,
			port: PROXY.port,
			tcpMs,
			egressMs: Date.now() - started,
			ok: status === 204 || status === 200,
			error: status === 204 || status === 200 ? null : `http:${status}`
		};
	};
	return { async sample() {
		const now = Date.now();
		const services = await Promise.all(SERVICE_TARGETS.map(async (target) => {
			const ms = await probeTcp(target.host, target.port);
			return {
				...target,
				up: ms !== null,
				ms
			};
		}));
		const raw = snapshot !== null && now - snapshot.ts <= SNAPSHOT_TTL * 3 ? snapshot.value : null;
		refreshSnapshot(now);
		const proxyTcpMs = services.find((s) => s.key === "proxy")?.ms ?? null;
		if (proxy === null || now - proxy.ts > PROXY_TTL) {
			if (!proxyPending) {
				proxyPending = true;
				if (proxyTcpMs === null) {
					proxy = {
						ts: now,
						value: {
							host: PROXY.host,
							port: PROXY.port,
							tcpMs: null,
							egressMs: null,
							ok: false,
							error: "port-closed"
						}
					};
					proxyPending = false;
				} else readEgress(proxyTcpMs).then((value) => {
					proxy = {
						ts: Date.now(),
						value
					};
					proxyPending = false;
				});
			}
		}
		return {
			ts: now,
			net,
			power: raw === null ? null : toPower(raw),
			procs: raw === null ? null : raw.procs.flatMap((p) => typeof p.pid === "number" && typeof p.name === "string" ? [{
				pid: p.pid,
				name: p.name,
				rss: p.ws
			}] : []),
			services,
			proxy: proxy?.value ?? null
		};
	} };
}
/**
* Register `/api/host/overview`.
*
* @param ctx - the host context whose web server owns the route.
* @returns the route disposer.
*/
function registerHostOverview(ctx) {
	const sampler = createOverviewSampler();
	return ctx.webServer.register({
		kind: "exact",
		path: "/api/host/overview",
		handler: async (_req, res) => {
			try {
				const payload = await sampler.sample();
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(payload));
			} catch (error) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: error instanceof Error ? error.message : "unavailable" }));
			}
		}
	});
}
//#endregion
//#region src/host/pricing.ts
/**
* dsh-widgets — the price table channel (`/api/widgets-pricing`).
*
* `dsh-usage-center` owns the price table and its design rule is explicit: **no
* rates ship in a package**. The table lives in storage
* (`$DSH_HOME/storages/usage-center/pricing.json`) so that changing a price never
* requires a release, and so that no plugin ever ships a number it has not been
* told. This route is therefore a READER, not an authority: it serves the file's
* own rules — provider scope, effective window, peak windows, provenance — and
* lets the card decide what may be printed.
*
* Two consequences are deliberate:
*   - a missing or unparseable file answers `available: false`. It never falls
*     back to a built-in table, because that table would be a price this plugin
*     invented;
*   - the provenance fields (`sourceType` / `verifiedAt` / `source`) travel with
*     every rule, so a card can say WHERE a number came from instead of printing
*     a bare amount that looks like a bill.
*
* Cached by mtime: the file is ~10 KB and is rewritten whole, so a stat per
* request is the cheapest correct invalidation.
*/
/** How long a parse is reused when the file's mtime has not moved (ms). */
const PRICING_TTL = 6e4;
/** A finite non-negative number, else `fallback`. */
function num(value, fallback = 0) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
/** A non-empty string, else null. */
function str(value) {
	return typeof value === "string" && value !== "" ? value : null;
}
/** One four-bucket rate set. Missing buckets read 0 (`cacheWrite` is genuinely 0
*  on providers that do not bill it) — never `undefined`, so a card can multiply
*  without a null check per bucket. */
function rates(value) {
	const r = typeof value === "object" && value !== null ? value : {};
	return {
		inputCacheHit: num(r.inputCacheHit),
		inputCacheMiss: num(r.inputCacheMiss),
		output: num(r.output),
		cacheWrite: num(r.cacheWrite)
	};
}
/** Normalize one rule. A rule without a rate set at all is dropped by the caller. */
function normalizeRule(value) {
	if (typeof value !== "object" || value === null) return null;
	const r = value;
	const id = str(r.id);
	const source = r.rates;
	if (id === null || typeof source !== "object" || source === null) return null;
	const windows = Array.isArray(r.peakWindows) ? r.peakWindows.flatMap((raw) => {
		if (typeof raw !== "object" || raw === null) return [];
		const w = raw;
		const start = str(w.start);
		const end = str(w.end);
		if (start === null || end === null) return [];
		return [{
			days: Array.isArray(w.days) ? w.days.filter((d) => typeof d === "number") : [],
			start,
			end
		}];
	}) : [];
	return {
		id,
		provider: str(r.provider),
		model: str(r.model),
		effectiveFrom: str(r.effectiveFrom),
		effectiveTo: str(r.effectiveTo),
		timezone: str(r.timezone),
		peakWindows: windows,
		rates: rates(source),
		peakRates: typeof r.peakRates === "object" && r.peakRates !== null ? rates(r.peakRates) : null,
		currency: str(r.currency),
		sourceType: str(r.sourceType),
		verifiedAt: str(r.verifiedAt),
		source: str(r.source)
	};
}
/** Resolve the table path the same way usage-center does. */
function tablePath() {
	return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "storages", "usage-center", "pricing.json");
}
/** Read + normalize the table, or an explicit "unavailable". */
function readTable() {
	const path = tablePath();
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8"));
		const rules = (Array.isArray(parsed.rules) ? parsed.rules : []).flatMap((raw) => {
			const rule = normalizeRule(raw);
			return rule === null ? [] : [rule];
		});
		return {
			available: rules.length > 0,
			version: typeof parsed.version === "number" ? parsed.version : null,
			currency: str(parsed.currency),
			rules,
			path,
			modifiedAt: statSync(path).mtimeMs
		};
	} catch {
		return {
			available: false,
			version: null,
			currency: null,
			rules: [],
			path,
			modifiedAt: null
		};
	}
}
/** Register `/api/widgets-pricing`; returns the disposer `ctx.effect` wants. */
function registerWidgetsPricing(ctx) {
	let cache = null;
	return ctx.webServer.register({
		kind: "exact",
		path: "/api/widgets-pricing",
		handler: async (_req, res) => {
			const now = Date.now();
			let mtime = null;
			try {
				mtime = statSync(tablePath()).mtimeMs;
			} catch {}
			if (cache === null || now - cache.at > PRICING_TTL || cache.mtime !== mtime) {
				const value = readTable();
				cache = {
					at: now,
					mtime: value.modifiedAt,
					value
				};
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(cache.value));
		}
	});
}
//#endregion
//#region src/host/routes.ts
/**
* dsh-widgets — the host route registry.
*
* Registration order is the order below. Adding a channel means adding its module
* and one line here; `src/index.ts` stays a compose-only entry.
*/
/** Every host route this plugin owns, in registration order. */
const HOST_ROUTES = [
	registerOpenCodeUsage,
	registerCommandCodeUsage,
	registerUsageDaily,
	registerGitHub,
	registerWidgetsState,
	registerSysinfo,
	registerHostOverview,
	registerWidgetsPricing
];
//#endregion
//#region src/index.ts
/**
* Harness Widgets — host (node) half.
*
* Composes the same-origin routes the widget rail reads. The browser never talks
* to an upstream provider directly: every key stays on this side of the wire.
*
*   /api/opencode-usage        OpenCode Go usage (single key)
*   /api/opencode-usage-multi  every pooled key + the 共同用量 total
*   /api/commandcode-usage     Command Code account slices, per pool key
*   /api/widgets-usage-daily   authoritative per-day token totals (usage-center)
*   /api/github                contribution calendar + repo pulse
*   /api/widgets-state         GET/PUT the persisted rail configuration
*   /api/sysinfo               CPU / memory / NVIDIA snapshot
*
* One module per channel lives in `host/`; this file only composes them (see
* `host/routes.ts`). Split out of the single-file host in Phase H.
*/
/** Required services: the web server (route registration) and the credentials seam (API key). */
const inject = ["webServer", "credentials"];
/**
* Host plugin body: register every route this fiber owns.
* @param ctx - cordis context carrying the injected `webServer` and `credentials` services.
*/
function apply(ctx) {
	for (const register of HOST_ROUTES) ctx.effect(() => register(ctx));
}
//#endregion
export { apply, inject };
