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
		const css = ".dsx-stats-capsule{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:14px;align-items:center;gap:6px;padding:0 12px;font-size:13px;line-height:1;display:inline-flex}.dsx-stats-capsule[aria-pressed=true]{background:var(--dsw-alias-brand-primary);color:#fff;border-color:#0000}.dsx-stats-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;justify-content:flex-start;display:flex;position:relative;overflow:hidden}.dsx-stats-card-title{color:var(--dsw-alias-label-tertiary);line-height:1.2}.dsx-stats-card-value{color:var(--dsw-alias-label-primary);word-break:break-word;font-weight:600;line-height:1.25}.dsx-stats-card-sub{color:var(--dsw-alias-label-caption);font-size:10px}.dsx-stats-resize{cursor:nesw-resize;z-index:2;opacity:0;background:linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%, var(--dsw-alias-label-tertiary) 62%, transparent 62%);width:18px;height:18px;position:absolute;bottom:0;left:0}.dsx-stats-card:hover .dsx-stats-resize{opacity:1}[data-conversation-scroll]{transition:padding-right .2s}.dsx-stats-rail{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out), transform .24s var(--ds-ease-in-out);-ms-overflow-style:none}.dsx-stats-rail::-webkit-scrollbar{width:0;height:0;display:none}@supports not selector(::-webkit-scrollbar){.dsx-stats-rail{scrollbar-width:none}}body[data-dsh-sidebar-dragging] .dsx-stats-rail{transition:none}body.dsx-stats-active [data-conversation-scroll]{padding-right:var(--dsx-rail-w,220px)!important}body.dsx-stats-active [data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{right:calc(var(--dsh-scrollbar-width) + var(--dsx-rail-w,220px))}[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{transition:right .2s}body.dsx-stats-active [data-slot=\"conversation.composer.dock\"]{visibility:hidden!important}.dsx-stats-card-slot{transition:top .2s var(--ds-ease-in-out), width .2s var(--ds-ease-in-out), height .2s var(--ds-ease-in-out);will-change:top, width, height}.dsx-stats-card-slot .dsx-stats-card{transition:border-color .18s,box-shadow .18s}.dsx-stats-card-slot:hover .dsx-stats-card{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary), 0 10px 28px color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)}.dsx-stats-resize{transition:opacity .12s}.dsx-stats-add{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:border-color .18s ease, color .18s ease, background .18s ease, transform .18s var(--ds-ease-in-out);background:0 0;border-radius:16px;flex-direction:column;flex:none;justify-content:center;align-items:center;gap:6px;display:flex}.dsx-stats-add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);transform:scale(1.04)}.dsx-stats-add-icon{color:var(--dsw-alias-state-business-primary);justify-content:center;align-items:center;line-height:1;display:flex}.dsx-stats-add-label{font-size:13px;font-weight:500;line-height:1}.dsx-stats-addpanel{right:calc(var(--dsh-sidebar-width,0px) + var(--dsx-rail-pad,14px));width:300px;bottom:calc(var(--dsh-sidebar-width,0px) + var(--dsx-rail-pad,14px));z-index:30;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:transform .28s var(--ds-ease-in-out), visibility 0s linear .28s;visibility:hidden;border-radius:16px;flex-direction:column;display:flex;position:fixed;transform:translate(calc(100% + 40px))}.dsx-stats-addpanel.open{visibility:visible;transition-delay:0s;transform:translate(0)}.dsx-stats-addpanel-header{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:8px;padding:12px 12px 10px;display:flex}.dsx-stats-addpanel-title{color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;line-height:22px}.dsx-stats-addpanel-close{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background .12s,color .12s;display:inline-flex}.dsx-stats-addpanel-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-stats-addpanel-body{flex:1;min-height:0;padding:12px;overflow-y:auto}.dsx-stats-addpanel-body>div{height:100%}.dsx-order-row{border-radius:8px;align-items:center;gap:8px;padding:2px 0;display:flex}.dsx-order-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-drag-handle{cursor:grab;color:var(--dsw-alias-label-tertiary);align-items:center;padding:6px 2px;display:flex}.dsx-drag-handle:active{cursor:grabbing}.dsx-restore{border:1px solid var(--dsw-alias-border-l2);height:24px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:12px;padding:0 10px;font-size:12px}.dsx-trash{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;transition:color .12s,background .12s;display:flex}.dsx-trash:hover{color:var(--dsw-alias-state-danger,#e5484d);background:var(--dsw-alias-interactive-bg-hover)}.dsx-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;border-radius:9px;flex:none;padding:1px 8px;font-size:11px}.dsx-tabbar{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;display:flex}.dsx-tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 2px;font-size:13px;font-weight:500;line-height:16px}.dsx-tab[data-active=true]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary)}.dsx-search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:17px;outline:none;margin-bottom:10px;padding:0 12px;font-size:13px}.dsx-mlist{flex-direction:column;gap:10px;display:flex}.dsx-mcard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;box-sizing:border-box;border-radius:14px;flex-direction:column;width:100%;padding:14px;display:flex}.dsx-mcard:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-mcard[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary)}.dsx-mhead{align-items:center;gap:8px;margin-bottom:6px;display:flex}.dsx-mname{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.dsx-mdesc{color:var(--dsw-alias-label-tertiary);margin-bottom:8px;font-size:12px;line-height:18px}.dsx-mid{color:var(--dsw-alias-label-caption);margin-bottom:4px;font-family:monospace;font-size:11px}.dsx-macts{justify-content:flex-end;gap:8px;margin-top:4px;display:flex}.dsx-btn{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:14px;align-items:center;padding:0 12px;font-size:12px;display:inline-flex}.dsx-btn-primary{background:var(--dsw-alias-brand-primary);color:#fff;border-color:#0000}.dsx-navbtn{width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;transition:background .12s;display:inline-flex}.dsx-navbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-dot{background:var(--dsw-alias-border-l2);cursor:pointer;border:none;border-radius:50%;width:8px;height:8px;padding:0}.dsx-dot-active{background:var(--dsw-alias-brand-primary)}.dsx-switch-row{cursor:pointer;flex:none;align-items:center;display:inline-flex;position:relative}.dsx-switch-input{opacity:0;cursor:pointer;width:100%;height:100%;margin:0;position:absolute}.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);border-radius:11px;align-items:center;width:34px;height:20px;padding:0;transition:background .16s;display:inline-flex}.dsx-switch-thumb{width:16px;height:16px;box-shadow:var(--dsw-shadow-lv1);background:#fff;border-radius:50%;margin-left:2px;transition:transform .16s}.dsx-switch-input:checked+.dsx-switch-track{background:var(--dsw-alias-state-success-primary)}.dsx-switch-input:checked+.dsx-switch-track .dsx-switch-thumb{transform:translate(14px)}.dsx-switch-input:focus-visible+.dsx-switch-track{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dsx-switch-input:disabled+.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);opacity:.5;cursor:not-allowed}.dsx-switch-input:disabled+.dsx-switch-track .dsx-switch-thumb{box-shadow:none}";
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
		/** All widget ids. */
		const ALL_IDS = WIDGETS.map((w) => w.id);
		/** The default installed set (built-in widgets). */
		const DEFAULT_INSTALLED = WIDGETS.filter((w) => w.builtin).map((w) => w.id);
		/** Badge text for a widget. */
		function badgeOf(w) {
			return w.badgeLabel ?? (w.builtin ? "系统" : "外部");
		}
		/** The group key for a widget (its own id when it is not grouped). */
		function groupOf(w) {
			return w.group ?? w.id;
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
		const FAKE_USAGE = { usage: {
			rolling: {
				status: "ok",
				percent: 0,
				resetsAt: "2026-08-15T07:25:56Z"
			},
			weekly: {
				status: "ok",
				percent: 7,
				resetsAt: "2026-08-17T00:00:00Z"
			},
			monthly: {
				status: "ok",
				percent: 3,
				resetsAt: "2026-09-14T11:35:13Z"
			}
		} };
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
		function CardBody({ out, side }) {
			const scale = side / BASE_SIDE$1;
			const titlePx = Math.round(13 * scale);
			const valuePx = Math.round(20 * scale);
			const radius = Math.round(16 * scale);
			const innerPad = Math.round(12 * scale);
			const head = [react.createElement("div", {
				key: "t",
				className: "dsx-stats-card-title",
				style: { fontSize: `${titlePx}px` }
			}, out.title)];
			const foot = [];
			if (out.value != null) foot.push(react.createElement("div", {
				key: "v",
				className: "dsx-stats-card-value",
				style: { fontSize: `${valuePx}px` }
			}, out.value));
			if (out.sub) foot.push(react.createElement("div", {
				key: "s",
				className: "dsx-stats-card-sub",
				style: { fontSize: `${Math.round(10 * scale)}px` }
			}, out.sub));
			return react.createElement("div", {
				className: "dsx-stats-card",
				style: {
					width: `${side}px`,
					minHeight: `${side}px`,
					borderRadius: `${radius}px`,
					padding: `${innerPad}px`
				}
			}, head, react.createElement("div", {
				key: "foot",
				style: {
					marginTop: "auto",
					display: "flex",
					flexDirection: "column",
					gap: 6
				}
			}, foot));
		}
		function OrderList({ items, onMove, onRestore, onRemove }) {
			const dragIdx = react.useRef(null);
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 2
			} }, items.map((id, i) => {
				const w = WIDGETS.find((x) => x.id === id);
				if (!w) return null;
				return react.createElement("div", {
					key: id,
					className: "dsx-order-row",
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
					}
				}, react.createElement("span", { className: "dsx-drag-handle" }, react.createElement(GripIcon)), react.createElement("span", { style: {
					fontSize: 13,
					color: "var(--dsw-alias-label-primary)",
					flex: 1,
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap"
				} }, w.name), react.createElement("span", { className: "dsx-badge" }, badgeOf(w)), onRemove ? react.createElement("button", {
					type: "button",
					className: "dsx-trash",
					"aria-label": "卸载",
					onClick: () => onRemove(id)
				}, react.createElement(TrashIcon)) : null, onRestore ? react.createElement("button", {
					type: "button",
					className: "dsx-restore",
					onClick: () => onRestore(id)
				}, "恢复") : null);
			}));
		}
		function ConfigTab({ controller }) {
			const { prefs, setPrefs } = controller;
			const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1);
			const removed = prefs.order.filter((id) => prefs.installed.indexOf(id) === -1);
			const restore = (id) => setPrefs({
				installed: prefs.installed.concat(id),
				order: prefs.order.filter((x) => x !== id).concat(id)
			});
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)",
				marginBottom: 4
			} }, "已安装（拖动行首手柄调整顺序）"), react.createElement(OrderList, {
				items: installed,
				onMove: (next) => setPrefs({ order: next.concat(removed) }),
				onRemove: (id) => setPrefs({ installed: prefs.installed.filter((x) => x !== id) })
			}), removed.length > 0 ? react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)",
				margin: "10px 0 4px"
			} }, "已卸载（点击恢复，或拖回上方）") : null, removed.length > 0 ? react.createElement(OrderList, {
				items: removed,
				onMove: () => {},
				onRestore: restore
			}) : null);
		}
		function MarketTab({ controller, usageData }) {
			const { prefs, setPrefs } = controller;
			const [q, setQ] = react.useState("");
			const [previewGroup, setPreviewGroup] = react.useState(null);
			const [previewIdx, setPreviewIdx] = react.useState(0);
			const downloadable = WIDGETS.filter((w) => !w.builtin);
			const seen = /* @__PURE__ */ new Set();
			const list = downloadable.filter((w) => {
				const g = groupOf(w);
				if (seen.has(g)) return false;
				seen.add(g);
				return true;
			}).filter((w) => `${w.name} ${w.desc} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1);
			if (previewGroup !== null) {
				const gw = WIDGETS.filter((w) => groupOf(w) === previewGroup);
				const w = gw[previewIdx] ?? gw[0];
				const ids = gw.map((x) => x.id);
				const installed = ids.every((id) => prefs.installed.indexOf(id) !== -1);
				const fakeStats = {
					turns: 7,
					steps: 51,
					llmMs: 0,
					toolMs: 0,
					ttftMs: 0,
					ttftSteps: 0,
					decodeMs: 0,
					decodeTokens: 0,
					usage: null,
					usageData: FAKE_USAGE
				};
				const out = w ? w.render(fakeStats) : null;
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
				} }, w ? w.name : ""), react.createElement("button", {
					type: "button",
					className: installed ? "dsx-btn" : "dsx-btn dsx-btn-primary",
					onClick: () => setPrefs({ installed: installed ? prefs.installed.filter((x) => ids.indexOf(x) === -1) : prefs.installed.concat(ids) })
				}, installed ? "已安装" : "下载")), react.createElement("div", { style: {
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
					side: 200
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
				const installed = WIDGETS.filter((x) => groupOf(x) === groupOf(w)).map((x) => x.id).every((id) => prefs.installed.indexOf(id) !== -1);
				return react.createElement("button", {
					key: w.id,
					type: "button",
					className: "dsx-mcard",
					"aria-pressed": installed,
					onClick: () => {
						setPreviewGroup(groupOf(w));
						setPreviewIdx(0);
					}
				}, react.createElement("span", { className: "dsx-mhead" }, react.createElement("span", { className: "dsx-mname" }, w.name), react.createElement("span", { className: "dsx-badge" }, badgeOf(w))), react.createElement("span", { className: "dsx-mdesc" }, w.desc), react.createElement("code", { className: "dsx-mid" }, w.id), react.createElement("span", { className: "dsx-macts" }, react.createElement("span", { className: "dsx-btn" }, "查看详情"), react.createElement("span", { className: installed ? "dsx-btn dsx-btn-primary" : "dsx-btn" }, installed ? "已安装" : "下载")));
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
			const switchRow = react.createElement("label", {
				className: "dsx-switch-row",
				title: "实时跟随鼠标连续放大暂未开放"
			}, react.createElement("input", {
				type: "checkbox",
				className: "dsx-switch-input",
				checked: false,
				disabled: true,
				onChange: () => {}
			}), react.createElement("span", {
				className: "dsx-switch-track",
				"aria-hidden": true
			}, react.createElement("span", { className: "dsx-switch-thumb" })));
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement(Row, {
				title: "实时放大（暂未开放）",
				desc: "跟随鼠标持续连续放大尚未实现，敬请期待",
				children: switchRow
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
		const DEFAULTS = {
			panelPadding: 24,
			cardSide: 150,
			installed: DEFAULT_INSTALLED.slice(),
			order: ALL_IDS.slice(),
			apiKey: "",
			railOpen: false,
			realTime: false,
			magnify: 1.2
		};
		/** Required services: the slot registry (React is a platform module). */
		const inject = ["slots"];
		function loadState() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_IDS.slice()
				};
				const p = JSON.parse(raw);
				const s = {
					...DEFAULTS,
					...p
				};
				if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding;
				if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide;
				if (!Array.isArray(s.installed)) s.installed = DEFAULT_INSTALLED.slice();
				s.installed = s.installed.filter((id) => ALL_IDS.indexOf(id) !== -1);
				for (const id of DEFAULT_INSTALLED) if (s.installed.indexOf(id) === -1) s.installed.push(id);
				if (!Array.isArray(s.order)) s.order = ALL_IDS.slice();
				s.order = s.order.filter((id) => ALL_IDS.indexOf(id) !== -1);
				for (const id of ALL_IDS) if (s.order.indexOf(id) === -1) s.order.push(id);
				if (typeof s.apiKey !== "string") s.apiKey = "";
				if (typeof s.railOpen !== "boolean") s.railOpen = DEFAULTS.railOpen;
				if (typeof s.realTime !== "boolean") s.realTime = DEFAULTS.realTime;
				if (!Number.isFinite(s.magnify) || s.magnify < 1 || s.magnify > 2) s.magnify = DEFAULTS.magnify;
				return s;
			} catch {
				return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_IDS.slice()
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
						}
					} });
				}, [
					settled,
					projected,
					usage,
					timeline,
					runningCalls,
					now
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
				const [focusIdx, setFocusIdx] = react.useState(null);
				const [focusY, setFocusY] = react.useState(null);
				const lastClientYRef = react.useRef(null);
				const contentYRef = react.useRef(null);
				const yRaf = react.useRef(0);
				const moveRailFocusY = (clientY, el) => {
					lastClientYRef.current = clientY;
					const contentY = clientY - el.getBoundingClientRect().top - 2 + el.scrollTop;
					if (yRaf.current) {
						contentYRef.current = contentY;
						return;
					}
					contentYRef.current = contentY;
					yRaf.current = requestAnimationFrame(() => {
						yRaf.current = 0;
						setFocusY(contentYRef.current);
					});
				};
				const railScrollSync = (el) => {
					if (lastClientYRef.current === null || !prefs.realTime) return;
					moveRailFocusY(lastClientYRef.current, el);
				};
				react.useEffect(() => {
					return () => {
						if (yRaf.current) cancelAnimationFrame(yRaf.current);
					};
				}, []);
				react.useEffect(() => {
					if (!snap.open || !snap.hasSession) {
						setAddOpen(false);
						setFocusIdx(null);
						setFocusY(null);
					}
				}, [snap.open, snap.hasSession]);
				if (!snap.open || !snap.hasSession) return null;
				const side = prefs.cardSide;
				const pad = prefs.panelPadding;
				const overshoot = Math.max(0, Math.ceil(side * (prefs.magnify - 1) - pad)) + 4;
				const railW = side + pad * 2 + overshoot;
				document.documentElement.style.setProperty("--dsx-rail-w", `${railW}px`);
				document.documentElement.style.setProperty("--dsx-rail-pad", `${pad}px`);
				document.documentElement.style.setProperty("--dsx-rail-overshoot", `${overshoot}px`);
				const base = snap.stats ?? {
					turns: 0,
					steps: 0,
					llmMs: 0,
					toolMs: 0,
					ttftMs: 0,
					ttftSteps: 0,
					decodeMs: 0,
					decodeTokens: 0,
					usage: null
				};
				const items = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1).map((id) => {
					const w = WIDGETS.find((x) => x.id === id);
					return w ? {
						w,
						out: w.render({
							...base,
							usageData: snap.usageData
						})
					} : null;
				}).filter((it) => it !== null && it.out != null);
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
					const dd = Math.round(d);
					if (dd <= 0) return peakScale;
					if (dd === 1) return 1 + extra * .55;
					if (dd === 2) return 1 + extra * .25;
					return 1;
				};
				const active = prefs.realTime;
				const layoutCards = [];
				{
					const n = items.length;
					const hasFocus = active ? focusY !== null : focusIdx !== null;
					let anchor = -1;
					if (hasFocus) {
						if (active) {
							const mY = focusY;
							let best = 0, bestD = Number.POSITIVE_INFINITY;
							for (let i = 0; i < n; i++) {
								const dd = Math.abs(mY - restCenter(i));
								if (dd < bestD) {
									bestD = dd;
									best = i;
								}
							}
							anchor = best;
						} else anchor = Math.max(0, Math.min(focusIdx, n - 1));
					}
					const scaleArr = new Array(n).fill(1);
					if (anchor >= 0) for (let i = 0; i < n; i++) scaleArr[i] = stepScale(Math.abs(i - anchor));
					if (n > 0) {
						const hgt = scaleArr.map((s) => side * s);
						let acc = 2;
						for (let i = 0; i < n; i++) {
							layoutCards.push({
								s: scaleArr[i],
								top: acc,
								w: hgt[i]
							});
							acc += hgt[i] + pad;
						}
					}
				}
				const stackHeight = items.length > 0 ? 2 + items.length * (side + pad) + (peakScale - 1) * side : 0;
				const railChildren = [react.createElement("div", {
					key: "__deck",
					style: {
						position: "relative",
						height: `${stackHeight}px`
					}
				}, layoutCards.map((c, idx) => {
					const it = items[idx];
					const transition = active ? "top 0.04s linear, width 0.04s linear, height 0.04s linear" : "top 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out)";
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: {
							position: "absolute",
							top: `${c.top.toFixed(2)}px`,
							right: 0,
							width: `${c.w.toFixed(2)}px`,
							height: `${c.w.toFixed(2)}px`,
							transition,
							zIndex: Math.round((c.s - 1) * 100)
						},
						onMouseEnter: () => setFocusIdx(idx)
					}, react.createElement(CardBody, {
						out: it.out,
						side: c.w
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
				})), react.createElement("button", {
					key: "__add",
					type: "button",
					className: "dsx-stats-add",
					"aria-label": "添加组件",
					onClick: () => setAddOpen((v) => !v),
					style: {
						marginTop: `${pad}px`,
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
				}))), react.createElement("span", { className: "dsx-stats-add-label" }, "添加"))];
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
						padding: `2px ${pad}px ${pad}px ${pad + overshoot}px`,
						background: "transparent",
						pointerEvents: "auto"
					},
					onMouseLeave: () => {
						setFocusIdx(null);
						setFocusY(null);
					},
					onMouseMove: prefs.realTime ? (e) => moveRailFocusY(e.clientY, e.currentTarget) : void 0,
					onScroll: prefs.realTime ? (e) => railScrollSync(e.currentTarget) : void 0
				}, railChildren);
				const addPanel = react.createElement("div", {
					className: "dsx-stats-addpanel" + (addOpen ? " open" : ""),
					style: { top: "var(--dsx-rail-top,0px)" }
				}, react.createElement("div", { className: "dsx-stats-addpanel-header" }, react.createElement("div", { className: "dsx-stats-addpanel-title" }, "添加组件"), react.createElement("button", {
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
				return react.createElement(react.Fragment, null, rail, addPanel);
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