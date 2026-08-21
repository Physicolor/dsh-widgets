window.__ModuleLoader__.load({
	id: "harness-widgets",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region \0dsh-css:D:\dsh-home\plugins\harness-widgets\src\client\widgets.module.css.mjs
		const css = ".dsx-stats-capsule{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:14px;align-items:center;gap:6px;padding:0 12px;font-size:13px;line-height:1;display:inline-flex}.dsx-stats-capsule[aria-pressed=true]{background:var(--dsw-alias-brand-primary);color:#fff;border-color:#0000}.dsx-stats-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;justify-content:flex-start;display:flex;position:relative;overflow:hidden}.dsx-stats-card-title{color:var(--dsw-alias-state-business-primary);line-height:1.2}.dsx-stats-card-value{color:var(--dsw-alias-label-primary);word-break:break-word;font-weight:600;line-height:1.25}.dsx-stats-card-sub{color:var(--dsw-alias-label-caption);font-size:10px}.dsx-stats-resize{cursor:nesw-resize;z-index:2;opacity:0;background:linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%, var(--dsw-alias-label-tertiary) 62%, transparent 62%);width:18px;height:18px;position:absolute;bottom:0;left:0}.dsx-stats-card:hover .dsx-stats-resize{opacity:1}.dsx-stats-card-corner{background:var(--dsw-alias-state-business-primary);color:#fff;cursor:pointer;width:30px;height:30px;box-shadow:var(--dsw-shadow-lv1);border:none;border-radius:15px;justify-content:center;align-items:center;font-size:12px;transition:background .16s,width .16s,color .16s;display:inline-flex;position:absolute}.dsx-stats-card-corner:hover{background:var(--dsw-alias-state-business-primary);filter:brightness(1.08)}.dsx-stats-card-corner.armed{border-radius:15px;width:56px;font-weight:600}[data-conversation-scroll]{transition:padding-right .2s}.dsx-stats-rail{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out), transform .24s var(--ds-ease-in-out);-ms-overflow-style:none}.dsx-stats-rail::-webkit-scrollbar{width:0;height:0;display:none}@supports not selector(::-webkit-scrollbar){.dsx-stats-rail{scrollbar-width:none}}body[data-dsh-sidebar-dragging] .dsx-stats-rail{transition:none}body.dsx-stats-active [data-conversation-scroll]{padding-right:var(--dsx-rail-w,220px)!important}body.dsx-stats-active [data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{right:calc(var(--dsh-scrollbar-width) + var(--dsx-rail-w,220px))}[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{transition:right .2s}body.dsx-stats-active [data-slot=\"conversation.composer.dock\"]{visibility:hidden!important}.dsx-stats-card-slot{transition:top .2s var(--ds-ease-in-out), width .2s var(--ds-ease-in-out), height .2s var(--ds-ease-in-out);will-change:top, width, height}.dsx-stats-card-slot .dsx-stats-card{transition:border-color .18s,box-shadow .18s}.dsx-stats-card-slot:hover .dsx-stats-card{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary), 0 10px 28px color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)}.dsx-stats-resize{transition:opacity .12s}.dsx-stats-add{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:border-color .18s ease, color .18s ease, background .18s ease, transform .18s var(--ds-ease-in-out);background:0 0;border-radius:16px;flex-direction:column;flex:none;justify-content:center;align-items:center;gap:6px;display:flex}.dsx-stats-add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);transform:scale(1.04)}.dsx-stats-add-icon{color:var(--dsw-alias-state-business-primary);justify-content:center;align-items:center;line-height:1;display:flex}.dsx-stats-add-label{font-size:13px;font-weight:500;line-height:1}.dsx-stats-addpanel{right:calc(var(--dsh-sidebar-width,0px) + var(--dsx-rail-pad,14px));width:auto;bottom:calc(var(--dsh-sidebar-width,0px) + var(--dsx-rail-pad,14px));z-index:30;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:transform .28s var(--ds-ease-in-out), visibility 0s linear .28s;visibility:hidden;border-radius:16px;flex-direction:column;display:flex;position:fixed;transform:translate(calc(100% + 40px))}.dsx-stats-addpanel.open{visibility:visible;transition-delay:0s;transform:translate(0)}.dsx-stats-addpanel-resize{cursor:ew-resize;z-index:3;width:10px;position:absolute;top:0;bottom:0;left:-5px}.dsx-stats-addpanel-header{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:8px;padding:12px 12px 10px;display:flex}.dsx-stats-addpanel-title{color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;line-height:22px}.dsx-stats-addpanel-close{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background .12s,color .12s;display:inline-flex}.dsx-stats-addpanel-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-stats-addpanel-body{flex:1;min-height:0;padding:12px;overflow-y:auto}.dsx-stats-addpanel-body>div{height:100%}.dsx-order-row{border-radius:8px;align-items:center;gap:8px;padding:2px 0;display:flex}.dsx-order-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-order-row.selected{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);outline:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);cursor:pointer}.dsx-drag-handle{cursor:grab;color:var(--dsw-alias-label-tertiary);align-items:center;padding:6px 2px;display:flex}.dsx-drag-handle:active{cursor:grabbing}.dsx-restore{border:1px solid var(--dsw-alias-border-l2);height:24px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:12px;padding:0 10px;font-size:12px}.dsx-trash{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;transition:color .12s,background .12s;display:flex}.dsx-trash:hover{color:var(--dsw-alias-state-danger,#e5484d);background:var(--dsw-alias-interactive-bg-hover)}.dsx-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;border-radius:9px;flex:none;padding:1px 8px;font-size:11px}.dsx-tabbar{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;display:flex}.dsx-tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 2px;font-size:13px;font-weight:500;line-height:16px}.dsx-tab[data-active=true]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary)}.dsx-search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:17px;outline:none;margin-bottom:10px;padding:0 12px;font-size:13px}.dsx-select{-webkit-appearance:none;appearance:none;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-1);min-width:150px;height:34px;color:var(--dsw-alias-label-primary);cursor:pointer;box-sizing:border-box;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='currentColor'/></svg>\");background-position:right 12px center;background-repeat:no-repeat;border-radius:17px;outline:none;padding:0 34px 0 12px;font-size:13px}.dsx-select:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}.dsx-select option{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dsx-mlist{flex-direction:column;gap:10px;display:flex}.dsx-mcard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;box-sizing:border-box;border-radius:14px;flex-direction:column;width:100%;padding:14px;display:flex}.dsx-mcard:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-mcard[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary)}.dsx-mhead{align-items:center;gap:8px;margin-bottom:6px;display:flex}.dsx-mname{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.dsx-mdesc{color:var(--dsw-alias-label-tertiary);margin-bottom:8px;font-size:12px;line-height:18px}.dsx-mid{color:var(--dsw-alias-label-caption);margin-bottom:4px;font-family:monospace;font-size:11px}.dsx-macts{justify-content:flex-end;gap:8px;margin-top:4px;display:flex}.dsx-btn{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:14px;align-items:center;padding:0 12px;font-size:12px;display:inline-flex}.dsx-btn-primary{background:var(--dsw-alias-brand-primary);color:#fff;border-color:#0000}.dsx-navbtn{width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;transition:background .12s;display:inline-flex}.dsx-navbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-dot{background:var(--dsw-alias-border-l2);cursor:pointer;border:none;border-radius:50%;width:8px;height:8px;padding:0}.dsx-dot-active{background:var(--dsw-alias-brand-primary)}.dsx-switch-row{cursor:pointer;flex:none;align-items:center;display:inline-flex;position:relative}.dsx-switch-input{opacity:0;cursor:pointer;width:100%;height:100%;margin:0;position:absolute}.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);border-radius:11px;align-items:center;width:34px;height:20px;padding:0;transition:background .16s;display:inline-flex}.dsx-switch-thumb{width:16px;height:16px;box-shadow:var(--dsw-shadow-lv1);background:#fff;border-radius:50%;margin-left:2px;transition:transform .16s}.dsx-switch-input:checked+.dsx-switch-track{background:var(--dsw-alias-state-success-primary)}.dsx-switch-input:checked+.dsx-switch-track .dsx-switch-thumb{transform:translate(14px)}.dsx-switch-input:focus-visible+.dsx-switch-track{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dsx-switch-input:disabled+.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);opacity:.5;cursor:not-allowed}.dsx-switch-input:disabled+.dsx-switch-track .dsx-switch-thumb{box-shadow:none}";
		const tagId = "harness-widgets/widgets.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "harness-widgets";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/widgets.ts
		/** Instance key = `${widgetId}@${size}` (e.g. `context-water@2x4`). Even the same
		*  widget at two sizes is two independent, co-installable instances. */
		function instanceKey(widgetId, size) {
			return `${widgetId}@${size}`;
		}
		/** Parse an instance key back into its widget id and size. Unknown sizes fall
		*  back to '2x2' so legacy persisted ids (which are bare widget ids) still work. */
		function parseInstanceKey(key) {
			const at = key.lastIndexOf("@");
			if (at <= 0) return {
				widgetId: key,
				size: "2x2"
			};
			return key.slice(at + 1) === "2x4" ? {
				widgetId: key.slice(0, at),
				size: "2x4"
			} : {
				widgetId: key.slice(0, at),
				size: "2x2"
			};
		}
		/** Compact duration: 45.2s under a minute, 2m42s from there. */
		function fmtDuration(ms) {
			const s = ms / 1e3;
			if (s < 60) return `${Math.round(s * 10) / 10}s`;
			const whole = Math.round(s);
			return `${Math.floor(whole / 60)}m${whole % 60}s`;
		}
		/** Compact token count: 517 / 12.2K / 517K / 1.2M. */
		function fmtTokens(n) {
			const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
			if (n < 1e3) return String(n);
			if (n < 1e6) return `${scaled(n / 1e3)}K`;
			return `${scaled(n / 1e6)}M`;
		}
		/** Throughput: whole tokens from ten up, one decimal below. */
		function fmtTps(tps) {
			return tps >= 10 ? String(Math.round(tps)) : String(Math.round(tps * 10) / 10);
		}
		/** `YYYY-MM-DD` for a local date. */
		function dayKey(d) {
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		/**
		* Build a GitHub-style rolling heatmap grid directly from the raw daily log.
		* `weeks` columns (each a calendar week, Sunday-first) end at this week so the
		* latest data is always on the right edge. `weeks=26` → ~half a year (the 2×4
		* variant); `weeks=13` → the ~3-month 2×2 calendar.
		*/
		function buildRollingGrid(raw, weeks) {
			const now = /* @__PURE__ */ new Date();
			const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
			const base = new Date(startOfWeek);
			base.setDate(base.getDate() - (weeks - 1) * 7);
			const grid = [];
			for (let r = 0; r < 7; r++) {
				const row = [];
				for (let c = 0; c < weeks; c++) {
					const d = new Date(base);
					d.setDate(base.getDate() + c * 7 + r);
					const k = dayKey(d);
					row.push({
						value: raw[k] ?? 0,
						date: k
					});
				}
				grid.push(row);
			}
			return grid;
		}
		/** Last `n` days (oldest→newest) as bar data, ending today. Labels are
		*  short month.day (e.g. 8.28 — no year/weekday). Values stay raw tokens;
		*  ratio is normalized to the max day. */
		function lastNDays(raw, n) {
			const keys = Object.keys(raw).sort();
			const byDate = {};
			for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k];
			const now = /* @__PURE__ */ new Date();
			const days = [];
			const max = Math.max(1, ...Object.values(byDate).filter((v) => v > 0));
			for (let i = n - 1; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
				const v = byDate[dayKey(d)] ?? 0;
				days.push({
					label: `${d.getMonth() + 1}.${d.getDate()}`,
					value: v,
					ratio: v > 0 ? v / max : 0,
					tone: v > 0 ? "primary" : "muted"
				});
			}
			return days;
		}
		/** `8.14` style short date used by bar labels and heatmap edges. */
		function fmtShortDate(iso) {
			const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
			if (!m) return iso || "";
			return `${Number(m[2])}.${Number(m[3])}`;
		}
		function usageRender(key, label) {
			return (stats) => {
				const u = stats.usageData?.usage?.[key];
				if (!u) return {
					title: label,
					value: "—"
				};
				return {
					title: label,
					value: `${u.percent}%`,
					sub: `重置 ${String(u.resetsAt || "").slice(0, 10)}`
				};
			};
		}
		/** OpenCode Go dosage as one bar chart across the three windows. */
		function usageBarsRender(stats) {
			const u = stats.usageData?.usage;
			if (!u) return {
				title: "OpenCode 用量",
				value: "—"
			};
			const tone = (p) => p >= 95 ? "danger" : p >= 75 ? "warn" : "success";
			return {
				title: "OpenCode 用量",
				chart: {
					kind: "bars",
					bars: [
						{
							label: "滚动",
							value: u.rolling.percent,
							ratio: u.rolling.percent / 100,
							tone: tone(u.rolling.percent)
						},
						{
							label: "周",
							value: u.weekly.percent,
							ratio: u.weekly.percent / 100,
							tone: tone(u.weekly.percent)
						},
						{
							label: "月",
							value: u.monthly.percent,
							ratio: u.monthly.percent / 100,
							tone: tone(u.monthly.percent)
						}
					]
				}
			};
		}
		/** Context water level card — official JObwrW template: title「上下文已用」with
		*  a right-hand figures (~X / window), the percentage under it, and a
		*  system/tools/messages segmented bar + per-segment rows. Purely informational. */
		function contextWaterRender(stats, meta) {
			const pct = stats.contextPercent;
			const brk = stats.contextBreakdown;
			const win = stats.contextWindow;
			if (pct == null || !brk) return null;
			const sys = brk.systemTokens || 0;
			const tools = brk.toolsTokens || 0;
			const msg = brk.messageTokens || 0;
			const total = sys + tools + msg;
			const fmt = (n) => {
				if (n >= 1e6) return `${Math.round(n / 1e5) / 10}M`;
				if (n >= 1e3) return `${Math.round(n / 100) / 10}K`;
				return String(n);
			};
			const used = win ? fmt(total) : null;
			const capacity = win ? fmt(win) : null;
			const segments = [
				{
					label: "系统提示词",
					tokens: sys,
					tone: "muted"
				},
				{
					label: "工具",
					tokens: tools,
					tone: "success"
				},
				{
					label: "对话消息",
					tokens: msg,
					tone: "primary"
				}
			];
			if (meta?.size === "2x4") return {
				title: "上下文已用",
				value: `${Math.round(pct * 100)}%`,
				headRight: used && capacity ? `${used} / ${capacity}` : void 0,
				chart: total > 0 ? {
					kind: "segments",
					segments,
					totalTokens: total
				} : void 0
			};
			return {
				title: "上下文已用",
				headAfter: {
					big: `${Math.round(pct * 100)}%`,
					small: used && capacity ? `${used} / ${capacity}` : void 0
				},
				chart: total > 0 ? {
					kind: "segments",
					segments,
					totalTokens: total
				} : void 0
			};
		}
		/** One-click compaction card: shows context usage percent (bottom-left) and a
		*  top-right brand-blue round → armed「确认」capsule (two taps to compact). */
		function contextRender(stats) {
			const p = stats.contextPercent;
			const pct = p == null ? null : Math.round(p * 100);
			const armed = stats.armedAction === "contextCompact";
			return {
				title: "一键压缩",
				value: pct == null ? void 0 : `${pct}%`,
				sub: pct == null ? "等待上下文数据" : void 0,
				corner: {
					id: "contextCompact",
					label: "压缩",
					armedLabel: "确认",
					armed,
					pos: "bottom"
				}
			};
		}
		/** Task card: counts of pending / in_progress / completed from the todos projection. */
		function taskRender(stats) {
			const todos = stats.todos;
			if (!todos) return null;
			const pending = todos.filter((t) => t.status === "pending").length;
			const doing = todos.filter((t) => t.status === "in_progress").length;
			const done = todos.filter((t) => t.status === "completed").length;
			const total = todos.length;
			return {
				title: "任务",
				value: `${done} 已完成`,
				sub: total > 0 ? `${doing} 进行中 · ${pending} 待办` : void 0
			};
		}
		/** Token usage heatmap card — a GitHub-style daily grid coloured by volume.
		*  The 2×2 size shows the rolling ~3-month calendar (window alignment
		*  user-configurable) with a legend under the title (two plain figures:
		*  today / window total). The 2×4 size shows a ~7-month (30-week) rolling grid
		*  — all recent usage points at a glance — with the two figures moved into the
		*  title row's right side (headRight) and the grid horizontally centred. */
		function heatmapRender(stats, meta) {
			const rawLog = stats.heatmapRaw;
			const wide = meta?.size === "2x4";
			const grid = rawLog && wide ? buildRollingGrid(rawLog, 30) : stats.heatmapGrid ?? (rawLog ? buildRollingGrid(rawLog, 13) : void 0);
			if (!grid || !grid.length) return null;
			const todayKey = dayKey(/* @__PURE__ */ new Date());
			let todayVal = 0;
			let total = 0;
			for (const row of grid) for (const c of row) {
				total += c.value;
				if (c.date === todayKey) todayVal = c.value;
			}
			const figures = todayVal > 0 || total > 0 ? `${fmtTokens(todayVal)}  ${fmtTokens(total)}` : void 0;
			return {
				title: "Token 用量",
				...wide ? { headRight: figures } : { legend: figures },
				chart: {
					kind: "heatmap",
					heatmap: grid
				}
			};
		}
		/** Token usage last-7-days bar chart — vertical bars, oldest→newest left→
		*  right. X-axis labels are short month.day (only the first/last shown, on the
		*  bottom corners); the legend is two plain figures (today / 7-day total, no
		*  "今日/近7天" words). A horizontal x-axis baseline runs under the bars. The
		*  bar area height matches the 2×2 calendar grid's content height. */
		function heatmapBarsRender(stats) {
			const rawLog = stats.heatmapRaw;
			if (!rawLog) return null;
			const bars = lastNDays(rawLog, 7);
			if (!bars.length) return null;
			const today = bars[bars.length - 1]?.value ?? 0;
			const weekTotal = bars.reduce((a, b) => a + b.value, 0);
			return {
				title: "Token 用量",
				legend: today > 0 || weekTotal > 0 ? `${fmtTokens(today)}  ${fmtTokens(weekTotal)}` : void 0,
				chart: {
					kind: "barsV",
					bars
				}
			};
		}
		/** A small rotating inspirational quote, with per-card customization:
		*  custom text, show-title toggle, alignment, wrap. */
		let quoteIdx = 0;
		const DEFAULT_QUOTES = [
			"每天进步一点点",
			"保持好奇，保持热爱",
			"耐心是成功的好朋友",
			"只管努力，剩下的交给时间",
			"今天也是元气满满的一天"
		];
		function quoteRender(stats) {
			quoteIdx = (quoteIdx + 1) % DEFAULT_QUOTES.length;
			const c = stats;
			const text = c.text;
			const showTitle = c.showTitle;
			const align = c.align;
			const valign = c.valign;
			const wrap = c.wrap;
			return {
				title: showTitle === false ? "" : "今日寄语",
				rich: {
					type: "quote",
					text: text && text.trim() || DEFAULT_QUOTES[quoteIdx],
					align,
					valign,
					wrap
				}
			};
		}
		/** The complete widget registry. */
		const WIDGETS = [
			{
				id: "counts",
				name: "轮次·步数",
				desc: "本轮会话的轮次与步骤计数",
				builtin: true,
				render: (s) => ({
					title: "轮次·步数",
					value: `${s.turns}轮 ${s.steps}步`
				})
			},
			{
				id: "llm",
				name: "LLM 时长",
				desc: "模型推理累计耗时",
				builtin: true,
				render: (s) => s.llmMs > 0 ? {
					title: "LLM 时长",
					value: fmtDuration(s.llmMs)
				} : null
			},
			{
				id: "tool",
				name: "工具调用",
				desc: "工具调用累计耗时",
				builtin: true,
				render: (s) => s.toolMs > 0 ? {
					title: "工具调用",
					value: fmtDuration(s.toolMs)
				} : null
			},
			{
				id: "ttft",
				name: "首 token 平均",
				desc: "平均首 token 延迟",
				builtin: true,
				render: (s) => s.ttftSteps > 0 ? {
					title: "首 token 平均",
					value: fmtDuration(s.ttftMs / s.ttftSteps)
				} : null
			},
			{
				id: "tps",
				name: "速率",
				desc: "解码吞吐速度",
				builtin: true,
				render: (s) => s.decodeMs > 0 ? {
					title: "速率",
					value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1e3))} tok/s`
				} : null
			},
			{
				id: "cache",
				name: "缓存命中",
				desc: "输入缓存的命中比例",
				builtin: true,
				render: (s) => s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? {
					title: "缓存命中",
					value: `${Math.round(s.usage.cacheReadTokens / s.usage.inputTokens * 100)}%`
				} : null
			},
			{
				id: "tokens",
				name: "Tokens",
				desc: "输入与输出 token 计数",
				builtin: true,
				render: (s) => s.usage && s.usage.inputTokens > 0 ? {
					title: "Tokens",
					value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}`
				} : null
			},
			{
				id: "context",
				group: "context",
				name: "一键压缩",
				desc: "上下文占用百分比，右上按钮两次点击执行压缩",
				builtin: true,
				render: contextRender
			},
			{
				id: "context-water",
				group: "context",
				name: "上下文水位",
				desc: "上下文系统/工具/消息占比分段条",
				builtin: true,
				sizes: ["2x2", "2x4"],
				render: contextWaterRender
			},
			{
				id: "task",
				group: "task",
				name: "任务",
				desc: "当前任务的进行中/已完成/待办计数",
				builtin: true,
				render: taskRender
			},
			{
				id: "heatmap",
				group: "data",
				name: "用量热度图",
				desc: "每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；可在预览选择 2×2 窗口对齐方式",
				builtin: true,
				sizes: ["2x2", "2x4"],
				render: heatmapRender,
				configSchema: [{
					key: "monthMode",
					label: "窗口对齐方式",
					type: "mode",
					default: "rolling",
					options: [["rolling", "滚动(今天最右)"], ["quarter", "季度对齐"]]
				}]
			},
			{
				id: "heatmap-bars",
				group: "data",
				name: "用量柱状图",
				desc: "最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致",
				builtin: true,
				render: heatmapBarsRender,
				configSchema: [{
					key: "monthMode",
					label: "窗口对齐方式",
					type: "mode",
					default: "rolling",
					options: [["rolling", "滚动(今天最右)"], ["quarter", "季度对齐"]]
				}]
			},
			{
				id: "quote",
				group: "fun",
				name: "今日寄语",
				desc: "随机一句鼓励语录",
				builtin: true,
				render: quoteRender,
				configSchema: [
					{
						key: "text",
						label: "寄语内容",
						type: "text"
					},
					{
						key: "showTitle",
						label: "显示标题",
						type: "toggle",
						default: true
					},
					{
						key: "align",
						label: "水平对齐",
						type: "align",
						default: "left"
					},
					{
						key: "valign",
						label: "垂直位置",
						type: "valign",
						default: "top"
					},
					{
						key: "wrap",
						label: "允许换行",
						type: "toggle",
						default: true
					}
				]
			},
			{
				id: "usage-bars",
				group: "opencode-go",
				name: "用量对比",
				desc: "OpenCode 滚动/周/月三窗口用量柱状图",
				builtin: false,
				badgeLabel: "OpenCode Go 用量配额",
				render: usageBarsRender
			},
			{
				id: "usage-rolling",
				group: "opencode-go",
				name: "滚动用量",
				desc: "OpenCode Go 滚动窗口用量配额",
				builtin: false,
				badgeLabel: "OpenCode Go 用量配额",
				render: usageRender("rolling", "滚动用量")
			},
			{
				id: "usage-weekly",
				group: "opencode-go",
				name: "每周用量",
				desc: "OpenCode Go 每周用量配额",
				builtin: false,
				badgeLabel: "OpenCode Go 用量配额",
				render: usageRender("weekly", "每周用量")
			},
			{
				id: "usage-monthly",
				group: "opencode-go",
				name: "每月用量",
				desc: "OpenCode Go 每月用量配额",
				builtin: false,
				badgeLabel: "OpenCode Go 用量配额",
				render: usageRender("monthly", "每月用量")
			}
		];
		WIDGETS.map((w) => w.id);
		/** Every valid instance key (each widget at each of its supported sizes). */
		const ALL_INSTANCES = WIDGETS.flatMap((w) => sizesOf(w).map((s) => instanceKey(w.id, s)));
		/** The default installed set: every built-in widget at its 2×2 size. */
		const DEFAULT_INSTALLED = WIDGETS.filter((w) => w.builtin).map((w) => instanceKey(w.id, "2x2"));
		/** Badge text for a widget. */
		function badgeOf(w) {
			return w.badgeLabel ?? (w.builtin ? "系统" : "外部");
		}
		/** The group key for a widget (its own id when it is not grouped). */
		function groupOf(w) {
			return w.group ?? w.id;
		}
		/** The sizes a widget supports, defaulting to 2×2 only. */
		function sizesOf(w) {
			return Array.isArray(w.sizes) && w.sizes.length > 0 ? w.sizes.slice() : ["2x2"];
		}
		//#endregion
		//#region src/client/components.tsx
		/**
		* Harness Widgets — React components (plain createElement, no JSX).
		*
		* All surfaces receive a `WidgetsController` (prefs + setPrefs) and the live
		* usage data. Components are pure presentation over those props; the apply
		* closure owns state and slot registration.
		*/
		/** The base card side all scales derive from. */
		const BASE_SIDE$1 = 150;
		/** Placeholder usage for the market preview (before the real host fetch lands). */
		/** Realistic non-zero preview stats so every card renders (none return null). */
		const PREVIEW_STATS = {
			turns: 11,
			steps: 137,
			llmMs: 115e4,
			toolMs: 247e3,
			ttftMs: 3800,
			ttftSteps: 1e3,
			decodeMs: 5e3,
			decodeTokens: 600,
			usage: {
				inputTokens: 186e5,
				cacheReadTokens: 184e5,
				outputTokens: 75600
			},
			usageData: { usage: {
				rolling: {
					status: "ok",
					percent: 42,
					resetsAt: "2026-08-15T07:25:56Z"
				},
				weekly: {
					status: "ok",
					percent: 25,
					resetsAt: "2026-08-17T00:00:00Z"
				},
				monthly: {
					status: "ok",
					percent: 8,
					resetsAt: "2026-09-14T11:35:13Z"
				}
			} },
			contextPercent: .42,
			contextWindow: 1e6,
			contextTokens: 446e3,
			contextBreakdown: {
				systemTokens: 6e3,
				toolsTokens: 11700,
				messageTokens: 428300
			},
			todos: [
				{
					content: "计划任务拆分",
					status: "in_progress"
				},
				{
					content: "接入上下文数据",
					status: "completed"
				},
				{
					content: "编写配置表单",
					status: "completed"
				},
				{
					content: "打磨悬浮动画",
					status: "pending"
				},
				{
					content: "发布 npm",
					status: "pending"
				}
			],
			heatmapGrid: (() => {
				const now = /* @__PURE__ */ new Date();
				const grid = [];
				const day = (offset) => {
					const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
					return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				};
				for (let w = 0; w < 13; w++) {
					const row = [];
					for (let c = 0; c < 7; c++) {
						const off = (w - 12) * 7 + (c - 6);
						const v = off % 5 === 0 ? Math.pow(off % 13, 2) + 4e3 : off % 3 === 0 ? off % 11 * 800 : 0;
						row.push({
							value: Math.max(0, v),
							date: day(off)
						});
					}
					grid.push(row);
				}
				return grid;
			})(),
			heatmapRaw: (() => {
				const now = /* @__PURE__ */ new Date();
				const raw = {};
				const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 84);
				for (let i = 0; i < 91; i++) {
					const d = new Date(start);
					d.setDate(start.getDate() + i);
					const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
					const off = i - 84;
					raw[k] = off % 5 === 0 ? Math.pow(Math.abs(off) % 13, 2) + 4e3 : off % 3 === 0 ? off % 11 * 800 : 0;
				}
				return raw;
			})(),
			armedAction: null
		};
		const GripIcon = () => react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: "M5 3.5h1.5v1.5H5zM9.5 3.5H11v1.5H9.5zM5 7.25h1.5v1.5H5zM9.5 7.25H11v1.5H9.5zM5 11h1.5v1.5H5zM9.5 11H11v1.5H9.5z",
			fill: "currentColor"
		}));
		const TRASH_PATH = "M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z";
		const TrashIcon = () => react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: TRASH_PATH,
			fill: "currentColor"
		}));
		const CHEV_LEFT = "M8.5 2.15137L8.07617 2.57617L5.34863 5.30273C5.09294 5.55843 4.86618 5.78438 4.70215 5.98828C4.53117 6.20088 4.38244 6.44405 4.33398 6.75C4.30778 6.91565 4.30778 7.08435 4.33398 7.25C4.38244 7.55595 4.53117 7.79912 4.70215 8.01172C4.86618 8.21561 5.09294 8.44157 5.34863 8.69727L8.07617 11.4238L8.5 11.8486L9.34863 11L8.92383 10.5762L6.19727 7.84863C5.92268 7.57405 5.75151 7.40124 5.6377 7.25977C5.53096 7.12709 5.52187 7.07728 5.51953 7.0625C5.51297 7.02105 5.51297 6.97895 5.51953 6.9375C5.52187 6.92272 5.53096 6.87291 5.6377 6.74023C5.75152 6.59876 5.92268 6.42595 6.19727 6.15137L8.92383 3.42383L9.34863 3L8.5 2.15137Z";
		const CHEV_RIGHT = "M5.5 2.15137L5.92383 2.57617L8.65137 5.30273C8.90706 5.55843 9.13382 5.78438 9.29785 5.98828C9.46883 6.20088 9.61756 6.44405 9.66602 6.75C9.69222 6.91565 9.69222 7.08435 9.66602 7.25C9.61756 7.55595 9.46883 7.79912 9.29785 8.01172C9.13382 8.21561 8.90706 8.44157 8.65137 8.69727L5.92383 11.4238L5.5 11.8486L4.65137 11L5.07617 10.5762L7.80273 7.84863C8.07732 7.57405 8.24849 7.40124 8.3623 7.25977C8.46904 7.12709 8.47813 7.07728 8.48047 7.0625C8.48703 7.02105 8.48703 6.97895 8.48047 6.9375C8.47813 6.92272 8.46904 6.87291 8.3623 6.74023C8.24848 6.59876 8.07732 6.42595 7.80273 6.15137L5.07617 3.42383L4.65137 3L5.5 2.15137Z";
		const ChevronLeftIcon = () => react.createElement("svg", {
			width: 18,
			height: 18,
			viewBox: "0 0 14 14",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: CHEV_LEFT,
			fill: "currentColor"
		}));
		const ChevronRightIcon = () => react.createElement("svg", {
			width: 18,
			height: 18,
			viewBox: "0 0 14 14",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: CHEV_RIGHT,
			fill: "currentColor"
		}));
		const CHART_TONES = {
			primary: "var(--dsw-alias-state-business-primary)",
			success: "var(--dsw-alias-state-success-primary)",
			warn: "var(--dsw-alias-state-warn-primary)",
			danger: "var(--dsw-alias-state-error-primary)",
			muted: "var(--dsw-alias-label-tertiary)"
		};
		function ChartBlock({ chart, side, width }) {
			const scale = side / BASE_SIDE$1;
			const h = Math.round(56 * scale);
			if (chart.kind === "bars" && chart.bars) {
				const items = chart.bars.map((b, i) => {
					const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / (chart.max ?? 100)));
					const tone = CHART_TONES[b.tone ?? "primary"] ?? CHART_TONES.primary;
					return react.createElement("div", {
						key: i,
						style: {
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 4,
							flex: "none"
						}
					}, react.createElement("div", { style: {
						height: `${h}px`,
						display: "flex",
						alignItems: "flex-end"
					} }, react.createElement("div", { style: {
						width: Math.max(8, Math.round(12 * scale)),
						height: `${Math.max(2, Math.round(h * ratio))}px`,
						borderRadius: 3,
						background: tone,
						opacity: ratio >= .95 ? .9 : .85
					} })), react.createElement("div", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)"
					} }, b.label));
				});
				return react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "space-around",
					gap: 6
				} }, items);
			}
			if (chart.kind === "barsV" && chart.bars) {
				const barAreaH = 7 * Math.round(8 * scale) + 12;
				const labelH = Math.round(10 * scale);
				const barMax = Math.max(1, ...chart.bars.map((b) => b.value));
				const last = chart.bars.length - 1;
				const bars = chart.bars.map((b, i) => {
					const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / barMax));
					const tone = CHART_TONES[b.tone ?? "primary"] ?? CHART_TONES.primary;
					const active = (b.value ?? 0) > 0;
					const label = i === 0 || i === last ? b.label : "";
					return react.createElement("div", {
						key: i,
						title: `${b.label}: ${b.value} tok`,
						style: {
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: 3,
							height: "100%"
						}
					}, react.createElement("div", { style: {
						width: "93%",
						maxWidth: Math.max(6, Math.round(21 * scale)),
						height: active ? `${Math.max(2, Math.round((barAreaH - labelH) * ratio))}px` : `${Math.max(2, Math.round(3 * scale))}px`,
						borderRadius: 4,
						background: tone,
						opacity: active ? .85 : .18
					} }), react.createElement("div", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)",
						lineHeight: 1,
						minHeight: labelH,
						display: "flex",
						alignItems: "flex-end"
					} }, label));
				});
				return react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-end",
					gap: 4,
					height: `${barAreaH}px`,
					marginTop: `${Math.round(4 * scale)}px`
				} }, bars);
			}
			if (chart.kind === "segments" && chart.segments && chart.totalTokens) {
				const officialColors = [
					"var(--dsw-static-neutral-bluish-400)",
					"rgb(167, 139, 250)",
					"var(--dsw-static-blue-450)"
				];
				const total = chart.totalTokens;
				const fmt = (n) => {
					const k = n / 1e3;
					if (k >= 1e3) return `~${Math.round(k / 1e3 * 10) / 10}M`;
					if (k >= 100) return `~${Math.round(k)}K`;
					if (k >= 10) return `~${Math.round(k * 10) / 10}K`;
					if (k >= 1) return `~${Math.round(k * 10) / 10}K`;
					return `~${n}`;
				};
				const bar = chart.segments.map((s, i) => {
					const w = total > 0 ? Math.max(2.2, s.tokens / total * 100) : 0;
					const tint = officialColors[i % officialColors.length] ?? officialColors[0];
					return react.createElement("div", {
						key: i,
						style: {
							width: `${w}%`,
							height: "100%",
							borderRadius: 0,
							background: tint,
							flex: "none",
							minWidth: 2
						}
					});
				});
				const rows = chart.segments.map((s, i) => {
					const tint = officialColors[i % officialColors.length] ?? officialColors[0];
					return react.createElement("div", {
						key: i,
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							padding: "2px 0",
							fontSize: `${Math.round(12 * scale)}px`
						}
					}, react.createElement("span", { style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						color: "var(--dsw-alias-label-secondary)"
					} }, react.createElement("span", {
						"aria-hidden": true,
						style: {
							width: 8,
							height: 8,
							borderRadius: 2,
							background: tint,
							flex: "none"
						}
					}), s.label), react.createElement("span", { style: {
						fontVariantNumeric: "tabular-nums",
						color: "var(--dsw-alias-label-primary)"
					} }, fmt(s.tokens)));
				});
				const bh = Math.max(4, Math.round(5 * scale));
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column"
				} }, react.createElement("div", { style: {
					display: "flex",
					gap: 1,
					margin: "8px 0 10px",
					height: bh,
					borderRadius: 0,
					background: "var(--dsw-alias-interactive-bg-hover)",
					overflow: "hidden"
				} }, bar), react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					marginTop: 2
				} }, rows));
			}
			if (chart.kind === "ring") {
				const p = Math.max(0, Math.min(1, (chart.value ?? 0) / (chart.max ?? 100)));
				const r = 22 * scale;
				const c = 2 * Math.PI * r;
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 6
				} }, react.createElement("div", { style: {
					position: "relative",
					width: `${Math.round(r * 2)}px`,
					height: `${Math.round(r * 2)}px`
				} }, react.createElement("svg", {
					width: Math.round(r * 2),
					height: Math.round(r * 2),
					viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`,
					"aria-hidden": true
				}, react.createElement("circle", {
					cx: r,
					cy: r,
					r: r - 2,
					fill: "none",
					stroke: "var(--dsw-alias-interactive-bg-hover)",
					strokeWidth: 3
				}), react.createElement("circle", {
					cx: r,
					cy: r,
					r: r - 2,
					fill: "none",
					stroke: CHART_TONES.primary,
					strokeWidth: 3,
					strokeDasharray: `${c * p} ${c}`,
					transform: `rotate(-90 ${r} ${r})`,
					strokeLinecap: "round"
				})), react.createElement("div", { style: {
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: `${Math.round(13 * scale)}px`,
					fontWeight: 600,
					color: "var(--dsw-alias-label-primary)"
				} }, chart.valueLabel ?? `${chart.value ?? 0}%`)));
			}
			if (chart.kind === "heatmap" && chart.heatmap && chart.heatmap.length) {
				const weeks = chart.heatmap[0]?.length ?? 13;
				const isWide = weeks >= 20;
				const pad = Math.round(12 * scale);
				const availW = (width ?? side) - 2 * pad;
				const cell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * 2) / weeks)) : Math.round(8 * scale);
				const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value));
				const rows = chart.heatmap.map((week, wi) => {
					const cells = week.map((c) => {
						const t = max > 0 ? c.value / max : 0;
						const alpha = t > 0 ? .25 + .7 * t : .12;
						return react.createElement("div", {
							key: c.date,
							title: `${c.date}: ${c.value} tok`,
							style: {
								width: cell,
								height: cell,
								borderRadius: 2,
								background: t > 0 ? `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round(alpha * 100)}%, transparent)` : "var(--dsw-alias-interactive-bg-hover)",
								opacity: t > 0 ? 1 : .5
							}
						});
					});
					return react.createElement("div", {
						key: wi,
						style: {
							display: "flex",
							gap: 2
						}
					}, cells);
				});
				const first = chart.heatmap[0]?.[0]?.date;
				const nowD = /* @__PURE__ */ new Date();
				const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;
				const corner = (text, align) => {
					if (!text) return null;
					return react.createElement("span", { style: {
						display: "flex",
						alignItems: align,
						fontSize: `${Math.round(8.5 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)",
						lineHeight: 1,
						fontVariantNumeric: "tabular-nums"
					} }, fmtShortDate(text));
				};
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 2,
					marginTop: `${Math.round(4 * scale)}px`,
					alignItems: "center",
					width: "100%"
				} }, ...rows, react.createElement("div", { style: {
					display: "flex",
					justifyContent: "space-between",
					marginTop: `${Math.round(3 * scale)}px`,
					width: "100%"
				} }, corner(first, "flex-start"), corner(todayIso, "flex-end")));
			}
			return null;
		}
		function ActionsBlock({ actions, onAction, scale }) {
			const btnStyle = {
				flex: "none",
				height: Math.round(26 * scale),
				padding: `0 ${Math.round(10 * scale)}px`,
				borderRadius: Math.round(13 * scale),
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: "var(--dsw-alias-brand-primary)",
				fontSize: `${Math.round(11 * scale)}px`,
				cursor: "pointer",
				display: "inline-flex",
				alignItems: "center"
			};
			const btnEls = actions.map((a) => {
				const kind = a.kind;
				const st = { ...btnStyle };
				if (kind === "danger" || kind === "primary") {
					st.background = "var(--dsw-alias-brand-primary)";
					st.color = "#fff";
					st.borderColor = "transparent";
				}
				return react.createElement("button", {
					key: a.id,
					type: "button",
					title: a.confirmHint,
					onClick: (e) => {
						e.stopPropagation();
						if (onAction) onAction(a.id);
					},
					"data-action": a.id,
					style: st
				}, a.label);
			});
			return react.createElement("div", { style: {
				display: "flex",
				gap: Math.round(6 * scale),
				marginTop: Math.round(6 * scale),
				flexWrap: "wrap"
			} }, btnEls);
		}
		function RichBlock({ rich, scale }) {
			if (rich.type === "quote" && rich.text) {
				const ta = rich.align ?? "left";
				return react.createElement("div", { style: {
					fontSize: `${Math.round(12 * scale)}px`,
					lineHeight: 1.5,
					color: "var(--dsw-alias-label-secondary)",
					fontStyle: "italic",
					marginTop: `${Math.round(6 * scale)}px`,
					textAlign: ta,
					whiteSpace: rich.wrap === false ? "nowrap" : "pre-wrap",
					overflow: rich.wrap === false ? "hidden" : void 0,
					textOverflow: rich.wrap === false ? "ellipsis" : void 0
				} }, rich.text);
			}
			if (rich.type === "image" && rich.src) return react.createElement("img", {
				src: rich.src,
				alt: "",
				style: {
					width: "100%",
					borderRadius: Math.round(6 * scale),
					marginTop: `${Math.round(6 * scale)}px`,
					objectFit: "cover"
				}
			});
			return react.createElement(react.Fragment);
		}
		function CardBody({ out, unit, width, onAction }) {
			const scale = unit / BASE_SIDE$1;
			const boxW = width ?? unit;
			const titlePx = Math.round(13 * scale);
			const valuePx = Math.round(20 * scale);
			const radius = Math.round(16 * scale);
			const innerPad = Math.round(12 * scale);
			const headEls = [react.createElement("div", {
				key: "t",
				className: "dsx-stats-card-title",
				style: {
					fontSize: `${titlePx}px`,
					display: "flex",
					alignItems: "baseline",
					justifyContent: "space-between",
					gap: 6
				}
			}, react.createElement("span", { style: {
				display: "inline-flex",
				alignItems: "baseline",
				gap: 6
			} }, react.createElement("span", null, out.title), out.headRight && out.value != null ? react.createElement("span", { style: {
				fontSize: `${valuePx}px`,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)",
				fontVariantNumeric: "tabular-nums"
			} }, out.value) : null, out.headRight ? react.createElement("span", { style: {
				fontSize: `${Math.round(10 * scale)}px`,
				color: "var(--dsw-alias-label-tertiary)",
				fontWeight: 500,
				fontVariantNumeric: "tabular-nums",
				whiteSpace: "nowrap"
			} }, out.headRight) : null))];
			if (out.headAfter) headEls.push(react.createElement("div", {
				key: "ha",
				className: "dsx-stats-card-headafter",
				style: {
					display: "flex",
					alignItems: "baseline",
					gap: 6,
					marginTop: `${Math.round(2 * scale)}px`
				}
			}, out.headAfter.big != null ? react.createElement("span", { style: {
				fontSize: `${valuePx}px`,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)",
				fontVariantNumeric: "tabular-nums"
			} }, out.headAfter.big) : null, out.headAfter.small != null ? react.createElement("span", { style: {
				fontSize: `${Math.round(10 * scale)}px`,
				color: "var(--dsw-alias-label-tertiary)",
				fontWeight: 500,
				fontVariantNumeric: "tabular-nums",
				whiteSpace: "nowrap"
			} }, out.headAfter.small) : null));
			if (out.legend) headEls.push(react.createElement("div", {
				key: "lg",
				className: "dsx-stats-card-legend",
				style: {
					fontSize: `${Math.round(10 * scale)}px`,
					color: "var(--dsw-alias-label-tertiary)",
					fontWeight: 500,
					fontVariantNumeric: "tabular-nums",
					marginTop: `${Math.round(2 * scale)}px`
				}
			}, out.legend));
			const head = headEls;
			const body = [];
			if (out.value != null && !out.headRight) body.push(react.createElement("div", {
				key: "v",
				className: "dsx-stats-card-value",
				style: { fontSize: `${valuePx}px` }
			}, out.value));
			if (out.sub) body.push(react.createElement("div", {
				key: "s",
				className: "dsx-stats-card-sub",
				style: { fontSize: `${Math.round(10 * scale)}px` }
			}, out.sub));
			if (out.chart) {
				const c = ChartBlock({
					chart: out.chart,
					side: unit,
					width: boxW
				});
				if (c) body.push(react.createElement("div", { key: "c" }, c));
			}
			if (out.rich) body.push(react.createElement("div", { key: "r" }, RichBlock({
				rich: out.rich,
				scale
			})));
			const compressIcon = react.createElement("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true
			}, react.createElement("path", {
				d: "M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z",
				fill: "currentColor"
			}));
			const cornerPos = out.corner?.pos === "bottom" ? {
				bottom: `${Math.round(8 * scale)}px`,
				right: `${Math.round(8 * scale)}px`
			} : {
				top: `${Math.round(8 * scale)}px`,
				right: `${Math.round(8 * scale)}px`
			};
			const corner = out.corner ? react.createElement("button", {
				key: "corner",
				type: "button",
				className: "dsx-stats-card-corner" + (out.corner.armed ? " armed" : ""),
				style: cornerPos,
				title: out.corner.armed ? out.corner.armedLabel : out.corner.label,
				onClick: (e) => {
					e.stopPropagation();
					if (onAction) onAction(out.corner.id);
				}
			}, out.corner.armed ? out.corner.armedLabel : compressIcon) : null;
			const vj = out.rich?.valign === "bottom" ? "flex-end" : out.rich?.valign === "center" ? "center" : void 0;
			const footStyle = vj || out.headAfter ? {
				flex: 1,
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				gap: 6,
				justifyContent: vj ?? "flex-start"
			} : {
				marginTop: "auto",
				display: "flex",
				flexDirection: "column",
				gap: 6
			};
			return react.createElement("div", {
				className: "dsx-stats-card",
				style: {
					position: "relative",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
					borderRadius: `${radius}px`,
					padding: `${innerPad}px`
				}
			}, corner, head, react.createElement("div", {
				key: "foot",
				style: footStyle
			}, body), out.actions ? ActionsBlock({
				actions: out.actions,
				onAction,
				scale
			}) : null);
		}
		function OrderList({ items, onMove, onRestore, onRemove, onSelect, onResize, selected }) {
			const dragIdx = react.useRef(null);
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 2
			} }, items.map((id, i) => {
				const { widgetId, size } = parseInstanceKey(id);
				const w = WIDGETS.find((x) => x.id === widgetId);
				if (!w) return null;
				const isSel = selected === id;
				const sz = sizesOf(w);
				return react.createElement("div", {
					key: id,
					className: "dsx-order-row" + (isSel ? " selected" : ""),
					draggable: true,
					onDragStart: (e) => {
						dragIdx.current = i;
						e.dataTransfer.effectAllowed = "move";
					},
					onDragEnd: () => {
						dragIdx.current = null;
					},
					onDragOver: (e) => {
						e.preventDefault();
					},
					onDrop: (e) => {
						e.preventDefault();
						const from = dragIdx.current;
						if (from === null || from === i) return;
						const next = items.slice();
						const m = next.splice(from, 1)[0];
						next.splice(i, 0, m);
						dragIdx.current = null;
						onMove(next);
					},
					onClick: onSelect ? () => onSelect(id) : void 0
				}, react.createElement("span", { className: "dsx-drag-handle" }, react.createElement(GripIcon)), react.createElement("span", { style: {
					fontSize: 13,
					color: "var(--dsw-alias-label-primary)",
					flex: 1,
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap"
				} }, w.name), react.createElement("span", { style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-tertiary)",
					flex: "none"
				} }, size === "2x4" ? "2×4" : "2×2"), react.createElement("span", { className: "dsx-badge" }, badgeOf(w)), onResize && sz.length > 1 ? react.createElement("select", {
					className: "dsx-select",
					style: {
						fontSize: 11,
						width: "auto"
					},
					value: size,
					title: "切换尺寸",
					onClick: (e) => e.stopPropagation(),
					onChange: (e) => onResize(id, e.target.value)
				}, sz.map((s) => react.createElement("option", {
					key: s,
					value: s
				}, s === "2x4" ? "2×4" : "2×2"))) : null, onRemove ? react.createElement("button", {
					type: "button",
					className: "dsx-trash",
					"aria-label": "卸载",
					onClick: () => {
						if (onSelect && selected === id) onSelect("");
						onRemove(id);
					}
				}, react.createElement(TrashIcon)) : null, onRestore ? react.createElement("button", {
					type: "button",
					className: "dsx-restore",
					onClick: () => onRestore(id)
				}, "恢复") : null);
			}));
		}
		function ConfigFieldControl({ field, value, onChange }) {
			if (field.type === "text" || field.type === "textarea") {
				const Tag = field.type === "textarea" ? "textarea" : "input";
				const isTextarea = field.type === "textarea";
				return react.createElement(Tag, {
					type: isTextarea ? void 0 : "text",
					rows: isTextarea ? 3 : void 0,
					className: "dsx-search",
					style: {
						marginBottom: 0,
						width: "100%",
						boxSizing: "border-box",
						resize: "vertical",
						fontSize: 13
					},
					placeholder: field.label,
					value: typeof value === "string" ? value : field.default ?? "",
					onChange: (e) => onChange(e.target.value)
				});
			}
			if (field.type === "toggle") {
				const on = typeof value === "boolean" ? value : field.default === true;
				return react.createElement("label", {
					className: "dsx-switch-row",
					title: field.label
				}, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: on,
					onChange: (e) => onChange(e.target.checked)
				}), react.createElement("span", {
					className: "dsx-switch-track",
					"aria-hidden": true
				}, react.createElement("span", { className: "dsx-switch-thumb" })));
			}
			if (field.type === "align" || field.type === "valign") {
				const opts = field.type === "align" ? [
					"left",
					"center",
					"right"
				] : [
					"top",
					"center",
					"bottom"
				];
				const labels = field.type === "align" ? [
					"左",
					"居中",
					"右"
				] : [
					"上",
					"居中",
					"下"
				];
				const cur = typeof value === "string" && opts.indexOf(value) !== -1 ? value : field.default ?? opts[0];
				return react.createElement("div", { style: {
					display: "flex",
					gap: 4
				} }, opts.map((o, i) => {
					const active = cur === o;
					return react.createElement("button", {
						key: o,
						type: "button",
						className: "dsx-btn" + (active ? " dsx-btn-primary" : ""),
						onClick: () => onChange(o),
						style: { minWidth: 40 }
					}, labels[i]);
				}));
			}
			if (field.type === "mode") {
				const opts = field.options ?? [["a", "A"], ["b", "B"]];
				const cur = typeof value === "string" && opts.some(([v]) => v === value) ? value : field.default ?? opts[0][0];
				return react.createElement("select", {
					className: "dsx-select",
					value: cur,
					title: field.label,
					onChange: (e) => onChange(e.target.value)
				}, opts.map(([o, label]) => react.createElement("option", {
					key: o,
					value: o
				}, label)));
			}
			return react.createElement(react.Fragment);
		}
		function ConfigTab({ controller }) {
			const { prefs, setPrefs } = controller;
			const [selected, setSelected] = react.useState("");
			const [previewSize, setPreviewSize] = react.useState("2x2");
			const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1);
			const removed = prefs.order.filter((id) => prefs.installed.indexOf(id) === -1);
			const atLimit = installed.length >= prefs.maxWidgets;
			const restore = (id) => {
				if (atLimit) return;
				setPrefs({
					installed: prefs.installed.concat(id),
					order: prefs.order.filter((x) => x !== id).concat(id)
				});
			};
			const selKey = selected ? parseInstanceKey(selected) : null;
			const selWidget = selKey ? WIDGETS.find((x) => x.id === selKey.widgetId) : void 0;
			const selSize = selWidget && sizesOf(selWidget).includes(previewSize) ? previewSize : selKey?.size ?? "2x2";
			const selConfig = selWidget ? prefs.cardConfigs[selected] ?? {} : null;
			const previewOut = () => {
				if (!selWidget || !selConfig) return null;
				let stats = {
					...PREVIEW_STATS,
					...selConfig
				};
				if (selWidget.id === "heatmap") {
					const mode = selConfig.monthMode === "quarter" ? "quarter" : "rolling";
					const now = /* @__PURE__ */ new Date();
					const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
					const base = new Date(mode === "quarter" ? (() => {
						const q = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
						return new Date(q.getFullYear(), q.getMonth(), q.getDate() - q.getDay());
					})() : (() => {
						const b = new Date(startOfWeek);
						b.setDate(b.getDate() - 84);
						return b;
					})());
					const grid = [];
					const day = (r, c) => {
						const d = new Date(base);
						d.setDate(base.getDate() + c * 7 + r);
						return d;
					};
					const realSeed = {
						"2026-08-14": 244188e3,
						"2026-08-15": 1639548e3,
						"2026-08-16": 1319264e3
					};
					for (let r = 0; r < 7; r++) {
						const row = [];
						for (let c = 0; c < 13; c++) {
							const d = day(r, c);
							const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
							const off = Math.round((d.getTime() - startOfWeek.getTime()) / 864e5);
							const v = dk in realSeed ? realSeed[dk] : off < 0 ? Math.abs(off) % 5 === 0 ? 600 : 0 : off % 4 === 0 ? 1400 : off % 3 === 0 ? 700 : 0;
							row.push({
								value: v,
								date: dk
							});
						}
						grid.push(row);
					}
					stats = {
						...stats,
						heatmapGrid: grid
					};
				}
				return selWidget.render(stats, { size: selSize });
			};
			const setConfig = (field, value) => {
				const next = { ...prefs.cardConfigs[selected] ?? {} };
				if (value === field.default || value === "" || value === void 0 || value === null) delete next[field.key];
				else next[field.key] = value;
				setPrefs({ cardConfigs: {
					...prefs.cardConfigs,
					[selected]: next
				} });
			};
			const resize = (id, nextSize) => {
				const { widgetId, size } = parseInstanceKey(id);
				if (size === nextSize) return;
				const nextKey = instanceKey(widgetId, nextSize);
				const mapKey = (k) => k === id ? nextKey : k;
				const dedupe = (arr) => {
					let kept = false;
					return arr.map(mapKey).filter((k) => {
						if (k !== nextKey) return true;
						if (kept) return false;
						kept = true;
						return true;
					});
				};
				const cfg = { ...prefs.cardConfigs };
				if (!(nextKey in cfg) && id in cfg) cfg[nextKey] = cfg[id];
				setPrefs({
					order: dedupe(prefs.order),
					installed: dedupe(prefs.installed),
					cardConfigs: cfg
				});
				if (selected === id) setSelected(nextKey);
			};
			const out = previewOut();
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0
			} }, react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)",
				marginBottom: 4
			} }, `已安装 ${installed.length}/${prefs.maxWidgets}（点击组件可预览与配置）`), react.createElement(OrderList, {
				items: installed,
				onMove: (next) => setPrefs({ order: next.concat(removed) }),
				onRemove: (id) => setPrefs({ installed: prefs.installed.filter((x) => x !== id) }),
				onResize: resize,
				onSelect: setSelected,
				selected
			}), removed.length > 0 ? react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)",
				margin: "10px 0 4px"
			} }, "已卸载（点击恢复，或拖回上方）") : null, removed.length > 0 ? react.createElement(OrderList, {
				items: removed,
				onMove: () => {},
				onRestore: restore,
				onSelect: setSelected,
				selected
			}) : null, selWidget && selConfig ? react.createElement("div", { style: {
				marginTop: 12,
				paddingTop: 12,
				borderTop: "1px solid var(--dsw-alias-border-l2)",
				display: "flex",
				flexDirection: "column",
				gap: 10
			} }, react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8
			} }, react.createElement("div", { style: {
				flex: 1,
				fontSize: 14,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)"
			} }, `${selWidget.name} · 预览`), sizesOf(selWidget).length > 1 ? react.createElement("select", {
				className: "dsx-select",
				style: {
					fontSize: 11,
					width: "auto"
				},
				value: selSize,
				title: "切换预览尺寸",
				onChange: (e) => setPreviewSize(e.target.value)
			}, sizesOf(selWidget).map((s) => react.createElement("option", {
				key: s,
				value: s
			}, s === "2x4" ? "2×4" : "2×2"))) : null), (() => {
				const pv = out ? react.createElement(CardBody, {
					out,
					unit: 150,
					width: selSize === "2x4" ? 312 : void 0
				}) : null;
				return out ? react.createElement("div", { style: {
					display: "flex",
					justifyContent: "center",
					padding: 8
				} }, pv) : null;
			})(), selWidget.configSchema && selWidget.configSchema.length > 0 ? react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 4
			} }, react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)"
			} }, "自定义"), selWidget.configSchema.map((f) => react.createElement("div", {
				key: f.key,
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					padding: "6px 0",
					borderBottom: "1px solid var(--dsw-alias-border-l1)"
				}
			}, react.createElement("span", { style: {
				fontSize: 13,
				color: "var(--dsw-alias-label-primary)"
			} }, f.label), react.createElement("div", { style: {
				flex: "none",
				minWidth: 0
			} }, react.createElement(ConfigFieldControl, {
				field: f,
				value: selConfig[f.key],
				onChange: (v) => setConfig(f, v)
			}))))) : null) : null);
		}
		function MarketTab({ controller, usageData }) {
			const { prefs, setPrefs } = controller;
			const [q, setQ] = react.useState("");
			const [previewGroup, setPreviewGroup] = react.useState(null);
			const [previewIdx, setPreviewIdx] = react.useState(0);
			const [previewSize, setPreviewSize] = react.useState("2x2");
			const seen = /* @__PURE__ */ new Set();
			const list = WIDGETS.filter((w) => {
				const g = groupOf(w);
				if (seen.has(g)) return false;
				seen.add(g);
				return true;
			}).filter((w) => `${w.name} ${w.desc} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1);
			if (previewGroup !== null) {
				const gw = WIDGETS.filter((w) => groupOf(w) === previewGroup);
				const w = gw[previewIdx] ?? gw[0];
				const sz = w ? sizesOf(w) : ["2x2"];
				const curSize = w && sz.includes(previewSize) ? previewSize : sz[0] ?? "2x2";
				const curKey = w ? instanceKey(w.id, curSize) : "";
				const installed = w ? prefs.installed.indexOf(curKey) !== -1 : false;
				const out = w ? w.render(PREVIEW_STATS, { size: curSize }) : null;
				const toggleInstall = () => {
					if (!w) return;
					setPrefs({ installed: installed ? prefs.installed.filter((x) => x !== curKey) : prefs.installed.indexOf(curKey) === -1 ? prefs.installed.concat(curKey) : prefs.installed });
				};
				const prev = () => setPreviewIdx((previewIdx - 1 + gw.length) % gw.length);
				const next = () => setPreviewIdx((previewIdx + 1) % gw.length);
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 12,
					flex: 1,
					minHeight: 0
				} }, react.createElement("div", { style: {
					display: "flex",
					alignItems: "center",
					gap: 8
				} }, react.createElement("button", {
					type: "button",
					className: "dsx-btn",
					onClick: () => setPreviewGroup(null)
				}, "← 返回"), react.createElement("span", { style: {
					flex: 1,
					fontSize: 14,
					fontWeight: 600,
					color: "var(--dsw-alias-label-primary)"
				} }, w ? w.name : ""), w && sz.length > 1 ? react.createElement("select", {
					className: "dsx-select",
					style: {
						fontSize: 11,
						width: "auto"
					},
					value: curSize,
					title: "切换尺寸",
					onChange: (e) => setPreviewSize(e.target.value)
				}, sz.map((s) => react.createElement("option", {
					key: s,
					value: s
				}, s === "2x4" ? "2×4" : "2×2"))) : null, react.createElement("button", {
					type: "button",
					disabled: !installed && prefs.installed.length >= prefs.maxWidgets,
					className: installed ? "dsx-btn" : "dsx-btn dsx-btn-primary",
					onClick: toggleInstall
				}, installed ? "已安装" : "下载")), !installed && prefs.installed.length >= prefs.maxWidgets ? react.createElement("div", { style: {
					fontSize: 12,
					color: "var(--dsw-alias-state-warn-primary, var(--dsw-alias-label-tertiary))",
					marginTop: -4
				} }, `已达上限 ${prefs.maxWidgets} 个，先卸载再添加`) : null, react.createElement("div", { style: {
					flex: 1,
					minHeight: 0,
					display: "flex",
					alignItems: "center",
					gap: 12,
					padding: "0 4px"
				} }, react.createElement("button", {
					type: "button",
					className: "dsx-navbtn",
					"aria-label": "上一个",
					onClick: prev
				}, react.createElement(ChevronLeftIcon)), react.createElement("div", { style: {
					flex: 1,
					display: "flex",
					justifyContent: "center"
				} }, out ? react.createElement(CardBody, {
					out,
					unit: 200,
					width: curSize === "2x4" ? 412 : void 0
				}) : null), react.createElement("button", {
					type: "button",
					className: "dsx-navbtn",
					"aria-label": "下一个",
					onClick: next
				}, react.createElement(ChevronRightIcon))), react.createElement("div", { style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 8
				} }, gw.map((x, i) => react.createElement("button", {
					key: x.id,
					type: "button",
					className: i === previewIdx ? "dsx-dot dsx-dot-active" : "dsx-dot",
					"aria-label": x.name,
					onClick: () => setPreviewIdx(i)
				}))));
			}
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement("input", {
				type: "search",
				placeholder: "搜索组件",
				className: "dsx-search",
				value: q,
				onChange: (e) => setQ(e.target.value)
			}), react.createElement("div", { className: "dsx-mlist" }, list.map((w) => {
				const anyInstalled = WIDGETS.filter((x) => groupOf(x) === groupOf(w)).some((x) => sizesOf(x).some((s) => prefs.installed.indexOf(instanceKey(x.id, s)) !== -1));
				return react.createElement("button", {
					key: w.id,
					type: "button",
					className: "dsx-mcard",
					"aria-pressed": anyInstalled,
					onClick: () => {
						setPreviewGroup(groupOf(w));
						setPreviewIdx(0);
					}
				}, react.createElement("span", { className: "dsx-mhead" }, react.createElement("span", { className: "dsx-mname" }, w.name), react.createElement("span", { className: "dsx-badge" }, badgeOf(w))), react.createElement("span", { className: "dsx-mdesc" }, w.desc), react.createElement("code", { className: "dsx-mid" }, w.id), react.createElement("span", { className: "dsx-macts" }, react.createElement("span", { className: "dsx-btn" }, "查看详情"), react.createElement("span", { className: anyInstalled ? "dsx-btn dsx-btn-primary" : "dsx-btn" }, anyInstalled ? "已安装" : "下载")));
			})));
		}
		function WidgetsPage({ controller, hideHeader }) {
			const [tab, setTab] = react.useState("config");
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 12,
				minHeight: "100%"
			} }, hideHeader ? null : react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 4,
				padding: "4px 0 12px",
				borderBottom: "1px solid var(--dsw-alias-border-l2)"
			} }, react.createElement("div", { style: {
				fontSize: 18,
				fontWeight: 600,
				lineHeight: "26px",
				color: "var(--dsw-alias-label-primary)"
			} }, "组件"), react.createElement("div", { style: {
				fontSize: 13,
				lineHeight: "20px",
				color: "var(--dsw-alias-label-tertiary)"
			} }, "管理右侧栏中的小组件。")), react.createElement("div", { className: "dsx-tabbar" }, react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "config",
				onClick: () => setTab("config")
			}, "组件配置"), react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "market",
				onClick: () => setTab("market")
			}, "组件市场"), react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "settings",
				onClick: () => setTab("settings")
			}, "组件设置")), tab === "config" ? react.createElement(ConfigTab, { controller }) : tab === "market" ? react.createElement(MarketTab, {
				controller,
				usageData: null
			}) : react.createElement(SettingsPanel, { controller }));
		}
		function Slider({ value, onChange, unit, min, max, step }) {
			return react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				flex: "none"
			} }, react.createElement("input", {
				type: "range",
				min,
				max,
				step: step ?? 1,
				value,
				style: {
					width: 160,
					accentColor: "var(--dsw-alias-brand-primary)"
				},
				onChange: (e) => onChange(Number(e.target.value))
			}), react.createElement("span", { style: {
				width: 48,
				fontSize: 13,
				lineHeight: "20px",
				color: "var(--dsw-alias-label-secondary)",
				textAlign: "right",
				fontVariantNumeric: "tabular-nums"
			} }, `${value}${unit}`));
		}
		function Row({ title, desc, children }) {
			return react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				padding: "14px 0",
				borderBottom: "1px solid var(--dsw-alias-border-l2)"
			} }, react.createElement("div", { style: {
				flex: 1,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				paddingRight: 32
			} }, react.createElement("div", { style: {
				fontSize: 14,
				lineHeight: "22px",
				color: "var(--dsw-alias-label-primary)"
			} }, title), react.createElement("div", { style: {
				fontSize: 12,
				lineHeight: "18px",
				color: "var(--dsw-alias-label-tertiary)"
			} }, desc)), react.createElement("div", { style: {
				flex: "none",
				minWidth: 0
			} }, children));
		}
		function SettingsPanel({ controller }) {
			const { prefs, setPrefs } = controller;
			const colValue = [
				1,
				2,
				4
			].indexOf(prefs.columns) !== -1 ? prefs.columns : 2;
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement(Row, {
				title: "列数",
				desc: "侧边栏卡片排布列数：1 列 = 纵向 Dock；2 列 / 4 列 = 网格布局，并解锁长方形部件能力",
				children: react.createElement("select", {
					className: "dsx-select",
					value: colValue,
					onChange: (e) => setPrefs({ columns: Number(e.target.value) })
				}, [
					1,
					2,
					4
				].map((c) => react.createElement("option", {
					key: c,
					value: c
				}, `${c} 列`)))
			}), react.createElement(Row, {
				title: "无极变化（连续跟随）",
				desc: "开启后放大峰值跟随鼠标实时连续变化（每个动画帧重排），用于对比观察动画节奏；关闭则离散跳变后由过渡动画补间",
				children: react.createElement("label", { className: "dsx-switch-row" }, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: prefs.realTime,
					onChange: (e) => setPrefs({ realTime: e.target.checked })
				}), react.createElement("span", { className: "dsx-switch-track" }, react.createElement("span", { className: "dsx-switch-thumb" })))
			}), react.createElement(Row, {
				title: "放大倍数",
				desc: "被悬浮组件的峰值放大比例（1.0 = 不放大，1.4 = 1.4 倍）",
				children: react.createElement(Slider, {
					min: 1,
					max: 1.4,
					step: .05,
					value: prefs.magnify,
					unit: "x",
					onChange: (v) => setPrefs({ magnify: v })
				})
			}), react.createElement(Row, {
				title: "组件栏内边距",
				desc: "栏内四周与卡片间距（两者一致）",
				children: react.createElement(Slider, {
					min: 4,
					max: 40,
					value: prefs.panelPadding,
					unit: "px",
					onChange: (v) => setPrefs({ panelPadding: v })
				})
			}), react.createElement(Row, {
				title: "卡片边长",
				desc: "所有卡片统一的正方形边长，字体与圆角随比例缩放",
				children: react.createElement(Slider, {
					min: 100,
					max: 220,
					value: prefs.cardSide,
					unit: "px",
					onChange: (v) => setPrefs({ cardSide: v })
				})
			}), react.createElement(Row, {
				title: "添加面板宽度",
				desc: "右侧“添加组件”面板的宽度，也可拖其左边缘调整",
				children: react.createElement(Slider, {
					min: 260,
					max: 760,
					value: prefs.panelWidth,
					unit: "px",
					onChange: (v) => setPrefs({ panelWidth: v })
				})
			}), react.createElement(Row, {
				title: "最多组件数",
				desc: "侧边栏最多显示的组件数量，超限后无法再添加",
				children: react.createElement(Slider, {
					min: 1,
					max: 20,
					value: prefs.maxWidgets,
					unit: "个",
					onChange: (v) => setPrefs({ maxWidgets: v })
				})
			}));
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Harness Widgets — browser half entry.
		*
		* Registers the right-hand widget rail, the header capsule toggle, and the
		* two settings surfaces (General rows + the "组件" section). One shared bridge
		* holds the persisted prefs, the folded session stats, and the OpenCode usage
		* payload fetched from the Host's same-origin `/api/opencode-usage` route.
		*/
		const STORAGE_KEY = "harness-widgets.state";
		const BASE_SIDE = 150;
		/** Map from interactive action id to the slash command it triggers. */
		const ACTION_COMMANDS = { contextCompact: "/compact" };
		const HEATMAP_KEY = "harness-widgets.heatmap";
		function loadHeatmap() {
			try {
				const raw = localStorage.getItem(HEATMAP_KEY);
				return raw ? JSON.parse(raw) : {};
			} catch {
				return {};
			}
		}
		function saveHeatmap(m) {
			try {
				localStorage.setItem(HEATMAP_KEY, JSON.stringify(m));
			} catch {}
		}
		function dateKey(d) {
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		/** Build a horizontal (GitHub-style) heatmap grid: 7 rows (Sun..Sat) × weeks
		*  as columns (~13 wide). Two window-alignment modes:
		*   - 'rolling' : classic rolling window — the last 13 weeks ending today,
		*     so today is always pinned to the right edge (future is unknowable).
		*   - 'quarter' : align to the current calendar quarter (1–3, 4–6, 7–9,
		*     10–12月) that contains today; today then lands wherever it naturally
		*     falls within the quarter (e.g. mid-quarter dates sit toward the middle).
		*  Future columns render empty (value 0), shown faint. */
		function buildHeatmapGrid(m, mode = "rolling") {
			const weeks = 13;
			const now = /* @__PURE__ */ new Date();
			const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
			let base;
			if (mode === "quarter") {
				const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
				base = new Date(qStart.getFullYear(), qStart.getMonth(), qStart.getDate() - qStart.getDay());
			} else {
				base = new Date(startOfWeek);
				base.setDate(base.getDate() - 84);
			}
			const grid = [];
			for (let r = 0; r < 7; r++) {
				const row = [];
				for (let c = 0; c < weeks; c++) {
					const d = new Date(base);
					d.setDate(base.getDate() + c * 7 + r);
					const k = dateKey(d);
					row.push({
						value: m[k] ?? 0,
						date: k
					});
				}
				grid.push(row);
			}
			return grid;
		}
		/** Add newly observed tokens to today; returns the running grid for the card. */
		function accumulateHeatmap(m, dayKey, delta) {
			if (delta <= 0) return m;
			const next = {
				...m,
				[dayKey]: (m[dayKey] ?? 0) + delta
			};
			saveHeatmap(next);
			return next;
		}
		const HEATMAP_SEEN = "harness-widgets.heatmap.seen";
		const HEATMAP_SEEN_STRONGEST = "harness-widgets.heatmap.strongest";
		const HEATMAP_ANCHOR = "harness-widgets.heatmap.anchor";
		const HEATMAP_LOG_KEY = "harness-widgets.heatmap.log-v2";
		function loadSeen() {
			try {
				const keys = /* @__PURE__ */ new Set();
				const raw = localStorage.getItem(HEATMAP_SEEN);
				if (raw) {
					for (const k of JSON.parse(raw)) if (typeof k === "string") keys.add(k);
				}
				const sRaw = localStorage.getItem(HEATMAP_SEEN_STRONGEST);
				return {
					keys,
					strongest: Number.isFinite(+(sRaw ?? "")) ? +(sRaw ?? "") : 0
				};
			} catch {
				return {
					keys: /* @__PURE__ */ new Set(),
					strongest: 0
				};
			}
		}
		function saveSeen(keys, strongest) {
			try {
				localStorage.setItem(HEATMAP_SEEN, JSON.stringify([...keys]));
				localStorage.setItem(HEATMAP_SEEN_STRONGEST, String(strongest));
			} catch {}
		}
		function loadHeatmapAnchor() {
			try {
				const n = +(localStorage.getItem(HEATMAP_ANCHOR) ?? "");
				return Number.isFinite(n) && n >= 0 ? n : 0;
			} catch {
				return 0;
			}
		}
		function saveHeatmapAnchor(n) {
			try {
				localStorage.setItem(HEATMAP_ANCHOR, String(n));
			} catch {}
		}
		/** V2 migration: NEVER drop existing heatmap history. The previous migration
		*  rebuilt the table with only the demo seed (8/14–16), discarding the real
		*  credits the user accumulated on the other days (e.g. 8/17–21) — a data-
		*  losing bug. Migration now:
		*  - cold install (no log key AND empty table): seed the three demo days;
		*  - upgrade: PRESERVE every existing date value, then BACKFILL any of the
		*    lost 8/14–21 days from host-session-cache derived constants (the real
		*    daily totals rebuilt from DSH's session_projcache.json), so devices that
		*    already had history cleared by the buggy migration get it restored.
		*  - cross-day over-credit fix comes from the accounting CHANGE itself, not
		*    from wiping the table.
		*/
		/** Daily totals rebuilt from the authoritative per-event session logs
		*  (D:/dsh-home/sessions/.../session.jsonl.zstd, decoded via ZSTD frame scan +
		*  the official tokenUsageOf delta algorithm, attributed by each usage
		*  EVENT's `time` in LOCAL time — not by session createdAt, because a session
		*  can span midnight. Sum is conserved: equals the all-session official total.
		*  IMPORTANT: non-live past days (8/14–8/21) are backfilled here — their
		*  sessions have ended, so the live collector will never re-credit them.
		*  8/22 must NOT be seeded: the live per-step accounting accumulates it in
		*  real time, and a fixed seed on top double-counts (8/22 was once 145M–181M). */
		const HEATMAP_RECOVERED = {
			"2026-08-14": 74315859,
			"2026-08-15": 367790777,
			"2026-08-16": 1195700475,
			"2026-08-17": 161488382,
			"2026-08-18": 292337504,
			"2026-08-19": 352355694,
			"2026-08-20": 214853935,
			"2026-08-21": 44552871
		};
		function migrateHeatmapV2() {
			const m = loadHeatmap();
			try {
				const next = { ...m };
				let patched = false;
				for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) if ((next[k] ?? 0) === 0) {
					next[k] = v;
					patched = true;
				}
				const repairedKey = "harness-widgets.heatmap.live-fixed";
				let repaired = false;
				if (!localStorage.getItem(repairedKey)) {
					for (const k of ["2026-08-21", "2026-08-22"]) if ((next[k] ?? 0) > 0) {
						delete next[k];
						repaired = true;
					}
					if (repaired) {
						saveHeatmap(next);
						saveSeen(/* @__PURE__ */ new Set(), 0);
					}
					localStorage.setItem(repairedKey, "1");
				}
				let refill = false;
				for (const [k, v] of Object.entries(HEATMAP_RECOVERED)) if ((next[k] ?? 0) === 0) {
					next[k] = v;
					refill = true;
				}
				if (refill) saveHeatmap(next);
				if (patched) saveHeatmap(next);
				if (!localStorage.getItem(HEATMAP_LOG_KEY)) {
					localStorage.setItem(HEATMAP_LOG_KEY, "1");
					saveSeen(/* @__PURE__ */ new Set(), 0);
				}
				return next;
			} catch {
				return m;
			}
		}
		const DEFAULTS = {
			panelPadding: 24,
			cardSide: 150,
			installed: DEFAULT_INSTALLED.slice(),
			order: ALL_INSTANCES.slice(),
			apiKey: "",
			railOpen: false,
			realTime: false,
			magnify: 1.2,
			panelWidth: 500,
			cardConfigs: {},
			maxWidgets: 10,
			columns: 2
		};
		/** Required services: the slot registry (React is a platform module). */
		const inject = ["slots"];
		function loadState() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_INSTANCES.slice()
				};
				const p = JSON.parse(raw);
				const s = {
					...DEFAULTS,
					...p
				};
				if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding;
				if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide;
				const normalizeInstance = (key) => {
					const { widgetId, size } = parseInstanceKey(key);
					const w = WIDGETS.find((x) => x.id === widgetId);
					if (!w) return "";
					return sizesOf(w).includes(size) ? instanceKey(widgetId, size) : "";
				};
				if (!Array.isArray(s.installed)) s.installed = [];
				s.installed = s.installed.map(normalizeInstance).filter((id) => id !== "");
				if (!Array.isArray(s.order)) s.order = [];
				s.order = s.order.map(normalizeInstance).filter((id) => id !== "");
				for (const key of ALL_INSTANCES) if (s.order.indexOf(key) === -1) s.order.push(key);
				if (typeof s.apiKey !== "string") s.apiKey = "";
				if (typeof s.railOpen !== "boolean") s.railOpen = DEFAULTS.railOpen;
				if (typeof s.realTime !== "boolean") s.realTime = DEFAULTS.realTime;
				if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify;
				if (!Number.isFinite(s.panelWidth) || s.panelWidth < 260 || s.panelWidth > 760) s.panelWidth = DEFAULTS.panelWidth;
				if (typeof s.cardConfigs !== "object" || s.cardConfigs === null || Array.isArray(s.cardConfigs)) s.cardConfigs = {};
				if (!Number.isFinite(s.maxWidgets) || s.maxWidgets < 1 || s.maxWidgets > 20) s.maxWidgets = DEFAULTS.maxWidgets;
				if ([
					1,
					2,
					4
				].indexOf(s.columns) === -1) s.columns = DEFAULTS.columns;
				return s;
			} catch {
				return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_INSTANCES.slice()
				};
			}
		}
		function saveState(s) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
			} catch {}
		}
		/** Fold assistant/tool-result nodes into the same window-scoped stats as the shipped StatsLine fallback. */
		function deriveStats(nodes) {
			const turns = /* @__PURE__ */ new Set();
			let steps = 0;
			let llmMs = 0;
			let toolMs = 0;
			for (const node of nodes ?? []) {
				if (node.kind === "tool-result") {
					if (node.callTime !== null && node.callTime !== void 0) toolMs += Math.max(0, node.time - node.callTime);
					continue;
				}
				if (node.kind !== "assistant") continue;
				turns.add(node.turn);
				steps += 1;
				if (node.timing !== void 0 && node.timing !== null && node.timing.stepStartTime !== null) llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime);
			}
			return {
				turns: turns.size,
				steps,
				llmMs,
				toolMs,
				ttftMs: 0,
				ttftSteps: 0,
				decodeMs: 0,
				decodeTokens: 0
			};
		}
		/**
		* Client plugin body: restore persisted prefs, register the rail and settings
		* surfaces, and wire the live session stats + OpenCode usage into one bridge.
		* @param ctx - client root context (carries the injected `slots` service).
		*/
		function apply(ctx) {
			try {
				migrateHeatmapV2();
			} catch {}
			let prefs = loadState();
			let state = {
				open: prefs.railOpen,
				hasSession: false,
				stats: null,
				usageData: null
			};
			const listeners = /* @__PURE__ */ new Set();
			function emit() {
				for (const fn of listeners) fn();
			}
			function subscribe(fn) {
				listeners.add(fn);
				return () => {
					listeners.delete(fn);
				};
			}
			function setState(patch) {
				state = {
					...state,
					...patch
				};
				emit();
			}
			function setPrefs(patch) {
				prefs = {
					...prefs,
					...patch
				};
				saveState(prefs);
				emit();
			}
			function useBridge() {
				const [snap, setSnap] = react.useState({
					...state,
					prefs: { ...prefs }
				});
				react.useEffect(() => subscribe(() => setSnap({
					...state,
					prefs: { ...prefs }
				})), []);
				return snap;
			}
			ctx.effect(() => () => {
				listeners.clear();
			});
			const remote = ctx.get("remote");
			const runCommand = (line) => {
				(async () => {
					try {
						const exe = remote?.commands?.execute;
						if (!exe) return;
						await exe(void 0, line);
					} catch {}
				})();
			};
			let raf = 0;
			function measureRailTop() {
				const el = document.querySelector("[data-conversation-scroll]");
				const top = el ? el.getBoundingClientRect().top : 0;
				document.documentElement.style.setProperty("--dsx-rail-top", `${top}px`);
				const dock = document.querySelector("[data-slot=\"conversation.composer.dock\"]");
				const comp = dock && dock.getBoundingClientRect().height > 0 && dock.getBoundingClientRect().bottom > 0 ? dock : document.querySelector("[data-composer-seat]") || document.querySelector("[data-conversation-composer-overlay]") || el;
				const gap = comp ? Math.max(0, window.innerHeight - comp.getBoundingClientRect().bottom) : 0;
				document.documentElement.style.setProperty("--dsx-input-bottom", `${gap}px`);
			}
			const scheduleMeasure = () => {
				if (raf !== 0) return;
				raf = requestAnimationFrame(() => {
					raf = 0;
					measureRailTop();
				});
			};
			let ro = null;
			ctx.effect(() => {
				measureRailTop();
				window.addEventListener("resize", scheduleMeasure);
				if (typeof ResizeObserver !== "undefined") {
					ro = new ResizeObserver(scheduleMeasure);
					const t = document.querySelector("[data-conversation-scroll]");
					if (t) ro.observe(t);
					const h = document.querySelector("[data-slot=\"conversation.session.header\"]");
					if (h) ro.observe(h);
					const c = document.querySelector("[data-composer-seat]");
					if (c) ro.observe(c);
				}
				const sub = subscribe(scheduleMeasure);
				return () => {
					window.removeEventListener("resize", scheduleMeasure);
					if (ro) ro.disconnect();
					sub();
					document.documentElement.style.removeProperty("--dsx-rail-top");
					document.documentElement.style.removeProperty("--dsx-input-bottom");
				};
			});
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "widgets-panel-toggle",
				order: 10
			}, () => {
				const snap = useBridge();
				const toggle = () => {
					const next = !snap.open;
					setState({ open: next });
					setPrefs({ railOpen: next });
				};
				return react.createElement("button", {
					type: "button",
					className: "dsx-stats-capsule",
					"aria-pressed": snap.open,
					onClick: toggle
				}, react.createElement("span", null, "组件"));
			}));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "widgets-panel-collector",
				order: 9999
			}, ({ useSession, useProjection }) => {
				const settled = useSession ? useSession((s) => s.chat.legacy.nodes) : [];
				const timeline = useSession ? useSession((s) => s.chat.timeline) : void 0;
				const runningCalls = useSession ? useSession((s) => s.runningCalls) : [];
				const running = useSession ? useSession((s) => s.running) : false;
				const projected = useProjection ? useProjection("sessionStats") : void 0;
				const usage = useProjection ? useProjection("tokenUsage") : void 0;
				const contextPres = useProjection ? useProjection("contextPressure") : void 0;
				const contextBrk = useProjection ? useProjection("contextBreakdown") : void 0;
				const todosProj = useProjection ? useProjection("todos") : void 0;
				const heatmapRef = react.useRef(migrateHeatmapV2());
				const anchorRef = react.useRef(loadHeatmapAnchor());
				const [heatmap, setHeatmap] = react.useState(heatmapRef.current);
				react.useEffect(() => {
					setState({ hasSession: true });
					return () => {
						setState({ hasSession: false });
					};
				}, []);
				react.useEffect(() => {
					fetch("/api/opencode-usage").then((r) => r.json()).then((data) => setState({ usageData: data })).catch(() => {});
				}, []);
				const [now, setNow] = react.useState(() => Date.now());
				react.useEffect(() => {
					if (!running) return;
					setNow(Date.now());
					const id = window.setInterval(() => setNow(Date.now()), 1e3);
					return () => window.clearInterval(id);
				}, [running]);
				react.useEffect(() => {
					const p = projected;
					const folded = p && p.steps !== void 0 ? p : deriveStats(settled);
					let inputTokens = 0;
					let cacheRead = 0;
					let outputTokens = 0;
					if (usage) {
						inputTokens = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0);
						cacheRead = usage.cacheReadTokens || 0;
						outputTokens = usage.outputTokens || 0;
					}
					const seenState = loadSeen();
					let dirty = false;
					let nodeUsageOk = false;
					const isStartF = (n) => typeof n === "number" && Number.isFinite(n);
					for (const node of settled ?? []) {
						if (node?.kind !== "assistant") continue;
						if (node?.usage == null) continue;
						nodeUsageOk = true;
						const start = node.timing?.stepStartTime;
						const nodeUsage = node.usage;
						if (start == null) continue;
						const total = (isStartF(nodeUsage.uncachedInputTokens) ? nodeUsage.uncachedInputTokens : 0) + (isStartF(nodeUsage.cacheReadTokens) ? nodeUsage.cacheReadTokens : 0) + (isStartF(nodeUsage.cacheWriteTokens) ? nodeUsage.cacheWriteTokens : 0) + (isStartF(nodeUsage.outputTokens) ? nodeUsage.outputTokens : 0);
						if (total <= 0) continue;
						const key = `${node.turn ?? "?"}:${node.step ?? "?"}:${start}`;
						if (seenState.keys.has(key)) continue;
						seenState.keys.add(key);
						if (start > seenState.strongest) seenState.strongest = start;
						const day = dateKey(new Date(start));
						heatmapRef.current = accumulateHeatmap(heatmapRef.current, day, total);
						dirty = true;
					}
					if (dirty) {
						saveSeen(seenState.keys, seenState.strongest);
						setHeatmap(heatmapRef.current);
					}
					if (!nodeUsageOk) {
						const current = inputTokens + outputTokens;
						const todayKey = dateKey(/* @__PURE__ */ new Date());
						if (usage && current > anchorRef.current) {
							const delta = current - anchorRef.current;
							anchorRef.current = current;
							saveHeatmapAnchor(current);
							heatmapRef.current = accumulateHeatmap(heatmapRef.current, todayKey, delta);
							setHeatmap(heatmapRef.current);
						} else if (usage && current < anchorRef.current) {
							anchorRef.current = current;
							saveHeatmapAnchor(current);
						}
					}
					let llmMs = folded.llmMs;
					let toolMs = folded.toolMs;
					if (timeline) for (const turn of timeline.turns.values()) {
						if (turn.status !== "open") continue;
						for (const step of turn.steps) {
							if (step.status !== "open" || step.start === void 0) continue;
							if (!settled.some((n) => n.kind === "assistant" && n.turn === step.turn && n.step === step.step && n.timing !== void 0)) llmMs += Math.max(0, now - step.start.time);
						}
					}
					for (const call of runningCalls) toolMs += Math.max(0, now - call.time);
					let contextPercent = null;
					let contextWindow = null;
					let contextTokens = null;
					if (contextPres && typeof contextPres === "object") {
						if (typeof contextPres.contextWindow === "number" && contextPres.contextWindow > 0) contextWindow = contextPres.contextWindow;
						if (typeof contextPres.projectedTokens === "number") {
							contextTokens = contextPres.projectedTokens;
							if (contextWindow) contextPercent = Math.min(1, Math.max(0, contextPres.projectedTokens / contextWindow));
						}
					}
					let contextBreakdown = null;
					if (contextBrk && typeof contextBrk === "object") contextBreakdown = {
						systemTokens: contextBrk.systemTokens ?? 0,
						toolsTokens: contextBrk.toolsTokens ?? 0,
						messageTokens: contextBrk.messageTokens ?? 0
					};
					setState({ stats: {
						turns: folded.turns,
						steps: folded.steps,
						llmMs,
						toolMs,
						ttftMs: folded.ttftMs,
						ttftSteps: folded.ttftSteps,
						decodeMs: folded.decodeMs,
						decodeTokens: folded.decodeTokens,
						usage: {
							inputTokens,
							cacheReadTokens: cacheRead,
							outputTokens
						},
						contextPercent,
						contextWindow,
						contextTokens,
						contextBreakdown,
						todos: Array.isArray(todosProj) && todosProj.length >= 0 ? todosProj : null,
						heatmapGrid: buildHeatmapGrid(heatmapRef.current, prefs.cardConfigs?.heatmap?.monthMode || "rolling"),
						heatmapRaw: { ...heatmapRef.current }
					} });
				}, [
					settled,
					projected,
					usage,
					contextPres,
					contextBrk,
					todosProj,
					timeline,
					runningCalls,
					now,
					prefs.cardConfigs?.heatmap?.monthMode
				]);
				return null;
			}));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "widgets-panel",
				order: 1e3
			}, () => {
				const snap = useBridge();
				const [addOpen, setAddOpen] = react.useState(false);
				const [armedAction, setArmedAction] = react.useState(null);
				const handleAction = (id) => {
					const command = ACTION_COMMANDS[id];
					if (!command) return;
					if (armedAction !== id) {
						setArmedAction(id);
						return;
					}
					setArmedAction(null);
					runCommand(command);
				};
				const [focusIdx, setFocusIdx] = react.useState(null);
				const [focusY, setFocusY] = react.useState(null);
				const [focusX, setFocusX] = react.useState(null);
				const [railScrollTop, setRailScrollTop] = react.useState(0);
				const lastClientXYRef = react.useRef(null);
				const contentYRef = react.useRef(null);
				const contentXRef = react.useRef(null);
				const rafRef = react.useRef(0);
				const railRectRef = react.useRef(null);
				const moveRailFocus = (clientX, clientY, el) => {
					lastClientXYRef.current = {
						x: clientX,
						y: clientY
					};
					const rect = el.getBoundingClientRect();
					railRectRef.current = rect;
					const contentX = clientX - rect.left;
					const contentY = clientY - rect.top - 2 + el.scrollTop;
					contentXRef.current = contentX;
					contentYRef.current = contentY;
					if (rafRef.current) return;
					rafRef.current = requestAnimationFrame(() => {
						rafRef.current = 0;
						setFocusX(contentXRef.current);
						setFocusY(contentYRef.current);
					});
				};
				const railScrollSync = (el) => {
					if (lastClientXYRef.current === null || !prefs.realTime) return;
					moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el);
				};
				react.useEffect(() => {
					return () => {
						if (rafRef.current) cancelAnimationFrame(rafRef.current);
					};
				}, []);
				react.useEffect(() => {
					if (!snap.open || !snap.hasSession) {
						setAddOpen(false);
						setFocusIdx(null);
						setFocusY(null);
						setFocusX(null);
					}
				}, [snap.open, snap.hasSession]);
				if (!snap.open || !snap.hasSession) return null;
				const side = prefs.cardSide;
				const pad = prefs.panelPadding;
				const columns = [
					1,
					2,
					4
				].indexOf(prefs.columns) !== -1 ? prefs.columns : 2;
				const multi = columns > 1;
				const railW = multi ? columns * side + (columns + 1) * pad : side + pad * 2;
				document.documentElement.style.setProperty("--dsx-rail-w", `${railW}px`);
				document.documentElement.style.setProperty("--dsx-rail-pad", `${pad}px`);
				document.documentElement.style.setProperty("--dsx-rail-overshoot", `0px`);
				document.documentElement.style.setProperty("--dsx-rail-scroll", `${railScrollTop}px`);
				const statsHeat = snap.stats ?? null;
				const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0 ? statsHeat.heatmapRaw : migrateHeatmapV2();
				const base = {
					...snap.stats ?? {
						turns: 0,
						steps: 0,
						llmMs: 0,
						toolMs: 0,
						ttftMs: 0,
						ttftSteps: 0,
						decodeMs: 0,
						decodeTokens: 0,
						usage: null
					},
					...statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } },
					...statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, prefs.cardConfigs?.heatmap?.monthMode || "rolling") }
				};
				const items = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1).map((key) => {
					const { widgetId, size } = parseInstanceKey(key);
					const w = WIDGETS.find((x) => x.id === widgetId);
					if (!w || sizesOf(w).indexOf(size) === -1) return null;
					const out = w.render({
						...base,
						usageData: snap.usageData,
						armedAction,
						...prefs.cardConfigs?.[key] ?? {}
					}, { size });
					if (!out) return null;
					return {
						key,
						size,
						w,
						out,
						baseW: size === "2x4" ? 2 * side + pad : side
					};
				}).filter((it) => it !== null);
				const scale = side / BASE_SIDE;
				const addRadius = Math.round(16 * scale);
				const closeIcon = react.createElement("svg", {
					width: 14,
					height: 14,
					viewBox: "0 0 16 16",
					fill: "none",
					xmlns: "http://www.w3.org/2000/svg",
					"aria-hidden": true
				}, react.createElement("path", {
					d: "M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z",
					fill: "currentColor"
				}), react.createElement("path", {
					d: "M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z",
					fill: "currentColor"
				}));
				const restCenter = (i) => i * (side + pad) + side / 2;
				const peakScale = prefs.magnify;
				const stepScale = (d) => {
					const extra = peakScale - 1;
					if (d <= 0) return peakScale;
					const t = Math.max(0, 1 - d / 3);
					if (t <= 0) return 1;
					return 1 + extra * Math.pow(t, 1.6);
				};
				const active = prefs.realTime;
				const spanOf = (i) => items[i].size === "2x4" ? 2 : 1;
				const baseWOf = (i) => items[i].baseW;
				const rowIndexOf = [];
				const colIndexOf = [];
				const n = items.length;
				if (n > 0) {
					if (multi) {
						const rowUsed = [0];
						for (let i = 0; i < n; i++) {
							const sp = spanOf(i);
							let placed = -1;
							for (let r = 0; r < rowUsed.length; r++) if (rowUsed[r] + sp <= columns) {
								placed = r;
								break;
							}
							if (placed === -1) {
								placed = rowUsed.length;
								rowUsed.push(0);
							}
							rowIndexOf[i] = placed;
							colIndexOf[i] = rowUsed[placed];
							rowUsed[placed] += sp;
						}
					} else for (let i = 0; i < n; i++) {
						rowIndexOf[i] = i;
						colIndexOf[i] = 0;
					}
				}
				const rows = multi ? n > 0 ? rowIndexOf[n - 1] + 1 : 0 : n;
				const cellW = side + pad;
				const rowH = side + pad;
				const scaleFor = (fx, fy) => {
					const out = new Array(n).fill(1);
					if (multi) for (let i = 0; i < n; i++) {
						const cxi = (colIndexOf[i] + spanOf(i) / 2) * cellW;
						const cyi = rowIndexOf[i] * rowH + side / 2;
						out[i] = stepScale(Math.hypot(cxi - fx, cyi - fy) / (side + pad));
					}
					else for (let i = 0; i < n; i++) out[i] = stepScale(Math.abs(fy - restCenter(i)) / (side + pad));
					return out;
				};
				const yPts = [];
				for (let r = 0; r < rows; r++) {
					yPts.push(r * rowH + side / 2);
					if (r < rows - 1) yPts.push((r + .5) * rowH + side / 2);
				}
				const xPts = [];
				for (let cIdx = 0; cIdx < columns; cIdx++) {
					xPts.push(cIdx * cellW + cellW / 2);
					if (cIdx < columns - 1) xPts.push((cIdx + .5) * cellW + cellW / 2);
				}
				const nearest = (v, pts) => {
					let best = pts[0] ?? 0;
					for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k] - v) < Math.abs(best - v)) best = pts[k];
					return best;
				};
				const hasFocus = active ? multi ? focusY !== null && focusX !== null : focusY !== null : focusIdx !== null;
				let scaleArr = new Array(n).fill(1);
				if (hasFocus) {
					const rawX = (focusX ?? 0) - pad;
					const rawY = focusY ?? restCenter(Math.max(0, Math.min(focusIdx ?? 0, n - 1)));
					scaleArr = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts));
				}
				const placeCards = (sc) => {
					const place = new Array(n);
					if (n > 0) {
						if (multi) {
							const rowTopAcc = new Array(rows).fill(0);
							const rowHAcc = new Array(rows).fill(0);
							for (let i = 0; i < n; i++) {
								const r = rowIndexOf[i];
								const h = side * sc[i];
								if (h > rowHAcc[r]) rowHAcc[r] = h;
							}
							{
								let acc = 2;
								for (let r = 0; r < rows; r++) {
									rowTopAcc[r] = acc;
									acc += rowHAcc[r] + pad;
								}
							}
							for (let r = rows - 1; r >= 0; r--) {
								const inRow = [];
								for (let i = 0; i < n; i++) if (rowIndexOf[i] === r) inRow.push(i);
								inRow.sort((a, b) => colIndexOf[b] - colIndexOf[a]);
								let colRight = 0;
								for (const i of inRow) {
									const w = baseWOf(i) * sc[i];
									place[i] = {
										s: sc[i],
										top: rowTopAcc[r],
										right: colRight,
										w,
										h: side * sc[i]
									};
									colRight += w + pad;
								}
							}
						} else {
							let acc = 2;
							for (let i = 0; i < n; i++) {
								const h = side * sc[i];
								place[i] = {
									s: sc[i],
									top: acc,
									right: 0,
									w: h,
									h
								};
								acc += h + pad;
							}
						}
					}
					return place;
				};
				const staticLayout = placeCards(new Array(n).fill(1));
				const focusLayout = hasFocus ? placeCards(scaleArr) : [];
				const magnifying = hasFocus && n > 0 && scaleArr.some((s) => s > 1.001);
				const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2);
				const nItems = items.length;
				let addTop;
				let addRight;
				if (multi && nItems > 0 && staticLayout.length > 0) {
					rowIndexOf[nItems - 1];
					if (colIndexOf[nItems - 1] + spanOf(nItems - 1) < columns) {
						const lastCard = staticLayout[nItems - 1];
						addTop = lastCard.top;
						addRight = lastCard.right + lastCard.w + pad;
					} else {
						addTop = (nItems > 0 ? deckBottom : 2) + pad;
						addRight = 0;
					}
				} else {
					addTop = (nItems > 0 ? deckBottom : 2) + pad;
					addRight = 0;
				}
				const addBottom = addTop + side;
				const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad;
				const railChildren = [react.createElement("div", {
					key: "__deck",
					style: {
						position: "relative",
						height: `${stackHeight}px`
					}
				}, staticLayout.map((c, idx) => {
					const it = items[idx];
					const slotStyle = {
						position: "absolute",
						top: `${c.top.toFixed(2)}px`,
						right: `${c.right.toFixed(2)}px`,
						width: `${c.w.toFixed(2)}px`,
						height: `${c.h.toFixed(2)}px`,
						transition: "top 0.2s var(--ds-ease-in-out), right 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out), opacity 0.15s ease",
						opacity: magnifying ? 0 : 1
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: slotStyle,
						onMouseEnter: () => setFocusIdx(idx)
					}, react.createElement(CardBody, {
						out: it.out,
						unit: side,
						width: c.w,
						onAction: handleAction
					}), react.createElement("span", {
						className: "dsx-stats-resize",
						"aria-label": "调整大小",
						onPointerDown: (e) => {
							e.preventDefault();
							e.stopPropagation();
							const sx = e.clientX;
							const s0 = side;
							const move = (ev) => {
								setPrefs({ cardSide: Math.max(100, Math.min(220, Math.round(s0 - (ev.clientX - sx)))) });
							};
							const up = () => {
								window.removeEventListener("pointermove", move);
								window.removeEventListener("pointerup", up);
							};
							window.addEventListener("pointermove", move);
							window.addEventListener("pointerup", up);
						}
					}));
				}), react.createElement("button", {
					key: "__add",
					type: "button",
					className: "dsx-stats-add",
					"aria-label": "添加组件",
					onClick: () => setAddOpen((v) => !v),
					style: {
						position: "absolute",
						top: `${addTop.toFixed(2)}px`,
						right: `${addRight.toFixed(2)}px`,
						width: `${side}px`,
						height: `${side}px`,
						borderRadius: `${addRadius}px`,
						opacity: magnifying ? 0 : 1,
						transition: "opacity 0.15s ease"
					}
				}, react.createElement("span", { className: "dsx-stats-add-icon" }, react.createElement("svg", {
					width: 22,
					height: 22,
					viewBox: "0 0 16 16",
					fill: "none",
					"aria-hidden": true
				}, react.createElement("path", {
					d: "M8 3.2v9.6M3.2 8h9.6",
					stroke: "currentColor",
					strokeWidth: 1.8,
					strokeLinecap: "round"
				}))), react.createElement("span", { className: "dsx-stats-add-label" }, "添加")))];
				const rail = react.createElement("div", {
					className: "dsx-stats-rail",
					style: {
						position: "fixed",
						top: "var(--dsx-rail-top,0px)",
						right: "var(--dsh-sidebar-width, 0px)",
						bottom: 0,
						width: `${railW}px`,
						overflowY: "auto",
						overflowX: "visible",
						boxSizing: "border-box",
						padding: `4px ${pad}px ${pad}px ${pad}px`,
						background: "transparent",
						pointerEvents: "auto"
					},
					onMouseLeave: () => {
						setFocusIdx(null);
						setFocusY(null);
						setFocusX(null);
					},
					onMouseMove: (e) => moveRailFocus(e.clientX, e.clientY, e.currentTarget),
					onScroll: (e) => {
						setRailScrollTop(e.currentTarget.scrollTop);
						if (prefs.realTime) railScrollSync(e.currentTarget);
					}
				}, railChildren);
				const magnifyLayer = magnifying ? react.createElement("div", {
					key: "__magnify",
					style: {
						position: "fixed",
						top: "calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))",
						right: "var(--dsh-sidebar-width, 0px)",
						width: `${railW}px`,
						boxSizing: "border-box",
						padding: `4px ${pad}px ${pad}px ${pad}px`,
						pointerEvents: "none",
						zIndex: 25,
						overflow: "visible",
						background: "transparent"
					}
				}, react.createElement("div", {
					key: "__mdeck",
					style: {
						position: "relative",
						height: `${stackHeight}px`
					}
				}, focusLayout.map((c, idx) => {
					const it = items[idx];
					const transition = active ? "none" : "top 0.2s var(--ds-ease-in-out), right 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out)";
					const slotStyle = {
						position: "absolute",
						top: `${c.top.toFixed(2)}px`,
						right: `${c.right.toFixed(2)}px`,
						width: `${c.w.toFixed(2)}px`,
						height: `${c.h.toFixed(2)}px`,
						transition,
						zIndex: Math.round((c.s - 1) * 100)
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: slotStyle
					}, react.createElement(CardBody, {
						out: it.out,
						unit: side * c.s,
						width: c.w,
						onAction: void 0
					}));
				}), react.createElement("button", {
					key: "__add",
					type: "button",
					className: "dsx-stats-add",
					"aria-label": "添加组件",
					tabIndex: -1,
					style: {
						position: "absolute",
						top: `${addTop.toFixed(2)}px`,
						right: `${addRight.toFixed(2)}px`,
						width: `${side}px`,
						height: `${side}px`,
						borderRadius: `${addRadius}px`
					}
				}, react.createElement("span", { className: "dsx-stats-add-icon" }, react.createElement("svg", {
					width: 22,
					height: 22,
					viewBox: "0 0 16 16",
					fill: "none",
					"aria-hidden": true
				}, react.createElement("path", {
					d: "M8 3.2v9.6M3.2 8h9.6",
					stroke: "currentColor",
					strokeWidth: 1.8,
					strokeLinecap: "round"
				}))), react.createElement("span", { className: "dsx-stats-add-label" }, "添加")))) : null;
				const pw = prefs.panelWidth;
				const startResize = (e) => {
					e.preventDefault();
					e.stopPropagation();
					const x0 = e.clientX, w0 = pw;
					const move = (ev) => setPrefs({ panelWidth: Math.max(260, Math.min(760, Math.round(w0 + (x0 - ev.clientX)))) });
					const up = () => {
						window.removeEventListener("pointermove", move);
						window.removeEventListener("pointerup", up);
					};
					window.addEventListener("pointermove", move);
					window.addEventListener("pointerup", up);
				};
				const addPanel = react.createElement("div", {
					className: "dsx-stats-addpanel" + (addOpen ? " open" : ""),
					style: {
						top: "var(--dsx-rail-top,0px)",
						width: `${pw}px`
					}
				}, react.createElement("span", {
					className: "dsx-stats-addpanel-resize",
					"aria-label": "调整宽度",
					onPointerDown: startResize
				}), react.createElement("div", { className: "dsx-stats-addpanel-header" }, react.createElement("div", { className: "dsx-stats-addpanel-title" }, "添加组件"), react.createElement("button", {
					type: "button",
					className: "dsx-stats-addpanel-close",
					"aria-label": "关闭",
					onClick: () => setAddOpen(false)
				}, closeIcon)), react.createElement("div", { className: "dsx-stats-addpanel-body" }, react.createElement(WidgetsPage, {
					controller: {
						prefs,
						setPrefs
					},
					hideHeader: true
				})));
				return react.createElement(react.Fragment, null, rail, magnifyLayer, addPanel);
			}));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "widgets",
				order: 30,
				label: "组件"
			}, () => {
				const snap = useBridge();
				return react.createElement(WidgetsPage, { controller: {
					prefs: snap.prefs,
					setPrefs
				} });
			}));
			ctx.effect(() => {
				const apply = () => {
					document.body.classList.toggle("dsx-stats-active", state.open && state.hasSession);
					scheduleMeasure();
				};
				const sub = subscribe(apply);
				apply();
				return () => {
					sub();
					document.body.classList.remove("dsx-stats-active");
				};
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map