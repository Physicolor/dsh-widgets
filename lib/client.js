window.__ModuleLoader__.load({
	id: "dsh-widgets",
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
		let react_dom = require("react-dom");
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\widgets.module.css.mjs
		const css = ".dsx-stats-rail,.dsx-magnify-layer{font-family:var(--dsw-font-family,-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif);font-size:16px;line-height:normal}.dsx-stats-capsule{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:14px;align-items:center;gap:6px;padding:0 12px;font-size:13px;line-height:1;display:inline-flex}.dsx-stats-capsule[aria-pressed=true]{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-stats-capsule[data-space=tight]{opacity:.45;cursor:not-allowed}.dsx-stats-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;justify-content:flex-start;display:flex;position:relative;overflow:hidden}.dsx-stats-card.dsx-cyclable{cursor:pointer;transition:transform .24s cubic-bezier(.34,1.56,.64,1)}.dsx-stats-card.dsx-cyclable.dsx-cycle-pressed{transition:transform 80ms ease-out;transform:scale(.93)}.dsx-stats-card-title{color:var(--dsw-alias-state-business-primary);line-height:1.2}.dsx-stats-card-title,.dsx-stats-card-value,.dsx-stats-card-sub,.dsx-stats-card-legend,.dsx-stats-card-headafter,.dsx-stats-card-meter{white-space:nowrap}.dsx-stats-card-value,.dsx-stats-card-sub,.dsx-stats-card-legend{text-overflow:ellipsis;overflow:hidden}.dsx-sk{background:linear-gradient(90deg, var(--dsw-alias-interactive-bg-hover) 0%, color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 45%, var(--dsw-alias-bg-layer-1)) 50%, var(--dsw-alias-interactive-bg-hover) 100%);animation:dsx-sk-sweep 1.5s var(--ds-ease-in-out) infinite;background-size:200% 100%}@keyframes dsx-sk-sweep{0%{background-position:120% 0}to{background-position:-20% 0}}@media (prefers-reduced-motion:reduce){.dsx-sk{animation:none}}.dsx-sk-card{pointer-events:none}.dsx-stats-card-value{color:var(--dsw-alias-label-primary);word-break:break-word;font-weight:600;line-height:1.25}.dsx-stats-card-sub{color:var(--dsw-alias-label-caption);font-size:10px}.dsx-stats-resize{cursor:nesw-resize;z-index:2;opacity:0;background:linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%, var(--dsw-alias-label-tertiary) 62%, transparent 62%);width:18px;height:18px;position:absolute;bottom:0;left:0}.dsx-stats-card:hover .dsx-stats-resize{opacity:1}.dsx-stats-card-corner{background:var(--dsw-alias-state-business-primary);color:#fff;cursor:pointer;width:30px;height:30px;box-shadow:var(--dsw-shadow-lv1);border:none;border-radius:15px;justify-content:center;align-items:center;font-size:12px;transition:background .16s,width .16s,color .16s;display:inline-flex;position:absolute}.dsx-stats-card-corner:hover{background:var(--dsw-alias-state-business-primary);filter:brightness(1.08)}.dsx-stats-card-corner.armed{border-radius:15px;width:56px;font-weight:600}[data-conversation-scroll]{transition:padding-right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}html.dsx-live-width [data-conversation-scroll]{transition:padding-right .26s cubic-bezier(.34,1.36,.52,1)}[data-yielded] .dsx-stats-rail,[data-yielded] .dsx-stats-addpanel{pointer-events:none!important}:root{--dsx-rail-right:anchor(--dsx-center right, var(--dsx-rightbar-w,var(--dsh-sidebar-width,0px)))}@supports (anchor-name:--dsx-center){[data-phase=active],body:not(:has([data-phase=active])) [class$=_centerCol]{anchor-name:--dsx-center}.dsx-stats-addpanel{right:calc(var(--dsx-rail-right) + var(--dsx-rail-pad,14px))}}.dsx-stats-rail{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out);-ms-overflow-style:none}@media (prefers-reduced-motion:reduce){.dsx-stats-rail{transition:none}}.dsx-stats-rail::-webkit-scrollbar{width:0;height:0;display:none}@supports not selector(::-webkit-scrollbar){.dsx-stats-rail{scrollbar-width:none}}body[data-dsh-sidebar-dragging] .dsx-stats-rail{transition:none}html.dsx-syncing .dsx-stats-rail{transition:none!important}body.dsx-stats-active [data-conversation-scroll]{padding-right:var(--dsx-rail-w,0px)}body.dsx-stats-active [data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{right:calc(var(--dsh-scrollbar-width) + var(--dsx-rail-w,0px))}[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}body.dsx-stats-active [data-slot=\"conversation.composer.dock\"]{visibility:hidden!important}[data-conversation-scroll] :has(>nav[aria-label]){z-index:9}body.dsx-stats-no-session .dsx-stats-drawer{visibility:hidden!important;pointer-events:none!important}.dsx-stats-drawer[data-no-room] .dsx-stats-rail{pointer-events:none!important}.dsx-stats-card-slot{transition:top .26s cubic-bezier(.34,1.36,.52,1),right .26s cubic-bezier(.34,1.36,.52,1),width .26s cubic-bezier(.34,1.36,.52,1),height .26s cubic-bezier(.34,1.36,.52,1)}.dsx-stats-card-slot .dsx-stats-card{transition:border-color .18s,box-shadow .18s}.dsx-wave-deck .dsx-stats-card-slot,.dsx-wave-deck .dsx-stats-add{visibility:visible}.dsx-wave-deck.dsx-wave-on .dsx-stats-card-slot,.dsx-wave-deck.dsx-wave-on .dsx-stats-add{visibility:hidden}@keyframes dsx-card-wave{0%{transform:translateY(-1.6%)scale(.99)}55%{transform:translateY(.5%)scale(1.003)}to{transform:translateY(0)scale(1)}}.dsx-wave-run .dsx-stats-card-slot{animation:dsx-card-wave .34s var(--ds-ease-in-out) both;animation-delay:var(--dsx-wave-delay,0s)}.dsx-wave-run .dsx-stats-card-slot:first-child{--dsx-wave-delay:0s}.dsx-wave-run .dsx-stats-card-slot:nth-child(2){--dsx-wave-delay:30ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(3){--dsx-wave-delay:60ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(4){--dsx-wave-delay:90ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(5){--dsx-wave-delay:.12s}.dsx-wave-run .dsx-stats-card-slot:nth-child(6){--dsx-wave-delay:.15s}.dsx-wave-run .dsx-stats-card-slot:nth-child(7){--dsx-wave-delay:.18s}.dsx-wave-run .dsx-stats-card-slot:nth-child(8){--dsx-wave-delay:.21s}.dsx-wave-run .dsx-stats-card-slot:nth-child(9){--dsx-wave-delay:.24s}.dsx-wave-run .dsx-stats-card-slot:nth-child(10){--dsx-wave-delay:.27s}.dsx-wave-run .dsx-stats-card-slot:nth-child(11){--dsx-wave-delay:.3s}.dsx-wave-run .dsx-stats-card-slot:nth-child(n+12){--dsx-wave-delay:.33s}@media (prefers-reduced-motion:reduce){.dsx-wave-run .dsx-stats-card-slot{animation:none}}.dsx-slot-focused .dsx-stats-card,.dsx-stats-card-slot:hover .dsx-stats-card{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary), 0 10px 28px color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)}.dsx-stats-resize{transition:opacity .12s}.dsx-stats-add{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:border-color .18s ease, color .18s ease, background .18s ease, transform .18s var(--ds-ease-in-out);background:0 0;border-radius:16px;flex-direction:column;flex:none;justify-content:center;align-items:center;gap:6px;display:flex}.dsx-stats-add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);transform:scale(1.04)}.dsx-stats-add-icon{color:var(--dsw-alias-state-business-primary);justify-content:center;align-items:center;line-height:1;display:flex}.dsx-stats-add-label{font-size:13px;font-weight:500;line-height:1}.dsx-stats-addpanel{pointer-events:auto;right:calc(var(--dsx-rightbar-w,var(--dsh-sidebar-width,0px)) + var(--dsx-rail-pad,14px));width:auto;bottom:var(--dsx-input-bottom,var(--dsx-rail-pad,14px));z-index:30;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:transform .28s var(--ds-ease-in-out), visibility 0s linear .28s;visibility:hidden;border-radius:16px;flex-direction:column;display:flex;position:fixed;transform:translate(calc(100% + 40px))}.dsx-stats-addpanel.open{visibility:visible;transition-delay:0s;transform:translate(0)}.dsx-stats-addpanel-resize{cursor:ew-resize;z-index:3;width:10px;position:absolute;top:0;bottom:0;left:-5px}.dsx-stats-addpanel-header{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:8px;padding:12px 12px 10px;display:flex}.dsx-stats-addpanel-title{color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;line-height:22px}.dsx-stats-addpanel-close{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background .12s,color .12s;display:inline-flex}.dsx-stats-addpanel-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-stats-addpanel-body{flex:1;min-height:0;padding:12px;overflow-y:auto}.dsx-stats-addpanel-body>div{height:100%}.dsx-order-row{border-radius:8px;align-items:center;gap:8px;padding:2px 0;display:flex}.dsx-order-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-order-row.selected{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);outline:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);cursor:pointer}.dsx-drag-handle{cursor:grab;color:var(--dsw-alias-label-tertiary);align-items:center;padding:6px 2px;display:flex}.dsx-drag-handle:active{cursor:grabbing}.dsx-restore{border:1px solid var(--dsw-alias-border-l2);height:24px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:12px;padding:0 10px;font-size:12px}.dsx-trash{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;transition:color .12s,background .12s;display:flex}.dsx-trash:hover{color:var(--dsw-alias-state-danger,#e5484d);background:var(--dsw-alias-interactive-bg-hover)}.dsx-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;border-radius:9px;flex:none;padding:1px 8px;font-size:11px}.dsx-tabbar{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;display:flex}.dsx-tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 2px;font-size:13px;font-weight:500;line-height:16px}.dsx-tab[data-active=true]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary)}.dsx-search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:17px;outline:none;margin-bottom:10px;padding:0 12px;font-size:13px}.dsx-select{-webkit-appearance:none;appearance:none;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-1);min-width:150px;height:34px;color:var(--dsw-alias-label-primary);cursor:pointer;box-sizing:border-box;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%236F6F7A'/></svg>\");background-position:right 12px center;background-repeat:no-repeat;border-radius:17px;outline:none;padding:0 34px 0 12px;font-size:13px}body[data-ds-dark-theme] .dsx-select{background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%23ECECF1'/></svg>\")}.dsx-select:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}.dsx-select option{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dsx-mlist{flex-direction:column;gap:10px;display:flex}.dsx-mcard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;box-sizing:border-box;border-radius:14px;flex-direction:column;width:100%;padding:14px;display:flex}.dsx-mcard:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-mcard[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary)}.dsx-mhead{align-items:center;gap:8px;margin-bottom:6px;display:flex}.dsx-mname{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.dsx-mdesc{color:var(--dsw-alias-label-tertiary);margin-bottom:8px;font-size:12px;line-height:18px}.dsx-mid{color:var(--dsw-alias-label-caption);margin-bottom:4px;font-family:monospace;font-size:11px}.dsx-macts{justify-content:flex-end;gap:8px;margin-top:4px;display:flex}.dsx-btn{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:14px;align-items:center;padding:0 12px;font-size:12px;display:inline-flex}.dsx-btn-primary{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-navbtn{width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;transition:background .12s;display:inline-flex}.dsx-navbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-dot{background:var(--dsw-alias-border-l2);cursor:pointer;border:none;border-radius:50%;width:8px;height:8px;padding:0}.dsx-dot-active{background:var(--dsw-alias-brand-primary)}.dsx-switch-row{cursor:pointer;flex:none;align-items:center;display:inline-flex;position:relative}.dsx-switch-input{opacity:0;cursor:pointer;width:100%;height:100%;margin:0;position:absolute}.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);border-radius:11px;align-items:center;width:34px;height:20px;padding:0;transition:background .16s;display:inline-flex}.dsx-switch-thumb{width:16px;height:16px;box-shadow:var(--dsw-shadow-lv1);background:#fff;border-radius:50%;margin-left:2px;transition:transform .16s}.dsx-switch-input:checked+.dsx-switch-track{background:var(--dsw-alias-state-success-primary)}.dsx-switch-input:checked+.dsx-switch-track .dsx-switch-thumb{transform:translate(14px)}.dsx-switch-input:focus-visible+.dsx-switch-track{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dsx-switch-input:disabled+.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);opacity:.5;cursor:not-allowed}.dsx-switch-input:disabled+.dsx-switch-track .dsx-switch-thumb{box-shadow:none}.dsx-size-warn{background:var(--dsw-alias-state-warn-primary,#f2b04a);color:#4a3800;white-space:nowrap;border-radius:999px;flex:none;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;line-height:1;display:inline-flex}.dsx-limit-tip{z-index:30;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-tertiary));background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 92%, transparent);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv1);pointer-events:none;border-radius:999px;padding:4px 12px;font-size:12px;line-height:20px;position:absolute;top:64px;left:50%;transform:translate(-50%)}body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div,body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div *{color:#0000!important}.dsx-stats-card-value.dsx-value-pulse{color:var(--dsw-alias-state-error-primary);animation:1.6s ease-in-out infinite alternate dsx-value-breathe}@keyframes dsx-value-breathe{0%{opacity:1}to{opacity:.35}}@media (prefers-reduced-motion:reduce){.dsx-stats-card-value.dsx-value-pulse{animation:none}}";
		const tagId = "dsh-widgets/src/client/widgets.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/i18n.ts
		const NS = "dsh-widgets";
		const ZH = {
			"ui.section.label": "组件",
			"ui.capsule": "组件",
			"ui.addPanel.title": "添加组件",
			"ui.addPanel.closeAria": "关闭",
			"ui.addPanel.resizeAria": "调整宽度",
			"ui.rail.resizeAria": "调整大小",
			"ui.rail.addAria": "添加组件",
			"ui.rail.addLabel": "添加",
			"ui.renderError": "渲染异常，请刷新查看日志",
			"page.title": "组件",
			"page.desc": "管理右侧栏中的小组件。",
			"tab.config": "组件配置",
			"tab.market": "组件市场",
			"tab.settings": "组件设置",
			"config.addedCount": "已添加 {added}/{max}（点击组件可预览与配置）",
			"config.preview": "{name} · 预览",
			"config.cardSize": "卡片大小",
			"config.simTip": "点击卡片切换：{label}",
			"config.simTitle": "点击切换预览状态",
			"config.custom": "自定义",
			"order.removeAria": "移除",
			"order.removeTitle": "从组件栏移除",
			"market.search": "搜索组件",
			"market.back": "← 返回",
			"market.sizeBlocked": "1列不可用",
			"market.added": "已添加",
			"market.add": "添加",
			"market.details": "查看详情",
			"market.limit": "已达上限 {max} 个，先在组件配置中移除再添加",
			"market.prevAria": "上一个",
			"market.nextAria": "下一个",
			"market.sizeBlockedTitle": "1 列布局下不显示 2×4 组件",
			"group.system": "系统",
			"group.device": "设备状态",
			"group.opencode-go": "OpenCode Go",
			"group.coding-plan": "Coding Plan 用量",
			"group.pricing": "峰谷定价",
			"group.other": "其它",
			"badge.system": "系统",
			"badge.external": "外部",
			"settings.columns.title": "最多列数",
			"settings.columns.desc": "组件区允许的最大列数；空间不足时自动逐级回退，空间充裕也不会超过此列数",
			"settings.columns.option": "最多 {n} 列",
			"settings.realtime.title": "无极变化（连续跟随）",
			"settings.realtime.desc": "放大峰值逐帧跟随鼠标；关闭则在吸附点之间补间",
			"settings.magnify.title": "放大倍数",
			"settings.magnify.desc": "被悬浮组件的峰值放大倍数",
			"settings.padding.title": "组件间距",
			"settings.padding.desc": "卡片之间的固定间距，同时作为组件区四周留白",
			"settings.cardSide.title": "卡片基准边长",
			"settings.cardSide.desc": "卡片的最小边长；空间富余时按 10px 档位放大，上限为「5 行可见」，字体与圆角随实际边长缩放",
			"settings.panelWidth.title": "添加面板宽度",
			"settings.panelWidth.desc": "“添加组件”面板宽度，也可拖其左边缘调整",
			"settings.maxWidgets.title": "最多组件数",
			"settings.maxWidgets.desc": "组件区最多显示的组件数量",
			"settings.maxWidgets.unit": "个",
			"settings.hideStatsLine.title": "隐藏输入框下方文字条",
			"settings.hideStatsLine.desc": "隐藏输入框下方状态统计条的文字（保留原空间）",
			"align.left": "左",
			"align.center": "居中",
			"align.right": "右",
			"align.top": "上",
			"align.bottom": "下"
		};
		const EN = {
			"ui.section.label": "Widgets",
			"ui.capsule": "Widgets",
			"ui.addPanel.title": "Add Widget",
			"ui.addPanel.closeAria": "Close",
			"ui.addPanel.resizeAria": "Resize width",
			"ui.rail.resizeAria": "Resize",
			"ui.rail.addAria": "Add widget",
			"ui.rail.addLabel": "Add",
			"ui.renderError": "Render error — see console",
			"page.title": "Widgets",
			"page.desc": "Manage the mini-widgets in the right rail.",
			"tab.config": "Config",
			"tab.market": "Market",
			"tab.settings": "Settings",
			"config.addedCount": "Added {added}/{max} (click a component to preview & configure)",
			"config.preview": "{name} · Preview",
			"config.cardSize": "Card Size",
			"config.simTip": "Click the card to switch: {label}",
			"config.simTitle": "Click to toggle preview state",
			"config.custom": "Custom",
			"order.removeAria": "Remove",
			"order.removeTitle": "Remove from rail",
			"market.search": "Search widgets",
			"market.back": "← Back",
			"market.sizeBlocked": "Not in 1 column",
			"market.added": "Added",
			"market.add": "Add",
			"market.details": "Details",
			"market.limit": "Limit reached ({max} widgets). Remove one in Config first",
			"market.prevAria": "Previous",
			"market.nextAria": "Next",
			"market.sizeBlockedTitle": "2×4 is not shown in a 1-column layout",
			"group.system": "System",
			"group.device": "Device",
			"group.opencode-go": "OpenCode Go",
			"group.coding-plan": "Coding Plan Usage",
			"group.pricing": "Peak Pricing",
			"group.other": "Others",
			"badge.system": "System",
			"badge.external": "External",
			"settings.columns.title": "Max Columns",
			"settings.columns.desc": "Largest column count the rail may use; steps down automatically when space runs short, and never exceeds it when space is plentiful",
			"settings.columns.option": "Up to {n}",
			"settings.realtime.title": "Continuous Magnify",
			"settings.realtime.desc": "The magnify peak follows the pointer every frame; off tweens between snapped points",
			"settings.magnify.title": "Magnification",
			"settings.magnify.desc": "Peak scale of the hovered card",
			"settings.padding.title": "Card Gap",
			"settings.padding.desc": "Fixed gap between cards, also used as the rail’s own inset",
			"settings.cardSide.title": "Base Card Size",
			"settings.cardSide.desc": "Minimum card side; cards grow in 10px tiers up to the size where five rows still fit, and scale their type and radii with the real size",
			"settings.panelWidth.title": "Add Panel Width",
			"settings.panelWidth.desc": "Width of the “Add Widget” panel; drag its left edge to adjust",
			"settings.maxWidgets.title": "Max Widgets",
			"settings.maxWidgets.desc": "Most widgets the rail may show",
			"settings.maxWidgets.unit": "",
			"settings.hideStatsLine.title": "Hide Stats Line",
			"settings.hideStatsLine.desc": "Hide the text of the status stats bar under the input box (its space is kept)",
			"align.left": "Left",
			"align.center": "Center",
			"align.right": "Right",
			"align.top": "Top",
			"align.bottom": "Bottom"
		};
		let bound = null;
		let localeSubscribed = false;
		const localeListeners = /* @__PURE__ */ new Set();
		/** Per-widget dictionaries merged over the shell dicts (set at apply()). */
		let extraLocales = {};
		/** Feed the per-widget locale maps into the translation path (called once at
		*  apply() with `WIDGET_LOCALES` from the generated registry). The widget
		*  dictionaries are merged over the shell dictionaries at READ time, so both
		*  the official-service registration and the built-in fallback see them. */
		function setExtraLocales(extra) {
			extraLocales = extra ?? {};
		}
		/** The effective dictionary for a locale: shell + per-widget extras. */
		function dictFor(locale) {
			const base = locale === "zh" ? ZH : EN;
			const extra = locale === "zh" ? extraLocales.zh ?? {} : extraLocales.en ?? {};
			const merged = { ...base };
			for (const [k, v] of Object.entries(extra)) merged[k] = v;
			return merged;
		}
		/** Feed the official locale service (called from apply). Registers the merged
		*  zh/en dictionaries for this namespace, then binds the translate function so
		*  `t()` resolves through the runtime's ACTIVE locale on every call. Returns a
		*  disposer that unregisters everything. */
		function installLocale(api, widgetLocales) {
			if (widgetLocales) setExtraLocales(widgetLocales);
			const prev = bound;
			bound = null;
			const disposers = [];
			let unsub;
			if (api) {
				if (api.register) {
					try {
						disposers.push(api.register(NS, "zh", dictFor("zh")));
					} catch {}
					try {
						disposers.push(api.register(NS, "en", dictFor("en")));
					} catch {}
				}
				if (api.bind) bound = api.bind(NS);
				if (api.subscribe && !localeSubscribed) {
					localeSubscribed = true;
					unsub = api.subscribe(() => {
						for (const fn of [...localeListeners]) fn();
					});
				}
			}
			return () => {
				bound = prev;
				for (const d of disposers) d();
				if (unsub) {
					unsub();
					localeSubscribed = false;
				}
			};
		}
		/** Subscribe to locale switches (per-fiber cleanup via the returned disposer). */
		function onLocaleChange(fn) {
			localeListeners.add(fn);
			return () => {
				localeListeners.delete(fn);
			};
		}
		/** Fallback locale detection (official service absent). */
		function detectLocale() {
			try {
				const stored = localStorage.getItem("dsh-language");
				if (stored !== null && stored !== "") return stored.startsWith("zh") ? "zh" : "en";
			} catch {}
			try {
				const lang = document.documentElement.lang;
				if (lang) return lang.startsWith("zh") ? "zh" : "en";
			} catch {}
			try {
				return navigator.language?.startsWith("zh") ? "zh" : "en";
			} catch {
				return "zh";
			}
		}
		function interpolate(s, params) {
			if (!params) return s;
			return s.replace(/\{(\w+)\}/g, (m, k) => params[k] !== void 0 ? String(params[k]) : m);
		}
		/** Translate a dictionary key; prefers the official locale translation. */
		function t(key, params) {
			if (bound) return bound(key, params);
			return interpolate(dictFor(detectLocale())[key] ?? EN[key] ?? key, params);
		}
		//#endregion
		//#region src/client/lib/contract.ts
		/**
		* dsh-widgets — Widget contract (shared, stable core).
		*
		* This module defines the ONE contract every widget unit must satisfy:
		* a `Widget` descriptor (default-exported by `src/widgets/<id>/index.ts`)
		* plus the pure resolver helpers the shell and the registry consumers use.
		*
		* The descriptor is deliberately TYPE-ONLY for everything a widget renders;
		* the machine-readable part (id / group / builtin / sizes / defaultInstalled
		* / per-widget locale) lives in each unit's `manifest.json`, which the
		* build-time discovery generator (`scripts/gen-registry.mjs`) reads to emit
		* `src/client/generated.registry.ts`. Neither side is a widget's full
		* definition alone — together they are the unit's contract.
		*
		* Everything in this file is part of the STABLE shared layer:
		*   - Core / Runtime (contract, resolvers)
		*   - Shared Types   (WidgetStats, WidgetRenderOut, WidgetChart, …)
		* It must not import widgets (units import it, never the other way).
		*/
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
		/** Identity helper with a doc anchor: every widget unit default-exports
		*  `defineWidget({ ... })` so the contract stays self-describing. */
		function defineWidget(w) {
			return w;
		}
		/** Resolve a possibly-thunked display label at read time. */
		function resolveLabel(s) {
			return typeof s === "function" ? s() : s ?? "";
		}
		function widgetName(w) {
			return resolveLabel(w.name);
		}
		function widgetDesc(w) {
			return resolveLabel(w.desc);
		}
		function widgetBadgeLabel(w) {
			return typeof w.badgeLabel === "function" ? w.badgeLabel() : w.badgeLabel;
		}
		function widgetSimToggle(w) {
			return typeof w.simToggle === "function" ? w.simToggle() : w.simToggle;
		}
		/** Resolve a config field's label (thunk-aware). */
		function fieldLabel(f) {
			return resolveLabel(f.label);
		}
		/** Resolve a mode option's [value, label] pair label. */
		function optionLabel(o) {
			return resolveLabel(o[1]);
		}
		/** Badge text for a widget. */
		function badgeOf(w) {
			return widgetBadgeLabel(w) ?? (w.builtin ? t("badge.system") : t("badge.external"));
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
		//#region src/widgets/counts/index.ts
		/** Turns · Steps — session turn & step counts. Mirrors the official composer
		*  stats bar's first cell. */
		var counts_default = defineWidget({
			id: "counts",
			name: () => t("widget.counts.name"),
			desc: () => t("widget.counts.desc"),
			builtin: true,
			group: "system",
			render: (s) => ({
				title: t("widget.counts.name"),
				value: t("card.counts.value", {
					turns: s.turns,
					steps: s.steps
				})
			})
		});
		//#endregion
		//#region src/client/lib/format.ts
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
		*  ratio is normalized to the MAX WITHIN THIS WINDOW (not the whole history),
		*  so the tallest bar of the last-7-days always reaches full height and the
		*  chart stays full — a huge historical outlier must not flatten the window. */
		function lastNDays(raw, n) {
			const keys = Object.keys(raw).sort();
			const byDate = {};
			for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k];
			const now = /* @__PURE__ */ new Date();
			const days = [];
			for (let i = n - 1; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
				const v = byDate[dayKey(d)] ?? 0;
				days.push({
					label: `${d.getMonth() + 1}.${d.getDate()}`,
					value: v,
					ratio: 0,
					tone: v > 0 ? "primary" : "muted"
				});
			}
			const max = Math.max(1, ...days.map((d) => d.value));
			for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0;
			return days;
		}
		/** Week-aligned variant: `n` bars starting from this week's SUNDAY (today may
		*  land anywhere inside the window; future/past spill days render as zeros).
		*  Same window-normalized max as `lastNDays` — the tallest bar in the 7-bar
		*  window always reaches full height. */
		function lastNDaysWeekly(raw, n) {
			const keys = Object.keys(raw).sort();
			const byDate = {};
			for (const k of keys) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) byDate[k] = raw[k];
			const now = /* @__PURE__ */ new Date();
			const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
			const days = [];
			for (let i = 0; i < n; i++) {
				const d = new Date(startOfWeek);
				d.setDate(startOfWeek.getDate() + i);
				const v = byDate[dayKey(d)] ?? 0;
				days.push({
					label: `${d.getMonth() + 1}.${d.getDate()}`,
					value: v,
					ratio: 0,
					tone: v > 0 ? "primary" : "muted"
				});
			}
			const max = Math.max(1, ...days.map((d) => d.value));
			for (const d of days) d.ratio = d.value > 0 ? d.value / max : 0;
			return days;
		}
		/** `8.14` style short date used by bar labels and heatmap edges. */
		function fmtShortDate(iso) {
			const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
			if (!m) return iso || "";
			return `${Number(m[2])}.${Number(m[3])}`;
		}
		//#endregion
		//#region src/widgets/llm/index.ts
		/** LLM time — cumulative model inference time (stays hidden until > 0). */
		var llm_default = defineWidget({
			id: "llm",
			name: () => t("widget.llm.name"),
			desc: () => t("widget.llm.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.llmMs > 0 ? {
				title: t("widget.llm.name"),
				value: fmtDuration(s.llmMs)
			} : null
		});
		//#endregion
		//#region src/widgets/tool/index.ts
		/** Tool calls — cumulative tool call time (stays hidden until > 0). */
		var tool_default = defineWidget({
			id: "tool",
			name: () => t("widget.tool.name"),
			desc: () => t("widget.tool.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.toolMs > 0 ? {
				title: t("widget.tool.name"),
				value: fmtDuration(s.toolMs)
			} : null
		});
		//#endregion
		//#region src/widgets/ttft/index.ts
		/** Average first-token latency (per completed TTFT step). */
		var ttft_default = defineWidget({
			id: "ttft",
			name: () => t("widget.ttft.name"),
			desc: () => t("widget.ttft.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.ttftSteps > 0 ? {
				title: t("widget.ttft.name"),
				value: fmtDuration(s.ttftMs / s.ttftSteps)
			} : null
		});
		//#endregion
		//#region src/widgets/tps/index.ts
		/** Rate — decode throughput in tok/s (stays hidden until a decode ran). */
		var tps_default = defineWidget({
			id: "tps",
			name: () => t("widget.tps.name"),
			desc: () => t("widget.tps.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.decodeMs > 0 ? {
				title: t("widget.tps.name"),
				value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1e3))} tok/s`
			} : null
		});
		//#endregion
		//#region src/widgets/cache/index.ts
		/** Cache hit — input cache-hit ratio (hidden until a cache read is observed). */
		var cache_default = defineWidget({
			id: "cache",
			name: () => t("widget.cache.name"),
			desc: () => t("widget.cache.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? {
				title: t("widget.cache.name"),
				value: `${Math.round(s.usage.cacheReadTokens / s.usage.inputTokens * 100)}%`
			} : null
		});
		//#endregion
		//#region src/widgets/tokens/index.ts
		/** Tokens — input & output token counts (stays hidden until an input is seen). */
		var tokens_default = defineWidget({
			id: "tokens",
			name: () => t("widget.tokens.name"),
			desc: () => t("widget.tokens.desc"),
			builtin: true,
			group: "system",
			render: (s) => s.usage && s.usage.inputTokens > 0 ? {
				title: t("widget.tokens.name"),
				value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}`
			} : null
		});
		//#endregion
		//#region src/widgets/context/index.ts
		/** One-click compaction: shows context usage percent (bottom-left) and a
		*  top-right brand-blue round → armed「确认」capsule (two taps to compact). */
		function contextRender(stats) {
			const p = stats.contextPercent;
			const pct = p == null ? null : Math.round(p * 100);
			const armed = stats.armedAction === "contextCompact";
			return {
				title: t("card.context.title"),
				value: pct == null ? void 0 : `${pct}%`,
				sub: pct == null ? t("card.context.waiting") : void 0,
				corner: {
					id: "contextCompact",
					label: t("card.context.compact"),
					armedLabel: t("card.context.confirm"),
					armed,
					pos: "bottom"
				}
			};
		}
		var context_default = defineWidget({
			id: "context",
			name: () => t("widget.context.name"),
			desc: () => t("widget.context.desc"),
			builtin: true,
			group: "system",
			render: contextRender
		});
		//#endregion
		//#region src/widgets/context-water/index.ts
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
					label: t("card.contextWater.system"),
					tokens: sys,
					tone: "muted"
				},
				{
					label: t("card.contextWater.tools"),
					tokens: tools,
					tone: "success"
				},
				{
					label: t("card.contextWater.messages"),
					tokens: msg,
					tone: "primary"
				}
			];
			if (meta?.size === "2x4") return {
				title: t("card.contextWater.title"),
				value: `${Math.round(pct * 100)}%`,
				headRight: used && capacity ? `${used} / ${capacity}` : void 0,
				chart: total > 0 ? {
					kind: "segments",
					segments,
					totalTokens: total
				} : void 0
			};
			return {
				title: t("card.contextWater.title"),
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
		var context_water_default = defineWidget({
			id: "context-water",
			name: () => t("widget.context-water.name"),
			desc: () => t("widget.context-water.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2", "2x4"],
			render: contextWaterRender
		});
		//#endregion
		//#region src/widgets/task/index.ts
		/** Task card: counts of pending / in_progress / completed. Stays visible even
		*  without a todos projection — shows 暂无任务 so the card never vanishes. */
		function taskRender(stats) {
			const todos = stats.todos;
			const pending = todos ? todos.filter((t) => t.status === "pending").length : 0;
			const doing = todos ? todos.filter((t) => t.status === "in_progress").length : 0;
			const done = todos ? todos.filter((t) => t.status === "completed").length : 0;
			const total = todos ? todos.length : 0;
			return {
				title: t("widget.task.name"),
				value: total > 0 ? t("card.task.done", { n: done }) : t("card.task.none"),
				sub: t("card.task.sub", {
					doing,
					pending
				})
			};
		}
		var task_default = defineWidget({
			id: "task",
			name: () => t("widget.task.name"),
			desc: () => t("widget.task.desc"),
			builtin: true,
			group: "system",
			render: taskRender
		});
		//#endregion
		//#region src/widgets/trajectory/index.ts
		/** «1.2s» / «840ms» — one short duration for a beat tooltip. */
		function fmtMs(ms) {
			if (ms <= 0) return "0ms";
			return ms >= 1e3 ? `${(ms / 1e3).toFixed(1)}s` : `${Math.round(ms)}ms`;
		}
		/** 对话轨迹 — the official 轨迹 (trajectory) rail compressed into one card.
		*
		*  Three lanes, exactly the ones the official timeline draws: 输入 (a user or
		*  steering message), 模型 (an assistant step) and 工具 (a tool call). Each beat
		*  is one segment in its own lane, placed by window position (oldest left,
		*  newest right).
		*
		*  WIDTH is a per-card switch (`泳道宽度`):
		*   - 按时长 (default): every beat's width is proportional to its duration, so
		*     the strip shows the session's actual rhythm — a long tool call owns more
		*     of the lane than a quick model step;
		*   - 等宽: the fixed-slot window, where the slot freezes at TRAJECTORY_WINDOW
		*     beats and the row stops re-scaling as the window rolls (n beats share the
		*     lane while it fills, so a single beat owns its whole lane).
		*
		*  The subtitle is the window's per-lane counts, so the numbers and the lanes
		*  always describe the same 30 beats. */
		function trajectoryRender(stats) {
			const beats = stats.trajectory ?? [];
			let input = 0;
			let model = 0;
			let tool = 0;
			for (const b of beats) if (b.kind === "input") input += 1;
			else if (b.kind === "model") model += 1;
			else tool += 1;
			const lanes = beats.map((b) => ({
				kind: b.kind,
				ms: b.ms,
				label: b.kind === "input" ? t("card.trajectory.input") : `${t(`card.trajectory.${b.kind}`)} ${fmtMs(b.ms)}`
			}));
			return {
				title: t("widget.trajectory.name"),
				legend: t("card.trajectory.legend", {
					input,
					model,
					tool
				}),
				chart: {
					kind: "lanes",
					lanes,
					laneSizing: stats.laneSizing === "equal" ? "equal" : "time"
				}
			};
		}
		var trajectory_default = defineWidget({
			id: "trajectory",
			name: () => t("widget.trajectory.name"),
			desc: () => t("widget.trajectory.desc"),
			builtin: true,
			group: "system",
			render: trajectoryRender,
			configSchema: [{
				key: "laneSizing",
				label: () => t("config.laneSizing"),
				type: "mode",
				default: "time",
				options: [["time", () => t("config.laneSizing.time")], ["equal", () => t("config.laneSizing.equal")]]
			}]
		});
		//#endregion
		//#region src/widgets/quote/index.ts
		/** A quote card only renders content when the user typed a custom text — no
		*  default filler (which used to rotate on every render and re-render). */
		function quoteRender(stats) {
			const text = stats.text;
			const showTitle = stats.showTitle;
			const align = stats.align;
			const valign = stats.valign;
			const wrap = stats.wrap;
			const trimmed = text && text.trim();
			if (!trimmed) return null;
			return {
				title: showTitle === false ? "" : t("card.quote.title"),
				rich: {
					type: "quote",
					text: trimmed,
					align,
					valign,
					wrap
				}
			};
		}
		var quote_default = defineWidget({
			id: "quote",
			name: () => t("widget.quote.name"),
			desc: () => t("widget.quote.desc"),
			builtin: true,
			group: "other",
			render: quoteRender,
			configSchema: [
				{
					key: "text",
					label: () => t("config.quoteText"),
					type: "text"
				},
				{
					key: "showTitle",
					label: () => t("config.showTitle"),
					type: "toggle",
					default: true
				},
				{
					key: "align",
					label: () => t("config.align"),
					type: "align",
					default: "left"
				},
				{
					key: "valign",
					label: () => t("config.valign"),
					type: "valign",
					default: "top"
				},
				{
					key: "wrap",
					label: () => t("config.wrap"),
					type: "toggle",
					default: true
				}
			],
			example: { stats: () => ({ text: t("quote.previewPlaceholder") }) }
		});
		//#endregion
		//#region src/widgets/heatmap/index.ts
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
				title: t("card.heatmap.title"),
				...wide ? { headRight: figures } : { legend: figures },
				chart: {
					kind: "heatmap",
					heatmap: grid
				}
			};
		}
		/** Widget-owned preview builder: the shell asks for the EXAMPLE stats with the
		*  current per-instance config, so the 2×2 preview honors the window-alignment
		*  mode (rolling: today on the right / quarter: aligned to calendar quarter)
		*  exactly like the real collector — the config edit is visible in the preview.
		*  Mirrors the shell preview logic that used to live in components.tsx. */
		function previewStats$1(config) {
			const mode = config.monthMode === "quarter" ? "quarter" : "rolling";
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
			return { heatmapGrid: grid };
		}
		var heatmap_default = defineWidget({
			id: "heatmap",
			name: () => t("widget.heatmap.name"),
			desc: () => t("widget.heatmap.desc"),
			builtin: true,
			group: "coding-plan",
			sizes: ["2x2", "2x4"],
			render: heatmapRender,
			configSchema: [{
				key: "monthMode",
				label: () => t("config.monthMode"),
				type: "mode",
				default: "rolling",
				options: [["rolling", () => t("config.monthMode.rolling")], ["quarter", () => t("config.monthMode.quarter")]]
			}, {
				key: "timeZone",
				label: () => t("config.timeZone"),
				type: "mode",
				default: "Asia/Shanghai",
				options: [
					["Asia/Shanghai", () => t("config.timeZone.beijing")],
					["local", () => t("config.timeZone.local")],
					["UTC", "UTC"]
				]
			}],
			example: { stats: previewStats$1 }
		});
		//#endregion
		//#region src/widgets/heatmap-bars/index.ts
		/** Token usage last-7-days bar chart — vertical bars, oldest→newest left→
		*  right. X-axis labels are short month.day (only the first/last shown, on the
		*  bottom corners); the legend is two plain figures (today / 7-day total, no
		*  "今日/近7天" words). A horizontal x-axis baseline runs under the bars. The
		*  bar area height matches the 2×2 calendar grid's content height. */
		function heatmapBarsRender(stats) {
			const rawLog = stats.heatmapRaw;
			if (!rawLog) return null;
			const bars = stats.monthMode === "weekly" ? lastNDaysWeekly(rawLog, 7) : lastNDays(rawLog, 7);
			if (!bars.length) return null;
			const today = rawLog[dayKey(/* @__PURE__ */ new Date())] ?? 0;
			const weekTotal = bars.reduce((a, b) => a + b.value, 0);
			const legend = today > 0 || weekTotal > 0 ? `${fmtTokens(today)}  ${fmtTokens(weekTotal)}` : void 0;
			return {
				title: t("card.heatmap.title"),
				legend,
				chart: {
					kind: "barsV",
					bars
				}
			};
		}
		var heatmap_bars_default = defineWidget({
			id: "heatmap-bars",
			name: () => t("widget.heatmap-bars.name"),
			desc: () => t("widget.heatmap-bars.desc"),
			builtin: true,
			group: "coding-plan",
			render: heatmapBarsRender,
			configSchema: [{
				key: "monthMode",
				label: () => t("config.monthMode"),
				type: "mode",
				default: "rolling",
				options: [["rolling", () => t("config.monthMode.rolling7")], ["weekly", () => t("config.monthMode.weekly")]]
			}]
		});
		//#endregion
		//#region src/client/lib/cc-view.ts
		/**
		* dsh-widgets - Command Code account usage shared render layer.
		*
		* The eight commandcode widgets (cc-whoami / cc-usage / cc-credits /
		* cc-windows / cc-subscription / cc-window-5h / cc-window-weekly /
		* cc-window-monthly) read the host-aggregated `/api/commandcode-usage`
		* payload (`stats.commandCode`) and render their card shapes here - NOT
		* copied into each unit - so the family stays consistent.
		*
		* Card title convention: the product name is long, so EVERY card titles
		* itself `Command Code` and puts its role word (account / usage / credits /
		* window / plan) on the small grey legend line directly under the title.
		*
		* Window sources (the four official endpoints):
		*   - 5h / weekly: `billing/credits` -> windowLimits.{fiveHour,weekly} with an
		*     explicit `used` and `cap`;
		*   - monthly: the API serves NO monthly window object, so the month figure is
		*     derived from the one monthly quantity the API DOES report — the remaining
		*     balance: used = plan allowance - credits.monthlyCredits, against the
		*     plan's published allowance. The old `used + remaining` denominator was
		*     not the allowance at all (measured 17.26 + 59.01 = 76.27 on a $70 plan),
		*     which is how the card read 22.6% where the official site read ~16%.
		*
		* The payload is fully nullable: the host fetches each endpoint independently,
		* so one failing endpoint degrades that slice to a placeholder instead of
		* blanking the whole rail.
		*
		* All strings come from each unit's manifest dictionary (family-shared keys
		* live in `src/widgets/_shared/locales.json`).
		*/
		/** Read the commandcode payload defensively: absent / malformed -> null. */
		function cc(stats) {
			const c = stats.commandCode;
			return c !== null && typeof c === "object" ? c : null;
		}
		/** Resolve a per-family hint when the payload is missing. The KEY is never
		*  user-entered: the host auto-reads it (env -> $DSH_HOME/.credentials.yaml ->
		*  .env), so the hint below explains the actual failure instead of asking the
		*  user to configure anything. */
		function hint(stats) {
			const err = stats.commandCodeError;
			if (err === "unloaded") return t("cc.unloaded");
			if (err === "unconfigured") return t("cc.unconfigured");
			if (err) return t("cc.unavailable");
			return t("cc.unconfigured");
		}
		/** The shared card title for the whole family (product name; the role word
		*  goes on the legend line so the title never grows). */
		function title() {
			return t("cc.title");
		}
		/** Compact credit amount: 69.99986 -> "70.00", 0.00014 -> "0.0001". Chooses
		*  decimals by magnitude so tiny spend stays visible and big balances don't
		*  drown in digits. */
		function fmtCredit(n) {
			if (typeof n !== "number" || !Number.isFinite(n)) return "-";
			const abs = Math.abs(n);
			if (abs >= 100) return n.toFixed(0);
			if (abs >= 1) return n.toFixed(2);
			if (abs >= .01) return n.toFixed(4);
			return String(n);
		}
		/** `$0.0001` cost formatting (decimals by magnitude, never a bare zero). */
		function fmtCost(n) {
			if (typeof n !== "number" || !Number.isFinite(n)) return "-";
			return `$${fmtCredit(n)}`;
		}
		/** Window percent 0..100 (clamped), or null when the window is unusable. */
		function winPct$1(win) {
			const used = win?.used;
			const cap = win?.cap;
			if (typeof used !== "number" || typeof cap !== "number" || !Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return null;
			return Math.min(100, Math.max(0, used / cap * 100));
		}
		/** Window-capacity tone: near/over the cap -> danger, heavy -> warn. */
		function windowTone(pct, exceeded) {
			if (pct === null) return "muted";
			if (exceeded === true || pct >= 95) return "danger";
			if (pct >= 75) return "warn";
			return "success";
		}
		/** Short reset date (`MM-DD`) from an epoch-ms timestamp. */
		function fmtReset(ms) {
			if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
			const d = new Date(ms);
			return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		/** Short date (`MM-DD`) from an ISO string. */
		function fmtIsoDay(iso) {
			if (typeof iso !== "string" || iso.length < 10) return "";
			const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
			return m ? `${m[2]}-${m[3]}` : "";
		}
		/** The 5h window (explicit used/cap from billing/credits). */
		function fiveHourWindow(c) {
			const w = c?.credits?.windowLimits?.fiveHour;
			const pct = winPct$1(w);
			if (pct === null || typeof w?.used !== "number" || typeof w.cap !== "number") return null;
			return {
				key: "fiveHour",
				label: t("cc.win5h"),
				used: w.used,
				cap: w.cap,
				pct,
				resetAt: w.resetAt,
				exceeded: w.exceeded
			};
		}
		/** The weekly window (explicit used/cap from billing/credits). */
		function weeklyWindow(c) {
			const w = c?.credits?.windowLimits?.weekly;
			const pct = winPct$1(w);
			if (pct === null || typeof w?.used !== "number" || typeof w.cap !== "number") return null;
			return {
				key: "weekly",
				label: t("cc.winWeekly"),
				used: w.used,
				cap: w.cap,
				pct,
				resetAt: w.resetAt,
				exceeded: w.exceeded
			};
		}
		/**
		* Monthly allowance (USD of credits) per plan, from Command Code's published
		* plan table. Only plans whose figures are published appear here; an unknown
		* plan falls back to the API's own used figure instead of inventing a cap.
		*
		* GOAT: $10 buys $70 of credits, and the API's own window caps confirm the
		* split this constant encodes — 5h = $14 (20% of the month) and weekly = $35
		* (50%), both reported by `/alpha/billing/credits`.
		*/
		const PLAN_MONTHLY_ALLOWANCE = { "individual-goat": 70 };
		/**
		* The monthly window.
		*
		* The API exposes neither a monthly window object nor an allowance field, so
		* the figure comes from the one monthly quantity it DOES report: the remaining
		* monthly credits. `used = allowance - remaining`, reset at the subscription's
		* period end.
		*
		* The previous `used / (used + remaining)` form is deliberately gone. That
		* denominator is the sum of two unrelated snapshots rather than the plan
		* allowance (measured 17.26 + 59.01 = 76.27 against a $70 plan), so the card
		* read 22.6% while the account page read ~16%. `usage.totalMonthlyCredits` is
		* the billing period's total spend, not the monthly allowance consumed.
		*
		* Returns null when the balance or the plan is unknown, so the card degrades
		* instead of inventing a number.
		*
		* Exported so widgets that reason ABOUT the month (not just print it) — e.g.
		* the 额度管理 quota card, which extrapolates the month-end percent — read the
		* same official-matching figure instead of re-deriving their own.
		*/
		function monthlyWindow(c) {
			const remaining = c?.credits?.credits?.monthlyCredits;
			const resetIso = c?.subscription?.data?.currentPeriodEnd;
			if (typeof remaining !== "number" || !Number.isFinite(remaining)) return null;
			const plan = c?.subscription?.data?.planId;
			const allowance = typeof plan === "string" ? PLAN_MONTHLY_ALLOWANCE[plan] : void 0;
			if (allowance !== void 0 && allowance > 0) {
				const used = Math.min(allowance, Math.max(0, allowance - remaining));
				return {
					key: "monthly",
					label: t("cc.winMonthly"),
					used,
					cap: allowance,
					pct: used / allowance * 100,
					resetIso
				};
			}
			const used = c?.usage?.totalMonthlyCredits;
			if (typeof used !== "number" || !Number.isFinite(used)) return null;
			const cap = used + remaining;
			if (!(cap > 0)) return null;
			const pct = Math.min(100, Math.max(0, used / cap * 100));
			return {
				key: "monthly",
				label: t("cc.winMonthly"),
				used,
				cap,
				pct,
				resetIso
			};
		}
		/** cc-whoami - account identity from `/alpha/whoami`. */
		function ccWhoamiRender(stats) {
			const c = cc(stats);
			const user = c?.whoami?.user;
			if (!user) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const name = user.name || user.userName || "-";
			const sub = [user.email ? String(user.email) : "", c?.whoami?.org && typeof c.whoami.org === "object" && "name" in c.whoami.org ? String(c.whoami.org.name ?? "") : ""].filter(Boolean).join(" / ");
			return {
				title: title(),
				value: name,
				legend: t("cc.account"),
				sub: sub || void 0
			};
		}
		/** cc-usage - request counts / success / tokens / spend from `/alpha/usage/summary`. */
		function ccUsageRender(stats) {
			const u = cc(stats)?.usage;
			if (!u) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const tokens = typeof u.totalTokens === "number" ? u.totalTokens : void 0;
			const req = typeof u.totalCount === "number" ? u.totalCount : void 0;
			const success = typeof u.successRate === "number" ? u.successRate : void 0;
			const cost = fmtCost(u.totalCost);
			const headAfter = tokens !== void 0 ? {
				big: fmtTokens(tokens),
				small: t("cc.tokens")
			} : void 0;
			const parts = [
				req !== void 0 ? `${req} ${t("cc.requests")}` : "",
				success !== void 0 ? `${success.toFixed(0)}% ${t("cc.successRate")}` : "",
				cost !== "-" ? `${t("cc.spend")} ${cost}` : ""
			].filter(Boolean);
			return {
				title: title(),
				legend: t("cc.roleUsage"),
				headAfter,
				sub: parts.length > 0 ? parts.join(" / ") : void 0
			};
		}
		/** cc-credits - credit balance + 5h / weekly quota bars from `/alpha/billing/credits`. */
		function ccCreditsRender(stats) {
			const c = cc(stats);
			const credits = c?.credits?.credits;
			const windows = c?.credits?.windowLimits;
			if (!credits && !windows) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const monthly = credits?.monthlyCredits;
			const headAfter = monthly !== void 0 ? {
				big: fmtCredit(monthly),
				small: t("cc.credits")
			} : void 0;
			const extras = [credits?.freeCredits !== void 0 && credits.freeCredits > 0 ? `${t("cc.free")} ${fmtCredit(credits.freeCredits)}` : "", credits?.purchasedCredits !== void 0 && credits.purchasedCredits > 0 ? `${t("cc.purchased")} ${fmtCredit(credits.purchasedCredits)}` : ""].filter(Boolean);
			const legend = [t("cc.roleCredits"), ...extras].join(" / ");
			const fh = fiveHourWindow(c);
			const wk = weeklyWindow(c);
			if (!fh && !wk) return {
				title: title(),
				legend,
				headAfter
			};
			const bars = [];
			if (fh) bars.push({
				label: t("cc.win5h"),
				value: Math.round(fh.pct),
				ratio: fh.pct / 100,
				tone: windowTone(fh.pct, fh.exceeded)
			});
			if (wk) bars.push({
				label: t("cc.winWeekly"),
				value: Math.round(wk.pct),
				ratio: wk.pct / 100,
				tone: windowTone(wk.pct, wk.exceeded)
			});
			const resets = [fh ? `${t("cc.win5h")} ${fmtReset(fh.resetAt)}` : "", wk ? `${t("cc.winWeekly")} ${fmtReset(wk.resetAt)}` : ""].filter(Boolean);
			return {
				title: title(),
				legend,
				headAfter,
				chart: {
					kind: "bars",
					bars
				},
				sub: resets.length > 0 ? resets.join(" / ") : void 0
			};
		}
		/** cc-windows - 5h / weekly / monthly quota as three donuts (OpenCode-style
		*  rolling / weekly / monthly rings). */
		function ccWindowsRender(stats) {
			const c = cc(stats);
			if (!c?.credits && !c?.usage) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const wins = [
				fiveHourWindow(c),
				weeklyWindow(c),
				monthlyWindow(c)
			].filter((w) => w !== null);
			if (wins.length === 0) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const rings = wins.map((w) => ({
				label: "",
				name: w.label,
				value: Number(w.pct.toFixed(1)),
				decimals: 1,
				ratio: w.pct / 100,
				tone: w.exceeded === true || w.pct >= 95 ? "danger" : w.pct >= 75 ? "warn" : "success"
			}));
			return {
				title: title(),
				legend: t("cc.roleWindow"),
				chart: {
					kind: "rings",
					rings
				}
			};
		}
		/** cc-subscription - plan + billing period end from `/alpha/billing/subscriptions`. */
		function ccSubscriptionRender(stats) {
			const sub = cc(stats)?.subscription?.data;
			const plan = sub?.planId;
			if (!sub && !plan) return {
				title: title(),
				value: "-",
				legend: hint(stats)
			};
			const status = sub?.status ?? "";
			const endLabel = fmtIsoDay(sub?.currentPeriodEnd);
			const headAfter = plan ? {
				big: String(plan),
				small: status || void 0
			} : void 0;
			const parts = [endLabel ? `${t("cc.periodEnd")} ${endLabel}` : "", sub?.cancelAtPeriodEnd === true ? t("cc.cancelAtEnd") : ""].filter(Boolean);
			return {
				title: title(),
				legend: t("cc.rolePlan"),
				headAfter,
				sub: parts.length > 0 ? parts.join(" / ") : void 0
			};
		}
		/** Single-window percent card (cc-window-5h / cc-window-weekly /
		*  cc-window-monthly) - the OpenCode single-window shape: one big percent, the
		*  role word under the title, and the reset date beneath. */
		function ccWindowValueRender(key) {
			return (stats) => {
				const c = cc(stats);
				if (!c) return {
					title: title(),
					value: "-",
					legend: hint(stats)
				};
				const w = key === "fiveHour" ? fiveHourWindow(c) : key === "weekly" ? weeklyWindow(c) : monthlyWindow(c);
				const roleKey = key === "fiveHour" ? "cc.win5h" : key === "weekly" ? "cc.winWeekly" : "cc.winMonthly";
				if (!w) return {
					title: title(),
					value: "-",
					legend: t(roleKey)
				};
				const reset = w.resetIso ? `${t("cc.periodEnd")} ${fmtIsoDay(w.resetIso)}` : fmtReset(w.resetAt) ? `${t("cc.resets")} ${fmtReset(w.resetAt)}` : "";
				return {
					title: title(),
					legend: t(roleKey),
					value: `${w.pct.toFixed(1)}%`,
					sub: reset || void 0
				};
			};
		}
		//#endregion
		//#region src/client/lib/quota-math.ts
		/**
		* dsh-widgets — 「额度管理」 projection math (pure, dependency-free).
		*
		* The card answers two questions from the plan's OWN billing period:
		*
		*  1. where will this month land? The percent already consumed, plus the RECENT
		*     pace carried over the days left. The pace is a short rolling window
		*     (default 3 days, today prorated by how much of it has elapsed) rather than
		*     the whole period's average — otherwise a burst early in the period keeps
		*     predicting an overrun for days after spending has already slowed down,
		*     which contradicts the very same card saying "today is under budget";
		*  2. what may I spend TODAY? The remaining balance converted into tokens at the
		*     period's own realised local-token-per-credit rate and split over the days
		*     left, so following it lands the period at exactly 100%.
		*
		* Both figures are the SAME story read two ways: the projection is the pace's
		* month-end landing point, the budget is the pace that lands on 100%. When the
		* day's usage is below the budget, the recent pace drops and the projection
		* follows it down.
		*
		* Caliber (#2): the daily log and the budget are BOTH local-accounting tokens.
		* The balance is quoted in credits, and the provider's own token count is a
		* different meter (measured 2026-09-14: 2.66B provider tokens vs 1.56B locally
		* logged over the same period), so the conversion uses the rate implied by the
		* LOCAL log — the same log that supplies 今日用量.
		*
		* Nothing here is invented: a missing percentage/allowance, an unusable period,
		* or too little elapsed time returns `null` (数据不足); a missing credit→token
		* side degrades 今日推荐 alone to `null`. This module imports NOTHING, so a Node
		* type-stripping probe can load it against live endpoints.
		*/
		const DAY_MS$1 = 864e5;
		/** Today only enters the pace once this much of it has elapsed — otherwise a
		*  few minutes of usage would be extrapolated to a full day. */
		const MIN_DAY_FRACTION = .25;
		/** `YYYY-MM-DD` for a LOCAL date (mirrors `format.dayKey`). */
		function localDayKey(d) {
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		function num(v) {
			return typeof v === "number" && Number.isFinite(v) ? v : null;
		}
		/** Parse an ISO timestamp; unusable input yields the fallback. */
		function isoDate(v, fallback) {
			if (typeof v !== "string" || v.length === 0) return fallback;
			const ms = Date.parse(v);
			return Number.isFinite(ms) ? new Date(ms) : fallback;
		}
		/** Sum a range of day keys, [from, to] inclusive. */
		function sumRange(daily, from, to) {
			let total = 0;
			const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
			const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
			while (d.getTime() <= last.getTime()) {
				const v = daily[localDayKey(d)];
				if (typeof v === "number" && Number.isFinite(v)) total += v;
				d.setDate(d.getDate() + 1);
			}
			return total;
		}
		/**
		* Project the plan's month-end usage percent and today's token budget.
		* @param input - period / allowance / balance / daily-log inputs.
		* @param now - the clock (injected so the caller — and a probe — can freeze it).
		* @returns the projection, or `null` when the real inputs are not there.
		*/
		function planQuota(input, now) {
			const usedPct = num(input.usedPct);
			const allowance = num(input.allowanceCredits);
			if (usedPct === null || usedPct < 0) return null;
			if (allowance === null || allowance <= 0) return null;
			const start = isoDate(input.periodStart, new Date(now.getFullYear(), now.getMonth(), 1));
			const end = isoDate(input.periodEnd, new Date(now.getFullYear(), now.getMonth() + 1, 1));
			if (end.getTime() <= now.getTime()) return null;
			const elapsedDays = (now.getTime() - start.getTime()) / DAY_MS$1;
			const totalDays = (end.getTime() - start.getTime()) / DAY_MS$1;
			if (elapsedDays < .25 || totalDays <= elapsedDays) return null;
			const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS$1));
			const daily = input.daily !== null && typeof input.daily === "object" ? input.daily : null;
			const todayTokens = daily === null ? 0 : num(daily[localDayKey(now)]) ?? 0;
			const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const dayFraction = Math.max(MIN_DAY_FRACTION, Math.min(1, (now.getTime() - midnight.getTime()) / DAY_MS$1));
			const remaining = num(input.remainingCredits);
			const consumed = num(input.consumedCredits);
			let todayRecommend = null;
			let tokensPerCredit = null;
			if (daily !== null && remaining !== null && remaining >= 0 && consumed !== null && consumed > 0) {
				const spentInPeriod = sumRange(daily, start, now);
				if (spentInPeriod > 0) {
					tokensPerCredit = spentInPeriod / consumed;
					todayRecommend = remaining * tokensPerCredit / daysLeft;
				}
			}
			const windowStart = new Date(midnight);
			windowStart.setDate(windowStart.getDate() - 2);
			const paceFrom = windowStart.getTime() < start.getTime() ? start : windowStart;
			const paceFromMidnight = new Date(paceFrom.getFullYear(), paceFrom.getMonth(), paceFrom.getDate());
			const paceDays = Math.max(1, Math.round((midnight.getTime() - paceFromMidnight.getTime()) / DAY_MS$1) + 1);
			const completeDays = daily === null ? 0 : sumRange(daily, paceFromMidnight, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
			const recentDailyTokens = daily === null ? 0 : (completeDays + todayTokens / dayFraction) / paceDays;
			usedPct / 100 * allowance;
			return {
				usedPct,
				projectedPct: usedPct + (tokensPerCredit !== null && tokensPerCredit > 0 ? recentDailyTokens / tokensPerCredit : 0) * (totalDays - elapsedDays) / allowance * 100,
				recentDailyTokens,
				periodEndIso: end.toISOString(),
				daysLeft,
				todayTokens,
				todayRecommend
			};
		}
		/**
		* Compact token amount for the quota figures: `8.9B` / `201M` / `12.3M` / `517K`.
		* TRUNCATES at the displayed precision, so a recommended budget is always a
		* true ceiling (rounding 200.9M up to 201M would hand out tokens it does not have).
		* @param n - token count.
		* @returns the compact label.
		*/
		function fmtQuota(n) {
			if (!Number.isFinite(n) || n <= 0) return "0";
			if (n >= 1e9) return `${(Math.floor(n / 1e8) / 10).toFixed(1)}B`;
			if (n >= 1e8) return `${Math.floor(n / 1e6)}M`;
			if (n >= 1e6) return `${Math.floor(n / 1e5) / 10}M`;
			if (n >= 1e3) return `${Math.floor(n / 1e3)}K`;
			return String(Math.floor(n));
		}
		//#endregion
		//#region src/widgets/quota-manage/index.ts
		/**
		* 额度管理 (quota-manage) — Coding Plan card, laid out as:
		*
		*   「额度管理            115.5%」   title left, projected percent top-right
		*   「账期至 10月10日」             the billing-period line under the title
		*   「今日用量 / 今日推荐」          today's tokens beside the day's budget
		*
		* The percent is a RUN-RATE projection of the month end: percent consumed so
		* far ÷ elapsed share of the period (one day at 3% ⇒ thirty days at 90%). The
		* budget is the remaining balance converted at the period's realised local
		* token-per-credit rate and split over the days left, so following it lands the
		* period at exactly 100%.
		*
		* Past 100% the number itself escalates: error red + a slow blink
		* (`valuePulse`) — deliberately NOT a card-wide red glow.
		*
		* The plan numbers come from the Command Code account payload through
		* `cc-view`'s monthly window (the same official-matching percent the
		* cc-window-monthly card prints) and the shared daily token log; the math lives
		* in `client/lib/quota-math` (pure, probe-able). Any missing input renders
		* 数据不足 instead of an invented quota.
		*/
		const DAY_MS = 864e5;
		/** The sim multiplier for the over-budget preview state (135% of the month). */
		const SIM_OVER = 1.35;
		/** `MM-DD` split for the localized 账期 line. */
		function periodParts(iso) {
			return {
				m: String(Number(iso.slice(5, 7))),
				d: String(Number(iso.slice(8, 10)))
			};
		}
		/** The card's second line. Kept deliberately SHORT (`账期 10-10`, not
		*  `账期至 10月10日`): at 10px the card's content box holds ~12 full-width
		*  glyphs, and a verbose date line was the longest thing on the card. */
		function periodLine(iso) {
			const { m, d } = periodParts(iso);
			return t("widget.quota-manage.periodEnd", {
				m,
				d
			});
		}
		function quotaRender(stats, meta) {
			const title = t("widget.quota-manage.name");
			const missing = t("widget.quota-manage.insufficient");
			const cc = stats.commandCode;
			const month = monthlyWindow(cc ?? null);
			const plan = planQuota({
				usedPct: month?.pct,
				allowanceCredits: month?.cap,
				periodStart: cc?.subscription?.data?.currentPeriodStart,
				periodEnd: cc?.subscription?.data?.currentPeriodEnd,
				remainingCredits: cc?.credits?.credits?.monthlyCredits,
				consumedCredits: cc?.usage?.totalCost,
				daily: stats.heatmapRaw
			}, /* @__PURE__ */ new Date());
			if (plan === null) return {
				title,
				headRight: "",
				value: missing
			};
			const simOver = meta?.sim?.over === true;
			const over = plan.projectedPct > 100 || simOver;
			const projected = simOver ? Math.max(plan.projectedPct, SIM_OVER * 100) : plan.projectedPct;
			return {
				title,
				headRight: "",
				value: `${Math.round(projected)}%`,
				valueTone: over ? "danger" : void 0,
				valuePulse: over,
				legend: periodLine(plan.periodEndIso),
				chart: {
					kind: "figures",
					figures: [{
						label: t("widget.quota-manage.used"),
						value: fmtQuota(plan.todayTokens)
					}, {
						label: t("widget.quota-manage.recommend"),
						value: plan.todayRecommend === null ? "—" : fmtQuota(plan.todayRecommend)
					}]
				}
			};
		}
		/** Widget-owned preview: a live-shaped account (period ending 26 days out) plus
		*  a deterministic 14-day log, so the preview shows plausible M figures instead
		*  of the shared mock's tiny token counts. The balance sits where the run-rate
		*  projects a calm ~59% month, so the card's over-budget state is the one the
		*  preview click adds. */
		function previewStats() {
			const now = /* @__PURE__ */ new Date();
			const daily = {};
			let periodTotal = 0;
			for (let i = 0; i < 14; i++) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
				const v = i === 13 ? 12e7 : 9e7 + i * 137 % 44 * 8e6;
				daily[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = v;
				if (i >= 9) periodTotal += v;
			}
			const consumed = periodTotal / 89e6;
			return {
				heatmapRaw: daily,
				commandCode: {
					whoami: null,
					usage: {
						totalCost: consumed,
						totalTokens: periodTotal,
						totalMonthlyCredits: consumed
					},
					credits: { credits: { monthlyCredits: 64.5 } },
					subscription: {
						success: true,
						data: {
							planId: "individual-goat",
							status: "active",
							currentPeriodStart: (/* @__PURE__ */ new Date(now.getTime() - 4 * DAY_MS)).toISOString(),
							currentPeriodEnd: new Date(now.getTime() + 26 * DAY_MS).toISOString()
						}
					}
				}
			};
		}
		var quota_manage_default = defineWidget({
			id: "quota-manage",
			name: () => t("widget.quota-manage.name"),
			desc: () => t("widget.quota-manage.desc"),
			builtin: true,
			group: "coding-plan",
			render: quotaRender,
			simToggle: () => t("widget.quota-manage.simToggle"),
			example: {
				stats: previewStats,
				sim: { over: false }
			}
		});
		//#endregion
		//#region src/client/lib/usage-view.ts
		/**
		* dsh-widgets — OpenCode Go usage shared render layer (widget-family shared).
		*
		* The five usage widgets (usage-bars / usage-rings / usage-rolling / usage-
		* weekly / usage-monthly) share the pool-view resolution and the card shapes.
		* They live here — NOT copied into each unit — so the family stays consistent
		* and a new usage-style widget imports the same machinery.
		*
		* All strings come from the per-widget dictionaries (merged by the registry
		* generator from each unit's manifest; family-shared keys live in
		* `src/widgets/_shared/locales.json`), so these factories never hard-code text.
		*/
		/** Which key's usage a usage widget should currently show. */
		function usageView(stats) {
			const multi = stats.usageMulti;
			const modes = stats.poolModes !== void 0 && stats.poolModes.length > 0 ? stats.poolModes : ["total"];
			const view = stats.poolView;
			if (view === void 0 || !modes.includes(view) || view === "total") return {
				data: multi?.total ?? stats.usageData ?? null,
				mode: "total"
			};
			const idx = modes.indexOf(view) - 1;
			return {
				data: (multi?.keys[idx])?.data ?? null,
				mode: view
			};
		}
		/** Cycle descriptor for a pooled usage widget, when more than one view exists. */
		function cycleFor(stats) {
			const modes = stats.poolModes;
			if (modes === void 0 || modes.length < 2) return void 0;
			return {
				modes,
				current: stats.poolView !== void 0 && modes.includes(stats.poolView) ? stats.poolView : "total",
				hint: t("usage.cycleHint", { chain: modes.map((m) => m === "total" ? t("usage.totalKey") : m).join(" → ") + " → " + t("usage.totalKey") })
			};
		}
		/** 「总 Key」/「Key N」label for the current view. */
		function modeLabel(mode) {
			return mode === "total" ? t("usage.totalKey") : mode;
		}
		/** Read one usage window's percent DEFENSIVELY: any malformed window (missing,
		*  null, non-object, non-numeric percent — e.g. an upstream partial/error
		*  response) yields null, so the multi-window charts degrade to a placeholder
		*  instead of throwing and taking the whole rail down with them. */
		function winPct(u, key) {
			const it = u?.[key];
			return it !== null && typeof it === "object" && typeof it.percent === "number" ? it.percent : null;
		}
		/** Single-window percent card (usage-rolling / usage-weekly / usage-monthly). */
		function usageRender(key, nameKey) {
			return (stats) => {
				const { data, mode } = usageView(stats);
				const u = data?.usage?.[key];
				const cycle = cycleFor(stats);
				if (u === null || u === void 0 || typeof u !== "object" || typeof u.percent !== "number") return {
					title: t(nameKey),
					value: "—",
					legend: modeLabel(mode),
					cycle
				};
				const item = u;
				return {
					title: t(nameKey),
					value: `${Number(item.percent).toFixed(1)}%`,
					legend: modeLabel(mode),
					sub: t("usage.resets", { date: String(item.resetsAt || "").slice(0, 10) }),
					cycle
				};
			};
		}
		/** OpenCode Go dosage as one bar chart across the three windows (usage-bars). */
		function usageBarsRender(stats) {
			const { data, mode } = usageView(stats);
			const u = data?.usage;
			const cycle = cycleFor(stats);
			const r = winPct(u, "rolling");
			const w = winPct(u, "weekly");
			const m = winPct(u, "monthly");
			if (r === null || w === null || m === null) return {
				title: t("usage.title"),
				value: "—",
				legend: modeLabel(mode),
				cycle
			};
			const tone = (p) => p >= 95 ? "danger" : p >= 75 ? "warn" : "success";
			const bars = [
				{
					label: t("usage.rolling"),
					value: r,
					ratio: r / 100,
					tone: tone(r)
				},
				{
					label: t("usage.week"),
					value: w,
					ratio: w / 100,
					tone: tone(w)
				},
				{
					label: t("usage.month"),
					value: m,
					ratio: m / 100,
					tone: tone(m)
				}
			];
			return {
				title: t("usage.title"),
				legend: modeLabel(mode),
				chart: {
					kind: "bars",
					bars
				},
				cycle
			};
		}
		/** OpenCode Go dosage as three small donuts — same data as the bars chart,
		*  circle form. Each ring shows its percent in the centre... (usage-rings).
		*  Labels stay OFF (user preference: no rolling/week/month text under the
		*  rings — the window names surface on hover via the title tooltip). */
		function usageRingsRender(stats) {
			const { data, mode } = usageView(stats);
			const u = data?.usage;
			const cycle = cycleFor(stats);
			const r = winPct(u, "rolling");
			const w = winPct(u, "weekly");
			const m = winPct(u, "monthly");
			if (r === null || w === null || m === null) return {
				title: t("usage.title"),
				value: "—",
				legend: modeLabel(mode),
				cycle
			};
			const tone = (p) => p >= 95 ? "danger" : p >= 75 ? "warn" : "success";
			const mk = (p) => ({
				label: "",
				value: p,
				ratio: p / 100,
				tone: tone(p)
			});
			return {
				title: t("usage.title"),
				legend: modeLabel(mode),
				chart: {
					kind: "rings",
					rings: [
						mk(r),
						mk(w),
						mk(m)
					]
				},
				cycle
			};
		}
		//#endregion
		//#region src/widgets/usage-bars/index.ts
		/** OpenCode Go dosage as one bar chart across the three windows. */
		var usage_bars_default = defineWidget({
			id: "usage-bars",
			name: () => t("widget.usage-bars.name"),
			desc: () => t("widget.usage-bars.desc"),
			builtin: false,
			group: "opencode-go",
			badgeLabel: () => t("badge.opencode"),
			render: usageBarsRender
		});
		//#endregion
		//#region src/widgets/usage-rings/index.ts
		/** OpenCode Go dosage as three small donuts (one per window). */
		var usage_rings_default = defineWidget({
			id: "usage-rings",
			name: () => t("widget.usage-rings.name"),
			desc: () => t("widget.usage-rings.desc"),
			builtin: false,
			group: "opencode-go",
			badgeLabel: () => t("badge.opencode"),
			render: usageRingsRender
		});
		//#endregion
		//#region src/widgets/usage-rolling/index.ts
		/** OpenCode Go rolling-window usage quota (single-window percent card). */
		var usage_rolling_default = defineWidget({
			id: "usage-rolling",
			name: () => t("widget.usage-rolling.name"),
			desc: () => t("widget.usage-rolling.desc"),
			builtin: false,
			group: "opencode-go",
			badgeLabel: () => t("badge.opencode"),
			render: usageRender("rolling", "widget.usage-rolling.name")
		});
		//#endregion
		//#region src/widgets/usage-weekly/index.ts
		/** OpenCode Go weekly usage quota (single-window percent card). */
		var usage_weekly_default = defineWidget({
			id: "usage-weekly",
			name: () => t("widget.usage-weekly.name"),
			desc: () => t("widget.usage-weekly.desc"),
			builtin: false,
			group: "opencode-go",
			badgeLabel: () => t("badge.opencode"),
			render: usageRender("weekly", "widget.usage-weekly.name")
		});
		//#endregion
		//#region src/widgets/usage-monthly/index.ts
		/** OpenCode Go monthly usage quota (single-window percent card). */
		var usage_monthly_default = defineWidget({
			id: "usage-monthly",
			name: () => t("widget.usage-monthly.name"),
			desc: () => t("widget.usage-monthly.desc"),
			builtin: false,
			group: "opencode-go",
			badgeLabel: () => t("badge.opencode"),
			render: usageRender("monthly", "widget.usage-monthly.name")
		});
		//#endregion
		//#region src/widgets/cc-whoami/index.ts
		/** Command Code account identity (whoami). */
		var cc_whoami_default = defineWidget({
			id: "cc-whoami",
			name: () => t("widget.cc-whoami.name"),
			desc: () => t("widget.cc-whoami.desc"),
			builtin: false,
			group: "commandcode",
			badgeLabel: () => t("badge.commandcode"),
			render: ccWhoamiRender
		});
		//#endregion
		//#region src/widgets/peak-pricing/index.ts
		/** Peak-pricing windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
		*  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
		*  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other time — including
		*  weekends — is off-peak. Hard-coded for now; a custom-schedule setting is
		*  planned (README Roadmap). */
		const PEAK_WINDOWS_BJ = [{
			key: "card.peak.window1",
			start: 540,
			end: 720
		}, {
			key: "card.peak.window2",
			start: 840,
			end: 1080
		}];
		/** Is right now inside a peak window (Beijing local clock)? Returns the active
		*  window key too, so the meter can light the matching row. Exported so the
		*  preview surfaces can flip the simulated state relative to the real one. */
		function peakStatusNow(now = /* @__PURE__ */ new Date()) {
			const dow = now.getDay();
			if (dow === 0 || dow === 6) return { peak: false };
			const mins = now.getHours() * 60 + now.getMinutes();
			for (const w of PEAK_WINDOWS_BJ) if (mins >= w.start && mins < w.end) return {
				peak: true,
				activeKey: w.key
			};
			return { peak: false };
		}
		/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
		*  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
		*  a peak window is active, CHEAP otherwise. The two windows live under the
		*  title; the active one lights up brand-blue. The EXPENSIVE escalation is on
		*  the TEXT itself — the value turns red and blinks (valuePulse); the card frame
		*  stays clean (the old red inner glow was removed on request). A preview can
		*  pass meta.sim = { peak: boolean, window?: 0|1 } to force either state. */
		function peakPricingRender(_stats, meta) {
			const sim = meta?.sim;
			const simPeak = sim && typeof sim.peak === "boolean" ? sim.peak : null;
			const live = peakStatusNow();
			const peak = simPeak !== null ? simPeak : live.peak;
			const activeKey = simPeak !== null ? PEAK_WINDOWS_BJ[sim && typeof sim.window === "number" ? sim.window : 0]?.key : live.activeKey;
			return {
				title: t("card.peak.title"),
				meter: PEAK_WINDOWS_BJ.map((w) => ({
					label: t(w.key),
					active: w.key === activeKey
				})),
				value: peak ? "EXPENSIVE" : "CHEAP",
				valueTone: peak ? "danger" : void 0,
				valuePulse: peak
			};
		}
		var peak_pricing_default = defineWidget({
			id: "peak-pricing",
			name: () => t("widget.peak-pricing.name"),
			desc: () => t("widget.peak-pricing.desc"),
			builtin: false,
			group: "pricing",
			badgeLabel: () => t("widget.peak-pricing.name"),
			simToggle: () => t("sim.peak"),
			render: peakPricingRender,
			example: { sim: { peak: false } }
		});
		//#endregion
		//#region src/client/lib/sys-view.ts
		/**
		* dsh-widgets — Machine/system (SysInfo) shared render layer (widget-family
		* shared). The five system widgets (sys-cpu / sys-gpu / sys-rings / sys-board
		* / sys-gpu-line) share the snapshot resolution, the refresh-interval config
		* schema, the big-figure cycle and the formatting helpers. They live here —
		* NOT copied into each unit — so the family stays consistent and a new system
		* widget imports the same machinery.
		*
		* All strings come from the per-widget dictionaries (merged by the registry
		* generator from each unit's manifest; family-shared keys live in
		* `src/widgets/_shared/locales.json`), so these factories never hard-code text.
		*/
		/** The five system (hardware) widget ids — the client collector uses this list
		*  to find which installed instances drive the `/api/sysinfo` polling cadence. */
		const SYS_WIDGET_IDS = [
			"sys-cpu",
			"sys-gpu",
			"sys-rings",
			"sys-board",
			"sys-gpu-line"
		];
		/** Read the machine snapshot from the stats passed to a widget render. */
		function sysInfo(stats) {
			const s = stats.sysinfo;
			return s !== null && typeof s === "object" && typeof s.cpu === "object" ? s : null;
		}
		/** Client-side sampling history fallback. The host streams a `history` ring
		*  buffer since v1.5.0 round 3 — but a host that predates that field (not yet
		*  restarted) never provides it, and sys-gpu-line would wait forever. The
		*  collector ingests every successful poll here (capped, newest last), so the
		*  sparkline works on ANY host; once the host restarts its (longer) history
		*  takes precedence and the client buffer is ignored. */
		const CLIENT_HIST_CAP = 120;
		let clientHist = {
			ts: [],
			gpu: []
		};
		/** Feed one successful snapshot into the client-side fallback history. */
		function ingestSysInfo(s) {
			if (s === null || typeof s !== "object") return;
			clientHist.ts.push(s.ts);
			clientHist.gpu.push(s.gpu !== null && s.gpu !== void 0 ? s.gpu.util : null);
			if (clientHist.ts.length > CLIENT_HIST_CAP) {
				const drop = clientHist.ts.length - CLIENT_HIST_CAP;
				clientHist.ts.splice(0, drop);
				clientHist.gpu.splice(0, drop);
			}
		}
		/** Resolve the sparkline history: host history when present (longer, survives
		*  reloads), else the client-side accumulated fallback (works pre-restart). */
		function historyOf(s) {
			const h = s.history;
			if (h && Array.isArray(h.ts) && Array.isArray(h.gpu) && h.ts.length > 0 && h.ts.length === h.gpu.length) return {
				ts: h.ts,
				gpu: h.gpu
			};
			return clientHist.ts.length > 0 ? {
				ts: clientHist.ts.slice(),
				gpu: clientHist.gpu.slice()
			} : null;
		}
		/** Per-widget refresh-interval schema: 5/10/30/60 s presets + a custom numeric
		*  field (used when the preset is `custom`). The collector applies the SHORTEST
		*  effective interval among installed sys-* instances (clamped 5..60 s). */
		function intervalSchema() {
			return [{
				key: "interval",
				label: () => t("sysinfo.interval"),
				type: "mode",
				default: "10",
				options: [
					["5", "5s"],
					["10", "10s"],
					["30", "30s"],
					["60", "60s"],
					["custom", () => t("sysinfo.intervalCustom")]
				]
			}, {
				key: "intervalCustom",
				label: () => t("sysinfo.intervalCustomValue"),
				type: "text",
				default: "10"
			}];
		}
		/** Max samples shown by the sparkline (10–30, default 20): the host buffer can
		*  hold 120 points — drawing all of them into a 2×2 card would squash the line
		*  into an unreadable blob. The dropdown keeps the window explicit. */
		const SPARK_POINTS_OPTS = [
			"10",
			"15",
			"20",
			"25",
			"30"
		].map((n) => [n, `${n}`]);
		/** Effective sparkline sample window from a per-instance config (10..30). */
		function resolveSparkPoints(config) {
			const n = Number(config?.points);
			if (!Number.isFinite(n) || !(n > 0)) return 20;
			return Math.max(10, Math.min(30, Math.round(n)));
		}
		/** Effective refresh seconds from a per-instance config: preset value or the
		*  custom numeric; clamped to 5..60, falling back to 10 on anything invalid. */
		function resolveInterval(config) {
			const mode = typeof config?.interval === "string" ? config.interval : "10";
			let secs = mode === "custom" ? Number(config?.intervalCustom) : Number(mode);
			if (!Number.isFinite(secs) || !(secs > 0)) return 10;
			return Math.max(5, Math.min(60, Math.round(secs)));
		}
		/** Big-figure selectors. GPU: VRAM / temperature / utilization; CPU: the
		*  utilization / used memory. The selection drives BOTH the whole-card click
		*  cycle (store: 'bigMetric') and the config dropdown (same key). */
		const GPU_METRIC_OPTS = [
			["vram", () => t("sysinfo.bigVram")],
			["temp", () => t("sysinfo.bigTemp")],
			["util", () => t("sysinfo.bigUtil")]
		];
		const CPU_METRIC_OPTS = [["util", () => t("sysinfo.bigUtil")], ["mem", () => t("sysinfo.bigMem")]];
		/** Config dropdown for the big-figure mode (per-widget option lists). */
		function bigMetricSchema(opts) {
			return {
				key: "bigMetric",
				label: () => t("sysinfo.bigMetric"),
				type: "mode",
				options: opts,
				default: opts[0][0]
			};
		}
		/** Cycle hint: "VRAM (GB) → Temp (°C) → Utilization (%) → …" closing the loop. */
		function bigHint(opts) {
			const labels = opts.map(([_v, l]) => typeof l === "function" ? l() : l);
			return t("sysinfo.bigHint", { chain: labels.concat(labels[0]).join(" → ") });
		}
		/** GPU big-figure options for the widget descriptors. */
		function gpuMetricOptions() {
			return GPU_METRIC_OPTS;
		}
		/** CPU big-figure options for the widget descriptors. */
		function cpuMetricOptions() {
			return CPU_METRIC_OPTS;
		}
		/** Read an instance's bigMetric mode, falling back to the option-list default. */
		function bigMetricOf(stats, opts) {
			const m = stats.bigMetric;
			return typeof m === "string" && opts.some(([v]) => v === m) ? m : opts[0][0];
		}
		/** Bytes → human GB ("17.4 GB"), one decimal below 10 GB, integer above. */
		function fmtGb(bytes) {
			const gb = bytes / 1024 ** 3;
			return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
		}
		/** Trim the verbose vendor prefix so the model name fits the 2×4 title row
		*  ("NVIDIA GeForce RTX 5070 Ti Laptop GPU" → "RTX 5070 Ti Laptop GPU"). */
		function shortGpuName(name) {
			return name.replace(/^NVIDIA GeForce /, "").replace(/^NVIDIA /, "");
		}
		/** Utilization tone: success under 75, warn 75–89, danger ≥90 (usage-rings
		*  convention, reused for load rings). */
		function loadTone(p) {
			return p >= 90 ? "danger" : p >= 75 ? "warn" : "success";
		}
		/** Shared "no snapshot yet" shape (collector idle / host down / first paint). */
		function sysUnavailable(titleKey) {
			return {
				title: t(titleKey),
				value: "—",
				legend: t("sysinfo.waiting")
			};
		}
		/** sys-cpu: big utilization (or used memory, clickable/dropdown) + mem line. */
		function sysCpuRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-cpu.name");
			const metric = bigMetricOf(stats, CPU_METRIC_OPTS);
			const value = metric === "mem" ? fmtGb(s.mem.used) : s.cpu.util === null ? "—" : `${s.cpu.util}%`;
			return {
				title: t("widget.sys-cpu.name"),
				value,
				sub: t("sysinfo.memSub", {
					used: fmtGb(s.mem.used),
					total: fmtGb(s.mem.total)
				}),
				cycle: {
					modes: CPU_METRIC_OPTS.map(([v]) => v),
					current: metric,
					hint: bigHint(CPU_METRIC_OPTS),
					store: "bigMetric"
				}
			};
		}
		/** sys-gpu: big VRAM (or temp / utilization, clickable/dropdown) + util/temp
		*  line. No GPU model name on the card — the value must sit bottom-left as the
		*  large figure (a headRight would pull it into the title row). */
		function sysGpuRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-gpu.name");
			if (s.gpu === null) return {
				title: t("widget.sys-gpu.name"),
				value: "—",
				legend: t("sysinfo.noGpu")
			};
			const metric = bigMetricOf(stats, GPU_METRIC_OPTS);
			const g = s.gpu;
			const value = metric === "temp" ? `${Math.round(g.temp)}°C` : metric === "util" ? `${Math.round(g.util)}%` : fmtGb(g.memUsed);
			return {
				title: t("widget.sys-gpu.name"),
				value,
				sub: `${g.util}% · ${g.temp}°C · ${fmtGb(g.memTotal)}`,
				cycle: {
					modes: GPU_METRIC_OPTS.map(([v]) => v),
					current: metric,
					hint: bigHint(GPU_METRIC_OPTS),
					store: "bigMetric"
				}
			};
		}
		/** sys-rings: CPU utilization ring + GPU utilization ring (GPU ring absent
		*  while no NVIDIA GPU is detected). Values and names share one row per ring. */
		function sysRingsRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-rings.name");
			const mk = (label, p) => ({
				label,
				value: p,
				ratio: p / 100,
				tone: loadTone(p)
			});
			const rings = [{
				label: t("sysinfo.cpu"),
				value: s.cpu.util ?? 0,
				ratio: (s.cpu.util ?? 0) / 100,
				tone: loadTone(s.cpu.util ?? 0)
			}];
			if (s.gpu !== null) rings.push(mk(t("sysinfo.gpu"), s.gpu.util));
			return {
				title: t("widget.sys-rings.name"),
				legend: s.gpu === null ? t("sysinfo.noGpu") : void 0,
				chart: {
					kind: "rings",
					rings
				}
			};
		}
		/** sys-board: the 2×4 monitoring dashboard — every metric as a ring (CPU
		*  utilization, memory, GPU utilization, VRAM). The GPU model (short form)
		*  and temperature sit at the RIGHT END of the title row; no extra volume row
		*  (the 0/0 GB line was removed — the rings + names carry the information). */
		function sysBoardRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-board.name");
			const mk = (label, p) => ({
				label,
				value: p,
				ratio: p / 100,
				tone: loadTone(p)
			});
			const rings = [mk(t("sysinfo.cpu"), s.cpu.util ?? 0), mk(t("sysinfo.mem"), s.mem.percent)];
			const gpu = s.gpu;
			if (gpu !== null) {
				rings.push(mk(t("sysinfo.gpu"), gpu.util));
				rings.push(mk(t("sysinfo.vram"), gpu.memPercent));
			}
			return {
				title: t("widget.sys-board.name"),
				headRight: gpu !== null ? `${gpu.temp}°C · ${shortGpuName(gpu.name)}` : void 0,
				legend: gpu === null ? t("sysinfo.noGpu") : void 0,
				chart: {
					kind: "rings",
					rings
				}
			};
		}
		/** sys-gpu-line: GPU utilization sparkline (Windows-task-manager style) with
		*  the current utilization as the big figure. The card body carries
		*  value + sub + sparkline, and the sparkline is ELASTIC (CardBody gives the
		*  line chart the remaining vertical space, ChartBlock renders it at
		*  flex:1/100%) — so the card's intrinsic height stays inside the 2×2 box at
		*  ANY side size or magnification factor (the old fixed 68px sparkline
		*  totalled ≈178px and burst the 150px box on hover). */
		function sysGpuLineRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-gpu-line.name");
			if (s.gpu === null) return {
				title: t("widget.sys-gpu-line.name"),
				value: "—",
				legend: t("sysinfo.noGpu")
			};
			const hist = historyOf(s);
			const allVals = hist ? hist.gpu : [];
			const allTs = hist ? hist.ts : [];
			if (allVals.length < 2) return {
				title: t("widget.sys-gpu-line.name"),
				value: `${Math.round(s.gpu.util)}%`,
				legend: t("sysinfo.waiting")
			};
			const N = resolveSparkPoints(stats);
			const vals = allVals.slice(-N);
			const ts = allTs.slice(-N);
			const g = s.gpu;
			const fmtT = (tms) => {
				const d = new Date(tms);
				return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
			};
			return {
				title: t("widget.sys-gpu-line.name"),
				value: `${Math.round(g.util)}%`,
				sub: `${Math.round(g.temp)}°C · ${fmtGb(g.memUsed)}`,
				chart: {
					kind: "line",
					line: {
						values: vals,
						max: 100,
						labels: [fmtT(ts[0]), fmtT(ts[ts.length - 1])]
					}
				}
			};
		}
		//#endregion
		//#region src/client/generated.registry.ts
		/**
		* dsh-widgets — GENERATED widget registry. DO NOT EDIT BY HAND.
		*
		* Produced by scripts/gen-registry.mjs from the unit dirs under src/widgets/
		* (the machine-readable part comes from each unit's manifest.json; the
		* descriptors come from each unit's index.ts). Regenerate with:
		*   pnpm gen:registry        (write)
		*   pnpm check:registry      (verify up-to-date — the build/CI guard)
		*
		* Adding a widget = creating one unit dir; the registry follows automatically.
		*/
		/** Every discovered widget, in manifest display order (then by id). */
		const WIDGETS = [
			counts_default,
			llm_default,
			tool_default,
			ttft_default,
			tps_default,
			cache_default,
			tokens_default,
			context_default,
			context_water_default,
			task_default,
			trajectory_default,
			quote_default,
			heatmap_default,
			heatmap_bars_default,
			quota_manage_default,
			usage_bars_default,
			usage_rings_default,
			usage_rolling_default,
			usage_weekly_default,
			usage_monthly_default,
			cc_whoami_default,
			peak_pricing_default,
			defineWidget({
				id: "sys-cpu",
				name: () => t("widget.sys-cpu.name"),
				desc: () => t("widget.sys-cpu.desc"),
				builtin: false,
				group: "device",
				configSchema: [...intervalSchema(), bigMetricSchema(cpuMetricOptions())],
				render: sysCpuRender
			}),
			defineWidget({
				id: "cc-usage",
				name: () => t("widget.cc-usage.name"),
				desc: () => t("widget.cc-usage.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccUsageRender
			}),
			defineWidget({
				id: "sys-gpu",
				name: () => t("widget.sys-gpu.name"),
				desc: () => t("widget.sys-gpu.desc"),
				builtin: false,
				group: "device",
				configSchema: [...intervalSchema(), bigMetricSchema(gpuMetricOptions())],
				render: sysGpuRender
			}),
			defineWidget({
				id: "cc-credits",
				name: () => t("widget.cc-credits.name"),
				desc: () => t("widget.cc-credits.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccCreditsRender
			}),
			defineWidget({
				id: "sys-rings",
				name: () => t("widget.sys-rings.name"),
				desc: () => t("widget.sys-rings.desc"),
				builtin: false,
				group: "device",
				configSchema: intervalSchema(),
				render: sysRingsRender
			}),
			defineWidget({
				id: "cc-windows",
				name: () => t("widget.cc-windows.name"),
				desc: () => t("widget.cc-windows.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccWindowsRender
			}),
			defineWidget({
				id: "sys-board",
				name: () => t("widget.sys-board.name"),
				desc: () => t("widget.sys-board.desc"),
				builtin: false,
				group: "device",
				sizes: ["2x4"],
				configSchema: intervalSchema(),
				render: sysBoardRender
			}),
			defineWidget({
				id: "cc-subscription",
				name: () => t("widget.cc-subscription.name"),
				desc: () => t("widget.cc-subscription.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccSubscriptionRender
			}),
			defineWidget({
				id: "sys-gpu-line",
				name: () => t("widget.sys-gpu-line.name"),
				desc: () => t("widget.sys-gpu-line.desc"),
				builtin: false,
				group: "device",
				sizes: ["2x2"],
				configSchema: [...intervalSchema(), {
					key: "points",
					label: () => t("sysinfo.points"),
					type: "mode",
					default: "20",
					options: SPARK_POINTS_OPTS
				}],
				render: sysGpuLineRender
			}),
			defineWidget({
				id: "cc-window-5h",
				name: () => t("widget.cc-window-5h.name"),
				desc: () => t("widget.cc-window-5h.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccWindowValueRender("fiveHour")
			}),
			defineWidget({
				id: "cc-window-weekly",
				name: () => t("widget.cc-window-weekly.name"),
				desc: () => t("widget.cc-window-weekly.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccWindowValueRender("weekly")
			}),
			defineWidget({
				id: "cc-window-monthly",
				name: () => t("widget.cc-window-monthly.name"),
				desc: () => t("widget.cc-window-monthly.desc"),
				builtin: false,
				group: "commandcode",
				badgeLabel: () => t("badge.commandcode"),
				render: ccWindowValueRender("monthly")
			})
		];
		/** Every valid instance key (each widget at each of its supported sizes). */
		const ALL_INSTANCES = [
			`counts@2x2`,
			`llm@2x2`,
			`tool@2x2`,
			`ttft@2x2`,
			`tps@2x2`,
			`cache@2x2`,
			`tokens@2x2`,
			`context@2x2`,
			`context-water@2x2`,
			`context-water@2x4`,
			`task@2x2`,
			`trajectory@2x2`,
			`quote@2x2`,
			`heatmap@2x2`,
			`heatmap@2x4`,
			`heatmap-bars@2x2`,
			`quota-manage@2x2`,
			`usage-bars@2x2`,
			`usage-rings@2x2`,
			`usage-rolling@2x2`,
			`usage-weekly@2x2`,
			`usage-monthly@2x2`,
			`cc-whoami@2x2`,
			`peak-pricing@2x2`,
			`sys-cpu@2x2`,
			`cc-usage@2x2`,
			`sys-gpu@2x2`,
			`cc-credits@2x2`,
			`sys-rings@2x2`,
			`cc-windows@2x2`,
			`sys-board@2x4`,
			`cc-subscription@2x2`,
			`sys-gpu-line@2x2`,
			`cc-window-5h@2x2`,
			`cc-window-weekly@2x2`,
			`cc-window-monthly@2x2`
		];
		/** The default installed set: the stats-line family at 2×2. */
		const DEFAULT_INSTALLED = [
			`counts@2x2`,
			`llm@2x2`,
			`tool@2x2`,
			`ttft@2x2`,
			`tps@2x2`,
			`cache@2x2`,
			`tokens@2x2`
		];
		/** Merged per-widget dictionaries (family-shared + every unit's locale).
		*  Registered with the locale service at apply() time. */
		const WIDGET_LOCALES = {
			zh: {
				"badge.opencode": "OpenCode Go 用量配额",
				"usage.title": "OpenCode 用量",
				"usage.totalKey": "总 Key",
				"usage.cycleHint": "单击循环：{chain}",
				"usage.resets": "重置 {date}",
				"usage.rolling": "滚动",
				"usage.week": "周",
				"usage.month": "月",
				"badge.commandcode": "Command Code 账户用量",
				"group.commandcode": "Command Code",
				"cc.notConfigured": "未配置 COMMANDCODE_API_KEY（host 自动读取环境变量 / 凭据，无需手动填写）",
				"cc.unconfigured": "未配置 COMMANDCODE_API_KEY — host 自动读取环境变量 / $DSH_HOME/.credentials.yaml / .env，重启后自动生效",
				"cc.unloaded": "dsh web 未重启，等待 host 路由加载（重启后自动刷新）",
				"cc.unavailable": "Command Code 服务暂不可用",
				"cc.account": "账户",
				"cc.tokens": "tokens",
				"cc.requests": "请求",
				"cc.successRate": "成功率",
				"cc.spend": "消费",
				"cc.credits": "credits",
				"cc.free": "免费",
				"cc.purchased": "购买",
				"cc.fiveHour": "5h",
				"cc.weekly": "周",
				"cc.periodEnd": "账期至",
				"cc.title": "Command Code",
				"cc.roleUsage": "用量",
				"cc.roleCredits": "额度",
				"cc.roleWindow": "窗口",
				"cc.rolePlan": "套餐",
				"cc.roleAccount": "账户",
				"cc.win5h": "5h 窗口",
				"cc.winWeekly": "周窗口",
				"cc.winMonthly": "月窗口",
				"cc.resets": "重置",
				"cc.cancelAtEnd": "到期不续订",
				"sysinfo.cpu": "CPU",
				"sysinfo.gpu": "GPU",
				"sysinfo.mem": "内存",
				"sysinfo.vram": "显存",
				"sysinfo.memSub": "内存 {used} / {total}",
				"sysinfo.interval": "刷新间隔",
				"sysinfo.intervalCustom": "自定义",
				"sysinfo.intervalCustomValue": "自定义间隔（秒）",
				"sysinfo.noGpu": "未检测到 NVIDIA GPU",
				"sysinfo.waiting": "等待设备数据…",
				"sysinfo.bigMetric": "大数值显示",
				"sysinfo.bigVram": "显存 (GB)",
				"sysinfo.bigTemp": "温度 (°C)",
				"sysinfo.bigUtil": "利用率 (%)",
				"sysinfo.bigMem": "内存 (GB)",
				"sysinfo.bigHint": "点击切换大数值：{chain}",
				"sysinfo.points": "折线采样数",
				"widget.counts.name": "轮次·步数",
				"widget.counts.desc": "本轮会话的轮次与步骤计数",
				"card.counts.value": "{turns}轮 {steps}步",
				"widget.llm.name": "LLM 时长",
				"widget.llm.desc": "模型推理累计耗时",
				"widget.tool.name": "工具调用",
				"widget.tool.desc": "工具调用累计耗时",
				"widget.ttft.name": "首 token 平均",
				"widget.ttft.desc": "平均首 token 延迟",
				"widget.tps.name": "速率",
				"widget.tps.desc": "解码吞吐速度",
				"widget.cache.name": "缓存命中",
				"widget.cache.desc": "输入缓存的命中比例",
				"widget.tokens.name": "Tokens",
				"widget.tokens.desc": "输入与输出 token 计数",
				"widget.context.name": "一键压缩",
				"widget.context.desc": "上下文占用百分比，右上按钮两次点击执行压缩",
				"card.context.title": "一键压缩",
				"card.context.waiting": "等待上下文数据",
				"card.context.compact": "压缩",
				"card.context.confirm": "确认",
				"widget.context-water.name": "上下文水位",
				"widget.context-water.desc": "上下文系统/工具/消息占比分段条",
				"card.contextWater.title": "上下文已用",
				"card.contextWater.system": "系统提示词",
				"card.contextWater.tools": "工具",
				"card.contextWater.messages": "对话消息",
				"widget.task.name": "任务",
				"widget.task.desc": "当前任务的进行中/已完成/待办计数",
				"card.task.done": "{n} 已完成",
				"card.task.none": "暂无任务",
				"card.task.sub": "{doing} 进行中 · {pending} 待办",
				"widget.trajectory.name": "对话轨迹",
				"widget.trajectory.desc": "官方「轨迹」三色泳道的卡片版：输入 / 模型 / 工具 每次触发一根色条，随模型调用工具实时右移滚动",
				"card.trajectory.legend": "输入 {input}  模型 {model}  工具 {tool}",
				"card.trajectory.input": "输入",
				"card.trajectory.model": "模型",
				"card.trajectory.tool": "工具",
				"config.laneSizing": "泳道宽度",
				"config.laneSizing.time": "按时长",
				"config.laneSizing.equal": "等宽",
				"widget.quote.name": "今日寄语",
				"widget.quote.desc": "显示你自定义的一句话（未填写文本时不显示内容）",
				"card.quote.title": "今日寄语",
				"config.quoteText": "寄语内容",
				"config.showTitle": "显示标题",
				"config.align": "水平对齐",
				"config.valign": "垂直位置",
				"config.wrap": "允许换行",
				"quote.previewPlaceholder": "（填写寄语内容后显示）",
				"widget.heatmap.name": "用量热度图",
				"widget.heatmap.desc": "每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；大小可在市场左右切换",
				"card.heatmap.title": "Token 用量",
				"config.monthMode": "窗口对齐方式",
				"config.monthMode.rolling": "滚动(今天最右)",
				"config.monthMode.quarter": "季度对齐",
				"config.timeZone": "记账时区",
				"config.timeZone.beijing": "北京 (UTC+8)",
				"config.timeZone.local": "跟随系统",
				"widget.heatmap-bars.name": "用量柱状图",
				"widget.heatmap-bars.desc": "最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致",
				"config.monthMode.rolling7": "滚动(最近7天)",
				"config.monthMode.weekly": "每周对齐",
				"widget.quota-manage.name": "额度管理",
				"widget.quota-manage.desc": "按账期趋势预测月末用量百分比，并给出今日 token 用量与今日推荐用量",
				"widget.quota-manage.periodEnd": "账期 {m}-{d}",
				"widget.quota-manage.used": "今日用量",
				"widget.quota-manage.recommend": "今日推荐",
				"widget.quota-manage.insufficient": "数据不足",
				"widget.quota-manage.simToggle": "超额状态",
				"widget.usage-bars.name": "用量对比",
				"widget.usage-bars.desc": "OpenCode 滚动/周/月三窗口用量柱状图",
				"widget.usage-rings.name": "用量环图",
				"widget.usage-rings.desc": "OpenCode 滚动/周/月三窗口用量环形图",
				"widget.usage-rolling.name": "滚动用量",
				"widget.usage-rolling.desc": "OpenCode Go 滚动窗口用量配额",
				"widget.usage-weekly.name": "每周用量",
				"widget.usage-weekly.desc": "OpenCode Go 每周用量配额",
				"widget.usage-monthly.name": "每月用量",
				"widget.usage-monthly.desc": "OpenCode Go 每月用量配额",
				"widget.cc-whoami.name": "账户",
				"widget.cc-whoami.desc": "当前 Command Code 账户身份（用户名 / 邮箱 / 组织）",
				"widget.peak-pricing.name": "峰谷定价",
				"widget.peak-pricing.desc": "DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间，工作日 09:00–12:00 与 14:00–18:00 为高峰）",
				"card.peak.title": "峰谷定价",
				"card.peak.window1": "上午 09:00–12:00",
				"card.peak.window2": "下午 14:00–18:00",
				"sim.peak": "高峰/低峰",
				"widget.sys-cpu.name": "CPU 状态",
				"widget.sys-cpu.desc": "本机 CPU 利用率与内存占用",
				"widget.cc-usage.name": "用量",
				"widget.cc-usage.desc": "账期内的请求数、成功率、Token 与消费摘要",
				"widget.sys-gpu.name": "GPU 状态",
				"widget.sys-gpu.desc": "本机 NVIDIA GPU 显存、利用率与温度",
				"widget.cc-credits.name": "额度",
				"widget.cc-credits.desc": "Credits 余额与 5h / 周额度窗口用量",
				"widget.sys-rings.name": "CPU·GPU 环图",
				"widget.sys-rings.desc": "CPU / GPU 利用率双环形图",
				"widget.cc-windows.name": "窗口",
				"widget.cc-windows.desc": "5h / 周 / 月 三窗口用量环图",
				"widget.sys-board.name": "系统监控",
				"widget.sys-board.desc": "CPU/内存/GPU 显存与利用率全指标环形看板",
				"widget.cc-subscription.name": "套餐",
				"widget.cc-subscription.desc": "当前套餐、状态与账期结束时间",
				"widget.sys-gpu-line.name": "GPU 利用率",
				"widget.sys-gpu-line.desc": "GPU 利用率折线（最近约 20 分钟）",
				"widget.cc-window-5h.name": "5h 窗口",
				"widget.cc-window-5h.desc": "5 小时额度窗口用量百分比与重置时间",
				"widget.cc-window-weekly.name": "周窗口",
				"widget.cc-window-weekly.desc": "周额度窗口用量百分比与重置时间",
				"widget.cc-window-monthly.name": "月窗口",
				"widget.cc-window-monthly.desc": "账期月额度用量百分比（已用 / 已用+剩余）与账期结束时间"
			},
			en: {
				"badge.opencode": "OpenCode Go Usage Quota",
				"usage.title": "OpenCode Usage",
				"usage.totalKey": "All Keys",
				"usage.cycleHint": "Click to cycle: {chain}",
				"usage.resets": "Resets {date}",
				"usage.rolling": "Rolling",
				"usage.week": "Week",
				"usage.month": "Month",
				"badge.commandcode": "Command Code Account Usage",
				"group.commandcode": "Command Code",
				"cc.notConfigured": "COMMANDCODE_API_KEY not configured (host auto-reads env / credentials, no manual entry)",
				"cc.unconfigured": "COMMANDCODE_API_KEY not configured — the host auto-reads env / $DSH_HOME/.credentials.yaml / .env; effective after a restart",
				"cc.unloaded": "dsh web not restarted — waiting for the host route (auto-refresh after restart)",
				"cc.unavailable": "Command Code service unavailable",
				"cc.account": "Account",
				"cc.tokens": "tokens",
				"cc.requests": "requests",
				"cc.successRate": "success",
				"cc.spend": "Spend",
				"cc.credits": "credits",
				"cc.free": "Free",
				"cc.purchased": "Purchased",
				"cc.fiveHour": "5h",
				"cc.weekly": "Week",
				"cc.periodEnd": "Period ends",
				"cc.title": "Command Code",
				"cc.roleUsage": "Usage",
				"cc.roleCredits": "Credits",
				"cc.roleWindow": "Windows",
				"cc.rolePlan": "Plan",
				"cc.roleAccount": "Account",
				"cc.win5h": "5h window",
				"cc.winWeekly": "Weekly window",
				"cc.winMonthly": "Monthly window",
				"cc.resets": "Resets",
				"cc.cancelAtEnd": "Cancels at period end",
				"sysinfo.cpu": "CPU",
				"sysinfo.gpu": "GPU",
				"sysinfo.mem": "Memory",
				"sysinfo.vram": "VRAM",
				"sysinfo.memSub": "Mem {used} / {total}",
				"sysinfo.interval": "Refresh interval",
				"sysinfo.intervalCustom": "Custom",
				"sysinfo.intervalCustomValue": "Custom interval (s)",
				"sysinfo.noGpu": "No NVIDIA GPU detected",
				"sysinfo.waiting": "Waiting for device data…",
				"sysinfo.bigMetric": "Big figure",
				"sysinfo.bigVram": "VRAM (GB)",
				"sysinfo.bigTemp": "Temp (°C)",
				"sysinfo.bigUtil": "Utilization (%)",
				"sysinfo.bigMem": "Memory (GB)",
				"sysinfo.bigHint": "Click to cycle the big figure: {chain}",
				"sysinfo.points": "Sparkline samples",
				"widget.counts.name": "Turns · Steps",
				"widget.counts.desc": "Turns and steps of the current session",
				"card.counts.value": "{turns} turns · {steps} steps",
				"widget.llm.name": "LLM Time",
				"widget.llm.desc": "Cumulative model inference time",
				"widget.tool.name": "Tool Calls",
				"widget.tool.desc": "Cumulative tool call time",
				"widget.ttft.name": "Avg TTFT",
				"widget.ttft.desc": "Average first-token latency",
				"widget.tps.name": "Rate",
				"widget.tps.desc": "Decode throughput speed",
				"widget.cache.name": "Cache Hit",
				"widget.cache.desc": "Input cache hit ratio",
				"widget.tokens.name": "Tokens",
				"widget.tokens.desc": "Input & output token counts",
				"widget.context.name": "Compact",
				"widget.context.desc": "Context usage percent; top-right button compacts after two taps",
				"card.context.title": "Compact",
				"card.context.waiting": "Waiting for context data",
				"card.context.compact": "Compact",
				"card.context.confirm": "Confirm",
				"widget.context-water.name": "Context Level",
				"widget.context-water.desc": "System/tools/messages share as a segmented bar",
				"card.contextWater.title": "Context Used",
				"card.contextWater.system": "System prompt",
				"card.contextWater.tools": "Tools",
				"card.contextWater.messages": "Messages",
				"widget.task.name": "Tasks",
				"widget.task.desc": "Counts of in-progress / completed / pending tasks",
				"card.task.done": "{n} done",
				"card.task.none": "No tasks",
				"card.task.sub": "{doing} in progress · {pending} pending",
				"widget.trajectory.name": "Trajectory",
				"widget.trajectory.desc": "The official 轨迹 rail as a card: one colored bar per input / model / tool beat, rolling right as the model keeps calling tools",
				"card.trajectory.legend": "In {input}  Model {model}  Tool {tool}",
				"card.trajectory.input": "Input",
				"card.trajectory.model": "Model",
				"card.trajectory.tool": "Tool",
				"config.laneSizing": "Lane Width",
				"config.laneSizing.time": "By duration",
				"config.laneSizing.equal": "Equal width",
				"widget.quote.name": "Daily Quote",
				"widget.quote.desc": "Shows a custom sentence you typed (hidden while empty)",
				"card.quote.title": "Daily Quote",
				"config.quoteText": "Quote Text",
				"config.showTitle": "Show Title",
				"config.align": "Horizontal Align",
				"config.valign": "Vertical Position",
				"config.wrap": "Allow Wrap",
				"quote.previewPlaceholder": "(shown after you type a quote)",
				"widget.heatmap.name": "Token Heatmap",
				"widget.heatmap.desc": "Daily token usage heatmap (self-accounted). 2×2 shows a ~3-month calendar, 2×4 the ~half-year history; switch size in the market",
				"card.heatmap.title": "Token Usage",
				"config.monthMode": "Window Alignment",
				"config.monthMode.rolling": "Rolling (today right)",
				"config.monthMode.quarter": "Quarter-aligned",
				"config.timeZone": "Accounting Timezone",
				"config.timeZone.beijing": "Beijing (UTC+8)",
				"config.timeZone.local": "Follow system",
				"widget.heatmap-bars.name": "Token Bars",
				"widget.heatmap-bars.desc": "Vertical bars of the last 7 days of token usage; same height as the calendar view",
				"config.monthMode.rolling7": "Rolling (last 7 days)",
				"config.monthMode.weekly": "Weekly aligned",
				"widget.quota-manage.name": "Quota Manager",
				"widget.quota-manage.desc": "Projects the month-end usage percent from the billing period's pace, with today's tokens vs the recommended budget",
				"widget.quota-manage.periodEnd": "Ends {m}-{d}",
				"widget.quota-manage.used": "Today",
				"widget.quota-manage.recommend": "Budget",
				"widget.quota-manage.insufficient": "No data",
				"widget.quota-manage.simToggle": "Over budget",
				"widget.usage-bars.name": "Usage Bars",
				"widget.usage-bars.desc": "OpenCode rolling/weekly/monthly usage bars",
				"widget.usage-rings.name": "Usage Rings",
				"widget.usage-rings.desc": "OpenCode rolling/weekly/monthly usage rings",
				"widget.usage-rolling.name": "Rolling Usage",
				"widget.usage-rolling.desc": "OpenCode Go rolling-window usage quota",
				"widget.usage-weekly.name": "Weekly Usage",
				"widget.usage-weekly.desc": "OpenCode Go weekly usage quota",
				"widget.usage-monthly.name": "Monthly Usage",
				"widget.usage-monthly.desc": "OpenCode Go monthly usage quota",
				"widget.cc-whoami.name": "Account",
				"widget.cc-whoami.desc": "Current Command Code account identity (name / email / org)",
				"widget.peak-pricing.name": "Peak Pricing",
				"widget.peak-pricing.desc": "DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00 are peak)",
				"card.peak.title": "Peak Pricing",
				"card.peak.window1": "Morning 09:00–12:00",
				"card.peak.window2": "Afternoon 14:00–18:00",
				"sim.peak": "Peak/Off-Peak",
				"widget.sys-cpu.name": "CPU Status",
				"widget.sys-cpu.desc": "Local CPU utilization and memory usage",
				"widget.cc-usage.name": "Usage",
				"widget.cc-usage.desc": "Requests, success rate, tokens and spend for the billing period",
				"widget.sys-gpu.name": "GPU Status",
				"widget.sys-gpu.desc": "Local NVIDIA GPU VRAM, utilization and temperature",
				"widget.cc-credits.name": "Credits",
				"widget.cc-credits.desc": "Credit balance with 5h / weekly window usage",
				"widget.sys-rings.name": "CPU · GPU Rings",
				"widget.sys-rings.desc": "CPU / GPU utilization twin rings",
				"widget.cc-windows.name": "Windows",
				"widget.cc-windows.desc": "5h / weekly / monthly usage as rings",
				"widget.sys-board.name": "System Monitor",
				"widget.sys-board.desc": "CPU / memory / GPU VRAM and utilization dashboard rings",
				"widget.cc-subscription.name": "Plan",
				"widget.cc-subscription.desc": "Current plan, status and billing period end",
				"widget.sys-gpu-line.name": "GPU Utilization",
				"widget.sys-gpu-line.desc": "GPU utilization sparkline (last ~20 min)",
				"widget.cc-window-5h.name": "5h window",
				"widget.cc-window-5h.desc": "5-hour quota window usage percent and reset time",
				"widget.cc-window-weekly.name": "Weekly window",
				"widget.cc-window-weekly.desc": "Weekly quota window usage percent and reset time",
				"widget.cc-window-monthly.name": "Monthly window",
				"widget.cc-window-monthly.desc": "Billing-period usage percent (used / used+remaining) and period end"
			}
		};
		//#endregion
		//#region src/client/lib/heatmap-accounting.ts
		/**
		* dsh-widgets — token heatmap day data (shared data provider).
		*
		* TWO SOURCES, ONE DISPLAYED NUMBER:
		*  1. AUTHORITATIVE (preferred): the host route `/api/widgets-usage-daily`
		*     re-serves dsh-usage-center's per-day totals, which are folded from the
		*     session logs. The shell's collector stores that map in `state.usageDaily`
		*     and the cards render it as-is — this is why the heatmap total now equals
		*     the usage center's total instead of drifting from it.
		*  2. FALLBACK (standalone installs, usage-center absent): this module's own
		*     live per-step accounting, accumulated in localStorage while a page with an
		*     active session is open.
		*
		* This module owns the fallback's persistence primitives, the timezone-aware day
		* attribution, the grid builder, and the boot-time purge of days older builds
		* fabricated. Shared by the `heatmap` and `heatmap-bars` widget units (each
		* derives its own grid from the same raw log).
		*/
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
		function dateKey(d, tz) {
			const tzName = tz || "Asia/Shanghai";
			if (tzName !== "local") try {
				return new Intl.DateTimeFormat("en-CA", { timeZone: tzName }).format(d);
			} catch {}
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
		function buildHeatmapGrid(m, mode = "rolling", tz) {
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
					const k = dateKey(d, tz);
					row.push({
						value: m[k] ?? 0,
						date: k
					});
				}
				grid.push(row);
			}
			return grid;
		}
		/**
		* Boot-time store preparation: load the log and drop the fabricated days older
		* builds wrote into it.
		*
		* WHY THE PURGE EXISTS. Earlier versions seeded "recovered history" as literal
		* constants (v1.1.x `seedHeatmapIfNeeded`, later `HEATMAP_RECOVERED`). Those
		* constants were never derived from the logs — measured 2026-09-12, the store
		* held 244.19M / 1639.55M / 1319.26M for 2026-08-14/15/16 while the real totals
		* were 75.24M / 373.37M / 1204.72M, i.e. the card reported 7.72G against a true
		* 6.28G (+23%).
		*
		* The live path is now the AUTHORITATIVE per-day table served by the host
		* (`/api/widgets-usage-daily`, read from dsh-usage-center when installed — see
		* src/index.ts); this browser-local log is only the standalone fallback. Since a
		* fallback may not carry fiction, the baked-in days are removed once so the
		* fallback shows nothing rather than something wrong. Live-accumulated days
		* (2026-08-22 onward) are untouched: only the baked date list is cleared.
		*
		* @returns the cleaned daily log.
		*/
		const BAKED_DAYS_PURGE_KEY = "harness-widgets.heatmap.baked-purge-v1";
		/** The exact days old builds fabricated values for (never measured). */
		const BAKED_DAYS = [
			"2026-08-14",
			"2026-08-15",
			"2026-08-16",
			"2026-08-17",
			"2026-08-18",
			"2026-08-19",
			"2026-08-20",
			"2026-08-21"
		];
		function loadHeatmapStore() {
			const store = loadHeatmap();
			try {
				if (localStorage.getItem(BAKED_DAYS_PURGE_KEY) !== null) return store;
				const next = { ...store };
				let dropped = false;
				for (const day of BAKED_DAYS) if ((next[day] ?? 0) > 0) {
					delete next[day];
					dropped = true;
				}
				localStorage.setItem(BAKED_DAYS_PURGE_KEY, "1");
				if (dropped) saveHeatmap(next);
				return next;
			} catch {
				return store;
			}
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
		/**
		* Merge the live local counter into the authoritative day map — TODAY ONLY.
		*
		* The authoritative map is folded from the session logs on usage-center's own
		* cadence (~30 s), so right after a turn it still carries the PREVIOUS figure
		* and the card looks frozen even though the finished step's usage is already
		* measurable locally. Today therefore keeps the LARGER of the two; every other
		* day stays purely authoritative, because this browser only ever sees the
		* sessions it had open and must never rewrite the account's history.
		*
		* @param authoritative - the host's day map, or null/undefined when absent.
		* @param local - the live local counter (this browser's per-step credits).
		* @param todayKey - today in the accounting timezone.
		* @returns the map the cards should render.
		*/
		function mergeToday(authoritative, local, todayKey) {
			if (authoritative === null || authoritative === void 0) return local;
			const localToday = local[todayKey] ?? 0;
			return localToday > (authoritative[todayKey] ?? 0) ? {
				...authoritative,
				[todayKey]: localToday
			} : authoritative;
		}
		const HEATMAP_SEEN = "harness-widgets.heatmap.seen";
		const HEATMAP_SEEN_STRONGEST = "harness-widgets.heatmap.strongest";
		const HEATMAP_ANCHOR = "harness-widgets.heatmap.anchor";
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
		/** Realistic non-zero preview stats so every card renders (none return null). */
		/** Raw preview usage log: derived once so BOTH the 2×2 grid and the 2×4 / bar
		*  variants share exactly the same source the real collector uses. */
		const PREVIEW_RAW = (() => {
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
		})();
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
			commandCode: {
				whoami: {
					success: true,
					user: {
						id: "usr_demo",
						name: "Physicolor",
						email: "demo@example.com",
						userName: "Physicolor"
					},
					org: null
				},
				usage: {
					totalCount: 4821,
					totalCost: .467622536,
					averageCost: .0079258,
					successRate: 100,
					completedCount: 4821,
					failedCount: 0,
					totalTokensIn: 4896670,
					totalTokensOut: 28435,
					totalTokens: 4925105,
					totalCredits: .467622536,
					totalMonthlyCredits: .467622536,
					periodBasis: "billing-period"
				},
				credits: {
					credits: {
						belowThreshold: false,
						creditThreshold: 0,
						monthlyCredits: 69.163327664,
						purchasedCredits: 0,
						freeCredits: 0
					},
					windowLimits: {
						limited: true,
						exceeded: null,
						fiveHour: {
							used: .836672336,
							cap: 14,
							exceeded: false,
							resetAt: 1789039577701
						},
						weekly: {
							used: .836672336,
							cap: 35,
							exceeded: false,
							resetAt: 1789626377701
						}
					}
				},
				subscription: {
					success: true,
					data: {
						id: "sub_demo",
						status: "active",
						planId: "individual-goat",
						priceId: "price_demo",
						quantity: 1,
						cancelAtPeriodEnd: false,
						currentPeriodStart: "2026-09-10T04:42:28.000Z",
						currentPeriodEnd: "2026-10-10T04:42:28.000Z",
						endedAt: null,
						canceledAt: null
					}
				}
			},
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
					content: "Split plan tasks",
					status: "in_progress"
				},
				{
					content: "Feed context data",
					status: "completed"
				},
				{
					content: "Write config form",
					status: "completed"
				},
				{
					content: "Polish hover animation",
					status: "pending"
				},
				{
					content: "Publish npm",
					status: "pending"
				}
			],
			heatmapGrid: buildRollingGrid(PREVIEW_RAW, 13),
			heatmapRaw: PREVIEW_RAW,
			armedAction: null,
			trajectory: Array.from({ length: 30 }, (_, i) => {
				const kind = [
					"input",
					"model",
					"tool",
					"model",
					"tool",
					"model",
					"input",
					"model",
					"tool",
					"tool"
				][i * 7 % 10];
				return {
					kind,
					ms: kind === "input" ? 0 : Math.round(kind === "model" ? 600 + i * 977 % 3400 : 200 + i * 613 % 8800)
				};
			}),
			sysinfo: {
				ts: 0,
				cpu: { util: 43 },
				mem: {
					used: 17.4 * 1024 ** 3,
					total: 34.2 * 1024 ** 3,
					percent: 51
				},
				gpu: {
					name: "NVIDIA GeForce RTX 5070 Ti Laptop GPU",
					temp: 58,
					util: 8,
					memUsed: 4815 * 1024 ** 2,
					memTotal: 12227 * 1024 ** 2,
					memPercent: 39
				},
				history: (() => {
					const now = Date.now();
					const ts = [];
					const cpu = [];
					const gpu = [];
					for (let i = 0; i < 30; i++) {
						ts.push(now - (29 - i) * 1e4);
						cpu.push(Math.max(5, Math.min(85, Math.round(43 + Math.sin(i / 3) * 18 + i % 5 * 2))));
						gpu.push(Math.max(0, Math.min(70, Math.round(i >= 20 ? 38 + Math.cos(i) * 12 : 6 + Math.sin(i / 2) * 4))));
					}
					return {
						ts,
						cpu,
						gpu
					};
				})()
			}
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
		/** 对话轨迹 lane colors — EXACTLY the official 轨迹 timeline's three lanes
		*  (TrajectoryTimeline.module.css `[data-timeline-span=…]`): 输入 = business
		*  primary, 模型 = the assistant span's decoding color (brand blue 60% mixed
		*  with the error red), 工具 = the warn label. Keeping the expressions (not
		*  resolved hex) means the card follows light/dark and future token changes. */
		const LANE_TONES = {
			input: "var(--dsw-alias-state-business-primary)",
			model: "color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 60%, var(--dsw-alias-state-error-secondary))",
			tool: "var(--dsw-alias-state-warn-label)"
		};
		/** Lane draw order, top→bottom — the SAME order as the subtitle's counts
		*  (输入 / 模型 / 工具), which is also the official 轨迹 rail's order. */
		const LANE_ORDER = [
			"input",
			"model",
			"tool"
		];
		/** The trajectory window is a FIXED slot count: bars keep a constant width as
		*  the window rolls (newest entering at the right), instead of the whole row
		*  re-scaling every time a beat arrives. Until the window fills, the beats SHARE
		*  the lane instead (n beats → 100/n % each), so a lone segment owns its lane. */
		const LANE_SLOTS = 30;
		/** The lane block's height as a fraction of the card side: "at most up to the
		*  50% line" — the chart lives in the card's middle/lower band and leaves a
		*  clear gap under the title+subtitle row instead of filling the whole card. */
		const LANE_HEIGHT_RATIO = .5;
		function ChartBlock({ chart, side, width }) {
			const scale = side / BASE_SIDE$1;
			const h = Math.round(56 * scale);
			if (chart.kind === "bars" && chart.bars) {
				const items = chart.bars.map((b, i) => {
					const ratio = Math.max(0, Math.min(1, b.ratio ?? b.value / (chart.max ?? 100)));
					const tone = CHART_TONES[b.tone ?? "primary"] ?? CHART_TONES.primary;
					const pct = Math.round(b.value ?? ratio * 100);
					return react.createElement("div", {
						key: i,
						title: `${b.label} ${pct}%`,
						style: {
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 4
						}
					}, react.createElement("div", { style: {
						width: "100%",
						height: `${h}px`,
						display: "flex",
						alignItems: "flex-end",
						justifyContent: "center"
					} }, react.createElement("div", { style: {
						width: "60%",
						height: `${Math.max(2, Math.round(h * ratio))}px`,
						borderRadius: 5,
						background: tone,
						opacity: ratio >= .95 ? .9 : .85
					} })), react.createElement("div", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)",
						whiteSpace: "nowrap"
					} }, b.label));
				});
				const gridLines = [
					.25,
					.5,
					.75
				].map((p) => react.createElement("div", {
					key: p,
					"aria-hidden": true,
					style: {
						position: "absolute",
						left: 0,
						right: 0,
						top: `${h * (1 - p)}px`,
						borderTop: "1px dashed var(--dsw-alias-label-tertiary)",
						opacity: .3,
						pointerEvents: "none"
					}
				}));
				return react.createElement("div", { style: { position: "relative" } }, ...gridLines, react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-end",
					gap: 4,
					position: "relative"
				} }, items));
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
						whiteSpace: "nowrap",
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
			if (chart.kind === "lanes" && chart.lanes) {
				const lanes = chart.lanes;
				const n = lanes.length;
				const timeMode = chart.laneSizing !== "equal" && lanes.some((l) => (l.ms ?? 0) > 0);
				const spans = [];
				if (timeMode) {
					const total = lanes.reduce((sum, l) => sum + Math.max(0, l.ms ?? 0), 0) || 1;
					let acc = 0;
					for (const l of lanes) {
						const w = Math.max(0, l.ms ?? 0) / total * 100;
						spans.push([acc, w]);
						acc += w;
					}
				} else {
					const slotPct = 100 / Math.max(1, Math.min(LANE_SLOTS, n));
					for (let i = 0; i < n; i++) spans.push([i * slotPct, slotPct]);
				}
				const rows = LANE_ORDER.map((kind) => {
					const segs = lanes.map((l, i) => ({
						l,
						i
					})).filter((e) => e.l.kind === kind).map((e) => react.createElement("div", {
						key: e.i,
						className: "dsx-lane-seg",
						title: e.l.label,
						style: {
							position: "absolute",
							left: `${spans[e.i][0].toFixed(4)}%`,
							width: `calc(${spans[e.i][1].toFixed(4)}% - 1px)`,
							minWidth: 2,
							top: 0,
							bottom: 0,
							borderRadius: 2,
							background: LANE_TONES[kind] ?? LANE_TONES.input,
							opacity: .9
						}
					}));
					return react.createElement("div", {
						key: kind,
						className: "dsx-lane-row",
						style: {
							position: "relative",
							flex: 1,
							minHeight: 0
						}
					}, ...segs);
				});
				return react.createElement("div", {
					className: "dsx-lanes",
					style: {
						width: "100%",
						height: `${Math.round(side * LANE_HEIGHT_RATIO)}px`,
						display: "flex",
						flexDirection: "column",
						gap: Math.max(3, Math.round(4 * scale))
					}
				}, ...rows);
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
							fontSize: `${Math.round(12 * scale)}px`,
							lineHeight: 1.2
						}
					}, react.createElement("span", { style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						minWidth: 0,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
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
						whiteSpace: "nowrap",
						flex: "none",
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
					margin: "8px 0 6px",
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
			if (chart.kind === "rings" && chart.rings && chart.rings.length) {
				const pad = Math.round(8 * scale);
				const mg = Math.round(12 * scale);
				const avail = (width ?? side) - 2 * pad;
				const r = Math.max(10, Math.min(24 * scale, (avail - (chart.rings.length - 1) * mg) / (chart.rings.length * 2)));
				const sw = Math.max(3.5, Math.round(5 * scale));
				const items = chart.rings.map((rg, i) => {
					const p = Math.max(0, Math.min(1, rg.ratio ?? rg.value / (chart.max ?? 100)));
					const c = 2 * Math.PI * (r - sw / 2);
					const tone = CHART_TONES[rg.tone ?? "primary"] ?? CHART_TONES.primary;
					const hasLabel = typeof rg.label === "string" && rg.label.length > 0;
					const dec = typeof rg.decimals === "number" && Number.isFinite(rg.decimals) ? Math.max(0, Math.min(2, Math.trunc(rg.decimals))) : 0;
					const valueText = `${rg.value.toFixed(dec)}%`;
					const labelRow = hasLabel ? react.createElement("div", { style: {
						display: "flex",
						alignItems: "baseline",
						gap: 3,
						whiteSpace: "nowrap",
						maxWidth: "100%"
					} }, react.createElement("span", { style: {
						fontSize: `${Math.round(11 * scale)}px`,
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1
					} }, valueText), react.createElement("span", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)",
						lineHeight: 1,
						overflow: "hidden",
						textOverflow: "ellipsis"
					} }, rg.label)) : react.createElement("div", { style: {
						fontSize: `${Math.round(11 * scale)}px`,
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1,
						whiteSpace: "nowrap"
					} }, valueText);
					return react.createElement("div", {
						key: i,
						title: `${rg.name ?? rg.label} ${valueText}`,
						style: {
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: Math.round(4 * scale)
						}
					}, react.createElement("svg", {
						width: Math.round(r * 2),
						height: Math.round(r * 2),
						viewBox: `0 0 ${Math.round(r * 2)} ${Math.round(r * 2)}`,
						"aria-hidden": true
					}, react.createElement("circle", {
						cx: r,
						cy: r,
						r: r - sw / 2,
						fill: "none",
						stroke: "var(--dsw-alias-interactive-bg-hover)",
						strokeWidth: sw
					}), react.createElement("circle", {
						cx: r,
						cy: r,
						r: r - sw / 2,
						fill: "none",
						stroke: tone,
						strokeWidth: sw,
						strokeDasharray: `${c * p} ${c}`,
						transform: `rotate(-90 ${r} ${r})`,
						strokeLinecap: "round"
					})), labelRow);
				});
				return react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-end",
					gap: mg
				} }, items);
			}
			if (chart.kind === "line" && chart.line) {
				const labelH = Math.round(10 * scale);
				const max = Math.max(1, chart.line.max ?? 100);
				const vals = chart.line.values;
				const W = Math.max(1, vals.length - 1);
				const X = (i) => W === 0 ? 0 : i / W * 100;
				const Y = (v) => 100 - Math.max(0, Math.min(max, v)) / max * 100;
				const segs = [];
				let cur = [];
				vals.forEach((v, i) => {
					if (v === null || v === void 0 || !Number.isFinite(v)) {
						if (cur.length > 1) {
							segs.push(cur);
							cur = [];
						}
						return;
					}
					cur.push([X(i), Y(v)]);
				});
				if (cur.length > 1) segs.push(cur);
				const tone = "var(--dsw-alias-state-business-primary)";
				const fill = "color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)";
				const areaPaths = segs.map((seg, si) => {
					const d = seg.map(([x, y], pi) => `${pi === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") + ` L${seg[seg.length - 1][0].toFixed(2)} 100 L${seg[0][0].toFixed(2)} 100 Z`;
					return react.createElement("path", {
						key: `a${si}`,
						d,
						fill,
						stroke: "none"
					});
				});
				const polylines = segs.map((seg, si) => react.createElement("polyline", {
					key: `p${si}`,
					points: seg.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
					fill: "none",
					stroke: tone,
					strokeWidth: Math.max(1, Math.round(1.6 * scale)),
					strokeLinejoin: "round",
					strokeLinecap: "round",
					vectorEffect: "non-scaling-stroke"
				}));
				const labels = chart.line.labels ?? ["", ""];
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 3,
					minHeight: 0,
					flex: 1
				} }, react.createElement("div", { style: {
					flex: 1,
					minHeight: 0,
					overflow: "hidden"
				} }, react.createElement("svg", {
					width: "100%",
					height: "100%",
					viewBox: "0 0 100 100",
					preserveAspectRatio: "none",
					"aria-hidden": true
				}, ...areaPaths, ...polylines)), react.createElement("div", { style: {
					display: "flex",
					justifyContent: "space-between",
					minHeight: labelH,
					flex: "none",
					fontSize: `${Math.round(9 * scale)}px`,
					color: "var(--dsw-alias-label-tertiary)",
					lineHeight: 1
				} }, react.createElement("span", { style: { whiteSpace: "nowrap" } }, labels[0]), react.createElement("span", { style: { whiteSpace: "nowrap" } }, labels[1])));
			}
			if (chart.kind === "figures" && chart.figures && chart.figures.length) {
				const last = chart.figures.length - 1;
				const items = chart.figures.map((f, i) => {
					const valColor = f.tone ? CHART_TONES[f.tone] ?? CHART_TONES.primary : "var(--dsw-alias-label-primary)";
					const align = i === 0 ? "flex-start" : i === last ? "flex-end" : "center";
					return react.createElement("div", {
						key: i,
						style: {
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: align,
							gap: Math.round(2 * scale)
						}
					}, react.createElement("div", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						color: "var(--dsw-alias-label-tertiary)",
						lineHeight: 1.2,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						maxWidth: "100%"
					} }, f.label), react.createElement("div", { style: {
						fontSize: `${Math.round(13 * scale)}px`,
						fontWeight: 600,
						color: valColor,
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1.2,
						whiteSpace: "nowrap"
					} }, f.value));
				});
				return react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: Math.round(8 * scale),
					width: "100%"
				} }, items);
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
						whiteSpace: "nowrap",
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
				if (kind === "primary") {
					st.background = "var(--dsw-alias-state-business-primary)";
					st.color = "#fff";
					st.borderColor = "transparent";
				} else if (kind === "danger") {
					st.background = "var(--dsw-alias-state-error-primary)";
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
		/**
		* Loading skeleton: the card frame plus rounded placeholder pills in the SAME
		* vertical rhythm as a real body (figure line, body rows), so the card's size
		* and shape are already correct while the data source is still in flight and
		* nothing re-flows when the real content lands.
		*
		* The TITLE stays real text: it comes from the widget descriptor (its name),
		* not from the data source, so it is already known — and a rail of tiles that
		* still say which widget they are reads as loading, while a rail of nameless
		* grey pills reads as broken. Only the DATA (figure + body) is placeholder.
		*/
		function SkeletonBody({ out, unit, width, rows = 2 }) {
			const scale = unit / BASE_SIDE$1;
			const boxW = width ?? unit;
			const count = Math.max(1, Math.min(4, Math.round(rows)));
			const pill = (key, w, h, mt) => react.createElement("div", {
				key,
				className: "dsx-sk",
				style: {
					width: w,
					height: `${h}px`,
					borderRadius: `${Math.max(3, Math.round(h / 2))}px`,
					marginTop: `${mt}px`
				}
			});
			return react.createElement("div", {
				className: "dsx-stats-card dsx-sk-card",
				style: {
					position: "relative",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
					borderRadius: `${Math.round(16 * scale)}px`,
					padding: `${Math.round(12 * scale)}px`
				}
			}, react.createElement("div", {
				className: "dsx-stats-card-title",
				style: {
					fontSize: `${Math.round(13 * scale)}px`,
					minWidth: 0
				}
			}, out.title), react.createElement("div", { style: {
				marginTop: "auto",
				display: "flex",
				flexDirection: "column",
				gap: Math.round(8 * scale)
			} }, pill("v", "44%", Math.round(20 * scale), 0), ...Array.from({ length: count }, (_, i) => pill(`r${i}`, `${Math.round(92 - i * 26)}%`, Math.round(10 * scale), 0))));
		}
		function CardBody({ out, unit, width, onAction, onCycle }) {
			const scale = unit / BASE_SIDE$1;
			const boxW = width ?? unit;
			const titlePx = Math.round(13 * scale);
			const valuePx = Math.round(20 * scale);
			const radius = Math.round(16 * scale);
			const innerPad = Math.round(12 * scale);
			const cyclable = out.cycle !== void 0;
			const [pressed, setPressed] = react.useState(false);
			const pressTimer = react.useRef(void 0);
			react.useEffect(() => () => {
				if (pressTimer.current !== void 0) window.clearTimeout(pressTimer.current);
			}, []);
			const pressDown = () => {
				if (!cyclable) return;
				setPressed(true);
				if (pressTimer.current !== void 0) window.clearTimeout(pressTimer.current);
				pressTimer.current = window.setTimeout(() => setPressed(false), 190);
			};
			if (out.skeleton) return react.createElement(SkeletonBody, {
				out,
				unit,
				width: boxW,
				rows: out.skeletonRows
			});
			const hasHeadRight = out.headRight !== void 0;
			const headValueTone = out.valueTone === "danger" || out.valuePulse === true;
			const titleLine = Math.round(titlePx * 1.2);
			const captionLine = Math.round(10 * scale * 1.2);
			const valueLine = Math.round(valuePx * 1.25);
			const rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0;
			const rightSpill = Math.max(0, rightLine - titleLine);
			const headEls = [react.createElement("div", {
				key: "t",
				className: "dsx-stats-card-title",
				style: {
					fontSize: `${titlePx}px`,
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 6,
					minHeight: `${titleLine}px`
				}
			}, react.createElement("span", { style: {
				minWidth: 0,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, out.title), hasHeadRight ? react.createElement("span", { style: {
				display: "inline-flex",
				alignItems: "baseline",
				gap: 6,
				flex: "none",
				marginBottom: rightSpill > 0 ? `${-rightSpill}px` : void 0
			} }, out.value != null ? react.createElement("span", {
				className: headValueTone ? "dsx-stats-card-value" + (out.valuePulse ? " dsx-value-pulse" : "") : void 0,
				style: {
					fontSize: `${valuePx}px`,
					fontWeight: 600,
					color: headValueTone ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-primary)",
					fontVariantNumeric: "tabular-nums",
					whiteSpace: "nowrap"
				}
			}, out.value) : null, out.headRight ? react.createElement("span", { style: {
				fontSize: `${Math.round(10 * scale)}px`,
				color: "var(--dsw-alias-label-tertiary)",
				fontWeight: 500,
				fontVariantNumeric: "tabular-nums",
				whiteSpace: "nowrap"
			} }, out.headRight) : null) : null)];
			if (out.headAfter) headEls.push(react.createElement("div", {
				key: "ha",
				className: "dsx-stats-card-headafter",
				style: {
					display: "flex",
					alignItems: "baseline",
					gap: 6,
					marginTop: `${Math.round(2 * scale)}px`,
					minWidth: 0,
					whiteSpace: "nowrap"
				}
			}, out.headAfter.big != null ? react.createElement("span", { style: {
				fontSize: `${valuePx}px`,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)",
				fontVariantNumeric: "tabular-nums",
				lineHeight: 1.25,
				whiteSpace: "nowrap"
			} }, out.headAfter.big) : null, out.headAfter.small != null ? react.createElement("span", { style: {
				fontSize: `${Math.round(10 * scale)}px`,
				color: "var(--dsw-alias-label-tertiary)",
				fontWeight: 500,
				fontVariantNumeric: "tabular-nums",
				whiteSpace: "nowrap",
				minWidth: 0,
				overflow: "hidden",
				textOverflow: "ellipsis"
			} }, out.headAfter.small) : null));
			if (out.legend) headEls.push(react.createElement("div", {
				key: "lg",
				className: "dsx-stats-card-legend",
				style: {
					fontSize: `${Math.round(10 * scale)}px`,
					color: "var(--dsw-alias-label-tertiary)",
					fontWeight: 500,
					fontVariantNumeric: "tabular-nums",
					marginTop: `${Math.round(2 * scale)}px`,
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis"
				}
			}, out.legend));
			if (out.meter && out.meter.length) headEls.push(react.createElement("div", {
				key: "mt",
				className: "dsx-stats-card-meter",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 3,
					marginTop: `${Math.round(4 * scale)}px`,
					minWidth: 0
				}
			}, out.meter.map((m, i) => react.createElement("div", {
				key: i,
				style: {
					fontSize: `${m.active ? Math.round(12 * scale) : Math.round(10 * scale)}px`,
					fontWeight: m.active ? 600 : 500,
					color: m.active ? "var(--dsw-alias-state-business-primary)" : "var(--dsw-alias-label-tertiary)",
					lineHeight: 1.2,
					fontVariantNumeric: "tabular-nums",
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					transition: "color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease"
				}
			}, m.label))));
			const head = headEls;
			const body = [];
			const stretchChart = out.chart?.kind === "line";
			if (out.value != null && out.headRight === void 0) body.push(react.createElement("div", {
				key: "v",
				className: "dsx-stats-card-value" + (out.valuePulse ? " dsx-value-pulse" : ""),
				style: {
					fontSize: `${valuePx}px`,
					color: out.valueTone === "danger" ? "var(--dsw-alias-state-error-primary)" : void 0
				}
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
				if (c) body.push(react.createElement("div", {
					key: "c",
					style: stretchChart ? {
						flex: 1,
						minHeight: 0,
						display: "flex",
						flexDirection: "column"
					} : void 0
				}, c));
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
			const footStyle = vj || out.headAfter || stretchChart ? {
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
				className: "dsx-stats-card" + (cyclable ? pressed ? " dsx-cyclable dsx-cycle-pressed" : " dsx-cyclable" : ""),
				style: {
					position: "relative",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
					height: stretchChart ? `${unit}px` : void 0,
					borderRadius: `${radius}px`,
					padding: `${innerPad}px`
				},
				title: out.cycle?.hint,
				onClick: cyclable ? () => {
					pressDown();
					if (onCycle) onCycle(out);
				} : void 0,
				onPointerDown: cyclable ? pressDown : void 0
			}, corner, head, react.createElement("div", {
				key: "foot",
				style: footStyle
			}, body), out.actions ? ActionsBlock({
				actions: out.actions,
				onAction,
				scale
			}) : null);
		}
		function OrderList({ items, onMove, onRemove, onSelect, selected }) {
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
				} }, widgetName(w)), react.createElement("span", { style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-tertiary)",
					flex: "none"
				} }, size === "2x4" ? "2×4" : "2×2"), react.createElement("span", { className: "dsx-badge" }, badgeOf(w)), onRemove ? react.createElement("button", {
					type: "button",
					className: "dsx-trash",
					"aria-label": t("order.removeAria"),
					title: t("order.removeTitle"),
					onClick: () => {
						if (onSelect && selected === id) onSelect("");
						onRemove(id);
					}
				}, react.createElement(TrashIcon)) : null);
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
					placeholder: fieldLabel(field),
					value: typeof value === "string" ? value : field.default ?? "",
					onChange: (e) => onChange(e.target.value)
				});
			}
			if (field.type === "toggle") {
				const on = typeof value === "boolean" ? value : field.default === true;
				return react.createElement("label", {
					className: "dsx-switch-row",
					title: fieldLabel(field)
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
					t("align.left"),
					t("align.center"),
					t("align.right")
				] : [
					t("align.top"),
					t("align.center"),
					t("align.bottom")
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
					title: fieldLabel(field),
					onChange: (e) => onChange(e.target.value)
				}, opts.map(([o, label]) => react.createElement("option", {
					key: o,
					value: o
				}, optionLabel([o, label]))));
			}
			return react.createElement(react.Fragment);
		}
		function ConfigTab({ controller }) {
			const { prefs, setPrefs } = controller;
			const [selected, setSelected] = react.useState("");
			const [previewSize, setPreviewSize] = react.useState("2x2");
			const [previewSim, setPreviewSim] = react.useState(null);
			react.useEffect(() => {
				setPreviewSim(null);
			}, [selected]);
			const toggleSim = () => {
				if (!selWidget || !widgetSimToggle(selWidget)) return;
				const base = previewSim ?? selWidget.example?.sim ?? {};
				const boolKey = Object.keys(base).find((k) => typeof base[k] === "boolean");
				if (!boolKey) {
					setPreviewSim({ ...base });
					return;
				}
				setPreviewSim({
					...base,
					[boolKey]: !base[boolKey]
				});
			};
			const installed = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1);
			const remove = (id) => {
				const cfg = { ...prefs.cardConfigs };
				delete cfg[id];
				setPrefs({
					installed: prefs.installed.filter((x) => x !== id),
					order: prefs.order.filter((x) => x !== id),
					cardConfigs: cfg
				});
			};
			const selKey = selected ? parseInstanceKey(selected) : null;
			const selWidget = selKey ? WIDGETS.find((x) => x.id === selKey.widgetId) : void 0;
			const selSize = selWidget && sizesOf(selWidget).includes(previewSize) ? previewSize : selKey?.size ?? "2x2";
			const selConfig = selWidget ? prefs.cardConfigs[selected] ?? {} : null;
			const effSim = previewSim ?? selWidget?.example?.sim ?? null;
			const previewOut = () => {
				if (!selWidget || !selConfig) return null;
				const ex = selWidget.example;
				const exStats = ex?.stats ? typeof ex.stats === "function" ? ex.stats(selConfig) : ex.stats : {};
				const stats = {
					...PREVIEW_STATS,
					...exStats,
					...selConfig
				};
				const sim = effSim && Object.keys(effSim).length > 0 ? effSim : void 0;
				try {
					return selWidget.render(stats, {
						size: selSize,
						...sim ? { sim } : {}
					});
				} catch (error) {
					console.error(`[dsh-widgets] preview render crashed for ${selWidget.id}:`, error);
					return null;
				}
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
			} }, t("config.addedCount", {
				added: installed.length,
				max: prefs.maxWidgets
			})), react.createElement(OrderList, {
				items: installed,
				onMove: (next) => setPrefs({ order: next }),
				onRemove: remove,
				onSelect: setSelected,
				selected
			}), selWidget && selConfig ? react.createElement("div", { style: {
				marginTop: 12,
				paddingTop: 12,
				borderTop: "1px solid var(--dsw-alias-border-l2)",
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0
			} }, react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8
			} }, react.createElement("div", { style: {
				flex: 1,
				fontSize: 14,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)"
			} }, t("config.preview", { name: widgetName(selWidget) })), sizesOf(selWidget).length > 1 ? react.createElement("select", {
				className: "dsx-select",
				style: {
					fontSize: 11,
					width: "auto"
				},
				value: selSize,
				title: t("config.cardSize"),
				onChange: (e) => setPreviewSize(e.target.value)
			}, sizesOf(selWidget).map((s) => react.createElement("option", {
				key: s,
				value: s
			}, s === "2x4" ? "2×4" : "2×2"))) : null), react.createElement("div", { style: {
				flex: 1,
				minHeight: 90,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "6px 8px 8px"
			} }, (() => {
				const u = 150;
				const isWide = selSize === "2x4";
				const pv = out ? react.createElement(CardBody, {
					out,
					unit: u,
					width: isWide ? 312 : void 0
				}) : null;
				const simTip = widgetSimToggle(selWidget) ? react.createElement("div", {
					key: "simtip",
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-label-tertiary)",
						marginTop: 8,
						textAlign: "center"
					}
				}, t("config.simTip", { label: widgetSimToggle(selWidget) })) : null;
				return out ? react.createElement("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						transform: isWide ? "scale(0.85)" : void 0,
						transformOrigin: "center center",
						cursor: widgetSimToggle(selWidget) ? "pointer" : void 0,
						userSelect: "none"
					},
					title: widgetSimToggle(selWidget) ? t("config.simTitle") : void 0,
					onClick: widgetSimToggle(selWidget) ? () => toggleSim() : void 0
				}, pv, simTip) : null;
			})()), selWidget.configSchema && selWidget.configSchema.length > 0 ? react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 4,
				paddingTop: 10
			} }, react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)"
			} }, t("config.custom")), selWidget.configSchema.map((f) => react.createElement("div", {
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
			} }, fieldLabel(f)), react.createElement("div", { style: {
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
			const [previewSim, setPreviewSim] = react.useState(null);
			react.useEffect(() => {
				setPreviewSim(null);
			}, [previewGroup, previewIdx]);
			const seen = /* @__PURE__ */ new Set();
			const list = WIDGETS.filter((w) => {
				const g = groupOf(w);
				if (seen.has(g)) return false;
				seen.add(g);
				return true;
			}).filter((w) => `${widgetName(w)} ${widgetDesc(w)} ${w.id}`.toLowerCase().indexOf(q.toLowerCase()) !== -1);
			const groupLabel = (w) => {
				const key = `group.${groupOf(w)}`;
				const label = t(key);
				return label === key ? widgetName(w) : label;
			};
			if (previewGroup !== null) {
				const instances = WIDGETS.filter((w) => groupOf(w) === previewGroup).flatMap((w) => sizesOf(w).map((s) => ({
					w,
					s
				})));
				const cur = instances[previewIdx] ?? instances[0];
				const w = cur?.w;
				const curSize = cur?.s ?? "2x2";
				const curKey = w ? instanceKey(w.id, curSize) : "";
				const installed = w ? prefs.installed.indexOf(curKey) !== -1 : false;
				const ex = w?.example;
				const exStats = ex?.stats ? typeof ex.stats === "function" ? ex.stats(prefs.cardConfigs?.[curKey] ?? {}) : ex.stats : {};
				const previewStats = {
					...PREVIEW_STATS,
					...exStats
				};
				const effSim = previewSim ?? ex?.sim ?? null;
				let out = null;
				if (w) try {
					out = w.render(previewStats, {
						size: curSize,
						...effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}
					});
				} catch (error) {
					console.error(`[dsh-widgets] market preview render crashed for ${w.id}:`, error);
					out = null;
				}
				const toggleSim = () => {
					if (!widgetSimToggle(w)) return;
					const base = previewSim ?? ex?.sim ?? {};
					const boolKey = Object.keys(base).find((k) => typeof base[k] === "boolean");
					if (!boolKey) {
						setPreviewSim({ ...base });
						return;
					}
					setPreviewSim({
						...base,
						[boolKey]: !base[boolKey]
					});
				};
				const add = () => {
					if (!w || installed || prefs.installed.length >= prefs.maxWidgets) return;
					setPrefs({
						installed: prefs.installed.concat(curKey),
						order: prefs.order.indexOf(curKey) === -1 ? prefs.order.concat(curKey) : prefs.order
					});
				};
				const prev = () => setPreviewIdx((previewIdx - 1 + instances.length) % instances.length);
				const next = () => setPreviewIdx((previewIdx + 1) % instances.length);
				const sizeBlocked = prefs.columns === 1 && curSize === "2x4";
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: 12,
					flex: 1,
					minHeight: 0,
					position: "relative"
				} }, react.createElement("div", { style: {
					display: "flex",
					alignItems: "center",
					gap: 8
				} }, react.createElement("button", {
					type: "button",
					className: "dsx-btn",
					onClick: () => setPreviewGroup(null)
				}, t("market.back")), react.createElement("div", { style: {
					flex: 1,
					minWidth: 0,
					display: "flex",
					alignItems: "center",
					gap: 8
				} }, react.createElement("span", { style: {
					fontSize: 14,
					fontWeight: 600,
					color: "var(--dsw-alias-label-primary)",
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					textDecoration: sizeBlocked ? "line-through" : void 0,
					opacity: sizeBlocked ? .75 : void 0
				} }, w ? `${widgetName(w)}${curSize === "2x4" ? " 2×4" : " 2×2"}` : ""), sizeBlocked ? react.createElement("span", { className: "dsx-size-warn" }, t("market.sizeBlocked")) : null), react.createElement("button", {
					type: "button",
					disabled: installed || sizeBlocked || prefs.installed.length >= prefs.maxWidgets,
					className: installed || sizeBlocked ? "dsx-btn" : "dsx-btn dsx-btn-primary",
					onClick: add,
					title: sizeBlocked ? t("market.sizeBlockedTitle") : void 0
				}, installed ? t("market.added") : t("market.add"))), !installed && prefs.installed.length >= prefs.maxWidgets ? react.createElement("div", { className: "dsx-limit-tip" }, t("market.limit", { max: prefs.maxWidgets })) : null, react.createElement("div", { style: {
					flex: 1,
					minHeight: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 12,
					padding: "0 4px"
				} }, react.createElement("button", {
					type: "button",
					className: "dsx-navbtn",
					"aria-label": t("market.prevAria"),
					onClick: prev
				}, react.createElement(ChevronLeftIcon)), react.createElement("div", { style: {
					width: 360,
					flex: "none",
					display: "flex",
					justifyContent: "center",
					alignItems: "center"
				} }, out ? react.createElement("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 8,
						transform: curSize === "2x4" ? "scale(0.85)" : void 0,
						transformOrigin: "center center",
						cursor: widgetSimToggle(w) ? "pointer" : void 0,
						userSelect: "none"
					},
					title: widgetSimToggle(w) ? t("config.simTitle") : void 0,
					onClick: widgetSimToggle(w) ? toggleSim : void 0
				}, react.createElement(CardBody, {
					out,
					unit: 200,
					width: curSize === "2x4" ? 412 : void 0
				}), w && widgetSimToggle(w) ? react.createElement("div", { style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-tertiary)",
					whiteSpace: "nowrap"
				} }, t("config.simTip", { label: widgetSimToggle(w) })) : null) : null), react.createElement("button", {
					type: "button",
					className: "dsx-navbtn",
					"aria-label": t("market.nextAria"),
					onClick: next
				}, react.createElement(ChevronRightIcon))), react.createElement("div", { style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 8
				} }, instances.map((inst, i) => react.createElement("button", {
					key: inst.w.id + "@" + inst.s,
					type: "button",
					className: i === previewIdx ? "dsx-dot dsx-dot-active" : "dsx-dot",
					"aria-label": `${widgetName(inst.w)} ${inst.s === "2x4" ? "2×4" : "2×2"}`,
					onClick: () => setPreviewIdx(i)
				}))));
			}
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement("input", {
				type: "search",
				placeholder: t("market.search"),
				className: "dsx-search",
				value: q,
				onChange: (e) => setQ(e.target.value)
			}), react.createElement("div", { className: "dsx-mlist" }, list.map((w) => {
				const gw = WIDGETS.filter((x) => groupOf(x) === groupOf(w));
				const instanceCount = gw.reduce((a, x) => a + sizesOf(x).length, 0);
				const anyInstalled = gw.some((x) => sizesOf(x).some((s) => prefs.installed.indexOf(instanceKey(x.id, s)) !== -1));
				return react.createElement("button", {
					key: w.id,
					type: "button",
					className: "dsx-mcard",
					"aria-pressed": anyInstalled,
					onClick: () => {
						setPreviewGroup(groupOf(w));
						setPreviewIdx(0);
					}
				}, react.createElement("span", { className: "dsx-mhead" }, react.createElement("span", { className: "dsx-mname" }, groupLabel(w)), react.createElement("span", { className: "dsx-badge" }, String(instanceCount))), react.createElement("span", { className: "dsx-mdesc" }, widgetDesc(w)), react.createElement("span", { className: "dsx-macts" }, react.createElement("span", { className: "dsx-btn" }, t("market.details")), react.createElement("span", { className: anyInstalled ? "dsx-btn dsx-btn-primary" : "dsx-btn" }, anyInstalled ? t("market.added") : t("market.add"))));
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
			} }, t("page.title")), react.createElement("div", { style: {
				fontSize: 13,
				lineHeight: "20px",
				color: "var(--dsw-alias-label-tertiary)"
			} }, t("page.desc"))), react.createElement("div", { className: "dsx-tabbar" }, react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "config",
				onClick: () => setTab("config")
			}, t("tab.config")), react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "market",
				onClick: () => setTab("market")
			}, t("tab.market")), react.createElement("button", {
				type: "button",
				className: "dsx-tab",
				"data-active": tab === "settings",
				onClick: () => setTab("settings")
			}, t("tab.settings"))), tab === "config" ? react.createElement(ConfigTab, { controller }) : tab === "market" ? react.createElement(MarketTab, {
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
				3,
				4
			].indexOf(prefs.columns) !== -1 ? prefs.columns : 2;
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column"
			} }, react.createElement(Row, {
				title: t("settings.columns.title"),
				desc: t("settings.columns.desc"),
				children: react.createElement("select", {
					className: "dsx-select",
					value: colValue,
					onChange: (e) => setPrefs({ columns: Number(e.target.value) })
				}, [
					1,
					2,
					3,
					4
				].map((c) => react.createElement("option", {
					key: c,
					value: c
				}, t("settings.columns.option", { n: c }))))
			}), react.createElement(Row, {
				title: t("settings.realtime.title"),
				desc: t("settings.realtime.desc"),
				children: react.createElement("label", { className: "dsx-switch-row" }, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: prefs.realTime,
					onChange: (e) => setPrefs({ realTime: e.target.checked })
				}), react.createElement("span", { className: "dsx-switch-track" }, react.createElement("span", { className: "dsx-switch-thumb" })))
			}), react.createElement(Row, {
				title: t("settings.magnify.title"),
				desc: t("settings.magnify.desc"),
				children: react.createElement(Slider, {
					min: 1,
					max: 1.4,
					step: .05,
					value: prefs.magnify,
					unit: "x",
					onChange: (v) => setPrefs({ magnify: v })
				})
			}), react.createElement(Row, {
				title: t("settings.padding.title"),
				desc: t("settings.padding.desc"),
				children: react.createElement(Slider, {
					min: 4,
					max: 40,
					value: prefs.panelPadding,
					unit: "px",
					onChange: (v) => setPrefs({ panelPadding: v })
				})
			}), react.createElement(Row, {
				title: t("settings.cardSide.title"),
				desc: t("settings.cardSide.desc"),
				children: react.createElement(Slider, {
					min: 100,
					max: 220,
					value: prefs.cardSide,
					unit: "px",
					onChange: (v) => setPrefs({ cardSide: v })
				})
			}), react.createElement(Row, {
				title: t("settings.panelWidth.title"),
				desc: t("settings.panelWidth.desc"),
				children: react.createElement(Slider, {
					min: 260,
					max: 760,
					value: prefs.panelWidth,
					unit: "px",
					onChange: (v) => setPrefs({ panelWidth: v })
				})
			}), react.createElement(Row, {
				title: t("settings.maxWidgets.title"),
				desc: t("settings.maxWidgets.desc"),
				children: react.createElement(Slider, {
					min: 1,
					max: 20,
					value: prefs.maxWidgets,
					unit: t("settings.maxWidgets.unit"),
					onChange: (v) => setPrefs({ maxWidgets: v })
				})
			}), react.createElement(Row, {
				title: t("settings.hideStatsLine.title"),
				desc: t("settings.hideStatsLine.desc"),
				children: react.createElement("label", { className: "dsx-switch-row" }, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: prefs.hideStatsLine,
					onChange: (e) => setPrefs({ hideStatsLine: e.target.checked })
				}), react.createElement("span", { className: "dsx-switch-track" }, react.createElement("span", { className: "dsx-switch-thumb" })))
			}));
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Harness Widgets —browser half entry.
		*
		* Registers the right-hand widget rail, the header capsule toggle, and the
		* two settings surfaces (General rows + the component-settings section). One shared bridge
		* holds the persisted prefs, the folded session stats, and the OpenCode usage
		* payload fetched from the Host's same-origin `/api/opencode-usage` route.
		*/
		const STORAGE_KEY = "harness-widgets.state";
		/** Local mirror of the last saved-at timestamp, compared against the host file
		*  on boot so the same DSH service converges from any browser origin
		*  (localhost vs 127.0.0.1 are different localStorage realms). */
		const SAVED_AT_KEY = "harness-widgets.state.savedAt";
		/** Same-origin host route holding the authoritative state file. */
		const STORE_API = "/api/widgets-state";
		const BASE_SIDE = 150;
		/**
		* The rail is a contextual utility strip INSIDE the conversation track, so the
		* only space it may claim is the margin the product's own transcript measure
		* leaves over —never the measure itself. Both numbers are published at runtime
		* by `ui-conversation` on the conversation root (verified 2026-09-17:
		* `--dsh-conversation-column-width: 1298px`, `--dsh-chat-content-width: 748px`
		* at a 1578px viewport), so the budget costs no geometry read:
		*
		*   budget = columnWidth –contentWidth
		*
		* The transcript is re-centred inside the remaining box, so pushing by more
		* than that budget shrinks the reading measure itself (measured before this
		* rule: 748px −554px at 1280 viewport, 394px at 1120 —below the official
		* `clamp(680px, — 920px)` floor).
		*/
		const RAIL_BUDGET_SAFETY = 24;
		/**
		* The transcript sits inside the scroll box with ~36px of side padding, and the
		* scroller itself is ~2px narrower than the track (measured 2026-09-17: at a
		* 1280 viewport the box was 800px and the prose 728px, i.e. 72px of inset; at
		* 1578 the prose stayed capped at its 748px measure). Without this term the
		* rail still shaved 20-50px off the measure.
		*/
		const RAIL_BOX_INSET = 74;
		/** Smallest card side the settings slider allows; below it the rail collapses. */
		const RAIL_MIN_SIDE = 100;
		/**
		* Card ROWS that must stay on screen at the AUTOMATIC FLOOR. The user's rule
		* (2026-09-18): the smallest size the rail may shrink a card to on its own is the
		* one where six rows still fit the window, with the last row's bottom gap equal
		* to the right gap. In the fluid layout this is the floor for the narrow
		* single-column case only (see readMinCardSide / resolveRailLayout).
		*/
		const RAIL_MIN_ROWS = 6;
		/**
		* Card ROWS that must stay on screen at the AUTOMATIC CEILING —and therefore
		* the hard upper bound on how far a card may grow past the user's base size
		* (user decision 2026-09-19, replacing the flat 1.35脳 multiplier, which read as
		* "way too big"): the largest allowed card is the one where FIVE rows still fit
		* the rail with the last row's bottom gap equal to the right gap. At a 1000px
		* window that is (936 –6 –5路24)/5 = 162px for a 150px base —an 8% growth
		* range instead of 35%, and it makes the deck's own height the thing that
		* decides, so a short window simply stops growing earlier.
		*/
		const RAIL_MAX_ROWS = 5;
		/**
		* Card-size TIER (px). Card size is NOT continuous: the fluid share is snapped
		* onto tiers of this width above the base size (150 −160 −170 —, each tier
		* change animated with a short spring —the iOS/iPadOS window-resize feel the
		* user asked for, with many more tiers. It also cuts the deck re-renders during
		* a live drag to one per tier crossed instead of one per 8px of budget.
		*/
		const CARD_SIZE_STEP = 10;
		/**
		* Conversation column width (px), 0 while the shell has not mounted it.
		*
		* Geometry first: the shell publishes --dsh-conversation-column-width a beat
		* AFTER a track transition settles, so a variable-only read can still see the
		* mid-flight column (measured 2026-09-17: closing the right panel left the
		* budget stuck at 0 because the read happened during that window).
		*/
		function readColumnWidth() {
			const columnEl = document.querySelector("[class$=\"_centerCol\"]");
			const measured = columnEl === null ? 0 : columnEl.getBoundingClientRect().width;
			if (measured > 0) return measured;
			const host = document.querySelector("[data-phase]") ?? columnEl;
			const cs = host === null ? null : getComputedStyle(host);
			return cs === null ? 0 : Number.parseFloat(cs.getPropertyValue("--dsh-conversation-column-width"));
		}
		/** Read the official transcript measure / column width off the conversation root. */
		function readRailBudget() {
			const host = document.querySelector("[data-phase]") ?? document.querySelector("[class$=\"_centerCol\"]");
			const columnEl = document.querySelector("[class$=\"_centerCol\"]");
			if (host === null && columnEl === null) return 0;
			const cs = host === null ? null : getComputedStyle(host);
			const content = cs === null ? NaN : Number.parseFloat(cs.getPropertyValue("--dsh-chat-content-width"));
			const columnW = readColumnWidth();
			if (!(columnW > 0)) return 0;
			const measure = Number.isFinite(content) && content > 0 ? content : Math.min(920, Math.max(680, columnW * .64));
			return Math.max(0, Math.round(columnW - measure - RAIL_BOX_INSET));
		}
		/**
		* The column width the shell is ANIMATING TOWARD.
		*
		* The AppFrame animates `grid-template-columns`, so its INLINE value is the
		* transition's target while the computed value interpolates (measured
		* 2026-09-17: 45ms into an open the inline read `280px minmax(0px, 1fr) 710px`
		* while the computed column was still 1293px). Reading the target is what lets
		* the rail yield ON THE SAME BEAT as the panel instead of after it: the two
		* motions then share one 0.3s curve instead of running one after the other.
		*/
		function readTargetColumnWidth() {
			const parts = (document.querySelector("[class$=\"_frame\"]")?.style.gridTemplateColumns ?? "").split(/\s+/).filter(Boolean);
			if (parts.length < 3) return null;
			const px = (token) => {
				const match = /^([\d.]+)px$/.exec(token);
				return match === null ? null : Number(match[1]);
			};
			const left = px(parts[0]);
			const right = px(parts[parts.length - 1]);
			if (left === null || right === null) return null;
			const width = window.innerWidth - left - right;
			return width > 0 ? width : null;
		}
		/**
		* Width of the right panel the shell is animating toward, read from the same
		* inline target: `0` means no panel is present (or it is on its way out), which
		* is what tells the rail whether it is being covered by a panel or merely has no
		* room. Falls back to the measured column so a drag (inline == current) works.
		*/
		function readTargetRightbarWidth() {
			const parts = (document.querySelector("[class$=\"_frame\"]")?.style.gridTemplateColumns ?? "").split(/\s+/).filter(Boolean);
			if (parts.length >= 3) {
				const match = /^([\d.]+)px$/.exec(parts[parts.length - 1]);
				if (match !== null) return Number(match[1]);
			}
			const column = document.querySelector("[class$=\"_rightbarCol\"]");
			return column === null ? 0 : Math.round(column.getBoundingClientRect().width);
		}
		/** Current right-column width (0 when no panel is on screen at all). */
		function measuredRightbarWidth() {
			const column = document.querySelector("[class$=\"_rightbarCol\"]");
			return column === null ? 0 : Math.round(column.getBoundingClientRect().width);
		}
		/** The rail's normal right inset: it follows the conversation column's right edge. */
		function railAnchorRight() {
			return ANCHOR_FOLLOW ? `anchor(--dsx-center right, ${RIGHTBAR_FALLBACK})` : RIGHTBAR_FALLBACK;
		}
		/**
		* Right inset every rail-owned fixed layer reads. Normal mode follows the column
		* (anchor positioning); while a panel is present the rail is pinned to the
		* viewport's right edge —the same value whenever no panel is open —so the
		* panel, which paints ABOVE the rail's conversation-scoped slot, covers it.
		*/
		function applyRailRight(swallowed) {
			const next = swallowed ? "0px" : railAnchorRight();
			const style = document.documentElement.style;
			if (style.getPropertyValue("--dsx-rail-right") === next) return;
			style.setProperty("--dsx-rail-right", next);
		}
		/** Panel width reached when fully open, held across one open/close gesture. */
		let engagedPanelW = 0;
		/**
		* Decide how the rail coexists with the right panel and the transcript measure.
		*
		* Resolution order: the preferred deck —what still fits the transcript's
		* leftover margin —if nothing does, the panel takes the space and the rail is
		* COVERED by it (the rail's slot is inside the conversation, which paints below
		* the right column), or hidden when there is no panel to do the covering.
		*/
		function resolveRailSpace(prefs, budget) {
			const pad = prefs.panelPadding;
			const layout = resolveRailLayout(prefs, budget, readMinCardSide(pad), readMaxCardSide(pad, prefs.cardSide));
			const columns = layout.constrained ? [
				1,
				2,
				3,
				4
			].indexOf(prefs.columns) !== -1 ? prefs.columns : 2 : layout.columns;
			const side = layout.constrained ? prefs.cardSide : layout.side;
			const drawW = columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2;
			const panelW = Math.max(readTargetRightbarWidth(), measuredRightbarWidth());
			const swallowed = panelW > 0;
			if (swallowed) engagedPanelW = Math.max(engagedPanelW, panelW);
			else engagedPanelW = 0;
			return {
				yielded: layout.constrained,
				swallowed,
				hidden: layout.constrained && !swallowed,
				right: swallowed ? "0px" : railAnchorRight(),
				drawW,
				shiftX: swallowed ? Math.max(0, drawW - engagedPanelW) : 0,
				claimW: layout.constrained ? 0 : drawW,
				side,
				columns,
				pad
			};
		}
		/** Budget implied by the track the frame is animating toward (null = unknown). */
		function predictRailBudget() {
			const column = readTargetColumnWidth();
			if (column === null) return null;
			const host = document.querySelector("[data-phase]");
			const cs = host === null ? null : getComputedStyle(host);
			const content = cs === null ? NaN : Number.parseFloat(cs.getPropertyValue("--dsh-chat-content-width"));
			const measure = Number.isFinite(content) && content > 0 ? content : Math.min(920, Math.max(680, column * .64));
			return Math.max(0, Math.round(column - measure - RAIL_BOX_INSET));
		}
		/**
		* Smallest card side the rail will shrink to on its own.
		*
		* In the fluid layout (see resolveRailLayout) this floor only applies to the
		* NARROW case —a single column whose `1fr` share falls below the base size —
		* and it is what separates "shrink and stay" from "yield entirely". It is
		* derived from the rail's own box via `rowFitSide`, not guessed; see
		* RAIL_MIN_ROWS for the derivation. The card-size slider goes down to
		* RAIL_MIN_SIDE (100), so a smaller explicit preference always wins.
		*/
		function readMinCardSide(pad) {
			return Math.max(RAIL_MIN_SIDE, rowFitSide(RAIL_MIN_ROWS, pad));
		}
		/**
		* The largest card side the rail may grow a card to on its own (see
		* RAIL_MAX_ROWS). An explicit base size larger than this is still honoured: the
		* ceiling only limits the AUTOMATIC growth, never the user's own preference.
		*/
		function readMaxCardSide(pad, base) {
			return Math.max(base, rowFitSide(RAIL_MAX_ROWS, pad));
		}
		/**
		* Card side at which `rows` card rows exactly fill the rail with the last row's
		* bottom gap equal to the right gap (both are `pad`):
		*
		*   rows路side + (rows –1)路pad + 2 (deck base) + 4 (rail top padding) + pad = railHeight
		*   side = (railHeight –6 –rows路pad) / rows
		*/
		function rowFitSide(rows, pad) {
			const rail = document.querySelector(".dsx-stats-rail");
			const innerH = rail !== null ? rail.clientHeight : Math.max(0, window.innerHeight - (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dsx-rail-top")) || 0));
			if (!(innerH > 0)) return RAIL_MIN_SIDE;
			return Math.floor((innerH - 6 - rows * pad) / rows);
		}
		/**
		* True when every installed tile is a 2脳4 (two cells wide).
		*
		* A 3-column deck fits only ONE of them per row (2 cells used, 1 wasted), so for
		* such a deck the automatic fill skips the 3-column stage and steps 2 ⇄4
		* (user decision 2026-09-18). An explicit 3-column preference is still honoured:
		* this only removes 3 from the DEGRADATION path below a 4-column preference.
		*/
		function allWideItems(prefs) {
			const keys = prefs.order.filter((key) => prefs.installed.indexOf(key) !== -1);
			if (keys.length === 0) return false;
			return keys.every((key) => parseInstanceKey(key).size === "2x4");
		}
		/**
		* The rail geometry that fits a budget —a fluid grid: the industry-standard
		* `grid-template-columns: repeat(auto-fill, minmax(base, 1fr))`, capped by the
		* user's column count and by the five-row ceiling (see readMaxCardSide).
		*
		*   columns = min(pref.columns, the most columns whose cells still hold `base`)
		*   side    = the leftover width shared by those columns, SNAPPED to
		*             CARD_SIZE_STEP tiers at or above `base`, then clamped to the
		*             ceiling (itself snapped onto the same tier grid)
		*
		* The two settings + the gap therefore compose into ONE rule:
		*
		*   side = clamp(autoFloor, tier((room –(n+1)路gap) / n), fiveRowCeiling)
		*
		* with `pref.columns` an UPPER BOUND (a wider window never opens more columns
		* than the user asked for —their decision 2026-09-19: "设置成 2 列，即便对话区
		* 域有多余的空间，也只排放 2 列) and `pref.cardSide` the BASE side, i.e. the
		* minimum track the deck is willing to call a card. Because `room` is read live
		* from the transcript measure, dragging the conversation width moves `side` on
		* the very same frame —as a tier hop, which is what the spring on the card
		* slots animates.
		*
		* Only when even a single column cannot hold the base size does the card shrink,
		* and only below the automatic floor does the rail collapse (prefs untouched, so
		* widening the window brings it straight back).
		*
		* Why the older rule went: "keep the column count, shrink the card to fit" pinned
		* every card at exactly the base size across wide budget ranges (measured
		* 2026-09-19 at 1578脳1000: `side` stayed 150px while the budget moved
		* 372−89px), which is the reported "the widgets do not resize while I drag the
		* conversation width".
		*/
		function resolveRailLayout(prefs, budget, minSide, maxSide) {
			const pad = prefs.panelPadding;
			const base = prefs.cardSide;
			const maxCols = [
				1,
				2,
				3,
				4
			].indexOf(prefs.columns) !== -1 ? prefs.columns : 2;
			const widthOf = (columns, side) => columns > 1 ? columns * side + (columns + 1) * pad : side + pad * 2;
			if (!(budget >= 0)) return {
				side: base,
				columns: maxCols,
				railW: widthOf(maxCols, base),
				constrained: false
			};
			const room = Math.max(0, budget - RAIL_BUDGET_SAFETY);
			let columns = 1;
			while (columns < maxCols && widthOf(columns + 1, base) <= room) columns++;
			if (columns === 3 && maxCols > 3 && allWideItems(prefs)) columns = 2;
			const fluid = columns > 1 ? Math.floor((room - (columns + 1) * pad) / columns) : Math.floor(room - pad * 2);
			if (fluid < base) {
				const tiered = base + Math.floor((fluid - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP;
				if (tiered < minSide) return {
					side: base,
					columns: 1,
					railW: 0,
					constrained: true
				};
				return {
					side: tiered,
					columns: 1,
					railW: widthOf(1, tiered),
					constrained: false
				};
			}
			const ceiling = base + Math.floor((maxSide - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP;
			const side = Math.min(base + Math.floor((fluid - base) / CARD_SIZE_STEP) * CARD_SIZE_STEP, ceiling);
			return {
				side,
				columns,
				railW: widthOf(columns, side),
				constrained: false
			};
		}
		/**
		* Whether the rail can follow the shell's column track NATIVELY through CSS
		* anchor positioning (`right: anchor(--dsx-center right)`) instead of being
		* repositioned from JS every frame. Both the rail and its magnify overlay are
		* `position: fixed` and the anchor is the AppFrame's center column
		* (`[class$='_centerCol']`, declared in widgets.module.css), so the browser
		* resolves the rail's right edge inside the very layout pass that animates
		* `grid-template-columns`: the rail and the conversation column move as ONE
		* surface —no tween, no frame lag, and none of the per-frame
		* `--dsx-rightbar-w` writes (a :root style invalidation, i.e. a full-document
		* style recalc every animation frame) the fallback path needs.
		*/
		const ANCHOR_FOLLOW = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("right: anchor(--dsx-center right)");
		/** Right inset the JS fallback path publishes (and the anchor fallback reads). */
		const RIGHTBAR_FALLBACK = "var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px))";
		/**
		* Right inset shared by the rail and its magnify overlay (must stay identical).
		*
		* The anchor form carries a FALLBACK on purpose: while the drawer wrapper plays
		* its enter/leave slide it has a `transform`, which makes that wrapper the
		* containing block of the fixed rail —and an anchor outside the containing
		* block chain is not acceptable, so `anchor()` silently falls back (measured:
		* without a fallback the property turns into `auto` and the rail paints at the
		* wrapper's LEFT edge for the whole 0.3s slide, i.e. "components flash over the
		* left sidebar on every refresh"). With the fallback the rail glides in from
		* the right edge like the rest of the drawer, then snaps onto the anchor once
		* the transform is gone.
		*/
		/** Every rail-owned fixed layer reads this one variable (default set in the CSS). */
		const RAIL_RIGHT_VAR = "var(--dsx-rail-right)";
		/** Map from interactive action id to the slash command it triggers. */
		const ACTION_COMMANDS = { contextCompact: "/compact" };
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
			columns: 2,
			hideStatsLine: false
		};
		/** Required services: the slot registry (React is a platform module). */
		const inject = ["slots"];
		/**
		* Idle delay before the overlay's raster is prewarmed, and how long it is held
		* visible (see RailWave's prewarm effect). Long enough that a live drag or a
		* rapid geometry change never triggers it, short enough that the next hover
		* almost always finds a warm layer.
		*/
		const PREWARM_IDLE_MS = 140;
		const PREWARM_HOLD_MS = 64;
		/**
		* Length of the enter/leave MORPH (ms) —the overlay's geometry tween from the
		* resting layout into the magnified wave and back. Matches the card slots' own
		* 0.2s glide so every surface moves on one curve.
		*/
		const MORPH_MS = 200;
		/** The overlay tween itself: geometry AND scale, one curve (see MORPH_MS). */
		const OVERLAY_TWEEN = `top 0.2s var(--ds-ease-in-out), right 0.2s var(--ds-ease-in-out), width 0.2s var(--ds-ease-in-out), height 0.2s var(--ds-ease-in-out), transform 0.2s var(--ds-ease-in-out)`;
		/**
		* The card SIZE/COLUMN spring, as a CSS transition value.
		*
		* Size moves in CARD_SIZE_STEP tiers and the column count in discrete steps, so
		* each hop is animated as one small rebound. The SAME curve is applied to the
		* rail's own width and to the transcript's inset while a width handle is held:
		* a tier/column change must move the container, the cards and the conversation
		* inset on ONE curve, or the cards glide inside a box that has already jumped
		* (the official layout README lists that co-motion as an island-level invariant,
		* and its absence is what read as "the component area changes abruptly, with no
		* smooth animation").
		*/
		const SLOT_SPRING = "0.26s cubic-bezier(0.34, 1.36, 0.52, 1)";
		/**
		* Row-detent wheel scrolling (see RailWave's wheel effect): how many pixels of
		* accumulated wheel delta step one ROW, how long a pause ends a gesture, and the
		* tolerance used when asking whether the pointer is still on the surface.
		*/
		/**
		* Row-detent wheel scrolling (see RailWave's wheel effect): how many pixels of a
		* PIXEL-mode wheel delta step one ROW, how long a pause ends a gesture, and the
		* tolerance used when asking whether the pointer is still on the surface. LINE and
		* PAGE mode events are discrete and are each worth exactly one step (see the
		* normalisation in the handler).
		*/
		const WHEEL_STEP_PX = 90;
		const WHEEL_GESTURE_GAP_MS = 280;
		/**
		* How long the pointer may sit off a tile before the wave is released. One frame of
		* grace: enough to cross the gap between two magnified tiles (they float ~12px apart)
		* without the wave blinking, short enough that a genuine leave reads as instant.
		*/
		const POINTER_LEAVE_MS = 60;
		/**
		* Duration of one wheel detent (a full row), and the rail content's top inset —
		* the one number the deck, the magnify overlay, the scroll tail and the detents
		* must all agree on (see the rowTops / tailH notes in RailWave).
		*/
		const RAIL_SCROLL_MS = 240;
		const RAIL_TOP_INSET = 4;
		/**
		* Where row 0's cards sit inside the rail's scroll content (`placeCards` seats the
		* first row at 2px). Detents are therefore `RAIL_ROW_SEAT + row · pitch`: this is the
		* ONE formula the wheel, the row guard and the verification probes share, so a row can
		* never rest 2px away from where another code path expects it.
		*/
		const RAIL_ROW_SEAT = 2;
		/** Honour the OS "reduce motion" preference for the scroll animation too. */
		const REDUCE_MOTION = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		/**
		* Which live source each data-backed widget family reads, and how many body
		* rows its loading skeleton draws.
		*
		* The SHELL owns this mapping (not the widget): a widget cannot distinguish
		* "my source is still in flight" from "my source answered with nothing", and
		* those two states deserve different cards —placeholder pills vs 鏁版嵁涓嶈冻.
		* Widgets that only read session-local projections (counts, tokens, task,
		* heatmap, trajectory, peak-pricing) are absent: their data is derived
		* synchronously and is never "loading".
		*/
		const WIDGET_SOURCE = {
			"usage-rings": "usage",
			"usage-bars": "usage",
			"usage-rolling": "usage",
			"usage-weekly": "usage",
			"usage-monthly": "usage",
			"cc-whoami": "cc",
			"cc-usage": "cc",
			"cc-credits": "cc",
			"cc-subscription": "cc",
			"cc-windows": "cc",
			"cc-window-5h": "cc",
			"cc-window-weekly": "cc",
			"cc-window-monthly": "cc",
			"quota-manage": "cc",
			"sys-cpu": "sys",
			"sys-gpu": "sys",
			"sys-gpu-line": "sys",
			"sys-rings": "sys",
			"sys-board": "sys"
		};
		/** Skeleton body rows per source: how much body the family normally draws. */
		const SKELETON_ROWS = {
			usage: 2,
			cc: 2,
			sys: 2
		};
		/**
		* Is this family's live source still in flight? (see WIDGET_SOURCE)
		*
		* `commandCodeError` is deliberately part of the test: once the host route has
		* ANSWERED with an error the card must show its real "not configured" state,
		* not a skeleton that never resolves.
		*/
		function isSourcePending(source, snap) {
			if (source === "usage") return snap.usageData === null && (snap.usageMulti === null || snap.usageMulti.keys.length === 0);
			if (source === "cc") return snap.commandCode === null && snap.commandCodeError === null;
			return snap.sysinfo === null;
		}
		function RailWave(props) {
			const { deck, cardBodies, railElRef, onAddClick, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active, placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor, restLayout, restAdd, live, shiftX, columns } = props;
			const n = items.length;
			Math.max(1, side + pad);
			const scrollContentH = restLayout.reduce((m, c) => Math.max(m, c.top + c.h), RAIL_ROW_SEAT) + paneH;
			const tailH = Math.max(0, scrollContentH - deckH);
			/**
			* Highest row that may top out, from the parent: the last row whose CARDS still
			* reach into the viewport. Beyond it the wheel has nothing left to reveal — the
			* reported "keep scrolling and it is just blank" — so both the handler and the row
			* guard stop there. Kept in a ref because the wheel effect reads it at event time.
			*/
			const lastRowRef = react.useRef(lastRow);
			lastRowRef.current = lastRow;
			const [focusY, setFocusY] = react.useState(null);
			const [focusX, setFocusX] = react.useState(null);
			const [animPhase, setAnimPhase] = react.useState("idle");
			const animPhaseRef = react.useRef("idle");
			const phaseTimer = react.useRef(void 0);
			const clearPhaseTimer = () => {
				if (phaseTimer.current !== void 0) {
					window.clearTimeout(phaseTimer.current);
					phaseTimer.current = void 0;
				}
			};
			/**
			* Two SEPARATE primitives, never one function that does both.
			*
			* The earlier single `schedulePhase(next, afterMs)` set the phase immediately
			* AND scheduled a second set, so the idiomatic pair of calls —
			* `schedulePhase('settle', 0); schedulePhase('follow', 170)` —had the second
			* call overwrite the first on the spot: the 'settle' phase never existed, the
			* overlay's geometry tween was therefore never active on engage, and both the
			* enter and the leave SNAPPED into place (measured 2026-09-19: overlay opacity
			* flipped with the geometry already at its final value, and the leave dropped
			* the overlay on the same frame the pointer left).
			*/
			const setPhaseNow = (next) => {
				clearPhaseTimer();
				animPhaseRef.current = next;
				setAnimPhase(next);
			};
			const setPhaseAfter = (ms, next) => {
				clearPhaseTimer();
				phaseTimer.current = window.setTimeout(() => {
					phaseTimer.current = void 0;
					animPhaseRef.current = next;
					setAnimPhase(next);
				}, ms);
			};
			react.useEffect(() => () => {
				if (phaseTimer.current !== void 0) window.clearTimeout(phaseTimer.current);
			}, []);
			const [railScrollTop, setRailScrollTop] = react.useState(0);
			const armedRef = react.useRef(false);
			const lastClientXYRef = react.useRef(null);
			const contentYRef = react.useRef(null);
			const contentXRef = react.useRef(null);
			const rafRef = react.useRef(0);
			/**
			* The rail element, resolved from the ref with a DOM fallback.
			*
			* The fallback is cheap and makes every wheel/hit-test path immune to a ref
			* that has not been written yet (first paint after the drawer mounts): the
			* surface element is the rail's parent and contains exactly one rail.
			*/
			const railElement = () => {
				const el = railElRef.current;
				if (el !== null && el.isConnected) return el;
				const surface = surfaceRef.current;
				const found = surface === null ? null : surface.querySelector(".dsx-stats-rail");
				if (found !== null) railElRef.current = found;
				return found;
			};
			/**
			* How far outside its own box a tile still counts as hovered.
			*
			* Cards are separated by `pad` (24px at the default tier), so this covers the
			* inter-card gap WITHOUT swallowing the rail's blank areas: the reported failure was
			* "hovering in the gap / above the first row / right of the last card keeps the wave
			* alive", which is what a whole-rail hit zone produces. With this tolerance a card
			* owns its box plus 7px — and after magnification neighbours float ~12px apart, so
			* crossing a gap never blinks the wave off.
			*/
			const TILE_TOLERANCE = 7;
			/**
			* Tighter variant of `hitLayout`: tests `TILE_TOLERANCE` around the PAINTED tiles
			* instead of the bare boxes. This is the oracle for "is the pointer still on the
			* widgets" once the wave is armed.
			*/
			const onCard = (clientX, clientY) => {
				const rail = railElement();
				if (rail === null) return false;
				const overlaid = morph || prewarm;
				const layout = overlaid ? focusLayout : restLayout;
				const add = overlaid ? focusedAdd : restAdd;
				const box = rail.getBoundingClientRect();
				const contentW = rail.clientWidth - 2 * pad;
				const cx = clientX - box.left - pad;
				const cy = clientY - box.top - RAIL_TOP_INSET + rail.scrollTop;
				const t = TILE_TOLERANCE;
				for (const c of layout) {
					const left = contentW - c.right - c.w;
					const right = contentW - c.right;
					if (cx >= left - t && cx <= right + t && cy >= c.top - t && cy <= c.top + c.h + t) return true;
				}
				if (add !== null) {
					const left = contentW - add.right - side;
					const right = contentW - add.right;
					if (cx >= left - t && cx <= right + t && cy >= add.top - t && cy <= add.top + side + t) return true;
				}
				return false;
			};
			const moveRailFocus = (clientX, clientY, el) => {
				lastClientXYRef.current = {
					x: clientX,
					y: clientY
				};
				const rect = el.getBoundingClientRect();
				contentXRef.current = clientX - rect.left;
				contentYRef.current = clientY - rect.top - 2 + el.scrollTop;
				if (onCard(clientX, clientY)) armedRef.current = true;
				if (!armedRef.current) return;
				if (rafRef.current) return;
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = 0;
					if (animPhaseRef.current === "idle" || animPhaseRef.current === "return") {
						setPhaseNow("settle");
						setPhaseAfter(MORPH_MS, "follow");
					}
					setFocusX(contentXRef.current);
					setFocusY(contentYRef.current);
				});
			};
			const railScrollSync = (el) => {
				if (lastClientXYRef.current === null) return;
				moveRailFocus(lastClientXYRef.current.x, lastClientXYRef.current.y, el);
			};
			react.useEffect(() => () => {
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
			}, []);
			react.useEffect(() => {
				if (live) return;
				setFocusY(null);
				setFocusX(null);
				armedRef.current = false;
				clearPhaseTimer();
				animPhaseRef.current = "idle";
				setAnimPhase("idle");
			}, [live]);
			const engaged = focusX !== null && focusY !== null && armedRef.current;
			const rawX = (focusX ?? 0) - pad;
			const rawY = focusY ?? 0;
			let scaleArr = new Array(n).fill(1);
			if (engaged && n > 0) scaleArr = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts));
			const focusLayout = placeCards(engaged ? scaleArr : new Array(n).fill(1));
			const focusedAdd = addSlotFor(focusLayout);
			const addCenter = {
				x: railW - 2 * pad - focusedAdd.right - side / 2,
				y: focusedAdd.top + side / 2
			};
			const addScale = engaged && n > 0 ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad)) : 1;
			react.useEffect(() => {
				const rail = railElement();
				if (rail === null) return;
				const pitch = Math.max(1, side + pad);
				const max = Math.max(0, rail.scrollHeight - rail.clientHeight);
				const top = Math.min(max, Math.round(rail.scrollTop / pitch) * pitch);
				if (Math.abs(top - rail.scrollTop) <= .5) return;
				if (typeof rail.scrollTo === "function") rail.scrollTo({
					top,
					behavior: "auto"
				});
				else rail.scrollTop = top;
			}, [
				side,
				pad,
				columns
			]);
			const morph = engaged || animPhase !== "idle";
			/**
			* Raster PREWARM.
			*
			* The overlay's first visible frame has to rasterize all 15 card subtrees;
			* attributed with the Long Animation Frame API that is a 50—8ms paint-only
			* frame (no script time, ~1ms style/layout) landing exactly when the enter
			* tween starts —the "drops frames on the way in, smooth on the way back"
			* asymmetry (the way out re-uses an already-rasterized layer).
			*
			* The resting overlay is PIXEL-IDENTICAL to the resting deck (same geometry,
			* scale 1), so flipping the overlay visible for a few frames while the rail is
			* idle is invisible to the user and leaves the layer rasterized. The flip is
			* debounced until things are quiet and is skipped for the whole duration of a
			* width drag, so a drag never pays a raster per tier.
			*/
			const [prewarm, setPrewarm] = react.useState(false);
			const layerLive = morph || prewarm;
			react.useEffect(() => {
				if (!live || morph) return;
				const timer = window.setTimeout(() => {
					if (document.documentElement.classList.contains("dsx-live-width")) return;
					setPrewarm(true);
				}, PREWARM_IDLE_MS);
				return () => window.clearTimeout(timer);
			}, [
				live,
				morph,
				side,
				columns,
				railW,
				shiftX,
				railScrollTop
			]);
			react.useEffect(() => {
				if (!prewarm) return;
				const timer = window.setTimeout(() => setPrewarm(false), PREWARM_HOLD_MS);
				return () => window.clearTimeout(timer);
			}, [prewarm]);
			/**
			* The overlay card BODIES arrive as a prop, built by the parent at the resting
			* unit and ALWAYS mounted while the rail is open.
			*
			* Two measured facts shaped this (1578脳1000, 15 cards, 2026-09-19):
			*  - mounting the 15 card subtrees (charts, SVGs, legends) inside the fixed
			*    overlay on the first hover frame cost ~93ms, while the leave —which only
			*    tweens the already-mounted bodies —stayed under 27ms. That stall was the
			*    "drops frames on the way in, smooth on the way back" asymmetry, and with a
			*    lazy mount it came back on EVERY hover.
			*  - re-creating the elements per frame was the other half: a realtime follow
			*    produced ~580 DOM mutations per 400ms for no visual change, because the
			*    card content depends only on `items` and `side`, never on the wave.
			* So: mount eagerly and build them in the parent (which does NOT re-render on
			* pointer moves, while this component does) —an idle RailWave re-renders
			* nothing, a follow frame touches only the slot divs, and the enter is a pure
			* opacity flip plus the geometry tween.
			*/
			/** Last value written to --dsx-rail-scroll (see the guarded write below). */
			const railScrollVarRef = react.useRef(-1);
			if (railScrollVarRef.current !== railScrollTop) {
				railScrollVarRef.current = railScrollTop;
				document.documentElement.style.setProperty("--dsx-rail-scroll", `${railScrollTop}px`);
			}
			const deckWrapRef = react.useRef(null);
			const lastColumnsRef = react.useRef(columns);
			react.useEffect(() => {
				if (lastColumnsRef.current === columns) return;
				lastColumnsRef.current = columns;
				const el = deckWrapRef.current;
				if (el === null) return;
				el.classList.remove("dsx-wave-run");
				el.offsetWidth;
				el.classList.add("dsx-wave-run");
				const timer = window.setTimeout(() => el.classList.remove("dsx-wave-run"), 900);
				return () => window.clearTimeout(timer);
			}, [columns]);
			const overlayTransition = active && animPhase === "follow" ? "none" : OVERLAY_TWEEN;
			/**
			* 鈹€鈹€ SCROLL GEOMETRY: the one place that decides how far the rail can travel 鈹€鈹€
			*
			* The deck's rows are seated at `rowTop(r) = 2 + r 路 pitch` (see placeCards), and
			* the rail's scroll range is `scrollContentH –clientH`. For every row to be
			* able to TOP OUT the viewport, the range must reach `rowTop(rows –1) + 2`,
			* i.e. the content needs `rows 路 pitch` of height —one extra row-pitch worth of
			* padding under the last row. Without it the browser CLAMPS the last detents
			* and the deck simply stops moving (see the tail element's note).
			*
			* So: contentH = max(rows 路 pitch, deckBottom) + clientH, and `clientH` is
			* measured live (the rail is viewport-tall, so it changes with the window).
			*/
			const rail = react.createElement("div", {
				ref: railElRef,
				className: "dsx-stats-rail",
				style: {
					position: "fixed",
					top: "var(--dsx-rail-top,0px)",
					right: RAIL_RIGHT_VAR,
					bottom: 0,
					width: `${railW}px`,
					overflowY: "auto",
					overflowX: "visible",
					boxSizing: "border-box",
					padding: `4px ${pad}px ${pad}px ${pad}px`,
					background: "transparent",
					pointerEvents: "auto",
					transform: `translateX(${shiftX}px)`,
					...ANCHOR_FOLLOW ? { transition: `transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), width ${SLOT_SPRING}` } : { transition: `right var(--ds-transition-duration-slow) var(--ds-ease-in-out), transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), width ${SLOT_SPRING}` }
				},
				onMouseMove: (e) => moveRailFocus(e.clientX, e.clientY, e.currentTarget),
				onScroll: (e) => {
					const top = e.currentTarget.scrollTop;
					if (railScrollVarRef.current !== top) {
						railScrollVarRef.current = top;
						document.documentElement.style.setProperty("--dsx-rail-scroll", `${top}px`);
					}
					setRailScrollTop(top);
					railScrollSync(e.currentTarget);
				}
			}, react.createElement("div", {
				ref: deckWrapRef,
				className: morph ? "dsx-wave-deck dsx-wave-on" : "dsx-wave-deck"
			}, deck), react.createElement("div", {
				key: "__tail",
				"aria-hidden": true,
				style: {
					height: `${tailH}px`,
					pointerEvents: "none"
				}
			}));
			/**
			* The rail and the magnify overlay form ONE pointer surface, owned by a common
			* wrapper (below) —never by either child alone.
			*
			* The two are SIBLINGS of necessity (the overlay must escape the rail's
			* scroll-clip box), so while the overlay was interactive, moving the pointer
			* from the rail onto a magnified card fired the RAIL's mouseleave —the event
			* target left the rail's subtree even though the pointer never left the widgets
			* (measured 2026-09-19). That single flaw produced two reported bugs:
			*   - moving between two cards (or through the gap between them) disengaged the
			*     wave on the way and re-engaged it on arrival, so the deck flickered
			*     big −small −big;
			*   - leaving the LEFTMOST magnified card outwards fired no leave at all (the
			*     rail had already left), so the card stayed magnified for good.
			* Both disappear once the wrapper —the union of the two boxes —owns
			* mousemove/mouseleave. Its children are both `position: fixed`, so the wrapper
			* adds no layout box of its own.
			*/
			const magnifyLayerRef = react.useRef(null);
			/**
			* Is (x, y) still on the widget surface? — the wave's disarm oracle.
			*
			* "On the surface" means ON A TILE (`onCard`, with its 7px halo), not "inside the
			* rail". The rail's box is 372 × 936 and mostly empty: its padding, the 24px gaps
			* between cards and every blank run below the last row are all inside it, so a
			* box test kept the wave alive while the pointer sat over nothing — which is exactly
			* the report that survived the first fix ("the gap between the tiles, above the first
			* row, right of the last card — it stays magnified").
			*
			* The one thing the rail DOES own is the ADD tile's slot, and that is part of
			* `onCard` already. Both are positions where leaving must NOT be inferred from a
			* `mouseleave`: the wrapper's tree still contains the pointer while it crosses a gap,
			* so the geometric test is the only thing that distinguishes "between two cards" from
			* "in the empty band below them".
			*/
			const nearSurface = (x, y) => onCard(x, y);
			const leaveRail = (x, y) => {
				if (typeof x === "number" && typeof y === "number" && nearSurface(x, y)) return;
				armedRef.current = false;
				setFocusY(null);
				setFocusX(null);
				if (animPhaseRef.current === "idle") return;
				setPhaseNow("return");
				setPhaseAfter(240, "idle");
			};
			/**
			* ── POINTER WATCHER: the wave can never outlive the hover ──
			*
			* The geometric tests above run on events that arrive INSIDE the surface subtree,
			* so they can only react to events they are given: a pointer that leaves without the
			* subtree ever seeing a final move (a covered surface, a synthesised enter, a
			* stationary pointer whose tile moved away under it) left the wave engaged for good.
			* This listener sits on the WINDOW — it therefore sees the pointer whatever is under
			* it — and ends the wave as soon as the position is no longer over a tile of the
			* rail. That is the user's own prescription ("listen to the pointer and restore once
			* it is really over nothing").
			*
			* It only ARMS the release, so the cost is one bounds test per move event, and it
			* stops entirely while the wave is idle. A short debounce absorbs the single frame
			* between two magnified tiles, so crossing a gap never blinks the wave.
			*/
			react.useEffect(() => {
				let timer = 0;
				const check = () => {
					if (!armedRef.current) return;
					const p = lastClientXYRef.current;
					if (p === null) return;
					if (nearSurface(p.x, p.y)) return;
					leaveRail(p.x, p.y);
				};
				const onMove = (e) => {
					const { clientX: x, clientY: y } = e;
					lastClientXYRef.current = {
						x,
						y
					};
					if (!armedRef.current) return;
					window.clearTimeout(timer);
					timer = window.setTimeout(check, POINTER_LEAVE_MS);
				};
				window.addEventListener("mousemove", onMove, {
					capture: true,
					passive: true
				});
				return () => {
					window.clearTimeout(timer);
					window.removeEventListener("mousemove", onMove, { capture: true });
				};
			}, []);
			const surfaceRef = react.useRef(null);
			/**
			* Wheel −ROW-DETENT scrolling.
			*
			* Two requirements met by one path (2026-09-19):
			*  - the rail scrolls in ROW steps, never in pixels: the visible top row is
			*    never cut, one notch pulls the next row up to where the first row was, and
			*    the deck may overflow at the bottom (by design). Scroll positions are
			*    therefore always `row 路 (side + gap)`, which is also why the first frame
			*    (offset 0) shows whole rows with the next one peeking;
			*  - it is ALWAYS animated. The previous `scrollTop += deltaY` per wheel event
			*    was an instant jump per notch —the "sometimes it scrolls harshly instead
			*    of smoothly" report —and it only worked when the pointer was not over a
			*    magnified card (the overlay lives outside the scroller). Intercepting the
			*    wheel for both surfaces and running ONE tween of our own makes the motion
			*    identical wherever the pointer is, and guarantees the landing.
			*
			* React's onWheel is registered PASSIVE at the root (preventDefault is ignored),
			* hence the native listener; the deltaMode conversion keeps line/page deltas
			* from other platforms sane.
			*
			* The deps are `[side, pad]` ONLY. `railElRef` is a plain `{ current }` object
			* re-created on every render of the parent, so listing it made this effect tear
			* down and re-run on every parent render —and its cleanup (`stopTween`)
			* CANCELLED the row tween mid-flight. Measured: the deck came to rest at 120 /
			* 304 / 424 —instead of a detent, i.e. rows a third of the way up, which is the
			* reported "a row is always half hidden and further scrolling does nothing".
			* The ref's identity is irrelevant (only `.current` matters) and the rail's box
			* is resolved per event.
			*/
			react.useEffect(() => {
				const el = surfaceRef.current;
				if (el === null) return;
				let accum = 0;
				let baseRow = 0;
				let lastAt = 0;
				/** True from the moment a row step starts until its tween has finished. */
				let stepping = false;
				let tween = 0;
				let from = 0;
				let to = 0;
				let t0 = 0;
				const pitch = Math.max(1, side + pad);
				const stopTween = () => {
					if (tween !== 0) {
						cancelAnimationFrame(tween);
						tween = 0;
					}
					stepping = false;
				};
				/**
				* ROW-ALIGNMENT GUARD — the deck may never REST off the detent grid.
				*
				* The wheel's own native scroll still lands (measured: Chromium applies the full
				* 120px delta on the compositor before the handler's `preventDefault` can matter,
				* because the event has to travel to the main thread first). Our tween then takes
				* over and ends on the detent, but if anything cancels it — a second wheel event,
				* a layout change, a busy frame — the deck can come to rest a third of a row up:
				* exactly the reported "the row is either half hidden or will not move at all".
				* So the rail watches its own scroll offset: while a tween is running it ignores
				* the value, and once the motion has stopped for a moment it snaps any off-grid
				* position onto the nearest row. Nothing else in the product writes this offset,
				* and a drag of the rail's own scrollbar ends the same way — on a row.
				*/
				let guardTimer = 0;
				const onScrollGuard = () => {
					if (railElement() === null) return;
					if (tween !== 0 || stepping) return;
					window.clearTimeout(guardTimer);
					guardTimer = window.setTimeout(() => {
						const r = railElement();
						if (r === null || tween !== 0 || stepping) return;
						const row = Math.max(0, Math.min(lastRowRef.current, Math.round((r.scrollTop - RAIL_ROW_SEAT) / pitch)));
						const top = RAIL_ROW_SEAT + row * pitch;
						if (Math.abs(r.scrollTop - top) > 1) r.scrollTop = top;
					}, 300);
				};
				/**
				* The tween the browser CANNOT get wrong.
				*
				* `scrollTo({ behavior: 'smooth' })` is asynchronous and INTERRUPTIBLE, and
				* the next wheel event always arrives while the previous animation is still
				* in flight (measured: a 120px notch takes ~450ms, a wheel event lands every
				* 5—6ms). Two things followed from that, both reported:
				*   - the previous implementation recomputed the target row from
				*     `rail.scrollTop`, i.e. from a MID-ANIMATION position, so consecutive
				*     notches recomputed the same row and the deck stuck while the wheel kept
				*     turning (measured 8 notches in a row all settling on 184);
				*   - an interrupted native smooth scroll stops anywhere, so the deck could
				*     come to rest half a row up —"the row is either half hidden or will not
				*     move at all".
				* This tween is driven by our own frame loop and ALWAYS ends exactly on the
				* detent, and it retargets smoothly (it eases from wherever the deck is NOW
				* to the newest detent) instead of restarting from the top.
				*/
				const ease = (p) => .5 - Math.cos(Math.PI * p) / 2;
				const step = (now) => {
					const rail = railElement();
					if (rail === null) {
						tween = 0;
						stepping = false;
						return;
					}
					const p = Math.min(1, (now - t0) / RAIL_SCROLL_MS);
					const v = from + (to - from) * ease(p);
					rail.scrollTop = p >= 1 ? to : v;
					if (p >= 1) {
						tween = 0;
						stepping = false;
					} else tween = requestAnimationFrame(step);
				};
				const scrollToDetent = (top) => {
					const rail = railElement();
					if (rail === null) return;
					if (REDUCE_MOTION) {
						stopTween();
						rail.scrollTop = top;
						return;
					}
					from = rail.scrollTop;
					to = top;
					if (Math.abs(to - from) < .5) {
						stepping = false;
						return;
					}
					t0 = performance.now();
					stepping = true;
					if (tween === 0) tween = requestAnimationFrame(step);
				};
				const onWheel = (e) => {
					const rail = railElement();
					if (rail === null) return;
					const now = performance.now();
					/**
					* Normalise the three delta units before stepping (see the matrix probe
					* scripts/verify-rail-wheel-matrix.cjs):
					*  - PIXEL (0): raw pixels. One Windows notch reports ~100—20px, one line
					*    of a trackpad a few —hence the threshold.
					*  - LINE (1) / PAGE (2): these units are DISCRETE. Exactly one event is one
					*    physical notch, whatever its magnitude, so it is worth exactly one
					*    detent. Scaling by a guessed pixels-per-line instead made a standard
					*    3-line event 30—8px, i.e. BELOW the pixel threshold: a line-mode wheel
					*    (Firefox, some drivers) scrolled nothing at all, and a page-mode event
					*    (raw `clientHeight` = 936px) jumped NINE rows in one click.
					*/
					const delta = e.deltaMode === 0 ? e.deltaY : e.deltaY > 0 ? WHEEL_STEP_PX : -90;
					if (delta === 0) return;
					/**
					* THE STOP: once the last row of cards is fully in view there is nothing left to
					* reveal, so the wheel does nothing at all (the event is still swallowed, so the
					* gesture can never leak into the transcript behind the rail). `lastRowRef` is the
					* coordinator's cap — the highest row whose cards still reach into the viewport.
					*/
					const topRow = lastRowRef.current;
					if (now - lastAt > WHEEL_GESTURE_GAP_MS) {
						accum = 0;
						baseRow = Math.max(0, Math.min(topRow, Math.round((rail.scrollTop - RAIL_ROW_SEAT) / pitch)));
					}
					lastAt = now;
					accum += delta;
					const steps = accum > 0 ? Math.floor(accum / WHEEL_STEP_PX) : Math.ceil(accum / WHEEL_STEP_PX);
					/**
					* ONE STEP AT A TIME —the rule that keeps the deck on the grid under load.
					*
					* A wheel fires every 5—6ms while a row transition takes 240ms, so the next
					* event almost always arrives mid-tween. Two things then go wrong at once:
					* the gesture re-anchors on a HALF-SCROLLED offset (its own 280ms gap is
					* shorter than a slow frame), and the retarget discards the row the deck was
					* heading for. Measured on a busy page: 12 notches resting at 120, 304, 424,
					* 552 ——i.e. rows a third of the way up, which is exactly the reported
					* "a row is always half hidden and further scrolling does nothing".
					* While a step is in flight the input is therefore IGNORED (and its
					* accumulation dropped with it), so every step starts from a landed detent.
					*/
					if (stepping) {
						accum = 0;
						e.preventDefault();
						e.stopPropagation();
						return;
					}
					if (steps !== 0) {
						accum -= steps * WHEEL_STEP_PX;
						const row = Math.max(0, Math.min(topRow, baseRow + steps));
						if (row !== baseRow) {
							baseRow = row;
							scrollToDetent(RAIL_ROW_SEAT + row * pitch);
						}
					}
					e.preventDefault();
					e.stopPropagation();
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				/**
				* The guard listens to the rail's OWN scroll events: any offset that settles off
				* the row grid (a stray native scroll, an interrupted tween, a rail scrollbar
				* drag) is snapped back onto the nearest row. See `onScrollGuard`.
				*/
				const guardTarget = (() => {
					return railElement();
				})();
				if (guardTarget !== null) guardTarget.addEventListener("scroll", onScrollGuard, { passive: true });
				return () => {
					el.removeEventListener("wheel", onWheel);
					if (guardTarget !== null) guardTarget.removeEventListener("scroll", onScrollGuard);
					window.clearTimeout(guardTimer);
					stopTween();
				};
			}, [side, pad]);
			/**
			* The live region's left OVERHANG (px): how far the magnified deck reaches past
			* the rail's own content box.
			*
			* The rail and the overlay are two boxes, but the pointer surface must be ONE
			* CONTINUOUS REGION —a tree-based union is not enough, because a magnified
			* card grows leftwards past the rail's box and the GAP between two such cards
			* then resolves to whatever is underneath (the conversation), which ends the
			* wave / restarts it as the pointer crosses back (reported 2026-09-19: "hovering
			* exactly in the gap cancels the wave", "at the edge it flips big/small").
			* The layer therefore widens its own hit box to cover the overhang while the
			* morph is live, with the left padding compensated so the CARDS do not move.
			*/
			const overhang = morph && engaged ? Math.max(0, Math.ceil(focusLayout.reduce((m, c, i) => Math.max(m, c.right + items[i].baseW * c.s), 0) - (railW - 2 * pad))) : 0;
			const magnifyLayer = react.createElement("div", {
				key: "__magnify",
				ref: magnifyLayerRef,
				className: "dsx-magnify-layer",
				style: {
					position: "fixed",
					top: "calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))",
					right: RAIL_RIGHT_VAR,
					width: `${railW + overhang}px`,
					boxSizing: "border-box",
					padding: `4px ${pad}px ${pad}px ${pad + overhang}px`,
					zIndex: 25,
					overflow: "visible",
					background: "transparent",
					transform: `translateX(${shiftX}px)`,
					opacity: layerLive ? 1 : 0,
					pointerEvents: morph ? "auto" : "none",
					willChange: "opacity"
				}
			}, react.createElement("div", {
				key: "__mdeck",
				style: {
					position: "relative",
					height: `${scrollContentH}px`
				}
			}, (() => {
				const peak = focusLayout.reduce((m, p) => Math.max(m, p.s), 1);
				return focusLayout.map((c, idx) => {
					const it = items[idx];
					const baseW = it.baseW;
					const focused = engaged && peak > 1.001 && c.s >= peak - 5e-4;
					const slotStyle = {
						position: "absolute",
						top: `${c.top.toFixed(2)}px`,
						right: `${c.right.toFixed(2)}px`,
						width: `${baseW}px`,
						height: `${side}px`,
						transformOrigin: "top right",
						transform: `scale(${c.s.toFixed(4)})`,
						transition: overlayTransition,
						willChange: morph ? "transform" : void 0,
						zIndex: Math.round((c.s - 1) * 50),
						pointerEvents: morph ? "auto" : "none"
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot" + (focused ? " dsx-slot-focused" : ""),
						style: slotStyle
					}, cardBodies[idx]);
				});
			})(), react.createElement("button", {
				key: "__add",
				type: "button",
				className: "dsx-stats-add",
				"aria-label": t("ui.rail.addAria"),
				tabIndex: morph ? 0 : -1,
				onClick: onAddClick,
				style: {
					position: "absolute",
					top: `${focusedAdd.top.toFixed(2)}px`,
					right: `${focusedAdd.right.toFixed(2)}px`,
					width: `${side}px`,
					height: `${side}px`,
					borderRadius: `${addRadius}px`,
					transformOrigin: "top right",
					transform: `scale(${addScale.toFixed(4)})`,
					transition: overlayTransition,
					willChange: morph ? "transform" : void 0,
					zIndex: 30,
					pointerEvents: morph ? "auto" : "none"
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
			}))), react.createElement("span", { className: "dsx-stats-add-label" }, t("ui.rail.addLabel")))));
			/**
			* ONE surface for the rail + overlay: the wrapper owns the pointer, so the wave
			* cannot be disengaged by moving between the two boxes (see `leaveRail`). No
			* layout box of its own —both children are `position: fixed`.
			*
			* Hover-outline consistency rides on the same structure: the magnified card
			* under the pointer is `.dsx-slot-focused`, and the wrapper's coordinates are
			* the RAIL's (the overlay is a sibling), so `moveRailFocus` resolves the peak in
			* rail-content space exactly like the resting deck does.
			*/
			return react.createElement("div", {
				key: "__surface",
				ref: surfaceRef,
				"data-dsx-surface": "",
				style: { display: "contents" },
				onMouseMove: (e) => {
					const el = railElRef.current;
					if (el !== null) moveRailFocus(e.clientX, e.clientY, el);
				},
				onMouseLeave: (e) => {
					leaveRail(e.clientX, e.clientY);
				}
			}, rail, magnifyLayer);
		}
		/** Normalize an arbitrary persisted/remote prefs object into a valid Prefs.
		*  Shared by localStorage loads and the authoritative host-store sync, so both
		*  channels survive schema drift identically. */
		function normalizePrefs(p) {
			const s = {
				...DEFAULTS,
				...p
			};
			if (!Number.isFinite(s.panelPadding) || s.panelPadding < 4 || s.panelPadding > 40) s.panelPadding = DEFAULTS.panelPadding;
			if (!Number.isFinite(s.cardSide) || s.cardSide < 100 || s.cardSide > 220) s.cardSide = DEFAULTS.cardSide;
			const normalizeInstance = (key) => {
				if (key === "sys-board@2x2") key = "sys-board@2x4";
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
				3,
				4
			].indexOf(s.columns) === -1) s.columns = DEFAULTS.columns;
			if (typeof s.hideStatsLine !== "boolean") s.hideStatsLine = DEFAULTS.hideStatsLine;
			return s;
		}
		function loadState() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_INSTANCES.slice()
				};
				return normalizePrefs(JSON.parse(raw));
			} catch {
				return {
					...DEFAULTS,
					installed: DEFAULT_INSTALLED.slice(),
					order: ALL_INSTANCES.slice()
				};
			}
		}
		function loadSavedAt() {
			try {
				const n = +(localStorage.getItem(SAVED_AT_KEY) ?? "");
				return Number.isFinite(n) && n > 0 ? n : 0;
			} catch {
				return 0;
			}
		}
		/** Debounced PUT to the host store; localStorage is always the fast path, the
		*  host file the authoritative one (survives origin switches and clearing). */
		let hostSyncTimer;
		let pendingState = null;
		let pendingAt = 0;
		async function putState(s, at) {
			try {
				await fetch(STORE_API, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						savedAt: at,
						state: s
					}),
					keepalive: true
				});
			} catch {}
		}
		function saveState(s) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
				pendingAt = Date.now();
				localStorage.setItem(SAVED_AT_KEY, String(pendingAt));
			} catch {}
			pendingState = s;
			if (hostSyncTimer !== void 0) window.clearTimeout(hostSyncTimer);
			hostSyncTimer = window.setTimeout(() => {
				hostSyncTimer = void 0;
				const toSend = pendingState;
				const at = pendingAt;
				pendingState = null;
				if (toSend !== null) putState(toSend, at);
			}, 400);
		}
		/**
		* Flush any state that has not yet reached the host store when the page is
		* being torn down (window/tab close, navigation, desktop-app quit). The
		* 400 ms debounce means the last edit before a quick close is usually still
		* pending here; a normal fetch would be cancelled with the page, but
		* `sendBeacon` is delivered by the browser even as the page is destroyed —
		* which is what keeps the write inside desktop shells that spawn a fresh
		* random loopback origin on every launch (their localStorage is a new realm
		* each boot, so the host file is the only channel that survives).
		*/
		function flushPendingState() {
			const toSend = pendingState;
			if (toSend === null) return;
			const at = pendingAt;
			pendingState = null;
			try {
				const body = JSON.stringify({
					savedAt: at,
					state: toSend
				});
				if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") navigator.sendBeacon(STORE_API, new Blob([body], { type: "application/json" }));
				else fetch(STORE_API, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
					keepalive: true
				});
			} catch {}
		}
		/** Coerce a possibly-undefined timestamp to a finite number (null when unusable). */
		function timelineTime(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : null;
		}
		/**
		* Project the live conversation into the official 杞ㄨ抗 layout's three lanes:
		* 杈撳叆 (user/steering message) 路 妯″瀷 (assistant step) 路 宸ュ叿 (tool call).
		*
		* Beats are ordered by their START time and trimmed to the newest
		* `TRAJECTORY_WINDOW`. In-flight work is included as it happens —running tool
		* calls plus open, not-yet-assembled assistant steps —which is what makes the
		* card move while the model is working instead of only after a turn settles.
		*
		* @param settled - Conversation nodes (`useChat().legacy.nodes`).
		* @param runningCalls - Live tool calls (`useChat().legacy.runningCalls`).
		* @param timeline - Turn/step timeline (open steps have no node yet).
		* @param now - performance.now() at this collection pass.
		*/
		function deriveTrajectory(settled, runningCalls, timeline, now) {
			const beats = [];
			const push = (at, kind, ms) => {
				beats.push({
					at: at ?? 0,
					beat: {
						kind,
						ms: Math.max(0, ms)
					}
				});
			};
			for (const node of settled ?? []) {
				if (node?.kind === "user" || node?.kind === "steering") {
					push(timelineTime(node.time), "input", 0);
					continue;
				}
				if (node?.kind === "assistant") {
					const start = timelineTime(node.timing?.stepStartTime);
					const end = timelineTime(node.timing?.completedTime);
					push(start ?? timelineTime(node.time), "model", start !== null && end !== null ? end - start : 0);
					continue;
				}
				if (node?.kind === "tool-result") {
					const start = timelineTime(node.callTime);
					const end = timelineTime(node.time);
					push(start ?? end, "tool", start !== null && end !== null ? end - start : 0);
				}
			}
			for (const call of runningCalls ?? []) {
				const start = timelineTime(call?.time);
				if (start === null) continue;
				push(start, "tool", now - start);
			}
			if (timeline && typeof timeline.turns?.values === "function") for (const turn of timeline.turns.values()) {
				if (turn?.status !== "open") continue;
				for (const step of turn.steps ?? []) {
					if (step?.status !== "open") continue;
					const start = timelineTime(step.start?.time);
					if (start === null) continue;
					if ((settled ?? []).some((n) => n?.kind === "assistant" && n.turn === step.turn && n.step === step.step && n.timing !== void 0)) continue;
					push(start, "model", now - start);
				}
			}
			beats.sort((a, b) => a.at - b.at);
			return beats.slice(-30).map((entry) => entry.beat);
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
			ctx.effect(() => {
				const disposeLocale = installLocale(ctx.get("locale"), WIDGET_LOCALES);
				const disposeListener = onLocaleChange(() => {
					emit();
				});
				return () => {
					disposeLocale();
					disposeListener();
				};
			});
			try {
				loadHeatmapStore();
			} catch {}
			let prefs = loadState();
			let state = {
				open: prefs.railOpen,
				hasSession: false,
				stats: null,
				usageData: null,
				usageMulti: null,
				commandCode: null,
				commandCodeError: null,
				usageDaily: null,
				sysinfo: null
			};
			const listeners = /* @__PURE__ */ new Set();
			/**
			* The bridge snapshot React renders from. Cached per emit because
			* `useSyncExternalStore` compares references: a fresh object per call would
			* re-render forever.
			*/
			let bridgeSnapshot = null;
			/**
			* The snapshot must be rebuilt inside `emit`, i.e. AFTER the state/`prefs`/
			* `railBudget` updates, so every subscriber (and every late subscriber) reads
			* the same values. `bridgeSnapshot` starts null instead of pre-built because
			* `railBudget` is declared further down: reading it here would throw (TDZ).
			*/
			function emit() {
				bridgeSnapshot = {
					...state,
					prefs: { ...prefs },
					railBudget
				};
				for (const fn of listeners) fn();
			}
			function subscribe(fn) {
				listeners.add(fn);
				return () => {
					listeners.delete(fn);
				};
			}
			function getBridgeSnapshot() {
				if (bridgeSnapshot === null) bridgeSnapshot = {
					...state,
					prefs: { ...prefs },
					railBudget
				};
				return bridgeSnapshot;
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
			const syncWithHost = async () => {
				try {
					const res = await fetch(STORE_API);
					if (!res.ok) return;
					const data = await res.json();
					const hostAt = Number.isFinite(Number(data.savedAt)) ? Number(data.savedAt ?? 0) : 0;
					const hostState = data.state !== null && typeof data.state === "object" ? data.state : null;
					const localAt = loadSavedAt();
					if (hostState && hostAt > localAt) {
						prefs = normalizePrefs(hostState);
						try {
							localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
							localStorage.setItem(SAVED_AT_KEY, String(hostAt));
						} catch {}
						emit();
					} else if (hostAt < localAt && localAt > 0) try {
						await putState(prefs, localAt);
					} catch {}
				} catch {}
			};
			/**
			* Bridge subscription for React entries.
			*
			* `useSyncExternalStore` (not `useState` + a subscribing effect) is what makes
			* a session hand-off reliable: a plain effect misses every emit that lands
			* between the entry's render and its effect flush, and the shell can mount a
			* NEW conversation's composer overlay slot in exactly that window while the
			* old session's dock unmounts —the fresh entry then kept a stale
			* `hasSession: true` snapshot, so the rail stayed painted (and kept capturing
			* pointer events) over the fresh-conversation page until a reload (measured
			* 2026-09-17, 5/5 runs). `useSyncExternalStore` re-reads the snapshot after
			* subscribing and re-renders when it changed, so that emit cannot be lost.
			*/
			function useBridge() {
				return react.useSyncExternalStore(subscribe, getBridgeSnapshot, getBridgeSnapshot);
			}
			const onStorage = (e) => {
				if (e.key !== STORAGE_KEY && e.key !== SAVED_AT_KEY) return;
				try {
					const raw = localStorage.getItem(STORAGE_KEY);
					if (raw === null) return;
					prefs = normalizePrefs(JSON.parse(raw));
					emit();
				} catch {}
			};
			const onVisibility = () => {
				if (document.visibilityState === "visible") syncWithHost();
			};
			const onPageHide = () => flushPendingState();
			window.addEventListener("storage", onStorage);
			document.addEventListener("visibilitychange", onVisibility);
			window.addEventListener("pagehide", onPageHide);
			ctx.effect(() => () => {
				listeners.clear();
				window.removeEventListener("storage", onStorage);
				document.removeEventListener("visibilitychange", onVisibility);
				window.removeEventListener("pagehide", onPageHide);
			});
			syncWithHost();
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
			/** Last measured official right-bar width (px); -1 = never measured. */
			let lastRightbarW = -1;
			/** Timer that ends the track-sync window. */
			let syncTimer = 0;
			let ro = null;
			/**
			* Elements already handed to the ResizeObserver. The targets MUST be looked up
			* lazily: this plugin applies BEFORE the Web UI shell mounts its frame, so a
			* one-shot querySelector pass at apply time finds nothing and the observer ends
			* up watching zero nodes (verified 2026-09-13: 19 live ResizeObservers on the
			* page, none of them on [class$='_rightbarCol']). The rail's right offset then
			* only changed when some unrelated event happened to re-measure —which is why
			* the rail sat still for seconds while the right sidebar's grid track animated,
			* then jumped into place. Re-binding on every measure is idempotent (observing
			* an element twice is a no-op) and self-heals whenever the shell or the
			* conversation root is re-created.
			*/
			const observedEls = /* @__PURE__ */ new Set();
			/**
			* Cached handle for the official right-bar column —the single element the
			* hot path needs. The rail syncs at animation cadence while the shell eases
			* its right-bar grid track, so the per-frame path must not re-run four
			* `querySelector` probes nor force a layout with `getBoundingClientRect`:
			* the ResizeObserver entry that scheduled the frame already carries the new
			* content-box width. Measured 2026-09-17 (1578x846, long conversation): the
			* previous per-frame selector+rect pass cost 36ms per one-toggle animation
			* on top of the shell's own track re-layout.
			*/
			let rightbarEl = null;
			/** Width (px) reported by the newest RO entry for {@link rightbarEl}; null = none. */
			let entryRightbarW = null;
			/**
			* Minimum spacing between the VERTICAL anchor probes (`--dsx-rail-top`,
			* `--dsx-input-bottom`). Those two anchors only move with header / route /
			* composer layout, never with the horizontal grid track —yet the composer and
			* scroll body re-resize on every frame of a sidebar toggle (their content
			* reflows), so an unthrottled probe forces an extra full re-layout per frame
			* for values that are already correct (measured 2026-09-17: 111ms over 5
			* callbacks in one toggle). A trailing timer guarantees the final value lands.
			*/
			const VERTICAL_PROBE_INTERVAL_MS = 250;
			let lastVerticalProbeAt = 0;
			let verticalTimer = 0;
			/** One-shot publish of the settled right-bar width (anchor path only). */
			let settleTimer = 0;
			/** Space the product's transcript measure leaves for the rail (px). */
			let railBudget = -1;
			/**
			* Fingerprint of the geometry the drawer last rendered (see `spaceKey`): the
			* geometry gate in `updateRailBudget` compares against it, so a budget step
			* that leaves the deck's shape unchanged costs no React render.
			*/
			let lastSpaceKey = "";
			/** The AppFrame whose track transition drives the yield beat. */
			let frameEl = null;
			/** The drawer wrapper, so the yield can be applied on the shell's own beat. */
			let drawerEl = null;
			/** Debounces the budget refresh until a track movement has settled. */
			let railBudgetTimer = 0;
			/**
			* The right-bar track just changed width —the movement is in flight. Predict
			* the TARGET budget on every such tick: the first tick can be delivered before
			* the shell has written the target tracks for this gesture, so latching on it
			* would miss the whole movement (measured: the inline read the old `0px` on the
			* first tick and `710px` afterwards). `updateRailBudget` no-ops when the value
			* is unchanged, so repeated predictions are free.
			*
			* Triggered from the observer itself, not from the "horizontal only" fast path:
			* during a push the transcript scroller resizes in the same batch, so that path
			* is usually NOT taken and a prediction hung off it would never run.
			*/
			function noteRightbarMoved() {
				const predicted = predictRailBudget();
				if (predicted !== null) updateRailBudget(predicted);
				scheduleBudgetRefresh();
			}
			/**
			* The shell's track transition is STARTING (AppFrame `transitionrun` for
			* `grid-template-columns`). This is the earliest possible beat —the observer's
			* first delivery trails it by ~100ms —so the rail's yield lands on the same
			* frame as the panel's first pixel of movement.
			*/
			function onTrackTransitionRun(event) {
				if (event.propertyName !== "grid-template-columns") return;
				const predicted = predictRailBudget();
				if (predicted !== null) updateRailBudget(predicted);
				scheduleBudgetRefresh();
			}
			/** Keep the transition listener bound to whatever frame the shell renders. */
			function bindFrameTransition() {
				const frame = document.querySelector("[class$=\"_frame\"]");
				if (frame === frameEl) return;
				frameEl?.removeEventListener("transitionrun", onTrackTransitionRun);
				frameEl = frame;
				frameEl?.addEventListener("transitionrun", onTrackTransitionRun);
			}
			/**
			* Custom-property write that skips identical values.
			*
			* The live-width path calls this for many frames in a row with the SAME value
			* (the claim is the resolved layout's width, which only moves at a threshold);
			* an unconditional `setProperty` invalidates every dependent declaration, and
			* during a drag that means re-resolving the transcript's padding every frame
			* for no change. Measured 2026-09-18 (1578脳1000, long conversation): guarding
			* the writes cut the rail's drag cost at p99 from 62ms to ~30ms.
			*/
			function setVar(name, value) {
				const style = document.documentElement.style;
				if (style.getPropertyValue(name) === value) return;
				style.setProperty(name, value);
			}
			/**
			* Recompute how much room the rail may claim and, when the RESOLVED GEOMETRY
			* moved, re-render the drawer with it.
			*
			* Quantised to 8px and geometry-gated. The deck is a FLUID grid now (see
			* resolveRailLayout), so a budget step also moves the card side and the deck
			* would otherwise re-render once per pixel of pointer travel; the gate bounds
			* that to one commit per 8px of budget (≤px of card side at two columns,
			* ≤px at four), and the slots' own 0.2s top/right/width/height transition
			* turns those steps into one continuous glide.
			*
			* Cost, measured 2026-09-19 over one 216px handle drag at 1578脳1000 with the
			* same drag run rail-open and rail-closed (rAF deltas): p50 17ms in both, and
			* the rail adds single-digit janky frames over 33ms plus a couple of long
			* tasks on top of the shell's own per-frame reflow. Host load moves these
			* numbers by tens of percent between rounds, so treat them as an order of
			* magnitude, not an assertion.
			*/
			function updateRailBudget(next = readRailBudget()) {
				if (next === railBudget) return;
				if (railBudget >= 0 && Math.abs(next - railBudget) < 8) return;
				railBudget = next;
				setVar("--dsx-rail-avail", `${next}px`);
				const space = resolveRailSpace(prefs, next);
				setVar("--dsx-rail-w", `${space.claimW}px`);
				applyRailRight(space.swallowed);
				if (drawerEl !== null) {
					const opacity = space.hidden ? "0" : "1";
					if (drawerEl.style.opacity !== opacity) drawerEl.style.opacity = opacity;
					if (space.yielded) drawerEl.setAttribute("data-yielded", "");
					else drawerEl.removeAttribute("data-yielded");
				}
				const key = spaceKey(space);
				if (key === lastSpaceKey) return;
				lastSpaceKey = key;
				emit();
			}
			/** Everything a render turns into pixels (see the geometry gate above). */
			function spaceKey(space) {
				return [
					space.columns,
					space.side,
					space.drawW,
					space.claimW,
					space.hidden ? 1 : 0,
					space.yielded ? 1 : 0,
					space.swallowed ? 1 : 0,
					Math.round(space.shiftX)
				].join(":");
			}
			/**
			* Official transcript measure the budget is derived from, watched per frame
			* while the user drags a width handle.
			*
			* The product writes `--dsh-chat-user-width` on the conversation root every
			* frame of a handle drag, which changes only the PROSE column's width —none of
			* the boxes this plugin observes (scroll body, header, composer seat) resize,
			* so a drag used to reach the rail only through the 240ms settle debounce and
			* land as one jump after the pointer stopped (reported 2026-09-18: "拖宽时组件
			* 区域变化很卡顿). The handle carries `data-dragging` for exactly the drag's
			* lifetime, so the watcher costs nothing when idle.
			*/
			let lastSeenMeasure = -1;
			let widthWatchRaf = 0;
			let widthWatching = false;
			/**
			* Column track width latched when a handle drag STARTS.
			*
			* A conversation-width drag moves the transcript MEASURE, not the column, so
			* the column width cannot change mid-drag —re-deriving it every frame would
			* only buy a forced style resolution plus a layout read on the frames that
			* must stay light. Reset when the drag ends, so a resize/sidebar change is
			* picked up again by the normal path.
			*/
			let dragColumnW = 0;
			function readMeasure() {
				const host = document.querySelector("[data-phase]");
				if (host === null) return -1;
				const inline = Number.parseFloat(host.style.getPropertyValue("--dsh-chat-user-width"));
				const value = Number.isFinite(inline) && inline > 0 ? inline : Number.parseFloat(getComputedStyle(host).getPropertyValue("--dsh-chat-content-width"));
				return Number.isFinite(value) && value > 0 ? Math.round(value) : -1;
			}
			function refreshBudgetForWidth() {
				const measure = readMeasure();
				if (measure < 0 || measure === lastSeenMeasure) return;
				lastSeenMeasure = measure;
				const column = dragColumnW > 0 ? dragColumnW : readColumnWidth();
				if (!(column > 0)) return;
				updateRailBudget(Math.max(0, Math.round(column - measure - RAIL_BOX_INSET)));
			}
			function watchWidth() {
				if (widthWatchRaf !== 0) return;
				dragColumnW = readColumnWidth();
				document.documentElement.classList.add("dsx-live-width");
				const tick = () => {
					refreshBudgetForWidth();
					syncWidthWatching();
					if (widthWatching) widthWatchRaf = requestAnimationFrame(tick);
					else {
						widthWatchRaf = 0;
						dragColumnW = 0;
						document.documentElement.classList.remove("dsx-live-width");
						refreshBudgetForWidth();
						scheduleBudgetRefresh();
					}
				};
				widthWatchRaf = requestAnimationFrame(tick);
			}
			let widthHandleArmed = false;
			let pointerHeld = false;
			function syncWidthWatching() {
				const attr = document.querySelector("[data-width-handle][data-dragging]") !== null;
				const dragging = pointerHeld && (widthHandleArmed || attr);
				if (dragging === widthWatching) return;
				widthWatching = dragging;
				if (dragging) watchWidth();
			}
			const onAnyPointerDown = (e) => {
				const target = e.target;
				pointerHeld = true;
				widthHandleArmed = target !== null && typeof target.closest === "function" && target.closest("[data-width-handle]") !== null;
				syncWidthWatching();
			};
			const onAnyPointerUp = () => {
				pointerHeld = false;
				widthHandleArmed = false;
				syncWidthWatching();
			};
			const onWindowBlur = () => {
				pointerHeld = false;
				widthHandleArmed = false;
				syncWidthWatching();
			};
			/** Refresh the budget once the right-bar track has stopped moving. */
			function scheduleBudgetRefresh() {
				if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer);
				railBudgetTimer = window.setTimeout(() => {
					railBudgetTimer = 0;
					updateRailBudget();
					railBudgetTimer = window.setTimeout(() => {
						railBudgetTimer = 0;
						updateRailBudget();
					}, 520);
				}, 240);
			}
			/**
			* Freeze the rail's OWN `transition: right` (fallback path only) for the
			* duration of a track movement; the class expires 160ms after the last tick.
			*/
			function armSyncFreeze() {
				document.documentElement.classList.add("dsx-syncing");
				if (syncTimer !== 0) window.clearTimeout(syncTimer);
				syncTimer = window.setTimeout(() => {
					syncTimer = 0;
					document.documentElement.classList.remove("dsx-syncing");
				}, 160);
			}
			function observeMeasured() {
				if (!ro) return;
				bindFrameTransition();
				for (const sel of [
					"[data-conversation-scroll]",
					"[data-slot=\"conversation.session.header\"]",
					"[data-composer-seat]",
					"[class$=\"_rightbarCol\"]"
				]) {
					const el = document.querySelector(sel);
					if (el && !observedEls.has(el)) {
						observedEls.add(el);
						ro.observe(el);
					}
				}
				const rightbar = document.querySelector("[class$=\"_rightbarCol\"]");
				if (rightbar !== null && rightbar !== rightbarEl) {
					rightbarEl = rightbar;
					entryRightbarW = null;
				}
			}
			function measureRailTop(widthHint, horizontalOnly = false) {
				if (rightbarEl === null || !rightbarEl.isConnected) observeMeasured();
				const rightbarW = widthHint ?? entryRightbarW ?? (rightbarEl !== null ? Math.round(rightbarEl.getBoundingClientRect().width) : 0);
				if (horizontalOnly) {
					scheduleBudgetRefresh();
					if (ANCHOR_FOLLOW) {
						lastRightbarW = rightbarW;
						if (settleTimer !== 0) window.clearTimeout(settleTimer);
						settleTimer = window.setTimeout(() => {
							settleTimer = 0;
							document.documentElement.style.setProperty("--dsx-rightbar-w", `${lastRightbarW}px`);
						}, 200);
						return;
					}
					armSyncFreeze();
					document.documentElement.style.setProperty("--dsx-rightbar-w", `${rightbarW}px`);
					lastRightbarW = rightbarW;
					return;
				}
				if (rightbarW !== lastRightbarW) {
					lastRightbarW = rightbarW;
					if (!ANCHOR_FOLLOW) {
						armSyncFreeze();
						document.documentElement.style.setProperty("--dsx-rightbar-w", `${rightbarW}px`);
					}
					return;
				}
				lastRightbarW = rightbarW;
				document.documentElement.style.setProperty("--dsx-rightbar-w", `${rightbarW}px`);
				const now = performance.now();
				if (now - lastVerticalProbeAt < VERTICAL_PROBE_INTERVAL_MS) {
					if (verticalTimer === 0) verticalTimer = window.setTimeout(() => {
						verticalTimer = 0;
						measureRailTop(entryRightbarW ?? void 0);
					}, VERTICAL_PROBE_INTERVAL_MS);
					return;
				}
				lastVerticalProbeAt = now;
				scheduleBudgetRefresh();
				const el = document.querySelector("[data-conversation-scroll]");
				const top = el ? el.getBoundingClientRect().top : 0;
				document.documentElement.style.setProperty("--dsx-rail-top", `${top + 12}px`);
				const dock = document.querySelector("[data-slot=\"conversation.composer.dock\"]");
				const comp = dock && dock.getBoundingClientRect().height > 0 && dock.getBoundingClientRect().bottom > 0 ? dock : document.querySelector("[data-composer-seat]") || document.querySelector("[data-conversation-composer-overlay]") || el;
				const gap = comp ? Math.max(0, window.innerHeight - comp.getBoundingClientRect().bottom) : 0;
				document.documentElement.style.setProperty("--dsx-input-bottom", `${gap}px`);
			}
			/** Pending observer hint: the reported right-bar width and whether the
			*  trigger was the right-bar column alone (horizontal-only, no vertical work). */
			let pendingHint = { horizontalOnly: false };
			const scheduleMeasure = (widthHint, horizontalOnly = false) => {
				if (typeof widthHint === "number" && Number.isFinite(widthHint)) entryRightbarW = widthHint;
				pendingHint = {
					width: entryRightbarW ?? void 0,
					horizontalOnly: horizontalOnly || pendingHint.horizontalOnly
				};
				if (raf !== 0) return;
				raf = requestAnimationFrame(() => {
					raf = 0;
					const hint = pendingHint;
					pendingHint = { horizontalOnly: false };
					measureRailTop(hint.width, hint.horizontalOnly);
				});
			};
			/** `resize` listener: passes its event, which must never reach the width hint. */
			const onViewportResize = () => {
				scheduleMeasure();
			};
			ctx.effect(() => {
				updateRailBudget();
				measureRailTop();
				lastSeenMeasure = readMeasure();
				window.addEventListener("resize", onViewportResize);
				document.addEventListener("pointerdown", onAnyPointerDown, true);
				document.addEventListener("pointerup", onAnyPointerUp, true);
				document.addEventListener("pointercancel", onAnyPointerUp, true);
				window.addEventListener("blur", onWindowBlur);
				if (typeof ResizeObserver !== "undefined") {
					ro = new ResizeObserver((entries) => {
						let width;
						let vertical = false;
						for (const entry of entries) if (entry.target === rightbarEl || String(entry.target.className ?? "").endsWith("_rightbarCol")) width = Math.round(entry.contentRect.width);
						else vertical = true;
						if (width !== void 0 && width !== lastRightbarW) noteRightbarMoved();
						scheduleMeasure(width, width !== void 0 && !vertical);
					});
					observeMeasured();
				}
				const sub = subscribe(scheduleMeasure);
				return () => {
					window.removeEventListener("resize", onViewportResize);
					document.removeEventListener("pointerdown", onAnyPointerDown, true);
					document.removeEventListener("pointerup", onAnyPointerUp, true);
					document.removeEventListener("pointercancel", onAnyPointerUp, true);
					window.removeEventListener("blur", onWindowBlur);
					pointerHeld = false;
					widthHandleArmed = false;
					widthWatching = false;
					if (widthWatchRaf !== 0) {
						cancelAnimationFrame(widthWatchRaf);
						widthWatchRaf = 0;
					}
					lastSeenMeasure = -1;
					lastSpaceKey = "";
					if (ro) ro.disconnect();
					sub();
					if (syncTimer !== 0) window.clearTimeout(syncTimer);
					if (verticalTimer !== 0) window.clearTimeout(verticalTimer);
					if (settleTimer !== 0) window.clearTimeout(settleTimer);
					if (railBudgetTimer !== 0) window.clearTimeout(railBudgetTimer);
					frameEl?.removeEventListener("transitionrun", onTrackTransitionRun);
					frameEl = null;
					document.documentElement.style.removeProperty("--dsx-rail-avail");
					document.documentElement.classList.remove("dsx-syncing");
					document.documentElement.classList.remove("dsx-live-width");
					document.documentElement.style.removeProperty("--dsx-rail-top");
					document.documentElement.style.removeProperty("--dsx-input-bottom");
					document.documentElement.style.removeProperty("--dsx-rightbar-w");
				};
			});
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "widgets-panel-toggle",
				order: 5
			}, () => {
				const snap = useBridge();
				const unavailable = snap.hasSession && resolveRailLayout(snap.prefs, railBudget, readMinCardSide(snap.prefs.panelPadding), readMaxCardSide(snap.prefs.panelPadding, snap.prefs.cardSide)).constrained;
				const toggle = () => {
					if (unavailable) return;
					const next = !snap.open;
					setState({ open: next });
					setPrefs({ railOpen: next });
				};
				return react.createElement("button", {
					type: "button",
					className: "dsx-stats-capsule",
					"aria-pressed": unavailable ? false : snap.open,
					"aria-disabled": unavailable || void 0,
					"data-space": unavailable ? "tight" : void 0,
					onClick: toggle
				}, react.createElement("span", null, t("ui.capsule")));
			}));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "widgets-panel-collector",
				order: 9999
			}, ({ useSession, useProjection, useChat }) => {
				const settled = (useChat ? useChat((c) => c.legacy?.nodes) : useSession((s) => s.chat?.legacy?.nodes)) ?? [];
				const timeline = (useChat ? useChat((c) => c.timeline) : useSession((s) => s.chat?.timeline)) ?? void 0;
				const runningCalls = (useChat ? useChat((c) => c.legacy?.runningCalls) : useSession((s) => s.runningCalls)) ?? [];
				const running = useSession ? useSession((s) => s.running) : false;
				const projected = useProjection ? useProjection("sessionStats") : void 0;
				const usage = useProjection ? useProjection("tokenUsage") : void 0;
				const contextPres = useProjection ? useProjection("contextPressure") : void 0;
				const contextBrk = useProjection ? useProjection("contextBreakdown") : void 0;
				const todosProj = useProjection ? useProjection("todos") : void 0;
				const snap = useBridge();
				const heatmapRef = react.useRef(loadHeatmapStore());
				const anchorRef = react.useRef(loadHeatmapAnchor());
				const [heatmap, setHeatmap] = react.useState(heatmapRef.current);
				react.useEffect(() => {
					setState({ hasSession: true });
					return () => {
						setState({ hasSession: false });
					};
				}, []);
				const prevRunningRef = react.useRef(running);
				react.useEffect(() => {
					const refresh = () => {
						fetch("/api/opencode-usage").then((r) => r.json()).then((data) => setState({ usageData: data })).catch(() => {});
						fetch("/api/opencode-usage-multi").then((r) => r.json()).then((data) => setState({ usageMulti: data })).catch(() => {});
						fetch("/api/commandcode-usage").then(async (r) => {
							const data = await r.json().catch(() => null);
							if (!r.ok) {
								const error = data?.error;
								if (r.status === 404) setState({
									commandCode: null,
									commandCodeError: "unloaded"
								});
								else if (r.status === 503) setState({
									commandCode: null,
									commandCodeError: "unconfigured"
								});
								else setState({
									commandCode: null,
									commandCodeError: error ? `http:${r.status}:${error}` : `http:${r.status}`
								});
								return;
							}
							setState({
								commandCode: data,
								commandCodeError: null
							});
						}).catch(() => setState({
							commandCode: null,
							commandCodeError: "unavailable"
						}));
						fetch("/api/widgets-usage-daily?refresh=1").then(async (r) => r.ok ? await r.json().catch(() => null) : null).then((data) => {
							setState({ usageDaily: data?.available === true && data.daily !== null && data.daily !== void 0 ? data.daily : null });
						}).catch(() => {});
					};
					if (running === prevRunningRef.current) refresh();
					else if (!running) refresh();
					prevRunningRef.current = running;
				}, [running]);
				react.useEffect(() => {
					const pull = () => {
						fetch("/api/widgets-usage-daily").then(async (r) => r.ok ? await r.json().catch(() => null) : null).then((data) => {
							setState({ usageDaily: data?.available === true && data.daily !== null && data.daily !== void 0 ? data.daily : null });
						}).catch(() => {});
					};
					const id = window.setInterval(pull, 6e4);
					pull();
					return () => window.clearInterval(id);
				}, []);
				react.useEffect(() => {
					const sysKeys = (snap.prefs.installed ?? []).filter((key) => SYS_WIDGET_IDS.some((id) => key === id || key.startsWith(id + "@")));
					const secs = sysKeys.length === 0 ? 0 : Math.min(...sysKeys.map((key) => resolveInterval(snap.prefs.cardConfigs?.[key])));
					if (!(secs > 0)) return;
					const refresh = () => {
						fetch("/api/sysinfo").then((r) => r.json()).then((data) => {
							setState({ sysinfo: data });
							ingestSysInfo(data);
						}).catch(() => {});
					};
					refresh();
					const id = window.setInterval(refresh, secs * 1e3);
					return () => window.clearInterval(id);
				}, [snap.prefs.installed, snap.prefs.cardConfigs]);
				const [now, setNow] = react.useState(() => Date.now());
				react.useEffect(() => {
					if (!running) return;
					setNow(Date.now());
					const id = window.setInterval(() => setNow(Date.now()), 1e3);
					return () => window.clearInterval(id);
				}, [running]);
				react.useEffect(() => {
					const id = window.setInterval(() => setNow(Date.now()), 3e4);
					return () => window.clearInterval(id);
				}, []);
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
					const authoritative = snap.usageDaily;
					const heatTz = prefs.cardConfigs?.heatmap?.timeZone || "Asia/Shanghai";
					{
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
							const day = dateKey(new Date(start), heatTz);
							heatmapRef.current = accumulateHeatmap(heatmapRef.current, day, total);
							dirty = true;
						}
						if (dirty) {
							saveSeen(seenState.keys, seenState.strongest);
							if (authoritative === null || authoritative === void 0) setHeatmap(heatmapRef.current);
						}
						const current = usage ? inputTokens + outputTokens : 0;
						if (nodeUsageOk && usage && current > anchorRef.current) {
							anchorRef.current = current;
							saveHeatmapAnchor(current);
						}
						if ((authoritative === null || authoritative === void 0) && !nodeUsageOk && usage) {
							const todayKey = dateKey(/* @__PURE__ */ new Date(), heatTz);
							const todayActivity = (settled ?? []).some((n) => n?.kind === "assistant" && n?.timing?.stepStartTime != null && dateKey(new Date(n.timing.stepStartTime), heatTz) === todayKey);
							if (current < anchorRef.current) {
								anchorRef.current = current;
								saveHeatmapAnchor(current);
							} else if (todayActivity) {
								const delta = current - anchorRef.current;
								anchorRef.current = current;
								saveHeatmapAnchor(current);
								heatmapRef.current = accumulateHeatmap(heatmapRef.current, todayKey, delta);
								setHeatmap(heatmapRef.current);
							} else if (current > anchorRef.current) {
								anchorRef.current = current;
								saveHeatmapAnchor(current);
							}
						}
					}
					/** The day map the cards render: authoritative, with TODAY topped up by
					*  the live per-step counter (see `mergeToday`) so a finished turn shows
					*  up at once instead of waiting for usage-center's next scan. */
					const heatmapDays = mergeToday(authoritative, heatmapRef.current, dateKey(/* @__PURE__ */ new Date(), heatTz));
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
						heatmapGrid: buildHeatmapGrid(heatmapDays, prefs.cardConfigs?.heatmap?.monthMode || "rolling", heatTz),
						heatmapRaw: { ...heatmapDays },
						trajectory: deriveTrajectory(settled, runningCalls, timeline, now)
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
					snap.usageDaily,
					prefs.cardConfigs?.heatmap?.monthMode,
					prefs.cardConfigs?.heatmap?.timeZone
				]);
				return null;
			}));
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
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
				const cyclePool = (key) => (out) => {
					const modes = out.cycle?.modes ?? [];
					if (modes.length === 0) return;
					const current = out.cycle?.current ?? modes[0];
					const idx = modes.indexOf(current);
					const next = modes[(idx < 0 ? -1 : idx) + 1] ?? modes[0];
					const store = out.cycle?.store ?? "poolView";
					setPrefs({ cardConfigs: {
						...prefs.cardConfigs,
						[key]: {
							...prefs.cardConfigs[key] ?? {},
							[store]: next
						}
					} });
					if (out.cycle?.store) return;
					const entry = snap.usageMulti?.keys.find((k) => k.label === next);
					fetch("/api/multikey", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							action: "prefer",
							ref: next === "total" ? "" : entry?.ref ?? ""
						})
					}).catch(() => {});
				};
				react.useEffect(() => {
					if (!snap.open || !snap.hasSession) setAddOpen(false);
				}, [snap.open, snap.hasSession]);
				/**
				* The rail's measured viewport height (clientHeight), tracked with a
				* ResizeObserver. It is the one input the scroll geometry cannot derive: the
				* rail is `position: fixed; top: var(--dsx-rail-top); bottom: 0`, so its
				* height follows the window, the session header and the composer, and the
				* scroll tail that makes the LAST row reachable must reserve exactly one of
				* these. Declared above the drawer's early return so the hook order never
				* changes, and initialised to 0: the first painted frame then simply shows a
				* shorter (still correct-looking) scroll range, and the observer's first
				* callback —same tick as the layout —replaces it before the user can
				* scroll.
				*/
				const [railPaneH, setRailPaneH] = react.useState(0);
				const railElRef = react.useRef(null);
				react.useLayoutEffect(() => {
					const measure = () => {
						const rail = railElRef.current;
						if (rail === null) return;
						setRailPaneH((prev) => prev === rail.clientHeight ? prev : rail.clientHeight);
					};
					measure();
					if (typeof ResizeObserver === "undefined") return;
					const ro = new ResizeObserver(measure);
					window.addEventListener("resize", measure);
					const retry = window.setTimeout(() => {
						const rail = railElRef.current;
						if (rail !== null) ro.observe(rail);
						measure();
					}, 0);
					return () => {
						window.clearTimeout(retry);
						window.removeEventListener("resize", measure);
						ro.disconnect();
					};
				}, [snap.open, snap.hasSession]);
				const shouldOpen = snap.open && snap.hasSession;
				const [drawerPhase, setDrawerPhase] = react.useState(shouldOpen ? "open" : "closed");
				const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && !!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				const bootRestorePending = react.useRef(snap.open && !snap.hasSession);
				const DRAWER_LEAVE_MS = 350;
				react.useEffect(() => {
					setDrawerPhase((p) => {
						if (shouldOpen) {
							if (p === "closed") {
								if (bootRestorePending.current) {
									bootRestorePending.current = false;
									return "open";
								}
								return "enter";
							}
							return p === "leave" ? "open" : p;
						}
						return p === "closed" ? "closed" : "leave";
					});
				}, [shouldOpen]);
				react.useEffect(() => {
					if (drawerPhase !== "enter") return;
					let raf2 = 0;
					const raf1 = requestAnimationFrame(() => {
						raf2 = requestAnimationFrame(() => setDrawerPhase((p) => p === "enter" ? "open" : p));
					});
					return () => {
						cancelAnimationFrame(raf1);
						if (raf2) cancelAnimationFrame(raf2);
					};
				}, [drawerPhase]);
				react.useEffect(() => {
					if (drawerPhase !== "leave") return;
					if (reduceMotion) {
						setDrawerPhase("closed");
						return;
					}
					const t = window.setTimeout(() => setDrawerPhase((p) => p === "leave" ? "closed" : p), DRAWER_LEAVE_MS);
					return () => window.clearTimeout(t);
				}, [drawerPhase, reduceMotion]);
				if (drawerPhase === "closed") return null;
				const space = resolveRailSpace(prefs, railBudget);
				const yielded = space.yielded;
				const side = space.side;
				const pad = space.pad;
				const columns = space.columns;
				const multi = columns > 1;
				const railW = space.drawW;
				const hidden = space.hidden;
				document.documentElement.style.setProperty("--dsx-rail-w", `${space.claimW}px`);
				document.documentElement.style.setProperty("--dsx-rail-pad", `${pad}px`);
				document.documentElement.style.setProperty("--dsx-rail-overshoot", `0px`);
				applyRailRight(space.swallowed);
				const statsHeat = snap.stats ?? null;
				const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0 ? statsHeat.heatmapRaw : snap.usageDaily ?? loadHeatmapStore();
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
					...statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, prefs.cardConfigs?.heatmap?.monthMode || "rolling", prefs.cardConfigs?.heatmap?.timeZone || "Asia/Shanghai") }
				};
				const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1 ? ["total", ...snap.usageMulti.keys.map((entry, i) => entry.label || `Key ${i + 1}`)] : void 0;
				const items = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1).map((key) => {
					const { widgetId, size } = parseInstanceKey(key);
					const w = WIDGETS.find((x) => x.id === widgetId);
					if (!w || sizesOf(w).indexOf(size) === -1) return null;
					let out;
					try {
						out = w.render({
							...base,
							usageData: snap.usageData,
							usageMulti: snap.usageMulti,
							commandCode: snap.commandCode,
							commandCodeError: snap.commandCodeError,
							sysinfo: snap.sysinfo,
							poolModes,
							armedAction,
							...prefs.cardConfigs?.[key] ?? {}
						}, { size });
					} catch (error) {
						console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error);
						out = {
							title: widgetName(w),
							value: "—",
							legend: t("ui.renderError")
						};
					}
					const source = WIDGET_SOURCE[widgetId];
					if (source !== void 0 && isSourcePending(source, snap)) out = {
						title: out?.title ?? widgetName(w),
						skeleton: true,
						skeletonRows: SKELETON_ROWS[source]
					};
					if (!out) return null;
					const baseW = size === "2x4" ? 2 * side + pad : side;
					return {
						key,
						size,
						w,
						out,
						baseW
					};
				}).filter((it) => it !== null).filter((it) => !(columns === 1 && it.size === "2x4"));
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
						const rowItems = [[]];
						const rowUsed = (r) => rowItems[r].reduce((sum, k) => sum + spanOf(k), 0);
						const place = (i, allowRound) => {
							const sp = spanOf(i);
							for (let r = 0; r < rowItems.length; r++) if (rowUsed(r) + sp <= columns) {
								rowItems[r].push(i);
								return;
							}
							const last = rowItems.length - 1;
							if (allowRound && columns === 3 && sp === 2 && rowUsed(last) === columns - 1) {
								const row = rowItems[last];
								const narrows = row.filter((k) => spanOf(k) === 1);
								if (narrows.length > 0 && row.length === narrows.length) {
									rowItems[last] = [i, narrows[0]];
									for (const k of narrows.slice(1)) {
										rowItems.push([]);
										place(k, false);
									}
									return;
								}
							}
							rowItems.push([i]);
						};
						for (let i = 0; i < n; i++) place(i, true);
						while (rowItems.length > 0 && rowItems[rowItems.length - 1].length === 0) rowItems.pop();
						for (let r = 0; r < rowItems.length; r++) {
							let used = 0;
							for (const i of rowItems[r]) {
								rowIndexOf[i] = r;
								colIndexOf[i] = used;
								used += spanOf(i);
							}
						}
					} else for (let i = 0; i < n; i++) {
						rowIndexOf[i] = i;
						colIndexOf[i] = 0;
					}
				}
				const rows = multi ? rowIndexOf.reduce((m, r) => Math.max(m, r + 1), 0) : n;
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
				const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2);
				const addSlotFor = (layout) => {
					if (n === 0) return {
						top: 2 + pad,
						right: 0
					};
					if (multi) {
						const lastRow = rowIndexOf.reduce((m, r) => Math.max(m, r), 0);
						let lastRowUsed = 0;
						for (let i = 0; i < n; i++) {
							if (rowIndexOf[i] !== lastRow) continue;
							lastRowUsed = Math.max(lastRowUsed, colIndexOf[i] + spanOf(i));
						}
						if (lastRowUsed < columns) {
							let sIdx = -1;
							let lIdx = -1;
							for (let i = 0; i < n; i++) {
								if (rowIndexOf[i] !== lastRow) continue;
								if (sIdx === -1 || staticLayout[i].right > staticLayout[sIdx].right) sIdx = i;
								if (lIdx === -1 || layout[i].right > layout[lIdx].right) lIdx = i;
							}
							const contentW = railW - 2 * pad;
							if (sIdx !== -1 && lIdx !== -1) {
								const sLeftmost = staticLayout[sIdx];
								if (contentW - sLeftmost.right - sLeftmost.w - pad >= side) {
									const leftmost = layout[lIdx];
									return {
										top: leftmost.top,
										right: leftmost.right + leftmost.w + pad
									};
								}
							}
						}
						return {
							top: layout.reduce((m, c) => Math.max(m, c.top + c.h), 2) + pad,
							right: 0
						};
					}
					return {
						top: layout.reduce((m, c) => Math.max(m, c.top + c.h), 2) + pad,
						right: 0
					};
				};
				const nItems = items.length;
				const staticAdd = addSlotFor(staticLayout);
				const addTop = staticAdd.top;
				const addRight = staticAdd.right;
				const addBottom = addTop + side;
				const stackHeight = (nItems > 0 ? Math.max(deckBottom, addBottom) : addBottom) + pad;
				/**
				* ── SCROLL GEOMETRY: how tall the SCROLL CONTENT must be ──
				*
				* Row `r` is seated at `RAIL_ROW_SEAT + r · pitch` (placeCards) and the rail's
				* range is `contentH − clientH`, so the LAST row can top out exactly when
				*
				*     contentH = max(rows · pitch, stackHeight) + paneH
				*
				* with `paneH` the rail's MEASURED clientHeight. The deck's own box stays its
				* natural height (`stackHeight`); the difference is reserved by the TAIL element
				* inside the rail (see RailWave), because the deck's box is ALSO the overlay's box
				* and the two decks must stay pixel-identical while the wave is live.
				*
				* Without the reservation the browser CLAMPS the last detents and the deck stops
				* moving (measured 1578×1000, 8 rows × pitch 184: range 750 < the 5th detent, so
				* rows 5–8 could never top out — the reported "a row stays half hidden and further
				* scrolling does nothing at all"). With MORE than one detent-range of extra content
				* the wheel keeps scrolling past the last row into empty space — the reported
				* "keep scrolling and it is just blank" — so the tail is exactly the difference
				* between the two, never a fixed guess.
				*/
				const paneH = railPaneH;
				const scrollPitch = Math.max(1, side + pad);
				const deckH = stackHeight;
				/**
				* How far the deck may scroll: the last row whose cards still reach into the
				* viewport. Beyond that the wheel would only pull empty space up — the reported
				* "keep scrolling and it is just blank".
				*
				* `contentBottom` is the deepest CARD bottom (the add tile hangs below the grid
				* or fills its last-row cell, so it is not the thing the user is scrolling to
				* see). The range that just fits it is `contentBottom − clientH`; the last row
				* allowed is therefore `floor((range − RAIL_ROW_SEAT) / pitch)`, floored at row 0
				* so a deck shorter than the viewport still has one detent.
				*/
				const contentBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2);
				/**
				* HIGHEST ROW THAT MAY TOP OUT — the scroll stop the user asked for.
				*
				* A row may top out only while its own cards still REACH INTO the viewport; past
				* that the wheel would pull up nothing but the empty tail. The last such row is
				* the one holding the deepest bottom that is still on screen:
				*
				*     cards' visible bottom at row r = r · pitch + clientH  (r · pitch = their top)
				*     last row                       = ceil((contentBottom + clientH − seat) / pitch) − 1
				*
				* Measured 1578×1000 with 8 rows × 184 (contentBottom 1450, clientH 936): the last
				* row is 7, so the deck stops with row 7 at the top and its cards showing — the
				* extra detents into blank space are gone. (A tighter `contentBottom − clientH`
				* cap is WRONG: it lands on row 2 here and would hide rows 3–7 entirely.)
				*/
				const lastRow = Math.max(0, Math.min(rows - 1, Math.ceil((contentBottom + paneH - RAIL_ROW_SEAT) / scrollPitch) - 1));
				const cardBodyFor = (it, width) => [react.createElement(CardBody, {
					key: "b",
					out: it.out,
					unit: side,
					width,
					onAction: handleAction,
					onCycle: cyclePool(it.key)
				}), react.createElement("span", {
					key: "r",
					className: "dsx-stats-resize",
					"aria-label": t("ui.rail.resizeAria"),
					onPointerDown: (e) => {
						e.preventDefault();
						e.stopPropagation();
						const sx = e.clientX;
						const s0 = prefs.cardSide;
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
				})];
				const overlayCardBodies = items.map((it) => cardBodyFor(it, it.baseW));
				const toggleAdd = () => setAddOpen((v) => !v);
				const deck = react.createElement("div", {
					key: "__deck",
					style: {
						position: "relative",
						height: `${deckH}px`
					}
				}, staticLayout.map((c, idx) => {
					const it = items[idx];
					const slotStyle = {
						position: "absolute",
						top: `${c.top.toFixed(2)}px`,
						right: `${c.right.toFixed(2)}px`,
						width: `${c.w.toFixed(2)}px`,
						height: `${c.h.toFixed(2)}px`
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: slotStyle
					}, ...cardBodyFor(it, c.w));
				}), react.createElement("button", {
					key: "__add",
					type: "button",
					className: "dsx-stats-add",
					"aria-label": t("ui.rail.addAria"),
					onClick: toggleAdd,
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
				}))), react.createElement("span", { className: "dsx-stats-add-label" }, t("ui.rail.addLabel"))));
				const rail = react.createElement(RailWave, {
					key: "__wave",
					deck,
					cardBodies: overlayCardBodies,
					railElRef,
					onAddClick: toggleAdd,
					items,
					side,
					pad,
					railW,
					stackHeight,
					rows,
					deckH,
					paneH,
					lastRow,
					addRadius,
					active,
					placeCards,
					scaleFor,
					nearest,
					stepScale,
					xPts,
					yPts,
					addSlotFor,
					restLayout: staticLayout,
					restAdd: staticAdd,
					live: snap.open && snap.hasSession,
					shiftX: space.shiftX,
					columns
				});
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
				const addPanel = (0, react_dom.createPortal)(react.createElement("div", {
					className: "dsx-stats-addpanel" + (addOpen ? " open" : ""),
					style: {
						top: "var(--dsx-rail-top,0px)",
						width: `${pw}px`
					}
				}, react.createElement("span", {
					className: "dsx-stats-addpanel-resize",
					"aria-label": t("ui.addPanel.resizeAria"),
					onPointerDown: startResize
				}), react.createElement("div", { className: "dsx-stats-addpanel-header" }, react.createElement("div", { className: "dsx-stats-addpanel-title" }, t("ui.addPanel.title")), react.createElement("button", {
					type: "button",
					className: "dsx-stats-addpanel-close",
					"aria-label": t("ui.addPanel.closeAria"),
					onClick: () => setAddOpen(false)
				}, closeIcon)), react.createElement("div", { className: "dsx-stats-addpanel-body" }, react.createElement(WidgetsPage, {
					controller: {
						prefs,
						setPrefs
					},
					hideHeader: true
				}))), document.body);
				const drawerTravel = Math.round(railW + 24);
				const drawerTransform = drawerPhase === "enter" || drawerPhase === "leave" ? `translateX(${drawerTravel}px)` : "none";
				const drawerTransition = reduceMotion ? "none" : "transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)";
				const drawerOpacity = hidden ? 0 : 1;
				return react.createElement("div", {
					key: "__drawer",
					ref: (el) => {
						drawerEl = el;
					},
					className: "dsx-stats-drawer",
					"data-yielded": yielded ? "" : void 0,
					"data-no-room": hidden ? "" : void 0,
					style: {
						position: "fixed",
						inset: 0,
						pointerEvents: "none",
						transform: drawerTransform,
						opacity: drawerOpacity,
						transition: `${drawerTransition}, opacity var(--ds-transition-duration-slow) var(--ds-ease-in-out)`
					}
				}, rail, addPanel);
			}));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "widgets",
				order: 30,
				label: () => t("ui.section.label")
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
					document.body.classList.toggle("dsx-stats-no-session", !state.hasSession);
					scheduleMeasure();
				};
				const sub = subscribe(apply);
				apply();
				return () => {
					sub();
					document.body.classList.remove("dsx-stats-active");
					document.body.classList.remove("dsx-stats-no-session");
				};
			});
			ctx.effect(() => {
				const apply = () => {
					document.body.classList.toggle("dsx-hide-statsline", prefs.hideStatsLine);
				};
				const sub = subscribe(apply);
				apply();
				return () => {
					sub();
					document.body.classList.remove("dsx-hide-statsline");
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