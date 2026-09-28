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
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\tokens.module.css.mjs
		const css$5 = ":root{--dsx-nav-glyph:url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%20fill='none'%20stroke='%23fff'%20stroke-width='1.25'%20stroke-linejoin='round'%3E%3Crect%20x='1.1'%20y='1.1'%20width='4.6'%20height='5.5'%20rx='1.4'/%3E%3Crect%20x='1.1'%20y='9.4'%20width='4.6'%20height='5.5'%20rx='1.4'/%3E%3Crect%20x='8.9'%20y='1.1'%20width='6'%20height='7.1'%20rx='1.8'/%3E%3Crect%20x='8.9'%20y='10.9'%20width='4.4'%20height='4'%20rx='1.3'/%3E%3C/svg%3E\");--dsx-rail-right:anchor(--dsx-center right, var(--dsx-rightbar-w,var(--dsh-sidebar-width,0px)))}";
		const tagId$5 = "dsh-widgets/src/client/styles/tokens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\card.module.css.mjs
		const css$4 = ".dsx-stats-rail,.dsx-magnify-layer{font-family:var(--dsw-font-family,-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif);font-size:16px;line-height:normal}.dsx-stats-capsule{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:14px;align-items:center;gap:6px;padding:0 12px;font-size:13px;line-height:1;display:inline-flex}.dsx-stats-capsule[aria-pressed=true]{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-stats-capsule[data-space=tight]{opacity:.45;cursor:not-allowed}.dsx-stats-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;justify-content:flex-start;display:flex;position:relative;overflow:hidden}.dsx-stats-card.dsx-squircle{corner-shape:squircle}.dsx-stats-card[data-dsx-overflow=\"1\"]{outline:2px solid var(--dsw-alias-state-error-primary);outline-offset:-3px}[data-dsx-nav=widgets]>svg{display:none}[data-dsx-nav=widgets]:before{content:\"\";width:16px;height:16px;-webkit-mask:var(--dsx-nav-glyph) center / 16px 16px no-repeat;mask:var(--dsx-nav-glyph) center / 16px 16px no-repeat;background-color:currentColor;flex:none}.dsx-stats-card.dsx-cyclable{cursor:pointer;transition:transform .24s cubic-bezier(.34,1.56,.64,1)}.dsx-stats-card.dsx-cyclable.dsx-cycle-pressed{transition:transform 80ms ease-out;transform:scale(.93)}.dsx-stats-card-title{color:var(--dsw-alias-state-business-primary);line-height:1.2}.dsx-stats-card-title,.dsx-stats-card-value,.dsx-stats-card-sub,.dsx-stats-card-legend,.dsx-stats-card-headafter,.dsx-stats-card-meter{white-space:nowrap}.dsx-stats-card-value,.dsx-stats-card-sub,.dsx-stats-card-legend{text-overflow:ellipsis;overflow:hidden}.dsx-sk{background:linear-gradient(90deg, var(--dsw-alias-interactive-bg-hover) 0%, color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 45%, var(--dsw-alias-bg-layer-1)) 50%, var(--dsw-alias-interactive-bg-hover) 100%);animation:dsx-sk-sweep 1.5s var(--ds-ease-in-out) infinite;background-size:200% 100%}@keyframes dsx-sk-sweep{0%{background-position:120% 0}to{background-position:-20% 0}}@media (prefers-reduced-motion:reduce){.dsx-sk{animation:none}}.dsx-sk-card{pointer-events:none}.dsx-stats-card-value{color:var(--dsw-alias-label-primary);word-break:break-word;font-weight:600;line-height:1.25}.dsx-stats-card-sub{color:var(--dsw-alias-label-caption);font-size:10px}.dsx-stats-resize{cursor:nesw-resize;z-index:2;opacity:0;background:linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%, var(--dsw-alias-label-tertiary) 62%, transparent 62%);width:18px;height:18px;position:absolute;bottom:0;left:0}.dsx-stats-card:hover .dsx-stats-resize{opacity:1}.dsx-stats-card-corner{background:var(--dsw-alias-state-business-primary);color:#fff;cursor:pointer;width:42px;height:42px;box-shadow:var(--dsw-shadow-lv1);border:none;border-radius:21px;justify-content:center;align-items:center;font-size:10px;transition:background .16s,width .16s,color .16s;display:inline-flex;position:absolute}.dsx-stats-card-corner:hover{background:var(--dsw-alias-state-business-primary);filter:brightness(1.08)}.dsx-stats-card-corner.armed{font-weight:600}@keyframes dsx-figure-drop{0%{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}.dsx-figure-drop{animation:.2s ease-out dsx-figure-drop}@media (prefers-reduced-motion:reduce){.dsx-figure-drop{animation:none}}[data-conversation-scroll]{transition:padding-right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}html.dsx-live-width [data-conversation-scroll]{transition:padding-right .26s cubic-bezier(.34,1.36,.52,1)}[data-yielded] .dsx-stats-rail,[data-yielded] .dsx-stats-addpanel{pointer-events:none!important}";
		const tagId$4 = "dsh-widgets/src/client/styles/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\rail.module.css.mjs
		const css$3 = "@supports (anchor-name:--dsx-center){[data-phase=active],body:not(:has([data-phase=active])) [class$=_centerCol]{anchor-name:--dsx-center}.dsx-stats-addpanel{right:calc(var(--dsx-rail-right) + var(--dsx-rail-pad,14px))}}.dsx-stats-rail{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out);-ms-overflow-style:none}@media (prefers-reduced-motion:reduce){.dsx-stats-rail{transition:none}}.dsx-stats-rail::-webkit-scrollbar{width:0;height:0;display:none}@supports not selector(::-webkit-scrollbar){.dsx-stats-rail{scrollbar-width:none}}body[data-dsh-sidebar-dragging] .dsx-stats-rail{transition:none}html.dsx-syncing .dsx-stats-rail{transition:none!important}body.dsx-stats-active [data-conversation-scroll]{padding-right:var(--dsx-rail-w,0px)}body.dsx-stats-active [data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{right:calc(var(--dsh-scrollbar-width) + var(--dsx-rail-w,0px))}[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{transition:right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}body.dsx-stats-active [data-slot=\"conversation.composer.dock\"]{visibility:hidden!important}[data-conversation-scroll] :has(>nav[aria-label]){z-index:9}body.dsx-stats-no-session .dsx-stats-drawer{visibility:hidden!important;pointer-events:none!important}.dsx-stats-drawer[data-no-room] .dsx-stats-rail{pointer-events:none!important}.dsx-stats-card-slot{transition:top .26s cubic-bezier(.34,1.36,.52,1),right .26s cubic-bezier(.34,1.36,.52,1),width .26s cubic-bezier(.34,1.36,.52,1),height .26s cubic-bezier(.34,1.36,.52,1)}.dsx-stats-card-slot .dsx-stats-card{transition:border-color .18s,box-shadow .18s}.dsx-wave-deck .dsx-stats-card-slot,.dsx-wave-deck .dsx-stats-add{visibility:visible}.dsx-wave-deck.dsx-wave-on .dsx-stats-card-slot,.dsx-wave-deck.dsx-wave-on .dsx-stats-add{visibility:hidden}@keyframes dsx-card-wave{0%{transform:translateY(-1.6%)scale(.99)}55%{transform:translateY(.5%)scale(1.003)}to{transform:translateY(0)scale(1)}}.dsx-wave-run .dsx-stats-card-slot{animation:dsx-card-wave .34s var(--ds-ease-in-out) both;animation-delay:var(--dsx-wave-delay,0s)}.dsx-wave-run .dsx-stats-card-slot:first-child{--dsx-wave-delay:0s}.dsx-wave-run .dsx-stats-card-slot:nth-child(2){--dsx-wave-delay:30ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(3){--dsx-wave-delay:60ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(4){--dsx-wave-delay:90ms}.dsx-wave-run .dsx-stats-card-slot:nth-child(5){--dsx-wave-delay:.12s}.dsx-wave-run .dsx-stats-card-slot:nth-child(6){--dsx-wave-delay:.15s}.dsx-wave-run .dsx-stats-card-slot:nth-child(7){--dsx-wave-delay:.18s}.dsx-wave-run .dsx-stats-card-slot:nth-child(8){--dsx-wave-delay:.21s}.dsx-wave-run .dsx-stats-card-slot:nth-child(9){--dsx-wave-delay:.24s}.dsx-wave-run .dsx-stats-card-slot:nth-child(10){--dsx-wave-delay:.27s}.dsx-wave-run .dsx-stats-card-slot:nth-child(11){--dsx-wave-delay:.3s}.dsx-wave-run .dsx-stats-card-slot:nth-child(n+12){--dsx-wave-delay:.33s}@media (prefers-reduced-motion:reduce){.dsx-wave-run .dsx-stats-card-slot{animation:none}}.dsx-slot-focused .dsx-stats-card,.dsx-stats-card-slot:hover .dsx-stats-card{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary), 0 10px 28px color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)}.dsx-stats-resize{transition:opacity .12s}.dsx-stats-add{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:border-color .18s ease, color .18s ease, background .18s ease, transform .18s var(--ds-ease-in-out);background:0 0;border-radius:16px;flex-direction:column;flex:none;justify-content:center;align-items:center;gap:6px;display:flex}.dsx-stats-add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);transform:scale(1.04)}.dsx-stats-add-icon{color:var(--dsw-alias-state-business-primary);justify-content:center;align-items:center;line-height:1;display:flex}.dsx-stats-add-label{font-size:13px;font-weight:500;line-height:1}";
		const tagId$3 = "dsh-widgets/src/client/styles/rail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\panel.module.css.mjs
		const css$2 = ".dsx-stats-addpanel{pointer-events:auto;right:calc(var(--dsx-rightbar-w,var(--dsh-sidebar-width,0px)) + var(--dsx-rail-pad,14px));width:auto;bottom:max(calc(var(--dsx-input-bottom,28px) / 2), 8px);z-index:30;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:transform .28s var(--ds-ease-in-out), width var(--ds-transition-duration-slow) var(--ds-ease-in-out), visibility 0s linear .28s;visibility:hidden;border-radius:16px;flex-direction:column;display:flex;position:fixed;transform:translate(calc(100% + 40px))}.dsx-stats-addpanel.dsx-squircle{corner-shape:squircle}.dsx-stats-addpanel.open{visibility:visible;transition-delay:0s;transform:translate(0)}.dsx-stats-addpanel-resize{cursor:ew-resize;z-index:3;width:10px;position:absolute;top:0;bottom:0;left:-5px}.dsx-stats-addpanel-header{flex:none;align-items:center;gap:8px;padding:12px 12px 4px;display:flex}.dsx-stats-addpanel-title{color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;line-height:22px}.dsx-stats-addpanel-close{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background .12s,color .12s;display:inline-flex}.dsx-stats-addpanel-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-stats-addpanel-body{flex:1;min-height:0;padding:10px 12px 12px;overflow:hidden}.dsx-stats-addpanel-body>div{height:100%;min-height:0}.dsx-order-row{box-sizing:border-box;border-radius:10px;align-items:center;gap:8px;min-height:40px;padding:8px 16px 8px 12px;display:flex;position:relative}.dsx-order-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-order-row.selected{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);cursor:pointer}@keyframes dsx-drawer-in{0%{transform:translate(24px)}to{transform:translate(0)}}.dsx-trash{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;transition:color .12s,background .12s;display:flex}.dsx-trash:hover{color:var(--dsw-alias-state-danger,#e5484d);background:var(--dsw-alias-interactive-bg-hover)}.dsx-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;border-radius:9px;flex:none;padding:1px 8px;font-size:11px}.dsx-tabbar{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;display:flex}.dsx-drawer-close{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.dsx-drawer-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 2px;font-size:13px;font-weight:500;line-height:16px}.dsx-tab[data-active=true]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary)}";
		const tagId$2 = "dsh-widgets/src/client/styles/panel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\market.module.css.mjs
		const css$1 = ".dsx-marketbar{flex:none;align-items:center;gap:8px;margin-bottom:10px;display:flex}.dsx-searchwrap{border-style:solid;border-width:1px;border-color:var(--dsw-alias-border-l2);box-sizing:border-box;min-width:0;height:30px;color:var(--dsw-alias-label-tertiary);border-radius:10px;flex:auto;align-items:center;gap:6px;padding:0 8px 0 9px;display:flex}.dsx-searchwrap:focus-within{border-color:var(--dsw-alias-state-business-primary)}.dsx-searchicon{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;display:inline-flex}.dsx-search{min-width:0;height:26px;color:var(--dsw-alias-label-primary);box-sizing:border-box;background:0 0;border-style:none;border-width:0;outline:none;flex:auto;padding:0;font-size:13px}.dsx-search::placeholder{color:var(--dsw-alias-label-tertiary)}.dsx-viewtoggle{border-style:solid;border-width:1px;border-color:var(--dsw-alias-border-l2);box-sizing:border-box;background:0 0;border-radius:15px;flex:none;align-items:stretch;height:30px;display:inline-flex;overflow:hidden}.dsx-viewbtn{width:34px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-style:none;border-width:0;justify-content:center;align-items:center;padding:0;display:inline-flex}.dsx-viewbtn+.dsx-viewbtn{border-left-style:solid;border-left-width:1px;border-left-color:var(--dsw-alias-border-l2)}.dsx-viewbtn[data-active=true],.dsx-viewbtn:hover{color:var(--dsw-alias-label-primary)}.dsx-ring{border-radius:inherit;pointer-events:none;z-index:1;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);position:absolute;inset:0}.dsx-gallery{flex:auto;grid-template-columns:1fr 1fr;align-content:start;justify-items:center;gap:16px 10px;min-height:0;padding:6px 8px 12px;display:grid;overflow-y:auto}.dsx-gcard{cursor:pointer;font:inherit;background:0 0;border-style:none;border-width:0;border-radius:14px;flex-direction:column;align-items:center;gap:7px;padding:0;display:flex;position:relative}.dsx-mkt{flex:auto;min-height:0;position:relative;overflow:hidden}.dsx-mkt-layer{flex-direction:column;min-height:0;display:flex;position:absolute;inset:0}.dsx-mkt-layer.is-front{z-index:2;background:var(--dsw-alias-bg-layer-1,#fff)}.dsx-mkt-push-out{animation:dsx-mkt-out var(--dsx-market-motion,.38s) var(--ds-ease-in-out) both}.dsx-mkt-push-in{animation:dsx-mkt-in var(--dsx-market-motion,.38s) var(--ds-ease-in-out) both}.dsx-mkt-push-out.is-rev,.dsx-mkt-push-in.is-rev{animation-direction:reverse}@keyframes dsx-mkt-out{0%{opacity:1;transform:translate(0)}to{opacity:.75;transform:translate(-28%)}}@keyframes dsx-mkt-in{0%{opacity:1;transform:translate(100%)}to{opacity:1;transform:translate(0)}}@media (prefers-reduced-motion:reduce){.dsx-mkt-push-out,.dsx-mkt-push-in{animation:none}}.dsx-zoomghost{z-index:60;pointer-events:none;transform-origin:50%;will-change:transform;transition:transform .38s var(--ds-ease-in-out);position:fixed}@media (prefers-reduced-motion:reduce){.dsx-zoomghost{transition:none;display:none}}.dsx-gshot{transition:transform var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:14px;display:block;position:relative}.dsx-gcard:hover .dsx-gshot{transform:translateY(-1px)}.dsx-gcap{color:var(--dsw-alias-label-tertiary);text-align:center;text-overflow:ellipsis;white-space:nowrap;max-width:100%;font-size:12px;line-height:16px;overflow:hidden}.dsx-select{-webkit-appearance:none;appearance:none;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-1);min-width:150px;height:34px;color:var(--dsw-alias-label-primary);cursor:pointer;box-sizing:border-box;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%236F6F7A'/></svg>\");background-position:right 12px center;background-repeat:no-repeat;border-radius:17px;outline:none;padding:0 34px 0 12px;font-size:13px}body[data-ds-dark-theme] .dsx-select{background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%23ECECF1'/></svg>\")}.dsx-select:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}.dsx-select option{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dsx-mlist{flex-direction:column;gap:10px;display:flex}.dsx-mcard{background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;box-sizing:border-box;width:100%;font:inherit;border-style:none;border-width:0;border-radius:16px;flex-direction:row;align-items:center;gap:12px;padding:14px 16px;display:flex;position:relative}.dsx-mcard:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-mbody{flex-direction:column;flex:auto;gap:4px;min-width:0;display:flex}.dsx-mhead{align-items:center;gap:8px;margin-bottom:0;display:flex}.dsx-mname{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}.dsx-mcard>.dsx-btn{white-space:nowrap;flex:none}.dsx-mdesc{color:var(--dsw-alias-label-tertiary);-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:0;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}";
		const tagId$1 = "dsh-widgets/src/client/styles/market.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region \0dsh-css:D:\dsh-home\plugins\dsh-widgets\src\client\styles\primitives.module.css.mjs
		const css = ".dsx-btn{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-state-business-primary);cursor:pointer;background:0 0;border-radius:14px;align-items:center;padding:0 12px;font-size:12px;display:inline-flex}.dsx-btn-primary{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-navbtn{width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;transition:background .12s;display:inline-flex}.dsx-navbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-dot{background:var(--dsw-alias-border-l2);cursor:pointer;border:none;border-radius:50%;width:8px;height:8px;padding:0}.dsx-dot-active{background:var(--dsw-alias-state-business-primary)}.dsx-switch-row{cursor:pointer;flex:none;align-items:center;display:inline-flex;position:relative}.dsx-switch-input{opacity:0;cursor:pointer;width:100%;height:100%;margin:0;position:absolute}.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);border-radius:11px;align-items:center;width:34px;height:20px;padding:0;transition:background .16s;display:inline-flex}.dsx-switch-thumb{width:16px;height:16px;box-shadow:var(--dsw-shadow-lv1);background:#fff;border-radius:50%;margin-left:2px;transition:transform .16s}.dsx-switch-input:checked+.dsx-switch-track{background:var(--dsw-alias-state-success-primary)}.dsx-switch-input:checked+.dsx-switch-track .dsx-switch-thumb{transform:translate(14px)}.dsx-switch-input:focus-visible+.dsx-switch-track{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dsx-switch-input:disabled+.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);opacity:.5;cursor:not-allowed}.dsx-switch-input:disabled+.dsx-switch-track .dsx-switch-thumb{box-shadow:none}.dsx-metrics{flex-direction:column;gap:0;width:100%;min-width:0;display:flex}.dsx-metric{box-sizing:border-box;border-radius:10px;align-items:center;gap:10px;min-height:40px;padding:8px 10px;transition:background .15s,opacity .15s;display:flex;position:relative}.dsx-metric:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-metric.is-on{background:0 0}.dsx-metric.is-on:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-metric.is-dragging{opacity:.35}.dsx-drop-before:before,.dsx-drop-after:after{content:\"\";z-index:1;background:linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat, linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat, linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;pointer-events:none;height:12px;position:absolute;left:0;right:4px}.dsx-drop-before:before{top:-7px}.dsx-drop-after:after{bottom:-7px}.dsx-order-row.is-dragging{opacity:.35}.dsx-metric-name{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;overflow:hidden}.dsx-metric-hint{color:var(--dsw-alias-label-tertiary);padding:4px 6px 0;font-size:11px}.dsx-size-warn{background:var(--dsw-alias-state-warn-primary,#f2b04a);color:#4a3800;white-space:nowrap;border-radius:999px;flex:none;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;line-height:1;display:inline-flex}.dsx-limit-tip{z-index:30;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-tertiary));background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 92%, transparent);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv1);pointer-events:none;border-radius:999px;padding:4px 12px;font-size:12px;line-height:20px;position:absolute;top:64px;left:50%;transform:translate(-50%)}body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div,body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div *{color:#0000!important}.dsx-stats-card-value.dsx-value-pulse{color:var(--dsw-alias-state-error-primary);animation:1.6s ease-in-out infinite alternate dsx-value-breathe}@keyframes dsx-value-breathe{0%{opacity:1}to{opacity:.35}}@media (prefers-reduced-motion:reduce){.dsx-stats-card-value.dsx-value-pulse{animation:none}}";
		const tagId = "dsh-widgets/src/client/styles/primitives.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-widgets";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/lib/contract/helpers.ts
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
		/** The group key for a widget (its own id when it is not grouped). */
		function groupOf(w) {
			return w.group ?? w.id;
		}
		/** The sizes a widget supports, defaulting to 2×2 only. */
		function sizesOf(w) {
			return Array.isArray(w.sizes) && w.sizes.length > 0 ? w.sizes.slice() : ["2x2"];
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
			"config.metricsLabel": "显示指标（勾选 + 排序）",
			"config.metricDrag": "拖动排序",
			"config.metricHint": "已选 {n}/{max} · 拖动整行排序：顺序 = 卡片上从左到右，每行最多 5 个、超过自动折成两行",
			"config.closePreview": "关闭预览",
			"market.viewList": "列表视图",
			"market.viewGrid": "组件视图",
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
			"settings.squircle.title": "连续曲率圆角",
			"settings.squircle.desc": "组件卡片用超椭圆（squircle）圆角，曲率从直边连续过渡，而非直接接一段圆弧",
			"settings.corner.title": "圆角档位",
			"settings.corner.desc": "圆角半径占卡片短边的比例（内容内间距同步变化）；12% 约等于旧的固定 16px",
			"settings.corner.option": "{p}%",
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
			"config.metricsLabel": "Metrics (pick & order)",
			"config.metricDrag": "Drag to reorder",
			"config.metricHint": "{n}/{max} picked · drag a row to reorder: the order is left to right on the card, five per row, wrapping to two rows",
			"config.closePreview": "Close preview",
			"market.viewList": "List view",
			"market.viewGrid": "Gallery view",
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
			"settings.squircle.title": "Continuous corner curvature",
			"settings.squircle.desc": "Draw card corners as superellipses (squircle): the curvature ramps in from the straight edges instead of meeting a circular arc",
			"settings.corner.title": "Corner radius",
			"settings.corner.desc": "Corner radius as a share of the card’s short side (the content inset follows it); 12% ≈ the old fixed 16px",
			"settings.corner.option": "{p}%",
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
		/**
		* Rolling week grid (7 day-rows × `weeks` day-columns, Sunday-first, latest
		* week on the right) filled from a GitHub contribution day list.
		*
		* Deliberately the SAME shape as `buildRollingGrid` — the GitHub calendar the
		* card draws is the same geometry as the token heatmap's, only the colour ramp
		* and the meaning of a cell differ. Every day carries its own GitHub `level`
		* (0..4) so the renderer can paint the discrete green steps, and days the
		* payload does not cover (or that lie in the future) are empty cells.
		*/
		function buildGitHubGrid(days, weeks) {
			const byDate = {};
			for (const d of days) byDate[d.date] = {
				value: d.count,
				level: d.level
			};
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
					const hit = byDate[k];
					row.push({
						value: hit?.value ?? 0,
						date: k,
						level: hit?.level ?? 0
					});
				}
				grid.push(row);
			}
			return grid;
		}
		/** Σ over a grid's cells — the figure the card prints for its OWN window (a
		*  2×2 covers ~3 months, the 2×4 the whole year, exactly like the token
		*  heatmap's "today / window total" pair). */
		function sumGrid(grid) {
			let total = 0;
			for (const row of grid) for (const cell of row) total += cell.value;
			return total;
		}
		/** Compact "how long ago": 12s / 5m / 3h / 6d / 8.14. Used by the GitHub
		*  cards for `pushed_at`, where an absolute timestamp reads worse than a
		*  distance. `now` is injectable so the preview can be deterministic. */
		function fmtAgo(iso, now = Date.now()) {
			if (iso === null || iso === "") return "—";
			const t = Date.parse(iso);
			if (!Number.isFinite(t)) return "—";
			const s = Math.max(0, Math.round((now - t) / 1e3));
			if (s < 60) return `${s}s`;
			if (s < 3600) return `${Math.floor(s / 60)}m`;
			if (s < 86400) return `${Math.floor(s / 3600)}h`;
			if (s < 2592e3) return `${Math.floor(s / 86400)}d`;
			return fmtShortDate(iso.slice(0, 10));
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
		/**
		* 工具调用 — the tool-call detail card (2026-09-28, second card of the system-family
		* density pass).
		*
		* It used to print ONE number (cumulative tool time), which cannot answer the only
		* question that matters when a turn drags: is the MODEL slow, or is a TOOL stuck?
		* The fold (`deriveTools`) carries names, the failure flag and the in-flight call,
		* so the card prints three detail rows under the figure.
		*
		* NO RING HERE (the owner's call): a ring is the design language for a SHARE, which
		* is why the cache card wears one — this card's headline is a DURATION, and the
		* circle ate the width the figure needed ("35m…"). The head uses the ordinary
		* stacked posture (`headAfter.big` over `legend`) instead.
		*
		* THE THREE ROWS ARE PICKED, NOT FIXED. The default is 失败 / 平均每次 /
		* 工具耗时占比 — chosen by the owner because the labels grow left to right (2 → 4 →
		* 6 glyphs), which reads as a deliberate ladder instead of a ragged list. Anything
		* else (最慢 / 正在跑, with the tool's own name) is one switch away in 组件配置, and
		* the picker's own order IS the card's top-to-bottom order (`metrics` field).
		* Three is a HARD cap: at the 150px side a fourth row overflows the tile (measured
		* 152px > 150px), so the control refuses a fourth switch.
		*/
		/** The detail rows a user may pick, in OFFER order, with their label keys. */
		const METRICS$1 = [
			{
				key: "failures",
				label: "card.tool.failed"
			},
			{
				key: "mean",
				label: "card.tool.mean"
			},
			{
				key: "share",
				label: "card.tool.share"
			},
			{
				key: "slowest",
				label: "card.tool.slowest"
			},
			{
				key: "running",
				label: "card.tool.running"
			}
		];
		/** Default rows: 失败 → 平均每次 → 工具耗时占比 (short label to long). */
		const DEFAULT_METRICS$1 = [
			"failures",
			"mean",
			"share"
		];
		/** Row cap: three fit the tile; a fourth overflows it. */
		const MAX_METRICS$1 = 3;
		/** The em dash a picked row shows while it has nothing to report — the same
		*  placeholder 任务/额度管理 use, never a fabricated 0. */
		const DASH$11 = "—";
		/**
		* Build the row for one picked metric.
		*
		* EVERY picked metric renders a row — a metric with nothing to say prints `—` in
		* the muted tone instead of disappearing (the owner's rule, 2026-09-28: 「没有正在
		* 执行的工具就显示 -」). A vanishing row silently changed the card's line count and
		* left a user who picked three rows looking at two.
		*/
		function buildRow(key, tools, s) {
			if (key === "failures") return {
				label: t("card.tool.failed"),
				value: String(tools.failures),
				...tools.failures > 0 ? { tone: "danger" } : {}
			};
			if (key === "mean") {
				if (tools.calls <= 0) return {
					label: t("card.tool.mean"),
					value: DASH$11,
					tone: "muted"
				};
				return {
					label: t("card.tool.mean"),
					value: fmtDuration(s.toolMs / tools.calls)
				};
			}
			if (key === "share") {
				const total = s.toolMs + s.llmMs;
				if (!(total > 0)) return {
					label: t("card.tool.share"),
					value: DASH$11,
					tone: "muted"
				};
				return {
					label: t("card.tool.share"),
					value: `${Math.round(s.toolMs / total * 100)}%`
				};
			}
			if (key === "slowest") {
				if (tools.slowest === null) return {
					label: t("card.tool.slowest"),
					value: DASH$11,
					tone: "muted"
				};
				return {
					label: `${t("card.tool.slowest")} ${tools.slowest.name}`,
					value: fmtDuration(tools.slowest.ms)
				};
			}
			if (key === "running") {
				if (tools.running === null) return {
					label: t("card.tool.running"),
					value: DASH$11,
					tone: "muted"
				};
				const suffix = tools.running.count > 1 ? ` ×${tools.running.count}` : "";
				return {
					label: `${t("card.tool.running")} ${tools.running.name}${suffix}`,
					value: fmtDuration(tools.running.ms)
				};
			}
			return {
				label: key,
				value: DASH$11,
				tone: "muted"
			};
		}
		var tool_default = defineWidget({
			id: "tool",
			name: () => t("widget.tool.name"),
			desc: () => t("widget.tool.desc"),
			builtin: true,
			group: "system",
			configSchema: [{
				key: "metrics",
				label: () => t("config.metricsLabel"),
				type: "metrics",
				default: [...DEFAULT_METRICS$1],
				max: MAX_METRICS$1,
				options: METRICS$1.map((m) => [m.key, () => t(m.label)]),
				hint: () => t("card.tool.hint", { max: MAX_METRICS$1 })
			}],
			render: (s) => {
				const tools = s.tools;
				if (!tools || tools.calls === 0 && tools.running === null) return null;
				const picked = (Array.isArray(s.metrics) ? s.metrics.filter((k) => typeof k === "string") : []).filter((k) => METRICS$1.some((m) => m.key === k));
				const rows = (picked.length > 0 ? picked : DEFAULT_METRICS$1).slice(0, MAX_METRICS$1).map((k) => buildRow(k, tools, s));
				return {
					title: t("widget.tool.name"),
					headAfter: { big: fmtDuration(s.toolMs) },
					legend: t("card.tool.calls", {
						n: tools.calls,
						m: tools.tools
					}),
					bodyAnchor: "bottom",
					...rows.length > 0 ? { chart: {
						kind: "breakdown",
						breakdown: rows
					} } : {}
				};
			},
			example: { stats: {
				toolMs: 74500,
				llmMs: 21e4,
				tools: {
					calls: 23,
					tools: 5,
					failures: 1,
					slowest: {
						name: "Bash",
						ms: 21400
					},
					running: {
						name: "grep",
						ms: 3100,
						count: 2
					}
				}
			} }
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
		/**
		* Cache hit — the「Token 用量」element the user specified (2026-09-28),第二版:
		* the hit rate as a HEAD DONUT (green when high, red when low) with the session's
		* token total stacked under the blue title, and the three input/output buckets as
		* a label/value breakdown under a hairline divider.
		*
		* TONE DIRECTION — the whole point of the ring: for a cache hit rate HIGH IS GOOD,
		* so 99% is GREEN. That is the OPPOSITE of the system-monitor rings (sys-cpu /
		* sys-gpu / sys-rings), where a high number means a busy machine and turns red.
		* The renderer never guesses this; the thresholds live here, in the widget that
		* knows what the number means.
		*
		* `uncached` is `inputTokens − cacheReadTokens`, deliberately: the collector folds
		* the cache-WRITE bucket into `inputTokens` (DeepSeek bills a write at the miss
		* rate — its pricing page has no separate write line), so the row is exactly
		* "input billed at the miss price".
		*
		* The MONEY column arrives in the next step (the host prices the buckets from the
		* table usage-center already owns); until then the card prints tokens only — an
		* estimate is never invented here.
		*/
		/** 命中率 → 语气：越高越好。≥80% 绿、≥50% 琥珀、其余红。 */
		const TONE_STEPS = [
			[80, "success"],
			[50, "warn"],
			[0, "danger"]
		];
		/** The tone for a hit rate (0..1) under the 越高越好 rule above. */
		function cacheTone(ratio) {
			const pct = ratio * 100;
			for (const [min, tone] of TONE_STEPS) if (pct >= min) return tone;
			return "danger";
		}
		var cache_default = defineWidget({
			id: "cache",
			name: () => t("widget.cache.name"),
			desc: () => t("widget.cache.desc"),
			builtin: true,
			group: "system",
			render: (s) => {
				const u = s.usage;
				if (!u || u.inputTokens <= 0 || u.cacheReadTokens <= 0) return null;
				const hit = u.cacheReadTokens;
				const uncached = Math.max(0, u.inputTokens - hit);
				const output = u.outputTokens || 0;
				const ratio = hit / u.inputTokens;
				const pct = ratio * 100;
				return {
					title: t("widget.cache.name"),
					headAfter: { big: `${Math.round(pct)}%` },
					legend: `${fmtTokens(u.inputTokens + output)} ${t("card.cache.unit")}`,
					bodyAnchor: "bottom",
					headRing: {
						ratio,
						tone: cacheTone(ratio),
						icon: "hard-drive",
						label: `${pct.toFixed(1)}%`
					},
					chart: {
						kind: "breakdown",
						breakdown: [
							{
								label: t("card.cache.uncached"),
								value: fmtTokens(uncached)
							},
							{
								label: t("card.cache.read"),
								value: fmtTokens(hit)
							},
							{
								label: t("card.cache.output"),
								value: fmtTokens(output)
							}
						]
					}
				};
			}
		});
		//#endregion
		//#region src/widgets/tokens/index.ts
		/**
		* Token 用量 — what the session spent, and how it splits between input and output
		* (2026-09-28, third card of the system-family density pass).
		*
		* It used to print two bare numbers side by side (`18.6M 75.6K`), which says
		* neither the total nor the SHAPE. Now: the total as the figure, and a two-segment
		* proportion bar whose rows carry each side's exact count — the reading order a
		* composition wants (whole, then parts).
		*
		* `segmentsPalette: 'tones'` is required here: the default segment palette is the
		* product's ContextMeter trio (bluish-neutral / violet / blue) that 上下文水位
		* mirrors, and painting 输入/输出 with it would both mean nothing and make this card
		* look like the context card. The segment `tone` the contract always asked for is
		* finally honoured when a card opts in.
		*
		* Out of scope on purpose: money. Pricing a bucket needs the rate table (and the
		* subscription-vs-metered split), which is the next step; a number invented here
		* would be exactly the fabricated `$0.00` the repo's rules forbid.
		*/
		var tokens_default = defineWidget({
			id: "tokens",
			name: () => t("widget.tokens.name"),
			desc: () => t("widget.tokens.desc"),
			builtin: true,
			group: "system",
			render: (s) => {
				const u = s.usage;
				if (!u || u.inputTokens <= 0) return null;
				const input = u.inputTokens;
				const output = u.outputTokens || 0;
				const total = input + output;
				return {
					title: t("widget.tokens.name"),
					headAfter: { big: fmtTokens(total) },
					bodyAnchor: "bottom",
					chart: {
						kind: "segments",
						segmentsPalette: "tones",
						totalTokens: total,
						segments: [{
							label: t("card.tokens.input"),
							tokens: input,
							tone: "muted"
						}, {
							label: t("card.tokens.output"),
							tokens: output,
							tone: "primary"
						}]
					}
				};
			}
		});
		//#endregion
		//#region src/widgets/context/index.ts
		/**
		* 上下文压缩 — the meter, the one-click compact button, and what folding actually
		* reclaimed, in ONE card.
		*
		* The two halves were shipped separately for a day (一键压缩 showed the percent and
		* the corner button; a 上下文压缩 card reported the folds) and the owner merged them
		* on 2026-09-28: they are one story told twice, and a rail slot is worth more than
		* the split. The button therefore moved to the TOP-RIGHT corner (it used to sit
		* bottom-right to stay clear of a head that had nothing beside it) and the rest of
		* the card carries the information: the meter as the figure, the fold history as
		* three rows.
		*
		* The card ALWAYS renders when a session exists — it owns an action, and a button
		* that disappears with its data is worse than rows showing `—`. A session that has
		* never compacted prints 压缩次数 0 with `—` (muted) for the two figures that have
		* no reading yet; the SAME three rows are what a reviewable preview fills from the
		* widget's own example.
		*/
		function contextRender(stats) {
			const p = stats.contextPercent;
			const pct = p == null ? null : Math.round(p * 100);
			const armed = stats.armedAction === "contextCompact";
			const c = stats.compactions ?? null;
			const folded = c !== null && c.count > 0;
			const dash = {
				value: "—",
				tone: "muted"
			};
			const rows = [
				{
					label: t("card.context.folds"),
					value: c === null ? "0" : String(c.count)
				},
				{
					label: t("card.context.reclaimed"),
					...folded ? { value: fmtTokens(c.reclaimed) } : dash
				},
				{
					label: t("card.context.items"),
					...folded ? { value: String(c.items) } : dash
				}
			];
			return {
				title: t("card.context.title"),
				headAfter: pct == null ? { small: t("card.context.waiting") } : { big: `${pct}%` },
				...folded ? { legend: t("card.context.recent", { ago: fmtAgo(new Date(c.recent[0].at).toISOString()) }) } : {},
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown: rows
				},
				corner: {
					id: "contextCompact",
					label: t("card.context.compact"),
					armedLabel: t("card.context.confirm"),
					armed,
					pos: "top"
				}
			};
		}
		var context_default = defineWidget({
			id: "context",
			name: () => t("widget.context.name"),
			desc: () => t("widget.context.desc"),
			builtin: true,
			group: "system",
			render: contextRender,
			example: { stats: { compactions: {
				count: 2,
				reclaimed: 34e4,
				items: 47,
				recent: [{
					at: Date.now() - 24e4,
					reclaimed: 18e4,
					items: 24
				}, {
					at: Date.now() - 15e5,
					reclaimed: 16e4,
					items: 23
				}]
			} } }
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
		/**
		* 任务 — the todo LIST card. It ABSORBED the old 任务 count card on 2026-09-28 (the
		* owner's call: the count card said "3 pending" without ever naming one of them, and
		* two cards named 任务 in one market is not a product).
		*
		* The merge keeps this unit's id (`task`), order (22) and install semantics, so an
		* already-installed `task@2x2` upgrades IN PLACE: no instance is lost, and the
		* now-redundant `todo-board` unit was deleted rather than shipped beside it.
		*
		* WHY IT EXISTS: the head keeps the figures (the in-progress count as the big number,
		* the pending count beside it) and the body spends itself on the ENTRIES — which one
		* is in flight and what comes next. It reads the SAME `stats.todos` projection (a
		* synchronous read of a field that already exists — no host route, no skeleton, no
		* `source` in the manifest).
		*
		* HEAD LADDER (AGENT-BRIEF §2): the blue 13px title, the 20px figure = the
		* IN-PROGRESS count (`headAfter.big` — never `value`, which the renderer would push
		* into the body a second time), and the counts line as `headAfter.small` — the ONE
		* grey line the renderer draws to the RIGHT of the figure on its shared baseline.
		* That placement is the owner's call (2026-09-28): a figure and a legend on its own
		* line printed the same reading twice (the number, then "N 进行中 · M 待办") and cost
		* 14px of height; riding the figure's baseline is what frees the fourth row.
		* `headRing` is deliberately absent — a ring is the design language for a SHARE, and
		* "2 of 5 todos are in flight" is a count, not a share.
		*
		* HEIGHT BUDGET (against the shipped geometry, `card-geometry.ts` + `CardBody.tsx`,
		* and also against AGENT-BRIEF §2's conservative pad-15 model):
		*   pad 12 × 2 (24) + head (title 16 + HEAD_GAP 4 + figure 25 = 45)
		*   + rows (divider 1 + paddingTop 6 + 4 × 12 + 3 × 4 = 67) = 136 / 150.
		* FOUR rows is the last that fits: a FIFTH needs 83px of body where the tile has 81
		* (pad 12) — and 158 of 150 under the pad-15 model.
		*
		* EMPTY STATE (the owner's order): no todos at all renders the old card's posture —
		* `value`, which the renderer anchors to the card's FLOOR, carrying 「暂无任务」, with
		* the grey counts line NOT drawn, because a 「0 进行中 · 0 待办」 caption under a
		* 「暂无任务」 figure says the same nothing twice. The renderer plays that figure's
		* value-change transition, so the number slides down into the empty posture instead
		* of snapping (see CardBody's figure-drop). A partially filled list draws exactly
		* the entries it has (1..4) rather than padding with `—` slots: once the empty state
		* is a no-rows card, dash padding would only make a one-item list look broken.
		*
		* PREVIEW STEPPING (the owner's ask, 2026-09-28): the market / 组件配置 previews step
		* 有任务 → 无任务 on a click (`example.simSteps`, the shared mechanism 套餐 uses for
		* its plan tiers), so the empty-state swap — and the renderer's figure-drop
		* transition that plays on it — can be judged without a live session. `sim.empty`
		* WINS over the stats on purpose: `buildPreviewStats` lets a real session's todos
		* override the example, so a session with work in it would otherwise make the empty
		* state unreviewable. It is keyed on `meta.sim`, so the rail is untouched.
		*
		* ROW ORDER — 进行中 first, then 待办, then 已完成: the rows answer "what am I on and
		* what is next", which is why the leftover rows (up to four) are where a finished
		* entry appears. The sort is STABLE within a status, so the model's own list order
		* survives, and it runs on a COPY — render is a pure function and must never mutate
		* `stats`.
		*
		* TONE DIRECTION (the widget's own call, per §2): 进行中 = brand blue (work in
		* flight — the same blue as the title), 已完成 = green (finished). 待办 keeps the
		* DEFAULT label colour and is deliberately NOT 'muted': muted stays reserved for a
		* genuinely missing reading, so a real pending row can never look like a blank one.
		*
		* WHY THE 2×4 LOOKS THE SAME: a 2×4 is WIDER, not taller. `rail-view.tsx` builds
		* every item as `baseW = size === '2x4' ? 2 * side + pad : side` and seats it with
		* `height: side` (RailWave's slot style), and `CardBody`'s pinned box is
		* `height: unit` for both sizes — so both sizes share this 136px budget and these
		* four rows. What the extra width buys is the label track: ~12 CJK glyphs at 2×2 vs
		* ~25 at 2×4, i.e. the wide card reads whole todo titles where the square one cuts
		* them. A genuine two-column entry grid would need a new shared chart primitive;
		* that is not done here.
		*/
		/** How many detail rows the card draws at most — four fit, five do not (see the
		*  height budget above). */
		const ROWS$2 = 4;
		/** The em dash an entry with no title of its own shows — the same placeholder
		*  任务/工具调用 use, never a fabricated entry. */
		const DASH$10 = "—";
		/** Priority order of the row pool: 进行中 → 待办 → 已完成. */
		const RANK = {
			in_progress: 0,
			pending: 1,
			completed: 2
		};
		/** Status → the key of its word (the dictionaries live in manifest.json). */
		const STATUS_LABEL = {
			in_progress: "card.task.doing",
			pending: "card.task.pending",
			completed: "card.task.done"
		};
		/** Status → tone (see TONE DIRECTION above); undefined = the default label colour. */
		const STATUS_TONE = {
			in_progress: "primary",
			pending: void 0,
			completed: "success"
		};
		/** The projection's status, with anything unrecognised treated as 待办 rather than
		*  dropped: an entry that IS in the list must never become an invisible fourth
		*  status the card silently swallows. */
		function statusOf$1(entry) {
			return entry.status === "in_progress" || entry.status === "completed" ? entry.status : "pending";
		}
		/** The entry's own title, or the dash when it has none. `breakdown` renders the
		*  label nowrap and fades its right edge, so a long title is not wrapped into the
		*  next row. */
		function titleOf(entry) {
			return typeof entry.content === "string" && entry.content.trim() !== "" ? entry.content.trim() : DASH$10;
		}
		function taskRender(stats, meta) {
			const all = Array.isArray(stats.todos) ? stats.todos : [];
			if (meta?.sim?.empty === true || all.length === 0) return {
				title: t("widget.task.name"),
				value: t("card.task.none")
			};
			let doing = 0;
			let pending = 0;
			for (const entry of all) {
				const status = statusOf$1(entry);
				if (status === "in_progress") doing += 1;
				else if (status === "pending") pending += 1;
			}
			const breakdown = all.slice().sort((a, b) => RANK[statusOf$1(a)] - RANK[statusOf$1(b)]).slice(0, ROWS$2).map((entry) => {
				const status = statusOf$1(entry);
				const tone = STATUS_TONE[status];
				return {
					label: titleOf(entry),
					value: t(STATUS_LABEL[status]),
					...tone === void 0 ? {} : { tone }
				};
			});
			return {
				title: t("widget.task.name"),
				headAfter: {
					big: String(doing),
					small: t("card.task.small", { pending })
				},
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown
				}
			};
		}
		var task_default = defineWidget({
			id: "task",
			name: () => t("widget.task.name"),
			desc: () => t("widget.task.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2", "2x4"],
			render: taskRender,
			simToggle: () => t("widget.task.simToggle"),
			example: {
				stats: { todos: [
					{
						content: "任务 1",
						status: "in_progress"
					},
					{
						content: "任务 2",
						status: "pending"
					},
					{
						content: "任务 3 · 这一行故意写得很长，用来检查右端是截断还是淡出",
						status: "pending"
					},
					{
						content: "任务 4",
						status: "completed"
					}
				] },
				sim: { empty: false },
				simSteps: [{ empty: false }, { empty: true }]
			}
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
		*  One ROW per lane, exactly the lanes the official timeline draws — 输入 (a user
		*  or steering message), 模型 (an assistant step) and 工具 (a tool call) — in that
		*  order, and all three lanes are always drawn (an empty lane is an empty track,
		*  as in the official strip). Every beat is one bar in its own lane, oldest left,
		*  newest right. The card renders the official HORIZONTAL geometry (the official
		*  `min(width*.08%, 1px)` gap, the 2px floor, 1px corners) but its own VERTICAL
		*  layout: three flush bands filling the card's remaining height.
		*
		*  WIDTH is a per-card switch (`泳道宽度`), mirroring the official toolbar's 时长
		*  toggle:
		*   - 按时长 (default): the recorded-duration projection — a bar's width is its
		*     share of the window's total duration (idle compressed), so a 26.7s tool
		*     call is visibly longer than a 17ms one; anything under the official 2px
		*     floor is drawn at 2px;
		*   - 等宽: the official DEFAULT projection — one equal slot per beat, back to
		*     back, the slot frozen at TRAJECTORY_WINDOW beats so the row stops
		*     re-scaling as the window rolls (n beats share the lane while it fills).
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
		//#region src/widgets/harness-board/index.ts
		/**
		* Harness board — the session-level numbers the composer's stats line is made
		* of, on ONE 2×4 card.
		*
		* WHY A BOARD AND NOT JUST THE SEVEN 2×2 CARDS: the stats line was split into
		* seven cards (轮次·步数 / LLM 时长 / 工具调用 / 首 token / 速率 / 缓存命中 /
		* Tokens), i.e. seven grid cells for nine numbers. A 2×4 board holds four of
		* them in two cells (six at the measured density limit), which is the whole
		* point of the board: scan a row instead of scrolling a column. It is NOT a
		* replacement for the individual cards — a 2×2 card prints its figure at 20px
		* where a board figure is 13px, so the board is for scanning, the card is for
		* the number you want to see from across the room. Both ship; the user picks.
		*
		* Every metric is a PURE read of the session stats the collector already
		* folds, so the card has no live source of its own: no skeleton state, no
		* polling, and the figures move on the same tick as the rest of the rail.
		*
		* ONE value here is a deliberately cheap approximation: `turns` counts the
		* session's turns the same way the 轮次·步数 card does (the collector's own
		* fold), not a re-derivation.
		*
		* THE CATALOG ONLY EVER GROWS AT THE TAIL (2026-09-28, second round): an
		* instance stores KEYS, so reordering or renaming an existing entry would empty
		* a board that is already on someone's rail. The four newer dimensions are the
		* folds the collector already performs but the board had no cell for — 工具失败数
		* (danger when non-zero, the same colour the 工具调用 card gives 失败), 折叠次数 and
		* 累计回收 token (the 上下文压缩 card's own two figures), and 正在执行 (the in-flight
		* call's name). The default four are untouched, and every one of them prints `—`
		* (muted) while its source has no reading.
		*/
		/** How many figures ONE row can carry. Six in a row drops every label under
		*  ~4 CJK characters (measured: 46px at the 160px card side), five keeps 56px —
		*  the same density the shipped cc-usage card already uses. */
		const ROW_MAX = 5;
		/** The picker's cap: two rows of five. A 2×4's content box is ~136px tall at
		*  the default card side, which carries the title row plus exactly two 30px
		*  figure rows (see `figureRows`), and 5+5 is also the widest arrangement that
		*  keeps every label whole. */
		const MAX_METRICS = 10;
		/** Default selection: the four figures the dashboard opens with. */
		const DEFAULT_METRICS = [
			"turns",
			"llm",
			"tool",
			"tps"
		];
		/** The em dash a figure shows while it has nothing to report (and the muted tone
		*  that goes with it): a board cell must never print a 0 that was never
		*  measured. A fresh object per call so no two figures ever share one. */
		const dash = () => ({
			value: "—",
			tone: "muted"
		});
		/** Count the todo entries in one status. */
		function todoCount(stats, status) {
			return (Array.isArray(stats.todos) ? stats.todos : []).filter((todo) => todo.status === status).length;
		}
		/**
		* The metric catalog. Formatters are the SAME ones the single-purpose cards
		* use (fmtDuration / fmtTokens / fmtTps), so a number never means two things
		* depending on which card you read it from. Each value falls back to `—` when
		* its source has nothing yet — a board figure must never print a 0 that was
		* never measured (the token cards hide themselves instead; a board cannot
		* hide one cell, so it says "no data" the honest way).
		*/
		const METRICS = [
			{
				key: "turns",
				label: "metric.turns",
				value: (s) => ({ value: String(s.turns) })
			},
			{
				key: "steps",
				label: "metric.steps",
				value: (s) => ({ value: String(s.steps) })
			},
			{
				key: "llm",
				label: "metric.llm",
				value: (s) => s.llmMs > 0 ? { value: fmtDuration(s.llmMs) } : dash()
			},
			{
				key: "tool",
				label: "metric.tool",
				value: (s) => s.toolMs > 0 ? { value: fmtDuration(s.toolMs) } : dash()
			},
			{
				key: "ttft",
				label: "metric.ttft",
				value: (s) => s.ttftSteps > 0 ? { value: fmtDuration(s.ttftMs / s.ttftSteps) } : dash()
			},
			{
				key: "tps",
				label: "metric.tps",
				value: (s) => s.decodeMs > 0 ? { value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1e3))} tok/s` } : dash(),
				valueBare: (s) => s.decodeMs > 0 ? { value: fmtTps(s.decodeTokens / (s.decodeMs / 1e3)) } : dash()
			},
			{
				key: "cache",
				label: "metric.cache",
				value: (s) => s.usage && s.usage.inputTokens > 0 ? { value: `${Math.round(s.usage.cacheReadTokens / s.usage.inputTokens * 100)}%` } : dash()
			},
			{
				key: "in",
				label: "metric.in",
				value: (s) => s.usage && s.usage.inputTokens > 0 ? { value: fmtTokens(s.usage.inputTokens) } : dash()
			},
			{
				key: "out",
				label: "metric.out",
				value: (s) => s.usage && s.usage.outputTokens > 0 ? { value: fmtTokens(s.usage.outputTokens) } : dash()
			},
			{
				key: "context",
				label: "metric.context",
				value: (s) => typeof s.contextPercent === "number" ? { value: `${Math.round(s.contextPercent * 100)}%` } : dash()
			},
			{
				key: "todoDoing",
				label: "metric.todoDoing",
				value: (s) => ({ value: String(todoCount(s, "in_progress")) })
			},
			{
				key: "todoPending",
				label: "metric.todoPending",
				value: (s) => ({ value: String(todoCount(s, "pending")) })
			},
			{
				key: "toolFail",
				label: "metric.toolFail",
				value: (s) => {
					const tools = s.tools;
					if (!tools) return dash();
					return tools.failures > 0 ? {
						value: String(tools.failures),
						tone: "danger"
					} : { value: String(tools.failures) };
				}
			},
			{
				key: "folds",
				label: "metric.folds",
				value: (s) => {
					const c = s.compactions;
					return c && c.count > 0 ? { value: String(c.count) } : dash();
				}
			},
			{
				key: "reclaimed",
				label: "metric.reclaimed",
				value: (s) => {
					const c = s.compactions;
					if (!c || c.count <= 0 || c.reclaimed <= 0) return dash();
					return { value: `${fmtTokens(c.reclaimed)} tok` };
				},
				valueBare: (s) => {
					const c = s.compactions;
					if (!c || c.count <= 0 || c.reclaimed <= 0) return dash();
					return { value: fmtTokens(c.reclaimed) };
				}
			},
			{
				key: "running",
				label: "metric.running",
				value: (s) => s.tools && s.tools.running ? { value: s.tools.running.name } : dash()
			}
		];
		/** The picked metrics, in the STORED order; unknown keys are dropped and an
		*  empty/absent selection falls back to the default four (a card that has
		*  never been configured still shows something). */
		function pickedMetrics(stats) {
			const list = ((Array.isArray(stats.metrics) ? stats.metrics : null) ?? DEFAULT_METRICS).filter((k) => typeof k === "string").map((key) => METRICS.find((m) => m.key === key)).filter((m) => m !== void 0);
			return list.length > 0 ? list.slice(0, MAX_METRICS) : METRICS.filter((m) => DEFAULT_METRICS.includes(m.key));
		}
		/** Break the picked metrics into rows: one row up to five, then two BALANCED
		*  rows (6 → 3+3, 7 → 4+3, 8 → 4+4, 10 → 5+5). A wide card stacks two rows of
		*  five where a single row of ten would ellipsize every label. */
		function splitRows(items) {
			if (items.length <= ROW_MAX) return [items];
			const half = Math.ceil(items.length / 2);
			return [items.slice(0, half), items.slice(half)];
		}
		/** Above this many figures in one row, a unit-bearing figure stops fitting, so
		*  the bare figure is used (see Metric.valueBare). */
		const ROW_ROOMY = 4;
		function harnessBoardRender(stats) {
			const rows = splitRows(pickedMetrics(stats)).map((row) => {
				const roomy = row.length <= ROW_ROOMY;
				return row.map((metric) => ({
					label: t(metric.label),
					...(roomy ? metric.value : metric.valueBare ?? metric.value)(stats)
				}));
			});
			return {
				title: t("widget.harness-board.name"),
				bodyAnchor: "bottom",
				chart: rows.length > 1 ? {
					kind: "figures",
					figureRows: rows
				} : {
					kind: "figures",
					figures: rows[0] ?? []
				}
			};
		}
		var harness_board_default = defineWidget({
			id: "harness-board",
			name: () => t("widget.harness-board.name"),
			desc: () => t("widget.harness-board.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x4"],
			configSchema: [{
				key: "metrics",
				label: () => t("config.metricsLabel"),
				type: "metrics",
				default: DEFAULT_METRICS,
				max: MAX_METRICS,
				options: METRICS.map((metric) => [metric.key, () => t(metric.label)])
			}],
			render: harnessBoardRender
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
		function previewStats$6(config) {
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
			example: { stats: previewStats$6 }
		});
		//#endregion
		//#region src/widgets/heatmap-bars/index.ts
		/**
		* 用量柱状图 — the daily token-usage bars, ONE card for both windows.
		*
		* It absorbed `heatmap-bars-wide` on 2026-09-28 (the owner's call: one card with a
		* WINDOW selector instead of two cards that differ only in their range). The unit
		* keeps this id and its order, so an installed `heatmap-bars@2x2` upgrades in
		* place; the wide unit is gone, and the market finally has one entry named
		* 用量柱状图 rather than two near-identical ones.
		*
		* TWO AXES, deliberately independent:
		*   - the OWNER's window: 7 days (one bar per day) or 30 days (two days per bar) —
		*     a config field, because it is a question about the data;
		*   - the TILE's shape: a 2×2 shows the figures as the family's grey line under the
		*     title, a 2×4 moves them into the title row (`wide ? headRight : legend`, the
		*     repository's own rule for wide tiles, applied verbatim by `heatmap` and the
		*     GitHub family) and labels them MAX/TOTAL. The type ladder is untouched — only
		*     the arrangement follows the tile.
		*
		* WHY 30 DAYS IS TWO DAYS PER BAR — this is arithmetic, not a style knob. `barsV`
		* lays columns out as `gap: 4px` (fixed) + a bar of 93% of the column, so at a 2×4
		* tile (318px of content) the bar width is decided entirely by the bar count:
		*
		*   bars   column = (318 − (n−1)·4) / n   bar = 93% of it
		*    30          6.7px                        6.3px   ← needles
		*    15         17.5px                       16.2px   ← the 2×2's own weight
		*     7         41.4px                       22.0px (renderer cap: 21 · scale)
		*
		* The 2×2 draws 7 bars of ~14.6px in its 134px box, so 15 bars (16.2px, the same
		* 94% ink rhythm) is the finest bucket that still reads like the 7-day card. One
		* day per bar over 30 days cannot: thirty columns are 6.3px by construction.
		*
		* A two-day bar is labelled by the day it ENDS on, which keeps every corner label
		* a single short date (a `8.30–8.31` range overflows the card's padding) and keeps
		* the family's rolling convention — the right edge is TODAY. The bucketing itself
		* is stated in the card's hover text, because the corners can no longer say it.
		*
		* DATA: `stats.heatmapRaw` (`Record<'YYYY-MM-DD', number>`, machine-wide daily
		* tokens; today's figure is filled in by the collector). `stats.heatmapGrid` is NOT
		* read — it is the pre-folded 7×13 calendar the 2×2 calendar card draws, and bars
		* need the per-day series, not a weekday grid.
		*/
		/** Days in each offered window. */
		const RANGES = {
			week: 7,
			month: 30
		};
		/** Days folded into one bar, per window — see the bar-width table above. */
		function daysPerBar(days) {
			return days === RANGES.month ? 2 : 1;
		}
		/** Fold a daily series into `per`-day bars. A bar takes the END day's label, and
		*  ratios are normalized to the heaviest BAR (not the heaviest day), so the month's
		*  busiest stretch always reaches full height. Zero bars keep a `muted` tone: an
		*  empty stretch is a reading, not a missing one. */
		function foldBars(days, per) {
			const bars = [];
			for (let i = 0; i < days.length; i += per) {
				const bucket = days.slice(i, i + per);
				const value = bucket.reduce((sum, day) => sum + day.value, 0);
				bars.push({
					label: bucket[bucket.length - 1].label,
					value,
					ratio: 0,
					tone: value > 0 ? "primary" : "muted"
				});
			}
			const max = Math.max(1, ...bars.map((bar) => bar.value));
			for (const bar of bars) bar.ratio = bar.value > 0 ? bar.value / max : 0;
			return bars;
		}
		/** Render the card. Returns null when there is nothing to say (no log at all, or
		*  every day of the window is 0) — a chart of flat zeroes is an empty tile, and the
		*  family rule is 没有数据就不出现. */
		function heatmapBarsRender(stats, meta) {
			const raw = stats.heatmapRaw;
			if (!raw) return null;
			const days = (meta?.sim?.range ?? stats.range) === "30" ? RANGES.month : RANGES.week;
			const bars = foldBars(days === RANGES.week && stats.monthMode === "weekly" ? lastNDaysWeekly(raw, RANGES.week) : lastNDays(raw, days), daysPerBar(days));
			let total = 0;
			let peak = 0;
			for (const bar of bars) {
				total += bar.value;
				if (bar.value > peak) peak = bar.value;
			}
			if (peak <= 0) return null;
			const wide = meta?.size === "2x4";
			return {
				title: t("card.heatmap-bars.title"),
				...wide ? { headRight: `${t("card.heatmap-bars.max")} ${fmtTokens(peak)}  ${t("card.heatmap-bars.total")} ${fmtTokens(total)}` } : { legend: `${fmtTokens(peak)}  ${fmtTokens(total)}` },
				...daysPerBar(days) > 1 ? { cardHint: t("card.heatmap-bars.hint") } : {},
				chart: {
					kind: "barsV",
					bars
				}
			};
		}
		/** Preview usage log: a plausible working month — light weekends, a weekday
		*  baseline that swings, a heavy session every ten days — generated relative to
		*  TODAY the way the shared preview data is, so the preview shows the real card
		*  shape on any date with today on the right edge. A thunk, not a frozen literal: a
		*  long-lived session would otherwise leave the preview stranded in the past.
		*
		*  Every day is NON-ZERO on purpose: empty days are a real state of the live data,
		*  but in a preview they read as "the window does not cover 30 days" (a 3px muted
		*  stub is invisible), which is a defect report about the wrong thing. */
		function previewStats$5() {
			const now = /* @__PURE__ */ new Date();
			const raw = {};
			for (let i = 39; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
				const base = d.getDay() === 0 || d.getDay() === 6 ? 14e5 : 62e5;
				const swing = i % 5 * 9e5;
				const spike = i % 10 === 3 ? 19e6 : 0;
				raw[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = base + swing + spike;
			}
			return { heatmapRaw: raw };
		}
		var heatmap_bars_default = defineWidget({
			id: "heatmap-bars",
			name: () => t("widget.heatmap-bars.name"),
			desc: () => t("widget.heatmap-bars.desc"),
			builtin: true,
			group: "coding-plan",
			sizes: ["2x2", "2x4"],
			render: heatmapBarsRender,
			configSchema: [{
				key: "range",
				label: () => t("config.bars.range"),
				type: "mode",
				default: "7",
				options: [["7", () => t("config.bars.range.7")], ["30", () => t("config.bars.range.30")]],
				hint: () => t("config.bars.range.hint")
			}, {
				key: "monthMode",
				label: () => t("config.monthMode"),
				type: "mode",
				default: "rolling",
				options: [["rolling", () => t("config.monthMode.rolling7")], ["weekly", () => t("config.monthMode.weekly")]],
				hint: () => t("config.bars.monthMode.hint")
			}],
			example: {
				stats: previewStats$5,
				sim: { range: "7" },
				simSteps: [{ range: "7" }, { range: "30" }]
			},
			simToggle: () => t("widget.heatmap-bars.simToggle")
		});
		//#endregion
		//#region src/client/families/cc/renders.ts
		function ccLegend(role, view) {
			return view.multi ? `${role} · ${view.mode}` : role;
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
		/** `$10.1` / `$0.468` — the SPEND figure at THREE significant digits, never the
		*  four decimals a credit balance uses (`$0.4676` is noise on a 2×2 tile, and the
		*  figure shares its row with two other facts). Above $100 the cents stop
		*  mattering, so it drops to whole dollars; below a tenth of a cent it says
		*  `<$0.001` rather than rounding a real spend to `$0`. */
		function fmtCost(n) {
			if (typeof n !== "number" || !Number.isFinite(n)) return "-";
			if (n === 0) return "$0";
			const abs = Math.abs(n);
			if (abs < .001) return "<$0.001";
			if (abs >= 100) return `$${Math.round(n)}`;
			return `$${Number(n.toPrecision(3))}`;
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
		/** Short date (`MM-DD`) from an ISO string — the LOCAL calendar day it names. */
		function fmtIsoDay(iso) {
			if (typeof iso !== "string" || iso.length < 10) return "";
			const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
			if (!m) return "";
			if (iso.length <= 10) return `${m[2]}-${m[3]}`;
			const ms = Date.parse(iso);
			if (!Number.isFinite(ms)) return `${m[2]}-${m[3]}`;
			const d = new Date(ms);
			return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}
		function ccWhoamiRender(stats) {
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const c = view.data;
			const user = c?.whoami?.user;
			if (!user) {
				if (view.multi && view.mode === "AllUser") return {
					title: title(),
					value: CC_ALL,
					legend: ccLegend(t("cc.account"), view),
					sub: view.names.join(" / ") || void 0,
					cycle
				};
				return {
					title: title(),
					value: "-",
					legend: view.mode,
					cardHint: hint(stats),
					cycle
				};
			}
			const name = user.name || user.userName || "-";
			const sub = [user.email ? String(user.email) : "", c?.whoami?.org && typeof c.whoami.org === "object" && "name" in c.whoami.org ? String(c.whoami.org.name ?? "") : ""].filter(Boolean).join(" / ");
			return {
				title: title(),
				value: name,
				legend: ccLegend(t("cc.account"), view),
				sub: sub || void 0,
				cycle
			};
		}
		/** cc-usage - request counts / success / tokens / spend from `/alpha/usage/summary`.
		*
		*  Layout (user's fix, 2026-09-20): the token total is the big figure under the
		*  title with its unit to the right, the role word is gone (the figure already
		*  says "usage"), and the three facts live in a FIGURES row on the card's floor —
		*  the old single grey line (`4821 请求 / 100% 成功率 / 消费 $26.5`) was ~150px
		*  wide in a ~126px slot, so the spend was always ellipsized away. */
		function ccUsageRender(stats) {
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const u = view.data?.usage;
			if (!u) return {
				title: title(),
				value: "-",
				legend: view.mode,
				cardHint: hint(stats),
				cycle
			};
			const tokens = typeof u.totalTokens === "number" ? u.totalTokens : void 0;
			const req = typeof u.totalCount === "number" ? u.totalCount : void 0;
			const success = typeof u.successRate === "number" ? u.successRate : void 0;
			const cost = fmtCost(u.totalCost);
			const headAfter = tokens !== void 0 ? {
				big: fmtTokens(tokens),
				small: t("cc.tokens")
			} : void 0;
			const figures = [];
			if (req !== void 0) figures.push({
				label: t("cc.requests"),
				value: String(req)
			});
			if (success !== void 0) figures.push({
				label: t("cc.successRate"),
				value: `${success.toFixed(0)}%`
			});
			if (cost !== "-") figures.push({
				label: t("cc.spend"),
				value: cost
			});
			return {
				title: title(),
				legend: view.multi ? view.mode : void 0,
				headAfter,
				bodyAnchor: "bottom",
				chart: figures.length > 0 ? {
					kind: "figures",
					figures
				} : void 0,
				cycle
			};
		}
		/** cc-credits - the credit balance + the three quota windows from
		*  `/alpha/billing/credits`.
		*
		*  Layout (user's design, 2026-09-20 — the official site's limit rows): the
		*  balance is the big figure under the title with `credits` to its right, and the
		*  body is THREE rows, each a window name with its percent hard right over a
		*  segmented bar (`5 小时 1%` / bar, then the week, then the month). The role word
		*  and the reset lines are gone: the bars ARE the card, and the old
		*  `kind: 'bars'` twin columns (plus their dashed grid and 25px of labels) made
		*  the tile 200×250 in the market stage instead of a square. */
		function ccCreditsRender(stats) {
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const c = view.data;
			const credits = c?.credits?.credits;
			const windows = c?.credits?.windowLimits;
			if (!credits && !windows) return {
				title: title(),
				value: "-",
				legend: view.mode,
				cardHint: hint(stats),
				cycle
			};
			const monthly = credits?.monthlyCredits;
			const headAfter = monthly !== void 0 ? {
				big: fmtCredit(monthly),
				small: t("cc.credits")
			} : void 0;
			const extras = [credits?.freeCredits !== void 0 && credits.freeCredits > 0 ? `${t("cc.free")} ${fmtCredit(credits.freeCredits)}` : "", credits?.purchasedCredits !== void 0 && credits.purchasedCredits > 0 ? `${t("cc.purchased")} ${fmtCredit(credits.purchasedCredits)}` : ""].filter(Boolean);
			const legend = extras.length > 0 ? ccLegend(extras.join(" / "), view) : view.multi ? view.mode : void 0;
			const fh = fiveHourWindow(c);
			const wk = weeklyWindow(c);
			const mo = monthlyWindow(c);
			const quotas = [];
			if (fh) quotas.push({
				label: t("cc.limit5h"),
				pct: fh.pct,
				tone: windowTone(fh.pct, fh.exceeded)
			});
			if (wk) quotas.push({
				label: t("cc.limitWeek"),
				pct: wk.pct,
				tone: windowTone(wk.pct, wk.exceeded)
			});
			if (mo) quotas.push({
				label: t("cc.limitMonth"),
				pct: mo.pct,
				tone: windowTone(mo.pct, mo.exceeded)
			});
			if (quotas.length === 0) return {
				title: title(),
				legend,
				headAfter,
				cycle
			};
			return {
				title: title(),
				legend,
				headAfter,
				bodyAnchor: "bottom",
				chart: {
					kind: "quotas",
					quotas
				},
				cycle
			};
		}
		/** cc-windows - 5h / weekly / monthly quota as three donuts (OpenCode-style
		*  rolling / weekly / monthly rings). */
		function ccWindowsRender(stats) {
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const c = view.data;
			if (!c?.credits && !c?.usage) return {
				title: title(),
				value: "-",
				legend: view.mode,
				cardHint: hint(stats),
				cycle
			};
			const wins = [
				fiveHourWindow(c),
				weeklyWindow(c),
				monthlyWindow(c)
			].filter((w) => w !== null);
			if (wins.length === 0) return {
				title: title(),
				value: "-",
				legend: view.mode,
				cardHint: hint(stats),
				cycle
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
				legend: ccLegend(t("cc.roleWindow"), view),
				chart: {
					kind: "rings",
					rings
				},
				cycle
			};
		}
		/**
		* The official Command Code subscription tiers, as the badge the 套餐 card
		* prints: planId prefix -> label. Mirrors the provider's own table (synced from
		* the CLI's plan map: `individual-go`, `individual-goat`, `individual-pro`,
		* `individual-pro-v1`, `individual-provider`, `individual-max`,
		* `individual-ultra`, `teams-pro`) — matched longest-prefix-first after
		* normalizing, exactly like the provider resolves it, so `individual-pro-v1`
		* wins over `individual-pro`.
		*/
		const PLAN_TIERS = [
			["individual-pro-v1", "PRO"],
			["individual-provider", "PROVIDER"],
			["individual-goat", "GOAT"],
			["individual-ultra", "ULTRA"],
			["individual-max", "MAX"],
			["individual-pro", "PRO"],
			["individual-go", "GO"],
			["teams-pro", "TEAMS PRO"]
		];
		/**
		* The tier badge for a subscription `planId`: `individual-goat` -> `GOAT`.
		*
		* An id outside the table is neither invented into a tier nor printed raw (the
		* raw id is what ran off the tile's edge as `individual-goa…`): the vendor
		* prefix is stripped and the rest is uppercased (`acme-team-plan` ->
		* `ACME TEAM PLAN`), so the badge stays one short word while the plan stays
		* identifiable.
		*/
		function planTier(planId) {
			if (typeof planId !== "string" || planId === "") return null;
			const normalized = planId.toLowerCase().replace(/_/g, "-");
			const hit = PLAN_TIERS.find(([prefix]) => normalized.startsWith(prefix));
			if (hit !== void 0) return hit[1];
			return normalized.replace(/^(individual|teams)-/, "").replace(/-/g, " ").toUpperCase();
		}
		/** The preview's tier ladder — the 套餐 card's `example.simSteps`: every badge
		*  the card can print, as the `sim` objects a preview click walks through. */
		const PLAN_TIER_STEPS = [
			"individual-goat",
			"individual-pro",
			"individual-max",
			"individual-ultra",
			"individual-provider",
			"individual-go",
			"teams-pro"
		].map((plan) => ({ plan }));
		/** cc-subscription - the plan TIER + billing period end from
		*  `/alpha/billing/subscriptions`.
		*
		*  Layout (user's design, 2026-09-20): the blue title, the grey `账期 10-10`
		*  line under it, and the tier as the big figure on the card's floor; the raw
		*  `individual-goat` id used to be that figure and ran off the tile. The tier is
		*  the one thing the preview can walk (`sim.plan`), so the market / 组件配置 click
		*  shows every badge without owning the subscription. */
		function ccSubscriptionRender(stats, meta) {
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const simPlan = typeof meta?.sim?.plan === "string" ? meta.sim.plan : null;
			const sub = view.data?.subscription?.data;
			const plan = simPlan ?? sub?.planId;
			if (!sub && !plan) return {
				title: title(),
				value: "-",
				legend: view.mode,
				cardHint: hint(stats),
				cycle
			};
			const status = sub?.status ?? "";
			const endLabel = fmtIsoDay(sub?.currentPeriodEnd);
			const period = endLabel !== "" ? t("cc.period", {
				m: String(Number(endLabel.slice(0, 2))),
				d: String(Number(endLabel.slice(3, 5)))
			}) : "";
			const notes = [status !== "" && status !== "active" ? status : "", sub?.cancelAtPeriodEnd === true ? t("cc.cancelAtEnd") : ""].filter(Boolean);
			return {
				title: title(),
				legend: period !== "" ? ccLegend(period, view) : void 0,
				value: planTier(plan ?? void 0) ?? "-",
				sub: notes.length > 0 ? notes.join(" / ") : void 0,
				cycle
			};
		}
		/** Single-window percent card (cc-window-5h / cc-window-weekly /
		*  cc-window-monthly) - the OpenCode single-window shape: one big percent, the
		*  role word under the title, and the reset date beneath. */
		function ccWindowValueRender(key) {
			return (stats) => {
				const view = ccView(stats);
				const cycle = cycleFor$1(view);
				const c = view.data;
				const roleKey = key === "fiveHour" ? "cc.win5h" : key === "weekly" ? "cc.winWeekly" : "cc.winMonthly";
				if (!c) return {
					title: title(),
					value: "-",
					legend: ccLegend(t(roleKey), view),
					cardHint: hint(stats),
					cycle
				};
				const w = key === "fiveHour" ? fiveHourWindow(c) : key === "weekly" ? weeklyWindow(c) : monthlyWindow(c);
				if (!w) return {
					title: title(),
					value: "-",
					legend: ccLegend(t(roleKey), view),
					cycle
				};
				const reset = w.resetIso ? `${t("cc.periodEnd")} ${fmtIsoDay(w.resetIso)}` : fmtReset(w.resetAt) ? `${t("cc.resets")} ${fmtReset(w.resetAt)}` : "";
				return {
					title: title(),
					legend: ccLegend(t(roleKey), view),
					value: `${w.pct.toFixed(1)}%`,
					sub: reset || void 0,
					cycle
				};
			};
		}
		//#endregion
		//#region src/client/families/cc/data.ts
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
		/** The generic (whole-pool) view label. Deliberately the SAME literal in both
		*  languages: the user asked for `AllUser` as the generic expression. */
		const CC_ALL = "AllUser";
		/** Sum a numeric field over the pool members that report it; undefined when none. */
		function sumOf(accounts, pick) {
			let total = 0;
			let seen = false;
			for (const a of accounts) {
				if (a === null) continue;
				const v = pick(a);
				if (typeof v === "number" && Number.isFinite(v)) {
					total += v;
					seen = true;
				}
			}
			return seen ? total : void 0;
		}
		/** One window summed across the pool: used and cap add, `exceeded` is sticky,
		*  and the reset is the EARLIEST member reset — the next moment the pool as a
		*  whole regains capacity. Members that do not report the window are skipped, so
		*  a key that never started a 5h window does not drag its cap in as "available". */
		function sumWindow(accounts, pick) {
			const members = [];
			for (const a of accounts) {
				if (a === null) continue;
				const w = pick(a);
				if (w !== null && w !== void 0 && typeof w.used === "number" && typeof w.cap === "number") members.push(w);
			}
			if (members.length === 0) return null;
			const resets = members.map((m) => m.resetAt).filter((ms) => typeof ms === "number" && ms > 0);
			return {
				used: members.reduce((s, m) => s + (m.used ?? 0), 0),
				cap: members.reduce((s, m) => s + (m.cap ?? 0), 0),
				exceeded: members.some((m) => m.exceeded === true),
				resetAt: resets.length > 0 ? Math.min(...resets) : 0
			};
		}
		/** Is this a non-empty string? (type guard for the aggregate's label lists) */
		function nonEmpty(v) {
			return typeof v === "string" && v !== "";
		}
		/** Distinct strings, in first-seen order. */
		function unique(values) {
			return values.filter((v, i) => values.indexOf(v) === i);
		}
		/** The pool member whose reset comes FIRST — the pool's next renewal. */
		function earliestEnd(accounts) {
			let best = null;
			let bestMs = Number.POSITIVE_INFINITY;
			for (const a of accounts) {
				const ms = Date.parse(String(a.subscription?.data?.currentPeriodEnd));
				if (!Number.isFinite(ms) || ms >= bestMs) continue;
				best = a;
				bestMs = ms;
			}
			return best;
		}
		/**
		* The AllUser total: the pool summed field by field.
		*
		* Additive quantities are SUMMED, so a window's pool percent is
		* `sum(used) / sum(cap)` — the honest "all pools" reading. A mean of percents
		* would be wrong here: one exhausted pool beside one untouched pool is 50% used
		* of the allowance, not 50% of each.
		*
		* `whoami` stays null — the aggregate has no single identity, so the account
		* card prints the generic `AllUser` label with the member names on its bottom
		* line. `keys` is carried through deliberately: the monthly window needs each
		* member's OWN plan to size the pool's allowance (see `monthlyWindow`).
		*/
		function aggregate(keys) {
			const accounts = keys.map((k) => k.data);
			const present = accounts.filter((a) => a !== null);
			const base = {
				whoami: null,
				usage: null,
				credits: null,
				subscription: null,
				keys
			};
			if (present.length === 0) return base;
			const count = sumOf(accounts, (a) => a.usage?.totalCount);
			const failed = sumOf(accounts, (a) => a.usage?.failedCount);
			const cost = sumOf(accounts, (a) => a.usage?.totalCost);
			const usage = present.some((a) => a.usage != null) ? {
				totalCount: count,
				totalCost: cost,
				averageCost: count !== void 0 && count > 0 && cost !== void 0 ? cost / count : void 0,
				successRate: count !== void 0 && count > 0 && failed !== void 0 ? (count - failed) / count * 100 : void 0,
				completedCount: sumOf(accounts, (a) => a.usage?.completedCount),
				failedCount: failed,
				totalTokensIn: sumOf(accounts, (a) => a.usage?.totalTokensIn),
				totalTokensOut: sumOf(accounts, (a) => a.usage?.totalTokensOut),
				totalTokens: sumOf(accounts, (a) => a.usage?.totalTokens),
				totalCredits: sumOf(accounts, (a) => a.usage?.totalCredits),
				totalFreeCredits: sumOf(accounts, (a) => a.usage?.totalFreeCredits),
				totalMonthlyCredits: sumOf(accounts, (a) => a.usage?.totalMonthlyCredits),
				totalPurchasedCredits: sumOf(accounts, (a) => a.usage?.totalPurchasedCredits),
				periodBasis: present.map((a) => a.usage?.periodBasis).find(nonEmpty)
			} : null;
			const credits = present.some((a) => a.credits != null) ? {
				credits: {
					belowThreshold: present.some((a) => a.credits?.credits?.belowThreshold === true) || void 0,
					creditThreshold: sumOf(accounts, (a) => a.credits?.credits?.creditThreshold),
					monthlyCredits: sumOf(accounts, (a) => a.credits?.credits?.monthlyCredits),
					purchasedCredits: sumOf(accounts, (a) => a.credits?.credits?.purchasedCredits),
					freeCredits: sumOf(accounts, (a) => a.credits?.credits?.freeCredits)
				},
				windowLimits: {
					limited: present.some((a) => a.credits?.windowLimits?.limited === true) || void 0,
					exceeded: null,
					fiveHour: sumWindow(accounts, (a) => a.credits?.windowLimits?.fiveHour),
					weekly: sumWindow(accounts, (a) => a.credits?.windowLimits?.weekly)
				}
			} : null;
			const plans = unique(present.map((a) => a.subscription?.data?.planId).filter(nonEmpty));
			const statuses = unique(present.map((a) => a.subscription?.data?.status).filter(nonEmpty));
			const now = Date.now();
			const dated = present.filter((a) => nonEmpty(a.subscription?.data?.currentPeriodEnd));
			const current = dated.filter((a) => {
				const ms = Date.parse(String(a.subscription?.data?.currentPeriodEnd));
				return Number.isFinite(ms) && ms > now;
			});
			const anchor = earliestEnd(current.length > 0 ? current : dated);
			const anchorStart = anchor?.subscription?.data?.currentPeriodStart;
			const anchorEnd = anchor?.subscription?.data?.currentPeriodEnd;
			return {
				whoami: null,
				usage,
				credits,
				subscription: present.some((a) => a.subscription != null) ? {
					success: true,
					data: {
						planId: plans.length > 0 ? plans.join(" + ") : void 0,
						status: statuses.length > 0 ? statuses.join(" / ") : void 0,
						currentPeriodStart: nonEmpty(anchorStart) ? anchorStart : void 0,
						currentPeriodEnd: nonEmpty(anchorEnd) ? anchorEnd : void 0,
						cancelAtPeriodEnd: present.every((a) => a.subscription?.data?.cancelAtPeriodEnd === true) || void 0
					}
				} : null,
				keys
			};
		}
		/**
		* Resolve the current pool view and the payload it renders.
		*
		* `stats.ccView` is the instance's persisted selection (written by the card's own
		* tap-to-cycle). An unknown / stale value falls back to AllUser — the pool's
		* total is always a safe thing to show, and a renamed account must never leave a
		* card showing another account's numbers under a label it no longer matches.
		*/
		function ccView(stats) {
			const payload = cc(stats);
			const keys = payload?.keys !== void 0 && Array.isArray(payload.keys) ? payload.keys : [];
			const names = keys.map((entry, i) => entry.label !== "" ? entry.label : `Key ${i + 1}`);
			if (keys.length < 2) return {
				data: payload,
				mode: CC_ALL,
				modes: [],
				names,
				multi: false
			};
			const modes = [CC_ALL];
			for (let i = 0; i < names.length; i++) modes.push(modes.indexOf(names[i]) === -1 ? names[i] : `${names[i]} (${keys[i].tail ?? i + 1})`);
			const view = typeof stats.ccView === "string" ? stats.ccView : "";
			const idx = modes.indexOf(view);
			if (idx <= 0) return {
				data: aggregate(keys),
				mode: CC_ALL,
				modes,
				names,
				multi: true
			};
			return {
				data: keys[idx - 1].data ?? null,
				mode: modes[idx],
				modes,
				names,
				multi: true
			};
		}
		/** Tap-to-cycle descriptor for a multi-pool card. The selection persists in the
		*  instance's `ccView` config — deliberately NOT the OpenCode pool's `poolView`,
		*  so the two families never share a view, and naming a `store` also keeps the
		*  tap from firing the multikey `prefer` call (that pool is not this one). */
		function cycleFor$1(view) {
			if (!view.multi) return void 0;
			const chain = [...view.modes, view.modes[0]].join(" → ");
			return {
				modes: view.modes,
				current: view.mode,
				hint: t("cc.cycleHint", { chain }),
				store: "ccView"
			};
		}
		/**
		* Does this payload need a second look — a slice that did not answer, or a
		* period that has already rolled?
		*
		* The host route tolerates a failed upstream call by writing `null` for that
		* slice (deliberate: one dead endpoint must not blank the whole family), and the
		* browser only re-asks on mount and when a turn settles. A transient 5xx
		* therefore stayed on screen for the rest of a session: the pool's month lost a
		* member (or took the conservation fallback) and the 额度管理 card showed a
		* run-rate built from it — measured live 2026-09-20 as 20.2% / `账期 10-20` /
		* `今日推荐 59.9M` against a true 16.6% / `账期 10-10` / 645M. The collector asks
		* ONCE more shortly after seeing this, which is what makes such a state a blip
		* instead of the session's answer.
		*
		* @param c - the payload the route answered with (or null).
		* @returns true when re-asking shortly is worth one more round trip.
		*/
		function ccPayloadDegraded(c) {
			if (c === null || c === void 0) return false;
			const keys = Array.isArray(c.keys) ? c.keys : null;
			const accounts = keys !== null && keys.length > 0 ? keys.map((k) => k.data) : [c];
			const now = Date.now();
			for (const a of accounts) {
				if (a === null || a === void 0) return true;
				if (a.whoami == null || a.usage == null || a.credits == null || a.subscription == null) return true;
				const ms = typeof a.subscription.data?.currentPeriodEnd === "string" ? Date.parse(a.subscription.data.currentPeriodEnd) : NaN;
				if (Number.isFinite(ms) && ms <= now) return true;
			}
			return false;
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
		const PLAN_MONTHLY_ALLOWANCE$1 = { "individual-goat": 70 };
		/**
		* The monthly window of ONE account.
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
		* instead of inventing a number — where "the plan is unknown" includes the
		* subscription slice never answering (see the guard below).
		*/
		function monthlyWindowOf(c) {
			const remaining = c?.credits?.credits?.monthlyCredits;
			if (typeof remaining !== "number" || !Number.isFinite(remaining)) return null;
			const sub = c?.subscription;
			if (sub === null || sub === void 0 || sub.data === null || sub.data === void 0) return null;
			const resetIso = sub.data.currentPeriodEnd;
			const plan = sub.data.planId;
			const allowance = typeof plan === "string" ? PLAN_MONTHLY_ALLOWANCE$1[plan] : void 0;
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
		/**
		* The monthly window of whatever payload this is — one account, or the AllUser
		* aggregate.
		*
		* The pool's month is the SUM of its members' own months (used and allowance
		* both add), and each member is measured against ITS OWN plan: the plan table is
		* keyed by plan id, so a two-GOAT pool is 2 × $70, and reading the summed
		* balance against a single plan's allowance reported 0% for a pool that was 14%
		* used. A member whose plan id the table does not carry keeps its own
		* balance-conservation fallback; a member whose slices did NOT answer is a
		* different story — the whole pool's month is then unknown (null), because a
		* partial sum reads LOWER than the truth. The reset is the earliest member
		* period end (the next renewal).
		*
		* Exported so widgets that reason ABOUT the month (not just print it) — e.g.
		* the 额度管理 quota card, which extrapolates the month-end percent — read the
		* same official-matching figure instead of re-deriving their own.
		*/
		function monthlyWindow(c) {
			const keys = c?.keys;
			if (keys === void 0 || keys.length === 0) return monthlyWindowOf(c);
			const members = [];
			for (const k of keys) {
				const w = monthlyWindowOf(k.data);
				if (w === null) return null;
				members.push(w);
			}
			const used = members.reduce((s, w) => s + w.used, 0);
			const cap = members.reduce((s, w) => s + w.cap, 0);
			if (!(cap > 0)) return null;
			const now = Date.now();
			const isos = members.map((w) => w.resetIso).filter(nonEmpty).sort();
			const ahead = isos.filter((iso) => {
				const ms = Date.parse(iso);
				return Number.isFinite(ms) && ms > now;
			});
			return {
				key: "monthly",
				label: t("cc.winMonthly"),
				used,
				cap,
				pct: used / cap * 100,
				resetIso: (ahead.length > 0 ? ahead : isos)[0]
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
		* Caliber (#3): that rate may only be read off a log that COVERS the period
		* (`logCoversSince`). A log beginning mid-period understates the numerator, and
		* an understated rate does not merely soften the pace — it inflates the pace
		* measured in credits, which turned a calm month into a 247% red alarm on a
		* freshly loaded page (measured 2026-09-20, against a true 75%).
		*
		* Nothing here is invented: a missing percentage, allowance or a period that has
		* already ended returns `null` (the card then fills the layout with `-`, never
		* an error message); a missing credit→token side degrades 今日推荐 alone to
		* `null`; and a period too young to carry a pace comes back with
		* `projectable: false` — the consumed percent, today's tokens and today's budget
		* are all still real, so the card prints those instead of nothing. This module
		* imports NOTHING, so a Node type-stripping probe can load it against live
		* endpoints.
		*/
		const DAY_MS$3 = 864e5;
		/** Minimum elapsed period before projecting at all: below this the pace is
		*  noise (minutes of usage × a 30-day multiplier), so the card degrades. */
		const MIN_ELAPSED_DAYS = .25;
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
		* Tokens logged over `[periodStart, now]`.
		*
		* Exported on its own so a POOL can sum each member's OWN window (see the quota
		* card's `poolTokensPerCredit`): one shared window charged a key that reset this
		* morning against another key's three-week-old start. Day-granular, like the log
		* itself — the window's first and last day count whole.
		*
		* @param daily - the `YYYY-MM-DD` → tokens log (anything else yields 0).
		* @param periodStart - the window start (ISO string; unusable → `now`).
		* @param now - the clock.
		* @returns logged tokens inside the window (0 when the log has nothing there).
		*/
		function loggedTokensIn(daily, periodStart, now) {
			const map = daily !== null && typeof daily === "object" ? daily : null;
			if (map === null) return 0;
			return sumRange(map, isoDate(periodStart, now), now);
		}
		/**
		* The realised local-token-per-credit rate of one billing period:
		* `Σ logged tokens over [start, now] ÷ credits consumed in it`.
		*
		* Null when either side is unusable — in particular when the account has
		* consumed NOTHING in the period. That null is meaningful, not an error: a pool
		* member added today has no rate of its own, and the caller may hand the POOL's
		* rate in as `fallbackTokensPerCredit` so the budget side still answers.
		*
		* @param daily - the `YYYY-MM-DD` → tokens log.
		* @param periodStart - the period start (ISO string).
		* @param consumedCredits - credits consumed in that period.
		* @param now - the clock.
		*/
		function tokensPerCreditOf(daily, periodStart, consumedCredits, now) {
			const consumed = num(consumedCredits);
			if (consumed === null || !(consumed > 0)) return null;
			if (daily === null || typeof daily !== "object") return null;
			const spent = loggedTokensIn(daily, periodStart, now);
			return spent > 0 ? spent / consumed : null;
		}
		/**
		* Does the log reach back to `since` — i.e. does it hold a row on or before that
		* day? (Day-granular, like the log itself.)
		*
		* The credit→token rate divides the log's tokens by the period's WHOLE spend,
		* so it only means something when the log saw the whole period. A log that
		* begins mid-period (a browser that was closed until today, a fresh install, the
		* client's own accounting before dsh-usage-center's map lands) understates the
		* numerator — which does not merely soften the rate, it inflates the pace
		* measured in credits and turned a calm month into a 247% red alarm (measured
		* 2026-09-20 on a freshly loaded page whose fallback log held only today,
		* against a true 75%).
		*
		* @param daily - the `YYYY-MM-DD` → tokens log.
		* @param since - the window start (ISO string; unusable → the window IS today,
		*   which any non-empty log covers).
		* @param now - the clock.
		* @returns true when a log row exists at or before `since`'s local day.
		*/
		function logCoversSince(daily, since, now) {
			const map = daily !== null && typeof daily === "object" ? daily : null;
			if (map === null) return false;
			const keys = Object.keys(map).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
			if (keys.length === 0) return false;
			const from = localDayKey(isoDate(since, now));
			return keys[0] <= from;
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
			const elapsedDays = (now.getTime() - start.getTime()) / DAY_MS$3;
			const totalDays = (end.getTime() - start.getTime()) / DAY_MS$3;
			if (totalDays <= elapsedDays) return null;
			const projectable = elapsedDays >= MIN_ELAPSED_DAYS;
			const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS$3));
			const daily = input.daily !== null && typeof input.daily === "object" ? input.daily : null;
			const consumed = num(input.consumedCredits);
			const spent = consumed !== null && consumed > 0;
			const ownRate = spent && daily !== null && logCoversSince(daily, input.periodStart, now) ? tokensPerCreditOf(input.daily, input.periodStart, consumed, now) : null;
			const todayTokens = (spent && daily !== null ? loggedTokensIn(input.daily, input.periodStart, now) : 0) > 0 && daily !== null ? num(daily[localDayKey(now)]) ?? 0 : 0;
			const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const dayFraction = Math.max(MIN_DAY_FRACTION, Math.min(1, (now.getTime() - midnight.getTime()) / DAY_MS$3));
			const budgetRate = ownRate ?? num(input.fallbackTokensPerCredit);
			const remaining = num(input.remainingCredits);
			const spanDays = totalDays - elapsedDays;
			let todayRecommend = null;
			if (daily !== null && budgetRate !== null && budgetRate > 0 && remaining !== null && remaining >= 0) todayRecommend = remaining * budgetRate / spanDays;
			const windowStart = new Date(midnight);
			windowStart.setDate(windowStart.getDate() - 2);
			const paceFrom = windowStart.getTime() < start.getTime() ? start : windowStart;
			const paceFromMidnight = new Date(paceFrom.getFullYear(), paceFrom.getMonth(), paceFrom.getDate());
			const paceDays = Math.max(1, Math.round((midnight.getTime() - paceFromMidnight.getTime()) / DAY_MS$3) + 1);
			const completeDays = daily === null || ownRate === null ? 0 : sumRange(daily, paceFromMidnight, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
			const recentDailyTokens = !projectable || daily === null || ownRate === null ? 0 : (completeDays + todayTokens / dayFraction) / paceDays;
			return {
				usedPct,
				projectedPct: usedPct + (ownRate !== null && ownRate > 0 ? recentDailyTokens / ownRate : 0) * (totalDays - elapsedDays) / allowance * 100,
				projectable,
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
		*   「额度管理」                    blue title
		*   「115%  账期 10-10」            big figure under the title, the grey 账期 line
		*                                  to its RIGHT, bottom-aligned with the figure
		*   「今日用量 24.7M  今日推荐 200M」  today's tokens beside the day's budget
		*
		* The pool view is NOT labelled on the head (the stacked `AllUser` + 账期 block was
		* rejected as ugly): tapping the card still cycles the pool, the figures just move
		* with it silently.
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
		* The card never prints an error message — whatever is missing is FILLED. No
		* payload yet → `-%` beside the 账期 line it can still read; a period too young
		* to project (a pool member added today) → its real consumed percent, its real
		* budget, and 0 tokens; an unused member → zeros everywhere except the budget,
		* which is remaining credits ÷ days left at the POOL's realised rate (it has no
		* rate of its own yet).
		*
		* The plan numbers come from the Command Code account payload through
		* `cc-view`'s monthly window (the same official-matching percent the
		* cc-window-monthly card prints) and the shared daily token log SCOPE-LIMITED to
		* the Command Code route; the math lives in `client/lib/quota-math` (pure,
		* probe-able).
		*
		* Scope: every token figure here is the machine's log folded to the
		* `commandcode` route alone (`stats.commandCodeDaily`, served by
		* `/api/widgets-usage-daily?provider=commandcode`). The card's credits and
		* billing period describe that ONE plan, so reading the machine-wide log charged
		* it for every other provider the harness talked to that day (measured
		* 2026-09-20: 今日用量 758M where the plan itself served 474M — the rest was a
		* parallel OpenCode Go pool). When that scoped map is unavailable the token
		* figures print `—`, never a number measured on the wrong traffic.
		*/
		const DAY_MS$2 = 864e5;
		/** The sim multiplier for the over-budget preview state (135% of the month). */
		const SIM_OVER = 1.35;
		/** `MM-DD` split for the localized 账期 line — the LOCAL day of the instant. */
		function periodParts(iso) {
			const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
			if (hit === null) return {
				m: "-",
				d: "-"
			};
			if (iso.length > 10) {
				const ms = Date.parse(iso);
				if (Number.isFinite(ms)) {
					const d = new Date(ms);
					return {
						m: String(d.getMonth() + 1),
						d: String(d.getDate())
					};
				}
			}
			return {
				m: String(Number(hit[2])),
				d: String(Number(hit[3]))
			};
		}
		/** The card's 账期 line. Kept deliberately SHORT (`账期 10-10`, not
		*  `账期至 10月10日`): at 10px the grey slot holds ~11 full-width glyphs, and a
		*  verbose date line was the longest thing on the card. */
		function periodLine(iso) {
			const { m, d } = periodParts(iso);
			return t("widget.quota-manage.periodEnd", {
				m,
				d
			});
		}
		/** The period end this payload describes, as an ISO string (or null). */
		function periodEndOf(cc) {
			const iso = cc?.subscription?.data?.currentPeriodEnd;
			return typeof iso === "string" && iso.length >= 10 ? iso : null;
		}
		/**
		* The rate an unused pool member may borrow for its BUDGET: the pool's realised
		* local-token-per-credit rate (Σ logged tokens ÷ Σ credits consumed over the
		* pool's own period). Null when no member has consumed anything. The PACE never
		* borrows it — projecting the machine's usage onto an account that has served
		* nothing would invent a number.
		*
		* Each member is measured over ITS OWN period, and the two sums are taken over
		* the same members: one window for the whole pool paired the machine's log from
		* the OLDEST member's start with every member's spend, so a key that reset this
		* morning inherited weeks of tokens it never served (and the pool's rate — hence
		* the borrowed budget — moved whenever any member rolled over). A member whose
		* period the log cannot price is skipped rather than counted with a numerator it
		* never saw (`logCoversSince`).
		*
		* `daily` is the Command Code-SCOPED log (see the card's scope note): a
		* machine-wide one makes the rate — and with it every budget on the card — wrong
		* by whatever another provider spent in the same window.
		*/
		function poolTokensPerCredit(stats, daily, now) {
			const keys = stats.commandCode?.keys ?? [];
			let tokens = 0;
			let consumed = 0;
			for (const k of keys) {
				const spent = k.data?.usage?.totalCost;
				if (typeof spent !== "number" || !Number.isFinite(spent) || !(spent > 0)) continue;
				const start = k.data?.subscription?.data?.currentPeriodStart;
				if (!logCoversSince(daily, start, now)) continue;
				tokens += loggedTokensIn(daily, start, now);
				consumed += spent;
			}
			return consumed > 0 && tokens > 0 ? tokens / consumed : null;
		}
		function quotaRender(stats, meta) {
			const title = t("widget.quota-manage.name");
			const view = ccView(stats);
			const cycle = cycleFor$1(view);
			const cc = view.data;
			const now = /* @__PURE__ */ new Date();
			const month = monthlyWindow(cc ?? null);
			const daily = stats.commandCodeDaily !== void 0 && stats.commandCodeDaily !== null && Object.keys(stats.commandCodeDaily).length > 0 ? stats.commandCodeDaily : void 0;
			const plan = planQuota({
				usedPct: month?.pct,
				allowanceCredits: month?.cap,
				periodStart: cc?.subscription?.data?.currentPeriodStart,
				periodEnd: cc?.subscription?.data?.currentPeriodEnd,
				remainingCredits: cc?.credits?.credits?.monthlyCredits,
				consumedCredits: cc?.usage?.totalCost,
				daily,
				fallbackTokensPerCredit: view.multi && view.mode !== "AllUser" ? poolTokensPerCredit(stats, daily, now) : void 0
			}, now);
			const shownPct = plan === null ? month?.pct ?? null : plan.projectable ? plan.projectedPct : plan.usedPct;
			const simOver = meta?.sim?.over === true;
			const over = shownPct !== null && shownPct > 100 || simOver;
			const shown = simOver && shownPct !== null ? Math.max(shownPct, SIM_OVER * 100) : shownPct;
			const big = shown === null ? "-%" : plan !== null && plan.projectable && !simOver ? `${Math.round(shown)}%` : `${shown.toFixed(1)}%`;
			const period = periodEndOf(cc);
			const grey = period !== null ? periodLine(period) : null;
			const todayFromLog = (() => {
				if (daily === void 0) return "—";
				if (plan !== null) return fmtQuota(plan.todayTokens);
				const v = daily[localDayKey(now)];
				return typeof v === "number" ? fmtQuota(v) : "0";
			})();
			return {
				title,
				headAfter: {
					big,
					...grey !== null ? {
						small: grey,
						smallAlign: "bottom"
					} : {}
				},
				bodyAnchor: "bottom",
				valueTone: over ? "danger" : void 0,
				valuePulse: over || void 0,
				chart: {
					kind: "figures",
					figures: [{
						label: t("widget.quota-manage.used"),
						value: todayFromLog
					}, {
						label: t("widget.quota-manage.recommend"),
						value: plan?.todayRecommend == null ? "—" : fmtQuota(plan.todayRecommend)
					}]
				},
				cycle
			};
		}
		/** Widget-owned preview: a live-shaped account (period ending 26 days out) plus
		*  a deterministic 14-day log, so the preview shows plausible M figures instead
		*  of the shared mock's tiny token counts. The pace is sized so the run-rate
		*  projects a CALM month (measured 2026-09-20: ≈70%, so the default preview is
		*  not already in the red) — the over-budget state is the one the preview click
		*  adds. */
		function previewStats$4() {
			const now = /* @__PURE__ */ new Date();
			const daily = {};
			let periodTotal = 0;
			for (let i = 0; i < 14; i++) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
				const v = i === 13 ? 9e7 : 6e7 + i * 137 % 44 * 4e6;
				daily[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] = v;
				if (i >= 9) periodTotal += v;
			}
			const consumed = periodTotal / 89e6;
			return {
				heatmapRaw: daily,
				commandCodeDaily: daily,
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
							currentPeriodStart: (/* @__PURE__ */ new Date(now.getTime() - 4 * DAY_MS$2)).toISOString(),
							currentPeriodEnd: new Date(now.getTime() + 26 * DAY_MS$2).toISOString()
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
				stats: previewStats$4,
				sim: { over: false }
			}
		});
		//#endregion
		//#region src/client/families/usage/data.ts
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
		//#endregion
		//#region src/client/families/usage/renders.ts
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
			render: ccWhoamiRender
		});
		//#endregion
		//#region src/client/lib/peak-holidays.ts
		const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
		/** Bound on the user's 额外低谷日 list: a typo'd paste must not walk forever. */
		const MAX_EXTRA_RANGES = 40;
		/** Every known holiday range, newest year last. */
		const CN_HOLIDAYS = [...[
			{
				start: "2026-01-01",
				end: "2026-01-03",
				key: "card.peak.holiday.newyear"
			},
			{
				start: "2026-02-15",
				end: "2026-02-23",
				key: "card.peak.holiday.spring"
			},
			{
				start: "2026-04-04",
				end: "2026-04-06",
				key: "card.peak.holiday.qingming"
			},
			{
				start: "2026-05-01",
				end: "2026-05-05",
				key: "card.peak.holiday.labour"
			},
			{
				start: "2026-06-19",
				end: "2026-06-21",
				key: "card.peak.holiday.dragon"
			},
			{
				start: "2026-09-25",
				end: "2026-09-27",
				key: "card.peak.holiday.midautumn"
			},
			{
				start: "2026-10-01",
				end: "2026-10-07",
				key: "card.peak.holiday.national"
			}
		]];
		/** Years the table actually covers — a year missing here is reported, not guessed. */
		const HOLIDAY_YEARS = [2026];
		/** Where the ranges above come from, quoted in the cards' stale-table hint. */
		const HOLIDAY_TABLE_SOURCE = "国办发明电〔2025〕7号";
		/** The i18n key given to holidays that come from the user's own config list. */
		const CUSTOM_HOLIDAY_KEY = "card.peak.holiday.custom";
		/** `YYYY-MM-DD` → the four-digit year, or null when the key is malformed. */
		function yearOf(dateKey) {
			const m = DATE_RE.exec(dateKey);
			return m ? Number(m[1]) : null;
		}
		/** Inclusive `start <= dateKey <= end` on ISO keys (lexicographic === chronological). */
		function inRange(dateKey, r) {
			return dateKey >= r.start && dateKey <= r.end;
		}
		/** Is `year` covered by the built-in table? */
		function holidayTableCovers(year) {
			return HOLIDAY_YEARS.indexOf(year) !== -1;
		}
		/** The holiday `dateKey` falls in — the user's own ranges first, then the table.
		*  Returns undefined on an ordinary day. */
		function holidayFor(dateKey, extra = []) {
			for (const r of extra) if (inRange(dateKey, r)) return r;
			for (const r of CN_HOLIDAYS) if (inRange(dateKey, r)) return r;
		}
		/** Sanity-check a `YYYY-MM-DD` literal (month/day in range, real UTC day). */
		function validDay(dateKey) {
			const m = DATE_RE.exec(dateKey);
			if (!m) return false;
			const year = Number(m[1]);
			const month = Number(m[2]);
			const day = Number(m[3]);
			if (month < 1 || month > 12 || day < 1 || day > 31) return false;
			const d = new Date(Date.UTC(year, month - 1, day));
			return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
		}
		/**
		* Parse the 额外低谷日 config field into ranges.
		*
		* Accepted per entry (comma / semicolon / whitespace separated):
		*   `2027-01-01`                  one day
		*   `2027-02-05..2027-02-11`      an inclusive span (`~` and `…` also work)
		* Anything else is skipped rather than throwing — the field is edited keystroke
		* by keystroke, so a half-typed `2027-01-0` must never take the card down.
		*/
		function parseExtraHolidays(spec) {
			if (typeof spec !== "string" || spec.trim() === "") return [];
			const out = [];
			for (const raw of spec.split(/[,;\s]+/)) {
				if (raw === "") continue;
				const [a, b] = raw.split(/\.\.|~|–|—/);
				const start = (a ?? "").trim();
				const end = (b ?? start).trim();
				if (!validDay(start) || !validDay(end) || end < start) continue;
				out.push({
					start,
					end,
					key: CUSTOM_HOLIDAY_KEY
				});
				if (out.length >= MAX_EXTRA_RANGES) break;
			}
			return out;
		}
		//#endregion
		//#region src/client/lib/peak-schedule.ts
		/**
		* DeepSeek peak/off-peak pricing — the RULE, in the shared layer.
		*
		* SHARED LAYER since 2026-09-28, for the same reason as `peak-holidays`: TWO cards
		* (峰谷定价 2×2 and 峰谷时段表 2×4) must never disagree about what counts as peak
		* right now — if they did, the rail would be lying on one of them. The rule used to
		* live inside the 2×2 unit and be imported FROM there by the 2×4 one, which made
		* deleting that directory break the other card; a rule two cards share belongs to
		* neither. Both now read this module, and the 2×4 unit's `schedule.ts` keeps only
		* its render mapping.
		*
		* Everything here is pure: no React, no DOM, no i18n. The cards own their strings.
		*/
		/** Default peak windows, Beijing time (UTC+8). DeepSeek V4 Flash / V4 Flash
		*  Vision Exp / V4 Pro price peaks: Mon–Fri 01:00–04:00 and 06:00–10:00 UTC,
		*  which is 09:00–12:00 and 14:00–18:00 Beijing. Every other moment is
		*  off-peak — including all of Saturday/Sunday (the 调休 workday weekends
		*  included) and every Chinese public holiday for the WHOLE day. Editable per
		*  card (`peakWindows`); the meter can hold two rows, hence the cap. */
		const DEFAULT_PEAK_WINDOWS = "09:00-12:00, 14:00-18:00";
		/** Cap on parsed windows — the meter's designed shape is two rows. */
		const MAX_WINDOWS = 2;
		/** The built-in windows, used whenever the config field is empty/unparseable. */
		const FALLBACK_WINDOWS = [{
			start: 540,
			end: 720
		}, {
			start: 840,
			end: 1080
		}];
		/** `09:00-12:00, 14:00-18:00` → minute ranges (at most MAX_WINDOWS).
		*  Tolerant on purpose: the config field is edited keystroke by keystroke, so an
		*  unrecognised or half-typed entry is skipped, and an entirely unusable value
		*  falls back to the built-in windows instead of leaving the card windowless. */
		function parsePeakWindows(spec) {
			if (typeof spec === "string" && spec.trim() !== "") {
				const out = [];
				for (const part of spec.split(/[,;]/)) {
					const m = /^\s*(\d{1,2}):(\d{2})\s*[-–~—]\s*(\d{1,2}):(\d{2})\s*$/.exec(part);
					if (!m) continue;
					const start = Number(m[1]) * 60 + Number(m[2]);
					const end = Number(m[3]) * 60 + Number(m[4]);
					if (start >= end || start < 0 || end > 1440) continue;
					out.push({
						start,
						end
					});
					if (out.length >= MAX_WINDOWS) break;
				}
				if (out.length > 0) return out;
			}
			return FALLBACK_WINDOWS.map((w) => ({ ...w }));
		}
		/** Minutes-from-midnight → `HH:MM`. */
		function fmtMins(mins) {
			return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
		}
		/** The clock for `now` in the configured zone. `Asia/Shanghai` is computed as a
		*  fixed UTC+8 offset (China has no DST), so the verdict never depends on the
		*  machine's own time zone — which is what the previous local-clock reading got
		*  wrong the moment the browser was not set to Beijing. `local` keeps the old
		*  behaviour for anyone who wants their own clock. */
		function clockAt(now, tz) {
			const local = tz === "local";
			const d = local ? now : new Date(now.getTime() + 288e5);
			const year = local ? d.getFullYear() : d.getUTCFullYear();
			const month = (local ? d.getMonth() : d.getUTCMonth()) + 1;
			const day = local ? d.getDate() : d.getUTCDate();
			return {
				year,
				dow: local ? d.getDay() : d.getUTCDay(),
				mins: (local ? d.getHours() : d.getUTCHours()) * 60 + (local ? d.getMinutes() : d.getUTCMinutes()),
				dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
			};
		}
		/** Read a card's config fields off the merged stats record. Missing fields mean
		*  "default", so a widget rendered without config (probes, previews) behaves
		*  exactly like a freshly added card. Both pricing cards read their settings
		*  through THIS function, so every key means the same thing on each of them. */
		function peakConfigOf(stats) {
			const s = stats ?? {};
			return {
				windows: parsePeakWindows(s.peakWindows),
				weekendOff: s.weekendOff !== false,
				holidayOff: s.holidayOff !== false,
				tz: typeof s.timeZone === "string" && s.timeZone !== "" ? s.timeZone : "Asia/Shanghai",
				extra: parseExtraHolidays(s.extraHolidays)
			};
		}
		/** Is right now inside a peak window? Returns the active window index and the
		*  whole-day off-peak reason too, so a card can say WHY it is cheap.
		*  Exported so probes and the preview surfaces can date-shift the check. */
		function peakStatusNow(now = /* @__PURE__ */ new Date(), cfg = peakConfigOf(null)) {
			const c = clockAt(now, cfg.tz);
			const year = yearOf(c.dateKey) ?? c.year;
			const holiday = cfg.holidayOff ? holidayFor(c.dateKey, cfg.extra) : void 0;
			const stale = cfg.holidayOff && cfg.extra.length === 0 && !holidayTableCovers(year);
			if (holiday) return {
				peak: false,
				reasonKey: holiday.key,
				dateKey: c.dateKey,
				holidayTableStale: stale
			};
			if (cfg.weekendOff && (c.dow === 0 || c.dow === 6)) return {
				peak: false,
				reasonKey: "card.peak.weekend",
				dateKey: c.dateKey,
				holidayTableStale: stale
			};
			for (let i = 0; i < cfg.windows.length; i++) {
				const w = cfg.windows[i];
				if (c.mins >= w.start && c.mins < w.end) return {
					peak: true,
					activeIndex: i,
					dateKey: c.dateKey,
					holidayTableStale: stale
				};
			}
			return {
				peak: false,
				dateKey: c.dateKey,
				holidayTableStale: stale
			};
		}
		//#endregion
		//#region src/widgets/peak-pricing/index.ts
		/**
		* Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
		*
		* THE RULE IS SHARED (2026-09-28): the windows parser, the zone clock, the config
		* reader and the verdict all live in `src/client/lib/peak-schedule.ts`, and the
		* holiday table in `src/client/lib/peak-holidays.ts`, because the 峰谷时段表 card
		* needs exactly the same answers — and two cards must never disagree about what
		* counts as peak. This file keeps only what is ITS own: the row labels and the
		* 2×2 posture.
		*/
		/** One meter row's label: 上午/下午 + the range, so a customised window still
		*  reads like the built-in pair. */
		function windowLabel(w) {
			const range = `${fmtMins(w.start)}–${fmtMins(w.end)}`;
			return t(w.start < 720 ? "card.peak.am" : "card.peak.pm", { range });
		}
		/** Peak-pricing card (2×2): which DeepSeek pricing window is live right now.
		*  Value mirrors the cache/tokens card (big bottom-left label): EXPENSIVE while
		*  a peak window is active, CHEAP otherwise. The two windows live under the
		*  title; the active one lights up brand-blue. On a day that is off-peak in full
		*  (weekend / Chinese public holiday — see holidays.ts) the meter shows that
		*  reason instead: no window applies to such a day. The EXPENSIVE escalation is
		*  on the TEXT itself — the value turns red and blinks (valuePulse); the card
		*  frame stays clean (the old red inner glow was removed on request). A preview
		*  can pass meta.sim = { peak, reasonKey?, window? } to force any state. */
		function peakPricingRender(stats, meta) {
			const cfg = peakConfigOf(stats);
			const sim = meta?.sim;
			const simPeak = sim && typeof sim.peak === "boolean" ? sim.peak : null;
			const live = peakStatusNow(/* @__PURE__ */ new Date(), cfg);
			const peak = simPeak !== null ? simPeak : live.peak;
			const reasonKey = simPeak === null ? live.peak ? void 0 : live.reasonKey : simPeak ? void 0 : typeof sim?.reasonKey === "string" ? sim.reasonKey : void 0;
			const activeIndex = simPeak === null ? live.activeIndex : simPeak ? typeof sim?.window === "number" && sim.window >= 0 && sim.window < cfg.windows.length ? sim.window : 0 : void 0;
			const meter = reasonKey ? [{
				label: t("card.peak.offDay", { reason: t(reasonKey) }),
				active: false
			}] : cfg.windows.map((w, i) => ({
				label: windowLabel(w),
				active: i === activeIndex
			}));
			return {
				title: t("card.peak.title"),
				meter,
				value: peak ? "EXPENSIVE" : "CHEAP",
				valueTone: peak ? "danger" : void 0,
				valuePulse: peak,
				cardHint: live.holidayTableStale ? t("card.peak.staleHint", {
					year: live.dateKey.slice(0, 4),
					source: HOLIDAY_TABLE_SOURCE
				}) : void 0
			};
		}
		var peak_pricing_default = defineWidget({
			id: "peak-pricing",
			name: () => t("widget.peak-pricing.name"),
			desc: () => t("widget.peak-pricing.desc"),
			builtin: false,
			group: "pricing",
			simToggle: () => t("sim.peak"),
			render: peakPricingRender,
			configSchema: [
				{
					key: "peakWindows",
					label: () => t("config.peak.windows"),
					type: "text",
					default: DEFAULT_PEAK_WINDOWS
				},
				{
					key: "weekendOff",
					label: () => t("config.peak.weekend"),
					type: "toggle",
					default: true
				},
				{
					key: "holidayOff",
					label: () => t("config.peak.holiday"),
					type: "toggle",
					default: true
				},
				{
					key: "timeZone",
					label: () => t("config.peak.timeZone"),
					type: "mode",
					default: "Asia/Shanghai",
					options: [["Asia/Shanghai", () => t("config.peak.tz.beijing")], ["local", () => t("config.peak.tz.local")]]
				},
				{
					key: "extraHolidays",
					label: () => t("config.peak.extra"),
					type: "text",
					default: ""
				}
			],
			example: {
				sim: { peak: false },
				simSteps: [
					{ peak: false },
					{ peak: true },
					{
						peak: false,
						reasonKey: "card.peak.holiday.midautumn"
					},
					{
						peak: false,
						reasonKey: "card.peak.weekend"
					}
				]
			}
		});
		//#endregion
		//#region src/client/families/sys/data.ts
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
		/** Max null run the sparkline carries ACROSS instead of breaking at (see below). */
		const CHART_GAP_MAX = 4;
		/**
		* Utilization samples ready to plot.
		*
		* A `null` in the host history means "the driver did not answer this poll" (the
		* host's nvidia-smi query has a 3s timeout), NOT "0 %". The chart's x axis is
		* sample ORDER, so a hole used to be drawn as a break: measured on the live
		* 利用率 card 2026-09-20 — `history.gpu` held 26 nulls against 0 in
		* `history.cpu`, and the card rendered TWO polylines (15 + 3 points), which is
		* exactly the dashed, "cut off" sparkline the user reported while their GPU sat
		* completely idle at 0 %.
		*
		* So a short miss carries the last known value forward (the poll window IS the
		* averaging window, and the previous reading is the best estimate for a
		* utilization graph — Windows' own graph does the same). A LONG run (more than
		* CHART_GAP_MAX samples, i.e. a device that really went away) still breaks the
		* line, and the card's own no-GPU state reports that case in words. Leading
		* nulls (before the first reading) are dropped rather than fabricated.
		*/
		function plotSamples(vals) {
			const out = [];
			let last = null;
			let gap = 0;
			for (const v of vals) {
				if (typeof v === "number" && Number.isFinite(v)) {
					out.push(v);
					last = v;
					gap = 0;
					continue;
				}
				if (last === null) continue;
				gap += 1;
				out.push(gap <= CHART_GAP_MAX ? last : null);
			}
			return out;
		}
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
		//#endregion
		//#region src/client/families/sys/renders.ts
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
		/** sys-gpu-line: GPU utilization sparkline (Windows-task-manager style) with the
		*  current utilization as the big figure. The head follows the 上下文水位 shape the
		*  user asked for: the blue title on top, the big percent on the NEXT row, and
		*  the grey `°C · GB` facts to its RIGHT on that same row. The card body carries
		*  the sparkline, which is ELASTIC (CardBody gives the line chart the remaining
		*  vertical space, ChartBlock renders it at flex:1/100%) — so the card's
		*  intrinsic height stays inside the 2×2 box at ANY side size or magnification
		*  factor (the old fixed 68px sparkline totalled ≈178px and burst the 150px box
		*  on hover). */
		function sysGpuLineRender(stats) {
			const s = sysInfo(stats);
			if (s === null) return sysUnavailable("widget.sys-gpu-line.name");
			if (s.gpu === null) return {
				title: t("widget.sys-gpu-line.name"),
				value: "—",
				legend: t("sysinfo.noGpu")
			};
			const g = s.gpu;
			const facts = `${Math.round(g.temp)}°C · ${fmtGb(g.memUsed)}`;
			const hist = historyOf(s);
			const allVals = hist ? plotSamples(hist.gpu) : [];
			const allTs = hist ? hist.ts : [];
			if (allVals.length < 2) return {
				title: t("widget.sys-gpu-line.name"),
				headAfter: {
					big: `${Math.round(g.util)}%`,
					small: facts
				}
			};
			const N = resolveSparkPoints(stats);
			const vals = allVals.slice(-N);
			const ts = allTs.slice(-N);
			const fmtT = (tms) => {
				const d = new Date(tms);
				return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
			};
			return {
				title: t("widget.sys-gpu-line.name"),
				headAfter: {
					big: `${Math.round(g.util)}%`,
					small: facts
				},
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
		//#region src/widgets/sys-cpu/index.ts
		/** CPU utilization as a big number with a memory line (title + number card). */
		var sys_cpu_default = defineWidget({
			id: "sys-cpu",
			name: () => t("widget.sys-cpu.name"),
			desc: () => t("widget.sys-cpu.desc"),
			builtin: false,
			group: "device",
			configSchema: [...intervalSchema(), bigMetricSchema(cpuMetricOptions())],
			render: sysCpuRender
		});
		//#endregion
		//#region src/widgets/cc-usage/index.ts
		/** Command Code usage summary (requests / success / tokens / spend). */
		var cc_usage_default = defineWidget({
			id: "cc-usage",
			name: () => t("widget.cc-usage.name"),
			desc: () => t("widget.cc-usage.desc"),
			builtin: false,
			group: "commandcode",
			render: ccUsageRender
		});
		//#endregion
		//#region src/widgets/sys-gpu/index.ts
		/** GPU VRAM as a big number with utilization/temperature line (title + number
		*  card). */
		var sys_gpu_default = defineWidget({
			id: "sys-gpu",
			name: () => t("widget.sys-gpu.name"),
			desc: () => t("widget.sys-gpu.desc"),
			builtin: false,
			group: "device",
			configSchema: [...intervalSchema(), bigMetricSchema(gpuMetricOptions())],
			render: sysGpuRender
		});
		//#endregion
		//#region src/widgets/cc-credits/index.ts
		/** Command Code credit balance + 5h / weekly quota bars. */
		var cc_credits_default = defineWidget({
			id: "cc-credits",
			name: () => t("widget.cc-credits.name"),
			desc: () => t("widget.cc-credits.desc"),
			builtin: false,
			group: "commandcode",
			render: ccCreditsRender
		});
		//#endregion
		//#region src/widgets/sys-rings/index.ts
		/** CPU + GPU utilization as two side-by-side donuts (ring placeholder card). */
		var sys_rings_default = defineWidget({
			id: "sys-rings",
			name: () => t("widget.sys-rings.name"),
			desc: () => t("widget.sys-rings.desc"),
			builtin: false,
			group: "device",
			configSchema: intervalSchema(),
			render: sysRingsRender
		});
		//#endregion
		//#region src/widgets/cc-windows/index.ts
		/** Command Code 5h / weekly quota windows as two donuts. */
		var cc_windows_default = defineWidget({
			id: "cc-windows",
			name: () => t("widget.cc-windows.name"),
			desc: () => t("widget.cc-windows.desc"),
			builtin: false,
			group: "commandcode",
			render: ccWindowsRender
		});
		//#endregion
		//#region src/widgets/sys-board/index.ts
		/** 2×4 monitoring dashboard: every hardware metric as a ring. */
		var sys_board_default = defineWidget({
			id: "sys-board",
			name: () => t("widget.sys-board.name"),
			desc: () => t("widget.sys-board.desc"),
			builtin: false,
			group: "device",
			sizes: ["2x4"],
			configSchema: intervalSchema(),
			render: sysBoardRender
		});
		//#endregion
		//#region src/widgets/cc-subscription/index.ts
		const DAY_MS$1 = 864e5;
		/** Preview payload: a live-shaped GOAT subscription ending 26 days out, so the
		*  card shows a real period line and a real badge instead of the shared mock. */
		function previewStats$3() {
			const now = /* @__PURE__ */ new Date();
			return { commandCode: {
				whoami: null,
				usage: null,
				credits: null,
				subscription: {
					success: true,
					data: {
						planId: "individual-goat",
						status: "active",
						currentPeriodStart: (/* @__PURE__ */ new Date(now.getTime() - 4 * DAY_MS$1)).toISOString(),
						currentPeriodEnd: new Date(now.getTime() + 26 * DAY_MS$1).toISOString()
					}
				}
			} };
		}
		/** Command Code plan tier + billing period end (subscriptions). A preview click
		*  walks the plan ladder (GOAT → Pro → Max → Ultra → Provider → Go → Teams Pro),
		*  because that badge is the whole card and no install owns every plan. */
		var cc_subscription_default = defineWidget({
			id: "cc-subscription",
			name: () => t("widget.cc-subscription.name"),
			desc: () => t("widget.cc-subscription.desc"),
			builtin: false,
			group: "commandcode",
			render: ccSubscriptionRender,
			simToggle: () => t("widget.cc-subscription.simToggle"),
			example: {
				stats: previewStats$3,
				sim: { plan: "individual-goat" },
				simSteps: PLAN_TIER_STEPS
			}
		});
		//#endregion
		//#region src/widgets/sys-gpu-line/index.ts
		/** GPU utilization sparkline (Windows-task-manager style) with the current
		*  utilization as the big figure. */
		var sys_gpu_line_default = defineWidget({
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
		});
		//#endregion
		//#region src/widgets/cc-window-5h/index.ts
		/** Command Code 5-hour window usage percent. */
		var cc_window_5h_default = defineWidget({
			id: "cc-window-5h",
			name: () => t("widget.cc-window-5h.name"),
			desc: () => t("widget.cc-window-5h.desc"),
			builtin: false,
			group: "commandcode",
			render: ccWindowValueRender("fiveHour")
		});
		//#endregion
		//#region src/widgets/cc-window-weekly/index.ts
		/** Command Code weekly window usage percent. */
		var cc_window_weekly_default = defineWidget({
			id: "cc-window-weekly",
			name: () => t("widget.cc-window-weekly.name"),
			desc: () => t("widget.cc-window-weekly.desc"),
			builtin: false,
			group: "commandcode",
			render: ccWindowValueRender("weekly")
		});
		//#endregion
		//#region src/widgets/cc-window-monthly/index.ts
		/** Command Code monthly (billing-period) usage percent. The API serves no
		*  monthly window object, so this figure is derived by conservation:
		*  used = totalMonthlyCredits, cap = used + credits.monthlyCredits. */
		var cc_window_monthly_default = defineWidget({
			id: "cc-window-monthly",
			name: () => t("widget.cc-window-monthly.name"),
			desc: () => t("widget.cc-window-monthly.desc"),
			builtin: false,
			group: "commandcode",
			render: ccWindowValueRender("monthly")
		});
		//#endregion
		//#region src/client/families/github/data.ts
		/**
		* dsh-widgets — GitHub family shared view helpers (contract-stable core).
		*
		* Five units (`github-contrib` / `github-stars` / `github-issues` /
		* `github-push` / `github-board`) read ONE host payload (`/api/github`, see
		* `src/index.ts`) and share everything about how it becomes a card: the two
		* config fields, which repo a pulse card is about, the tap-cycle across
		* several repos, and the degraded card for every way the payload can be thin.
		* A unit therefore holds only its own descriptor + dictionary.
		*
		* The family is deliberately split rather than merged into one 2×2 tile:
		* these are four independent readings (how much you contributed, how many
		* stars, whether anyone is waiting on you, when it last moved), and the card
		* grammar gives ONE dominant figure per 150px tile. `github-board` is the 2×4
		* that puts them side by side for the wide-slot case.
		*/
		/** The fields every GitHub card shares. Both are OPTIONAL on purpose: empty
		*  means "whatever this machine is signed in as" (the host resolves the login
		*  from the credential / `gh` CLI), so a fresh install shows the user's own
		*  numbers with nothing typed. */
		function githubConfigSchema() {
			return [{
				key: "user",
				label: () => t("config.github.user"),
				type: "text",
				default: ""
			}, {
				key: "repos",
				label: () => t("config.github.repos"),
				type: "text",
				default: ""
			}];
		}
		/** `Physicolor/dsh-widgets` -> `dsh-widgets` (the card has 150px, the owner
		*  usually does not disambiguate anything). */
		function repoShort(fullName) {
			const slash = fullName.lastIndexOf("/");
			return slash === -1 ? fullName : fullName.slice(slash + 1);
		}
		/** The repo a pulse card reads: the family's shared selection (`ghRepo`,
		*  written by any card's tap-cycle and persisted per instance) or the first
		*  repo the host answered with. */
		function selectedRepo(stats) {
			const repos = stats.github?.repos ?? [];
			if (repos.length === 0) return null;
			const wanted = typeof stats.ghRepo === "string" ? stats.ghRepo : "";
			return repos.find((repo) => repo.fullName === wanted) ?? repos[0] ?? null;
		}
		/** Tap-to-cycle across the answered repos. Every repo card carries the SAME
		*  modes + store, so tapping any one of them moves the whole family — the
		*  usage/cc pool family's behaviour, for the same reason (several cards, one
		*  subject). Absent with a single repo: nothing to switch to, so no gesture. */
		function repoCycle(stats) {
			const repos = stats.github?.repos ?? [];
			if (repos.length < 2) return void 0;
			const current = selectedRepo(stats)?.fullName ?? repos[0].fullName;
			return {
				modes: repos.map((repo) => repo.fullName),
				current,
				hint: t("github.cycle", { chain: repos.map((r) => repoShort(r.fullName)).join(" → ") }),
				store: "ghRepo"
			};
		}
		/** Why a GitHub card has nothing to show. Reads the SHELL-facing error first
		*  (the route itself never answered) and falls back to what the payload said
		*  about its own slices, so "restart dsh web" is never confused with "you are
		*  not signed in". */
		function emptyHint(stats, slice) {
			if (stats.githubError !== null && stats.githubError !== void 0) return stats.githubError === "unloaded" ? t("github.staleHost") : t("github.unavailable");
			const note = stats.github?.errors?.[slice];
			if (note === "no-user" || note === "no-repo") return slice === "contributions" ? t("github.noUser") : t("github.noRepo");
			return slice === "contributions" ? t("github.noUser") : t("github.noRepo");
		}
		/** One figure + its name, for the board's figures row. */
		function previewContribDays() {
			const days = [];
			const now = /* @__PURE__ */ new Date();
			let seed = 7;
			for (let back = 370; back >= 0; back--) {
				const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
				seed = (seed * 1103515245 + 12345) % 2147483648;
				const r = seed / 2147483648;
				const weekend = d.getDay() === 0 || d.getDay() === 6;
				const count = r < (weekend ? .62 : .32) ? 0 : Math.round(1 + r * (weekend ? 7 : 24));
				days.push({
					date: dayKey(d),
					count,
					level: count === 0 ? 0 : count < 3 ? 1 : count < 8 ? 2 : count < 16 ? 3 : 4
				});
			}
			return days;
		}
		/** Widget-owned preview payload: what the market / 组件配置 surfaces feed the
		*  family so every card renders its real shape with no network call and no
		*  credentials (the units' `example.stats`). */
		function githubPreviewStats() {
			const days = previewContribDays();
			const repo = {
				fullName: "Physicolor/dsh-widgets",
				stars: 5,
				forks: 0,
				openIssues: 1,
				issueCountCapped: false,
				unanswered: 0,
				pushedAt: (/* @__PURE__ */ new Date(Date.now() - 108e5)).toISOString(),
				release: {
					tag: "v1.7.0",
					name: "v1.7.0",
					publishedAt: (/* @__PURE__ */ new Date(Date.now() - 216e5)).toISOString()
				},
				newestIssue: {
					number: 1,
					title: "",
					comments: 3,
					updatedAt: (/* @__PURE__ */ new Date(Date.now() - 2592e6)).toISOString()
				}
			};
			return {
				github: {
					auth: "gh",
					login: "Physicolor",
					contributions: {
						login: "Physicolor",
						total: days.reduce((sum, d) => sum + d.count, 0),
						source: "graphql",
						days,
						streak: 4,
						longest: 11
					},
					repos: [repo],
					errors: {}
				},
				githubError: null
			};
		}
		//#endregion
		//#region src/client/families/github/renders.ts
		function figure(label, value) {
			return {
				label,
				value
			};
		}
		/** The contribution calendar. 2×2 covers ~3 months (13 week-columns), 2×4 the
		*  last year (53) — the shape of GitHub's own graph, and the reason the figures
		*  are per-window the same way the token heatmap's are. */
		function githubContribRender(stats, meta) {
			const calendar = stats.github?.contributions ?? null;
			if (calendar === null || calendar.days.length === 0) return {
				title: t("github.contrib.title"),
				value: "—",
				legend: emptyHint(stats, "contributions")
			};
			const wide = meta?.size === "2x4";
			const grid = buildGitHubGrid(calendar.days, wide ? 53 : 13);
			const label = t("github.contrib.total", { n: sumGrid(grid) });
			return {
				title: t("github.contrib.title"),
				...wide ? { headRight: label } : { legend: label },
				chart: {
					kind: "heatmap",
					heatmap: grid,
					heatmapPalette: "github",
					heatmapUnit: t("github.contrib.unit")
				}
			};
		}
		/** Stars (+ forks): the slowest-moving figure of the family, which is why it
		*  is a 2×2 and not a headline. */
		function githubStarsRender(stats) {
			const repo = selectedRepo(stats);
			if (repo === null) return {
				title: t("github.stars"),
				value: "—",
				legend: emptyHint(stats, "repos")
			};
			return {
				title: t("github.stars"),
				legend: repoShort(repo.fullName),
				value: String(repo.stars),
				sub: `${repo.forks} ${t("github.forks")}`,
				cycle: repoCycle(stats)
			};
		}
		/** Open issues, with the unanswered count — the one figure in the family that
		*  implies an action. `unanswered === null` (anonymous, no token) prints the
		*  honest "needs a token" line instead of a zero nobody measured. */
		function githubIssuesRender(stats) {
			const repo = selectedRepo(stats);
			if (repo === null) return {
				title: t("github.issues"),
				value: "—",
				legend: emptyHint(stats, "repos")
			};
			return {
				title: t("github.issues"),
				legend: repoShort(repo.fullName),
				value: `${repo.openIssues}${repo.issueCountCapped ? "+" : ""}`,
				sub: repo.unanswered === null ? t("github.unansweredUnknown") : `${repo.unanswered} ${t("github.unanswered")}`,
				cycle: repoCycle(stats)
			};
		}
		/** When it last moved, and the newest release tag. */
		function githubPushRender(stats) {
			const repo = selectedRepo(stats);
			if (repo === null) return {
				title: t("github.push"),
				value: "—",
				legend: emptyHint(stats, "repos")
			};
			return {
				title: t("github.push"),
				legend: repoShort(repo.fullName),
				value: fmtAgo(repo.pushedAt),
				sub: repo.release === null ? t("github.noRelease") : t("github.release", { tag: repo.release.tag }),
				cycle: repoCycle(stats)
			};
		}
		/** The 2×4 board: the four readings of ONE repo side by side. */
		function githubBoardRender(stats) {
			const repo = selectedRepo(stats);
			if (repo === null) return {
				title: t("github.board.title"),
				value: "—",
				legend: emptyHint(stats, "repos")
			};
			const release = repo.release === null ? t("github.noRelease") : t("github.release", { tag: repo.release.tag });
			return {
				title: t("github.board.title"),
				legend: `${repo.fullName} · ${release}`,
				chart: {
					kind: "figures",
					figures: [
						figure(t("github.stars"), String(repo.stars)),
						figure(t("github.issues"), `${repo.openIssues}${repo.issueCountCapped ? "+" : ""}`),
						figure(t("github.unanswered"), repo.unanswered === null ? "—" : String(repo.unanswered)),
						figure(t("github.push"), fmtAgo(repo.pushedAt))
					]
				},
				bodyAnchor: "bottom",
				cycle: repoCycle(stats)
			};
		}
		//#endregion
		//#region src/widgets/github-contrib/index.ts
		/** GitHub contribution calendar — GitHub's own five-step green grid, drawn by
		*  the same heatmap renderer as the token calendar (only the palette and the
		*  meaning of a cell differ). 2×2 covers ~3 months, 2×4 the last year, which
		*  is the window GitHub's own profile header reports. */
		var github_contrib_default = defineWidget({
			id: "github-contrib",
			name: () => t("widget.github-contrib.name"),
			desc: () => t("widget.github-contrib.desc"),
			builtin: false,
			group: "github",
			sizes: ["2x2", "2x4"],
			configSchema: githubConfigSchema(),
			render: githubContribRender,
			example: { stats: githubPreviewStats }
		});
		//#endregion
		//#region src/widgets/github-stars/index.ts
		/** Repo stars (+ forks) — the slowest figure in the family, so it stays a 2×2
		*  tile rather than a headline. */
		var github_stars_default = defineWidget({
			id: "github-stars",
			name: () => t("widget.github-stars.name"),
			desc: () => t("widget.github-stars.desc"),
			builtin: false,
			group: "github",
			sizes: ["2x2"],
			configSchema: githubConfigSchema(),
			render: githubStarsRender,
			example: { stats: githubPreviewStats }
		});
		//#endregion
		//#region src/widgets/github-issues/index.ts
		/** Open issues (PRs excluded) plus how many nobody has answered — the only
		*  GitHub figure that implies an action. */
		var github_issues_default = defineWidget({
			id: "github-issues",
			name: () => t("widget.github-issues.name"),
			desc: () => t("widget.github-issues.desc"),
			builtin: false,
			group: "github",
			sizes: ["2x2"],
			configSchema: githubConfigSchema(),
			render: githubIssuesRender,
			example: { stats: githubPreviewStats }
		});
		//#endregion
		//#region src/widgets/github-push/index.ts
		/** Last push distance + newest release tag: "is this repo alive, and what did
		*  it last ship". */
		var github_push_default = defineWidget({
			id: "github-push",
			name: () => t("widget.github-push.name"),
			desc: () => t("widget.github-push.desc"),
			builtin: false,
			group: "github",
			sizes: ["2x2"],
			configSchema: githubConfigSchema(),
			render: githubPushRender,
			example: { stats: githubPreviewStats }
		});
		//#endregion
		//#region src/widgets/github-board/index.ts
		/** The 2×4 board: the family's four readings of ONE repo side by side. */
		var github_board_default = defineWidget({
			id: "github-board",
			name: () => t("widget.github-board.name"),
			desc: () => t("widget.github-board.desc"),
			builtin: false,
			group: "github",
			sizes: ["2x4"],
			configSchema: githubConfigSchema(),
			render: githubBoardRender,
			example: { stats: githubPreviewStats }
		});
		//#endregion
		//#region src/widgets/usage-mix/index.ts
		/**
		* 套餐总览 (usage-mix) — the cross-platform quota board, 2×2.
		*
		*   ┌ 套餐总览 ──────────────╭───╮┐
		*   │ 92M                    │86%││   标题 → 今日用量 20px → 右上角占用环形
		*   │ 重置 2h13m             ╰───╯│   灰字 = 最紧窗口的回血倒计时
		*   │ ─────────────────────────────│   发丝分隔线
		*   │ 今日                   92M   │   今日永远第一行（灰）
		*   │ Command Code          86.0%  │   每个平台取自己最紧的窗口
		*   │ OpenCode Go           42.0%  │
		*   └──────────────────────────────┘
		*
		* TODAY FIRST (the owner's convention): the card leads with what the machine
		* actually SPENT, and `today` is the FIRST body row and never moves. The head
		* carries a DIFFERENT reading rather than repeating it — the headline figure is
		* today's tokens, the grey caption under it is when the tightest plan refills,
		* and the RING in the top-right corner is that plan's occupancy (the「缓存命中」
		* head-donut shape the owner pointed at, with the urgency ramp INVERTED: there a
		* high number is good (green), here a high number means a plan about to block).
		*
		* WHY ONE WINDOW PER ROW: OpenCode Go carries three windows and Command Code two
		* to three; a seven-column chart on a 150px tile is not a glance. Each ROW is a
		* POOL (the platform name, or `Command Code Ⅱ` for its second key pool),
		* reduced to the window closest to its cap — the binding one, which is what
		* "would I be blocked" asks. The per-window cards (usage-rolling/weekly/monthly,
		* cc-window-*) keep the full window-by-window breakdown.
		*
		* ── SIZE: 2×2 ONLY (owner's call, 2026-09-28) ─────────────────────────────────
		* The 2×4 was dropped. On the shared geometry (card-geometry.ts — pad 12, so a
		* 150px card's content box is 126px tall) its extra WIDTH could only buy a longer
		* reset line and one more pool row, never a chart: the available `bars` chart is
		* a FIXED 69px block (charts/bars.tsx: 56 + 4 + 9) and `barsV` is 77px, so
		* neither shares a 126px box with a head and three rows of data. A wide variant
		* would have been the same card with more chrome — so there is one size, one
		* shape, and the vertical rhythm below is tuned to it.
		*
		* HEIGHT AUDIT (why the rows stop at three): title 16 + headAfter 4+25 + caption
		* 2+12 + 3 rows (3·16 − 4 = 44) + the breakdown's 6px padding-top and 1px
		* hairline = 120 of the 126px content box. The head's RING (a 52px donut) raises
		* the head BLOCK to ~80px, so a fourth row would sit past the floor; MAX_ROWS = 3
		* (今日 + two pools) and the ranking below decides WHICH pools get those rows.
		*
		* NOTHING IS FABRICATED: a platform that is not configured at all is not drawn
		* (its row would be a permanent `—`), while a pool payload that answered with a
		* key whose slice did not keeps that key's row and prints `—` muted. Only when
		* nothing at all is configured does the card return null. Each row group can be
		* switched off in the component config — the explicit way to retire a plan (e.g.
		* an OpenCode subscription no longer renewed) without losing the card.
		*
		* ── TONE ─────────────────────────────────────────────────────────────────────
		* The widget owns the direction (the renderer never guesses): quota occupancy —
		* HIGH IS BAD. <75% success, ≥75% warn, ≥95% danger, no reading muted, for both
		* the rows and the ring. The 今日 row is deliberately `muted` always: tokens
		* spent are information, not danger.
		*
		* All reads are the sync projections the collector already folds; the math
		* (normalisation, the per-pool reduction, the countdown) lives here, pure.
		* `Date.now()` is read for the countdown and the local day key (display only).
		*/
		/** 70% of a Command Code plan's monthly allowance in USD credits. The API
		*  publishes no monthly window and no allowance field, so the month figure is
		*  derived from the remaining balance against the one plan whose figures are
		*  published (GOAT: $10 buys $70 of credits) — the same rule the cc family's own
		*  monthly window uses, restated here rather than reached for through that
		*  family's view helper (which carries the pool switcher, the plan table and its
		*  own dictionary keys — none of which this board's reduction needs). */
		const PLAN_MONTHLY_ALLOWANCE = { "individual-goat": 70 };
		/** Body ROWS the board carries, 今日 included (see the height audit above). */
		const MAX_ROWS = 3;
		/** Pool ordinal suffix: 1 → ' Ⅰ', 2 → ' Ⅱ', 3 → ' Ⅲ', … Roman numerals, because
		*  they read like part of an English name and cost one glyph of width (the
		*  owner's call — `第 2 号` was rejected as ugly). The leading space is part of
		*  the suffix so the label reads `Command Code Ⅱ` and never `Command CodeⅡ`.
		*  Only the symbols a real pool count can reach are listed; a surprise count past
		*  Ⅻ falls back to the ASCII numeral rather than rendering a wrong glyph.
		*
		*  INDEX 1 IS 'Ⅰ', not 'Ⅱ': the call sites are `poolSuffix(i + 1)` over a 0-based
		*  key list, so the FIRST pool asks for index 1 — and a platform only reaches here
		*  when it has several pools (`multi`), where every pool needs a mark to be
		*  distinguishable. (The table shipped one symbol high for a few hours because this
		*  comment claimed `1 → ''` while the array said `1 → 'Ⅱ'`: a mutation test proved
		*  the array was READ, which is not the same as proving it was ALIGNED.) */
		const ROMAN = [
			"",
			"Ⅰ",
			"Ⅱ",
			"Ⅲ",
			"Ⅳ",
			"Ⅴ",
			"Ⅵ",
			"Ⅶ",
			"Ⅷ",
			"Ⅸ",
			"Ⅹ",
			"Ⅺ",
			"Ⅻ"
		];
		function poolSuffix(n) {
			return n >= 1 && n < ROMAN.length ? ` ${ROMAN[n]}` : ` ${n}`;
		}
		/** Occupancy tone: the higher the percentage the worse the state. */
		function toneOf(pct) {
			return pct >= 95 ? "danger" : pct >= 75 ? "warn" : "success";
		}
		/** One used/cap window's occupied percent, clamped, or null when unusable. */
		function pctOf(used, cap) {
			if (typeof used !== "number" || typeof cap !== "number") return null;
			if (!Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return null;
			return Math.min(100, Math.max(0, used / cap * 100));
		}
		/** A percent already expressed 0..100, clamped, or null when unusable. */
		function pct100(v) {
			return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null;
		}
		/** A reset stamp as epoch ms (OpenCode answers ISO, Command Code epoch ms). */
		function resetMsOf(at) {
			if (typeof at === "number") return Number.isFinite(at) && at > 0 ? at : null;
			if (typeof at !== "string" || at === "") return null;
			const ms = Date.parse(at);
			return Number.isFinite(ms) ? ms : null;
		}
		/** The tightest window of a row — the one that would block it first. Ties keep
		*  the FIRST candidate, so each builder's order below is the tie-break. */
		function tightest(wins) {
			let best = null;
			for (const w of wins) if (best === null || w.pct > best.pct) best = w;
			return best;
		}
		/** OpenCode Go's three windows, in tie-break order (rolling → weekly → monthly). */
		function openCodeWins(u) {
			if (u === null || u === void 0 || typeof u !== "object") return [];
			const at = (k) => u[k];
			const wins = [];
			for (const [k, mark] of [
				["rolling", "Δ"],
				["weekly", "W"],
				["monthly", "M"]
			]) {
				const item = at(k);
				const p = pct100(item?.percent);
				if (p !== null) wins.push({
					pct: p,
					resetMs: resetMsOf(item?.resetsAt),
					mark
				});
			}
			return wins;
		}
		/**
		* Command Code's windows for ONE account, in tie-break order: 5h, weekly, then
		* the derived month.
		*
		* The month needs BOTH a remaining balance AND a subscription slice (a missing
		* `/billing/subscriptions` answer is a failed fetch, not an exotic plan — the
		* two are different calibers), then reads `allowance − remaining` against the
		* published allowance; only a plan the table does not carry falls back to the
		* balance-conservation form. Returns [] for an account the host never filled.
		*/
		function commandCodeWins(a) {
			if (a === null || a === void 0) return [];
			const wins = [];
			const five = a.credits?.windowLimits?.fiveHour;
			const pct5 = pctOf(five?.used, five?.cap);
			if (pct5 !== null) wins.push({
				pct: pct5,
				resetMs: resetMsOf(five?.resetAt),
				mark: "5h"
			});
			const week = a.credits?.windowLimits?.weekly;
			const pctW = pctOf(week?.used, week?.cap);
			if (pctW !== null) wins.push({
				pct: pctW,
				resetMs: resetMsOf(week?.resetAt),
				mark: "W"
			});
			const remaining = a.credits?.credits?.monthlyCredits;
			const sub = a.subscription;
			if (typeof remaining === "number" && Number.isFinite(remaining) && sub !== null && sub !== void 0 && sub.data !== null && sub.data !== void 0) {
				const resetMs = resetMsOf(sub.data.currentPeriodEnd);
				const allowance = typeof sub.data.planId === "string" ? PLAN_MONTHLY_ALLOWANCE[sub.data.planId] : void 0;
				if (typeof allowance === "number" && allowance > 0) {
					const used = Math.min(allowance, Math.max(0, allowance - remaining));
					wins.push({
						pct: used / allowance * 100,
						resetMs,
						mark: "M"
					});
				} else {
					const used = a.usage?.totalMonthlyCredits;
					if (typeof used === "number" && Number.isFinite(used)) {
						const cap = used + remaining;
						if (cap > 0) wins.push({
							pct: Math.min(100, Math.max(0, used / cap * 100)),
							resetMs,
							mark: "M"
						});
					}
				}
			}
			return wins;
		}
		/** Today's tokens. The Command Code-SCOPED log is preferred and the machine-wide
		*  one is only the fallback: the scoped map is what the plan itself served,
		*  while `heatmapRaw` also counts every other provider the harness used. */
		function todayTokens(stats, todayKey) {
			const day = (log) => {
				if (log === null || log === void 0) return null;
				const v = log[todayKey];
				return typeof v === "number" && Number.isFinite(v) ? v : null;
			};
			return day(stats.commandCodeDaily) ?? day(stats.heatmapRaw);
		}
		/** A per-instance toggle, defaulting ON: the config record rides on `stats`
		*  (the shell merges `cardConfigs[instance]` last), so a card that has never been
		*  configured and a card whose switch is on are the same read. */
		function on(stats, key) {
			return stats[key] !== false;
		}
		/**
		* How long until a reset: `2h14m` / `45m` / `3d` / `now`.
		*
		* Deliberately NOT the shared `fmtAgo` (which answers "how long AGO"): a
		* countdown read through it says the opposite. A reset already in the past prints
		* `now` — the provider simply has not republished the rolled window yet.
		*/
		function untilText(ms, now) {
			const left = ms - now;
			if (left <= 0) return "now";
			const mins = Math.floor(left / 6e4);
			if (mins < 1) return "<1m";
			if (mins < 60) return `${mins}m`;
			const hours = Math.floor(mins / 60);
			if (hours < 24) return `${hours}h${mins % 60}m`;
			return `${Math.floor(hours / 24)}d`;
		}
		/**
		* The board's rows: one per plan — a platform with a key pool contributes its
		* MEMBERS individually (two keys = two rows), which is the "即便同一个套餐也可能
		* 有多个号池" reading, and also what keeps the card honest when one pool is
		* exhausted and its sibling is fresh. The second pool of a platform is named with
		* a Roman numeral (`Command Code Ⅱ`).
		*
		* A platform appears only when it is CONFIGURED (config switch on AND a payload
		* slice exists); a pool that answered with a key whose slice did not keeps that
		* key's row as a dash.
		*/
		function buildPoolRows(stats) {
			const rows = [];
			if (on(stats, "showOpenCode")) {
				const data = stats.usageData;
				const keys = stats.usageMulti?.keys;
				const group = t("card.usage-mix.opencode");
				if (Array.isArray(keys) && keys.length > 0) {
					const multi = keys.length > 1;
					keys.forEach((k, i) => rows.push({
						label: multi ? `${group}${poolSuffix(i + 1)}` : group,
						wins: openCodeWins(k.data?.usage),
						group,
						ordinal: i + 1
					}));
				} else if (data !== null && data !== void 0) rows.push({
					label: group,
					wins: openCodeWins(data.usage),
					group,
					ordinal: 1
				});
			}
			if (on(stats, "showCommandCode")) {
				const cc = stats.commandCode;
				if (cc !== null && cc !== void 0) {
					const group = t("card.usage-mix.commandcode");
					const keys = cc.keys;
					if (Array.isArray(keys) && keys.length > 0) {
						const multi = keys.length > 1;
						keys.forEach((k, i) => rows.push({
							label: multi ? `${group}${poolSuffix(i + 1)}` : group,
							wins: commandCodeWins(k.data),
							group,
							ordinal: i + 1
						}));
					} else rows.push({
						label: group,
						wins: commandCodeWins(cc),
						group,
						ordinal: 1
					});
				}
			}
			return rows;
		}
		/**
		* The rows in BOARD order: the platform with the tightest plan leads, its pools
		* ranked inside it, then the platforms are dealt round-robin.
		*
		* Three rules, each earning its place on a 126px tile:
		*   1. tightest first — a fresh plan must never push an exhausted one off the
		*      tile, which is the one failure this card exists to prevent;
		*   2. ranked INSIDE a platform — a platform's most-loaded key represents it;
		*   3. one row per platform per round — a platform with five key pools would
		*      otherwise fill every slot and the OTHER platform would vanish, which is
		*      exactly the cross-platform reading the card is for. The cap then trims
		*      from the tail, so a platform that never answered (its rows rank last,
		*      `peak` -1) is dropped before any number is.
		*
		* Ties keep their ordinal (rule 2's sort is by peak, then by pool ordinal), so a
		* platform whose pools sit at the same occupancy still names its FIRST one with
		* the plain platform name and only the later ones with Ⅱ/Ⅲ — the numbering never
		* depends on which pool happens to be loaded more.
		*/
		function byPeak(rows) {
			const groups = /* @__PURE__ */ new Map();
			for (const r of rows) {
				const g = groups.get(r.group);
				if (g === void 0) groups.set(r.group, [r]);
				else g.push(r);
			}
			const peakOf = (r) => tightest(r.wins)?.pct ?? -1;
			const queues = [...groups.values()].map((g) => [...g].sort((a, b) => peakOf(b) - peakOf(a) || a.ordinal - b.ordinal)).sort((a, b) => peakOf(b[0]) - peakOf(a[0]));
			const out = [];
			for (let round = 0; out.length < rows.length; round++) for (const q of queues) if (round < q.length) out.push(q[round]);
			return out;
		}
		function usageMixRender(stats) {
			const now = Date.now();
			const rows = byPeak(buildPoolRows(stats));
			const today = todayTokens(stats, dayKey(new Date(now)));
			const showToday = on(stats, "showDaily");
			if (rows.length === 0 && (!showToday || today === null)) return null;
			const peak = rows.map((r) => tightest(r.wins)).filter((w) => w !== null).reduce((best, w) => best === null || w.pct > best.pct ? w : best, null);
			const caption = resetCaption(peak, now);
			const breakdown = [];
			if (showToday) breakdown.push({
				label: t("card.usage-mix.today"),
				value: today === null ? "—" : fmtTokens(today),
				tone: "muted"
			});
			const rowCap = Math.max(0, MAX_ROWS - breakdown.length);
			for (const r of rows.slice(0, rowCap)) {
				const w = tightest(r.wins);
				breakdown.push(w === null ? {
					label: r.label,
					value: "—",
					tone: "muted"
				} : {
					label: r.label,
					value: `${w.pct.toFixed(1)}%`,
					tone: toneOf(w.pct)
				});
			}
			const headAfter = {
				big: showToday && today !== null ? fmtTokens(today) : peak === null ? "—" : `${peak.pct.toFixed(1)}%`,
				...caption === null ? {} : { small: caption }
			};
			return {
				title: t("widget.usage-mix.name"),
				headAfter,
				...peak === null ? {} : { headRing: {
					ratio: peak.pct / 100,
					tone: toneOf(peak.pct),
					icon: "database",
					label: `${peak.pct.toFixed(1)}%`
				} },
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown
				}
			};
		}
		/**
		* The grey caption under the headline: WHICH window is the board's tightest one
		* and when it refills — drawn only when the answer is actionable (a reset inside
		* a day, which in practice means the rolling / 5h cadence). A monthly window that
		* returns in three weeks is a fact about the plan, not a "wait this out"
		* instruction, and it would spend the tile's one grey line saying nothing.
		*
		* The window it names is the PEAK window (the one the ring draws), so the ring
		* and the caption always describe the same reading. The row's own other windows
		* keep their dedicated cards (usage-rolling/weekly/monthly, cc-window-*).
		*
		* Two guards, and the second is the subtle one: a DERIVED month (Command Code
		* publishes no monthly window — the figure comes from the remaining balance)
		* carries no reset stamp at all, i.e. `undefined` rather than `null`, and the
		* truthiness test is what keeps a countdown from being formatted out of nothing.
		*/
		function resetCaption(peak, now) {
			const ms = peak?.resetMs;
			if (typeof ms !== "number") return null;
			if (ms - now > 864e5) return null;
			return t("card.usage-mix.legend", {
				win: t(`card.usage-mix.mark.${peak.mark}`),
				at: untilText(ms, now)
			});
		}
		/**
		* Preview: a live-shaped pair of plans, BOTH with key pools, so the market
		* preview shows the whole board — two OpenCode pools, two Command Code pools
		* (`Command Code` and `Command Code Ⅱ`), the muted 今日 row, the ring and the
		* countdown. The ranking is exercised by the example itself: the row cap hides
		* the least loaded pool, and the round-robin keeps both platforms on the tile.
		* Every value is deterministic; only the countdown moves with the clock.
		*/
		function previewStats$2() {
			const now = /* @__PURE__ */ new Date();
			const day = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
			const iso = (offsetMs) => new Date(now.getTime() + offsetMs).toISOString();
			const DAY = 864e5;
			const daily = {};
			let today = 0;
			for (let i = 0; i < 14; i++) {
				const v = i === 13 ? 92e6 : 4e7 + i * 173 % 37 * 15e5;
				daily[dayKey(day(i - 13))] = v;
				if (i === 13) today = v;
			}
			/** One OpenCode Go key's three windows (typed with the contract's own shape). */
			const ocData = (rolling, weekly, monthly, rollMs) => ({ usage: {
				rolling: {
					status: "ok",
					percent: rolling,
					resetsAt: iso(rollMs)
				},
				weekly: {
					status: "ok",
					percent: weekly,
					resetsAt: iso(4 * DAY)
				},
				monthly: {
					status: "ok",
					percent: monthly,
					resetsAt: iso(21 * DAY)
				}
			} });
			/** One Command Code pool member: 5h / weekly used plus its own remaining
			*  balance (so its own month ~43%), with a label/tail pair like the host's. */
			const ccKey = (used5, usedWeek, remaining, label) => ({
				ref: `preview-${label}`,
				label,
				tail: label.slice(-4),
				data: {
					whoami: null,
					usage: {
						totalCost: 70 - remaining,
						totalTokens: today,
						totalMonthlyCredits: 70 - remaining
					},
					credits: {
						credits: {
							monthlyCredits: remaining,
							creditThreshold: 0,
							freeCredits: 0,
							purchasedCredits: 0,
							belowThreshold: false
						},
						windowLimits: {
							limited: true,
							exceeded: null,
							fiveHour: {
								used: used5,
								cap: 14,
								exceeded: false,
								resetAt: now.getTime() + 108e5
							},
							weekly: {
								used: usedWeek,
								cap: 35,
								exceeded: false,
								resetAt: now.getTime() + 2 * DAY
							}
						}
					},
					subscription: {
						success: true,
						data: {
							id: `sub-${label}`,
							status: "active",
							planId: "individual-goat",
							currentPeriodStart: iso(-9 * DAY),
							currentPeriodEnd: iso(21 * DAY)
						}
					}
				}
			});
			const first = ocData(38, 20, 8, 804e4);
			return {
				usageMulti: {
					total: null,
					keys: [{
						ref: "preview-oc-1",
						label: "Physicolor",
						data: first
					}, {
						ref: "preview-oc-2",
						label: "Sparxie",
						data: ocData(12, 35, 6.1, 144e5)
					}]
				},
				usageData: first,
				commandCode: {
					whoami: null,
					usage: null,
					credits: null,
					subscription: null,
					keys: [ccKey(12.8, 8.4, 40, "Physicolor"), ccKey(3.4, 18.2, 30.4, "Sparxie")]
				},
				commandCodeDaily: daily
			};
		}
		var usage_mix_default = defineWidget({
			id: "usage-mix",
			name: () => t("widget.usage-mix.name"),
			desc: () => t("widget.usage-mix.desc"),
			builtin: true,
			group: "coding-plan",
			sizes: ["2x2"],
			render: usageMixRender,
			configSchema: [
				{
					key: "showDaily",
					label: () => t("card.usage-mix.cfg.daily"),
					type: "toggle",
					default: true
				},
				{
					key: "showOpenCode",
					label: () => t("card.usage-mix.cfg.opencode"),
					type: "toggle",
					default: true
				},
				{
					key: "showCommandCode",
					label: () => t("card.usage-mix.cfg.commandcode"),
					type: "toggle",
					default: true
				}
			],
			example: { stats: previewStats$2 }
		});
		//#endregion
		//#region src/widgets/trajectory-stats/index.ts
		/**
		* 轨迹占比 — the STATISTICS view of 对话轨迹 (2026-09-28, redesign v2).
		*
		* 对话轨迹 draws the last 30 beats as three coloured lanes, which answers "what
		* happened, in what order" but never "how much of this window did each lane
		* actually own". This card answers that: a three-segment share bar whose rows
		* carry each lane's TIME and SHARE, with the selected lane's share as the figure.
		*
		* ── COLOUR RULE (owner's call, 2026-09-28: 「就按官方的输入蓝色/模型紫色/工具橙色」) ──
		* The three lanes take the same semantic tokens the official 轨迹 timeline uses
		* (`render/charts/lanes.tsx` → `LANE_TONES`), mapped onto the chart tone
		* vocabulary:
		*   输入 → `primary` = `--dsw-alias-state-business-primary`   (blue — the official input lane, verbatim)
		*   模型 → `accent`  = `CHART_TONES.accent`, the official color-mix the lane has always painted
		*   工具 → `warn`    = `--dsw-alias-state-warn-primary`       (orange — the official tool lane IS the warn colour)
		* The 模型 lane used to fall back to `muted`: the official strip paints it
		* `color-mix(in srgb, business-primary 60%, error-secondary)` — a blue↔red blend
		* that reads purple — and that expression is not a theme token, so the five-tone
		* vocabulary could not express it. The captain has since added the `accent` tone
		* (mapping to that exact mix, and switching `lanes.tsx` over to the same
		* constant), so this card now uses the real lane colour and the two cards cannot
		* drift apart. The raw-color alternative was rejected on purpose: the palette is
		* semantic aliases only, which is what keeps every card following light/dark and
		* future token changes.
		*
		* ── LAYOUT (why `segments`, not `breakdown`) ──
		* The rows here are the `segments` chart's OWN legend rows (the 上下文水位 /
		* Token 用量 geometry). That is exactly the shape the owner asked for:
		*  - a row is `[label] ←→ [value]`: label flush left, value hard right, so the
		*    second number of every row forms ONE column down the card, separated by
		*    that row's own `gap` (the owner's complaint: `12 · 24.2s  29%` mashed three
		*    numbers into one cell with two different joiner styles);
		*  - the label span truncates NOTHING (the second complaint: 输入 / 模型 / 工具
		*    are two glyphs each — there is room), and there is no opacity animation on
		*    the labels: brightness at the row level is the theme's own text colour;
		*  - `bodyAnchor: 'bottom'` rests the whole block on the tile's floor.
		* The right cell is the SHARE (`segmentsValue: 'percent'`) and the left label
		* carries the TIME — the split matters because the segments renderer's default
		* right column is the TOKEN formatter, and this card's numbers are milliseconds:
		* feeding ms through it printed `~24.2K` for 24.2 seconds, which reads as a token
		* count. One number per column, no joiner at all.
		* `breakdown` was rejected: its `value` + `cost` cells are the grid's own
		* right-aligned numeric tracks, which is the same idea with a second colour
		* semantics bolted on, and its `cost` column is reserved for money.
		*
		* ── THE FIGURE + THE CYCLE (owner's request) ──
		* `headAfter.big` shows ONE lane's share and tapping the card flips it
		* 模型 ↔ 工具 (`cycle`, persisted to this instance's `bigLane` field, exactly like
		* the sys cards' `bigMetric`). 输入 is not in the cycle: it is instantaneous, so
		* it HAS no share to show. The same flip is reachable in the market / 组件配置
		* previews because `simToggle` is declared — see `example.simSteps`.
		*/
		/** Lane draw order — THE SAME order as 对话轨迹's lanes and its legend counts. */
		const LANE_ORDER$1 = [
			"input",
			"model",
			"tool"
		];
		/** The two lanes a figure can be about (输入 has no duration — see the header). */
		const BIG_LANES = ["model", "tool"];
		/**
		* Segment / row tone per lane (see the COLOUR RULE block above): each lane takes
		* the official 轨迹 lane's own colour — `primary` for 输入, `accent` for 模型 (the
		* official blue↔red mix — the captain added this tone for exactly this lane) and
		* `warn` for 工具.
		*/
		const LANE_TONE = {
			input: "primary",
			model: "accent",
			tool: "warn"
		};
		/**
		* Lane name, resolved through a LITERAL t() call per lane.
		*
		* The key is written out at each lane instead of interpolated
		* (`t('card.trajectory-stats.' + kind)`) on purpose: the unit validator's locale
		* gate (scripts/validate-widget-unit.mjs) scans for literal t() keys and would
		* otherwise see these three as "non-local" references and skip checking that
		* BOTH dictionaries cover them.
		*/
		function laneName(kind) {
			return kind === "input" ? t("card.trajectory-stats.input") : kind === "model" ? t("card.trajectory-stats.model") : t("card.trajectory-stats.tool");
		}
		/** The lane the figure is about, read off this instance's own config. An
		*  unknown/missing value falls back to 模型 — the first mode of the cycle, so the
		*  card opens the same way every time and one tap always reaches 工具. */
		function bigLaneOf(stats) {
			return stats.bigLane === "tool" ? "tool" : "model";
		}
		/**
		* Compact duration for a row's right cell: under a second prints whole ms
		* (`840ms`), otherwise one decimal of seconds (`18.0s`), minutes past 60
		* (`2m42s`). Kept SHORT on purpose: this string shares the row with the share
		* number, so a long form would squeeze the label.
		*/
		function fmtRowMs(ms) {
			if (!(ms > 0)) return "0ms";
			if (ms < 1e3) return `${Math.round(ms)}ms`;
			if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
			const whole = Math.round(ms / 1e3);
			return `${Math.floor(whole / 60)}m${whole % 60}s`;
		}
		/** Fold the window's beats into the three lanes (count + Σ ms). */
		function foldLanes(beats) {
			const out = {
				input: {
					kind: "input",
					count: 0,
					ms: 0
				},
				model: {
					kind: "model",
					count: 0,
					ms: 0
				},
				tool: {
					kind: "tool",
					count: 0,
					ms: 0
				}
			};
			for (const b of beats) {
				const lane = out[b.kind];
				if (lane === void 0) continue;
				lane.count += 1;
				if (b.ms > 0) lane.ms += b.ms;
			}
			return out;
		}
		function trajectoryStatsRender(stats) {
			const beats = stats.trajectory ?? [];
			if (beats.length === 0) return null;
			const lanes = foldLanes(beats);
			const totalMs = lanes.model.ms + lanes.tool.ms;
			const pickedLane = bigLaneOf(stats);
			const shownLane = totalMs > 0 ? pickedLane : "model";
			const sharePct = (lane) => totalMs > 0 ? Math.round(lane.ms / totalMs * 100) : 0;
			const segments = [];
			for (const k of LANE_ORDER$1) {
				const lane = lanes[k];
				segments.push({
					label: `${laneName(k)} ${fmtRowMs(lane.ms)}`,
					tokens: Math.max(lane.ms, 0),
					tone: LANE_TONE[k]
				});
			}
			const total = totalMs;
			const big = totalMs > 0 ? `${sharePct(lanes[shownLane])}%` : String(beats.length);
			return {
				title: t("widget.trajectory-stats.name"),
				headAfter: { big },
				legend: `${laneName(shownLane)} · ${t("card.trajectory-stats.legend")}`,
				bodyAnchor: "bottom",
				chart: {
					kind: "segments",
					segmentsPalette: "tones",
					segmentsValue: "percent",
					totalTokens: total,
					segments
				},
				cycle: {
					modes: [...BIG_LANES],
					current: pickedLane,
					hint: t("card.trajectory-stats.cycleHint"),
					store: "bigLane"
				}
			};
		}
		var trajectory_stats_default = defineWidget({
			id: "trajectory-stats",
			name: () => t("widget.trajectory-stats.name"),
			desc: () => t("widget.trajectory-stats.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2"],
			render: trajectoryStatsRender,
			simToggle: () => t("widget.trajectory-stats.simToggle"),
			example: {
				sim: { bigLane: "model" },
				simSteps: [{ bigLane: "model" }, { bigLane: "tool" }],
				stats: { trajectory: Array.from({ length: 30 }, (_, i) => {
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
				}) }
			}
		});
		//#endregion
		//#region src/widgets/model-config/index.ts
		/**
		* 会话配置 — which model route this agent runs, what it costs to run it
		* (reasoning effort), and whether a route change is queued for the next request.
		*
		* WHY THE CARD EXISTS: the model and the effort are the first two variables that
		* explain a session's cost, latency and quality, and neither is visible on the
		* rail. With several agent presets and several providers composed, "which route am
		* I on right now" is otherwise only answerable by reading the composer.
		*
		* WHICH ROUTE THE HEAD DESCRIBES: `next` — the route the next request will run.
		* That is the projection's authoritative field (「下一个请求真的会用它」) and it is
		* what the composer's own model selector shows, so it is the session's
		* CONFIGURATION; `lastUsed` is history. `next ?? lastUsed` covers a session that has
		* not recorded a request yet.
		*
		* WHY THE FIGURE IS THE EFFORT, NOT THE MODEL: a model id is a long string that
		* turns into `deepseek-v4.1-fla…` the moment it becomes the 20px figure, and the
		* head's caption is the one slot that prints it in full (`legend`: 10px, the whole
		* 126px content width of a 2×2). The effort is a short word (`off`/`low`/`medium`/
		* `high`/`xhigh`/`max`) and it is the knob that moves cost and speed, so it takes the
		* 20px slot.
		*
		* THE CHANGE ROW CARRIES A FLAG, NOT THE MODEL ID — a MEASURED deviation from the
		* spec's card face (README §3 and the delivery report explain it): `breakdown` lays
		* its rows out as ONE grid (`1fr auto`), so the value column is as wide as the
		* WIDEST value in the block and every label gets what is left. Measured on the real
		* tile (content 126px, values at weight 600): `commandcode` is 74.5px and
		* `deepseek-v4-flash` is 91.8px, which leaves the label column 41.5px / 24.2px — and
		* the renderer fades each label's last 14px, so a 40px label in a 24.2px cell renders
		* as two dark glyphs and a ghost. Shipping the spec's third row verbatim printed
		* 「提供」 for 提供方 and cut English labels mid-word (`Provi`, `Prese`, `Next r`).
		* The model id therefore moves up into the legend (full length, legible) and the row
		* carries the CHANGE, which is why the row is the `primary` one: the highlighted cell
		* is the fact the user must notice. The shared-layer fix that would restore the
		* literal layout is in the report (a value that may ellipsize is enough).
		*
		* `reasoningEffort` ABSENT is not the same statement as "the effort is the default":
		* the contract says a route publishing no efforts omits the field, and nobody here
		* knows what the provider's default is. So an absent effort prints `—`, never a
		* guessed `default`. For the same reason the card reads no clock, no DOM and no
		* network: `render` is a pure fold of the two projections.
		*
		* TONE DIRECTION: a high effort is NOT bad — it buys quality with money and time —
		* so the figure is never painted danger. The only colour on the card is the
		* informational `primary` on the change row. `null` (no session controller composed)
		* hides the card entirely; that is a fact about the deployment, not a state of the
		* route.
		*/
		/** The em dash a missing reading prints — the same placeholder 工具调用 uses, never
		*  a fabricated `default`. */
		const DASH$9 = "—";
		/**
		* Preview states, in click order. The card's SHAPE depends on the projection
		* (`next` vs `lastUsed` and whether the route publishes an effort), and no live
		* session exists in the market previews — so the preview walks the three shapes
		* instead of only ever showing the one its `example.stats` happens to hold.
		*
		* `sim` MUST be the first entry (the shell locates the current step by deep
		* comparison, so a `sim` absent from this list makes the first click a silent
		* no-op).
		*/
		const SIM_STEPS = [
			{ state: "switched" },
			{ state: "steady" },
			{ state: "noEffort" }
		];
		/** A non-empty string, or null — the projection may hand over `''` for a field it
		*  could not fill, and printing an empty cell reads as a rendering bug. */
		function orNull(value) {
			return value !== void 0 && value !== null && value !== "" ? value : null;
		}
		/** The route's effort, or `—` when the route publishes none (see the header). */
		function effortOf(route) {
			const effort = route.reasoningEffort;
			return effort === void 0 || effort === "" ? DASH$9 : effort;
		}
		/** The projection the render folds, after the preview's own state switch. The real
		*  collector already answers `null` when BOTH routes are missing, so this only ever
		*  narrows a projection that has something to say. */
		function projected(sel, state) {
			if (state === "steady" && sel.lastUsed) return {
				next: sel.lastUsed,
				lastUsed: sel.lastUsed
			};
			if (state === "noEffort" && sel.next) return {
				next: {
					provider: sel.next.provider,
					model: sel.next.model
				},
				lastUsed: sel.lastUsed
			};
			return sel;
		}
		var model_config_default = defineWidget({
			id: "model-config",
			name: () => t("widget.model-config.name"),
			desc: () => t("widget.model-config.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2"],
			simToggle: () => t("card.model-config.simToggle"),
			render: (s, meta) => {
				const sel = s.modelSelection;
				if (!sel) return null;
				const eff = projected(sel, typeof meta?.sim?.state === "string" ? meta.sim.state : null);
				const route = eff.next ?? eff.lastUsed;
				if (!route) return null;
				const switched = eff.next !== null && eff.lastUsed !== null && eff.next !== void 0 && eff.lastUsed !== void 0 && eff.next.model !== eff.lastUsed.model;
				const provider = orNull(route.provider);
				const preset = orNull(s.agentPreset);
				return {
					title: t("card.model-config.title"),
					headAfter: { big: effortOf(route) },
					legend: route.model,
					bodyAnchor: "bottom",
					chart: {
						kind: "breakdown",
						breakdown: [
							provider === null ? {
								label: t("card.model-config.provider"),
								value: DASH$9,
								tone: "muted"
							} : {
								label: t("card.model-config.provider"),
								value: provider
							},
							preset === null ? {
								label: t("card.model-config.preset"),
								value: DASH$9,
								tone: "muted"
							} : {
								label: t("card.model-config.preset"),
								value: preset
							},
							...switched ? [{
								label: t("card.model-config.next"),
								value: t("card.model-config.switched"),
								tone: "primary"
							}] : []
						]
					}
				};
			},
			example: {
				sim: SIM_STEPS[0],
				simSteps: [...SIM_STEPS],
				stats: {
					modelSelection: {
						next: {
							provider: "commandcode",
							model: "deepseek-v4-flash",
							reasoningEffort: "medium"
						},
						lastUsed: {
							provider: "commandcode",
							model: "deepseek-v4.1-flash",
							reasoningEffort: "high"
						}
					},
					agentPreset: "standard"
				}
			}
		});
		//#endregion
		//#region src/widgets/peak-pricing-board/schedule.ts
		/**
		* peak-pricing-board — today's billing schedule, as DATA.
		*
		* The 2×2 峰谷定价 card answers one question ("is it peak RIGHT NOW?"); this module
		* answers the wide card's question ("how does the REST OF TODAY bill?") as a pure
		* function of (clock, config) — no React, no DOM, no i18n. Every label the card
		* prints is built in index.ts; here we only produce minutes and i18n KEYS, so the
		* schedule can be read (and probed) without a locale.
		*
		* THE RULE IS NOT OURS, AND NO LONGER NEXT DOOR. The peak/off-peak verdict, the
		* timezone clock, the window parser, the config reader and the holiday lookup are
		* read from the SHARED layer — `src/client/lib/peak-schedule.ts` +
		* `src/client/lib/peak-holidays.ts` — because the 2×2 峰谷定价 card must answer
		* exactly the same question the same way: if the two ever disagreed, the rail
		* would be lying on one of them. They used to be imported FROM the 2×2 unit (a
		* real unit-to-unit coupling: deleting that directory broke this card, and the
		* +8 offset was mirrored here because `clockAt` kept it inline); both moved into
		* the shared layer on 2026-09-28, and `ZONE_OFFSET_MINS` is now read from there
		* instead of being copied.
		*/
		/** Minutes in one day — the schedule's own horizon. */
		const DAY = 1440;
		/** The shipped timetable, as the shared config string. Used by the unit's
		*  example/probe so neither has to re-type it. */
		const DEFAULT_BILLING_WINDOWS = DEFAULT_PEAK_WINDOWS;
		/** Minutes → `42m` / `1h 05m` — the countdown in the head. */
		function fmtRemaining(mins) {
			const m = Math.max(0, Math.round(mins));
			if (m < 60) return `${m}m`;
			return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
		}
		/**
		* Read an instance's merged config record into a schedule config.
		*
		* Reuses the 2×2 card's reader verbatim (`peakConfigOf`), so every key —
		* `peakWindows`, `weekendOff`, `holidayOff`, `timeZone`, `extraHolidays` — means
		* exactly what it means over there. `billingWindows` is this card's own OPTIONAL
		* override: when set (non-empty) it replaces `peakWindows`, so the wide card can
		* carry its own timetable without editing the narrow card.
		*/
		function resolveScheduleConfig(config) {
			const src = config ?? {};
			const override = typeof src.billingWindows === "string" && src.billingWindows.trim() !== "" ? parsePeakWindows(src.billingWindows) : null;
			const base = peakConfigOf(src);
			return override === null ? base : {
				...base,
				windows: override
			};
		}
		/** Fold the configured windows into the day's blocks. Overlaps cannot bill twice:
		*  a later window only contributes the part starting after the previous block
		*  ended (a hand-typed `09:00-12:00, 10:00-11:00` is tolerated, not trusted). */
		function blocksOf(windows) {
			const peaks = [];
			for (const { w, i } of windows.map((w, i) => ({
				w,
				i
			})).sort((a, b) => a.w.start - b.w.start || a.w.end - b.w.end)) {
				const start = peaks.length === 0 ? w.start : Math.max(w.start, peaks[peaks.length - 1].end);
				if (start >= w.end) continue;
				peaks.push({
					start,
					end: w.end,
					peak: true,
					windowIndex: i
				});
			}
			const all = [];
			let cursor = 0;
			for (const b of peaks) {
				if (b.start > cursor) all.push({
					start: cursor,
					end: b.start,
					peak: false
				});
				all.push(b);
				cursor = b.end;
			}
			if (cursor < DAY) all.push({
				start: cursor,
				end: DAY,
				peak: false
			});
			if (all.length === 0) all.push({
				start: 0,
				end: DAY,
				peak: false
			});
			return all;
		}
		/** The block containing `mins`; the last one at exactly `DAY`. */
		function blockAt(blocks, mins) {
			for (const b of blocks) if (mins >= b.start && mins < b.end) return b;
			return blocks[blocks.length - 1];
		}
		/**
		* The table's rows: one per configured peak window, then ONE off-peak row for
		* everything outside them.
		*
		* Why not one row per block: the config is capped at two windows, and an ordinary
		* day's off-peak stretches (00:00–09:00, 12:00–14:00, 18:00–24:00) would need
		* three rows of their own to be exact — the whole foot of the card. Folding them
		* into a single 其余 row keeps the shape fixed at three rows, and the countdown
		* caption in the head is what keeps it precise: the row states the RULE, the
		* caption states WHEN it changes.
		*
		* At most one row is ever `now` — a minute falls in at most one block, so a peak
		* row and the off-peak row can never both light up. In the 12:00–14:00 gap NO peak
		* row is live and the off-peak row is, which is the whole reason the row exists.
		*
		* The row SHAPE never changes: a whole-day-off day keeps the same three rows (the
		* timetable IS the card) and the reason is printed on the remainder row, so the
		* preview and the rail show the same silhouette whatever the calendar says.
		*/
		function boardRows(windows, blocks, mins, dayOffKey) {
			const nowIndex = dayOffKey !== void 0 ? -1 : blockAt(blocks, mins).windowIndex ?? -1;
			const rows = windows.map((w, i) => ({
				range: `${fmtMins(w.start)}–${fmtMins(w.end)}`,
				peak: true,
				now: i === nowIndex
			}));
			const first = windows.length === 0 ? DAY : Math.min(...windows.map((w) => w.start));
			const last = windows.length === 0 ? 0 : Math.max(...windows.map((w) => w.end));
			rows.push({
				range: windows.length === 0 ? `${fmtMins(0)}–${fmtMins(DAY)}` : `${fmtMins(last)}–${fmtMins(first)}`,
				peak: false,
				now: dayOffKey !== void 0 || nowIndex === -1,
				dayOffKey
			});
			return rows;
		}
		/** The zone-local clock for `now` — the contrived-`Date` rule lives in the 2×2
		*  card's `clockAt`, so this is only here to name the intent. */
		function clockInZone(now, tz) {
			return clockAt(now, tz);
		}
		/**
		* The instant whose fields ARE `clock`'s fields.
		*
		* The shared verdict (`peakStatusNow`) takes a `Date` and immediately runs it back
		* through `clockAt`, so the ONLY correct input is an instant already carrying the
		* zone's own offset — i.e. exactly what `clockAt` would have produced for this
		* wall clock. Feeding it the raw wall-clock fields instead double-converts (+8
		* twice) and silently lands on the NEXT day, which is how a 10:30 Thursday peak
		* became 02:30 Friday (inside 中秋) during this unit's own tests.
		*
		* The zone is expressed the one way the shared module defines it: `'local'` is the
		* machine's own clock (`clockAt` adds nothing), `Asia/Shanghai` is a fixed +8 with
		* no DST. Rebuilding that offset here — rather than re-deriving the clock — is what
		* keeps this function a single, testable conversion in ONE direction.
		*/
		function instantOf(clock, tz) {
			const [y, m, d] = clock.dateKey.split("-").map(Number);
			if (tz === "local") return new Date(y, m - 1, d, Math.floor(clock.mins / 60), clock.mins % 60);
			const utcMins = clock.mins - 480;
			const shift = Math.floor(utcMins / DAY);
			return new Date(Date.UTC(y, m - 1, d + shift, Math.floor(utcMins / 60) - shift * 24, (utcMins % 60 + 60) % 60));
		}
		/**
		* The whole day, as data.
		*
		* `config` is required (not defaulted): every caller already holds one — the
		* shell's merged instance config, or this unit's own `example.stats` — and a
		* silent default here would hide a card that lost its config.
		*
		* `now` is the live-path seam: the card passes the real clock reading, and the
		* function asks the SHARED verdict about that exact instant rather than
		* reconstructing it (a reconstruction is only needed when the clock was pinned by
		* a preview, and `instantOf` does it there). Tests and probes therefore drive the
		* whole card through one honest parameter instead of stubbing the global `Date`.
		*/
		function trackDay(clock, config, now) {
			const status = peakStatusNow(now ?? instantOf(clock, config.tz), config);
			const year = yearOf(clock.dateKey) ?? clock.year;
			const wholeDayOff = !status.peak && status.reasonKey !== void 0;
			const blocks = blocksOf(config.windows);
			const current = blockAt(blocks, clock.mins);
			const nextBlock = blocks[blocks.indexOf(current) + 1];
			const nextAt = nextBlock === void 0 ? DAY : nextBlock.start;
			const nextConfident = !(config.holidayOff && config.extra.length === 0 && !holidayTableCovers(year)) && !(wholeDayOff && config.holidayOff && !holidayTableCovers(tomorrowYear(clock)));
			let offUntil;
			if (wholeDayOff) {
				const firstStart = config.windows.length === 0 ? 0 : Math.min(...config.windows.map((w) => w.start));
				let days = 1;
				let nextDow = (clock.dow + 1) % 7;
				if (config.weekendOff) while (nextDow === 0 || nextDow === 6) {
					days++;
					nextDow = (nextDow + 1) % 7;
				}
				offUntil = {
					days,
					dow: nextDow,
					label: fmtMins(firstStart),
					mins: days * DAY + firstStart - clock.mins
				};
			}
			return {
				dateKey: clock.dateKey,
				clock,
				status,
				wholeDayOff,
				reasonKey: wholeDayOff ? status.reasonKey : void 0,
				rows: boardRows(config.windows, blocks, clock.mins, wholeDayOff ? status.reasonKey : void 0),
				blocks,
				current,
				nextAt,
				nextInMins: nextAt - clock.mins,
				nextTomorrow: nextAt >= DAY,
				offUntil,
				nextConfident
			};
		}
		/** The year of the day AFTER `clock`'s day, in that same zone — what a "tomorrow
		*  is off too" promise depends on. Derived from the date key (the calendar the
		*  holiday table itself speaks) rather than from a `Date`, so it is zone-proof. */
		function tomorrowYear(clock) {
			const [y, m, d] = clock.dateKey.split("-").map(Number);
			return new Date(Date.UTC(y, m - 1, d + 1)).getUTCFullYear();
		}
		//#endregion
		//#region src/widgets/peak-pricing-board/index.ts
		/**
		* 峰谷时段表 — the 2×2 峰谷定价 card, widened.
		*
		* The 2×2 answers ONE question — 现在是峰还是谷 — and answers it well (a big
		* CHEAP/EXPENSIVE figure with a pulsing red escalation). What it cannot say is the
		* thing you actually plan around: how the REST of today bills, where the current
		* stretch ENDS, and how long is left of it. That is a timetable, and a timetable
		* needs width — so this card is the same rule at 2×4:
		*
		*   row 1  ▸ 峰谷时段表                     (blue title)
		*   row 2  ▸ CHEAP                          (20px figure — the live state, the
		*                                            same word the 2×2 card prints; while
		*                                            peak it is the error RED and BREATHES)
		*   row 3  ▸ 下一段 09:00 · 还有 8h 30m     (grey caption — the countdown)
		*   foot   ▸ ──────────────────────────
		*            09:00–12:00          高峰 (red)  a configured window
		*            14:00–18:00          高峰 (red)  the other one
		*            18:00–09:00          低谷 (blue) everything else, lit while live
		*
		* ONE VOCABULARY, TWO ROLES (aligned with the 2×2 card, 2026-09-28): the price STATE
		* is CHEAP / EXPENSIVE — the 20px figure, printed by both cards with the same two
		* literal words — while 高峰 / 低谷 are the PERIOD names, used by this card's
		* timetable rows and by the 2×2 card's own captions (`全天低谷`, `恢复高峰`). The
		* figure therefore matches the narrow card character-for-character; see the figure's
		* own comment for why the state words stay literal.
		*
		* THE ALARM IS THE 2×2 CARD'S (owner's request, 2026-09-28): EXPENSIVE and the 高峰
		* rows are the error red, and the figure breathes. Both come from fields the contract
		* already has (`valueTone` / `valuePulse` on the figure, `tone` on a row) — nothing
		* was added to the shared layer. A row's 高峰 word cannot breathe yet because the
		* `breakdown` renderer paints its values with inline styles and no class hook; that
		* needs one optional field in the shared layer (`pulse` on a breakdown row), and the
		* unit README records the exact patch. Until then the row red is static and the
		* breathe lives on the figure, which is where the 2×2 card puts it too.
		*
		* THE RULE IS IMPORTED, NOT RE-DECLARED. Peak windows, the zone clock, the
		* weekend/holiday switches and the 2026 holiday table all come from the 2×2 unit
		* (`../peak-pricing`): `parsePeakWindows` / `clockAt` / `peakConfigOf` /
		* `peakStatusNow` and its `holidays` module are read-only imports, so the two
		* cards can never disagree about what counts as peak. A consequence worth
		* stating: the timetable is capped at the TWO windows that parser allows — which
		* is exactly the row budget the card's own foot has.
		*
		* THE CLOCK IS READ, NOT MUTATED. `Date` is the card's only live input (no host
		* route, no async source, no skeleton — see the manifest), so the same stats
		* record renders identically for the rail, the config preview and the market. The
		* tricky part is the PREVIEW: a mock must show a fixed moment on any machine in
		* any timezone, so `meta.sim.when` pins a zone-local wall clock and `example.simSteps`
		* walks the four states on click (see the unit README).
		*/
		/** The sim field that pins the zone-local wall clock for a deterministic preview. */
		const SIM_WHEN = "when";
		/** `2026-09-24T10:30` → the `Clock` of that minute, or null for a malformed value
		*  (the card then falls back to the REAL clock rather than rendering a nonsense
		*  day).
		*
		*  The string is a WALL CLOCK IN THE CARD'S ZONE, not an instant: the sim's whole
		*  job is to make the preview deterministic, so `2026-09-24T10:30` must mean
		*  ten-thirty on the card whether the reviewer's machine sits in Beijing or in
		*  Berlin. The clock is therefore BUILT from the parsed fields — `clockAt` is
		*  deliberately NOT run a second time here (it would treat the wall clock as an
		*  instant and land the card on the wrong day) — while `dow` comes from the
		*  calendar date, which the calendar answers on its own. */
		function simClock(when) {
			const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when);
			if (!m) return null;
			const year = Number(m[1]);
			const month = Number(m[2]);
			const day = Number(m[3]);
			const hour = Number(m[4]);
			const minute = Number(m[5]);
			if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
			return {
				year,
				dow: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
				mins: hour * 60 + minute,
				dateKey: `${m[1]}-${m[2]}-${m[3]}`
			};
		}
		/**
		* The 2×2 card's holiday/weekend reason keys → THIS unit's own keys.
		*
		* The verdict (`peakStatusNow`) hands back a key that belongs to the narrow card's
		* dictionary, e.g. `card.peak.holiday.spring`. Two cards may not share a key: the
		* registry merges every unit's locale map, so a key declared by both is one key
		* that either card can silently change for the other. The narrow card keeps its
		* keys; this card ships its own — same names, its own namespace — and maps the
		* verdict through the table below. Built by concatenation so the shared keys are
		* never written as literals in this file (a literal `card.peak.*` string in a unit
		* whose id is `peak-pricing-board` would also misreport as this card's own key).
		*/
		const REASON_LOCAL = (() => {
			const shared = `card.peak`;
			const map = { [`${shared}.weekend`]: "card.peak-pricing-board.weekend" };
			for (const name of [
				"newyear",
				"spring",
				"qingming",
				"labour",
				"dragon",
				"midautumn",
				"national",
				"custom"
			]) map[`${shared}.holiday.${name}`] = `card.peak-pricing-board.holiday.${name}`;
			return map;
		})();
		/**
		* Weekday names, indexed by `Date#getDay` (0 = Sunday), resolved AT RENDER TIME.
		*
		* Two deliberate choices: the keys are written out one per line rather than as
		* `t('…dow.' + n)` (the unit validator only sees literal `t('…')` calls, so a
		* concatenated key would ship without locale coverage ever being checked), and the
		* array is built inside this function rather than at module scope (a module-scope
		* `t()` would freeze the FIRST resolved language and stop following
		* Settings → Language, which is the whole reason the contract makes name/desc
		* thunks).
		*/
		function dowNames() {
			return [
				t("card.peak-pricing-board.dow.0"),
				t("card.peak-pricing-board.dow.1"),
				t("card.peak-pricing-board.dow.2"),
				t("card.peak-pricing-board.dow.3"),
				t("card.peak-pricing-board.dow.4"),
				t("card.peak-pricing-board.dow.5"),
				t("card.peak-pricing-board.dow.6")
			];
		}
		function peakBoardRender(stats, meta) {
			const cfg = resolveScheduleConfig(stats);
			const sim = meta?.sim;
			const when = sim && typeof sim[SIM_WHEN] === "string" ? sim[SIM_WHEN] : null;
			const pinned = when === null ? null : simClock(when);
			const now = /* @__PURE__ */ new Date();
			const track = trackDay(pinned ?? clockInZone(now, cfg.tz), cfg, pinned === null ? now : void 0);
			const big = track.status.peak ? "EXPENSIVE" : "CHEAP";
			const small = track.wholeDayOff && track.reasonKey !== void 0 ? t(REASON_LOCAL[track.reasonKey] ?? track.reasonKey) : `${t("card.peak-pricing-board.until")} ${fmtMins(track.nextAt)}`;
			let legend;
			if (track.nextConfident) {
				if (track.wholeDayOff) {
					const off = track.offUntil;
					const day = off === void 0 ? "" : off.days === 1 ? `${t("card.peak-pricing-board.nextDayShort")} ` : `${dowNames()[off.dow] ?? ""} `;
					legend = off === void 0 ? void 0 : `${t("card.peak-pricing-board.nextOff")} ${day}${off.label} · ${t("card.peak-pricing-board.left", { d: fmtRemaining(off.mins) })}`;
				} else if (track.nextTomorrow) legend = `${t("card.peak-pricing-board.nextDay")} ${fmtMins(track.nextAt)} · ${t("card.peak-pricing-board.left", { d: fmtRemaining(track.nextInMins) })}`;
				else legend = `${t("card.peak-pricing-board.next")} ${fmtMins(track.nextAt)} · ${t("card.peak-pricing-board.left", { d: fmtRemaining(track.nextInMins) })}`;
			}
			const breakdown = track.rows.map((row) => ({
				label: row.range,
				value: row.dayOffKey !== void 0 ? `${t("card.peak-pricing-board.off")} · ${t(REASON_LOCAL[row.dayOffKey] ?? row.dayOffKey)}` : row.peak ? t("card.peak-pricing-board.peak") : t("card.peak-pricing-board.off"),
				tone: track.wholeDayOff && row.peak ? "muted" : row.peak ? "danger" : row.now ? "primary" : void 0
			}));
			return {
				title: t("card.peak-pricing-board.title"),
				headAfter: {
					big,
					small
				},
				legend,
				valueTone: track.status.peak ? "danger" : void 0,
				valuePulse: track.status.peak,
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown
				},
				cardHint: track.nextConfident ? void 0 : t("card.peak-pricing-board.staleHint", {
					year: track.dateKey.slice(0, 4),
					source: HOLIDAY_TABLE_SOURCE
				})
			};
		}
		var peak_pricing_board_default = defineWidget({
			id: "peak-pricing-board",
			name: () => t("widget.peak-pricing-board.name"),
			desc: () => t("widget.peak-pricing-board.desc"),
			builtin: false,
			group: "pricing",
			sizes: ["2x4"],
			simToggle: () => t("card.peak-pricing-board.simToggle"),
			render: peakBoardRender,
			configSchema: [
				{
					key: "billingWindows",
					label: () => t("config.peak-pricing-board.windows"),
					type: "text",
					default: ""
				},
				{
					key: "peakWindows",
					label: () => t("config.peak-pricing-board.peakWindows"),
					type: "text",
					default: DEFAULT_BILLING_WINDOWS
				},
				{
					key: "weekendOff",
					label: () => t("config.peak-pricing-board.weekendOff"),
					type: "toggle",
					default: true
				},
				{
					key: "holidayOff",
					label: () => t("config.peak-pricing-board.holidayOff"),
					type: "toggle",
					default: true
				},
				{
					key: "timeZone",
					label: () => t("config.peak-pricing-board.timeZone"),
					type: "mode",
					default: "Asia/Shanghai",
					options: [["Asia/Shanghai", () => t("config.peak-pricing-board.tz.beijing")], ["local", () => t("config.peak-pricing-board.tz.local")]]
				},
				{
					key: "extraHolidays",
					label: () => t("config.peak-pricing-board.extraHolidays"),
					type: "text",
					default: ""
				}
			],
			example: {
				stats: {
					billingWindows: DEFAULT_BILLING_WINDOWS,
					extraHolidays: "2027-01-01"
				},
				sim: { when: "2026-09-24T10:30" },
				simSteps: [
					{ when: "2026-09-24T10:30" },
					{ when: "2026-09-24T13:00" },
					{ when: "2026-09-26T10:30" },
					{ when: "2026-10-10T10:30" }
				]
			}
		});
		//#endregion
		//#region src/widgets/goal-progress/index.ts
		/**
		* 目标进度 — the durable goal's round progress and its lifecycle phase.
		*
		* WHY IT EXISTS: a session WITH a goal keeps running by itself — the goal projection
		* carries the round budget that drives it, the phase it is in, and, when it stalls,
		* the reason it stopped. None of that is visible anywhere in the UI today, so the
		* only way to answer "is my autonomous run still going, and is it about to run out
		* of rounds" is to read the transcript. This card answers exactly those two
		* questions and nothing else. It reads `stats.goal` (already normalized by the
		* collector), so it needs no host route, no skeleton and no `source` in the
		* manifest — the read is synchronous like the 任务 / 工具调用 cards'.
		*
		* HEAD LADDER (BRIEF §2): the blue 13px title, the 20px figure as `headAfter.big`,
		* the grey caption as `legend`. The figure is `roundsStarted / maxGoalRounds` — a
		* PAIR, because neither number alone is progress ("12 rounds" out of what?): one
		* number would have to be smuggled into the caption to stay honest. `value` is
		* deliberately NOT set (it would be pushed into the body and print the pair twice),
		* and `bodyAnchor: 'bottom'` keeps the three rows on the card floor so the leftover
		* height falls between the caption and the rows, as on every other card.
		*
		* THE FIGURE IS NOT A SHARE, SO THERE IS NO RING: a ring means "this much of the
		* whole", and 12/40 is not a completion percentage — the goal may need the rounds
		* it was given, and finishing early is not a win the card should imply. (The same
		* reason 任务 prints a digit instead of a ring.)
		*
		* HEIGHT BUDGET (measured against the shipped geometry — `card-geometry.ts` +
		* `CardBody.tsx` at unit 150, i.e. scale 1):
		*   pad 12 × 2 (24) + head (title 16 + HEAD_GAP 4 + figure 25 + CAPTION_GAP 2 +
		*   legend 12 = 59) + rows (divider 1 + paddingTop 6 + 3 × 12 + 2 × 4 = 51)
		*   = 134 / 150 — the same 16px of slack the 任务 / 缓存 cards keep, and the reason
		* three rows is a HARD cap: a fourth row is +16px and overflows the tile.
		*
		* TONE DIRECTION (the widget's own call, per §2): progress itself is NEVER coloured
		* — a high round count is not bad news, it is a big budget being used — so the
		* figure and the 目标 / 封顶 rows keep the default ink. Only the two states that
		* CHANGE what the user should do are: `blocked` → `danger` on the 阶段 row (the run
		* has stopped and is waiting on something) and `complete` → `success` (it is done).
		* `active` / `paused` stay uncoloured: neither is a verdict.
		*
		* THE CAPTION CHANGES WHAT IT SAYS WHEN BLOCKED, and only then (the owner's rule in
		* SPECS §2): normally the grey line is "phase · last change" (the reading that
		* answers "is this thing alive"), but a blocked goal's most important fact is the
		* REASON, which is carried nowhere else on the card. So the caption prints a short
		* clip of `blockedReason.message` instead — a blocked run that says "3m ago" would
		* be hiding the one thing the user has to act on.
		*
		* WHAT IT IS NOT: it is not a goal LIST (a session has one goal) and not a round
		* COUNTER (turns/steps live in 轮次·步数 / 会话概览). No goal in the session is the
		* NORMAL state, not an error — the card returns null and the rail shows one tile
		* fewer, rather than spending a slot on a card that says "no goal".
		*/
		/** The em dash a row with no honest reading prints — the same placeholder 任务 /
		*  工具调用 use, never a fabricated 0 or an empty cell. */
		const DASH$8 = "—";
		/**
		* How many DISPLAY COLUMNS a clipped string may occupy (see `clip`).
		*
		* WHY A COLUMN BUDGET AND NOT A CHARACTER COUNT: the breakdown's value column is
		* `auto` and the renderer does not clip it (only the LABEL column fades at its right
		* edge), so a value wider than its share of the row pushes the `1fr` label track and
		* the card's own `overflow: hidden` then cuts the row mid-glyph.
		*
		* THE NUMBERS BELOW ARE MEASURED, not estimated (a browser probe of the built tile,
		* 2026-09-28): the card's content box is 124px wide at unit 150 (150 − 2 border −
		* 2 × `cardInnerPad(150)` = 12), the row grid has an 8px gap, the three row labels
		* are 2 CJK glyphs each (20px measured), and at the 10px row type one ASCII column
		* measures ≈ 5.6px while a CJK glyph is exactly 10px — so a `…` costs ~2 columns,
		* not one. The value column may therefore claim 124 − 8 − 20 = 96px, and the worst
		* case at 14 columns (all ASCII: 14 × 5.6 ≈ 79px + a ~10px ellipsis ≈ 89px) leaves
		* ~7px of slack, where a 15th column would leave ~2px. That is why 14 is a CEILING
		* and not a target to grow: the failure it guards against (the value bursting the
		* card and being chopped by the card's own overflow) is permanent and visible, one
		* clipped word is not.
		*/
		const OBJECTIVE_COLS = 14;
		/**
		* The caption's whole line budget in display columns — the blocked reason's clip is
		* derived from it (see the render).
		*
		* The caption IS ellipsized by the renderer, so a small overshoot there does not
		* break the card the way an oversized row value does. What it does instead is cut
		* the line a SECOND time, at a point the widget cannot see: sized against the zh
		* prefix, the en caption measured `truncated: true` on the built tile ("Blocked: "
		* is 9 columns where "受阻：" is 6), i.e. the reason lost characters the widget's own
		* budget said it had. 20 columns ≈ 112px worst case against the measured 124px line,
		* leaving the renderer's ellipsis nothing to do in either language.
		*/
		const LEGEND_COLS = 20;
		/** Floor for the derived reason budget: a prefix alone (or an absurdly long one)
		*  must still leave a few glyphs of the sentence, never a bare "受阻：…". */
		const REASON_MIN_COLS = 6;
		/** phase → the key of its word. Four keys, one per contract value (SPECS §2). */
		const PHASE_KEY = {
			active: "card.goal-progress.phase.active",
			paused: "card.goal-progress.phase.paused",
			blocked: "card.goal-progress.phase.blocked",
			complete: "card.goal-progress.phase.complete"
		};
		/** phase → the tone of the 阶段 row (see TONE DIRECTION). `undefined` keeps the
		*  default ink, which is what a state that is not a verdict must wear. */
		const PHASE_TONE = {
			active: void 0,
			paused: void 0,
			blocked: "danger",
			complete: "success"
		};
		/**
		* Display columns one character occupies at the card's 10px row type: CJK /
		* fullwidth / emoji glyphs are one em (10px measured at unit 150), everything else
		* roughly half an em (≈ 5.6px, measured on the rendered digits and words) — the
		* Latin side is deliberately rounded UP, because the failure it guards against (the
		* value bursting the card) is visible and permanent, while clipping one glyph early
		* is not.
		*/
		function cols(ch) {
			const c = ch.codePointAt(0) ?? 0;
			return c >= 4352 && c <= 4447 || c >= 11904 && c <= 12350 || c >= 12353 && c <= 13311 || c >= 13312 && c <= 19903 || c >= 19968 && c <= 40959 || c >= 40960 && c <= 42191 || c >= 44032 && c <= 55203 || c >= 63744 && c <= 64255 || c >= 65072 && c <= 65135 || c >= 65280 && c <= 65376 || c >= 65504 && c <= 65510 || c >= 127744 && c <= 129791 ? 2 : 1;
		}
		/** Display columns a whole string occupies — the sum over its characters. The
		*  blocked caption measures its own LOCALIZED prefix with this (see the render):
		*  the prefix is 6 columns in zh and 9 in en, so a hardcoded reason budget is
		*  wrong in one of the two languages by construction. */
		function textCols(text) {
			let used = 0;
			for (const ch of text) used += cols(ch);
			return used;
		}
		/**
		* Clip a string to a display-column budget, appending `…` only when something was
		* actually dropped (a string that fits keeps its own last glyph — no trailing
		* ellipsis on a complete sentence).
		*
		* This is the card's OWN clip, not the renderer's: the breakdown value column has no
		* overflow guard (see OBJECTIVE_COLS), so the widget has to hand it a string that
		* fits. A string that fits exactly is returned untouched, and whitespace-only input
		* collapses to '' (the caller prints `—`).
		*
		* A cut landing right after a space is TRIMMED before the ellipsis: the boundary is
		* a column count, so "waiting for your approval" cut at 12 columns would otherwise
		* read `waiting for …` — an ellipsis floating away from the word it belongs to,
		* which looks like a layout bug rather than a truncation.
		*/
		function clip(text, maxCols) {
			const s = text.trim();
			let used = 0;
			let out = "";
			for (const ch of s) {
				const w = cols(ch);
				if (used + w > maxCols) return `${out.replace(/\s+$/, "")}…`;
				out += ch;
				used += w;
			}
			return out;
		}
		function goalRender(stats) {
			const g = stats.goal;
			if (!g) return null;
			const phase = g.phase;
			const phaseWord = t(PHASE_KEY[phase]);
			const max = Number.isFinite(g.maxGoalRounds) ? Math.max(0, Math.floor(g.maxGoalRounds)) : 0;
			const done = Number.isFinite(g.roundsStarted) ? Math.max(0, Math.floor(g.roundsStarted)) : 0;
			const objective = typeof g.objective === "string" ? clip(g.objective, OBJECTIVE_COLS) : "";
			const reason = phase === "blocked" && typeof g.blockedReason?.message === "string" ? g.blockedReason.message.trim() : "";
			const reasonCols = Math.max(REASON_MIN_COLS, LEGEND_COLS - textCols(t("card.goal-progress.blockedLegend", {
				phase: phaseWord,
				reason: ""
			})));
			const updated = Number.isFinite(g.updatedAt) && g.updatedAt > 0 ? g.updatedAt : null;
			const legend = reason !== "" ? t("card.goal-progress.blockedLegend", {
				phase: phaseWord,
				reason: clip(reason, reasonCols)
			}) : updated === null ? phaseWord : t("card.goal-progress.legend", {
				phase: phaseWord,
				ago: fmtAgo(new Date(updated).toISOString())
			});
			const tone = PHASE_TONE[phase];
			const rows = [{
				label: t("card.goal-progress.objective"),
				value: objective === "" ? DASH$8 : objective,
				...objective === "" ? { tone: "muted" } : {}
			}, {
				label: t("card.goal-progress.phase"),
				value: phaseWord,
				...tone === void 0 ? {} : { tone }
			}];
			return {
				title: t("card.goal-progress.title"),
				headAfter: { big: max > 0 ? t("card.goal-progress.rounds", {
					done,
					max
				}) : String(done) },
				legend,
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown: rows
				}
			};
		}
		var goal_progress_default = defineWidget({
			id: "goal-progress",
			name: () => t("widget.goal-progress.name"),
			desc: () => t("widget.goal-progress.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2"],
			render: goalRender,
			example: { stats: { goal: {
				objective: "把 dsh-widgets 第三批的 7 张部件卡做完，并逐张看图验收截图",
				phase: "blocked",
				roundsStarted: 12,
				maxGoalRounds: 40,
				createdAt: Date.now() - 72e5,
				updatedAt: Date.now() - 18e4 - 42e3,
				blockedReason: {
					code: "awaiting-approval",
					message: "等待你确认是否继续（同一阻塞已持续 3 轮）"
				}
			} } }
		});
		//#endregion
		//#region src/widgets/subagent/index.ts
		/**
		* 子代理 — the direct children this session spawned, told in one tile.
		*
		* WHAT IT ANSWERS: how many subagents this session has, the longest ACTIVE TIME any
		* of them logged, how many of them are continuable, and the newest one that carries
		* a label. Multi-agent work is the main time/cost source of a long run and it is
		* completely invisible on the rail; the official `subagentCatalog` projection still
		* has no consumer.
		*
		* THE FIGURE IS THE COUNT, AND THE CARD NEVER SAYS 「运行中」. `subagentCatalog`
		* carries identity and creation time, NOT liveness and NOT spend (see the
		* `SubagentEntry` contract note). A card that printed "2 running" would be inventing
		* a fact it cannot read — the projection cannot tell a child that finished an hour
		* ago from one that is streaming right now. So the head carries the total, and every
		* duration on the card is qualified as ACTIVE TIME or as AGE, never as "running for".
		*
		* HEAD LADDER (BRIEF §2): blue 13px title (`card.subagent.title`), the 20px figure
		* (`headAfter.big` — never `value`, which the renderer would push into the body a
		* second time), the grey caption under it. The caption is the longest active time
		* when the projection published any `activeMs`; when it published none, the caption
		* degrades to the AGE OF THE OLDEST CHILD (「最早 … 前创建」) instead of disappearing —
		* a session where every child reports no active time still has one true statement
		* left, and an empty caption line would just be 12px of dead air. Both captions are
		* about the whole card (the oldest / the longest of ALL children), which is why they
		* belong in the head and not in a fourth row.
		*
		* THE THREE ROWS (breakdown, ≤3 per BRIEF §2):
		*   1. 最久   → the largest `activeMs`; `—` (muted) when none was published.
		*   2. 持续型 → how many are `mode: 'continuable'`, written as `n / total` because
		*               "2 continuable" alone cannot be read without the denominator.
		*   3. 最近   → the label of the NEWEST child that has one, carried in the LABEL
		*               column (`最近 <label>`), with that child's AGE as the reading; `—`
		*               (muted) when no child is labelled.
		* A missing reading prints `—` + `tone: 'muted'` and NEVER vanishes: a row that
		* disappears silently changes the card's line count between renders.
		*
		* WHY ROW 3'S IDENTITY IS IN THE LEFT COLUMN — measured, not taste. The breakdown
		* grid is `1fr auto` (label track, value track). Putting the child's label in the
		* VALUE track let a long label size that track to 245px inside a 124px content box:
		* the label track collapsed to `0px`, so all three row labels vanished and rows 1
		* and 2's figures were pushed off the card (`.tmp-subagent-dom.cjs` dump of the
		* first build: `gridTemplateColumns: "0px 245.203px"`). The renderer's own answer to
		* long text is the LABEL track's right-edge fade (nowrap + mask — see
		* breakdown.tsx), so the identity belongs there: any length then fades instead of
		* stealing the grid, and the fixed vocabulary (最久 / 持续型 / 最近) stays readable.
		* The tool card's 「正在执行 <name>」 row reads the same way, for the same reason.
		*
		* `label` IS CAPPED BUT NOT ELLIPSIZED. The renderer's mask fade is what truncates
		* visually; this widget only bounds the string it hands over so a pathological
		* label cannot ship a paragraph into the DOM. It deliberately does NOT append `…`,
		* which would put a second truncation mark inside an already-faded line.
		*
		* TONE DIRECTION — the widget's own call (BRIEF §2), and the only tone here:
		* `LONGEST_ACTIVE_WARN_MS` (30 min) turns the 最久 row amber. Rationale: the count
		* itself is NEVER coloured (more children is not worse), and active time under half
		* an hour is ordinary delegated work. Past 30 minutes of logged active time a child
		* has usually stopped being a delegation and become a stuck or oversized one — the
		* threshold is a nudge to go look, not an error. It is amber (`warn`), not red: a
		* long child is not a failure, and a card that cries red at ordinary long work gets
		* ignored.
		*
		* CLOCK: `render` reads `Date.now()` — the one impurity BRIEF §3 allows — because the
		* created-at fallback is a DISTANCE (「最早 48m 前创建」) and a distance only exists
		* relative to now. It is read once per render and never stored.
		*
		* NO `source` IN THE MANIFEST: `subagents` is a synchronous session projection
		* (`stats.subagents`), not an async route — there is nothing to wait for and no
		* loading silhouette to declare.
		*
		* 2×2 ONLY: three rows plus the head spend 134 of the 150px budget (pad 24 + head 59
		* + rows 51 — measured, and the same posture cache / tool / context ship), so the wide
		* variant would buy nothing.
		*/
		/** The em dash a row without a reading shows — the repo's placeholder (task / tool /
		*  quota-manage), never a fabricated 0. A 0 would say "no active time was logged",
		*  which is only true when the projection actually published a 0. */
		const DASH$7 = "—";
		/**
		* The 最久 row turns amber above this. 30 minutes of LOGGED ACTIVE time (the child's
		* own turn time, not wall-clock age) is the point where a delegation has usually
		* outgrown its brief; see TONE DIRECTION above for why amber and not red.
		*/
		const LONGEST_ACTIVE_WARN_MS = 18e5;
		/** Upper bound on the label characters this widget hands to the renderer. The
		*  visible truncation is the breakdown's right-edge fade on the LABEL track; this
		*  cap only keeps a runaway label out of the DOM. 48 chars is well past the ~7 CJK
		*  glyphs a 2×2 label track can show, so nothing readable is ever cut by it. */
		const MAX_LABEL_CHARS = 48;
		/** A finite, usable number, or null. The projection is normalized upstream, but a
		*  render must never turn a malformed row into `NaN` on the tile. */
		function finiteOrNull(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : null;
		}
		/** Flatten whitespace and bound the length; an empty result is the dash (see the
		*  file header for why no `…` is appended here). */
		function clipLabel(text) {
			const flat = text.replace(/\s+/g, " ").trim();
			if (flat === "") return DASH$7;
			return flat.length > MAX_LABEL_CHARS ? flat.slice(0, MAX_LABEL_CHARS) : flat;
		}
		/**
		* @param stats - the session record (`stats.subagents` is the whole input).
		* @param meta  - render context; `meta.sim.noActive` is the preview's override (see
		*                `example` below), which forces the no-active-time posture so the
		*                degraded caption can be reviewed without a live session.
		*/
		function subagentRender(stats, meta) {
			const all = Array.isArray(stats.subagents) ? stats.subagents : null;
			if (all === null || all.length === 0) return null;
			const now = Date.now();
			const noActive = meta?.sim?.noActive === true;
			let longest = null;
			if (!noActive) for (const entry of all) {
				const ms = finiteOrNull(entry.activeMs);
				if (ms !== null && ms >= 0 && (longest === null || ms > longest)) longest = ms;
			}
			let earliest = null;
			for (const entry of all) {
				const at = finiteOrNull(entry.createdAt);
				if (at !== null && (earliest === null || at < earliest)) earliest = at;
			}
			const caption = longest !== null ? t("card.subagent.legendActive", { dur: fmtDuration(longest) }) : earliest !== null ? t("card.subagent.legendEarliest", { ago: fmtAgo(new Date(earliest).toISOString(), now) }) : null;
			let continuable = 0;
			let latest = null;
			let latestAt = Number.NEGATIVE_INFINITY;
			for (const entry of all) {
				if (entry.mode === "continuable") continuable += 1;
				if (typeof entry.label !== "string" || entry.label.trim() === "") continue;
				const at = finiteOrNull(entry.createdAt) ?? Number.NEGATIVE_INFINITY;
				if (latest === null || at >= latestAt) {
					latest = entry;
					latestAt = at;
				}
			}
			const latestAgo = latest !== null && Number.isFinite(latestAt) ? fmtAgo(new Date(latestAt).toISOString(), now) : null;
			const rows = [{
				label: t("card.subagent.continuable"),
				value: `${continuable} / ${all.length}`
			}, latest === null ? {
				label: t("card.subagent.recent"),
				value: DASH$7,
				tone: "muted"
			} : {
				label: `${t("card.subagent.recent")} ${clipLabel(latest.label ?? "")}`,
				...latestAgo === null ? {
					value: DASH$7,
					tone: "muted"
				} : { value: t("card.subagent.ago", { ago: latestAgo }) }
			}];
			return {
				title: t("card.subagent.title"),
				headAfter: { big: String(all.length) },
				...longest !== null && longest > LONGEST_ACTIVE_WARN_MS ? { valueTone: "warn" } : {},
				...caption === null ? {} : { legend: caption },
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown: rows
				}
			};
		}
		var subagent_default = defineWidget({
			id: "subagent",
			name: () => t("widget.subagent.name"),
			desc: () => t("widget.subagent.desc"),
			builtin: true,
			group: "system",
			render: subagentRender,
			simToggle: () => t("widget.subagent.simToggle"),
			example: {
				stats: { subagents: [
					{
						id: "sub-1",
						createdAt: Date.now() - 288e4,
						mode: "one-shot",
						activeMs: 492e3
					},
					{
						id: "sub-2",
						createdAt: Date.now() - 186e4,
						mode: "continuable",
						label: "cache 卡版式复核",
						activeMs: 126e4
					},
					{
						id: "sub-3",
						createdAt: Date.now() - 72e4,
						mode: "continuable",
						activeMs: 2172e3
					},
					{
						id: "sub-4",
						createdAt: Date.now() - 24e4,
						mode: "one-shot",
						label: "dsh-widgets 第三批 · subagent 卡面与预览链路复核"
					}
				] },
				sim: { noActive: false },
				simSteps: [{ noActive: false }, { noActive: true }]
			}
		});
		//#endregion
		//#region src/widgets/guard/index.ts
		/**
		* 权限档位 (guard) — what this session is ALLOWED to do, as one folded value.
		*
		* WHY IT EXISTS: a long-running autonomous agent's most important safety fact is
		* invisible in the rail. The 44 shipped cards all answer "how much was spent";
		* none answers "may it write outside the workspace, and will it ask first". The
		* official shell folds THREE knobs (preset + sandbox mode + approval policy) into
		* the one `permissions` projection, and this card prints that fold verbatim —
		* it deliberately does NOT re-derive a sandbox mode or an approval policy from
		* the preset key, because the fold IS the authority and a second derivation is a
		* second answer that can disagree with the one the runtime enforces.
		*
		* HEAD LADDER (WORKER-BRIEF §2): the blue 13px title, the 20px figure = the
		* current preset's DISPLAY NAME (`headAfter.big` — never `value`, which the
		* renderer pushes into the body a second time), the grey caption = how many
		* switchable options exist (`legend`), and the three detail rows on the card's
		* floor (`bodyAnchor: 'bottom'`). No `headRing`: a ring is the design language
		* for a SHARE, and this head's figure is a NAME, not a fraction of anything.
		*
		* `name` vs `value`: the projection carries both a machine key (`danger-full-access`)
		* and a display name. The card prints the NAME because that is what the user saw
		* in the permission selector; the key would read as a config file. When the key is
		* NOT in the option table (the projection derived `custom`, or the deployment's
		* table changed under a running session) the card prints the raw key: it is still
		* a true statement about the session, and a `—` there would hide a real value.
		*
		* TONE DIRECTION — the widget's own call, and the only card in this batch that
		* colours by danger. The rule is 「权限越大越需要被看见」: a preset whose machine
		* value names a whole-machine / no-questions family paints the figure red. The
		* vocabulary is deliberately NOT green-for-safe: the render contract's
		* `valueTone` is a single-member union ('danger' = the escalation red), so a
		* "safe" preset has no colour to take — it keeps the default label colour, which
		* is exactly what "nothing to escalate" should look like (see DANGER_MARKERS).
		* `valuePulse` is NOT used: a card that blinks forever stops being read.
		*/
		/** The em dash a row shows while it has no reading — the same placeholder
		*  工具调用 / 任务 use, never a fabricated value. */
		const DASH$6 = "—";
		/**
		* HEURISTIC, NOT AUTHORITY. Substrings of the machine preset key that mark a
		* family able to act on the whole machine without asking first:
		*   - `danger`/`full` — the shipped `danger-full-access` preset (sandbox: full
		*     access, approval: never);
		*   - `yolo`/`bypass` — the customary names other harnesses use for the same
		*     bundle, and the names a custom deployment is most likely to compose.
		* Case-insensitive, matched against `currentValue` ONLY (never the display
		* name: names are localized and a translated word must not decide a colour).
		*
		* The counterpart families — `read-only`, `plan`, `safe` — deliberately have NO
		* constant here: they take no colour, and the default IS "no colour", so a table
		* of safe markers would be a list no branch reads. Two blind spots are accepted
		* and documented in README §5: the derived `custom` fold hides which knobs it
		* holds, and a deployment may rename a dangerous preset to anything it likes.
		*/
		const DANGER_MARKERS = [
			"danger",
			"full",
			"yolo",
			"bypass"
		];
		/** True when a preset's machine value names a whole-machine / no-questions
		*  family (see DANGER_MARKERS). Pure string work, no table lookup. */
		function isDangerPreset(value) {
			const v = value.toLowerCase();
			return DANGER_MARKERS.some((marker) => v.includes(marker));
		}
		/**
		* The product's own labels for the presets it SHIPS, mirrored from the official
		* permission row's `PRESET_LABEL_KEYS` (`@deepseek-ai/dsh-client-ui-permission-presets`).
		*
		* This exists because of something the live rail showed (2026-09-29): the
		* projection's `options[].name` is the preset KEY on this deployment, so the card
		* printed `danger-full-access` in 20px where the product's own settings row says
		* 「完全权限」/ "Full access". Re-drawing the product's words is not inventing a
		* display name — it is matching the one the user sees two clicks away.
		*/
		const PRESET_LABEL_KEYS = {
			"read-only": "card.guard.preset.readOnly",
			"workspace-write": "card.guard.preset.workspaceWrite",
			"danger-full-access": "card.guard.preset.fullAccess"
		};
		/** The English defaults those labels replace — the official row treats a name
		*  equal to them as "still the raw key" (see `presetLabel`). */
		const PRESET_DEFAULT_LABELS = {
			"card.guard.preset.readOnly": "Read Only",
			"card.guard.preset.workspaceWrite": "Workspace Write",
			"card.guard.preset.fullAccess": "Full access"
		};
		/** Kebab → Title Case, the same fallback the official row uses for a preset the
		*  product does not ship (`my-custom-preset` → `My Custom Preset`). A name that is
		*  not a kebab key is returned untouched, so a human-typed label survives. */
		function titleCasePreset(name) {
			if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name;
			return name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
		}
		/** The label to print for a preset: the product's word when the key is one of
		*  its own, else the table's name (or its title-cased key). */
		function presetLabel(value, name) {
			const key = PRESET_LABEL_KEYS[value];
			if (key !== void 0 && (name === value || name === PRESET_DEFAULT_LABELS[key])) return t(key);
			return titleCasePreset(name);
		}
		/** The 2×2 card's inner content width at the base side: 150 − 2 × 12px pad
		*  (`cardInnerPad`). This unit declares `['2x2']` only, and a magnified card
		*  scales its font and its width together, so one base-side number is enough. */
		const CONTENT_WIDTH_PX = 126;
		/** The breakdown grid's own `columnGap` (`render/charts/breakdown.tsx`). */
		const BREAKDOWN_GAP_PX = 8;
		/** The breakdown row font size at the base side (10px, scaled by the renderer). */
		const BREAKDOWN_FONT_PX = 10;
		/** Slack kept so a slightly wider fallback face still leaves the label whole. */
		const CLIP_SLACK_PX = 6;
		/** Rough advance width of one glyph, in px at `fontPx`.
		*
		*  The card stores TEXT, not pixels, and the offline renderer has no font
		*  metrics, so the clip has to estimate. A CJK / fullwidth glyph takes one full
		*  em; Latin, digits and punctuation about 0.55. Deliberately generous: cutting a
		*  glyph early is invisible, cutting late makes the breakdown's shared value
		*  column steal the label's width (the label is the cell that fades). */
		function textWidthPx(text, fontPx) {
			let em = 0;
			for (const ch of text) {
				const cp = ch.codePointAt(0) ?? 0;
				em += isWideGlyph(cp) ? 1 : .55;
			}
			return em * fontPx;
		}
		/** CJK, Hangul, kana and the fullwidth forms — the ranges that occupy a full em
		*  (the same ranges a terminal calls "wide"). */
		function isWideGlyph(cp) {
			return cp >= 4352 && cp <= 4447 || cp >= 11904 && cp <= 42191 || cp >= 44032 && cp <= 55203 || cp >= 63744 && cp <= 64255 || cp >= 65072 && cp <= 65135 || cp >= 65280 && cp <= 65376 || cp >= 65504 && cp <= 65510;
		}
		/** Punctuation a truncated sentence may end on: the ellipsis replaces what
		*  follows, and stopping at a clause boundary keeps the visible half a sentence
		*  instead of a severed word. */
		const CLAUSE_ENDS = "。！？；，、,.!?;: ";
		/** Where the value column may end, given the row labels of ONE breakdown block.
		*
		*  `breakdown` is a single grid (`1fr auto`), so the value column is shared by
		*  every row and sized by the WIDEST value — here always the clipped sentence on
		*  the 说明 row. The label column gets whatever is left, and it is the label that
		*  fades when the value asks for too much (the breakdown gives the label cell
		*  `overflow: hidden` + a right-edge mask). So the budget is measured against the
		*  widest label, not against the label of the row being clipped. */
		function clipBudgetPx(labels) {
			let widest = 0;
			for (const label of labels) widest = Math.max(widest, textWidthPx(label, BREAKDOWN_FONT_PX));
			return CONTENT_WIDTH_PX - widest - BREAKDOWN_GAP_PX - CLIP_SLACK_PX;
		}
		/**
		* Clip the current preset's one-sentence description to the 说明 row.
		*
		* The sentence is the LONGEST text on the card and the row has one line, so it is
		* cut here rather than left to the renderer: the value cell is `nowrap` with no
		* overflow handling, so an unclipped sentence does not ellipsize — it pushes the
		* grid and clips the LABEL instead (see clipBudgetPx).
		*
		* Policy (README §4): keep the FIRST clause, then `…`. A clause boundary inside
		* the budget is used only when it preserves at least half of it (otherwise the
		* row would show a two-word stub); the ellipsis itself is charged to the budget.
		*/
		function clipSentence(text, maxPx) {
			const s = text.trim().replace(/\s+/g, " ");
			if (s === "") return "";
			if (textWidthPx(s, BREAKDOWN_FONT_PX) <= maxPx) return s;
			const budget = Math.max(BREAKDOWN_FONT_PX, maxPx - BREAKDOWN_FONT_PX);
			let cut = 0;
			let width = 0;
			for (const ch of s) {
				const w = textWidthPx(ch, BREAKDOWN_FONT_PX);
				if (width + w > budget) break;
				width += w;
				cut += ch.length;
			}
			const head = s.slice(0, cut);
			const boundary = lastClauseEnd(head);
			return `${boundary >= Math.floor(head.length / 2) ? head.slice(0, boundary + 1).replace(/[，,、;；:：\s]+$/, "") : head.trimEnd()}…`;
		}
		/** Index of the last clause boundary in `head`, or -1 when it has none. */
		function lastClauseEnd(head) {
			for (let i = head.length - 1; i >= 0; i -= 1) if (CLAUSE_ENDS.includes(head[i])) return i;
			return -1;
		}
		function guardRender(stats, meta) {
			const p = stats.permissions;
			if (p === null || p === void 0 || p.currentValue === "") return null;
			const options = Array.isArray(p.options) ? p.options : [];
			const currentValue = (typeof meta?.sim?.currentValue === "string" ? meta.sim.currentValue : null) ?? p.currentValue;
			const current = options.find((o) => o.value === currentValue) ?? null;
			const name = current !== null ? presetLabel(currentValue, current.name) : presetLabel(currentValue, currentValue);
			const dangerous = isDangerPreset(currentValue);
			const count = options.length;
			const labelNow = t("card.guard.current");
			const labelAllows = t("card.guard.allows");
			const description = current?.description;
			const rows = [{
				label: labelNow,
				value: name,
				...dangerous ? { tone: "danger" } : {}
			}, description !== void 0 && description.trim() !== "" ? {
				label: labelAllows,
				value: clipSentence(description, clipBudgetPx([labelNow, labelAllows]))
			} : {
				label: labelAllows,
				value: DASH$6,
				tone: "muted"
			}];
			return {
				title: t("card.guard.title"),
				headAfter: { big: name },
				legend: t("card.guard.legend", { n: count }),
				bodyAnchor: "bottom",
				...dangerous ? { valueTone: "danger" } : {},
				chart: {
					kind: "breakdown",
					breakdown: rows
				}
			};
		}
		var guard_default = defineWidget({
			id: "guard",
			name: () => t("widget.guard.name"),
			desc: () => t("widget.guard.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2"],
			render: guardRender,
			simToggle: () => t("widget.guard.simToggle"),
			example: {
				stats: { permissions: {
					currentValue: "danger-full-access",
					options: [
						{
							value: "read-only",
							name: "仅可查看",
							description: "只能读取文件，任何写入或命令执行都要先批准。"
						},
						{
							value: "plan",
							name: "计划模式",
							description: "只出方案不落地：写入与命令一律先问过你再执行。"
						},
						{
							value: "workspace-write",
							name: "工作区内修改",
							description: "可以在工作区内写入与执行命令，越出工作区的重试需要批准。"
						},
						{
							value: "danger-full-access",
							name: "完全权限",
							description: "文件与命令均不询问，可直接写入工作区之外并执行任意命令。"
						}
					]
				} },
				sim: { currentValue: "danger-full-access" },
				simSteps: [
					{ currentValue: "danger-full-access" },
					{ currentValue: "read-only" },
					{ currentValue: "sandbox-off" }
				]
			}
		});
		//#endregion
		//#region src/widgets/jobs/index.ts
		/** Which statuses still occupy the machine (see "stopping COUNTS AS RUNNING"). */
		const IS_LIVE = {
			running: true,
			stopping: true,
			completed: false,
			killed: false,
			failed: false
		};
		/** The wire statuses this build understands; anything else is KEPT as a row but
		*  counted as settled (an unrecognised status must never make a job invisible,
		*  and it is certainly not evidence of failure). */
		const STATUSES = [
			"running",
			"stopping",
			"completed",
			"killed",
			"failed"
		];
		/** The em dash a row with no reading shows — the same placeholder 任务/工具调用
		*  use, never a fabricated 0. */
		const DASH$5 = "—";
		/** Longest job name this card keeps in the DOM. The label cell FADES its right
		*  edge (see breakdown.tsx) instead of ending in "…": that track measures 83px
		*  at 2×2, i.e. the 最久/最近 prefix plus ~13 latin characters — so this cap is
		*  DOM hygiene for a pathological label (a 4KB command), not a layout rule, and
		*  it deliberately adds NO ellipsis glyph. */
		const NAME_MAX = 64;
		/** Row cap: three fit, four do not (see HEIGHT BUDGET). */
		const ROWS$1 = 3;
		/** Collapse a possibly multi-line command into one line and bound its length
		*  (see NAME_MAX). */
		function oneLine(raw) {
			return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
		}
		/** The wire status, or null when this build does not recognise it. */
		function statusOf(raw) {
			return typeof raw === "string" && STATUSES.includes(raw) ? raw : null;
		}
		/**
		* Read the mirrored `jobs` list defensively.
		*
		* The mirror's wire value is read as `unknown` on purpose: this deployment may
		* carry an older/newer sessions service, or no sessions service at all, and a
		* card must never be the thing that throws inside a selector (the slot renderer
		* answers a throwing selector by abdicating the whole entry, taking every other
		* card's data with it). A row with no usable start time is DROPPED — it can be
		* neither dated nor ranked, and `—` would be a row of pure noise.
		*
		* @returns the rows, or null when the mirror is not an array (see null vs []).
		*/
		function jobsOf(value) {
			if (!Array.isArray(value)) return null;
			const rows = [];
			for (const raw of value) {
				if (raw === null || typeof raw !== "object") continue;
				const r = raw;
				if (typeof r.startedAt !== "number" || !Number.isFinite(r.startedAt)) continue;
				const label = typeof r.label === "string" ? oneLine(r.label) : "";
				const kind = typeof r.kind === "string" ? oneLine(r.kind) : "";
				rows.push({
					name: label !== "" ? label : kind,
					status: statusOf(r.status),
					startedAt: r.startedAt
				});
			}
			return rows;
		}
		/** A row's name, or the dash when it carries neither a label nor a kind. */
		function nameOf(row) {
			return row.name !== "" ? row.name : DASH$5;
		}
		/** Is this row still occupying the machine? */
		function isLive(row) {
			return row.status !== null && IS_LIVE[row.status];
		}
		function jobsRender(stats, meta) {
			const mirrored = jobsOf(stats.jobs);
			if (mirrored === null) return null;
			const sim = meta?.sim;
			const rows = sim?.state === "empty" ? [] : mirrored;
			const now = typeof sim?.now === "number" && Number.isFinite(sim.now) ? sim.now : Date.now();
			let live = 0;
			let failed = 0;
			let longest = null;
			let longestMs = 0;
			let newest = null;
			const ignoringLive = sim?.state === "idle";
			for (const row of rows) {
				if (isLive(row) && !ignoringLive) {
					live += 1;
					const ms = Math.max(0, now - row.startedAt);
					if (longest === null || ms > longestMs) {
						longest = row;
						longestMs = ms;
					}
				}
				if (row.status === "failed") failed += 1;
				if (newest === null || row.startedAt > newest.startedAt) newest = row;
			}
			const dash = {
				label: "",
				value: DASH$5,
				tone: "muted"
			};
			const failedTone = failed > 0 ? "danger" : "muted";
			const breakdown = [
				longest === null ? {
					...dash,
					label: t("card.jobs.longest")
				} : {
					label: `${t("card.jobs.longest")} ${nameOf(longest)}`,
					value: fmtDuration(longestMs)
				},
				newest === null ? {
					...dash,
					label: t("card.jobs.newest")
				} : {
					label: `${t("card.jobs.newest")} ${nameOf(newest)}`,
					value: ""
				},
				{
					label: t("card.jobs.failed"),
					value: String(failed),
					tone: failedTone
				}
			].slice(0, ROWS$1);
			return {
				title: t("card.jobs.title"),
				headAfter: { big: String(live) },
				legend: live > 0 ? t("card.jobs.legend", {
					longest: fmtDuration(longestMs),
					total: rows.length
				}) : t("card.jobs.idle", { n: rows.length }),
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown
				}
			};
		}
		/** The instant the example's jobs are dated from: this module's own clock, read
		*  once, so the preview's elapsed times are the fabricated ones this file chose
		*  and are identical in the gallery and in the G4 snapshot. */
		const EXAMPLE_NOW = Date.now();
		var jobs_default = defineWidget({
			id: "jobs",
			name: () => t("widget.jobs.name"),
			desc: () => t("widget.jobs.desc"),
			builtin: true,
			group: "system",
			sizes: ["2x2"],
			render: jobsRender,
			simToggle: () => t("widget.jobs.simToggle"),
			example: {
				stats: { jobs: [
					{
						id: "bash-1",
						kind: "bash",
						label: "npm run build --filter dsh-widgets",
						status: "running",
						startedAt: EXAMPLE_NOW - 724e3
					},
					{
						id: "bash-2",
						kind: "bash",
						label: "tail -f logs/dev.log",
						status: "stopping",
						startedAt: EXAMPLE_NOW - 95e3
					},
					{
						id: "subagent-1",
						kind: "subagent",
						label: "Review the jobs widget contract",
						status: "completed",
						startedAt: EXAMPLE_NOW - 9e5,
						finishedAt: EXAMPLE_NOW - 88e4
					},
					{
						id: "bash-3",
						kind: "bash",
						label: "npm test -- --run",
						status: "failed",
						startedAt: EXAMPLE_NOW - 15e5,
						finishedAt: EXAMPLE_NOW - 144e4,
						detail: "exit code: 1"
					}
				] },
				sim: {
					state: "live",
					now: EXAMPLE_NOW
				},
				simSteps: [
					{
						state: "live",
						now: EXAMPLE_NOW
					},
					{
						state: "idle",
						now: EXAMPLE_NOW
					},
					{
						state: "empty",
						now: EXAMPLE_NOW
					}
				]
			}
		});
		//#endregion
		//#region src/widgets/sys-disk/index.ts
		/**
		* 磁盘与自检 (sys-disk, 2×4) — the two operational failures a long-running
		* harness actually dies of, neither of which is visible anywhere else in the
		* product: a drive filling up, and the harness's own session log growing without
		* bound. Every 用量 card answers "how much did it cost"; this one answers "is the
		* box still habitable".
		*
		* WHAT THE BIG FIGURE IS: the TIGHTEST drive's free space (`headAfter.big`).
		* Chosen over "the fullest drive's used %" deliberately — free space is the
		* resource that actually runs out, and it is the number you compare against the
		* size of your next download; the % is printed per drive one line below anyway,
		* so choosing the % here would print the same fact twice and waste the 20px rung.
		*
		* WHY EACH ELEMENT IS WHERE IT IS (2×4 = 312×150 outer, 310×148 client box, 12px
		* inset → 286×124 of content. The numbers below are MEASURED in the gallery, not
		* estimated):
		*   - title       the card's name, 13px.
		*   - big         the tightest drive's free space, 20px.
		*   - line 1      grey, riding the big figure's own row (`headAfter.smallLines`):
		*                 each drive's free SHARE (the first three, then `+N` — see the
		*                 render). A bar shows shape; a share has to be a numeral, and this
		*                 is the spec's `legend` content in the only slot that can still
		*                 afford it.
		*   - line 2      the second line of that same block — the session-log footprint,
		*                 which is the `sub` content of the spec's sketch. It cannot be a
		*                 real `sub` row: see the HEIGHT note below.
		*   - chart.bars  one bar per drive, fill = FREE/total, tone = the free band.
		*   - bar labels  `C: 67.1G / 300G`. The `bars` primitive draws no value column
		*                 (its only per-datum text channel is the column label and the
		*                 hover title), so the bytes ride the label and the share rides
		*                 the hover title (`value`, which that renderer prints as a
		*                 percent — passing bytes there would print `67%` for 67 GB).
		*   - cardHint    the web process's own usage, hover-only. It is the third
		*                 section of the sketch and there is no pixel for it on the tile;
		*                 the contract's `cardHint` exists for exactly this ("a
		*                 diagnostic that must NOT be printed on the tile").
		*
		* HEIGHT — why this is NOT the sketch's four-row layout: the `bars` block is a
		* FIXED 72px (56px of bar + a 4px gap + a 9px label) and the head's ladder is
		* title 16 + a 4px gap + figure 25 = 45px, so title + ladder + bars = 117 of the
		* 124 content pixels, and the card measures exactly 148 client px — no overflow.
		* A `legend` row (a further 16px) or a `sub` row (18px) would overflow the tile,
		* and an overflowing card does not clip in the rail — it GROWS past its grid row
		* (measured: `usage-bars`, a 2×2 whose legend + bars already spend 104 of the same
		* 124). `smallLines` is the one slot that carries a second fact for FREE: the block
		* is centred on the figure's line box, so two 12.5px caption lines sit inside the
		* figure's own 25px row and the head stays 25px tall.
		*
		* TONE DIRECTION — set HERE, never inferred by the renderer (a share means nothing
		* without knowing which way is good): this is FREE space, so LESS IS WORSE. That is
		* the opposite pole of 利用率 (sys-cpu / sys-gpu / sys-rings), where a high number
		* means a busy machine and the same 90% is the alarming end.
		*
		* PREVIEW-ONLY STATE: `meta.sim.noHome` forces the `home` slice to null so the
		* degraded card can be eyeballed (and screenshotted) without breaking the session
		* directory. The rail passes `{ size }` only — `sim` is the preview channel, the
		* same mechanism 任务 uses for its empty state.
		*/
		/** Binary units, spelled out: `fs.statfs` reports raw byte counts and the whole
		*  sys family divides by 1024³ (see `fmtGb` in families/sys), so the two cards
		*  beside each other must not disagree about what a "G" is. */
		const KIB = 1024;
		const MIB = 1024 ** 2;
		const GIB = 1024 ** 3;
		const TIB = 1024 ** 4;
		/**
		* Free-share bands, red under 10%.
		*
		* The red line is Windows' own behaviour, not a taste knob: below ~10% free a
		* system drive visibly slows down, and Windows starts refusing updates, service
		* packs and shadow copies — a card that stayed calm at 9% would be hiding the one
		* number this tile exists for. 20% is the amber band: the level at which "plan to
		* clean up" is still a plan rather than a rescue.
		*/
		const FREE_DANGER = .1;
		const FREE_WARN = .2;
		/** Columns still hold a byte label (`C: 67.1G / 300G`) above this count — see the
		*  render: the label measures 67–68px in the browser, so it only has room while a
		*  column is wider than that (2 columns: 141px, 3: 93px; 4: 68.5px is a coin flip). */
		const MAX_BYTE_LABELS = 3;
		/** Drives whose free share the caption lists before it falls back to `+N` — see
		*  the render: an uncapped list would squeeze the 20px figure itself. */
		const CAPTION_DRIVES = 3;
		/**
		* Bytes → the compact drive figure this card prints (`341M`, `63.0G`, `652G`).
		*
		* DELIBERATELY not `fmtTokens`: that is the token vocabulary, and it stops at M —
		* a 652 GB drive would print as `667648M`. Its "3 significant digits" rule is also
		* the wrong shape for a capacity (it would print 652 GB as `652M`-style noise,
		* never touching a G). The rule here is one decimal below 100 and a whole number
		* above, which is how drives are quoted (`63.0G`, `300G`).
		*/
		function fmtBytes$1(bytes) {
			if (!Number.isFinite(bytes) || bytes < 0) return "—";
			const steps = [
				[TIB, "T"],
				[GIB, "G"],
				[MIB, "M"],
				[KIB, "K"]
			];
			for (const [step, suffix] of steps) if (bytes >= step) {
				const v = bytes / step;
				return `${v >= 100 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1)}${suffix}`;
			}
			return `${Math.round(bytes)}B`;
		}
		/**
		* Process uptime → `3h54m`.
		*
		* Not `fmtDuration`: that formatter is the session vocabulary (`45.2s` / `2m42s`)
		* and would print a 3h54m uptime as `234m0s` — the unit a host process is read in
		* is hours and days.
		*/
		function fmtUptime(sec) {
			const s = Math.max(0, Math.round(sec));
			if (s < 60) return `${s}s`;
			if (s < 3600) return `${Math.floor(s / 60)}m`;
			if (s < 86400) return `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}m`;
			return `${Math.floor(s / 86400)}d${Math.floor(s % 86400 / 3600)}h`;
		}
		/** The band a drive's free share falls in (see FREE_DANGER / FREE_WARN). */
		function freeTone(ratio) {
			if (ratio < FREE_DANGER) return "danger";
			if (ratio < FREE_WARN) return "warn";
			return "primary";
		}
		/**
		* The machine slice, guarded.
		*
		* `stats.sysinfo` is the collector's own projection (untyped on `WidgetStats`), and
		* an older host answers the route WITHOUT `machine` — a card that assumed either
		* shape would throw inside the rail's render. Missing here means "this deployment
		* has no machine half", which is what the null contract is for.
		*/
		function machineOf(stats) {
			const sys = stats.sysinfo;
			if (!sys || typeof sys !== "object") return null;
			const m = sys.machine;
			return m && typeof m === "object" && Array.isArray(m.disks) ? m : null;
		}
		/**
		* The share the tile PRINTS — floored, never rounded.
		*
		* The tone bands are strict (`< 10%` is red), so a drive at 9.6% free is in the
		* danger band; `Math.round` would print it as `10%`, i.e. a red numeral sitting
		* exactly on the line it is supposed to be under. That is not hypothetical: the
		* owner's own D: drive measured 9.6% free (2026-09-28). Flooring also errs toward
		* "less free than there is", which is the safe direction for a warning — the exact
		* `ratio` still drives the bar's height and the tone, so nothing is lost.
		*/
		function shownPct(ratio) {
			return Math.floor(ratio * 100);
		}
		/** Render the card, or null when there is nothing honest to draw. */
		function sysDiskRender(stats, meta) {
			const machine = machineOf(stats);
			if (machine === null) return null;
			const disks = machine.disks.filter((d) => Number.isFinite(d.total) && d.total > 0 && Number.isFinite(d.free)).map((d) => ({
				mount: d.mount,
				total: d.total,
				free: Math.max(0, d.free),
				ratio: Math.min(1, Math.max(0, d.free / d.total))
			}));
			if (disks.length === 0) return null;
			let tight = disks[0];
			for (const d of disks) if (d.ratio < tight.ratio) tight = d;
			const pctOf = (d) => shownPct(d.ratio);
			const shownDisks = disks.slice(0, CAPTION_DRIVES);
			const hidden = disks.length - shownDisks.length;
			const shares = shownDisks.map((d) => t("card.sys-disk.left", {
				mount: d.mount,
				pct: pctOf(d)
			})).join(" · ") + (hidden > 0 ? ` ${t("card.sys-disk.more", { n: hidden })}` : "");
			const home = meta?.sim?.noHome === true ? null : machine.home;
			const byteLabels = disks.length <= MAX_BYTE_LABELS;
			const bars = disks.map((d) => ({
				label: byteLabels ? `${d.mount} ${fmtBytes$1(d.free)} / ${fmtBytes$1(d.total)}` : `${d.mount} ${pctOf(d)}%`,
				value: pctOf(d),
				ratio: d.ratio,
				tone: freeTone(d.ratio)
			}));
			const proc = machine.proc;
			const cpu = proc && proc.cpuPercent !== null && Number.isFinite(proc.cpuPercent) ? `${proc.cpuPercent}%` : "—";
			const procFacts = proc ? {
				rss: fmtBytes$1(proc.rss),
				cpu,
				uptime: fmtUptime(proc.uptimeSec)
			} : null;
			return {
				title: t("card.sys-disk.title"),
				headAfter: {
					big: `${tight.mount} ${fmtBytes$1(tight.free)}`,
					smallLines: [`${t("card.sys-disk.freeWord")} · ${shares}`, home ? t("card.sys-disk.home", {
						files: home.sessionsFiles,
						size: fmtBytes$1(home.sessionsBytes),
						recent: home.recentFiles
					}) : procFacts ? t("card.sys-disk.proc", procFacts) : "—"]
				},
				valueTone: tight.ratio < FREE_DANGER ? "danger" : void 0,
				chart: {
					kind: "bars",
					bars
				},
				cardHint: procFacts && proc ? t("card.sys-disk.hint", {
					pid: proc.pid,
					...procFacts
				}) : void 0
			};
		}
		var sys_disk_default = defineWidget({
			id: "sys-disk",
			name: () => t("widget.sys-disk.name"),
			desc: () => t("widget.sys-disk.desc"),
			builtin: false,
			group: "device",
			sizes: ["2x4"],
			render: sysDiskRender,
			example: {
				stats: { sysinfo: {
					ts: 0,
					cpu: { util: 43 },
					mem: {
						used: 17.4 * GIB,
						total: 34.2 * GIB,
						percent: 51
					},
					gpu: null,
					machine: {
						ts: 0,
						disks: [{
							mount: "C:",
							total: 3221e8,
							free: 72e9
						}, {
							mount: "D:",
							total: 7006e8,
							free: 675e8
						}],
						home: {
							sessionsFiles: 346,
							sessionsBytes: 361736551,
							recentFiles: 13
						},
						proc: {
							pid: 28536,
							rss: 55e7,
							cpuPercent: 2.1,
							uptimeSec: 14059
						}
					}
				} },
				sim: { noHome: false },
				simSteps: [{ noHome: false }, { noHome: true }]
			},
			simToggle: () => t("widget.sys-disk.simToggle")
		});
		//#endregion
		//#region src/widgets/window-forecast/index.ts
		/**
		* 窗口预测 (window-forecast) — will the 5h / weekly Command Code window run OUT
		* before it resets?
		*
		* The rest of the coding-plan family answers 「用了多少」 (额度管理 projects the
		* MONTH, 窗口 draws the three used-percents). None of them answers the question a
		* long task actually dies on: 「还有 40 分钟就重置了，可按现在的速度 20 分钟后就打满」.
		*
		*   「窗口预测」                    blue title (13px)
		*   「118%」                        headAfter.big — the WORSE of the two windows'
		*                                   projected occupancy at its reset (20px)
		*   「5h · 预计 1h14m 后打满」        legend — WHICH window that figure is, and
		*                                   its verdict (grey 10px)
		*   ──────────────────────────────  hairline, then the three rows on the floor
		*   「5h              118% 预计」
		*   「周               63% 预计」
		*   「剩余重置           2h0m」      the NEARER of the two resets
		*
		* WHAT IS PROJECTED (`projectWindow`, pure + exported so it can be reviewed):
		*   The provider reports `used` / `cap` and the wall-clock `resetAt` per window,
		*   so the window's natural start is `resetAt − length` (5h / 7d — the provider's
		*   OWN definition, never "since this session started", which is a different and
		*   unverifiable clock) and the pace is `used ÷ elapsed` over that span:
		*
		*     fiveHour: used 6, cap 10, resets in 1h  → start 4h ago, rate 1.5/h
		*               projected = 6 + 1.5×1 = 7.5 → 75% ⇒ 重置前不会打满
		*               time to cap = (10 − 6) ÷ 1.5 = 2h40m > 1h left
		*     weekly:   used 30, cap 40, resets in 2d → start 5d ago, rate 6/day
		*               projected = 30 + 6×2 = 42 → 105% ⇒ 会打满
		*               time to cap = (40 − 30) ÷ 6 = 1d16h < 2d left
		*   ⇒ head figure 105% (the worse of the two), legend 「周 · 预计 1d16h 后打满」,
		*     rows 75% / 105%. Every number on the card comes out of that one function.
		*
		* DEGRADATION — 「宁可 — 不猜」, the family's rule. A window whose reading cannot
		* support a projection prints `—` muted and never borrows another window's pace:
		*   - `used` / `cap` / `resetAt` missing or non-finite, or `cap <= 0`;
		*   - `resetAt` in the past — a stale payload; the window has already rolled and
		*     extrapolating to a past instant is meaningless;
		*   - `elapsed <= 0` (the reset is further out than the window is long: a clock or
		*     timezone artefact) — the spec's own line — and `elapsed < MIN_ELAPSED_MS`,
		*     its near-degenerate case: extrapolating the first seconds of a fresh window
		*     multiplies one call's cost into a four-digit percent.
		*   Both windows unprojectable ⇒ `render` returns null (the card has nothing to
		*   say). An absent payload with a recorded host error also returns null: 「未配置
		*   Command Code」 is cc-whoami's and 额度管理's sentence, and a third copy of it
		*   would add no fact (SPECS §7's dedup rule).
		*
		* TONE DIRECTION — this is OCCUPANCY, so HIGH IS BAD (danger / warn) — the
		* OPPOSITE of the cache hit rate. Thresholds: `> 1.0` danger (the cap really is
		* reached before the reset) and `> 0.9` warn. The 10% band is deliberate: the
		* projection is a straight-line extrapolation, and one burst of long turns eats
		* 10% of a window, so a window at 91% "in theory safe" deserves amber before it
		* turns red. The FIGURE carries the same two rungs (`valueTone` gained `warn` with
		* this batch), so the head never reads calmer than the rows below it — and the
		* renderer still never guesses a tone from a ratio: the widget decides.
		*
		* SCOPE — `stats.commandCode.credits.windowLimits` only, the FOURTH official
		* slice of ONE Command Code account (the payload's first pool member). `used` /
		* `cap` are Command Code CREDITS, never tokens. `usageData` (OpenCode's own
		* rolling / weekly / monthly percentages) is deliberately NOT mixed in: the two
		* are different accounts in different units, and blending them would print a
		* precise-looking number that is exactly wrong at the moment the card matters.
		*/
		/** The window lengths the provider's reset implies (`resetAt − length` = the
		*  window's natural start): five hours and one week. Both are the provider's own
		*  definitions, confirmed by the caps it reports (the 5h cap is 20% of the
		*  monthly allowance, the weekly cap 50%). */
		const HOUR_MS = 36e5;
		const DAY_MS = 864e5;
		const FIVE_HOUR_MS = 5 * HOUR_MS;
		const WEEK_MS = 7 * DAY_MS;
		/** The `—` a window with no usable reading prints. Never a fabricated 0: 「没有读数」
		*  and 「读数是 0」 are two different statements. */
		const DASH$4 = "—";
		/** Shortest elapsed span a projection may be built on. The spec's own
		*  `elapsed <= 0` line is the degenerate case of 「窗口刚开始」; a minute is the
		*  shortest span in which a rate is not simply one call's cost × 60 (measured
		*  reasoning, not a tuned number: at 5 seconds one credit projects to 720/hour,
		*  i.e. 1 400% of a 5h window for a single request). Below it the window prints
		*  `—` muted, exactly like an unreadable one. */
		const MIN_ELAPSED_MS = 6e4;
		/** Occupancy thresholds (see the tone note in the header): the cap is reached
		*  before the reset above 1.0, and 0.9 keeps the straight-line margin. */
		const DANGER_RATIO = 1;
		const WARN_RATIO = .9;
		/** The preview's second clock (a preview-only constant, see `example`): read the
		*  same payload 45 minutes later and the 5h window has settled from 118% to 94%
		*  — the amber band just under the cap, the one state whose tone is neither red
		*  nor absent. */
		const PREVIEW_WARN_AHEAD_MS = 27e5;
		/**
		* Project ONE window to its reset, or `null` when the reading cannot carry a
		* projection (every case is listed in the header). Pure: the caller passes the
		* clock, so the arithmetic is reviewable without a session.
		*
		* @param win - the window slice (`used` / `cap` / `resetAt`, epoch ms).
		* @param lengthMs - the window's own length (5h / 7d).
		* @param now - epoch ms of the reading.
		*/
		function projectWindow(win, lengthMs, now) {
			const used = win?.used;
			const cap = win?.cap;
			const resetAt = win?.resetAt;
			if (typeof used !== "number" || !Number.isFinite(used) || used < 0) return null;
			if (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0) return null;
			if (typeof resetAt !== "number" || !Number.isFinite(resetAt)) return null;
			const left = resetAt - now;
			if (left <= 0) return null;
			const elapsed = now - (resetAt - lengthMs);
			if (elapsed < MIN_ELAPSED_MS) return null;
			const rate = used / Math.max(1, elapsed);
			return {
				ratio: (used + rate * left) / cap,
				fillMs: rate > 0 ? Math.max(0, (cap - used) / rate) : Number.POSITIVE_INFINITY,
				resetMs: left
			};
		}
		/**
		* The card's duration ladder for its two countdowns (time-to-full, time-to-reset).
		*
		* Under an hour it IS the shared `fmtDuration` (`45.2s` / `12m30s`). Above it, the
		* shared formatter only has minutes and seconds — a 2h11m wait prints `131m0s`
		* and a weekly window `10080m0s`, eight characters that overrun the ~126px grey
		* legend line and ellipsize it, which reads as a truncated error rather than a
		* countdown. So the two upper rungs (`2h11m`, `6d23h`) are added HERE, in this
		* unit, instead of changing a formatter every other card reads. Both of this
		* card's durations go through this one function, so their units always agree.
		*/
		function fmtSpan(ms) {
			if (!Number.isFinite(ms)) return DASH$4;
			const v = Math.max(0, ms);
			const rounded = Math.round(v / 1e3) * 1e3;
			if (rounded < HOUR_MS) return fmtDuration(v);
			if (rounded < DAY_MS) return `${Math.floor(rounded / HOUR_MS)}h${Math.floor(rounded % HOUR_MS / 6e4)}m`;
			return `${Math.floor(rounded / DAY_MS)}d${Math.floor(rounded % DAY_MS / HOUR_MS)}h`;
		}
		/** Occupancy tone: high is bad, and only a real overrun is red (see the header). */
		function ratioTone(ratio) {
			if (ratio > DANGER_RATIO) return "danger";
			if (ratio > WARN_RATIO) return "warn";
		}
		/** The window's name as the card prints it (the legend prefix and the row label). */
		function windowName(key) {
			return key === "fiveHour" ? t("card.window-forecast.win5h") : t("card.window-forecast.winWeekly");
		}
		function windowForecastRender(stats, meta) {
			const limits = stats.commandCode?.credits?.windowLimits ?? null;
			const ahead = typeof meta?.sim?.aheadMs === "number" && Number.isFinite(meta.sim.aheadMs) ? meta.sim.aheadMs : 0;
			const at = Date.now() + ahead;
			const fiveHour = projectWindow(limits?.fiveHour, FIVE_HOUR_MS, at);
			const weekly = projectWindow(limits?.weekly, WEEK_MS, at);
			const candidates = [];
			if (fiveHour !== null) candidates.push({
				key: "fiveHour",
				f: fiveHour
			});
			if (weekly !== null) candidates.push({
				key: "weekly",
				f: weekly
			});
			if (candidates.length === 0) return null;
			const head = candidates.reduce((a, b) => b.f.ratio > a.f.ratio ? b : a);
			const willFill = head.f.ratio > DANGER_RATIO;
			const verdict = willFill ? t("card.window-forecast.fillIn", { d: fmtSpan(head.f.fillMs) }) : t("card.window-forecast.noFill", { d: fmtSpan(head.f.resetMs) });
			const legend = `${windowName(head.key)} · ${verdict}`;
			const row = (key, f) => {
				const label = windowName(key);
				if (f === null) return {
					label,
					value: DASH$4,
					tone: "muted"
				};
				const tone = ratioTone(f.ratio);
				return {
					label,
					value: `${Math.round(f.ratio * 100)}% ${t("card.window-forecast.projected")}`,
					...tone !== void 0 ? { tone } : {}
				};
			};
			const resets = [limits?.fiveHour?.resetAt, limits?.weekly?.resetAt].filter((ms) => typeof ms === "number" && Number.isFinite(ms) && ms > at).map((ms) => ms - at);
			const resetRow = resets.length > 0 ? {
				label: t("card.window-forecast.resetLeft"),
				value: fmtSpan(Math.min(...resets))
			} : {
				label: t("card.window-forecast.resetLeft"),
				value: DASH$4,
				tone: "muted"
			};
			return {
				title: t("card.window-forecast.title"),
				headAfter: { big: `${Math.round(head.f.ratio * 100)}%` },
				legend,
				bodyAnchor: "bottom",
				...willFill ? { valueTone: "danger" } : ratioTone(head.f.ratio) === "warn" ? { valueTone: "warn" } : {},
				chart: {
					kind: "breakdown",
					breakdown: [
						row("fiveHour", fiveHour),
						row("weekly", weekly),
						resetRow
					]
				}
			};
		}
		/**
		* The market / 组件配置 preview's OWN numbers — a second, independent instance of
		* the same arithmetic, so the card is reviewable with no Command Code account.
		*
		* The 5h window is the dangerous one on purpose (the whole reason this card
		* exists): it has burned 9.9 of its 14 credits in the 2h59m30s since its window
		* opened, so it reads 118% projected, i.e. full 1h14m before it resets, while the
		* weekly window is calm at 63%.
		*
		* The +30s cushion on both resets is deliberate: the projection is read a moment
		* after this module is evaluated, and an exact 2h00m00s boundary would print
		* `1h59m` (the countdown floors) on a fast machine and `2h0m` on a slow one — one
		* shared number for every preview run is worth more than thirty seconds of
		* punctuality.
		*/
		function previewStats$1() {
			const now = Date.now();
			return { commandCode: {
				whoami: null,
				usage: null,
				credits: {
					credits: null,
					windowLimits: {
						limited: false,
						exceeded: null,
						fiveHour: {
							used: 9.9,
							cap: 14,
							exceeded: false,
							resetAt: now + 2 * HOUR_MS + 3e4
						},
						weekly: {
							used: 12.6,
							cap: 35,
							exceeded: false,
							resetAt: now + 3 * DAY_MS + 3e4
						}
					}
				},
				subscription: null
			} };
		}
		var window_forecast_default = defineWidget({
			id: "window-forecast",
			name: () => t("widget.window-forecast.name"),
			desc: () => t("widget.window-forecast.desc"),
			builtin: true,
			group: "coding-plan",
			sizes: ["2x2"],
			simToggle: () => t("widget.window-forecast.simToggle"),
			render: windowForecastRender,
			example: {
				stats: previewStats$1(),
				sim: {},
				simSteps: [
					{},
					{ aheadMs: PREVIEW_WARN_AHEAD_MS },
					{ aheadMs: HOUR_MS }
				]
			}
		});
		//#endregion
		//#region src/widgets/sys-net/index.ts
		/**
		* 网络吞吐 — the machine's live receive / transmit rate (2026-09-29, first card of
		* the host `/api/host/overview` family).
		*
		* WHAT IT ANSWERS: 「装依赖、拉模型、传大文件的时候为什么这么慢」. The sys family
		* already shows CPU, memory, GPU and disk; the network was the one resource with
		* no gauge at all, and it is precisely the one that explains a download crawling
		* while every other reading looks idle.
		*
		* WHY THE FIGURE IS THE DOWNLINK: almost every wait a coding agent has is a
		* DOWNLOAD (packages, weights, pages, docs). The uplink is usually an order of
		* magnitude smaller, so it rides the grey caption and the second detail row
		* instead of spending the 20px rung of the head's ladder.
		*
		* WHY THERE IS NO TONE AND NO RING: throughput is a READING, not a verdict — 2 MB/s
		* is not "good" and 0 B/s is not "bad" (an idle machine is a healthy machine). A
		* ring would additionally need a denominator, and a rate has none: a share of
		* what? This is the same call 内存大户 makes, and it is why the thresholds this
		* widget owns are DISPLAY budgets (see the label-budget note on `shortAdapter`)
		* rather than colour steps.
		*
		* THE ONE HONEST AMBIGUITY: `net` is derived from CUMULATIVE adapter counters
		* (`Win32_PerfRawData_Tcpip_NetworkInterface`), so the very first call can only
		* store a baseline and must answer null — that is "not measured YET", which the
		* shell paints as a skeleton (this unit declares `source: 'sys'`), never as
		* `0 B/s`. A real zero (two samples, no traffic) is a legal READING and renders
		* normally, which is why the null branch below is the ONLY path that returns null.
		*
		* TONE DIRECTION — the widget's own: none. Every rate, row and name prints in the
		* default ink; the only tone used is `muted` on the 最忙 row when the host
		* reported a throughput with no per-adapter entry to name (an adapter that was
		* re-enumerated between the two samples), where `—` is the truth.
		*/
		/** The em dash a row with nothing to report shows — the same placeholder 任务 /
		*  工具调用 use, never a fabricated 0. */
		const DASH$3 = "—";
		/** Steps between rate units. BINARY, matching the repo's own byte arithmetic
		*  (`fmtGb` in the sys family divides by 1024**3 and still calls the result GB):
		*  one card must not print 1000-based KB/s beside a 1024-based GB. */
		const RATE_STEP = 1024;
		const RATE_UNITS = [
			"B/s",
			"KB/s",
			"MB/s",
			"GB/s"
		];
		/**
		* Bytes/second → `0 B/s` / `850 B/s` / `84 KB/s` / `1.2 MB/s`.
		*
		* WHY NOT `fmtTokens`: that helper formats a TOKEN MAGNITUDE — its steps are
		* 1000/1e6 and it prints a bare `12.2K` with no unit, because a token count needs
		* none. A rate is meaningless without its unit (12.2K of what per second?), and
		* its steps are binary. The two formatters are not interchangeable even though
		* both take "a number".
		*
		* One decimal below 10, whole numbers above: at the 10px body font a rate column
		* showing `1.24 MB/s` is noise, and the row is shared with a label.
		*/
		function fmtRate(bps) {
			let value = Number.isFinite(bps) && bps > 0 ? bps : 0;
			let unit = 0;
			while (value >= RATE_STEP && unit < RATE_UNITS.length - 1) {
				value /= RATE_STEP;
				unit += 1;
			}
			const oneDecimal = Math.round(value * 10) / 10;
			return `${unit === 0 || oneDecimal >= 10 ? String(Math.round(oneDecimal)) : oneDecimal.toFixed(1)} ${RATE_UNITS[unit]}`;
		}
		/**
		* The technology token inside a Windows adapter name, and the two ways this card
		* shortens that name.
		*
		* A Windows adapter name is `<vendor> <technology> <model> <rate> …`
		* (`MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card`), and all of it is far too
		* long for a 150px tile. The VENDOR is the one token that does not help tell two
		* adapters apart — this machine's Wi-Fi, Hyper-V and Loopback entries have three
		* different vendors, and nobody refers to an adapter by its vendor. The
		* technology token is how they are actually named, so both shortened forms are
		* built from it:
		*
		*   - the LEGEND prints the token alone (`Wi-Fi 6E`): it shares its single line
		*     with the uplink rate;
		*   - the 最忙 row starts AT the token and then takes as many characters as the
		*     value column can hold (`Wi-Fi 6E MT7922…`), so the technology AND the chip
		*     model survive where `MediaTek Wi-Fi 6…` would have spent the budget on the
		*     vendor.
		*
		* An OEM-only name with no token (`Realtek PCIe GbE Family Controller`) is left
		* alone: there is nothing to drop, and its head is then the best there is.
		*/
		const ADAPTER_TECH_RE = /(Wi-?Fi\s?[0-9][A-Za-z]?|Wi-?Fi|Ethernet|Bluetooth|WLAN|Hyper-V|Loopback|TAP|VPN|Thunderbolt)/i;
		/** The token alone — the ROW LABEL's form (`MediaTek Wi-Fi 6E MT7922 …` → `Wi-Fi 6E`). */
		function shortAdapter(name) {
			const hit = ADAPTER_TECH_RE.exec(name);
			if (hit !== null) return hit[1].replace(/\s+/g, " ").trim();
			return name.trim().split(/\s+/)[0] ?? name;
		}
		/**
		* NOTE ON THE LABEL BUDGET (integration edit, 2026-09-29).
		*
		* The first version of this card printed `下沉 / 上行 / 最忙` and the full adapter
		* name in a row, which cost it a 13-character budget measured against the
		* breakdown's SHARED `1fr auto` grid: the longest VALUE sets the value track and
		* the label column takes what is left, including a 14px right-edge fade mask. On
		* this machine's real names (`MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card`,
		* `Hyper-V Virtual Ethernet Adapter`, `Loopback Pseudo-Interface 1`, `Realtek PCIe
		* GbE Family Controller`) 13 characters was the largest uniform count that fit.
		*
		* The card no longer needs that budget: the rows are now the adapters themselves
		* and their label is the short token (≤ ~9 characters), while the value is a rate
		* (~55px). The measurement is kept here because the NEXT change to these rows has
		* the same constraint, and re-deriving it costs a browser session.
		*/
		/** The adapter name this machine really reports — used by the preview sample so
		*  the truncation is exercised on the string it has to survive in production. */
		const SAMPLE_ADAPTER = "MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card";
		/**
		* The all-zero reading the preview pins (`sim.mode === 'idle'`).
		*
		* Zero traffic is a LEGAL reading, not a missing one, and the acceptance for this
		* card names it explicitly — so it gets its own preview cell instead of waiting
		* for the machine to go quiet at screenshot time.
		*/
		const IDLE_NET = {
			adapters: [{
				name: SAMPLE_ADAPTER,
				rxBps: 0,
				txBps: 0
			}],
			rxBps: 0,
			txBps: 0
		};
		/** The preview's host slice: only `net` is meaningful here, but HostOverview is
		*  one object, so the sibling sections are declared empty rather than omitted. */
		const SAMPLE_HOST = {
			ts: 0,
			net: {
				adapters: [
					{
						name: SAMPLE_ADAPTER,
						rxBps: 1258291,
						txBps: 90112
					},
					{
						name: "Hyper-V Virtual Ethernet Adapter",
						rxBps: 12288,
						txBps: 4096
					},
					{
						name: "Loopback Pseudo-Interface 1",
						rxBps: 0,
						txBps: 0
					}
				],
				rxBps: 1270579,
				txBps: 94208
			},
			power: null,
			procs: null,
			services: [],
			proxy: null
		};
		/**
		* The net slice this render reads: the live one, or the state the offline preview
		* pinned (`meta.sim.mode`, see `example.simSteps`). `sim` is only ever set by the
		* preview surfaces (market / 组件配置) — the rail passes just the size — so this
		* cannot pin a state on a live card.
		*/
		function netSlice(stats, meta) {
			const mode = meta?.sim?.mode;
			if (mode === "cold") return null;
			if (mode === "idle") return IDLE_NET;
			return stats.host?.net ?? null;
		}
		var sys_net_default = defineWidget({
			id: "sys-net",
			name: () => t("widget.sys-net.name"),
			desc: () => t("widget.sys-net.desc"),
			builtin: false,
			group: "device",
			sizes: ["2x2"],
			render: (stats, meta) => {
				const net = netSlice(stats, meta);
				if (net === null) return null;
				return {
					title: t("card.sys-net.title"),
					headAfter: { big: fmtRate(net.rxBps) },
					legend: net.adapters.length === 0 ? `↑ ${fmtRate(net.txBps)}` : `↑ ${fmtRate(net.txBps)} · ${t("card.sys-net.adapters", { n: net.adapters.length })}`,
					bodyAnchor: "bottom",
					chart: {
						kind: "breakdown",
						breakdown: net.adapters.length === 0 ? [{
							label: t("card.sys-net.busiest"),
							value: DASH$3,
							tone: "muted"
						}] : net.adapters.slice(0, 3).map((adapter) => ({
							label: shortAdapter(adapter.name),
							value: fmtRate(adapter.rxBps)
						}))
					}
				};
			},
			simToggle: () => t("card.sys-net.simToggle"),
			example: {
				stats: { host: SAMPLE_HOST },
				sim: { mode: "live" },
				simSteps: [
					{ mode: "live" },
					{ mode: "idle" },
					{ mode: "cold" }
				]
			}
		});
		//#endregion
		//#region src/widgets/sys-power/index.ts
		/**
		* 供电 (Power) — the battery / mains card.
		*
		* WHY IT EXISTS: a long unattended run dies for boring reasons, and the most
		* common one is the mains cable. On battery Windows throttles the CPU and, at the
		* end, sleeps the machine — the session simply stops. Nothing on the rail said
		* which of the two states the machine is in before this card, so the failure
		* arrived unexplained.
		*
		* WHAT IT READS: `stats.host?.power` (`HostPower` from `/api/host/overview`) —
		* `{ onAc, percent, minutesLeft, scheme }`. The host has already done the two
		* hard parts, so this card does NEITHER:
		*   - Win32's `EstimatedRunTime = 71582788` (0x4444444) sentinel, which means
		*     "mains power / unknown" and used to read as 71582788 minutes left, is
		*     folded to `null` host-side. Here `minutesLeft === null` is just "no
		*     estimate" — there is deliberately no sentinel arithmetic in this file.
		*   - `powercfg` prints a LOCALIZED prefix (`电源方案 GUID: … (平衡)`); the host
		*     keeps only the parenthesised name. The scheme is therefore printed
		*     VERBATIM — never mapped to an English/Chinese table of our own, because
		*     mapping would silently disagree with the machine's own Settings page.
		*
		* WHY THE ELEMENTS SIT WHERE THEY DO (the house head ladder, AGENT-BRIEF §2):
		* the blue 13px title, then the charge as the 20px figure in `headAfter.big`
		* (`value` would be pushed into the body and printed twice), then one grey
		* `legend` line carrying the two facts that have no row budget — the source and
		* the power scheme. The three-row breakdown sits on the card's FLOOR
		* (`bodyAnchor: 'bottom'`): a `headAfter` head alone would leave the slack
		* underneath the rows instead of above them.
		*
		* NO HEAD RING on purpose. A ring is the design language for a SHARE of a whole
		* (the cache hit rate, the context water level). A battery percent is not a
		* share of anything the card can name, and the circle would eat the 20px figure's
		* width for nothing.
		*
		* TONE DIRECTION — this card is the INVERSE of every busy-machine card next to
		* it, and that is the widget's own call (see the thresholds below): a LOW charge
		* is what is wrong, so the figure goes amber under 20% and red under 10%. Nothing
		* is tinted while charging. A high number here is the good state, which is why
		* the rule lives in this file and not in the renderer.
		*/
		/** Below this charge, on battery only, the figure turns AMBER. 20% is the level
		*  at which Windows itself starts its own low-battery warning, so the card agrees
		*  with the OS instead of inventing a second opinion. */
		const WARN_PERCENT = 20;
		/** Below this charge the figure turns RED — the point where the battery is about
		*  to become the reason a long run dies. */
		const DANGER_PERCENT = 10;
		/** The em dash a reading with no value shows — the same placeholder 任务/工具调用
		*  use, never a fabricated 0. `—` and `0` are different statements: an unknown
		*  charge is not an empty battery. */
		const DASH$2 = "—";
		/**
		* The readings the offline preview steps through (`example.simSteps`), keyed by
		* the name `meta.sim.power` carries.
		*
		* `scheme: '平衡'` is MOCK DATA, not a label: the card prints the machine's own
		* word, and this is the word the authoring machine's `powercfg` returns. It is
		* deliberately not put through `t()` — a translated scheme name would be a lie
		* about what the OS said.
		*/
		const SIM_POWER = {
			ac: {
				onAc: true,
				percent: 100,
				minutesLeft: null,
				scheme: "平衡"
			},
			battery: {
				onAc: false,
				percent: 42,
				minutesLeft: 134,
				scheme: "平衡"
			},
			low: {
				onAc: false,
				percent: 14,
				minutesLeft: 41,
				scheme: "平衡"
			},
			critical: {
				onAc: false,
				percent: 6,
				minutesLeft: 17,
				scheme: "平衡"
			},
			desktop: {
				onAc: true,
				percent: null,
				minutesLeft: null,
				scheme: "平衡"
			}
		};
		/**
		* The tone the figure wears, from the ONE rule this card owns.
		*
		* `onAc !== false` deliberately includes `onAc === null` ("the host could not
		* tell"): an unknown source is not evidence of discharging, and tinting it amber
		* would be a claim the reading does not support.
		*/
		function powerTone(onAc, percent) {
			if (onAc !== false || percent === null) return void 0;
			if (percent < DANGER_PERCENT) return "danger";
			if (percent < WARN_PERCENT) return "warn";
		}
		/** The simulated reading, when the preview asks for one (`meta.sim.power`). */
		function simPower(meta) {
			const name = meta?.sim?.power;
			return typeof name === "string" ? SIM_POWER[name] ?? null : null;
		}
		/** The word for where the power comes from (the legend and the 供电 row). */
		function sourceWord(onAc, short) {
			if (onAc === true) return short ? t("card.sys-power.source.ac") : t("card.sys-power.ac");
			if (onAc === false) return t("card.sys-power.source.battery");
			return t("card.sys-power.source.unknown");
		}
		function sysPowerRender(stats, meta) {
			const power = simPower(meta) ?? stats.host?.power ?? null;
			if (power === null) return null;
			const { onAc, percent, minutesLeft, scheme } = power;
			const noBattery = onAc === true && percent === null;
			const tone = powerTone(onAc, percent);
			const legend = noBattery ? t("card.sys-power.desktop") : scheme === null ? sourceWord(onAc, true) : `${sourceWord(onAc, true)} · ${scheme}`;
			const hint = minutesLeft !== null ? void 0 : noBattery ? t("card.sys-power.hintDesktop") : onAc === true ? t("card.sys-power.hintAc") : t("card.sys-power.hintUnknown");
			const rows = [
				onAc === null ? {
					label: t("card.sys-power.row.source"),
					value: DASH$2,
					tone: "muted"
				} : {
					label: t("card.sys-power.row.source"),
					value: sourceWord(onAc, false)
				},
				minutesLeft === null ? {
					label: t("card.sys-power.row.left"),
					value: DASH$2,
					tone: "muted"
				} : {
					label: t("card.sys-power.row.left"),
					value: fmtDuration(minutesLeft * 6e4)
				},
				scheme === null ? {
					label: t("card.sys-power.row.scheme"),
					value: DASH$2,
					tone: "muted"
				} : {
					label: t("card.sys-power.row.scheme"),
					value: scheme
				}
			];
			return {
				title: t("card.sys-power.title"),
				headAfter: { big: percent === null ? DASH$2 : `${percent}%` },
				legend,
				bodyAnchor: "bottom",
				...percent === null ? { valueTone: "muted" } : tone === void 0 ? {} : { valueTone: tone },
				...hint === void 0 ? {} : { cardHint: hint },
				chart: {
					kind: "breakdown",
					breakdown: rows
				}
			};
		}
		var sys_power_default = defineWidget({
			id: "sys-power",
			name: () => t("widget.sys-power.name"),
			desc: () => t("widget.sys-power.desc"),
			builtin: true,
			group: "device",
			sizes: ["2x2"],
			render: sysPowerRender,
			simToggle: () => t("card.sys-power.simToggle"),
			example: {
				stats: { host: {
					ts: 0,
					net: null,
					power: SIM_POWER.ac,
					procs: null,
					services: [],
					proxy: null
				} },
				sim: { power: "ac" },
				simSteps: [
					{ power: "ac" },
					{ power: "battery" },
					{ power: "low" },
					{ power: "critical" },
					{ power: "desktop" }
				]
			}
		});
		//#endregion
		//#region src/widgets/sys-procs/index.ts
		/** The em dash printed when a reading is genuinely absent — the same placeholder
		*  工具调用 / 任务 use. Never a fabricated 0. */
		const DASH$1 = "—";
		/** Byte units, 1024-based — the ladder Windows' own task manager reports memory
		*  in (KB / MB / GB on binary steps). */
		const BYTE_UNITS = [
			"B",
			"KB",
			"MB",
			"GB",
			"TB"
		];
		/**
		* Format a byte count the way the machine's own task manager does: `1.7 GB`,
		* `650 MB`, `812 KB`.
		*
		* WHY NOT `fmtTokens` (the shared formatter every other card uses): it is a TOKEN
		* formatter, and its ladder is K/M with no unit letter, no space and a DECIMAL
		* step — because a token count has no physical unit. Fed bytes it would print the
		* 1.69 GB winner as `1690M` (wrong scale, no unit, off by the 1000-vs-1024 factor
		* that matters on a memory reading), and every row on this card would become a
		* token-shaped string on a card that has nothing to do with tokens. A byte count
		* carries its unit and its binary step; that belongs in this unit's own directory,
		* not in the shared formatter (BRIEF §3/§5).
		*/
		function fmtBytes(bytes) {
			if (!Number.isFinite(bytes) || bytes < 0) return DASH$1;
			let value = bytes;
			let unit = 0;
			while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
				value /= 1024;
				unit += 1;
			}
			return `${unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${BYTE_UNITS[unit]}`;
		}
		/** The process's own image name, trimmed; `—` when the host gave none — an absent
		*  NAME is not an absent reading, so the row still prints its figure. */
		function baseName(proc) {
			const name = typeof proc.name === "string" ? proc.name.trim() : "";
			return name === "" ? DASH$1 : name;
		}
		/**
		* The label for each entry this card actually draws, in draw order.
		*
		* The list is PER PROCESS, so a multi-process program (Edge / Chrome / anything
		* Electron) legitimately owns several of the top ranks — and measured against a
		* mock with two `msedge` entries (2026-09-29, this unit's own screenshot review),
		* two identical labels over two different figures reads as a RENDERING BUG rather
		* than as "two browser processes". The pid is therefore appended to a name ONLY
		* when that name occurs more than once among the entries being drawn (the head's
		* caption included, so the caption and its rows stay consistent) — the ordinary
		* all-distinct case keeps the bare name, so this costs the card nothing when there
		* is nothing to disambiguate.
		*
		* WHY THE NAMES ARE NOT SUMMED instead (which is what Task Manager's Processes
		* tab shows): this list is the host's TOP EIGHT by working set, so a program whose
		* ninth process fell outside that cut would be printed as a total that is really a
		* FLOOR — and this contract has no way to write `≥ 1.2 GB` (the GitHub repo card
		* carries a separate `issueCountCapped` flag for exactly that reason). Every
		* figure on this card stays exactly ONE process's working set.
		*/
		function labelsFor(entries) {
			const count = /* @__PURE__ */ new Map();
			for (const proc of entries) {
				const name = baseName(proc);
				count.set(name, (count.get(name) ?? 0) + 1);
			}
			return entries.map((proc) => {
				const name = baseName(proc);
				return (count.get(name) ?? 0) > 1 && Number.isFinite(proc.pid) ? `${name} · ${proc.pid}` : name;
			});
		}
		function sysProcsRender(stats, meta) {
			const procs = stats.host?.procs;
			if (!Array.isArray(procs) || procs.length === 0) return null;
			const ranked = procs.slice().sort((a, b) => b.rss - a.rss);
			const cap = typeof meta?.sim?.procs === "number" ? meta.sim.procs : null;
			const visible = (cap === null ? ranked : ranked.slice(0, Math.max(0, cap))).slice(0, 4);
			const labels = labelsFor(visible);
			const top = visible[0];
			if (top === void 0) return null;
			const rows = visible.slice(1).map((proc, index) => ({
				label: labels[index + 1] ?? baseName(proc),
				value: fmtBytes(proc.rss)
			}));
			return {
				title: t("card.sys-procs.title"),
				headAfter: { big: fmtBytes(top.rss) },
				legend: labels[0] ?? baseName(top),
				bodyAnchor: "bottom",
				...rows.length > 0 ? { chart: {
					kind: "breakdown",
					breakdown: rows
				} } : {}
			};
		}
		var sys_procs_default = defineWidget({
			id: "sys-procs",
			name: () => t("widget.sys-procs.name"),
			desc: () => t("widget.sys-procs.desc"),
			builtin: false,
			group: "device",
			sizes: ["2x2"],
			render: sysProcsRender,
			simToggle: () => t("widget.sys-procs.simToggle"),
			example: {
				stats: { host: {
					ts: 0,
					net: null,
					power: null,
					services: [],
					proxy: null,
					procs: [
						{
							pid: 412,
							name: "Memory Compression",
							rss: 1815e6
						},
						{
							pid: 11224,
							name: "node",
							rss: 681574400
						},
						{
							pid: 9016,
							name: "msedge",
							rss: 512753664
						},
						{
							pid: 2244,
							name: "SecurityHealthService",
							rss: 473956352
						},
						{
							pid: 3808,
							name: "MsMpEng",
							rss: 134217728
						},
						{
							pid: 5120,
							name: "explorer",
							rss: 100663296
						}
					]
				} },
				sim: { procs: 8 },
				simSteps: [{ procs: 8 }, { procs: 1 }]
			}
		});
		//#endregion
		//#region src/widgets/session-cost/pricing.ts
		/** A token count from an untrusted payload: finite, non-negative, integral. */
		function tokens(value) {
			return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
		}
		/**
		* Split `usage` into the three billable buckets.
		*
		* HAND-WORKED EXAMPLE (the mock this unit's preview uses):
		*   usage = { inputTokens: 18_600_000, cacheReadTokens: 18_400_000, outputTokens: 75_600 }
		*   uncached  = 18_600_000 − 18_400_000 = 200_000
		*   cacheRead = 18_400_000
		*   output    = 75_600
		*
		* `uncached` is CLAMPED at 0 (`max(0, …)`, as the owner asked): a payload whose
		* cache reads exceed its input would otherwise bill a negative amount. `cacheRead`
		* itself is reported as given rather than clamped to the input, because the row's
		* job is to print what the session recorded — only the miss-billed REMAINDER is a
		* derived number, and that one may not go negative.
		*/
		function splitUsage(usage) {
			const input = tokens(usage?.inputTokens);
			const cacheRead = tokens(usage?.cacheReadTokens);
			return {
				uncached: Math.max(0, input - cacheRead),
				cacheRead,
				output: tokens(usage?.outputTokens)
			};
		}
		/** Total billable tokens across the three buckets. */
		function totalTokens(b) {
			return b.uncached + b.cacheRead + b.output;
		}
		/**
		* The last path segment of a model id, lowercased — the ONE normal form the
		* matcher compares on.
		*
		* WHY: the real table names the same model both ways. The DeepSeek rules say
		* `deepseek-v4.1-flash` while the Command Code fallback rule says
		* `deepseek/deepseek-v4.1-flash`, and a session route reports whichever the
		* controller stores (`deepseek/deepseek-v4.1-flash`, measured on this machine).
		* Comparing the raw strings would silently miss the official rule — the exact
		* class of bug ("no rule matched, so no money") that looks like a missing table.
		*
		* HAND-WORKED EXAMPLE:
		*   'deepseek/deepseek-v4.1-flash' → 'deepseek-v4.1-flash'
		*   'DEEPSEEK-V4.1-FLASH'          → 'deepseek-v4.1-flash'   (same rule matches)
		*/
		function normalizeModelName(model) {
			if (typeof model !== "string") return "";
			const trimmed = model.trim();
			if (trimmed === "") return "";
			const cut = trimmed.lastIndexOf("/");
			return (cut >= 0 ? trimmed.slice(cut + 1) : trimmed).toLowerCase();
		}
		/**
		* Does a table name pattern select `actual`?
		*
		* SUPPORTED, and the whole supported set (README repeats it):
		*   - exact equality, case-insensitive, after `normalizeModelName`;
		*   - `*` alone → any value;
		*   - a TRAILING `*` → prefix match (`deepseek-*`, `deepseek/*`).
		* NOT supported, on purpose: an interior/wildcard-suffix pattern such as
		* `*-flash` or `deepseek-*-pro`. Such a pattern is unverifiable by eye and would
		* make "which rule did I just apply" unanswerable — a pattern this matcher does
		* not understand simply does not match, and the rule is skipped.
		*/
		function nameMatches(pattern, actual) {
			const p = normalizeModelName(pattern);
			if (p === "") return false;
			if (p === "*") return true;
			if (p.endsWith("*")) return actual.startsWith(p.slice(0, -1));
			return p === actual;
		}
		/** Provider matching: the same pattern language as `nameMatches`. Providers carry
		*  no namespace prefix in practice, so no prefix stripping is applied here — a
		*  provider named `a/b` would be compared verbatim, and the table has none. */
		function providerMatches(pattern, provider) {
			const p = typeof pattern === "string" ? pattern.trim().toLowerCase() : "";
			const a = typeof provider === "string" ? provider.trim().toLowerCase() : "";
			if (p === "") return false;
			if (p === "*") return a !== "";
			if (p.endsWith("*")) return a.startsWith(p.slice(0, -1));
			return p === a;
		}
		/** Is `deepseek/deepseek-v4.1-flash` selected by the rule's own model name? */
		function modelMatches(pattern, model) {
			const actual = normalizeModelName(model);
			if (actual === "") return false;
			return nameMatches(pattern, actual);
		}
		/** An ISO instant, or `null` when the string is absent or unparseable. */
		function instant(value) {
			if (typeof value !== "string" || value.trim() === "") return null;
			const ms = Date.parse(value);
			return Number.isFinite(ms) ? ms : null;
		}
		/**
		* Is the rule inside its own effective window at `now`?
		*
		* `[effectiveFrom, effectiveTo)`: a rule retires AT `effectiveTo` (the table's
		* retired V4 Flash rules end exactly when the V4.1 ones begin, so the two must
		* never both apply at the cutover instant).
		*
		* HAND-WORKED EXAMPLE (2026-09-28, the day this card was written):
		*   rule A: from null       → to 2026-09-10T00:00:00Z  → NOT in force (retired)
		*   rule B: from 2026-09-10 → to null                  → in force
		*   rule C: from "whenever" (unparseable)              → skipped: the card cannot
		*                                                         prove it applies, and an
		*                                                         amount it cannot justify is
		*                                                         not an amount it may print.
		*/
		function ruleIsInForce(rule, now) {
			const ms = now.getTime();
			if (rule.effectiveFrom !== null) {
				const from = instant(rule.effectiveFrom);
				if (from === null || ms < from) return false;
			}
			if (rule.effectiveTo !== null) {
				const to = instant(rule.effectiveTo);
				if (to === null || ms >= to) return false;
			}
			return true;
		}
		/**
		* Pick the ONE rule that may price this session — or `null`, which the card renders
		* as "tokens only" (see discipline 2 at the top of this file).
		*
		* Order of the sieve, and why:
		*  1. provider AND model must both select the route (`providerMatches` /
		*     `modelMatches`). A rule that names only a provider cannot be applied: the
		*     rates belong to a model, not to a vendor;
		*  2. the rule must be inside its effective window (`ruleIsInForce`);
		*  3. of the survivors, the LATEST `effectiveFrom` wins — that is what supersession
		*     means in this table, which keeps retired rules on purpose ("so requests made
		*     while it was in force are not repriced at today's lower rates"). An
		*     unbounded `effectiveFrom` counts as the oldest possible baseline
		*     (`-Infinity`), and an exact tie goes to the LATER row in the file — the
		*     table's own append order, which is how a human writes a correction.
		*
		* HAND-WORKED EXAMPLE (the real pricing.json, 2026-09-28 02:00Z, route
		* provider `deepseek`, model `deepseek/deepseek-v4.1-flash`):
		*   - `deepseek-official-v4-flash-20260731`      model deepseek-v4-flash    → no
		*   - `deepseek-official-v4.1-flash-20260910`    model deepseek-v4.1-flash  → YES
		*   - `deepseek-official-v4-pro-20260813`        model deepseek-v4-pro      → no
		*   - `opencode-go-…` / `commandcode-…` / `ollama-local` (`*`, provider ollama)
		*     → provider mismatch, except `ollama` whose own provider must match too
		*   ⇒ the V4.1 official rule, i.e. legend `官方价 · deepseek-v4.1-flash`.
		*/
		function selectPriceRule(table, route, now) {
			if (table === null || table === void 0) return null;
			if (table.available !== true) return null;
			if (route === null || route === void 0 || route.model.trim() === "") return null;
			let best = null;
			let bestFrom = -Infinity;
			for (const rule of table.rules) {
				if (!providerMatches(rule.provider, route.provider)) continue;
				if (!modelMatches(rule.model, route.model)) continue;
				if (!ruleIsInForce(rule, now)) continue;
				const from = instant(rule.effectiveFrom) ?? -Infinity;
				if (from >= bestFrom) {
					best = rule;
					bestFrom = from;
				}
			}
			return best;
		}
		const DOW = {
			Sun: 0,
			Mon: 1,
			Tue: 2,
			Wed: 3,
			Thu: 4,
			Fri: 5,
			Sat: 6
		};
		/**
		* Read `now` in `timezone` (default UTC — the table's own default, and the zone
		* every shipped rule declares).
		*
		* WHY NOT the machine's local clock: the rules are written in the provider's
		* published zone. Evaluating `01:00–04:00 UTC` against a Beijing laptop's local
		* hour would put the peak window eight hours off — the same "peak judged wrong"
		* failure the 峰谷定价 family already has a scar from. Measured on this machine the
		* strings are `UTC`, so the common path is exact; an unknown/garbage zone id falls
		* back to UTC rather than to the local clock (the rule's text is meaningless in
		* local time either way, and UTC is what an unnamed zone means).
		*
		* HAND-WORKED EXAMPLE: now = 2026-09-28T02:00:00Z, timezone 'UTC'
		*   → { dow: 1 (Monday), mins: 120, timezone: 'UTC', fellBack: false }
		*/
		function clockIn(timezone, now) {
			const tz = typeof timezone === "string" && timezone.trim() !== "" ? timezone.trim() : "UTC";
			try {
				const parts = new Intl.DateTimeFormat("en-US", {
					timeZone: tz,
					weekday: "short",
					hour: "numeric",
					minute: "numeric",
					hourCycle: "h23"
				}).formatToParts(now);
				let dow = -1;
				let hour = -1;
				let minute = -1;
				for (const part of parts) if (part.type === "weekday") dow = DOW[part.value] ?? -1;
				else if (part.type === "hour") hour = Number(part.value);
				else if (part.type === "minute") minute = Number(part.value);
				if (dow >= 0 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return {
					dow,
					mins: hour * 60 + minute,
					timezone: tz,
					fellBack: false
				};
			} catch {}
			return {
				dow: now.getUTCDay(),
				mins: now.getUTCHours() * 60 + now.getUTCMinutes(),
				timezone: "UTC",
				fellBack: tz.toUpperCase() !== "UTC"
			};
		}
		/** `HH:MM` → minutes from midnight, or null when the string is not a clock time. */
		function parseHm(value) {
			if (typeof value !== "string") return null;
			const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
			if (m === null) return null;
			const h = Number(m[1]);
			const min = Number(m[2]);
			if (h > 23 || min > 59) return null;
			return h * 60 + min;
		}
		/** Every weekday, for a peak window that names none. */
		const ALL_DAYS = [
			0,
			1,
			2,
			3,
			4,
			5,
			6
		];
		/**
		* Is `now` inside one of the rule's own peak windows?
		*
		* A window is `{ days, start, end }` in the rule's `timezone`; an empty `days`
		* list is read as EVERY day (the field is unspecified, and a window with no day
		* constraint is a daily window). `start > end` is honoured as a window that
		* crosses midnight (`22:00–02:00`), because that is the only reading of such a
		* pair that is not empty. A window whose clock strings do not parse is skipped —
		* never treated as "all day".
		*
		* HAND-WORKED EXAMPLES (all four shipped rules carry the same two windows
		* `days[1..5] 01:00–04:00` and `days[1..5] 06:00–10:00`, zone UTC):
		*   2026-09-28T02:00Z  Monday   02:00 → in 01:00–04:00                → true
		*   2026-09-28T05:00Z  Monday   05:00 → in neither window            → false
		*   2026-09-28T08:30Z  Monday   08:30 → in 06:00–10:00                → true
		*   2026-09-27T02:00Z  Sunday   02:00 → day 0 is not in [1,2,3,4,5]   → false
		*/
		function isPeakAt(rule, now) {
			if (rule.peakRates === null || rule.peakWindows.length === 0) return false;
			const clock = clockIn(rule.timezone, now);
			for (const window of rule.peakWindows) {
				if (!(window.days.length > 0 ? window.days : ALL_DAYS).includes(clock.dow)) continue;
				const start = parseHm(window.start);
				const end = parseHm(window.end);
				if (start === null || end === null) continue;
				if (start <= end ? clock.mins >= start && clock.mins < end : clock.mins >= start || clock.mins < end) return true;
			}
			return false;
		}
		/**
		* The rate set in effect at `now`: `peakRates` inside a peak window, `rates`
		* otherwise — and `rates` for EVERY hour when the rule publishes no peak split
		* (`peakRates === null`), rather than a guessed multiplier.
		*
		* HAND-WORKED EXAMPLE (real V4.1 Flash official rule):
		*   02:00Z Monday → peak → { inputCacheHit: 0.006, inputCacheMiss: 0.30, output: 1.20 }
		*   05:00Z Monday → off  → { inputCacheHit: 0.003, inputCacheMiss: 0.15, output: 0.60 }
		*/
		function ratesFor(rule, now) {
			if (rule.peakRates !== null && isPeakAt(rule, now)) return {
				rates: rule.peakRates,
				peak: true
			};
			return {
				rates: rule.rates,
				peak: false
			};
		}
		/**
		* Fold the session's buckets into money under one rule.
		*
		* FORMULA (the owner's, per million tokens):
		*   cost = inputCacheMiss × uncached / 1e6
		*        + inputCacheHit  × cacheRead / 1e6
		*        + output         × output / 1e6
		* `cacheWrite` is absent BY CONSTRUCTION: the `usage` contract has no such bucket,
		* so pricing it would mean inventing a 0 (or worse, a share) for costs the card
		* cannot see. The README states this as a known omission.
		*
		* HAND-WORKED EXAMPLE (the preview mock, and the same numbers the card's rows
		* print) — usage = { 18.6M input, 18.4M cacheRead, 75.6K output }, i.e.
		* uncached 200K / cacheRead 18.4M / output 75.6K:
		*
		*   OFF-PEAK (rates 0.003 / 0.15 / 0.60):
		*     200_000     × 0.15  / 1e6 = 0.0300
		*     18_400_000  × 0.003 / 1e6 = 0.0552
		*     75_600      × 0.60  / 1e6 = 0.04536
		*     amount = 0.13056            → the card prints `≈$0.131`
		*
		*   PEAK (peakRates 0.006 / 0.30 / 1.20):
		*     200_000     × 0.30  / 1e6 = 0.0600
		*     18_400_000  × 0.006 / 1e6 = 0.1104
		*     75_600      × 1.20  / 1e6 = 0.09072
		*     amount = 0.26112            → the card prints `≈$0.261`
		*
		*   (The peak set is exactly 2× the off-peak one, which is why applying the wrong
		*   band is a DOUBLED bill rather than a rounding difference — and why the card
		*   says `≈` instead of pretending to know the session's hour-by-hour split.)
		*
		* `fallbackCurrency` is used only when the rule itself names no currency (the
		* table's own `currency` is the natural stand-in); with neither, USD — the unit a
		* bare number would be read in anyway, printed WITH its symbol so it is never
		* ambiguous.
		*/
		function priceSession(rule, usage, now, fallbackCurrency = null) {
			const buckets = splitUsage(usage);
			const choice = ratesFor(rule, now);
			const perMillion = (rate, count) => rate * count / 1e6;
			const rowCost = {
				uncached: perMillion(choice.rates.inputCacheMiss, buckets.uncached),
				cacheRead: perMillion(choice.rates.inputCacheHit, buckets.cacheRead),
				output: perMillion(choice.rates.output, buckets.output)
			};
			return {
				currency: (rule.currency ?? fallbackCurrency ?? "USD").toUpperCase(),
				amount: rowCost.uncached + rowCost.cacheRead + rowCost.output,
				buckets,
				rowCost,
				rates: choice.rates,
				peak: choice.peak,
				estimated: rule.peakRates !== null && rule.peakWindows.length > 0
			};
		}
		/** Currency symbol for the ones this machine is likely to see; anything else is
		*  printed as its ISO code (`CHF 0.42`), never silently as `$`. */
		const CURRENCY_SYMBOLS = {
			USD: "$",
			CNY: "¥",
			RMB: "¥",
			EUR: "€",
			GBP: "£",
			JPY: "¥",
			HKD: "HK$",
			TWD: "NT$"
		};
		/**
		* `$0.131` / `$0` / `<$0.001` / `CHF 1.2` — three significant digits by default,
		* the spend convention this repo already uses for money
		* (`families/cc/renders.ts`), so a cent-scale figure does not print six trailing
		* decimals on a 150px tile.
		*
		* The two edges matter more than the middle:
		*   - a REAL zero prints `$0`. A free route (`sourceType: 'local'`, every rate
		*     genuinely 0) has a true cost of zero, and refusing to print it would be its
		*     own kind of lie — this card distinguishes "zero" from "unknown", and the
		*     unknown case never reaches this function at all (the caller prints no money);
		*   - anything under a tenth of a cent prints `<$0.001` rather than rounding a
		*     real spend down to `$0`.
		*
		* `significant` exists for ONE caller: the per-row shares, which are printed in a
		* three-column grid whose money track may never be narrower than 30px. Measured on
		* the real card (124px grid, `18.4M` + the widest zh label): a 3-significant-digit
		* share (`$0.0552`, 37.6px) leaves 0.6px of slack, while a 2-digit one (`$0.055`,
		* 31.7px) leaves 6.5px. The rows therefore pass 2 and the TOTAL keeps 3 — a
		* deliberate display-precision split, stated in the widget README so nobody reads
		* the rows as an exact decomposition of the figure.
		*
		* HAND-WORKED EXAMPLES: 0 → `$0`; 0.0004 → `<$0.001`; 0.13056 → `$0.131`;
		* 0.03 → `$0.03`; 0.0552 at 2 digits → `$0.055`; 0.13056 in CNY → `¥0.131`;
		* 150.4 → `$150`.
		*/
		function fmtMoney(amount, currency, significant = 3) {
			const code = (currency ?? "USD").toUpperCase();
			const head = CURRENCY_SYMBOLS[code] ?? `${code} `;
			if (!Number.isFinite(amount)) return `${head}0`;
			if (amount === 0) return `${head}0`;
			const abs = Math.abs(amount);
			if (abs < .001) return `<${head}0.001`;
			if (abs >= 100) return `${head}${Math.round(amount)}`;
			return `${head}${Number(amount.toPrecision(significant))}`;
		}
		/**
		* The model name as the legend prints it: the last path segment, so
		* `deepseek/deepseek-v4.1-flash` does not spend its first 9 characters repeating
		* the provider the legend's first word already names. Whatever is still too long
		* for the 150px caption is ellipsized by the renderer — the spec asks for a
		* truncated model name on purpose.
		*/
		function shortModelName(model) {
			if (typeof model !== "string") return "";
			const trimmed = model.trim();
			if (trimmed === "") return "";
			const cut = trimmed.lastIndexOf("/");
			return cut >= 0 ? trimmed.slice(cut + 1) : trimmed;
		}
		/** `sourceType` → the label the legend prints. `unknown` is its own answer: a rule
		*  with no provenance is NOT "official" by default, it is unattributed, and the
		*  card says exactly that. */
		function sourceKindOf(sourceType) {
			switch (sourceType) {
				case "official": return "official";
				case "reseller": return "reseller";
				case "local": return "local";
				case "fallback": return "fallback";
				default: return "unknown";
			}
		}
		//#endregion
		//#region src/widgets/session-cost/index.ts
		/**
		* 会话成本 (session-cost) — what THIS session has cost, in the money of the rule
		* that priced it, with the rule's provenance printed beside it.
		*
		* WHY THE CARD EXISTS: official DeepSeek pricing pays 0.02 CNY/M for a cache HIT
		* and 1 CNY/M for a MISS — a 50× spread inside ONE session's input. Nothing on the
		* rail folds a session into money today (会话 Token prints counts only, and money
		* in this repo has so far belonged to the Command Code plan family, which prints
		* plan occupancy, not session spend). This card is that missing reading.
		*
		* THE FOUR ELEMENTS, AND WHY EACH SITS WHERE IT DOES:
		*   `会话成本`        the blue title (the card's name, not the widget's market name);
		*   `≈$0.131`         the FIGURE row — the session's amount, or the token total when
		*                     no rule would price it (`headAfter.big`, never `value`: a card
		*                     with a headAfter head owns exactly one figure, and `value`
		*                     would be pushed into the body and printed twice);
		*   `官方价 · …`      the grey caption — the amount's PROVENANCE first (`sourceType`
		*                     localized) and the model name after it. This is the card's
		*                     discipline made visible: money never appears alone;
		*   the three rows    the buckets the amount was folded from — 未缓存输入 / 缓存读取
		*                     输出 — with each bucket's own share of the money in the
		*                     renderer's reserved third column. They sit on the card's floor
		*                     (`bodyAnchor: 'bottom'`), the posture every detail-row card in
		*                     this repo uses.
		*
		* THE `≈`: as soon as a rule publishes a peak/off-peak split, folding a whole
		* session at one band is an ESTIMATE — the session record carries no per-request
		* timestamps, so "how much of this ran inside 01:00–04:00 UTC" is not knowable from
		* the data this card is given (see `pricing.ts`). The card marks the figure with `≈`
		* and puts the full reason on hover (`cardHint`) rather than splitting the session
		* by an hour it cannot see. WHEN NO RULE MATCHES, the amount column is EMPTY — not
		* `—`, not `$0.00` — because an empty cell says "there is no number here", while a
		* zero would claim the session was free.
		*
		* TONE DIRECTION — this card is a READING, and it sets NO tone at all: spending more
		* is not bad, and a free route is not better. Literally nothing here passes a `tone`,
		* which is the whole statement. (The only colour in the card is the renderer's own
		* grey for the money column, which is a hierarchy, not a verdict.)
		*/
		/** `sourceType` → the legend's first word. A rule with no provenance is NOT
		*  promoted to "official": it prints 来源未标注, because that is what the table said. */
		function sourceLabel(kind) {
			switch (kind) {
				case "official": return t("card.session-cost.src.official");
				case "reseller": return t("card.session-cost.src.reseller");
				case "local": return t("card.session-cost.src.local");
				case "fallback": return t("card.session-cost.src.fallback");
				default: return t("card.session-cost.src.unknown");
			}
		}
		/** Significant digits for a ROW's share of the amount — the figure keeps the
		*  default 3. Measured on the real card: the three-column grid reserves a 30px
		*  floor for the money track, so a 3-digit share (`$0.0552`, 37.6px) leaves the
		*  widest zh label 0.6px of slack (it clipped before the first iteration), while a
		*  2-digit one (`$0.055`, 31.7px) leaves 6.5px. See `fmtMoney` for the numbers. */
		const ROW_MONEY_DIGITS = 2;
		/** `Session Cost` — the card, as one pure function of the merged stats.
		*
		*  The clock is read here (`Date.now()` through `new Date()`), which the contract
		*  allows and the peak verdict needs: the rate band of "now" is part of the answer.
		*  A preview may pin it with `meta.sim.at` (an ISO instant) so a screenshot of a
		*  peak-band fold is reproducible instead of depending on when it was taken. */
		function sessionCostRender(stats, meta) {
			const u = stats.usage;
			if (!u) return null;
			const buckets = splitUsage(u);
			const total = totalTokens(buckets);
			if (total <= 0) return null;
			const sim = meta?.sim;
			const pinned = typeof sim?.at === "string" ? Date.parse(sim.at) : NaN;
			const now = Number.isFinite(pinned) ? new Date(pinned) : /* @__PURE__ */ new Date();
			const table = sim?.noTable === true ? null : stats.pricing ?? null;
			const route = stats.modelSelection?.next ?? stats.modelSelection?.lastUsed ?? null;
			const rule = selectPriceRule(table, route, now);
			const price = rule === null ? null : priceSession(rule, u, now, table?.currency ?? null);
			const noMoney = table === null || table.available !== true || table.rules.length === 0 ? t("card.session-cost.noTable") : route === null ? t("card.session-cost.noRoute") : t("card.session-cost.noRule");
			const model = rule === null ? "" : shortModelName(route?.model);
			const legend = rule === null ? noMoney : `${sourceLabel(sourceKindOf(rule.sourceType))}${model === "" ? "" : ` · ${model}`}`;
			const big = price === null ? fmtTokens(total) : `${price.estimated ? "≈" : ""}${fmtMoney(price.amount, price.currency)}`;
			/** One row of the laid-out money column. `cost` is left UNDEFINED in the
			*  token-only form, which is what makes the renderer drop the column entirely:
			*  an empty reserved track would still imply "a number belongs here". */
			const row = (label, tokens, cost) => ({
				label,
				value: fmtTokens(tokens),
				...cost === void 0 ? {} : { cost: fmtMoney(cost, price?.currency ?? null, ROW_MONEY_DIGITS) }
			});
			return {
				title: t("card.session-cost.title"),
				headAfter: { big },
				legend,
				bodyAnchor: "bottom",
				cardHint: price?.estimated === true ? t("card.session-cost.estHint") : void 0,
				chart: {
					kind: "breakdown",
					breakdown: [
						row(t("card.session-cost.uncached"), buckets.uncached, price?.rowCost.uncached),
						row(t("card.session-cost.read"), buckets.cacheRead, price?.rowCost.cacheRead),
						row(t("card.session-cost.output"), buckets.output, price?.rowCost.output)
					]
				}
			};
		}
		var session_cost_default = defineWidget({
			id: "session-cost",
			name: () => t("widget.session-cost.name"),
			desc: () => t("widget.session-cost.desc"),
			builtin: true,
			group: "coding-plan",
			sizes: ["2x2"],
			simToggle: () => t("widget.session-cost.simToggle"),
			render: sessionCostRender,
			example: {
				stats: previewStats,
				sim: {
					noTable: false,
					at: "2026-09-28T05:00:00Z"
				},
				simSteps: [
					{
						noTable: false,
						at: "2026-09-28T05:00:00Z"
					},
					{
						noTable: false,
						at: "2026-09-28T02:00:00Z"
					},
					{ noTable: true }
				]
			}
		});
		/**
		* The preview's stats — declared HERE, below the descriptor, on purpose.
		*
		* `gen-registry` derives a unit's id from the FIRST `id: '…'` literal in
		* `index.ts` (dir === manifest.id === that literal). The mock rules below need
		* `id` fields of their own, so this function must not appear above the descriptor's
		* `id: 'session-cost'` in file order. A function declaration is hoisted, so the
		* reference in `example` above works. Moving this block up breaks the build.
		*
		* The mock mirrors the REAL table's shape (v2 / USD / the shipped V4.1 Flash
		* official rule) plus three decoys that make the selection visible in a screenshot:
		*   - `example-retired-v4.1-flash-twin`: same provider AND model, retired
		*     `effectiveTo: 2026-09-10`, at DOUBLE rates. If the effective-window sieve ever
		*     stops working, the preview immediately doubles — a visible failure instead of
		*     a silent one;
		*   - `example-reseller-same-model`: the same model on provider `opencode-go`
		*     (a real route on this machine) — proves the provider must match too;
		*   - `example-local-wildcard`: provider `ollama`, model `*` — proves the wildcard
		*     matches only its own provider rather than everything.
		*/
		function previewStats() {
			const PEAK_WINDOWS = [{
				days: [
					1,
					2,
					3,
					4,
					5
				],
				start: "01:00",
				end: "04:00"
			}, {
				days: [
					1,
					2,
					3,
					4,
					5
				],
				start: "06:00",
				end: "10:00"
			}];
			return {
				usage: {
					inputTokens: 186e5,
					cacheReadTokens: 184e5,
					outputTokens: 75600
				},
				modelSelection: {
					next: {
						provider: "deepseek",
						model: "deepseek/deepseek-v4.1-flash"
					},
					lastUsed: null
				},
				pricing: {
					available: true,
					version: 2,
					currency: "USD",
					path: "(example table shipped with this widget preview)",
					modifiedAt: null,
					rules: [
						{
							id: "example-retired-v4.1-flash-twin",
							provider: "deepseek",
							model: "deepseek-v4.1-flash",
							effectiveFrom: null,
							effectiveTo: "2026-09-10T00:00:00Z",
							timezone: "UTC",
							peakWindows: PEAK_WINDOWS,
							rates: {
								inputCacheHit: .006,
								inputCacheMiss: .3,
								output: 1.2,
								cacheWrite: 0
							},
							peakRates: {
								inputCacheHit: .012,
								inputCacheMiss: .6,
								output: 2.4,
								cacheWrite: 0
							},
							currency: "USD",
							sourceType: "official",
							verifiedAt: "2026-09-11",
							source: "example only — a deliberately retired twin of the rule below"
						},
						{
							id: "example-official-v4.1-flash",
							provider: "deepseek",
							model: "deepseek-v4.1-flash",
							effectiveFrom: "2026-09-10T00:00:00Z",
							effectiveTo: null,
							timezone: "UTC",
							peakWindows: PEAK_WINDOWS,
							rates: {
								inputCacheHit: .003,
								inputCacheMiss: .15,
								output: .6,
								cacheWrite: 0
							},
							peakRates: {
								inputCacheHit: .006,
								inputCacheMiss: .3,
								output: 1.2,
								cacheWrite: 0
							},
							currency: "USD",
							sourceType: "official",
							verifiedAt: "2026-09-11",
							source: "example only — mirrors the shipped DeepSeek V4.1 Flash list"
						},
						{
							id: "example-reseller-same-model",
							provider: "opencode-go",
							model: "deepseek-v4.1-flash",
							effectiveFrom: "2026-09-10T00:00:00Z",
							effectiveTo: null,
							timezone: "UTC",
							peakWindows: [],
							rates: {
								inputCacheHit: .003,
								inputCacheMiss: .15,
								output: .6,
								cacheWrite: 0
							},
							peakRates: null,
							currency: "USD",
							sourceType: "reseller",
							verifiedAt: "2026-09-11",
							source: "example only — same model, another provider"
						},
						{
							id: "example-local-wildcard",
							provider: "ollama",
							model: "*",
							effectiveFrom: null,
							effectiveTo: null,
							timezone: "UTC",
							peakWindows: [],
							rates: {
								inputCacheHit: 0,
								inputCacheMiss: 0,
								output: 0,
								cacheWrite: 0
							},
							peakRates: null,
							currency: "USD",
							sourceType: "local",
							verifiedAt: "2026-09-11",
							source: "example only — a local route with a real zero rate"
						}
					]
				}
			};
		}
		//#endregion
		//#region src/widgets/github-notify/index.ts
		/**
		* 待我处理 / To Review — the GitHub family's only TO-DO reading: the unread
		* threads addressed to me (review request / @mention / assignment), plus the
		* newest one.
		*
		* WHY IT EXISTS: all five shipped GitHub cards describe REPOSITORY state
		* (contributions, stars, open issues, last push, repo pulse). None of them says
		* 「有人在等你」, which is the one GitHub fact that implies an ACTION rather than a
		* reading.
		*
		* THE HONESTY RULE THIS CARD IS BUILT AROUND: GitHub's `/notifications` answers
		* **401 when anonymous** (measured 2026-09-29 UTC) — it does NOT answer with an
		* empty list. So the host reports the slice as ABSENT (`notifications: null`)
		* whenever no credential (token / `gh` login) was available, and this render
		* returns `null` for it: the card does not exist rather than printing 「0 条待办」,
		* which would turn "I cannot see" into "nobody is waiting for you". A MEASURED
		* zero — a 200 with an empty queue — is a DIFFERENT fact and DOES render: `0` with
		* the 「暂无待处理」 caption. README §7 lists every branch.
		*
		* THE LADDER (the family's, unchanged): `headAfter.big` is the unread total (the
		* tile's one dominant figure), `legend` is the newest thread as `repo · reason`
		* — the total alone does not say where to start — and three detail rows sit on
		* the card's floor under the shared hairline divider.
		*
		* WHY THE ROWS ARE FIXED: review / mention / assign always render, zero
		* included. A row that vanishes at zero changes the card's height for no reason,
		* and the 150px tile fits the head plus exactly three rows. `ci_activity` and
		* `other` are deliberately NOT rows (a failing CI run is not something waiting on
		* a person); when they are the only unread items the total still prints and the
		* hover says how many sit outside the three rows.
		*
		* TONE DIRECTION — THE WIDGET'S CALL: nothing here is tinted. A queue is a fact,
		* not a failure, so neither the figure (`valueTone`) nor a row gets a colour. A
		* row prints `—` in the muted tone only when the payload did not report that
		* bucket AT ALL (not measured) — a different statement from a measured 0, and the
		* only case in which a row is not a number.
		*
		* HOVER: `cardHint` carries what must never be printed on a 150px tile — the
		* newest thread's full title, its full `owner/name`, how long ago it moved, and
		* `newest.url`. The card itself stays un-clickable (no `cycle`, no `corner`), so a
		* link is only ever shown, never followed from the rail.
		*/
		/** The em dash a bucket shows when the payload did not report it — the same
		*  placeholder 工具调用 / 额度管理 use, never a fabricated 0. */
		const DASH = "—";
		/**
		* The three buckets that get a row, in card order, with their label thunks.
		*
		* FIXED by design (see the header): the thunks are resolved per render so the
		* card re-localizes on a language switch, but the LIST never changes — that is
		* what keeps the card's line count independent of the data.
		*/
		const ROWS = [
			{
				bucket: "review_requested",
				label: () => t("card.github-notify.review")
			},
			{
				bucket: "mention",
				label: () => t("card.github-notify.mention")
			},
			{
				bucket: "assign",
				label: () => t("card.github-notify.assign")
			}
		];
		/**
		* GitHub's notification reasons → the card's words.
		*
		* The WHOLE documented vocabulary is mapped, not just the three row buckets,
		* because `newest.reason` is one thread's RAW reason: a card that only knew the
		* three bucket names would print 「其它」 for a comment on your own PR, throwing
		* away a fact it holds. A reason GitHub adds later falls through to the raw
		* token, which is still the truth (see `reasonLabel`).
		*/
		const REASON_LABELS = {
			review_requested: () => t("card.github-notify.reason.review_requested"),
			mention: () => t("card.github-notify.reason.mention"),
			assign: () => t("card.github-notify.reason.assign"),
			ci_activity: () => t("card.github-notify.reason.ci_activity"),
			other: () => t("card.github-notify.reason.other"),
			comment: () => t("card.github-notify.reason.comment"),
			author: () => t("card.github-notify.reason.author"),
			state_change: () => t("card.github-notify.reason.state_change"),
			subscribed: () => t("card.github-notify.reason.subscribed"),
			team_mention: () => t("card.github-notify.reason.team_mention"),
			invitation: () => t("card.github-notify.reason.invitation"),
			security_alert: () => t("card.github-notify.reason.security_alert"),
			manual: () => t("card.github-notify.reason.manual")
		};
		/** A bucket's count as a non-negative integer, or `null` when the payload did
		*  not report that bucket (a thin/legacy `byReason`) — which is NOT the same
		*  statement as a measured 0, and is the only reason a row prints `—`. */
		function bucketCount(byReason, bucket) {
			const raw = byReason[bucket];
			if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
			return Math.max(0, Math.trunc(raw));
		}
		/** The locale word for a raw GitHub reason. An unknown reason prints as GitHub
		*  spelled it rather than being folded into a bucket it is not; an empty one
		*  falls back to 「其它」, which is exactly the bucket the host folds it into. */
		function reasonLabel(reason) {
			const known = REASON_LABELS[reason];
			if (known !== void 0) return known();
			return reason === "" ? t("card.github-notify.reason.other") : reason;
		}
		/**
		* The hover text: what the tile cannot hold. It is a native `title` attribute, so
		* it costs zero pixels and can never disturb the 150px budget. A line is dropped
		* when the payload does not carry it — a thread with no HTML url stays link-less
		* instead of showing a link to nowhere (the host already refuses to build one).
		*
		* `fmtAgo` reads the clock (`Date.now()`); that is allowed for a render and is
		* the same call the 提交 card makes for `pushed_at`.
		*/
		function hoverHint(notif, outside) {
			const lines = [];
			const newest = notif.newest;
			if (newest !== null) {
				if (newest.title !== "") lines.push(newest.title);
				const where = [newest.repo, fmtAgo(newest.updatedAt)].filter((part) => part !== "" && part !== DASH).join(" · ");
				if (where !== "") lines.push(where);
				if (newest.url !== null && newest.url !== "") lines.push(newest.url);
			}
			if (outside > 0) lines.push(t("card.github-notify.outside", { n: outside }));
			return lines.length > 0 ? lines.join("\n") : void 0;
		}
		/**
		* The preview's own states (`example.simSteps`) — the shapes a live rail cannot
		* be asked for on demand: 3 waiting / a MEASURED empty queue / only CI-other
		* unread / a THIN `byReason` (defensive: the shipped host always reports all five
		* buckets) / nobody signed in (the card does not exist).
		*
		* Only a PREVIEW passes `meta.sim` (the rail never does), so a payload built here
		* can never reach an installed tile. The return is deliberately TRI-STATE:
		*   `undefined` = not simulating — the render reads the real slice;
		*   `null`      = simulating ABSENT (no credential / failed call) — render → null;
		*   object      = the synthetic queue itself.
		* Collapsing `null` into `undefined` would make the card's most important branch
		* (never print 0 for "cannot see") unreviewable in a preview.
		*
		* The mock ages are relative to the clock at import time, never a pinned ISO
		* date: a pinned date silently becomes a FUTURE timestamp on a machine whose
		* clock is behind it and the hover then reads `0s` (measured).
		*/
		function simNotifications(state) {
			if (state === "clear") return {
				count: 0,
				capped: false,
				byReason: {
					review_requested: 0,
					mention: 0,
					assign: 0,
					ci_activity: 0,
					other: 0
				},
				newest: null
			};
			if (state === "capped") return {
				count: 30,
				capped: true,
				byReason: {
					review_requested: 21,
					mention: 6,
					assign: 3,
					ci_activity: 0,
					other: 0
				},
				newest: {
					title: "Review: the third batch",
					repo: "Physicolor/dsh-widgets",
					reason: "review_requested",
					updatedAt: (/* @__PURE__ */ new Date(Date.now() - 18e4)).toISOString(),
					url: "https://github.com/Physicolor/dsh-widgets/pull/117"
				}
			};
			if (state === "ciOnly") return {
				count: 2,
				capped: false,
				byReason: {
					review_requested: 0,
					mention: 0,
					assign: 0,
					ci_activity: 2,
					other: 0
				},
				newest: {
					title: "CI failed on main",
					repo: "Physicolor/dsh-widgets",
					reason: "ci_activity",
					updatedAt: (/* @__PURE__ */ new Date(Date.now() - 15e5)).toISOString(),
					url: "https://github.com/Physicolor/dsh-widgets/actions"
				}
			};
			if (state === "thin") return {
				count: 1,
				capped: false,
				byReason: { mention: 1 },
				newest: {
					title: "third-batch specs: @you",
					repo: "Physicolor/dsh-widgets",
					reason: "mention",
					updatedAt: (/* @__PURE__ */ new Date(Date.now() - 36e4)).toISOString(),
					url: "https://github.com/Physicolor/dsh-widgets/pull/42#discussion_r1"
				}
			};
			if (state === "absent") return null;
		}
		/** 待我处理 — the unread review queue (see the header for every decision). */
		function githubNotifyRender(stats, meta) {
			const sim = meta?.sim;
			const simulated = simNotifications(sim !== void 0 && typeof sim.state === "string" ? sim.state : null);
			const notif = simulated !== void 0 ? simulated : stats.github?.notifications ?? null;
			if (notif === null) return null;
			const byReason = notif.byReason ?? {};
			const total = typeof notif.count === "number" && Number.isFinite(notif.count) ? Math.max(0, Math.trunc(notif.count)) : null;
			const rows = ROWS.map((row) => {
				const n = bucketCount(byReason, row.bucket);
				return n === null ? {
					label: row.label(),
					value: DASH,
					tone: "muted"
				} : {
					label: row.label(),
					value: String(n)
				};
			});
			const ci = bucketCount(byReason, "ci_activity");
			const other = bucketCount(byReason, "other");
			const outside = ci === null || other === null ? 0 : ci + other;
			const newest = notif.newest;
			const newestLine = newest === null ? "" : [newest.repo === "" ? "" : repoShort(newest.repo), reasonLabel(newest.reason)].filter((part) => part !== "").join(" · ");
			const legend = newestLine !== "" ? newestLine : t(total === 0 ? "card.github-notify.quiet" : "card.github-notify.noNewest");
			const hint = hoverHint(notif, outside);
			return {
				title: t("card.github-notify.title"),
				headAfter: { big: total === null ? DASH : notif.capped ? `${total}+` : String(total) },
				legend,
				bodyAnchor: "bottom",
				chart: {
					kind: "breakdown",
					breakdown: rows
				},
				...hint === void 0 ? {} : { cardHint: hint }
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
			harness_board_default,
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
			sys_cpu_default,
			cc_usage_default,
			sys_gpu_default,
			cc_credits_default,
			sys_rings_default,
			cc_windows_default,
			sys_board_default,
			cc_subscription_default,
			sys_gpu_line_default,
			cc_window_5h_default,
			cc_window_weekly_default,
			cc_window_monthly_default,
			github_contrib_default,
			github_stars_default,
			github_issues_default,
			github_push_default,
			github_board_default,
			usage_mix_default,
			trajectory_stats_default,
			model_config_default,
			peak_pricing_board_default,
			goal_progress_default,
			subagent_default,
			guard_default,
			jobs_default,
			sys_disk_default,
			window_forecast_default,
			sys_net_default,
			sys_power_default,
			sys_procs_default,
			session_cost_default,
			defineWidget({
				id: "github-notify",
				name: () => t("widget.github-notify.name"),
				desc: () => t("widget.github-notify.desc"),
				builtin: false,
				group: "github",
				sizes: ["2x2"],
				simToggle: () => t("sim.notify"),
				render: githubNotifyRender,
				example: {
					stats: {
						github: {
							auth: "gh",
							login: "Physicolor",
							contributions: null,
							repos: [],
							notifications: {
								count: 3,
								capped: false,
								byReason: {
									review_requested: 2,
									mention: 1,
									assign: 0,
									ci_activity: 0,
									other: 0
								},
								newest: {
									title: "feat(widgets): the third-batch card specs",
									repo: "Physicolor/dsh-widgets",
									reason: "review_requested",
									updatedAt: (/* @__PURE__ */ new Date(Date.now() - 72e5)).toISOString(),
									url: "https://github.com/Physicolor/dsh-widgets/pull/42"
								}
							},
							errors: {}
						},
						githubError: null
					},
					sim: { state: "waiting" },
					simSteps: [
						{ state: "waiting" },
						{ state: "clear" },
						{ state: "capped" },
						{ state: "ciOnly" },
						{ state: "thin" },
						{ state: "absent" }
					]
				}
			})
		];
		/**
		* Per-widget RUNTIME metadata, generated from each unit's manifest.json.
		*
		* WHAT vs HOW: a manifest declares what the widget IS — which live data source it
		* waits on, and what its body looks like while that source is still in flight.
		* The SHELL decides HOW that becomes a loading card, because a widget cannot tell
		* "my source is still in flight" from "my source answered with nothing", and
		* those two states deserve different cards (placeholder pills vs an honest
		* empty state).
		*
		* Declaring it in the manifest is what keeps a new widget unit to ONE directory:
		* there is no central id→source map to edit, and `check:registry` fails the build
		* when a manifest drifts from the generated file.
		*/
		const WIDGET_RUNTIME = {
			"quota-manage": {
				source: "cc",
				skeleton: {
					shape: "figures",
					count: 2
				}
			},
			"usage-bars": {
				source: "usage",
				skeleton: { shape: "bars" }
			},
			"usage-rings": {
				source: "usage",
				skeleton: {
					shape: "rings",
					count: 3
				}
			},
			"usage-rolling": {
				source: "usage",
				skeleton: { shape: "text" }
			},
			"usage-weekly": {
				source: "usage",
				skeleton: { shape: "text" }
			},
			"usage-monthly": {
				source: "usage",
				skeleton: { shape: "text" }
			},
			"cc-whoami": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"sys-cpu": {
				source: "sys",
				skeleton: { shape: "text" }
			},
			"cc-usage": {
				source: "cc",
				skeleton: {
					shape: "figures",
					count: 3
				}
			},
			"sys-gpu": {
				source: "sys",
				skeleton: { shape: "text" }
			},
			"cc-credits": {
				source: "cc",
				skeleton: {
					shape: "quotas",
					count: 3
				}
			},
			"sys-rings": {
				source: "sys",
				skeleton: {
					shape: "rings",
					count: 2
				}
			},
			"cc-windows": {
				source: "cc",
				skeleton: {
					shape: "rings",
					count: 3
				}
			},
			"sys-board": {
				source: "sys",
				skeleton: {
					shape: "rings",
					count: 4
				}
			},
			"cc-subscription": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"sys-gpu-line": {
				source: "sys",
				skeleton: { shape: "line" }
			},
			"cc-window-5h": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"cc-window-weekly": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"cc-window-monthly": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"github-contrib": {
				source: "github",
				skeleton: { shape: "heatmap" }
			},
			"github-stars": {
				source: "github",
				skeleton: { shape: "text" }
			},
			"github-issues": {
				source: "github",
				skeleton: { shape: "text" }
			},
			"github-push": {
				source: "github",
				skeleton: { shape: "text" }
			},
			"github-board": {
				source: "github",
				skeleton: {
					shape: "figures",
					count: 4
				}
			},
			"usage-mix": {
				source: "cc",
				skeleton: {
					shape: "rings",
					count: 1
				}
			},
			"sys-disk": {
				source: "sys",
				skeleton: {
					shape: "figures",
					count: 4
				}
			},
			"window-forecast": {
				source: "cc",
				skeleton: { shape: "quotas" }
			},
			"sys-net": {
				source: "sys",
				skeleton: { shape: "text" }
			},
			"sys-power": {
				source: "sys",
				skeleton: { shape: "text" }
			},
			"sys-procs": {
				source: "sys",
				skeleton: { shape: "bars" }
			},
			"session-cost": {
				source: "cc",
				skeleton: { shape: "text" }
			},
			"github-notify": {
				source: "github",
				skeleton: { shape: "text" }
			}
		};
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
			`task@2x4`,
			`trajectory@2x2`,
			`harness-board@2x4`,
			`quote@2x2`,
			`heatmap@2x2`,
			`heatmap@2x4`,
			`heatmap-bars@2x2`,
			`heatmap-bars@2x4`,
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
			`cc-window-monthly@2x2`,
			`github-contrib@2x2`,
			`github-contrib@2x4`,
			`github-stars@2x2`,
			`github-issues@2x2`,
			`github-push@2x2`,
			`github-board@2x4`,
			`usage-mix@2x2`,
			`trajectory-stats@2x2`,
			`model-config@2x2`,
			`peak-pricing-board@2x4`,
			`goal-progress@2x2`,
			`subagent@2x2`,
			`guard@2x2`,
			`jobs@2x2`,
			`sys-disk@2x4`,
			`window-forecast@2x2`,
			`sys-net@2x2`,
			`sys-power@2x2`,
			`sys-procs@2x2`,
			`session-cost@2x2`,
			`github-notify@2x2`
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
				"usage.title": "OpenCode 用量",
				"usage.totalKey": "总 Key",
				"usage.cycleHint": "单击循环：{chain}",
				"usage.resets": "重置 {date}",
				"usage.rolling": "滚动",
				"usage.week": "周",
				"usage.month": "月",
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
				"cc.period": "账期 {m}-{d}",
				"cc.title": "Command Code",
				"cc.roleUsage": "用量",
				"cc.roleCredits": "额度",
				"cc.roleWindow": "窗口",
				"cc.roleAccount": "账户",
				"cc.win5h": "5h 窗口",
				"cc.winWeekly": "周窗口",
				"cc.winMonthly": "月窗口",
				"cc.limit5h": "5 小时",
				"cc.limitWeek": "周",
				"cc.limitMonth": "月",
				"cc.resets": "重置",
				"cc.cancelAtEnd": "到期不续订",
				"cc.cycleHint": "单击切换账户：{chain}",
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
				"group.github": "GitHub",
				"config.github.user": "GitHub 用户名",
				"config.github.repos": "监控仓库（owner/name，逗号分隔，最多 4 个）",
				"config.github.hint": "留空 = 用本机已登录的 GitHub 账号（凭据 / gh CLI）",
				"github.staleHost": "host 路由未加载 — 重启 dsh web 后自动生效",
				"github.unavailable": "GitHub 暂不可用",
				"github.noUser": "未登录 GitHub — 配置用户名或 token 后可用",
				"github.noRepo": "未取到仓库 — 配置 owner/name 或登录 GitHub",
				"github.cycle": "单击切换仓库：{chain}",
				"github.stars": "Stars",
				"github.forks": "Forks",
				"github.issues": "问题",
				"github.unanswered": "回复",
				"github.unansweredUnknown": "回复（配置 token 后可测）",
				"github.push": "提交",
				"github.release": "Release {tag}",
				"github.noRelease": "暂无 Release",
				"github.contrib.total": "{n} 次贡献",
				"github.contrib.unit": "次贡献",
				"github.contrib.title": "提交热度图",
				"github.board.title": "仓库脉搏",
				"github.contrib.windowYear": "近一年",
				"github.contrib.windowQuarter": "近 3 个月",
				"widget.counts.name": "轮次·步数",
				"widget.counts.desc": "本轮会话的轮次与步骤计数",
				"card.counts.value": "{turns}轮 {steps}步",
				"widget.llm.name": "LLM 时长",
				"widget.llm.desc": "模型推理累计耗时",
				"widget.tool.name": "工具调用",
				"widget.tool.desc": "明细三行（默认 失败 / 平均每次 / 工具耗时占比），大字为累计耗时；行可在组件配置里更换",
				"card.tool.running": "正在执行",
				"card.tool.slowest": "最慢",
				"card.tool.failed": "失败",
				"card.tool.mean": "平均每次",
				"card.tool.share": "工具耗时占比",
				"card.tool.calls": "{n} 次 · {m} 个工具",
				"card.tool.hint": "最多 {max} 行 · 拖动整行排序：上面的先显示在卡片上",
				"widget.ttft.name": "首 token 平均",
				"widget.ttft.desc": "平均首 token 延迟",
				"widget.tps.name": "速率",
				"widget.tps.desc": "解码吞吐速度",
				"widget.cache.name": "缓存命中",
				"widget.cache.desc": "缓存命中率环图与本次会话的 token 构成",
				"card.cache.unit": "tok",
				"card.cache.uncached": "未缓存输入",
				"card.cache.read": "缓存读取",
				"card.cache.output": "输出",
				"widget.tokens.name": "会话 Token",
				"widget.tokens.desc": "本次会话的 token 总量与输入 / 输出构成（会话内口径，不是逐日跨会话的用量）",
				"card.tokens.input": "输入",
				"card.tokens.output": "输出",
				"widget.context.name": "上下文压缩",
				"widget.context.desc": "上下文占用百分比 + 右上角按钮两次点击执行压缩；下方是压缩次数 / 累计回收 / 折叠项数",
				"card.context.title": "上下文压缩",
				"card.context.waiting": "等待上下文数据",
				"card.context.compact": "压缩",
				"card.context.confirm": "确认",
				"card.context.folds": "压缩次数",
				"card.context.reclaimed": "累计回收",
				"card.context.items": "折叠项数",
				"card.context.recent": "最近 {ago} 前",
				"widget.context-water.name": "上下文水位",
				"widget.context-water.desc": "上下文系统/工具/消息占比分段条",
				"card.contextWater.title": "上下文已用",
				"card.contextWater.system": "系统提示词",
				"card.contextWater.tools": "工具",
				"card.contextWater.messages": "对话消息",
				"widget.task.name": "任务",
				"widget.task.desc": "任务条目明细：大字为进行中数量（右侧灰字是进行中 / 待办计数），下方按进行中优先列出条目本身，最多 4 行；没有任务时显示「暂无任务」",
				"card.task.small": "进行中 · {pending} 待办",
				"card.task.doing": "进行中",
				"card.task.pending": "待办",
				"card.task.done": "已完成",
				"card.task.none": "暂无任务",
				"widget.task.simToggle": "切换 无任务 / 有任务 预览",
				"widget.trajectory.name": "对话轨迹",
				"widget.trajectory.desc": "官方「轨迹」三色泳道的卡片版：输入 / 模型 / 工具 每次触发一根色条，随模型调用工具实时右移滚动",
				"card.trajectory.legend": "输入 {input}  模型 {model}  工具 {tool}",
				"card.trajectory.input": "输入",
				"card.trajectory.model": "模型",
				"card.trajectory.tool": "工具",
				"config.laneSizing": "泳道宽度",
				"config.laneSizing.time": "按时长",
				"config.laneSizing.equal": "等宽",
				"widget.harness-board.name": "会话概览",
				"widget.harness-board.desc": "把输入框底部那条统计拆出来的会话数字并成一张 2×4：默认 轮次 / LLM / 工具 / 速率，最多 10 个，在组件配置里勾选 + 拖动整行排序（每行最多 5 个、超过自动折成两行；单张 2×2 卡的数字是 20px，这里是 13px——看板用来扫一排，单卡用来看一个）",
				"metric.turns": "轮次",
				"metric.steps": "步数",
				"metric.llm": "LLM",
				"metric.tool": "工具",
				"metric.ttft": "TTFT",
				"metric.tps": "速率",
				"metric.cache": "缓存",
				"metric.in": "输入",
				"metric.out": "输出",
				"metric.context": "上下文",
				"metric.todoDoing": "进行",
				"metric.todoPending": "待办",
				"metric.toolFail": "失败",
				"metric.folds": "折叠",
				"metric.reclaimed": "回收",
				"metric.running": "执行",
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
				"widget.heatmap-bars.desc": "逐日 Token 用量柱状图，窗口可在 7 天 / 30 天之间配置；2×4 宽版把合计与峰值移到标题行右端并带 MAX/TOTAL 标头",
				"widget.heatmap-bars.simToggle": "切换 7 天 / 30 天预览",
				"card.heatmap-bars.title": "Token 用量",
				"card.heatmap-bars.max": "MAX",
				"card.heatmap-bars.total": "TOTAL",
				"card.heatmap-bars.hint": "每根柱 = 2 天（悬停柱看该柱合计；标签是该柱的结束日）",
				"config.bars.range": "窗口",
				"config.bars.range.7": "近 7 天",
				"config.bars.range.30": "近 30 天",
				"config.bars.range.hint": "近 7 天 = 每天一根柱；近 30 天 = 每两天一根柱（30 根日柱在卡片宽度里只有 6px 宽，读不出量级）",
				"config.bars.monthMode.hint": "只对「近 7 天」生效：近 30 天窗口永远是滚动的",
				"config.monthMode.rolling7": "滚动(最近7天)",
				"config.monthMode.weekly": "每周对齐",
				"widget.quota-manage.name": "额度管理",
				"widget.quota-manage.desc": "按账期趋势预测月末用量百分比，并给出今日 token 用量与今日推荐用量",
				"widget.quota-manage.periodEnd": "账期 {m}-{d}",
				"widget.quota-manage.used": "今日用量",
				"widget.quota-manage.recommend": "今日推荐",
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
				"widget.peak-pricing.desc": "DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间工作日 09:00–12:00 与 14:00–18:00 为高峰；周末与中国法定节假日全天低谷）",
				"card.peak.title": "峰谷定价",
				"card.peak.am": "上午 {range}",
				"card.peak.pm": "下午 {range}",
				"card.peak.offDay": "{reason} · 全天低谷",
				"card.peak.weekend": "周末",
				"card.peak.holiday.newyear": "元旦",
				"card.peak.holiday.spring": "春节",
				"card.peak.holiday.qingming": "清明节",
				"card.peak.holiday.labour": "劳动节",
				"card.peak.holiday.dragon": "端午节",
				"card.peak.holiday.midautumn": "中秋节",
				"card.peak.holiday.national": "国庆节",
				"card.peak.holiday.custom": "自定义低谷日",
				"card.peak.staleHint": "节假日表未覆盖 {year} 年（依据 {source}），目前只按工作日与周末判断 —— 可在「额外低谷日」里补上该年的放假日期",
				"sim.peak": "高峰/低峰",
				"config.peak.windows": "高峰时段（北京时间，逗号分隔，最多两段）",
				"config.peak.weekend": "周末全天低谷",
				"config.peak.holiday": "中国法定节假日全天低谷",
				"config.peak.timeZone": "时区",
				"config.peak.tz.beijing": "北京 (UTC+8)",
				"config.peak.tz.local": "本机时区",
				"config.peak.extra": "额外低谷日（2027-01-01 或 2027-02-05..2027-02-11）",
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
				"widget.cc-subscription.desc": "当前套餐等级（GOAT / Pro / Max …）与账期结束时间",
				"widget.cc-subscription.simToggle": "切换套餐等级预览",
				"widget.sys-gpu-line.name": "GPU 利用率",
				"widget.sys-gpu-line.desc": "GPU 利用率折线（最近约 20 分钟）",
				"widget.cc-window-5h.name": "5h 窗口",
				"widget.cc-window-5h.desc": "5 小时额度窗口用量百分比与重置时间",
				"widget.cc-window-weekly.name": "周窗口",
				"widget.cc-window-weekly.desc": "周额度窗口用量百分比与重置时间",
				"widget.cc-window-monthly.name": "月窗口",
				"widget.cc-window-monthly.desc": "账期月额度用量百分比（已用 / 已用+剩余）与账期结束时间",
				"widget.github-contrib.name": "提交热度图",
				"widget.github-contrib.desc": "GitHub 提交热度图（同款 5 级绿）。2×2 近 3 个月，2×4 近一年（与 GitHub 个人页同款窗口）；默认读本机已登录的账号，也可填用户名",
				"widget.github-stars.name": "Stars",
				"widget.github-stars.desc": "仓库 Stars（副标题是仓库名，副行是 Forks）；同时监控多个仓库时单击卡片切换",
				"widget.github-issues.name": "问题",
				"widget.github-issues.desc": "未关闭 Issue 数（不含 PR），副行是其中没有任何人回复的数量——配了 token 才测得到，否则显示「回复（配置 token 后可测）」",
				"widget.github-push.name": "提交",
				"widget.github-push.desc": "距离最近一次 push 多久（12s / 5m / 3h / 6d），副行是最新 Release tag",
				"widget.github-board.name": "仓库脉搏",
				"widget.github-board.desc": "2×4 汇总板：Stars / 未关闭 Issue / 未回复 / 最近提交 并排，标题行给出仓库全名与最新 Release",
				"widget.usage-mix.name": "套餐总览",
				"widget.usage-mix.desc": "跨平台额度看板：今日用量打头，右上角环形显示全场最紧的占用，下面每个平台（含号池，第二个用罗马数字 Ⅱ）各占一行",
				"card.usage-mix.opencode": "OpenCode Go",
				"card.usage-mix.commandcode": "Command Code",
				"card.usage-mix.today": "今日",
				"card.usage-mix.legend": "{win}重置 {at}",
				"card.usage-mix.mark.Δ": "滚动",
				"card.usage-mix.mark.W": "周",
				"card.usage-mix.mark.M": "月",
				"card.usage-mix.mark.5h": "5h ",
				"card.usage-mix.cfg.daily": "显示今日用量",
				"card.usage-mix.cfg.opencode": "显示 OpenCode Go（退订后关掉）",
				"card.usage-mix.cfg.commandcode": "显示 Command Code",
				"widget.trajectory-stats.name": "轨迹占比",
				"widget.trajectory-stats.desc": "「对话轨迹」的统计版：输入 / 模型 / 工具 各自的时长与占比，点按可切换大数字看模型或工具",
				"widget.trajectory-stats.simToggle": "切换大数字：模型 / 工具",
				"card.trajectory-stats.legend": "时长占比",
				"card.trajectory-stats.cycleHint": "单击切换大数字：模型 → 工具",
				"card.trajectory-stats.input": "输入",
				"card.trajectory-stats.model": "模型",
				"card.trajectory-stats.tool": "工具",
				"widget.model-config.name": "会话配置",
				"widget.model-config.desc": "本会话正在用的模型 / 推理档 / Agent 预设；下一轮请求换了路线时会显示出来",
				"card.model-config.title": "会话配置",
				"card.model-config.provider": "提供方",
				"card.model-config.preset": "预设",
				"card.model-config.next": "下次",
				"card.model-config.switched": "换模型",
				"card.model-config.simToggle": "换路线 / 稳定 / 无档位",
				"widget.peak-pricing-board.name": "峰谷时段表",
				"widget.peak-pricing-board.desc": "2×4 宽版峰谷定价：今天接下来的计费时刻表——高峰 09:00–12:00 / 14:00–18:00、其余低谷，正在计费的那一行高亮，并给出距离下一段切换还有多久；周末与中国法定节假日写明「全天低谷」的原因（与 2×2 峰谷定价同一套规则；可自定时段 / 时区 / 额外低谷日）",
				"card.peak-pricing-board.title": "峰谷时段表",
				"card.peak-pricing-board.peak": "高峰",
				"card.peak-pricing-board.off": "低谷",
				"card.peak-pricing-board.until": "本段至",
				"card.peak-pricing-board.next": "下一段",
				"card.peak-pricing-board.nextDay": "下一段（次日）",
				"card.peak-pricing-board.nextDayShort": "次日",
				"card.peak-pricing-board.nextOff": "恢复高峰",
				"card.peak-pricing-board.left": "还有 {d}",
				"card.peak-pricing-board.dow.0": "周日",
				"card.peak-pricing-board.dow.1": "周一",
				"card.peak-pricing-board.dow.2": "周二",
				"card.peak-pricing-board.dow.3": "周三",
				"card.peak-pricing-board.dow.4": "周四",
				"card.peak-pricing-board.dow.5": "周五",
				"card.peak-pricing-board.dow.6": "周六",
				"card.peak-pricing-board.simToggle": "高峰 / 低谷 / 节假日 / 周末",
				"card.peak-pricing-board.staleHint": "节假日表未覆盖 {year} 年（依据 {source}），只按工作日与周末判断 —— 可在「额外低谷日」里补上该年的放假日期",
				"card.peak-pricing-board.weekend": "周末",
				"card.peak-pricing-board.holiday.newyear": "元旦",
				"card.peak-pricing-board.holiday.spring": "春节",
				"card.peak-pricing-board.holiday.qingming": "清明节",
				"card.peak-pricing-board.holiday.labour": "劳动节",
				"card.peak-pricing-board.holiday.dragon": "端午节",
				"card.peak-pricing-board.holiday.midautumn": "中秋节",
				"card.peak-pricing-board.holiday.national": "国庆节",
				"card.peak-pricing-board.holiday.custom": "自定义低谷日",
				"config.peak-pricing-board.windows": "本卡时段（留空则跟随下面的高峰时段；逗号分隔，最多两段）",
				"config.peak-pricing-board.peakWindows": "高峰时段（北京时间，逗号分隔，最多两段）",
				"config.peak-pricing-board.weekendOff": "周末全天低谷",
				"config.peak-pricing-board.holidayOff": "中国法定节假日全天低谷",
				"config.peak-pricing-board.timeZone": "时区",
				"config.peak-pricing-board.tz.beijing": "北京 (UTC+8)",
				"config.peak-pricing-board.tz.local": "本机时区",
				"config.peak-pricing-board.extraHolidays": "额外低谷日（2027-01-01 或 2027-02-05..2027-02-11）",
				"widget.goal-progress.name": "目标进度",
				"widget.goal-progress.desc": "当前目标的轮次进度与阶段（自主长跑时唯一可信的进度真相）",
				"card.goal-progress.title": "目标进度",
				"card.goal-progress.rounds": "{done} / {max}",
				"card.goal-progress.legend": "{phase} · {ago} 前",
				"card.goal-progress.blockedLegend": "{phase}：{reason}",
				"card.goal-progress.objective": "目标",
				"card.goal-progress.phase": "阶段",
				"card.goal-progress.phase.active": "进行中",
				"card.goal-progress.phase.paused": "已暂停",
				"card.goal-progress.phase.blocked": "受阻",
				"card.goal-progress.phase.complete": "已完成",
				"widget.subagent.name": "子代理",
				"widget.subagent.desc": "本会话派生的子代理数量、各自活跃时长与身份标签",
				"card.subagent.title": "子代理",
				"card.subagent.legendActive": "活跃时长 {dur}",
				"card.subagent.legendEarliest": "最早 {ago} 前创建",
				"card.subagent.longest": "最久",
				"card.subagent.continuable": "持续型",
				"card.subagent.recent": "最近",
				"card.subagent.ago": "{ago} 前",
				"widget.subagent.simToggle": "切换 活跃时长 / 创建时间 预览",
				"widget.guard.name": "权限档位",
				"widget.guard.desc": "本会话生效的权限档位与它允许做什么（投影已把 preset / 沙箱 / 审批三个旋钮折成一个值）",
				"widget.guard.simToggle": "危险档位/只读档位",
				"card.guard.title": "权限档位",
				"card.guard.legend": "{n} 个可选档位",
				"card.guard.current": "当前",
				"card.guard.allows": "说明",
				"card.guard.preset.readOnly": "仅可查看",
				"card.guard.preset.workspaceWrite": "工作区内修改",
				"card.guard.preset.fullAccess": "完全权限",
				"widget.jobs.name": "后台作业",
				"widget.jobs.desc": "本会话的后台作业：几个在跑、最久跑了多久、最近一个是什么",
				"card.jobs.title": "后台作业",
				"card.jobs.legend": "最久 {longest} · 共 {total} 个",
				"card.jobs.idle": "已结束 {n} 个",
				"card.jobs.longest": "最久",
				"card.jobs.newest": "最近",
				"card.jobs.failed": "失败",
				"widget.jobs.simToggle": "切换 运行中 / 已跑完 / 空列表 预览",
				"widget.sys-disk.name": "磁盘与自检",
				"widget.sys-disk.desc": "各盘剩余空间、DSH 会话日志的体积与增速、web 进程自身的占用——长跑 harness 最真实的运维风险",
				"widget.sys-disk.simToggle": "切换 会话目录可读 / 读不到",
				"card.sys-disk.title": "磁盘与自检",
				"card.sys-disk.freeWord": "剩余",
				"card.sys-disk.left": "{mount} {pct}%",
				"card.sys-disk.more": "+{n}",
				"card.sys-disk.home": "会话日志 {files} 文件 · {size} · +{recent}/h",
				"card.sys-disk.proc": "web 进程 {rss} · CPU {cpu} · {uptime}",
				"card.sys-disk.hint": "web 进程 PID {pid} · {rss} RSS · {cpu} CPU · 已跑 {uptime}",
				"widget.window-forecast.name": "窗口预测",
				"widget.window-forecast.desc": "按当前速率，5 小时 / 周额度窗口会不会在重置前打满（额度管理只管月窗口）",
				"widget.window-forecast.simToggle": "稍后读表",
				"card.window-forecast.title": "窗口预测",
				"card.window-forecast.win5h": "5h",
				"card.window-forecast.winWeekly": "周",
				"card.window-forecast.projected": "预计",
				"card.window-forecast.fillIn": "预计 {d} 后打满",
				"card.window-forecast.noFill": "不会打满 · {d}",
				"card.window-forecast.resetLeft": "剩余重置",
				"widget.sys-net.name": "网络吞吐",
				"widget.sys-net.desc": "本机网卡的实时收发速率（两次计数采样差分），以及当前最忙的那张网卡",
				"card.sys-net.title": "网络吞吐",
				"card.sys-net.busiest": "最忙",
				"card.sys-net.simToggle": "在线 / 零流量 / 等待样本",
				"card.sys-net.adapters": "{n} 张网卡",
				"widget.sys-power.name": "供电",
				"widget.sys-power.desc": "是否在用电池、剩余电量与预计续航，以及当前 Windows 电源方案",
				"card.sys-power.title": "供电",
				"card.sys-power.source.ac": "插电",
				"card.sys-power.source.battery": "电池",
				"card.sys-power.source.unknown": "供电未知",
				"card.sys-power.desktop": "台式机（无电池）",
				"card.sys-power.ac": "交流电",
				"card.sys-power.dc": "电池",
				"card.sys-power.row.source": "供电",
				"card.sys-power.row.left": "剩余",
				"card.sys-power.row.scheme": "电源方案",
				"card.sys-power.hintAc": "插电时系统不报告剩余续航，所以「剩余」一行为空，这不是读取失败",
				"card.sys-power.hintUnknown": "系统没有报告剩余续航估算值，所以「剩余」一行为空",
				"card.sys-power.hintDesktop": "这台机器没有电池，只有电源方案是真实读数",
				"card.sys-power.simToggle": "切换供电状态",
				"widget.sys-procs.name": "内存大户",
				"widget.sys-procs.desc": "按工作集内存排序的前几名进程；多 agent / 多模型并行时回答「谁把内存吃满了」",
				"widget.sys-procs.simToggle": "切换 多进程 / 单进程 预览",
				"card.sys-procs.title": "内存大户",
				"widget.session-cost.name": "会话成本",
				"widget.session-cost.desc": "把本会话的四桶 token 按价格表折成钱，并标出这个金额的来源（官方价 / 中转价 / 免费路由 / 估算价）",
				"widget.session-cost.simToggle": "命中价 / 高峰价 / 无价格表",
				"card.session-cost.title": "会话成本",
				"card.session-cost.uncached": "未命中",
				"card.session-cost.read": "缓存命中",
				"card.session-cost.output": "输出",
				"card.session-cost.src.official": "官方价",
				"card.session-cost.src.reseller": "中转价",
				"card.session-cost.src.local": "免费路由",
				"card.session-cost.src.fallback": "估算价",
				"card.session-cost.src.unknown": "来源未标注",
				"card.session-cost.noTable": "无价格表 · 仅 token",
				"card.session-cost.noRoute": "无模型路由 · 仅 token",
				"card.session-cost.noRule": "无匹配价 · 仅 token",
				"card.session-cost.estHint": "按当前费率估算整段：会话记录里没有逐请求时间戳，无法把高峰 / 低谷时段分开计价，所以金额是估算值（≈）",
				"widget.github-notify.name": "待我处理",
				"widget.github-notify.desc": "GitHub 上等我的未读线程：review 请求 / @提及 / 指派，以及最新的一条；需要 token 或 gh 登录（未登录时该卡不出现）",
				"card.github-notify.title": "待我处理",
				"card.github-notify.review": "Review 请求",
				"card.github-notify.mention": "提及",
				"card.github-notify.assign": "指派",
				"card.github-notify.quiet": "暂无待处理",
				"card.github-notify.noNewest": "最新一条未提供",
				"card.github-notify.outside": "另有 {n} 条 CI / 其它未列入上面三行",
				"card.github-notify.reason.review_requested": "Review 请求",
				"card.github-notify.reason.mention": "提及",
				"card.github-notify.reason.assign": "指派",
				"card.github-notify.reason.ci_activity": "CI 活动",
				"card.github-notify.reason.other": "其它",
				"card.github-notify.reason.comment": "评论",
				"card.github-notify.reason.author": "你发起的",
				"card.github-notify.reason.state_change": "状态变化",
				"card.github-notify.reason.subscribed": "已订阅",
				"card.github-notify.reason.team_mention": "团队提及",
				"card.github-notify.reason.invitation": "邀请",
				"card.github-notify.reason.security_alert": "安全告警",
				"card.github-notify.reason.manual": "手动订阅",
				"sim.notify": "未读 / 清空 / 仅 CI / 缺读数 / 未登录"
			},
			en: {
				"usage.title": "OpenCode Usage",
				"usage.totalKey": "All Keys",
				"usage.cycleHint": "Click to cycle: {chain}",
				"usage.resets": "Resets {date}",
				"usage.rolling": "Rolling",
				"usage.week": "Week",
				"usage.month": "Month",
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
				"cc.period": "Ends {m}-{d}",
				"cc.title": "Command Code",
				"cc.roleUsage": "Usage",
				"cc.roleCredits": "Credits",
				"cc.roleWindow": "Windows",
				"cc.roleAccount": "Account",
				"cc.win5h": "5h window",
				"cc.winWeekly": "Weekly window",
				"cc.winMonthly": "Monthly window",
				"cc.limit5h": "5-hour",
				"cc.limitWeek": "Week",
				"cc.limitMonth": "Month",
				"cc.resets": "Resets",
				"cc.cancelAtEnd": "Cancels at period end",
				"cc.cycleHint": "Click to switch account: {chain}",
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
				"group.github": "GitHub",
				"config.github.user": "GitHub user",
				"config.github.repos": "Repos to watch (owner/name, comma separated, max 4)",
				"config.github.hint": "Empty = use this machine's own GitHub login (credentials / gh CLI)",
				"github.staleHost": "host route not loaded — restart dsh web",
				"github.unavailable": "GitHub unavailable",
				"github.noUser": "Not signed in to GitHub — set a user or a token",
				"github.noRepo": "No repo — set owner/name or sign in to GitHub",
				"github.cycle": "Click to switch repo: {chain}",
				"github.stars": "Stars",
				"github.forks": "Forks",
				"github.issues": "Issues",
				"github.unanswered": "Replies",
				"github.unansweredUnknown": "Replies (needs a token)",
				"github.push": "Pushes",
				"github.release": "Release {tag}",
				"github.noRelease": "No release yet",
				"github.contrib.total": "{n} contributions",
				"github.contrib.unit": "contributions",
				"github.contrib.title": "Contributions",
				"github.board.title": "Repo pulse",
				"github.contrib.windowYear": "last year",
				"github.contrib.windowQuarter": "last 3 months",
				"widget.counts.name": "Turns · Steps",
				"widget.counts.desc": "Turns and steps of the current session",
				"card.counts.value": "{turns} turns · {steps} steps",
				"widget.llm.name": "LLM Time",
				"widget.llm.desc": "Cumulative model inference time",
				"widget.tool.name": "Tool Calls",
				"widget.tool.desc": "Three detail rows (default 失败 / 平均每次 / 工具耗时占比) under the cumulative-time figure; rows are swappable in Config",
				"card.tool.running": "Running",
				"card.tool.slowest": "Slowest",
				"card.tool.failed": "Failed",
				"card.tool.mean": "Average",
				"card.tool.share": "Tool share",
				"card.tool.calls": "{n} calls · {m} tools",
				"card.tool.hint": "Up to {max} rows · drag a row to reorder: the top one shows first on the card",
				"widget.ttft.name": "Avg TTFT",
				"widget.ttft.desc": "Average first-token latency",
				"widget.tps.name": "Rate",
				"widget.tps.desc": "Decode throughput speed",
				"widget.cache.name": "Cache Hit",
				"widget.cache.desc": "Cache hit rate as a ring, with this session's token breakdown",
				"card.cache.unit": "tok",
				"card.cache.uncached": "Uncached input",
				"card.cache.read": "Cache read",
				"card.cache.output": "Output",
				"widget.tokens.name": "Session Tokens",
				"widget.tokens.desc": "This session's token total with its input / output split (session scope, not the per-day cross-session usage)",
				"card.tokens.input": "Input",
				"card.tokens.output": "Output",
				"widget.context.name": "Context Compaction",
				"widget.context.desc": "Context usage percent with the top-right two-tap Compact button; below it folds / reclaimed tokens / items folded",
				"card.context.title": "Context Compaction",
				"card.context.waiting": "Waiting for context data",
				"card.context.compact": "Compact",
				"card.context.confirm": "Confirm",
				"card.context.folds": "Folds",
				"card.context.reclaimed": "Reclaimed",
				"card.context.items": "Items folded",
				"card.context.recent": "Last {ago} ago",
				"widget.context-water.name": "Context Level",
				"widget.context-water.desc": "System/tools/messages share as a segmented bar",
				"card.contextWater.title": "Context Used",
				"card.contextWater.system": "System prompt",
				"card.contextWater.tools": "Tools",
				"card.contextWater.messages": "Messages",
				"widget.task.name": "Tasks",
				"widget.task.desc": "The todo entries themselves: the figure is the in-progress count with the counts line beside it, then up to four rows (in-progress first, then pending); an empty list shows \"No tasks\"",
				"card.task.small": "active · {pending} pending",
				"card.task.doing": "In progress",
				"card.task.pending": "Pending",
				"card.task.done": "Done",
				"card.task.none": "No tasks",
				"widget.task.simToggle": "Toggle no-tasks / with-tasks preview",
				"widget.trajectory.name": "Trajectory",
				"widget.trajectory.desc": "The official Trajectory rail as a card: one colored bar per input / model / tool beat, rolling right as the model keeps calling tools",
				"card.trajectory.legend": "In {input}  Model {model}  Tool {tool}",
				"card.trajectory.input": "Input",
				"card.trajectory.model": "Model",
				"card.trajectory.tool": "Tool",
				"config.laneSizing": "Lane Width",
				"config.laneSizing.time": "By duration",
				"config.laneSizing.equal": "Equal width",
				"widget.harness-board.name": "Session Overview",
				"widget.harness-board.desc": "The session numbers the composer stats line was split into, on ONE 2×4: turns / LLM / tools / rate by default, up to ten, picked and row-dragged in the component config (five per row, wrapping to two rows; a 2×2 card prints its figure at 20px, a board figure is 13px — the board scans a row, the card shows one number)",
				"metric.turns": "Turns",
				"metric.steps": "Steps",
				"metric.llm": "LLM",
				"metric.tool": "Tools",
				"metric.ttft": "TTFT",
				"metric.tps": "Rate",
				"metric.cache": "Cache",
				"metric.in": "In",
				"metric.out": "Out",
				"metric.context": "Context",
				"metric.todoDoing": "Active",
				"metric.todoPending": "Todo",
				"metric.toolFail": "Failed",
				"metric.folds": "Folds",
				"metric.reclaimed": "Reclaimed",
				"metric.running": "Running",
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
				"widget.heatmap-bars.desc": "Daily token-usage bars with a 7-day / 30-day window setting; the 2×4 moves the figures into the title row with MAX/TOTAL labels",
				"widget.heatmap-bars.simToggle": "7-day / 30-day preview",
				"card.heatmap-bars.title": "Token Usage",
				"card.heatmap-bars.max": "MAX",
				"card.heatmap-bars.total": "TOTAL",
				"card.heatmap-bars.hint": "each bar = 2 days (hover a bar for its total; the label is the day the bar ends on)",
				"config.bars.range": "Window",
				"config.bars.range.7": "Last 7 days",
				"config.bars.range.30": "Last 30 days",
				"config.bars.range.hint": "7 days = one bar per day; 30 days = one bar per two days (thirty daily bars are 6px wide in a card and show no magnitude)",
				"config.bars.monthMode.hint": "Only applies to the 7-day window: the 30-day window always rolls",
				"config.monthMode.rolling7": "Rolling (last 7 days)",
				"config.monthMode.weekly": "Weekly aligned",
				"widget.quota-manage.name": "Quota Manager",
				"widget.quota-manage.desc": "Projects the month-end usage percent from the billing period's pace, with today's tokens vs the recommended budget",
				"widget.quota-manage.periodEnd": "Ends {m}-{d}",
				"widget.quota-manage.used": "Today",
				"widget.quota-manage.recommend": "Budget",
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
				"widget.peak-pricing.desc": "DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00; weekends and Chinese public holidays are off-peak all day)",
				"card.peak.title": "Peak Pricing",
				"card.peak.am": "Morning {range}",
				"card.peak.pm": "Afternoon {range}",
				"card.peak.offDay": "{reason} · off-peak all day",
				"card.peak.weekend": "Weekend",
				"card.peak.holiday.newyear": "New Year's Day",
				"card.peak.holiday.spring": "Spring Festival",
				"card.peak.holiday.qingming": "Qingming",
				"card.peak.holiday.labour": "Labour Day",
				"card.peak.holiday.dragon": "Dragon Boat Festival",
				"card.peak.holiday.midautumn": "Mid-Autumn Festival",
				"card.peak.holiday.national": "National Day",
				"card.peak.holiday.custom": "Custom off-peak day",
				"card.peak.staleHint": "The holiday table does not cover {year} (source: {source}) — weekday/weekend only. Add that year's dates under \"Extra off-peak days\".",
				"sim.peak": "Peak/Off-Peak",
				"config.peak.windows": "Peak windows (Beijing time, comma separated, max 2)",
				"config.peak.weekend": "Weekends off-peak all day",
				"config.peak.holiday": "Chinese public holidays off-peak all day",
				"config.peak.timeZone": "Time zone",
				"config.peak.tz.beijing": "Beijing (UTC+8)",
				"config.peak.tz.local": "Local time",
				"config.peak.extra": "Extra off-peak days (2027-01-01 or 2027-02-05..2027-02-11)",
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
				"widget.cc-subscription.desc": "Current plan tier (GOAT / Pro / Max …) and the billing period end",
				"widget.cc-subscription.simToggle": "Cycle the plan tier",
				"widget.sys-gpu-line.name": "GPU Utilization",
				"widget.sys-gpu-line.desc": "GPU utilization sparkline (last ~20 min)",
				"widget.cc-window-5h.name": "5h window",
				"widget.cc-window-5h.desc": "5-hour quota window usage percent and reset time",
				"widget.cc-window-weekly.name": "Weekly window",
				"widget.cc-window-weekly.desc": "Weekly quota window usage percent and reset time",
				"widget.cc-window-monthly.name": "Monthly window",
				"widget.cc-window-monthly.desc": "Billing-period usage percent (used / used+remaining) and period end",
				"widget.github-contrib.name": "Contribution Heatmap",
				"widget.github-contrib.desc": "GitHub contribution calendar in GitHub's own five-step green. 2×2 covers ~3 months, 2×4 the last year (the window GitHub's profile header reports); reads this machine's login unless a user is set",
				"widget.github-stars.name": "Stars",
				"widget.github-stars.desc": "Repo stars with the repo name above and forks below; tap the card to cycle when several repos are watched",
				"widget.github-issues.name": "Issues",
				"widget.github-issues.desc": "Open issues (PRs excluded), with how many nobody has answered underneath — measured only with a token, otherwise the line says so",
				"widget.github-push.name": "Pushes",
				"widget.github-push.desc": "How long since the last push (12s / 5m / 3h / 6d), with the newest release tag underneath",
				"widget.github-board.name": "Repo Pulse",
				"widget.github-board.desc": "2×4 board: stars / open issues / unanswered / last push side by side, with the full repo name and newest release on the title row",
				"widget.usage-mix.name": "Plan Overview",
				"widget.usage-mix.desc": "Cross-platform quota board: today's tokens first, the board's tightest occupancy as a head ring, then one row per platform (its second key pool reads Ⅱ)",
				"card.usage-mix.opencode": "OpenCode Go",
				"card.usage-mix.commandcode": "Command Code",
				"card.usage-mix.today": "Today",
				"card.usage-mix.legend": "{win} resets {at}",
				"card.usage-mix.mark.Δ": "rolling",
				"card.usage-mix.mark.W": "weekly",
				"card.usage-mix.mark.M": "monthly",
				"card.usage-mix.mark.5h": "5h",
				"card.usage-mix.cfg.daily": "Show today's tokens",
				"card.usage-mix.cfg.opencode": "Show OpenCode Go (turn off once unsubscribed)",
				"card.usage-mix.cfg.commandcode": "Show Command Code",
				"widget.trajectory-stats.name": "Trajectory Share",
				"widget.trajectory-stats.desc": "The stats view of Trajectory: each lane's time and share of the window; tap to switch the figure between model and tool",
				"widget.trajectory-stats.simToggle": "Switch figure: model / tool",
				"card.trajectory-stats.legend": "of window time",
				"card.trajectory-stats.cycleHint": "Click to switch the figure: model → tool",
				"card.trajectory-stats.input": "Input",
				"card.trajectory-stats.model": "Model",
				"card.trajectory-stats.tool": "Tool",
				"widget.model-config.name": "Session Config",
				"widget.model-config.desc": "The model route, reasoning effort and agent preset this session runs; flags a route change queued for the next request",
				"card.model-config.title": "Session Config",
				"card.model-config.provider": "Via",
				"card.model-config.preset": "Preset",
				"card.model-config.next": "Next",
				"card.model-config.switched": "New model",
				"card.model-config.simToggle": "Route change / steady / no effort",
				"widget.peak-pricing-board.name": "Peak Hours Board",
				"widget.peak-pricing-board.desc": "The 2×4 peak-pricing timetable: how the rest of today bills — peak 09:00–12:00 / 14:00–18:00, off-peak otherwise, the row billing right now highlighted, plus how long until the rate flips; weekends and Chinese public holidays say why they are off-peak all day (same rule as the 2×2 Peak Pricing card; windows, zone and extra off-peak days configurable)",
				"card.peak-pricing-board.title": "Peak Hours Board",
				"card.peak-pricing-board.peak": "Peak",
				"card.peak-pricing-board.off": "Off-peak",
				"card.peak-pricing-board.until": "until",
				"card.peak-pricing-board.next": "Next",
				"card.peak-pricing-board.nextDay": "Next (tomorrow)",
				"card.peak-pricing-board.nextDayShort": "tomorrow",
				"card.peak-pricing-board.nextOff": "Back to peak",
				"card.peak-pricing-board.left": "{d} left",
				"card.peak-pricing-board.dow.0": "Sun",
				"card.peak-pricing-board.dow.1": "Mon",
				"card.peak-pricing-board.dow.2": "Tue",
				"card.peak-pricing-board.dow.3": "Wed",
				"card.peak-pricing-board.dow.4": "Thu",
				"card.peak-pricing-board.dow.5": "Fri",
				"card.peak-pricing-board.dow.6": "Sat",
				"card.peak-pricing-board.simToggle": "Peak / off-peak / holiday / weekend",
				"card.peak-pricing-board.staleHint": "The holiday table does not cover {year} (source: {source}) — weekday/weekend only. Add that year's dates under \"Extra off-peak days\".",
				"card.peak-pricing-board.weekend": "Weekend",
				"card.peak-pricing-board.holiday.newyear": "New Year's Day",
				"card.peak-pricing-board.holiday.spring": "Spring Festival",
				"card.peak-pricing-board.holiday.qingming": "Qingming",
				"card.peak-pricing-board.holiday.labour": "Labour Day",
				"card.peak-pricing-board.holiday.dragon": "Dragon Boat Festival",
				"card.peak-pricing-board.holiday.midautumn": "Mid-Autumn Festival",
				"card.peak-pricing-board.holiday.national": "National Day",
				"card.peak-pricing-board.holiday.custom": "Custom off-peak day",
				"config.peak-pricing-board.windows": "This card's windows (empty = follow the peak windows below; comma separated, max 2)",
				"config.peak-pricing-board.peakWindows": "Peak windows (Beijing time, comma separated, max 2)",
				"config.peak-pricing-board.weekendOff": "Weekends off-peak all day",
				"config.peak-pricing-board.holidayOff": "Chinese public holidays off-peak all day",
				"config.peak-pricing-board.timeZone": "Time zone",
				"config.peak-pricing-board.tz.beijing": "Beijing (UTC+8)",
				"config.peak-pricing-board.tz.local": "Local time",
				"config.peak-pricing-board.extraHolidays": "Extra off-peak days (2027-01-01 or 2027-02-05..2027-02-11)",
				"widget.goal-progress.name": "Goal Progress",
				"widget.goal-progress.desc": "The active goal's round progress and lifecycle phase — the only progress truth an autonomous run has",
				"card.goal-progress.title": "Goal Progress",
				"card.goal-progress.rounds": "{done} / {max}",
				"card.goal-progress.legend": "{phase} · {ago} ago",
				"card.goal-progress.blockedLegend": "{phase}: {reason}",
				"card.goal-progress.objective": "Goal",
				"card.goal-progress.phase": "Phase",
				"card.goal-progress.phase.active": "Active",
				"card.goal-progress.phase.paused": "Paused",
				"card.goal-progress.phase.blocked": "Blocked",
				"card.goal-progress.phase.complete": "Complete",
				"widget.subagent.name": "Subagents",
				"widget.subagent.desc": "How many subagents this session spawned, how long each has been active, and their labels",
				"card.subagent.title": "Subagents",
				"card.subagent.legendActive": "active time {dur}",
				"card.subagent.legendEarliest": "earliest created {ago} ago",
				"card.subagent.longest": "Longest",
				"card.subagent.continuable": "Continuable",
				"card.subagent.recent": "Latest",
				"card.subagent.ago": "{ago} ago",
				"widget.subagent.simToggle": "Toggle active-time / created-at preview",
				"widget.guard.name": "Permissions",
				"widget.guard.desc": "The effective permission preset and what it allows — the projection already folds preset, sandbox mode and approval policy into this one value",
				"widget.guard.simToggle": "Dangerous/read-only",
				"card.guard.title": "Permissions",
				"card.guard.legend": "{n} options",
				"card.guard.current": "Now",
				"card.guard.allows": "Allows",
				"card.guard.preset.readOnly": "Read Only",
				"card.guard.preset.workspaceWrite": "Workspace Write",
				"card.guard.preset.fullAccess": "Full access",
				"widget.jobs.name": "Background Jobs",
				"widget.jobs.desc": "This session's background jobs: how many are running, the longest one, and what the newest is",
				"card.jobs.title": "Background Jobs",
				"card.jobs.legend": "longest {longest} · {total} total",
				"card.jobs.idle": "{n} finished",
				"card.jobs.longest": "Longest",
				"card.jobs.newest": "Newest",
				"card.jobs.failed": "Failed",
				"widget.jobs.simToggle": "Running / finished / empty preview",
				"widget.sys-disk.name": "Disk & Self-check",
				"widget.sys-disk.desc": "Free space per drive, the DSH session-log footprint and its growth, and the web process's own usage — the operational risks a long-running harness actually hits",
				"widget.sys-disk.simToggle": "Preview readable / unreadable session dir",
				"card.sys-disk.title": "Disk & Self-check",
				"card.sys-disk.freeWord": "free",
				"card.sys-disk.left": "{mount} {pct}%",
				"card.sys-disk.more": "+{n}",
				"card.sys-disk.home": "Session logs {files} · {size} · +{recent}/h",
				"card.sys-disk.proc": "web proc {rss} · {cpu} CPU · {uptime}",
				"card.sys-disk.hint": "web process PID {pid} · {rss} RSS · {cpu} CPU · {uptime} up",
				"widget.window-forecast.name": "Window Forecast",
				"widget.window-forecast.desc": "At the current pace, will the 5h / weekly quota window hit its cap before it resets? (Quota Manager only covers the monthly window)",
				"widget.window-forecast.simToggle": "Read later",
				"card.window-forecast.title": "Window Forecast",
				"card.window-forecast.win5h": "5h",
				"card.window-forecast.winWeekly": "Weekly",
				"card.window-forecast.projected": "est.",
				"card.window-forecast.fillIn": "full in {d}",
				"card.window-forecast.noFill": "no fill · {d}",
				"card.window-forecast.resetLeft": "Until reset",
				"widget.sys-net.name": "Network Throughput",
				"widget.sys-net.desc": "Live per-adapter receive / transmit rate (a counter delta) for this machine, plus the busiest adapter",
				"card.sys-net.title": "Network",
				"card.sys-net.busiest": "Busy",
				"card.sys-net.simToggle": "Live / idle / no sample",
				"card.sys-net.adapters": "{n} links",
				"widget.sys-power.name": "Power",
				"widget.sys-power.desc": "Whether this machine runs on battery, its charge and remaining runtime, and the active Windows power scheme",
				"card.sys-power.title": "Power",
				"card.sys-power.source.ac": "Plugged in",
				"card.sys-power.source.battery": "Battery",
				"card.sys-power.source.unknown": "Source unknown",
				"card.sys-power.desktop": "Desktop (no battery)",
				"card.sys-power.ac": "AC",
				"card.sys-power.dc": "Battery",
				"card.sys-power.row.source": "Source",
				"card.sys-power.row.left": "Left",
				"card.sys-power.row.scheme": "Power plan",
				"card.sys-power.hintAc": "Windows reports no runtime estimate while on mains power, so the Left row stays empty — that is not a read failure",
				"card.sys-power.hintUnknown": "No runtime estimate was reported, so the Left row stays empty",
				"card.sys-power.hintDesktop": "This machine has no battery; only the power scheme is a real reading",
				"card.sys-power.simToggle": "Cycle power states",
				"widget.sys-procs.name": "Top Processes",
				"widget.sys-procs.desc": "The top processes by working-set memory — who is eating the RAM while several agents or models run at once",
				"widget.sys-procs.simToggle": "Toggle many- / one-process preview",
				"card.sys-procs.title": "Top Processes",
				"widget.session-cost.name": "Session Cost",
				"widget.session-cost.desc": "Folds this session's four token buckets into money using the price table, and says which table it used (official / reseller / free route / estimated)",
				"widget.session-cost.simToggle": "List rate / peak rate / no price table",
				"card.session-cost.title": "Session Cost",
				"card.session-cost.uncached": "Miss",
				"card.session-cost.read": "Hit",
				"card.session-cost.output": "Output",
				"card.session-cost.src.official": "Official rate",
				"card.session-cost.src.reseller": "Reseller rate",
				"card.session-cost.src.local": "Free route",
				"card.session-cost.src.fallback": "Estimated rate",
				"card.session-cost.src.unknown": "Source not stated",
				"card.session-cost.noTable": "No price table · tokens",
				"card.session-cost.noRoute": "No model route · tokens",
				"card.session-cost.noRule": "No rate match · tokens",
				"card.session-cost.estHint": "Estimated at the rate in effect now: the session record carries no per-request timestamps, so peak and off-peak hours cannot be priced apart (hence the ≈).",
				"widget.github-notify.name": "To Review",
				"widget.github-notify.desc": "Unread GitHub threads waiting on you: review requests, mentions and assignments, plus the newest one — needs a token or a gh login (no card at all when signed out)",
				"card.github-notify.title": "To Review",
				"card.github-notify.review": "Review requests",
				"card.github-notify.mention": "Mentions",
				"card.github-notify.assign": "Assigned",
				"card.github-notify.quiet": "Nothing waiting",
				"card.github-notify.noNewest": "Newest not reported",
				"card.github-notify.outside": "{n} more in CI / other, not in the three rows",
				"card.github-notify.reason.review_requested": "Review requested",
				"card.github-notify.reason.mention": "Mention",
				"card.github-notify.reason.assign": "Assigned",
				"card.github-notify.reason.ci_activity": "CI activity",
				"card.github-notify.reason.other": "Other",
				"card.github-notify.reason.comment": "Comment",
				"card.github-notify.reason.author": "Your thread",
				"card.github-notify.reason.state_change": "State change",
				"card.github-notify.reason.subscribed": "Subscribed",
				"card.github-notify.reason.team_mention": "Team mention",
				"card.github-notify.reason.invitation": "Invitation",
				"card.github-notify.reason.security_alert": "Security alert",
				"card.github-notify.reason.manual": "Manual",
				"sim.notify": "Unread / Empty / CI only / Thin / Signed out"
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
		//#region src/client/data/session-stats.ts
		/**
		* dsh-widgets — session-stats projection.
		*
		* Folds the live conversation (settled nodes, running tool calls, the open
		* turn/step timeline) into the window-scoped numbers the stats-line widgets
		* print, and projects the same nodes into the 轨迹 three-lane beats.
		*
		* Pure functions over host-provided shapes: no React, no DOM, no module state.
		* The dock collector calls them on every pass; everything here is deterministic
		* for a given input, which is what makes the numbers testable in isolation.
		*/
		/**
		* Normalize the `modelSelection` projection into the contract's own shape.
		*
		* The projection's wire value is read defensively: a bundle whose session
		* controller is older, newer, or absent hands us anything at all, and a card
		* must never be the thing that throws inside the selector (the slot renderer
		* answers a throwing selector by abdicating the whole entry — every card's data
		* goes with it). Unknown members are DROPPED rather than passed through, so a
		* widget can trust the shape it is handed.
		*
		* @param value - the raw projection value (any).
		* @returns the normalized value, or null when there is nothing to report.
		*/
		function normalizeModelSelection(value) {
			if (value === null || typeof value !== "object") return null;
			const route = (raw) => {
				if (raw === null || typeof raw !== "object") return null;
				const r = raw;
				if (typeof r.provider !== "string" || typeof r.model !== "string") return null;
				return {
					provider: r.provider,
					model: r.model,
					...typeof r.reasoningEffort === "string" ? { reasoningEffort: r.reasoningEffort } : {}
				};
			};
			const v = value;
			const next = route(v.next);
			const lastUsed = route(v.lastUsed);
			if (next === null && lastUsed === null) return null;
			return {
				next,
				lastUsed
			};
		}
		/** Normalize the `goal` projection; null when this session has no goal. */
		function normalizeGoal(value) {
			if (value === null || typeof value !== "object") return null;
			const v = value;
			const snap = v.goal;
			if (snap === null || typeof snap !== "object") return null;
			const g = snap;
			if (typeof g.objective !== "string") return null;
			const phase = g.phase;
			if (phase !== "active" && phase !== "paused" && phase !== "blocked" && phase !== "complete") return null;
			const reason = g.blockedReason;
			const blockedReason = reason !== null && typeof reason === "object" && typeof reason.message === "string" ? {
				code: String(reason.code ?? ""),
				message: String(reason.message)
			} : void 0;
			return {
				objective: g.objective,
				phase,
				roundsStarted: typeof v.roundsStarted === "number" ? v.roundsStarted : 0,
				maxGoalRounds: typeof g.maxGoalRounds === "number" ? g.maxGoalRounds : 0,
				createdAt: typeof v.createdAt === "number" ? v.createdAt : 0,
				updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : 0,
				...blockedReason !== void 0 ? { blockedReason } : {}
			};
		}
		/** Normalize the `permissions` projection; null when no permission service is composed. */
		function normalizePermissions(value) {
			if (value === null || typeof value !== "object") return null;
			const v = value;
			if (typeof v.currentValue !== "string") return null;
			const options = Array.isArray(v.options) ? v.options.flatMap((raw) => {
				if (raw === null || typeof raw !== "object") return [];
				const o = raw;
				if (typeof o.value !== "string" || typeof o.name !== "string") return [];
				return [{
					value: o.value,
					name: o.name,
					...typeof o.description === "string" ? { description: o.description } : {}
				}];
			}) : [];
			return {
				currentValue: v.currentValue,
				options
			};
		}
		/** Normalize the `subagentCatalog` projection: identity rows only, unknown
		*  members dropped. Returns null when the projection is absent (which is NOT the
		*  same statement as "no children" — that is `[]`).
		*
		*  `activeMs` is attached from the client session list when it is reachable: the
		*  parent cannot read a child's `subagentTiming` through its own projection (that
		*  key folds THIS session's log), so the duration comes from
		*  `byId[childId].projectionValues.subagentTiming` — the same detour the official
		*  subagent list takes. Absent list ⇒ the field stays absent, never 0.
		*
		*  @param value - the raw `subagentCatalog` projection value (any).
		*  @param summaryOf - lookup for one child's session-list row, or null.
		*  @param now - the wall clock the open-turn duration is measured against.
		*/
		function normalizeSubagents(value, summaryOf, now) {
			if (!Array.isArray(value)) return null;
			const clock = typeof now === "number" ? now : Date.now();
			return value.flatMap((raw) => {
				if (raw === null || typeof raw !== "object") return [];
				const e = raw;
				if (typeof e.id !== "string" || typeof e.createdAt !== "number") return [];
				const mode = e.mode === "continuable" ? "continuable" : "one-shot";
				const activeMs = subagentActiveMs(summaryOf?.(e.id), clock);
				return [{
					id: e.id,
					createdAt: e.createdAt,
					mode,
					...typeof e.label === "string" && e.label !== "" ? { label: e.label } : {},
					...activeMs === void 0 ? {} : { activeMs }
				}];
			});
		}
		/** The active-turn duration one child's session-list row reports, or undefined
		*  when the row (or its timing) has not landed. Never 0-by-assumption. */
		function subagentActiveMs(summary, now) {
			if (summary === null || typeof summary !== "object") return void 0;
			const values = summary.projectionValues;
			if (values === null || typeof values !== "object") return void 0;
			const timing = values.subagentTiming;
			if (timing === null || typeof timing !== "object") return void 0;
			const t = timing;
			const settled = typeof t.settledMs === "number" ? t.settledMs : 0;
			const active = t.active;
			if (active === null || typeof active !== "object") return settled;
			const a = active;
			if (typeof a.since !== "number") return settled;
			const through = typeof a.through === "number" ? a.through : now;
			return settled + Math.max(0, through - a.since);
		}
		/** Normalize this session's `jobsBySession` entry: identity + liveness, unknown
		*  members dropped. Returns null when the list is unavailable (NOT the same
		*  statement as "no jobs" — that is `[]`). */
		function normalizeJobs(value) {
			if (!Array.isArray(value)) return null;
			const statuses = [
				"running",
				"stopping",
				"completed",
				"killed",
				"failed"
			];
			return value.flatMap((raw) => {
				if (raw === null || typeof raw !== "object") return [];
				const j = raw;
				if (typeof j.id !== "string" || typeof j.startedAt !== "number") return [];
				const status = statuses.includes(String(j.status)) ? j.status : "running";
				return [{
					id: j.id,
					kind: typeof j.kind === "string" ? j.kind : "",
					label: typeof j.label === "string" ? j.label : "",
					status,
					startedAt: j.startedAt,
					...typeof j.finishedAt === "number" ? { finishedAt: j.finishedAt } : {},
					...typeof j.detail === "string" && j.detail !== "" ? { detail: j.detail } : {}
				}];
			});
		}
		/** Coerce a possibly-undefined timestamp to a finite number (null when unusable). */
		function timelineTime(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : null;
		}
		/**
		* Project the live conversation into the official 轨迹 layout's three lanes:
		* 输入 (user/steering message) · 模型 (assistant step) · 工具 (tool call).
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
		/**
		* Fold the conversation's tool calls into the 工具调用 card's summary.
		*
		* Why this exists: the card used to print ONE number (cumulative tool time), so a
		* slow turn could not be told apart from a hung tool. The name, the error flag and
		* the two timestamps are all already on the nodes the client loads — a
		* `tool-result` carries `call.name`, `isError` and `callTime`, and a running call
		* carries `name` and `time` — so this costs one pass over the same array
		* `deriveStats` already walks.
		*
		* @param settled - Conversation nodes (`useChat().legacy.nodes`).
		* @param runningCalls - Live tool calls (`useChat().legacy.runningCalls`).
		* @param now - `Date.now()` at this collection pass (the running call's elapsed).
		*/
		function deriveTools(settled, runningCalls, now) {
			let calls = 0;
			let failures = 0;
			let slowest = null;
			const names = /* @__PURE__ */ new Set();
			for (const node of settled ?? []) {
				if (node?.kind !== "tool-result") continue;
				calls += 1;
				const name = typeof node.call?.name === "string" && node.call.name.length > 0 ? node.call.name : null;
				if (name !== null) names.add(name);
				if (node.isError === true) failures += 1;
				const ms = typeof node.callTime === "number" && Number.isFinite(node.time) ? Math.max(0, node.time - node.callTime) : null;
				if (ms !== null && (slowest === null || ms > slowest.ms)) slowest = {
					name: name ?? "—",
					ms
				};
			}
			let running = null;
			let longest = -1;
			for (const call of runningCalls ?? []) {
				if (typeof call?.time !== "number" || !Number.isFinite(call.time)) continue;
				const ms = Math.max(0, now - call.time);
				if (ms > longest) {
					longest = ms;
					running = {
						name: typeof call.name === "string" && call.name.length > 0 ? call.name : "—",
						ms,
						count: 0
					};
				}
			}
			if (running !== null) running = {
				...running,
				count: (runningCalls ?? []).length
			};
			return {
				calls,
				tools: names.size,
				failures,
				slowest,
				running
			};
		}
		/**
		* Fold the conversation's compaction markers into the 上下文压缩 card's summary.
		*
		* Why this exists: context is trimmed silently. A long session shows the meter
		* drop and the transcript lose rows, with nothing saying how much history was
		* folded away or when — so "why did the model forget that?" has no answer on
		* screen. The markers are already nodes in the stream the collector walks
		* (`kind: 'compaction'`), so this costs one more filter over the same array.
		*
		* A `null` `shadowedTokenCount`/`shadowedItemCount` means the summary event was
		* outside the loaded window: the compaction is still COUNTED (it happened) while
		* its figures stay null, so the card can print `—` instead of a fabricated 0.
		*
		* @param settled - Conversation nodes (`useChat().legacy.nodes`).
		*/
		function deriveCompaction(settled) {
			let count = 0;
			let reclaimed = 0;
			let items = 0;
			const events = [];
			const num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
			for (const node of settled ?? []) {
				if (node?.kind !== "compaction") continue;
				count += 1;
				const tokens = num(node.shadowedTokenCount);
				const dropped = num(node.shadowedItemCount);
				reclaimed += tokens ?? 0;
				items += dropped ?? 0;
				events.push({
					at: num(node.time) ?? 0,
					reclaimed: tokens,
					items: dropped
				});
			}
			events.sort((a, b) => b.at - a.at);
			return {
				count,
				reclaimed,
				items,
				recent: events.slice(0, 5)
			};
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
		//#endregion
		//#region src/client/data/collector.tsx
		/**
		* dsh-widgets — the data collector.
		*
		* Renders in the `conversation.composer.dock` slot (so the shell mounts it while a
		* session exists) and folds three kinds of input into the bridge:
		*   1. the live conversation projection (session stats + the 轨迹 beats);
		*   2. five host routes — OpenCode usage, Command Code usage, the two daily token
		*      maps, GitHub, and the hardware snapshot;
		*   3. the installs WITHOUT dsh-usage-center, whose heatmap is self-accounted here
		*      and persisted across mounts.
		*
		* Moved out of `client/index.ts` (Phase 2.5) with its body unchanged. It receives
		* the bridge handles instead of closing over them: `useBridge` / `setState` are
		* stable, while `state` and `prefs` are LIVE bindings, so those two arrive as
		* getters and are read at the point of use.
		*/
		/** Build the collector component bound to one bridge. */
		function createCollector(deps) {
			const { useBridge, setState } = deps;
			return ({ useSession, useProjection, useChat, useSessions }) => {
				const settled = (useChat ? useChat((c) => c.legacy?.nodes) : useSession((s) => s.chat?.legacy?.nodes)) ?? [];
				const timeline = (useChat ? useChat((c) => c.timeline) : useSession((s) => s.chat?.timeline)) ?? void 0;
				const runningCalls = (useChat ? useChat((c) => c.legacy?.runningCalls) : useSession((s) => s.runningCalls)) ?? [];
				const running = useSession ? useSession((s) => s.running) : false;
				const projected = useProjection ? useProjection("sessionStats") : void 0;
				const usage = useProjection ? useProjection("tokenUsage") : void 0;
				const contextPres = useProjection ? useProjection("contextPressure") : void 0;
				const contextBrk = useProjection ? useProjection("contextBreakdown") : void 0;
				const todosProj = useProjection ? useProjection("todos") : void 0;
				const modelSelProj = useProjection ? useProjection("modelSelection") : void 0;
				const agentPresetProj = useProjection ? useProjection("agentPreset") : void 0;
				const goalProj = useProjection ? useProjection("goal") : void 0;
				const permsProj = useProjection ? useProjection("permissions") : void 0;
				const subagentProj = useProjection ? useProjection("subagentCatalog") : void 0;
				const jobsBySession = useSessions ? useSessions((s) => s?.jobsBySession) : void 0;
				const sessionsById = useSessions ? useSessions((s) => s?.byId) : void 0;
				const sessionId = useSession ? useSession((s) => s?.sessionId ?? s?.id) : void 0;
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
				const ccPullRef = react.useRef(() => {});
				const ccRetryPending = react.useRef(false);
				const pullCommandCode = react.useCallback(() => {
					fetch("/api/commandcode-usage").then(async (r) => {
						const data = await r.json().catch(() => null);
						if (!r.ok) {
							const error = data?.error;
							if (r.status === 404) setState({ commandCodeError: "unloaded" });
							else if (r.status === 503) setState({ commandCodeError: "unconfigured" });
							else setState({ commandCodeError: error ? `http:${r.status}:${error}` : `http:${r.status}` });
							return;
						}
						const next = data;
						if (ccPayloadDegraded(next) && deps.getState().commandCode !== null && !ccPayloadDegraded(deps.getState().commandCode)) {
							if (!ccRetryPending.current) {
								ccRetryPending.current = true;
								window.setTimeout(() => {
									ccRetryPending.current = false;
									ccPullRef.current();
								}, 5e3);
							}
							return;
						}
						setState({
							commandCode: next,
							commandCodeError: null
						});
					}).catch(() => setState({ commandCodeError: "unavailable" }));
				}, []);
				ccPullRef.current = pullCommandCode;
				const pullUsageDaily = react.useCallback((refreshNow) => {
					fetch(`/api/widgets-usage-daily${refreshNow ? "?refresh=1" : ""}`).then(async (r) => r.ok ? await r.json().catch(() => null) : null).then((data) => {
						setState({ usageDaily: data?.available === true && data.daily !== null && data.daily !== void 0 ? data.daily : null });
					}).catch(() => {});
				}, []);
				const pullCommandCodeDaily = react.useCallback((refreshNow) => {
					fetch(`/api/widgets-usage-daily?provider=commandcode${refreshNow ? "&refresh=1" : ""}`).then(async (r) => r.ok ? await r.json().catch(() => null) : null).then((data) => {
						const daily = data?.available === true && data.daily !== null && data.daily !== void 0 ? data.daily : null;
						if (daily !== null) setState({ commandCodeDaily: daily });
					}).catch(() => {});
				}, []);
				const prevRunningRef = react.useRef(running);
				react.useEffect(() => {
					const refresh = () => {
						fetch("/api/opencode-usage").then((r) => r.json()).then((data) => setState({ usageData: data })).catch(() => {});
						fetch("/api/opencode-usage-multi").then((r) => r.json()).then((data) => setState({ usageMulti: data })).catch(() => {});
						pullCommandCode();
						pullUsageDaily(true);
						pullCommandCodeDaily(true);
					};
					if (running === prevRunningRef.current) refresh();
					else if (!running) refresh();
					prevRunningRef.current = running;
				}, [running]);
				react.useEffect(() => {
					pullUsageDaily(false);
					const id = window.setInterval(() => {
						if (!document.hidden) pullUsageDaily(false);
					}, 6e4);
					return () => window.clearInterval(id);
				}, [pullUsageDaily]);
				const ccOnRail = snap.open && (snap.prefs.installed ?? []).some((key) => WIDGET_RUNTIME[parseInstanceKey(key).widgetId]?.source === "cc");
				react.useEffect(() => {
					if (!ccOnRail) return;
					const tick = () => {
						if (!document.hidden) pullCommandCode();
					};
					const onVisible = () => {
						if (!document.hidden) pullCommandCode();
					};
					pullCommandCode();
					const id = window.setInterval(tick, 6e4);
					document.addEventListener("visibilitychange", onVisible);
					return () => {
						window.clearInterval(id);
						document.removeEventListener("visibilitychange", onVisible);
					};
				}, [ccOnRail, pullCommandCode]);
				const ghKeys = (snap.prefs.installed ?? []).filter((key) => WIDGET_RUNTIME[parseInstanceKey(key).widgetId]?.source === "github");
				const ghUser = ghKeys.map((key) => snap.prefs.cardConfigs?.[key]?.user ?? "").map((s) => s.trim()).find((s) => s !== "") ?? "";
				const ghRepos = Array.from(new Set(ghKeys.flatMap((key) => String(snap.prefs.cardConfigs?.[key]?.repos ?? "").split(",").map((s) => s.trim()).filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s))))).slice(0, 4);
				const ghRequest = `${ghUser}|${ghRepos.join(",")}`;
				const ghNotif = (snap.prefs.installed ?? []).some((key) => key === "github-notify" || key.startsWith("github-notify@"));
				react.useEffect(() => {
					if (ghKeys.length === 0) return;
					const pull = () => {
						const params = new URLSearchParams();
						if (ghUser !== "") params.set("user", ghUser);
						if (ghRepos.length > 0) params.set("repos", ghRepos.join(","));
						if (ghNotif) params.set("notif", "1");
						const query = params.toString();
						fetch(`/api/github${query === "" ? "" : `?${query}`}`).then(async (r) => {
							const data = await r.json().catch(() => null);
							if (!r.ok) {
								setState({ githubError: r.status === 404 ? "unloaded" : `http:${r.status}` });
								return;
							}
							setState({
								github: data,
								githubError: null
							});
						}).catch(() => setState({ githubError: "unavailable" }));
					};
					pull();
					const onVisible = () => {
						if (!document.hidden) pull();
					};
					const id = window.setInterval(() => {
						if (!document.hidden) pull();
					}, 6e5);
					document.addEventListener("visibilitychange", onVisible);
					return () => {
						window.clearInterval(id);
						document.removeEventListener("visibilitychange", onVisible);
					};
				}, [
					ghRequest,
					ghKeys.length,
					ghNotif
				]);
				react.useEffect(() => {
					const sysIds = Object.keys(WIDGET_RUNTIME).filter((id) => WIDGET_RUNTIME[id]?.source === "sys");
					const sysKeys = (snap.prefs.installed ?? []).filter((key) => sysIds.some((id) => key === id || key.startsWith(id + "@")));
					const secs = sysKeys.length === 0 ? 0 : Math.min(...sysKeys.map((key) => resolveInterval(snap.prefs.cardConfigs?.[key])));
					if (!(secs > 0)) return;
					const refresh = () => {
						fetch("/api/sysinfo").then((r) => r.json()).then((data) => {
							setState({ sysinfo: data });
							ingestSysInfo(data);
						}).catch(() => {});
						fetch("/api/host/overview").then(async (r) => {
							if (!r.ok) {
								setState({ hostError: r.status === 404 ? "unloaded" : `http:${r.status}` });
								return;
							}
							const data = await r.json().catch(() => null);
							if (data === null) {
								setState({ hostError: "unavailable" });
								return;
							}
							setState({
								host: data,
								hostError: null
							});
						}).catch(() => {});
					};
					refresh();
					const id = window.setInterval(refresh, secs * 1e3);
					return () => window.clearInterval(id);
				}, [snap.prefs.installed, snap.prefs.cardConfigs]);
				const wantsPricing = (snap.prefs.installed ?? []).some((key) => key === "session-cost" || key.startsWith("session-cost@"));
				react.useEffect(() => {
					if (!wantsPricing) return;
					let alive = true;
					const pull = () => {
						fetch("/api/widgets-pricing").then(async (r) => r.ok ? await r.json().catch(() => null) : null).then((data) => {
							if (alive && data !== null) setState({ pricing: data });
						}).catch(() => {});
					};
					pull();
					const id = window.setInterval(pull, 6e5);
					return () => {
						alive = false;
						window.clearInterval(id);
					};
				}, [wantsPricing]);
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
					const heatTz = deps.getPrefs().cardConfigs?.heatmap?.timeZone || "Asia/Shanghai";
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
					const compaction = deriveCompaction(settled);
					const stats = {
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
						heatmapGrid: buildHeatmapGrid(heatmapDays, deps.getPrefs().cardConfigs?.heatmap?.monthMode || "rolling", heatTz),
						heatmapRaw: { ...heatmapDays },
						trajectory: deriveTrajectory(settled, runningCalls, timeline, now),
						tools: deriveTools(settled, runningCalls, now),
						compactions: compaction.count > 0 ? compaction : null,
						modelSelection: normalizeModelSelection(modelSelProj),
						agentPreset: typeof agentPresetProj === "string" && agentPresetProj !== "" ? agentPresetProj : null,
						goal: normalizeGoal(goalProj),
						permissions: normalizePermissions(permsProj),
						subagents: normalizeSubagents(subagentProj, typeof sessionsById === "object" && sessionsById !== null ? (id) => sessionsById[id] : null, now),
						jobs: normalizeJobs(typeof jobsBySession === "object" && jobsBySession !== null && typeof sessionId === "string" ? jobsBySession[sessionId] ?? [] : void 0)
					};
					setState({ stats });
				}, [
					settled,
					projected,
					usage,
					contextPres,
					contextBrk,
					todosProj,
					modelSelProj,
					agentPresetProj,
					goalProj,
					permsProj,
					subagentProj,
					jobsBySession,
					sessionsById,
					sessionId,
					timeline,
					runningCalls,
					now,
					snap.usageDaily,
					deps.getPrefs().cardConfigs?.heatmap?.monthMode,
					deps.getPrefs().cardConfigs?.heatmap?.timeZone
				]);
				return null;
			};
		}
		//#endregion
		//#region src/client/runtime/live-stats.ts
		/**
		* dsh-widgets — the ONE live-stats assembly.
		*
		* Both the rail and the preview surfaces must render a widget from the SAME
		* record, because "the preview shows what the card will show" is a promise the
		* market and 组件配置 make to the user: the cards are reviewed there INSTEAD of
		* being installed on a rail in use. So the bridge snapshot → `WidgetStats` fold
		* lives here once, and the rail no longer assembles it inline (it did, at
		* rail-view.tsx:319-330, before the preview surfaces could read it).
		*
		* The fold is exactly what the rail used to do:
		*   1. the collector's session stats, with the heatmap day map FALLING BACK to the
		*      persisted log only when live stats carry no heatmap fields (first paint
		*      before the collector's effect runs) — never overriding live values;
		*   2. the payload slices the collector keeps in the bridge (usage / pool /
		*      Command Code / hardware / GitHub) plus their error codes;
		*   3. the pooled views the usage cards cycle through (`total` first);
		*   4. the instance's own saved config LAST, so a config-driven card
		*      (peak-pricing's windows, the heatmap's timezone, 会话概览's metrics) renders
		*      the instance's real settings rather than the defaults.
		*/
		/** Zeroed session stats for the first paint, before the collector's first pass. */
		const ZERO_STATS = {
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
		/**
		* Fold one bridge snapshot into the stats record a widget instance renders from.
		*
		* @param snap - the live bridge snapshot.
		* @param prefs - the live prefs (heatmap fallback config + this instance's config).
		* @param key - the instance key (`widget@size`), for `cardConfigs` lookup.
		* @param armedAction - the rail's armed-action id (transient UI state; previews pass null).
		* @returns the exact record the rail passes to `Widget.render`.
		*/
		function buildLiveStats(snap, prefs, key, armedAction = null) {
			const statsHeat = snap.stats;
			const fallbackRaw = statsHeat?.heatmapRaw && Object.keys(statsHeat.heatmapRaw).length > 0 ? statsHeat.heatmapRaw : snap.usageDaily ?? loadHeatmapStore();
			const base = {
				...snap.stats ?? ZERO_STATS,
				...statsHeat?.heatmapRaw ? {} : { heatmapRaw: { ...fallbackRaw } },
				...statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, prefs.cardConfigs?.heatmap?.monthMode || "rolling", prefs.cardConfigs?.heatmap?.timeZone || "Asia/Shanghai") }
			};
			const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1 ? ["total", ...snap.usageMulti.keys.map((entry, i) => entry.label || `Key ${i + 1}`)] : void 0;
			return {
				...base,
				usageData: snap.usageData,
				usageMulti: snap.usageMulti,
				commandCode: snap.commandCode,
				commandCodeError: snap.commandCodeError,
				commandCodeDaily: snap.commandCodeDaily,
				sysinfo: snap.sysinfo,
				host: snap.host,
				hostError: snap.hostError,
				pricing: snap.pricing,
				github: snap.github,
				githubError: snap.githubError,
				poolModes,
				armedAction,
				...prefs.cardConfigs?.[key] ?? {}
			};
		}
		/** localStorage key holding the whole prefs object. */
		const STORAGE_KEY = "harness-widgets.state";
		/** Local mirror of the last saved-at timestamp, compared against the host file
		*  on boot so the same DSH service converges from any browser origin
		*  (localhost vs 127.0.0.1 are different localStorage realms). */
		const SAVED_AT_KEY = "harness-widgets.state.savedAt";
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
			hideStatsLine: false,
			squircle: true,
			cornerPercent: 16,
			marketView: "list"
		};
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
			if (s.marketView !== "grid" && s.marketView !== "list") s.marketView = DEFAULTS.marketView;
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
				const n = +(localStorage.getItem("harness-widgets.state.savedAt") ?? "");
				return Number.isFinite(n) && n > 0 ? n : 0;
			} catch {
				return 0;
			}
		}
		//#endregion
		//#region src/client/runtime/host-sync.ts
		/**
		* dsh-widgets — the preference WRITE path.
		*
		* Every write is one transaction with two sinks:
		*   1. localStorage, the fast per-origin cache, written immediately; and
		*   2. the host file (`/api/widgets-state`), written through a 400 ms debounce
		*      and flushed with `sendBeacon` when the page is being torn down.
		*
		* The localStorage mirror lives in this module (rather than in
		* `runtime/prefs.ts`) because it shares the SAME timestamp as the host write:
		* whichever sink is newer decides the winner at boot, so the two writes cannot be
		* separated without splitting that decision.
		*/
		/** Same-origin host route holding the authoritative state file. */
		const STORE_API = "/api/widgets-state";
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
		/** Corner-radius gears, as a PERCENT of the card's short side (Settings →
		*  圆角档位). Percent, not px: the reference (an iOS-style widget) keeps the
		*  corner-to-side RELATION fixed, so a 150px card and a magnified 190px card
		*  must not get the same corner. 12% ≈ the old fixed 16px at side 150 and the
		*  reference card's own ratio; 16% is the default because the same ratio reads
		*  sharper on a small card than on the ~480px card the reference is drawn at. */
		const CORNER_GEARS = [
			12,
			16,
			20,
			24
		];
		/** Corner radius in px for a card of short side `unit`. */
		function cardRadius(unit, percent = 16) {
			return Math.round(unit * ((Number.isFinite(percent) ? Math.max(8, Math.min(28, percent)) : 16) / 100));
		}
		/** Content inset. It does NOT follow the corner: the card's reference ratio is
		*  the CORNER's (16% of the short side), while the content sits close to the
		*  edge — a padded-out inset pushed the title visibly away from the card's left
		*  and top edges, which is the relationship the reference card does not have.
		*  Flat 12 · scale, i.e. 12px at the plugin's 150px default, as it always was. */
		function cardInnerPad(unit) {
			return Math.round(12 * (unit / 150));
		}
		//#endregion
		//#region src/client/render/preview/sim.ts
		function nextSim(w, current) {
			if (w === void 0) return current;
			const base = current ?? w.example?.sim ?? {};
			const steps = w.example?.simSteps;
			if (Array.isArray(steps) && steps.length > 0) return steps[(steps.findIndex((s) => JSON.stringify(s) === JSON.stringify(base)) + 1) % steps.length];
			const boolKey = Object.keys(base).find((k) => typeof base[k] === "boolean");
			return boolKey !== void 0 ? {
				...base,
				[boolKey]: !base[boolKey]
			} : { ...base };
		}
		//#endregion
		//#region src/client/render/charts/theme.ts
		/**
		* dsh-widgets — chart colour tones.
		*
		* Semantic aliases, not hex: the cards follow light/dark and every future token
		* change. Moved verbatim out of components.tsx (Phase 3.4).
		*
		* `accent` is the palette's SIXTH step and exists for one reason: the official
		* timeline strip paints its 模型 lane with a MIX (brand blue 60% with the error red)
		* rather than a single token, and a card that shows the same three lanes' shares must
		* be able to name that colour. Widgets never pass raw colours — the palette stays
		* semantic so light/dark and future token changes keep working — so the mix lives
		* here, ONCE, and `lanes.tsx` reads it from here too (it used to repeat the
		* expression, which is how the two could drift).
		*/
		const CHART_TONES = {
			primary: "var(--dsw-alias-state-business-primary)",
			success: "var(--dsw-alias-state-success-primary)",
			warn: "var(--dsw-alias-state-warn-primary)",
			danger: "var(--dsw-alias-state-error-primary)",
			muted: "var(--dsw-alias-label-tertiary)",
			/** The official 模型 lane: brand blue mixed 60/40 with the error red. */
			accent: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, var(--dsw-alias-state-error-secondary))"
		};
		//#endregion
		//#region src/client/render/charts/bars.tsx
		/** The `bars` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function BarsChart({ chart, side, width, pad, scale }) {
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
			return null;
		}
		//#endregion
		//#region src/client/render/charts/barsV.tsx
		/** The `barsV` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function BarsVChart({ chart, side, width, pad, scale }) {
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
			return null;
		}
		//#endregion
		//#region src/client/render/charts/breakdown.tsx
		/**
		* The `breakdown` chart — a label / value / optional-cost row table.
		*
		* The card the user asked for (2026-09-28, the 「Token 用量」 element): a hairline
		* divider under the head, then one row per bucket with the label flush left, the
		* figure hard right, and — when the route has a published rate — the money in a
		* third column. It is a GRID, not a flex row per line: the value and cost columns
		* must line up across rows even though the labels and figures differ in width, and
		* only a shared column track can promise that at every card side.
		*
		* The cost cell stays EMPTY when the widget did not supply one: a route with no
		* price rule must not print a confident `$0.00` (the same rule usage-center's
		* pricing module is written around).
		*/
		function BreakdownChart({ chart, scale }) {
			if (chart.kind !== "breakdown" || !chart.breakdown || chart.breakdown.length === 0) return null;
			const rows = chart.breakdown;
			const priced = rows.some((r) => r.cost !== void 0 && r.cost !== "");
			const font = Math.round(10 * scale);
			const fade = `linear-gradient(to right, #000 calc(100% - ${Math.max(6, Math.round(14 * scale))}px), transparent 100%)`;
			const cells = [];
			for (const [i, row] of rows.entries()) {
				const tone = row.tone ? CHART_TONES[row.tone] : void 0;
				cells.push(react.createElement("span", {
					key: `l${i}`,
					style: {
						fontSize: `${font}px`,
						lineHeight: 1.2,
						fontWeight: 500,
						color: "var(--dsw-alias-label-secondary)",
						minWidth: 0,
						overflow: "hidden",
						whiteSpace: "nowrap",
						maskImage: fade,
						WebkitMaskImage: fade,
						maskSize: "100% 100%",
						WebkitMaskSize: "100% 100%",
						maskRepeat: "no-repeat",
						WebkitMaskRepeat: "no-repeat"
					}
				}, row.label));
				cells.push(react.createElement("span", {
					key: `v${i}`,
					style: {
						fontSize: `${font}px`,
						lineHeight: 1.2,
						fontWeight: 600,
						color: tone ?? "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums",
						whiteSpace: "nowrap",
						justifySelf: "end"
					}
				}, row.value));
				if (priced) cells.push(react.createElement("span", {
					key: `c${i}`,
					style: {
						fontSize: `${font}px`,
						lineHeight: 1.2,
						fontWeight: 500,
						color: tone ?? "var(--dsw-alias-label-tertiary)",
						fontVariantNumeric: "tabular-nums",
						whiteSpace: "nowrap",
						justifySelf: "end",
						minWidth: `${Math.round(30 * scale)}px`,
						textAlign: "right"
					}
				}, row.cost ?? ""));
			}
			return react.createElement("div", { style: {
				display: "grid",
				width: "100%",
				gridTemplateColumns: `1fr auto${priced ? " auto" : ""}`,
				columnGap: Math.round(8 * scale),
				rowGap: Math.round(4 * scale),
				borderTop: "1px solid var(--dsw-alias-border-l1)",
				paddingTop: Math.round(6 * scale)
			} }, ...cells);
		}
		//#endregion
		//#region src/client/render/charts/lanes.tsx
		/**
		* dsh-widgets — the 对话轨迹 lanes chart.
		*
		* The three-lane strip keeps the OFFICIAL 轨迹 geometry (see each constant below)
		* but stacks the lanes contiguously so they fill the card's remaining height.
		* Moved verbatim out of components.tsx (Phase 3.4), constants included: `lanes` is
		* their only consumer.
		*/
		/** 对话轨迹 lane colors — EXACTLY the official 轨迹 timeline's three lanes
		*  (TrajectoryTimeline.module.css `[data-timeline-span=…]`): 输入 = business
		*  primary, 模型 = the assistant span's decoding color (brand blue 60% mixed
		*  with the error red), 工具 = the warn label. Keeping the expressions (not
		*  resolved hex) means the card follows light/dark and future token changes. */
		const LANE_TONES = {
			input: CHART_TONES.primary,
			model: CHART_TONES.accent,
			tool: "var(--dsw-alias-state-warn-label)"
		};
		/** Lane draw order, top→bottom — the SAME order as the subtitle's counts
		*  (输入 / 模型 / 工具), which is also the official 轨迹 rail's order. */
		const LANE_ORDER = [
			"input",
			"model",
			"tool"
		];
		/** The trajectory window is a FIXED slot count, ONE SLOT PER BEAT: a bar keeps
		*  its column as the window rolls (newest entering at the right), instead of the
		*  whole row re-scaling every time a beat arrives. Until the window fills, the
		*  beats SHARE the lane instead (n beats → 100/n % each), so a lone segment owns
		*  its lane. */
		const LANE_SLOTS = 30;
		/** Lane corner radius — the official span's `border-radius: 1px`. The official
		*  VERTICAL numbers (8px bars on a 14px pitch) are deliberately NOT used: the
		*  three lanes are stacked contiguously and stretch to the card's remaining
		*  height (user's call, 2026-09-25 — see the lanes branch). */
		const LANE_RADIUS = 1;
		/** The official span gap: `--trajectory-span-gap: min(widthPercent * .08%, 1px)`,
		*  applied as `left: left% + gap` and `width: max(2px, width% - 2 * gap)` — so
		*  two neighbouring beats stand `2 * gap` apart, never less than the 2px floor
		*  the official span sets with `min-width: 2px`. */
		const LANE_GAP_RATIO = .08;
		const LANE_GAP_MAX_PX = 1;
		const LANE_MIN_PX = 2;
		function LanesChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "lanes" && chart.lanes) {
				const lanes = chart.lanes;
				if (lanes.length === 0) return null;
				const timeMode = chart.laneSizing !== "equal" && lanes.some((l) => (l.ms ?? 0) > 0);
				const slices = [];
				if (timeMode) {
					const total = lanes.reduce((sum, l) => sum + Math.max(0, l.ms ?? 0), 0) || 1;
					let acc = 0;
					for (const l of lanes) {
						const w = Math.max(0, l.ms ?? 0) / total * 100;
						slices.push([acc, w]);
						acc += w;
					}
				} else {
					const slotPct = 100 / Math.max(1, Math.min(LANE_SLOTS, lanes.length));
					for (let i = 0; i < lanes.length; i++) slices.push([i * slotPct, slotPct]);
				}
				const contentW = Math.max(48, (width ?? side) - 2 * (pad ?? Math.round(12 * scale)));
				const gapPct = (l) => Math.min(l * LANE_GAP_RATIO, LANE_GAP_MAX_PX / contentW * 100);
				const rows = LANE_ORDER.map((kind, lane) => {
					const segs = lanes.map((l, i) => ({
						l,
						i
					})).filter((e) => e.l.kind === kind).map((e) => {
						const [left, width] = slices[e.i];
						const gap = gapPct(width);
						return react.createElement("div", {
							key: e.i,
							className: "dsx-lane-seg",
							"data-lane": kind,
							title: e.l.label,
							style: {
								position: "absolute",
								top: 0,
								bottom: 0,
								left: `calc(${left.toFixed(4)}% + ${gap.toFixed(4)}%)`,
								width: `max(${LANE_MIN_PX}px, calc(${width.toFixed(4)}% - ${(2 * gap).toFixed(4)}%))`,
								minWidth: LANE_MIN_PX,
								borderRadius: LANE_RADIUS,
								background: LANE_TONES[kind] ?? LANE_TONES.input,
								opacity: kind === "input" ? .78 : 1
							}
						});
					});
					return react.createElement("div", {
						key: kind,
						className: "dsx-lane-row",
						"data-lane": kind,
						"data-lane-index": lane,
						style: {
							position: "relative",
							flex: 1,
							minWidth: 0,
							minHeight: 0
						}
					}, ...segs);
				});
				return react.createElement("div", {
					className: "dsx-lanes",
					style: {
						width: "100%",
						flex: 1,
						minHeight: 0,
						marginTop: Math.round(6 * scale),
						display: "flex",
						flexDirection: "column"
					}
				}, ...rows);
			}
			return null;
		}
		//#endregion
		//#region src/client/render/charts/quotas.tsx
		/** The `quotas` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function QuotasChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "quotas" && chart.quotas && chart.quotas.length > 0) {
				const CELLS = 24;
				const cellH = Math.max(5, Math.round(9 * scale));
				const rows = chart.quotas.map((q, i) => {
					const pct = Math.max(0, Math.min(100, q.pct));
					const filled = Math.max(0, Math.min(CELLS, Math.round(pct / 100 * CELLS)));
					const tone = CHART_TONES[q.tone ?? "primary"] ?? CHART_TONES.primary;
					const cells = Array.from({ length: CELLS }, (_, c) => react.createElement("div", {
						key: c,
						style: {
							flex: 1,
							minWidth: 0,
							height: `${cellH}px`,
							borderRadius: 2,
							background: tone,
							opacity: c < filled ? .92 : .14
						}
					}));
					return react.createElement("div", {
						key: i,
						style: {
							display: "flex",
							flexDirection: "column",
							gap: Math.round(2 * scale)
						}
					}, react.createElement("div", { style: {
						display: "flex",
						alignItems: "baseline",
						justifyContent: "space-between",
						gap: 6,
						minWidth: 0
					} }, react.createElement("span", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						lineHeight: 1.15,
						fontWeight: 500,
						color: "var(--dsw-alias-label-secondary)",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis"
					} }, q.label), react.createElement("span", { style: {
						fontSize: `${Math.round(9 * scale)}px`,
						lineHeight: 1.15,
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums",
						whiteSpace: "nowrap",
						flex: "none"
					} }, `${Math.round(pct)}%`)), react.createElement("div", { style: {
						display: "flex",
						gap: 2,
						width: "100%"
					} }, ...cells));
				});
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: Math.round(5 * scale),
					width: "100%"
				} }, ...rows);
			}
			return null;
		}
		//#endregion
		//#region src/client/render/charts/segments.tsx
		/** The `segments` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function SegmentsChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "segments" && chart.segments && chart.totalTokens) {
				const officialColors = [
					"var(--dsw-static-neutral-bluish-400)",
					"rgb(167, 139, 250)",
					"var(--dsw-static-blue-450)"
				];
				const useTones = chart.segmentsPalette === "tones";
				const tintOf = (index, tone) => useTones ? CHART_TONES[tone] ?? officialColors[index % officialColors.length] ?? officialColors[0] : officialColors[index % officialColors.length] ?? officialColors[0];
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
					const tint = tintOf(i, s.tone ?? "primary");
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
					const tint = tintOf(i, s.tone ?? "primary");
					const valueText = chart.segmentsValue === "percent" ? total > 0 ? `${Math.round(s.tokens / total * 100)}%` : "—" : fmt(s.tokens);
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
					} }, valueText));
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
			return null;
		}
		//#endregion
		//#region src/client/render/charts/rings.tsx
		/** The `rings` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function RingsChart({ chart, side, width, pad, scale }) {
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
			return null;
		}
		//#endregion
		//#region src/client/render/charts/line.tsx
		/** The `line` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function LineChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "line" && chart.line) {
				const labelH = Math.round(10 * scale);
				const max = Math.max(1, chart.line.max ?? 100);
				const vals = chart.line.values;
				const W = Math.max(1, vals.length - 1);
				const X = (i) => W === 0 ? 0 : i / W * 100;
				const PAD = 3;
				const Y = (v) => PAD + 94 * (1 - Math.max(0, Math.min(max, v)) / max);
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
			return null;
		}
		//#endregion
		//#region src/client/render/charts/figures.tsx
		/** The `figures` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function FiguresChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "figures" && (chart.figures && chart.figures.length || chart.figureRows && chart.figureRows.length)) {
				const padAmt = pad ?? Math.round(12 * scale);
				const rowWidth = `calc(100% + ${2 * padAmt}px)`;
				const drawRow = (figures, key) => {
					const items = figures.map((f, i) => {
						const valColor = f.tone ? CHART_TONES[f.tone] ?? CHART_TONES.primary : "var(--dsw-alias-label-primary)";
						return react.createElement("div", {
							key: i,
							style: {
								flex: "0 1 auto",
								minWidth: 0,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
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
							whiteSpace: "nowrap",
							maxWidth: "100%",
							overflow: "hidden",
							textOverflow: "ellipsis"
						} }, f.value));
					});
					return react.createElement("div", {
						key,
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-evenly",
							width: "100%"
						}
					}, items);
				};
				const rows = chart.figureRows && chart.figureRows.length ? chart.figureRows : [chart.figures ?? []];
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					gap: rows.length > 1 ? Math.round(6 * scale) : 0,
					width: rowWidth,
					marginLeft: -padAmt,
					marginRight: -padAmt
				} }, rows.map((row, i) => drawRow(row, i)));
			}
			return null;
		}
		//#endregion
		//#region src/client/lib/arc.ts
		/**
		* dsh-widgets — the round-capped arc's ink length (shared, pure).
		*
		* A progress donut is drawn as one dash: `strokeDasharray = ink, circumference`.
		* With `strokeLinecap: 'round'` the paint extends `stroke / 2` BEYOND each end, so a
		* value that is merely close to 100% has its two caps meet and swallow the gap — the
		* ring reads as a CLOSED circle at 99%, which is a lie the number beside it has to
		* correct (the owner's report, 2026-09-28: 「只有 100 才是彻底闭环的圆」).
		*
		* So the usable arc is the circumference MINUS the two cap allowances and a minimum
		* daylight, and 100% is the only value that closes:
		*  - `ratio >= 1` → the full circumference (a closed ring, caps irrelevant);
		*  - otherwise    → `ratio × usable`, where `usable = c − stroke − capGap`, which
		*    guarantees `c − ink − stroke >= capGap` of empty track between the caps.
		*
		* The ring is therefore a QUALITATIVE dial (head and tail always visible); the exact
		* figure is the number the card prints at 20px, and the ring's hover text.
		*/
		/**
		* Ink length in px for a round-capped progress arc.
		*
		* @param ratio - filled fraction (0..1; values ≥ 1 close the ring).
		* @param circumference - the ring's circumference in px.
		* @param stroke - arc thickness in px (its round caps extend stroke/2 each side).
		* @param capGap - minimum daylight between the caps below 100% (px, scaled by caller).
		* @returns the dash length to paint.
		*/
		function cappedArcInk(ratio, circumference, stroke, capGap = 2) {
			if (!Number.isFinite(circumference) || circumference <= 0) return 0;
			const r = Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
			if (r >= 1) return circumference;
			const usable = Math.max(0, circumference - stroke - Math.max(0, capGap));
			return Math.min(circumference, r * usable);
		}
		//#endregion
		//#region src/client/render/charts/donut.tsx
		/**
		* The donut geometry shared by the `ring` chart and the head ring.
		*
		* Extracted so the head ring (`WidgetRenderOut.headRing`) and the body ring
		* (`chart.kind === 'ring'`) cannot drift apart: both draw the same track, the same
		* round-capped progress arc from 12 o'clock, and the same centred middle slot.
		* Every number is caller-supplied, so the body ring keeps its exact shipped
		* geometry (radius 22·scale, inset 2, stroke 3, a 13·scale text label).
		*
		* NOT shared with `rings.tsx` (the multi-ring row): those deliberately have NO
		* middle content, a thicker stroke, a width-derived radius and their percent
		* printed UNDER each ring — sharing this component would change them, not unify
		* them.
		*/
		function Donut({ radius, ratio, tone = "primary", stroke = 3, inset = 2, center, title, capGap = 2 }) {
			const p = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
			const box = Math.round(radius * 2);
			const r = radius - inset;
			const c = 2 * Math.PI * r;
			const ink = cappedArcInk(p, c, stroke, capGap);
			return react.createElement("div", {
				title,
				style: {
					position: "relative",
					width: `${box}px`,
					height: `${box}px`,
					flex: "none"
				}
			}, react.createElement("svg", {
				width: box,
				height: box,
				viewBox: `0 0 ${box} ${box}`,
				"aria-hidden": true
			}, react.createElement("circle", {
				cx: radius,
				cy: radius,
				r,
				fill: "none",
				stroke: "var(--dsw-alias-interactive-bg-hover)",
				strokeWidth: stroke
			}), react.createElement("circle", {
				cx: radius,
				cy: radius,
				r,
				fill: "none",
				stroke: CHART_TONES[tone] ?? CHART_TONES.primary,
				strokeWidth: stroke,
				strokeDasharray: `${ink} ${c}`,
				transform: `rotate(-90 ${radius} ${radius})`,
				strokeLinecap: "round"
			})), center === void 0 || center === null ? null : react.createElement("div", { style: {
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center"
			} }, center));
		}
		//#endregion
		//#region src/client/render/charts/ring.tsx
		/** The `ring` chart — one donut with the value in its middle. */
		function RingChart({ chart, scale }) {
			if (chart.kind === "ring") {
				const text = chart.valueLabel ?? `${chart.value ?? 0}%`;
				return react.createElement("div", { style: {
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 6
				} }, react.createElement(Donut, {
					radius: 22 * scale,
					ratio: (chart.value ?? 0) / (chart.max ?? 100),
					center: react.createElement("span", { style: {
						fontSize: `${Math.round(13 * scale)}px`,
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums"
					} }, text)
				}));
			}
			return null;
		}
		//#endregion
		//#region src/client/render/charts/heatmap.tsx
		/** The `heatmap` chart — body moved verbatim out of ChartBlock (Phase 3.4). */
		function HeatmapChart({ chart, side, width, pad, scale }) {
			if (chart.kind === "heatmap" && chart.heatmap && chart.heatmap.length) {
				const weeks = chart.heatmap[0]?.length ?? 13;
				const isWide = weeks >= 20;
				const inset = pad ?? Math.round(12 * scale);
				const availW = (width ?? side) - 2 * inset;
				const cell = isWide ? Math.max(3, Math.floor((availW - (weeks - 1) * 2) / weeks)) : Math.round(8 * scale);
				const max = Math.max(1, ...chart.heatmap.flat().map((c) => c.value));
				const palette = chart.heatmapPalette ?? "brand";
				const EMPTY_CELL = "var(--dsw-alias-interactive-bg-hover)";
				const GITHUB_STEPS = [
					0,
					30,
					52,
					74,
					100
				];
				const unit = chart.heatmapUnit ?? "tok";
				const cellBg = (c) => {
					if (palette === "github") {
						const level = Math.max(0, Math.min(4, Math.round(c.level ?? (c.value > 0 ? 1 : 0))));
						return level === 0 ? EMPTY_CELL : `color-mix(in srgb, var(--dsw-alias-state-success-primary) ${GITHUB_STEPS[level]}%, transparent)`;
					}
					const t = max > 0 ? c.value / max : 0;
					if (t <= 0) return EMPTY_CELL;
					return `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${Math.round((.25 + .7 * t) * 100)}%, transparent)`;
				};
				const rows = chart.heatmap.map((week, wi) => {
					const cells = week.map((c) => react.createElement("div", {
						key: c.date,
						title: `${c.date}: ${c.value} ${unit}`,
						style: {
							width: cell,
							height: cell,
							borderRadius: 2,
							background: cellBg(c),
							opacity: c.value > 0 ? 1 : .5
						}
					}));
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
		//#endregion
		//#region src/client/render/charts/registry.ts
		/** kind -> renderer. The kinds are mutually exclusive, so dispatching on `kind`
		*  returns exactly the branch the old if-chain would have reached. */
		const RENDERERS = {
			bars: BarsChart,
			barsV: BarsVChart,
			breakdown: BreakdownChart,
			lanes: LanesChart,
			quotas: QuotasChart,
			segments: SegmentsChart,
			rings: RingsChart,
			line: LineChart,
			figures: FiguresChart,
			ring: RingChart,
			heatmap: HeatmapChart
		};
		/** Draw a widget chart (null when the kind has no renderer). */
		function renderChart(props) {
			const render = RENDERERS[props.chart.kind];
			return render === void 0 ? null : render(props);
		}
		/** Kinds whose chart stretches to fill the card body (the body gets `flex: 1`).
		*  Was an inline `kind === 'line' || kind === 'lanes'` test in CardBody. */
		const CHART_FILLS_BODY = /* @__PURE__ */ new Set(["line", "lanes"]);
		//#endregion
		//#region src/client/render/icons.tsx
		/**
		* dsh-widgets —the surface icons (official ui-primitives paths).
		*
		* Plain `createElement` SVG, no icon dependency: the paths are the ones the official
		* settings/market chrome uses so the plugin reads as part of the same product.
		*/
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
		/** Close glyph for the 组件配置 preview drawer (same shape as the panel's own). */
		const closeIconSmall = react.createElement("svg", {
			width: 12,
			height: 12,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: "M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z",
			fill: "currentColor"
		}), react.createElement("path", {
			d: "M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z",
			fill: "currentColor"
		}));
		/** Market view toggle + the search field's leading magnifier (official shapes). */
		const listViewIcon = react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: "M2.5 4.25h11M2.5 8h11M2.5 11.75h11",
			stroke: "currentColor",
			strokeWidth: 1.5,
			strokeLinecap: "round"
		}));
		const gridViewIcon = react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("rect", {
			x: 2.5,
			y: 2.5,
			width: 4.6,
			height: 4.6,
			rx: 1.4,
			fill: "currentColor"
		}), react.createElement("rect", {
			x: 8.9,
			y: 2.5,
			width: 4.6,
			height: 4.6,
			rx: 1.4,
			fill: "currentColor"
		}), react.createElement("rect", {
			x: 2.5,
			y: 8.9,
			width: 4.6,
			height: 4.6,
			rx: 1.4,
			fill: "currentColor"
		}), react.createElement("rect", {
			x: 8.9,
			y: 8.9,
			width: 4.6,
			height: 4.6,
			rx: 1.4,
			fill: "currentColor"
		}));
		const searchIcon = react.createElement("svg", {
			width: 14,
			height: 14,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("circle", {
			cx: 7,
			cy: 7,
			r: 4.6,
			stroke: "currentColor",
			strokeWidth: 1.5
		}), react.createElement("path", {
			d: "M10.6 10.6L14 14",
			stroke: "currentColor",
			strokeWidth: 1.5,
			strokeLinecap: "round"
		}));
		/**
		* The database / token-store glyph: a stroked cylinder (top ellipse, two sides,
		* a middle band and the bottom's front arc).
		*
		* The shape follows Lucide's `database` glyph (ISC) — the owner pointed at exactly
		* this cylinder (2026-09-28); the coordinates are re-authored in this repo's own
		* 16×16 grid with the 1.6 stroke of the other stroked glyphs here
		* (listViewIcon/searchIcon use 1.5). `currentColor`, so a card can paint it in its
		* own tone — the cache card paints it the same green/red as its ring arc.
		*/
		const databaseIcon = react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("ellipse", {
			cx: 8,
			cy: 3.4,
			rx: 6,
			ry: 2.1,
			stroke: "currentColor",
			strokeWidth: 1.6
		}), react.createElement("path", {
			d: "M2 3.4V12.6M14 3.4V12.6",
			stroke: "currentColor",
			strokeWidth: 1.6,
			strokeLinecap: "round"
		}), react.createElement("path", {
			d: "M2 12.6a6 2.1 0 0 0 12 0",
			stroke: "currentColor",
			strokeWidth: 1.6,
			strokeLinecap: "round"
		}), react.createElement("path", {
			d: "M2 8a6 2.1 0 0 0 12 0",
			stroke: "currentColor",
			strokeWidth: 1.6,
			strokeLinecap: "round"
		}));
		/**
		* The disk glyph of the 缓存命中 card's head ring: a drive body (slanted shoulders,
		* rounded bottom corners) with the bay slot line across it. Lucide's `hard-drive`
		* (ISC), re-authored on this file's 16×16 grid (24-grid ÷1.5) — the same provenance
		* as `databaseIcon` above.
		*
		* WHY IT IS STILL THE HEAVIEST GLYPH IN THIS FILE. The ring it sits in is stroked
		* `round(5 · scale)` at a 52 · scale box, while the glyph is a 16 grid drawn at
		* 20 · scale, so the weights compare 1:1.25 — every other glyph here (1.6, i.e.
		* 2px) reads as a thin detail floating in a fat circle, and the owner's rule is
		* that the ring's middle must not look weak. **3.2** (visual 4px, 80% of the ring)
		* is where that landed after two tries: the first cut ran at the ring's own weight
		* (4.0 = 5px) and was judged too heavy — at that size the body's three horizontal
		* bands had no daylight left. Do not raise it back toward 4.0.
		*
		* THE INDICATOR DOTS ARE DELIBERATELY ABSENT. Lucide puts two under the slot; at
		* this stroke their diameter IS the stroke (4px at a 20px glyph) and the clear band
		* between the slot and the bottom edge is ~2.7px, so they land as two lumps glued
		* to the slot line. The body + slot pair is what still reads as a drive at 16px.
		*
		* `currentColor`, so the ring paints it in its own tone (the cache card paints it
		* the same green/red as its arc).
		*/
		const hardDriveIcon = react.createElement("svg", {
			width: 16,
			height: 16,
			viewBox: "0 0 16 16",
			fill: "none",
			"aria-hidden": true
		}, react.createElement("path", {
			d: "M3.63 3.41 1.33 8v4a1.33 1.33 0 0 0 1.33 1.33h10.67A1.33 1.33 0 0 0 14.67 12V8l-2.3-4.59A1.33 1.33 0 0 0 11.17 2.67H4.83a1.33 1.33 0 0 0-1.2.74z",
			stroke: "currentColor",
			strokeWidth: 3.2,
			strokeLinejoin: "round"
		}), react.createElement("path", {
			d: "M1.33 8h13.34",
			stroke: "currentColor",
			strokeWidth: 3.2,
			strokeLinecap: "round"
		}));
		//#endregion
		//#region src/client/render/CardBody.tsx
		/**
		* dsh-widgets — the card renderer.
		*
		* Moved verbatim out of components.tsx (Phase 3.5/3.6). `CardBody` is the one place
		* that turns a widget's `WidgetRenderOut` DATA into pixels: the head slots
		* (title / headRight / headAfter / legend / meter), the body (value / sub / chart /
		* rich), the corner button and the whole-card cycle. Charts are drawn by
		* `renderChart` (see render/charts/registry.ts); the loading skeleton and the action
		* buttons live here because they are part of the same layout contract.
		*/
		function ActionsBlock({ actions, onAction, scale }) {
			const btnStyle = {
				flex: "none",
				height: Math.round(26 * scale),
				padding: `0 ${Math.round(10 * scale)}px`,
				borderRadius: Math.round(13 * scale),
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: "var(--dsw-alias-state-business-primary)",
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
		/** The glyphs a head ring may hold (see `HeadRingIcon` in the contract). */
		const HEAD_RING_ICONS = {
			database: databaseIcon,
			"hard-drive": hardDriveIcon
		};
		/**
		* The colour a `valueTone` figure wears.
		*
		* Three rungs, and the difference between them is the WHOLE point of the field:
		* `danger` is a state that is already wrong (peak pricing is live, a window is
		* over its cap); `warn` is a reading heading there but not there yet (a quota
		* projected to 94% of its cap); `muted` DE-EMPHASISES it, which is what a big
		* slot holding nothing but the `—` placeholder needs — at 20px a bare dash in
		* the primary label colour reads as a redaction bar rather than as "no reading"
		* (measured on the 供电 card's desktop state, 2026-09-29).
		*/
		function valueColor(out) {
			if (out.valueTone === "warn") return "var(--dsw-alias-state-warn-primary)";
			if (out.valueTone === "muted") return "var(--dsw-alias-label-tertiary)";
			return "var(--dsw-alias-state-error-primary)";
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
		* Loading skeleton: the card frame plus rounded placeholder blocks in the SAME
		* vertical rhythm — and the SAME SILHOUETTE — as the real body, so the card's
		* size, shape AND identity are already correct while the data source is still
		* in flight and nothing re-flows when the real content lands.
		*
		* The TITLE stays real text: it comes from the widget descriptor (its name),
		* not from the data source, so it is already known — and a rail of tiles that
		* still say which widget they are reads as loading, while a rail of nameless
		* grey pills reads as broken. Only the DATA is placeholder.
		*
		* The BODY follows `out.skeletonShape` (declared by the widget's own manifest and
		* surfaced as WIDGET_RUNTIME): a ring card draws N square rounded blocks, a bar chart ONE
		* wide rounded block, a heatmap ONE wide block, a figure row N short blocks and
		* a quota card N stacked bars. A generic stack of thin pills was wrong for all
		* of them — the placeholder has to be recognisable as the card it stands in
		* for, not merely as "some card".
		*/
		function SkeletonBody({ out, unit, width, squircle, cornerPercent = 16 }) {
			const scale = unit / 150;
			const boxW = width ?? unit;
			const rows = Math.max(1, Math.min(4, Math.round(out.skeletonRows ?? 2)));
			const count = Math.max(1, Math.min(6, Math.round(out.skeletonCount ?? 3)));
			const radius = cardRadius(unit, cornerPercent);
			const pad = cardInnerPad(unit);
			/** One shimmering rounded block; every silhouette is built from these. */
			const block = (key, style) => react.createElement("div", {
				key,
				className: "dsx-sk",
				style
			});
			/** A block that spans the card's content width. */
			const fill = (key, h, r) => block(key, {
				width: "100%",
				flex: 1,
				minHeight: `${h}px`,
				borderRadius: `${r}px`
			});
			/** A row of `n` equal blocks (rings are square, figures are short bars). */
			const row = (key, n, square, hm, r, gap) => react.createElement("div", {
				key,
				style: {
					display: "flex",
					alignItems: square ? "center" : "flex-end",
					justifyContent: "space-between",
					gap,
					width: "100%"
				}
			}, ...Array.from({ length: n }, (_, i) => block(`${key}${i}`, square ? {
				flex: 1,
				minWidth: 0,
				aspectRatio: "1 / 1",
				borderRadius: r
			} : {
				flex: 1,
				minWidth: 0,
				height: `${hm}px`,
				borderRadius: r
			})));
			const shape = out.skeletonShape ?? "text";
			let body;
			if (shape === "rings") body = [row("rg", count, true, 0, "30%", Math.round(10 * scale))];
			else if (shape === "bars") body = [fill("bar", Math.round(40 * scale), Math.max(6, Math.round(8 * scale)))];
			else if (shape === "line") body = [fill("ln", Math.round(48 * scale), Math.max(6, Math.round(8 * scale)))];
			else if (shape === "heatmap") body = [fill("hm", Math.round(44 * scale), Math.max(6, Math.round(8 * scale)))];
			else if (shape === "figures") body = [row("fg", count, false, Math.round(18 * scale), `${Math.max(4, Math.round(6 * scale))}px`, Math.round(8 * scale))];
			else if (shape === "quotas") body = [react.createElement("div", {
				key: "qt",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: Math.round(8 * scale),
					width: "100%"
				}
			}, ...Array.from({ length: count }, (_, i) => block(`q${i}`, {
				width: "100%",
				height: `${Math.max(6, Math.round(9 * scale))}px`,
				borderRadius: `${Math.max(4, Math.round(5 * scale))}px`
			})))];
			else body = [block("v", {
				width: "44%",
				height: `${Math.round(20 * scale)}px`,
				borderRadius: `${Math.max(3, Math.round(10 * scale))}px`
			}), ...Array.from({ length: rows }, (_, i) => block(`r${i}`, {
				width: `${Math.round(92 - i * 26)}%`,
				height: `${Math.round(10 * scale)}px`,
				borderRadius: `${Math.max(3, Math.round(5 * scale))}px`
			}))];
			return react.createElement("div", {
				className: "dsx-stats-card dsx-sk-card" + (squircle ? " dsx-squircle" : ""),
				style: {
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
					borderRadius: `${radius}px`,
					padding: `${pad}px`
				}
			}, react.createElement("div", {
				className: "dsx-stats-card-title",
				style: {
					fontSize: `${Math.round(13 * scale)}px`,
					minWidth: 0
				}
			}, out.title), react.createElement("div", { style: {
				flex: 1,
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-end",
				gap: Math.round(8 * scale),
				marginTop: Math.round(6 * scale)
			} }, ...body));
		}
		function CardBody({ out, unit, width, squircle, cornerPercent, pinBox, onAction, onCycle }) {
			const scale = unit / 150;
			const boxW = width ?? unit;
			const titlePx = Math.round(13 * scale);
			const valuePx = Math.round(20 * scale);
			const radius = cardRadius(unit, cornerPercent);
			const innerPad = cardInnerPad(unit);
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
			/**
			* Value-change transition (the owner's ask, 2026-09-28).
			*
			* When a card's BODY figure appears or leaves — 任务 switching between 「暂无任务」
			* and a live count is the case that asked for it — the figure slides down into its
			* new place instead of snapping. It is keyed on a CHANGE OF VALUE inside one mounted
			* card, never on mount: the magnify layer re-creates every card on hover, so a
			* mount-triggered animation would replay the whole rail on every pointer move.
			* `prefers-reduced-motion` is handled in the CSS.
			*/
			const lastValue = react.useRef(void 0);
			const [figureDrop, setFigureDrop] = react.useState(false);
			react.useEffect(() => {
				const next = out.value ?? null;
				const prev = lastValue.current;
				lastValue.current = next;
				if (prev === void 0 || prev === next) return;
				setFigureDrop(true);
				const id = window.setTimeout(() => setFigureDrop(false), 220);
				return () => window.clearTimeout(id);
			}, [out.value]);
			/**
			* Tile-fits guard (rendered level).
			*
			* The two surfaces express the SAME defect differently, and neither the data gate
			* (G4 snapshots `WidgetRenderOut`) nor a screenshot of one surface can see it: the
			* PREVIEW pins the tile to `height: unit` + `overflow: hidden`, so overlong content
			* is silently CLIPPED; the RAIL only sets `min-height`, so the very same content
			* GROWS the card and breaks the grid. A card that renders its figure twice (the
			* 2026-09-28 head-ring bug) therefore looked like "clipped" in review and like
			* "broken height" once installed.
			*
			* So measure the box in whichever mode it is in — clipped (`scrollHeight` past
			* `clientHeight`) or grown (`clientHeight` past the tile) — and say so: a console
			* warning for the log, and a red inset outline on the card so the defect is visible
			* in BOTH surfaces and can never ship silently again.
			*/
			const cardRef = react.useRef(null);
			react.useLayoutEffect(() => {
				const el = cardRef.current;
				if (el === null) return;
				const pinned = pinBox === true || out.chart !== void 0 && CHART_FILLS_BODY.has(out.chart.kind);
				if (!(pinned ? el.scrollHeight > el.clientHeight + 1 : el.clientHeight > unit + 1)) {
					el.removeAttribute("data-dsx-overflow");
					return;
				}
				if (el.getAttribute("data-dsx-overflow") !== "1") console.warn(`[dsh-widgets] card content does not fit its tile (${pinned ? "clipped" : "grew"}): ${out.title}`);
				el.setAttribute("data-dsx-overflow", "1");
			});
			if (out.skeleton) return react.createElement(SkeletonBody, {
				out,
				unit,
				width: boxW,
				squircle,
				cornerPercent
			});
			const hasHeadRight = out.headRight !== void 0;
			const headValueTone = out.valueTone !== void 0 || out.valuePulse === true;
			const titleLine = Math.round(titlePx * 1.2);
			const captionLine = Math.round(10 * scale * 1.2);
			const valueLine = Math.round(valuePx * 1.25);
			const rightLine = hasHeadRight ? Math.max(out.value != null ? valueLine : 0, out.headRight ? captionLine : 0) : 0;
			const rightSpill = Math.max(0, rightLine - titleLine);
			const FIGURE_GAP = Math.round(4 * scale);
			const CAPTION_GAP = Math.round(2 * scale);
			const titleEl = react.createElement("span", {
				key: "tt",
				className: "dsx-stats-card-title",
				style: {
					fontSize: `${titlePx}px`,
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap"
				}
			}, out.title);
			const figureEl = (text, key) => react.createElement("span", {
				key,
				className: headValueTone ? "dsx-stats-card-value" + (out.valuePulse ? " dsx-value-pulse" : "") : void 0,
				style: {
					fontSize: `${valuePx}px`,
					fontWeight: 600,
					color: headValueTone ? valueColor(out) : "var(--dsw-alias-label-primary)",
					fontVariantNumeric: "tabular-nums",
					lineHeight: 1.25,
					whiteSpace: "nowrap",
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis"
				}
			}, text);
			const captionEl = (text, key, style) => react.createElement("span", {
				key,
				className: "dsx-stats-card-legend",
				style: {
					fontSize: `${Math.round(10 * scale)}px`,
					color: "var(--dsw-alias-label-tertiary)",
					fontWeight: 500,
					fontVariantNumeric: "tabular-nums",
					whiteSpace: "nowrap",
					minWidth: 0,
					overflow: "hidden",
					textOverflow: "ellipsis",
					...style
				}
			}, text);
			const headRing = out.headRing;
			const ringHead = headRing !== void 0;
			const ringFigure = out.headAfter?.big ?? null;
			const RING_STROKE = Math.max(4, Math.round(5 * scale));
			const RING_CAP_GAP = Math.max(3, Math.round(RING_STROKE * 1.2));
			const headEls = [ringHead ? react.createElement("div", {
				key: "t",
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					minWidth: 0
				}
			}, react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				minWidth: 0
			} }, titleEl, ringFigure === null ? null : react.createElement("span", {
				key: "ha",
				style: {
					display: "flex",
					alignItems: "baseline",
					gap: 4,
					marginTop: `${FIGURE_GAP}px`,
					minWidth: 0,
					whiteSpace: "nowrap"
				}
			}, figureEl(ringFigure, "fg"), out.headAfter?.small != null ? captionEl(out.headAfter.small, "sm", { lineHeight: 1.25 }) : null), out.legend != null ? react.createElement("span", {
				key: "lg",
				style: {
					display: "flex",
					marginTop: `${CAPTION_GAP}px`,
					minWidth: 0
				}
			}, captionEl(out.legend, "cl")) : null), react.createElement(Donut, {
				radius: 26 * scale,
				ratio: headRing.ratio,
				tone: headRing.tone ?? "primary",
				stroke: RING_STROKE,
				inset: RING_STROKE / 2 + .5,
				capGap: RING_CAP_GAP,
				title: headRing.label,
				center: headRing.icon === void 0 ? null : react.createElement("span", { style: {
					display: "flex",
					color: CHART_TONES[headRing.tone ?? "primary"] ?? CHART_TONES.primary,
					transform: `scale(${(20 * scale / 16).toFixed(3)})`
				} }, HEAD_RING_ICONS[headRing.icon] ?? null)
			})) : react.createElement("div", {
				key: "t",
				style: {
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 6,
					minHeight: `${titleLine}px`
				}
			}, titleEl, hasHeadRight ? react.createElement("span", { style: {
				display: "inline-flex",
				alignItems: "baseline",
				gap: 6,
				flex: "none",
				marginBottom: rightSpill > 0 ? `${-rightSpill}px` : void 0
			} }, out.value != null ? figureEl(out.value, "hv") : null, out.headRight ? captionEl(out.headRight, "hr") : null) : null)];
			if (out.headAfter && !ringHead) {
				const haLines = Array.isArray(out.headAfter.smallLines) && out.headAfter.smallLines.length > 0 ? out.headAfter.smallLines : [];
				headEls.push(react.createElement("div", {
					key: "ha",
					className: "dsx-stats-card-headafter",
					style: {
						display: "flex",
						alignItems: haLines.length > 0 ? "center" : out.headAfter.smallAlign === "bottom" ? "flex-end" : "baseline",
						gap: 4,
						marginTop: `${Math.round(4 * scale)}px`,
						minWidth: 0,
						whiteSpace: "nowrap"
					}
				}, out.headAfter.big != null ? figureEl(out.headAfter.big, "ha-big") : null, haLines.length > 0 ? react.createElement("span", {
					className: "dsx-stats-card-headafter-lines",
					style: {
						display: "flex",
						flexDirection: "column",
						minWidth: 0
					}
				}, haLines.map((line, i) => captionEl(line, `ha-l${i}`, { lineHeight: 1.25 }))) : out.headAfter.small != null ? captionEl(out.headAfter.small, "ha-sm", { lineHeight: 1.25 }) : null));
			}
			if (out.legend && !ringHead) headEls.push(captionEl(out.legend, "lg", { marginTop: `${CAPTION_GAP}px` }));
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
			const stretchChart = out.chart !== void 0 && CHART_FILLS_BODY.has(out.chart.kind);
			if (out.value != null && out.headRight === void 0 && !ringHead) body.push(react.createElement("div", {
				key: "v",
				className: "dsx-stats-card-value" + (out.valuePulse ? " dsx-value-pulse" : "") + (figureDrop ? " dsx-figure-drop" : ""),
				style: {
					fontSize: `${valuePx}px`,
					color: out.valueTone === void 0 ? void 0 : valueColor(out)
				}
			}, out.value));
			if (out.sub) body.push(react.createElement("div", {
				key: "s",
				className: "dsx-stats-card-sub",
				style: { fontSize: `${Math.round(10 * scale)}px` }
			}, out.sub));
			if (out.chart) {
				const c = renderChart({
					chart: out.chart,
					side: unit,
					width: boxW,
					pad: innerPad,
					scale: unit / 150
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
				width: Math.round(18 * scale),
				height: Math.round(18 * scale),
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true
			}, react.createElement("path", {
				d: "M7.92136 0.349152C10.3744 0.349234 12.5564 1.5052 13.9557 3.29894L15.1281 2.12759C15.3303 1.92546 15.6767 2.06943 15.6767 2.35538V5.53923C15.6766 5.71626 15.5329 5.85976 15.3559 5.86002H12.171C11.8854 5.8597 11.7426 5.51465 11.9443 5.31249L12.9641 4.29056C11.8237 2.74305 9.98908 1.74106 7.92136 1.74097C4.46436 1.74097 1.66233 4.543 1.66233 8C1.66233 11.457 4.46436 14.259 7.92136 14.259C11.3782 14.2589 14.1804 11.4569 14.1804 8H15.5722C15.5722 12.2251 12.1465 15.6507 7.92136 15.6508C3.69614 15.6508 0.270508 12.2252 0.270508 8C0.270508 3.77478 3.69614 0.349152 7.92136 0.349152Z",
				fill: "currentColor"
			}));
			const cornerPos = out.corner?.pos === "bottom" ? {
				bottom: `${innerPad}px`,
				right: `${innerPad}px`
			} : {
				top: `${innerPad}px`,
				right: `${innerPad}px`
			};
			const cornerSize = Math.round(42 * scale);
			const corner = out.corner ? react.createElement("button", {
				key: "corner",
				type: "button",
				className: "dsx-stats-card-corner" + (out.corner.armed ? " armed" : ""),
				style: {
					...cornerPos,
					width: `${cornerSize}px`,
					height: `${cornerSize}px`,
					borderRadius: `${Math.round(cornerSize / 2)}px`,
					fontSize: `${Math.round(10 * scale)}px`
				},
				title: out.corner.armed ? out.corner.armedLabel : out.corner.label,
				onClick: (e) => {
					e.stopPropagation();
					if (onAction) onAction(out.corner.id);
				}
			}, out.corner.armed ? out.corner.armedLabel : compressIcon) : null;
			const vj = out.rich?.valign === "bottom" ? "flex-end" : out.rich?.valign === "center" ? "center" : void 0;
			const headAnchorsTop = out.headAfter !== void 0 && out.bodyAnchor !== "bottom";
			const footStyle = vj || headAnchorsTop || stretchChart ? {
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
				ref: cardRef,
				className: "dsx-stats-card" + (squircle ? " dsx-squircle" : "") + (cyclable ? pressed ? " dsx-cyclable dsx-cycle-pressed" : " dsx-cyclable" : ""),
				style: {
					position: "relative",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
					height: pinBox || stretchChart ? `${unit}px` : void 0,
					borderRadius: `${radius}px`,
					padding: `${innerPad}px`
				},
				title: out.cardHint ?? out.cycle?.hint,
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
		//#endregion
		//#region src/client/render/preview/preview-stats.ts
		/**
		* dsh-widgets — the mock stats every preview surface renders from.
		*
		* Moved verbatim out of components.tsx so both preview surfaces (component
		* config + market) share one source, and so the render gate
		* (scripts/snapshot-render.mjs) can exercise every widget offline: this module
		* is pure data, with no React and no DOM.
		*/
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
		//#endregion
		//#region src/client/render/preview/example-out.ts
		/** The live values that may override the mock: present AND non-null. */
		function liveOverlay(live) {
			const out = {};
			for (const [key, value] of Object.entries(live)) if (value !== null && value !== void 0) out[key] = value;
			return out;
		}
		/**
		* The stats record a preview renders from: mock filler, the widget's own example,
		* the live record's non-null slices, then the instance config.
		*
		* @param w - the widget descriptor.
		* @param prefs - live prefs (for `cardConfigs`).
		* @param key - the instance key (`widget@size`).
		* @param live - the live stats record (`buildLiveStats`), or null outside a session.
		* @returns the merged, ready-to-render stats.
		*/
		function buildPreviewStats(w, prefs, key, live) {
			const ex = w.example;
			const exStats = ex?.stats ? typeof ex.stats === "function" ? ex.stats(prefs.cardConfigs?.[key] ?? {}) : ex.stats : {};
			return {
				...PREVIEW_STATS,
				...exStats,
				...live ? liveOverlay(live) : {},
				...prefs.cardConfigs?.[key] ?? {}
			};
		}
		/**
		* The simulated render output for a widget instance — shared by the market's
		* stage and its gallery tiles, so a tile shows exactly what the stage shows.
		*
		* @param w - the widget descriptor.
		* @param size - the instance size the preview is laid out at.
		* @param prefs - live prefs.
		* @param sim - an explicit simulated state, else the widget's own `example.sim`.
		* @param live - the live stats record, when a session is running.
		* @returns the render output, or null (crash-isolated, like the rail's card).
		*/
		function exampleOut(w, size, prefs, sim, live) {
			const stats = buildPreviewStats(w, prefs, instanceKey(w.id, size), live);
			const effSim = sim ?? w.example?.sim ?? null;
			try {
				return w.render(stats, {
					size,
					...effSim && Object.keys(effSim).length > 0 ? { sim: effSim } : {}
				});
			} catch (error) {
				console.error(`[dsh-widgets] preview render crashed for ${w.id}:`, error);
				return null;
			}
		}
		//#endregion
		//#region src/client/surfaces/config/ConfigTab.tsx
		/**
		* dsh-widgets —组件配置: the installed list, the per-widget form, and the preview.
		*
		* Moved verbatim out of components.tsx (Phase 3.7). Owns the order list, the field
		* controls (text / toggle / align / mode / metrics-with-reordering) and the drawer that
		* renders a live card preview of the edited instance.
		*/
		/** The instance 组件配置 had open. Module scope on purpose: closing the add
		*  panel and reopening it must come back the way the user left it — the panel is
		*  unmounted with the session, and component state would be lost with it. */
		let lastSelectedInstance = "";
		function OrderList({ items, onMove, onRemove, onSelect, selected }) {
			const dragIdx = react.useRef(null);
			const [drop, setDrop] = react.useState(null);
			/** Insert the dragged row before/after the target row. */
			const dropOn = (target, after) => {
				const from = dragIdx.current;
				dragIdx.current = null;
				setDrop(null);
				if (from === null || from === target) return;
				const next = items.slice();
				const held = next.splice(from, 1)[0];
				const at = next.indexOf(items[target]);
				if (at < 0) return;
				next.splice(after ? at + 1 : at, 0, held);
				if (next.join(",") !== items.join(",")) onMove(next);
			};
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 2
			} }, items.map((id, i) => {
				const { widgetId, size } = parseInstanceKey(id);
				const w = WIDGETS.find((x) => x.id === widgetId);
				if (!w) return null;
				const isSel = selected === id;
				const isDropTarget = drop !== null && drop.idx === i;
				return react.createElement("div", {
					key: id,
					className: "dsx-order-row" + (isSel ? " selected" : "") + (dragIdx.current === i ? " is-dragging" : "") + (isDropTarget && !drop.after ? " dsx-drop-before" : "") + (isDropTarget && drop.after ? " dsx-drop-after" : ""),
					draggable: true,
					onDragStart: (e) => {
						dragIdx.current = i;
						e.dataTransfer.effectAllowed = "move";
						try {
							e.dataTransfer.setData("text/plain", id);
						} catch {}
						if (typeof e.dataTransfer.setDragImage === "function") e.dataTransfer.setDragImage(e.currentTarget, 24, 15);
					},
					onDragEnd: () => {
						dragIdx.current = null;
						setDrop(null);
					},
					onDragOver: (e) => {
						e.preventDefault();
						const rect = e.currentTarget.getBoundingClientRect();
						const after = e.clientY > rect.top + rect.height / 2;
						setDrop((prev) => prev !== null && prev.idx === i && prev.after === after ? prev : {
							idx: i,
							after
						});
					},
					onDrop: (e) => {
						e.preventDefault();
						const rect = e.currentTarget.getBoundingClientRect();
						dropOn(i, e.clientY > rect.top + rect.height / 2);
					},
					onDragLeave: () => setDrop((prev) => prev !== null && prev.idx === i ? null : prev),
					onClick: onSelect ? () => onSelect(id) : void 0
				}, react.createElement("span", {
					title: widgetName(w),
					style: {
						fontSize: 13,
						color: "var(--dsw-alias-label-primary)",
						flex: 1,
						minWidth: 0,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					}
				}, widgetName(w)), react.createElement("span", { style: {
					fontSize: 11,
					color: "var(--dsw-alias-label-tertiary)",
					flex: "none"
				} }, size === "2x4" ? "2×4" : "2×2"), onRemove ? react.createElement("button", {
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
			if (field.type === "metrics") return react.createElement(MetricsFieldControl, {
				field,
				value,
				onChange
			});
			return react.createElement(react.Fragment);
		}
		/**
		* `ConfigField` type 'metrics' — pick which numbers a card shows, and drag them
		* into order.
		*
		* The row is the iOS settings shape read left to right: the NAME owns the left
		* edge, the SWITCH is the row's control on the right, and the reorder GRIP sits
		* at the far right (the same affordance iOS puts at the edge of an editable
		* list). Dragging is HTML5 DnD, with the drop position decided by which half of
		* the target row the pointer is in (iOS insertion semantics), a live insertion
		* bar, and the dragged row lifting out of the list while it moves.
		*
		* The stored value is an ordered ARRAY of option keys, so the card renders
		* exactly the numbers the user ticked, left to right. Anything not in the
		* option list is dropped on read — a metric renamed or removed in a later build
		* can never wedge the card with a key nobody renders.
		*/
		function MetricsFieldControl({ field, value, onChange }) {
			const opts = field.options ?? [];
			const max = typeof field.max === "number" && field.max > 0 ? field.max : 6;
			const picked = (Array.isArray(value) ? value : Array.isArray(field.default) ? field.default : []).filter((v) => typeof v === "string" && opts.some(([o]) => o === v));
			const [drop, setDrop] = react.useState(null);
			const dragging = react.useRef(null);
			const onSwitch = react.useRef(false);
			/**
			* The ON group sits on TOP, in CARD order, and the OFF group below it.
			*
			* The list used to render the catalog order with the picked rows scattered
			* through it, so what the form showed was never the order the card printed —
			* the user had to remember which of twelve switches came first. Grouping
			* makes the list itself the answer: read the top group downwards and that IS
			* the card, left to right.
			*
			* A row that is switched OFF lands at the TOP of the OFF group (`offOrder`),
			* so the movement is one step in one direction — the user's own rule: "关闭
			* 后它向下移动到所有已关闭指标的第一个".
			*/
			const [offOrder, setOffOrder] = react.useState(() => opts.map(([k]) => k).filter((k) => !picked.includes(k)));
			const displayKeys = [
				...picked,
				...offOrder.filter((k) => !picked.includes(k)),
				...opts.map(([k]) => k).filter((k) => !picked.includes(k) && !offOrder.includes(k))
			];
			const metricsRef = react.useRef(null);
			const [pickW, setPickW] = react.useState(0);
			react.useLayoutEffect(() => {
				const el = metricsRef.current;
				if (el === null) return;
				const measure = () => setPickW((prev) => Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth);
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const ro = new ResizeObserver(measure);
				ro.observe(el);
				return () => ro.disconnect();
			}, []);
			const layoutPos = (el, r) => {
				const t = getComputedStyle(el).transform;
				if (t === "" || t === "none") return {
					x: r.left,
					y: r.top
				};
				let tx = 0;
				let ty = 0;
				if (typeof DOMMatrixReadOnly !== "undefined") {
					const m = new DOMMatrixReadOnly(t);
					tx = m.m41;
					ty = m.m42;
				} else {
					const hit = /matrix\(([^)]+)\)/.exec(t);
					const n = hit === null ? [] : hit[1].split(",").map(Number);
					if (n.length === 6) {
						tx = n[4];
						ty = n[5];
					}
				}
				return {
					x: r.left - tx,
					y: r.top - ty
				};
			};
			const rowEls = react.useRef(/* @__PURE__ */ new Map());
			const prevLayout = react.useRef(/* @__PURE__ */ new Map());
			const prevTwoCol = react.useRef(null);
			react.useLayoutEffect(() => {
				const modeChanged = prevTwoCol.current !== null && prevTwoCol.current !== twoCol;
				prevTwoCol.current = twoCol;
				rowEls.current.forEach((el, key) => {
					const r = el.getBoundingClientRect();
					const at = layoutPos(el, r);
					const prev = prevLayout.current.get(key);
					prevLayout.current.set(key, at);
					if (prev === void 0 || modeChanged) return;
					const dx = prev.x - at.x;
					const dy = prev.y - at.y;
					if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
					if (dragging.current !== null || drop !== null) return;
					el.style.transition = "none";
					el.style.transform = `translate(${dx + (r.left - at.x)}px, ${dy + (r.top - at.y)}px)`;
					el.offsetHeight;
					el.style.transition = "transform var(--ds-transition-duration) var(--ds-ease-in-out)";
					el.style.transform = "";
				});
			});
			const toggle = (key) => {
				if (picked.includes(key)) {
					onChange(picked.filter((k) => k !== key));
					setOffOrder((prev) => [key, ...prev.filter((k) => k !== key)]);
				} else if (picked.length < max) {
					onChange(picked.concat(key));
					setOffOrder((prev) => prev.filter((k) => k !== key));
				}
			};
			/** Move the dragged key to just before/after the target key, or to the END of
			*  the ON group when the target row is not picked (a drop on an unpicked row
			*  is a reasonable gesture for "put it last" — refusing it silently would read
			*  as a broken drag). */
			const dropOn = (targetKey, after, payload) => {
				const from = dragging.current ?? (typeof payload === "string" && payload !== "" ? payload : null);
				if (from === null) return;
				const rest = picked.filter((k) => k !== from);
				const at = rest.indexOf(targetKey);
				const next = rest.slice();
				if (at < 0) next.push(from);
				else next.splice(after ? at + 1 : at, 0, from);
				dragging.current = null;
				setDrop(null);
				if (next.join(",") !== picked.join(",")) onChange(next);
			};
			const onKeys = picked;
			const offKeys = displayKeys.filter((k) => !picked.includes(k));
			const twoCol = pickW >= 340 && onKeys.length > 0 && offKeys.length > 0;
			const rowsBottom = Math.max(onKeys.length, offKeys.length) + 1;
			const cellFor = (key) => {
				const on = picked.includes(key);
				if (!twoCol) return {
					gridColumn: 1,
					gridRow: on ? onKeys.indexOf(key) + 1 : onKeys.length + offKeys.indexOf(key) + 1
				};
				return {
					gridColumn: on ? 1 : 2,
					gridRow: (on ? onKeys.indexOf(key) : offKeys.indexOf(key)) + 1
				};
			};
			return react.createElement("div", {
				className: "dsx-metrics",
				ref: metricsRef,
				style: {
					display: "grid",
					gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr",
					columnGap: 10,
					rowGap: 0,
					alignContent: "start"
				}
			}, displayKeys.map((key) => {
				const label = opts.find(([o]) => o === key)?.[1] ?? key;
				const on = picked.includes(key);
				const isDropTarget = drop !== null && drop.key === key && on;
				return react.createElement("div", {
					key,
					"data-metric": key,
					ref: (el) => {
						if (el !== null) rowEls.current.set(key, el);
					},
					style: cellFor(key),
					className: "dsx-metric" + (on ? " is-on" : "") + (dragging.current === key ? " is-dragging" : "") + (isDropTarget && !drop.after ? " dsx-drop-before" : "") + (isDropTarget && drop.after ? " dsx-drop-after" : ""),
					draggable: true,
					onDragStart: (e) => {
						if (onSwitch.current) {
							e.preventDefault();
							return;
						}
						dragging.current = key;
						try {
							e.dataTransfer.setData("text/plain", key);
						} catch {}
						e.dataTransfer.effectAllowed = "move";
						if (typeof e.dataTransfer.setDragImage === "function") e.dataTransfer.setDragImage(e.currentTarget, 24, 15);
					},
					onDragEnd: () => {
						dragging.current = null;
						onSwitch.current = false;
						setDrop(null);
					},
					onDragOver: (e) => {
						e.preventDefault();
						if (!on) {
							setDrop((prev) => prev === null ? prev : null);
							return;
						}
						const rect = e.currentTarget.getBoundingClientRect();
						const after = e.clientY > rect.top + rect.height / 2;
						setDrop((prev) => prev !== null && prev.key === key && prev.after === after ? prev : {
							key,
							after
						});
					},
					onDrop: (e) => {
						e.preventDefault();
						let payload = "";
						try {
							payload = e.dataTransfer.getData("text/plain");
						} catch {
							payload = "";
						}
						const rect = e.currentTarget.getBoundingClientRect();
						dropOn(key, e.clientY > rect.top + rect.height / 2, payload);
					},
					onDragLeave: on ? () => setDrop((prev) => prev !== null && prev.key === key ? null : prev) : void 0
				}, react.createElement("span", {
					className: "dsx-metric-name",
					title: optionLabel([key, label])
				}, optionLabel([key, label])), react.createElement("label", {
					className: "dsx-switch-row",
					title: optionLabel([key, label]),
					onMouseDown: () => {
						onSwitch.current = true;
					},
					onMouseUp: () => {
						onSwitch.current = false;
					}
				}, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: on,
					onChange: () => toggle(key)
				}), react.createElement("span", {
					className: "dsx-switch-track",
					"aria-hidden": true
				}, react.createElement("span", { className: "dsx-switch-thumb" }))));
			}), react.createElement("div", {
				className: "dsx-metric-hint",
				style: {
					gridColumn: "1 / -1",
					gridRow: rowsBottom
				}
			}, field.hint !== void 0 ? typeof field.hint === "function" ? field.hint() : field.hint : t("config.metricHint", {
				n: picked.length,
				max
			})));
		}
		function ConfigTab({ controller }) {
			const { prefs, setPrefs } = controller;
			const [selected, setSelected] = react.useState(lastSelectedInstance);
			react.useEffect(() => {
				lastSelectedInstance = selected;
			}, [selected]);
			const [previewSize, setPreviewSize] = react.useState("2x2");
			const [previewSim, setPreviewSim] = react.useState(null);
			react.useEffect(() => {
				setPreviewSim(null);
			}, [selected]);
			const toggleSim = () => {
				if (!selWidget || !widgetSimToggle(selWidget)) return;
				setPreviewSim(nextSim(selWidget, previewSim));
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
				const stats = buildPreviewStats(selWidget, prefs, selected, controller.liveStats?.(selected) ?? null);
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
			const sel = selWidget !== void 0 && selConfig !== null ? {
				widget: selWidget,
				config: selConfig
			} : null;
			const hasSel = sel !== null;
			const onDetailToggle = controller.onDetailToggle;
			react.useEffect(() => {
				onDetailToggle?.(hasSel);
				return () => {
					onDetailToggle?.(false);
				};
			}, [hasSel, onDetailToggle]);
			const detailRef = react.useRef(null);
			const [detailW, setDetailW] = react.useState(0);
			react.useEffect(() => {
				const el = detailRef.current;
				if (el === null || typeof ResizeObserver === "undefined") return;
				const measure = () => setDetailW((prev) => Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth);
				measure();
				const ro = new ResizeObserver(measure);
				ro.observe(el);
				return () => ro.disconnect();
			}, [hasSel]);
			const targetW = controller.detailWidth ?? 0;
			const drawerW = targetW > 0 ? targetW : detailW;
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "row",
				flex: 1,
				minHeight: 0
			} }, react.createElement("div", {
				className: "dsx-config-list",
				style: {
					flex: "0 0 auto",
					width: hasSel ? `190px` : "100%",
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					overflowY: "auto",
					overflowX: "hidden",
					transition: "width var(--ds-transition-duration-slow) var(--ds-ease-in-out)",
					paddingRight: 12
				}
			}, react.createElement("div", {
				title: t("config.addedCount", {
					added: installed.length,
					max: prefs.maxWidgets
				}),
				style: {
					flex: "none",
					fontSize: 12,
					color: "var(--dsw-alias-label-tertiary)",
					marginBottom: 6,
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis"
				}
			}, hasSel ? `${installed.length}/${prefs.maxWidgets}` : t("config.addedCount", {
				added: installed.length,
				max: prefs.maxWidgets
			})), react.createElement(OrderList, {
				items: installed,
				onMove: (next) => setPrefs({ order: next }),
				onRemove: remove,
				onSelect: (id) => setSelected((prev) => prev === id ? "" : id),
				selected
			})), react.createElement("div", {
				ref: detailRef,
				className: "dsx-config-drawer",
				style: {
					flex: "1 1 0px",
					minWidth: 0,
					height: "100%",
					position: "relative",
					overflow: "hidden"
				}
			}, sel ? react.createElement("div", {
				className: "dsx-config-drawer-inner",
				style: {
					position: "absolute",
					top: 0,
					left: 0,
					width: `${Math.max(0, drawerW - 2)}px`,
					height: "100%",
					display: "flex",
					flexDirection: "column",
					minHeight: 0
				}
			}, react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				flex: "none"
			} }, react.createElement("div", { style: {
				flex: 1,
				minWidth: 0,
				fontSize: 14,
				fontWeight: 600,
				color: "var(--dsw-alias-label-primary)",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, t("config.preview", { name: widgetName(sel.widget) })), sizesOf(sel.widget).length > 1 ? react.createElement("select", {
				className: "dsx-select",
				style: {
					fontSize: 11,
					width: "auto"
				},
				value: selSize,
				title: t("config.cardSize"),
				onChange: (e) => setPreviewSize(e.target.value)
			}, sizesOf(sel.widget).map((s) => react.createElement("option", {
				key: s,
				value: s
			}, s === "2x4" ? "2×4" : "2×2"))) : null, react.createElement("button", {
				type: "button",
				className: "dsx-drawer-close",
				"aria-label": t("config.closePreview"),
				title: t("config.closePreview"),
				onClick: () => setSelected("")
			}, closeIconSmall)), react.createElement("div", { style: {
				flex: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "26px 8px"
			} }, (() => {
				const u = controller.railSide && controller.railSide > 0 ? controller.railSide : prefs.cardSide;
				const isWide = selSize === "2x4";
				const refW = 2 * u + 12;
				const cardW = isWide ? refW : u;
				const avail = drawerW > 0 ? drawerW - 18 : refW;
				const fit = Math.max(.55, Math.min(1.5, avail / refW));
				const pv = out ? react.createElement(CardBody, {
					out,
					unit: u,
					width: isWide ? cardW : void 0,
					squircle: prefs.squircle,
					cornerPercent: prefs.cornerPercent,
					pinBox: true
				}) : null;
				const simTip = widgetSimToggle(sel.widget) ? react.createElement("div", {
					key: "simtip",
					style: {
						fontSize: 11,
						color: "var(--dsw-alias-label-tertiary)",
						marginTop: 8,
						textAlign: "center"
					}
				}, t("config.simTip", { label: widgetSimToggle(sel.widget) })) : null;
				return out ? react.createElement("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						flex: "none"
					},
					title: widgetSimToggle(sel.widget) ? t("config.simTitle") : void 0,
					onClick: widgetSimToggle(sel.widget) ? () => toggleSim() : void 0
				}, react.createElement("div", { style: {
					position: "relative",
					width: Math.round(cardW * fit),
					height: Math.round(u * fit),
					flex: "none"
				} }, react.createElement("div", { style: {
					position: "absolute",
					top: 0,
					left: 0,
					width: cardW,
					transform: `scale(${fit.toFixed(4)})`,
					transformOrigin: "top left",
					cursor: widgetSimToggle(sel.widget) ? "pointer" : void 0,
					userSelect: "none"
				} }, pv)), simTip) : null;
			})()), react.createElement("div", { style: {
				flex: "0 1 auto",
				minHeight: 0,
				overflowY: "auto"
			} }, sel.widget.configSchema && sel.widget.configSchema.length > 0 ? react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 4,
				paddingTop: 16
			} }, react.createElement("div", { style: {
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)"
			} }, t("config.custom")), sel.widget.configSchema.map((f) => {
				const isList = f.type === "metrics";
				return react.createElement("div", {
					key: f.key,
					style: {
						display: "flex",
						flexDirection: isList ? "column" : "row",
						alignItems: isList ? "stretch" : "center",
						justifyContent: "space-between",
						gap: isList ? 0 : 8,
						padding: isList ? "4px 0 0" : "10px 0",
						borderBottom: isList ? void 0 : "1px solid var(--dsw-alias-border-l1)"
					}
				}, isList ? null : react.createElement("span", { style: {
					fontSize: 13,
					color: "var(--dsw-alias-label-primary)"
				} }, fieldLabel(f)), react.createElement("div", { style: {
					flex: isList ? "1 1 auto" : "none",
					minWidth: 0
				} }, react.createElement(ConfigFieldControl, {
					field: f,
					value: sel.config[f.key],
					onChange: (v) => setConfig(f, v)
				})));
			})) : null)) : null));
		}
		//#endregion
		//#region src/client/surfaces/market/MarketTab.tsx
		/**
		* dsh-widgets —组件市场: the browse list, the gallery, and the preview stage.
		*
		* Moved verbatim out of components.tsx (Phase 3.8). Holds the market hero (FLIP) switch
		* and its ZoomGhost, the shared-axis gallery push, search + view toggle, and the stage
		* that renders a real card for the selected group.
		*/
		/** iOS-style zoom: the clicked tile grows and travels into the preview's slot.
		*  A FLIP over a fixed-position ghost that renders the SAME card; the stage's
		*  card is the authority for the final box, so the ghost lands exactly on it and
		*  then unmounts. */
		function ZoomGhost({ zoom, target, onDone }) {
			const [box, setBox] = react.useState(null);
			const [playing, setPlaying] = react.useState(false);
			const done = react.useRef(onDone);
			done.current = onDone;
			const reverse = zoom.phase === "out";
			react.useLayoutEffect(() => {
				const el = target.current;
				if (el === null) {
					done.current();
					return;
				}
				const settled = (r) => {
					let layer = el;
					while (layer !== null && !(layer.className || "").toString().includes("dsx-mkt-layer")) layer = layer.parentElement;
					let dx = 0;
					let dy = 0;
					if (layer !== null) {
						const t = getComputedStyle(layer).transform;
						if (t !== "" && t !== "none" && typeof DOMMatrixReadOnly !== "undefined") {
							const m = new DOMMatrixReadOnly(t);
							dx = m.m41;
							dy = m.m42;
						}
					}
					return {
						x: r.left - dx,
						y: r.top - dy,
						w: r.width,
						h: r.height
					};
				};
				let box = settled(el.getBoundingClientRect());
				setBox(box);
				let tries = 0;
				let raf = 0;
				const tick = () => {
					const cur = target.current ? settled(target.current.getBoundingClientRect()) : box;
					if (Math.abs(cur.w - box.w) > 1 && tries++ < 4) {
						box = cur;
						setBox(cur);
						raf = requestAnimationFrame(tick);
						return;
					}
					setPlaying(true);
				};
				raf = requestAnimationFrame(tick);
				const timer = setTimeout(() => done.current(), 560);
				return () => {
					cancelAnimationFrame(raf);
					clearTimeout(timer);
				};
			}, []);
			if (box === null) return null;
			const sFrom = reverse ? Math.min(box.w / zoom.cardW, box.h / zoom.unit) : Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit);
			const sTo = reverse ? Math.min(zoom.w / zoom.cardW, zoom.h / zoom.unit) : Math.min(box.w / zoom.cardW, box.h / zoom.unit);
			const at = (rect, s) => `translate(${rect.x + rect.w / 2 - box.x - zoom.cardW / 2}px, ${rect.y + rect.h / 2 - box.y - zoom.unit / 2}px) scale(${s.toFixed(4)})`;
			const from = at(reverse ? {
				x: box.x,
				y: box.y,
				w: box.w,
				h: box.h
			} : zoom, sFrom);
			const to = at(reverse ? zoom : {
				x: box.x,
				y: box.y,
				w: box.w,
				h: box.h
			}, sTo);
			return (0, react_dom.createPortal)(react.createElement("div", {
				className: "dsx-zoomghost",
				style: {
					left: box.x,
					top: box.y,
					width: zoom.cardW,
					height: zoom.unit,
					transform: playing ? to : from
				}
			}, react.createElement(CardBody, {
				out: zoom.out,
				unit: zoom.unit,
				width: zoom.size === "2x4" ? zoom.cardW : void 0,
				squircle: zoom.squircle,
				cornerPercent: zoom.cornerPercent,
				pinBox: true
			})), document.body);
		}
		function MarketTab({ controller, usageData }) {
			const { prefs, setPrefs } = controller;
			const [q, setQ] = react.useState("");
			const view = prefs.marketView === "grid" ? "grid" : "list";
			const setView = (v) => setPrefs({ marketView: v });
			const [previewGroup, setPreviewGroup] = react.useState(null);
			const [previewIdx, setPreviewIdx] = react.useState(0);
			const galleryRef = react.useRef(null);
			const [colW, setColW] = react.useState(0);
			react.useLayoutEffect(() => {
				const el = galleryRef.current;
				if (el === null) return;
				const measure = () => {
					const w = el.clientWidth;
					setColW((prev) => Math.abs(prev - w) < 2 ? prev : w);
				};
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const ro = new ResizeObserver(measure);
				ro.observe(el);
				return () => ro.disconnect();
			}, [view]);
			const [zoom, setZoom] = react.useState(null);
			const [lastSource, setLastSource] = react.useState(null);
			const [anim, setAnim] = react.useState(null);
			const railSide = controller.railSide ?? 0;
			const liveFor = (id, s) => controller.liveStats?.(instanceKey(id, s)) ?? null;
			const stageRef = react.useRef(null);
			const stageCardRef = react.useRef(null);
			const [stageW, setStageW] = react.useState(0);
			react.useLayoutEffect(() => {
				const el = stageRef.current;
				if (el === null) return;
				const measure = () => setStageW((prev) => Math.abs(prev - el.clientWidth) < 2 ? prev : el.clientWidth);
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const ro = new ResizeObserver(measure);
				ro.observe(el);
				return () => ro.disconnect();
			}, [previewGroup]);
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
			/** Open a group's preview, seeding the zoom from the clicked card/tile. */
			const openGroup = (w, from) => {
				const sizes = sizesOf(w);
				const size = sizes.includes("2x2") ? "2x2" : sizes[0];
				const unit = railSide > 0 ? railSide : prefs.cardSide;
				const cardW = size === "2x4" ? 2 * unit + 12 : unit;
				const el = from === "grid" ? document.querySelector(`.dsx-gcard[data-gid="${w.id}"] .dsx-gshot`) : document.querySelector(`.dsx-mcard[data-gid="${w.id}"]`);
				const out = exampleOut(w, size, prefs, void 0, liveFor(w.id, size));
				const r = el ? el.getBoundingClientRect() : null;
				const src = r && out ? {
					x: r.left,
					y: r.top,
					w: r.width,
					h: r.height,
					out,
					unit,
					cardW,
					size,
					squircle: prefs.squircle,
					cornerPercent: prefs.cornerPercent
				} : null;
				setLastSource(src);
				setAnim("in");
				window.setTimeout(() => setAnim(null), 400);
				setPreviewGroup(groupOf(w));
				setPreviewIdx(0);
			};
			/** Leave the preview. With the hero OFF this is a pure shared-axis pop: the
			*  preview slides out, the market slides back in, and the stage is dropped when
			*  that motion ends (400ms ≈ the 380ms keyframes + a frame of slack). With the
			*  hero ON the card flies home first (see MARKET_HERO). */
			const closeGroup = () => {
				setAnim("out");
				window.setTimeout(() => {
					setPreviewGroup(null);
					setAnim(null);
				}, 400);
			};
			const zoomDone = () => {
				if (zoom !== null && zoom.phase === "out") setPreviewGroup(null);
				setZoom(null);
				setAnim(null);
			};
			/** 组件市场 uses Material's SHARED AXIS (X) between the list/gallery and the
			*  preview: outgoing and incoming ride the same horizontal motion — the outgoing
			*  slides out of the panel's clip while the incoming slides in from the right —
			*  and BOTH directions play the SAME keyframes (closing = `animation-direction:
			*  reverse`), so open and close are identical by construction. Both layers stay
			*  MOUNTED for the whole transition; the previous code swapped them instantly,
			*  which is why the surrounding tiles vanished (and popped back) while only the
			*  shared card animated. Reference: MaterialSharedAxis / the Material motion
			*  system's shared-axis pattern + the container-transform (FLIP) ghost below. */
			const renderLayers = (stageBody, dir) => {
				const gridMounted = stageBody === null || dir !== null;
				return react.createElement("div", { className: "dsx-mkt" }, gridMounted ? react.createElement("div", { className: "dsx-mkt-layer" + (dir === "in" ? " dsx-mkt-push-out" : dir === "out" ? " dsx-mkt-push-out is-rev" : "") }, marketBody) : null, stageBody !== null ? react.createElement("div", { className: "dsx-mkt-layer is-front" + (dir === "in" ? " dsx-mkt-push-in" : dir === "out" ? " dsx-mkt-push-in is-rev" : "") }, stageBody) : null, zoom ? react.createElement(ZoomGhost, {
					key: zoom.phase,
					zoom,
					target: stageCardRef,
					onDone: zoomDone
				}) : null);
			};
			const marketBody = react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				height: "100%"
			} }, react.createElement("div", { className: "dsx-marketbar" }, react.createElement("div", { className: "dsx-searchwrap" }, react.createElement("span", { className: "dsx-searchicon" }, searchIcon), react.createElement("input", {
				type: "search",
				placeholder: t("market.search"),
				className: "dsx-search",
				value: q,
				onChange: (e) => setQ(e.target.value)
			})), react.createElement("div", { className: "dsx-viewtoggle" }, react.createElement("button", {
				type: "button",
				className: "dsx-viewbtn",
				"data-active": view === "list",
				"aria-label": t("market.viewList"),
				title: t("market.viewList"),
				onClick: () => setView("list")
			}, listViewIcon), react.createElement("button", {
				type: "button",
				className: "dsx-viewbtn",
				"data-active": view === "grid",
				"aria-label": t("market.viewGrid"),
				title: t("market.viewGrid"),
				onClick: () => setView("grid")
			}, gridViewIcon))), view === "grid" ? react.createElement("div", {
				className: "dsx-gallery",
				tabIndex: -1,
				ref: galleryRef
			}, list.map((w) => {
				const sizes = sizesOf(w);
				const size = sizes.includes("2x2") ? "2x2" : sizes[0];
				const out = exampleOut(w, size, prefs, void 0, liveFor(w.id, size));
				const gUnit = railSide > 0 ? railSide : prefs.cardSide;
				const gW = size === "2x4" ? 2 * gUnit + 12 : gUnit;
				const col = colW > 0 ? (colW - 16 - 10) / 2 : gW;
				const fit = Math.max(.5, Math.min(1.15, (col - 12) / gW));
				return react.createElement("div", {
					key: w.id,
					role: "button",
					tabIndex: 0,
					className: "dsx-gcard",
					"data-gid": w.id,
					title: widgetDesc(w),
					onClick: () => openGroup(w, "grid"),
					onKeyDown: (e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							openGroup(w, "grid");
						}
					}
				}, react.createElement("span", {
					className: "dsx-gshot",
					style: {
						width: Math.round(gW * fit),
						height: Math.round(gUnit * fit)
					}
				}, react.createElement("span", { style: {
					position: "absolute",
					top: 0,
					left: 0,
					width: gW,
					transform: `scale(${fit.toFixed(4)})`,
					transformOrigin: "top left",
					display: "block"
				} }, out ? react.createElement(CardBody, {
					out,
					unit: gUnit,
					width: size === "2x4" ? gW : void 0,
					squircle: prefs.squircle,
					cornerPercent: prefs.cornerPercent,
					pinBox: true
				}) : null)), react.createElement("span", { className: "dsx-gcap" }, groupLabel(w)));
			})) : react.createElement("div", {
				className: "dsx-mlist",
				style: {
					overflowY: "auto",
					minHeight: 0
				}
			}, list.map((w) => {
				const instanceCount = WIDGETS.filter((x) => groupOf(x) === groupOf(w)).reduce((a, x) => a + sizesOf(x).length, 0);
				const ring = react.createElement("span", { className: "dsx-ring" });
				return react.createElement("div", {
					key: w.id,
					role: "button",
					tabIndex: 0,
					className: "dsx-mcard",
					"data-gid": w.id,
					onClick: () => openGroup(w, "list"),
					onKeyDown: (e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							openGroup(w, "list");
						}
					}
				}, ring, react.createElement("span", { className: "dsx-mbody" }, react.createElement("span", { className: "dsx-mhead" }, react.createElement("span", { className: "dsx-mname" }, groupLabel(w)), react.createElement("span", { className: "dsx-badge" }, String(instanceCount))), react.createElement("span", { className: "dsx-mdesc" }, widgetDesc(w))));
			})));
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
				const previewStats = w ? buildPreviewStats(w, prefs, curKey, liveFor(w.id, curSize)) : {};
				const effSim = previewSim ?? w?.example?.sim ?? null;
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
					setPreviewSim(nextSim(w, previewSim));
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
				return renderLayers(react.createElement("div", { style: {
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
					onClick: closeGroup
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
				}, installed ? t("market.added") : t("market.add"))), !installed && prefs.installed.length >= prefs.maxWidgets ? react.createElement("div", { className: "dsx-limit-tip" }, t("market.limit", { max: prefs.maxWidgets })) : null, react.createElement("div", {
					ref: stageRef,
					style: {
						flex: 1,
						minHeight: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 12,
						padding: "0 4px"
					}
				}, react.createElement("button", {
					type: "button",
					className: "dsx-navbtn",
					"aria-label": t("market.prevAria"),
					onClick: prev
				}, react.createElement(ChevronLeftIcon)), react.createElement("div", { style: {
					flex: 1,
					minWidth: 0,
					display: "flex",
					justifyContent: "center",
					alignItems: "center"
				} }, out ? (() => {
					const u = railSide > 0 ? railSide : prefs.cardSide;
					const cw = curSize === "2x4" ? 2 * u + 12 : u;
					const slotW = stageW > 0 ? stageW - 80 : cw;
					const fit = Math.max(.4, Math.min(1.6, (slotW - 8) / cw));
					return react.createElement("div", {
						ref: stageCardRef,
						style: {
							position: "relative",
							width: Math.round(cw * fit),
							height: Math.round(u * fit),
							opacity: zoom === null ? 1 : 0,
							cursor: widgetSimToggle(w) ? "pointer" : void 0,
							userSelect: "none"
						},
						title: widgetSimToggle(w) ? t("config.simTitle") : void 0,
						onClick: widgetSimToggle(w) ? toggleSim : void 0
					}, react.createElement("div", { style: {
						position: "absolute",
						top: 0,
						left: 0,
						width: cw,
						transform: `scale(${fit.toFixed(4)})`,
						transformOrigin: "top left"
					} }, react.createElement(CardBody, {
						out,
						unit: u,
						width: curSize === "2x4" ? cw : void 0,
						squircle: prefs.squircle,
						cornerPercent: prefs.cornerPercent,
						pinBox: true
					})), w && widgetSimToggle(w) ? react.createElement("div", { style: {
						position: "absolute",
						left: 0,
						right: 0,
						bottom: -18,
						fontSize: 11,
						color: "var(--dsw-alias-label-tertiary)",
						whiteSpace: "nowrap",
						textAlign: "center"
					} }, t("config.simTip", { label: widgetSimToggle(w) })) : null);
				})() : null), react.createElement("button", {
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
				})))), anim);
			}
			return renderLayers(null, null);
		}
		//#endregion
		//#region src/client/surfaces/Settings.tsx
		/**
		* dsh-widgets —the settings section: 组件页 + the general rows.
		*
		* `WidgetsPage` is the three-tab section the shell mounts (组件配置 / 组件市场 / 通用设置);
		* `SettingsPanel` is the general tab. Moved verbatim out of components.tsx (Phase 3.9).
		*/
		function WidgetsPage({ controller, hideHeader }) {
			const [tab, setTab] = react.useState("config");
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 10,
				height: "100%",
				minHeight: 0
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
			} }, t("page.desc"))), react.createElement("div", {
				className: "dsx-tabbar",
				style: { flex: "none" }
			}, react.createElement("button", {
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
			}, t("tab.settings"))), react.createElement("div", { style: {
				flex: "1 1 auto",
				minHeight: 0,
				display: "flex",
				flexDirection: "column"
			} }, tab === "config" ? react.createElement(ConfigTab, { controller }) : tab === "market" ? react.createElement(MarketTab, {
				controller,
				usageData: null
			}) : react.createElement(SettingsPanel, { controller })));
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
					accentColor: "var(--dsw-alias-state-business-primary)"
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
			const gearValue = CORNER_GEARS.indexOf(prefs.cornerPercent) !== -1 ? prefs.cornerPercent : 16;
			return react.createElement("div", { style: {
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				overflowY: "auto",
				flex: "1 1 auto"
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
				title: t("settings.squircle.title"),
				desc: t("settings.squircle.desc"),
				children: react.createElement("label", { className: "dsx-switch-row" }, react.createElement("input", {
					type: "checkbox",
					className: "dsx-switch-input",
					checked: prefs.squircle,
					onChange: (e) => setPrefs({ squircle: e.target.checked })
				}), react.createElement("span", { className: "dsx-switch-track" }, react.createElement("span", { className: "dsx-switch-thumb" })))
			}), react.createElement(Row, {
				title: t("settings.corner.title"),
				desc: t("settings.corner.desc"),
				children: react.createElement("select", {
					className: "dsx-select",
					value: gearValue,
					onChange: (e) => setPrefs({ cornerPercent: Number(e.target.value) })
				}, CORNER_GEARS.map((g) => react.createElement("option", {
					key: g,
					value: g
				}, t("settings.corner.option", { p: g }))))
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
		//#region src/client/surfaces/settings-nav-glyph.ts
		/**
		* dsh-widgets — the settings-nav glyph adapter for our section.
		*
		* Moved out of `client/index.ts` (Phase 2.3) unchanged, so `apply()` reads as
		* composition instead of implementation. It is a DOM-level workaround for an
		* upstream gap, not product logic: delete it the day the section contract grows
		* an icon field (see the rationale below).
		*/
		function installSettingsNavGlyph() {
			const ATTR = "data-dsx-nav";
			const mark = () => {
				const label = t("ui.section.label");
				for (const list of document.querySelectorAll("[class$=\"_navList\"]")) for (const row of list.querySelectorAll(":scope > button")) if ((row.textContent ?? "").trim() === label) row.setAttribute(ATTR, "widgets");
				else row.removeAttribute(ATTR);
			};
			const observer = new MutationObserver((records) => {
				for (const record of records) for (const node of record.addedNodes) {
					if (!(node instanceof Element)) continue;
					if (node.matches("[class$=\"_navList\"]") || node.querySelector("[class$=\"_navList\"]") !== null) {
						mark();
						return;
					}
				}
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			const offLocale = onLocaleChange(mark);
			mark();
			return () => {
				observer.disconnect();
				offLocale();
				for (const row of document.querySelectorAll(`[${ATTR}]`)) row.removeAttribute(ATTR);
			};
		}
		//#endregion
		//#region src/client/rail/geometry.ts
		/**
		* dsh-widgets — rail geometry: the space the rail may claim, how cards are sized
		* inside it, and the anchors both the deck and the magnification wave read.
		*
		* Pure reads of the shell's own measurements (`--dsh-chat-*` custom properties, the
		* frame's inline grid template) plus the sizing maths — no React, no listeners, and
		* no state beyond `engagedPanelW`, which only `resolveRailSpace` touches.
		*/
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
		* (user decision 2026-09-19, replacing the flat 1.35× multiplier, which read as
		* "way too big"): the largest allowed card is the one where FIVE rows still fit
		* the rail with the last row's bottom gap equal to the right gap. At a 1000px
		* window that is (936 –6 –5·24)/5 = 162px for a 150px base —an 8% growth
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
			return Math.max(0, Math.round(columnW - measure - 74));
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
			return Math.max(0, Math.round(column - measure - 74));
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
		*   rows·side + (rows –1)·pad + 2 (deck base) + 4 (rail top padding) + pad = railHeight
		*   side = (railHeight –6 –rows·pad) / rows
		*/
		function rowFitSide(rows, pad) {
			const rail = document.querySelector(".dsx-stats-rail");
			const innerH = rail !== null ? rail.clientHeight : Math.max(0, window.innerHeight - (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dsx-rail-top")) || 0));
			if (!(innerH > 0)) return RAIL_MIN_SIDE;
			return Math.floor((innerH - 6 - rows * pad) / rows);
		}
		/**
		* True when every installed tile is a 2×4 (two cells wide).
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
		*   side = clamp(autoFloor, tier((room –(n+1)·gap) / n), fiveRowCeiling)
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
		* 2026-09-19 at 1578×1000: `side` stayed 150px while the budget moved
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
		/** Right inset the JS fallback path publishes (and the anchor fallback reads). */
		const RIGHTBAR_FALLBACK = "var(--dsx-rightbar-w, var(--dsh-sidebar-width, 0px))";
		//#endregion
		//#region src/client/rail/measure.ts
		/**
		* dsh-widgets — the rail’s measurement layer.
		*
		* Everything that reads the shell’s layout and turns it into the rail’s geometry:
		* the `--dsx-rail-top` / `--dsx-input-bottom` anchor probes, the right-bar width
		* tracking (read per frame while the user drags a width handle), the ResizeObserver
		* fan-out, and the budget / YIELD beat — which is applied straight to the DOM so it
		* cannot land a frame late behind React’s commit.
		*
		* Moved out of `client/index.ts` (Phase 2.6b) with its body unchanged. The
		* mechanism state (observers, timers, the last-published fingerprints) lives here;
		* the two values the composition root itself owns stay there and arrive through
		* accessors:
		*   - `railBudget` is part of the bridge snapshot, so `emit()` reads it;
		*   - `drawerEl` is written by the rail view’s ref.
		* `prefs` is a LIVE binding, hence `getPrefs()` at the point of use.
		*/
		/** Build the measurement layer bound to one composition root. */
		function createRailMeasure(deps) {
			const { getPrefs, getRailBudget, setRailBudget, getDrawerEl, emit, subscribe } = deps;
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
			/**
			* Fingerprint of the geometry the drawer last rendered (see `spaceKey`): the
			* geometry gate in `updateRailBudget` compares against it, so a budget step
			* that leaves the deck's shape unchanged costs no React render.
			*/
			let lastSpaceKey = "";
			/** The AppFrame whose track transition drives the yield beat. */
			let frameEl = null;
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
			* for no change. Measured 2026-09-18 (1578×1000, long conversation): guarding
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
			* Cost, measured 2026-09-19 over one 216px handle drag at 1578×1000 with the
			* same drag run rail-open and rail-closed (rAF deltas): p50 17ms in both, and
			* the rail adds single-digit janky frames over 33ms plus a couple of long
			* tasks on top of the shell's own per-frame reflow. Host load moves these
			* numbers by tens of percent between rounds, so treat them as an order of
			* magnitude, not an assertion.
			*/
			function updateRailBudget(next = readRailBudget()) {
				const current = getRailBudget();
				if (current >= 0 && Math.abs(next - current) < 8) return;
				setRailBudget(next);
				setVar("--dsx-rail-avail", `${next}px`);
				const space = resolveRailSpace(getPrefs(), next);
				setVar("--dsx-rail-w", `${space.claimW}px`);
				applyRailRight(space.swallowed);
				const drawer = getDrawerEl();
				if (drawer !== null) {
					const opacity = space.hidden ? "0" : "1";
					if (drawer.style.opacity !== opacity) drawer.style.opacity = opacity;
					if (space.yielded) drawer.setAttribute("data-yielded", "");
					else drawer.removeAttribute("data-yielded");
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
				updateRailBudget(Math.max(0, Math.round(column - measure - 74)));
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
			/** Install the observers/listeners; returns the disposer `ctx.effect` wants. */
			function install() {
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
			}
			return {
				install,
				scheduleMeasure
			};
		}
		//#endregion
		//#region src/client/lib/morph-spring.ts
		/**
		* The spring the wave engages/disengages on.
		*
		* `responseMs: 200` matches the duration of the CSS tween this replaced (so the
		* hover still feels as quick as it did), and the 0.1 bounce is the smallest
		* overshoot that keeps the stop from reading as a dead halt — 0.15%, i.e. ~0.4px
		* on a 240px card, well below what anyone can see. Anything larger was rejected
		* for a UI that magnifies on every pointer move: a visible rebound on every hover
		* reads as jitter, not as weight.
		*/
		const WAVE_SPRING = {
			responseMs: 200,
			bounce: .1
		};
		/**
		* The value of a unit-step spring after `elapsedMs`.
		*
		* The closed form for a mass on a spring released with zero velocity, with the
		* mass fixed at 1: `ω = 2π/response`, `ζ = 1 − bounce`, and
		*
		* ```
		* x(t) = 1 − e^(−ζωt) [ cos(ω_d t) + (ζω/ω_d) sin(ω_d t) ],  ω_d = ω√(1−ζ²)
		* ```
		*
		* which is `0` at `t = 0`, rises with zero initial velocity, passes the target by
		* the bounce's overshoot, and settles back onto `1`. Critically damped and
		* overdamped springs (`ζ ≥ 1`) use the single-exponential form instead — there is
		* no oscillation to write down.
		* @param elapsedMs - time since this motion's own start, in milliseconds.
		* @param spec - the spring.
		* @returns the position, `0` before the start and near `1` once settled.
		*/
		function springValue(elapsedMs, spec) {
			if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
			const seconds = elapsedMs / 1e3;
			const response = Math.max(1, spec.responseMs) / 1e3;
			const omega = 2 * Math.PI / response;
			const zeta = Math.min(1, Math.max(0, 1 - spec.bounce));
			if (zeta >= 1) return 1 - Math.exp(-omega * seconds) * (1 + omega * seconds);
			const damped = omega * Math.sqrt(1 - zeta * zeta);
			return 1 - Math.exp(-zeta * omega * seconds) * (Math.cos(damped * seconds) + zeta * omega / damped * Math.sin(damped * seconds));
		}
		/**
		* How long a spring takes to come within `tolerance` of its target.
		*
		* Bounded rather than sampled: every oscillation of an underdamped spring is
		* inside the envelope `e^(−ζωt)/√(1−ζ²)`, so solving that envelope for the
		* tolerance gives a time the spring cannot still be moving after — and unlike a
		* scan for the first frame where the value is close to 1, it cannot stop early on
		* the overshoot, where the value is close to 1 while the motion is at its fastest.
		* @param spec - the spring.
		* @param tolerance - how close counts as settled (fraction of the travel).
		* @returns the settling time in milliseconds.
		*/
		function springSettleMs(spec, tolerance = .002) {
			const response = Math.max(1, spec.responseMs) / 1e3;
			const omega = 2 * Math.PI / response;
			const zeta = Math.min(1, Math.max(0, 1 - spec.bounce));
			if (zeta <= 0) return Math.round(response * 1e3 * 4);
			if (zeta >= 1) {
				let low = 0;
				let high = 32;
				for (let step = 0; step < 60; step += 1) {
					const mid = (low + high) / 2;
					if (Math.exp(-mid) * (1 + mid) > tolerance) low = mid;
					else high = mid;
				}
				return Math.round(high / omega * 1e3);
			}
			const amplitude = 1 / Math.sqrt(1 - zeta * zeta);
			const seconds = Math.log(amplitude / tolerance) / (zeta * omega);
			return Math.round(seconds * 1e3);
		}
		//#endregion
		//#region src/client/rail/wave/RailWave.tsx
		/**
		* dsh-widgets — the rail magnification wave.
		*
		* Moved out of `client/index.ts` (Phase 2.4) unchanged. The component owns its
		* own interaction geometry (railElement / hitLayout / onCard / moveRailFocus /
		* leaveRail / nearSurface are all defined below), so the only things it takes
		* from its callers are the 25 props in `RailWaveProps`.
		*
		* Motion model: ONE spring drives every slot — `displayed = 1 + (target - 1) * p`
		* where `target` is the pointer-live scale array and `p` the spring progress. Both
		* are continuous, so entering, following and leaving are one uninterrupted curve.
		*/
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
		/** Honour the OS "reduce motion" preference for the scroll animation too. */
		const REDUCE_MOTION = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		function RailWave(props) {
			const { deck, cardBodies, railElRef, onAddClick, items, side, pad, railW, stackHeight, rows, deckH, paneH, lastRow, addRadius, active, placeCards, scaleFor, nearest, stepScale, xPts, yPts, addSlotFor, restLayout, restAdd, live, shiftX, columns } = props;
			const n = items.length;
			Math.max(1, side + pad);
			const scrollContentH = restLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2) + paneH;
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
			/**
			* The morph progress, `0` at rest and `1` fully engaged — the `p` of
			* `displayed = 1 + (target − 1) · p` (see the note above `SLOT_SPRING`).
			*
			* Written every frame while it is moving, by a spring whose TARGET is just
			* "engaged or not". The pointer only ever changes `target`, never the curve, so
			* moving the mouse mid-enter neither restarts nor interrupts anything.
			*/
			const [morphP, setMorphP] = react.useState(0);
			const morphRef = react.useRef({
				p: 0,
				from: 0,
				to: 0,
				t0: 0,
				raf: 0
			});
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
				const overlaid = morph;
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
				if (morphRef.current.raf) cancelAnimationFrame(morphRef.current.raf);
			}, []);
			react.useEffect(() => {
				if (live) return;
				setFocusY(null);
				setFocusX(null);
				armedRef.current = false;
				const st = morphRef.current;
				if (st.raf) {
					cancelAnimationFrame(st.raf);
					st.raf = 0;
				}
				st.p = 0;
				st.from = 0;
				st.to = 0;
				setMorphP(0);
			}, [live]);
			const engaged = focusX !== null && focusY !== null && armedRef.current;
			const rawX = (focusX ?? 0) - pad;
			const rawY = focusY ?? 0;
			/**
			* The LIVE target: the scale every card would have if the wave were fully
			* engaged right now. Updated on every render while engaged, and deliberately
			* LEFT ALONE once the pointer is gone — the leave must animate away from the
			* geometry that was on screen, not from the rest layout (a frozen-at-1 target
			* would make `displayed = 1 + (1 − 1)·p` collapse to rest on the first frame).
			*/
			const targetRef = react.useRef(new Array(n).fill(1));
			if (engaged && n > 0) targetRef.current = active ? scaleFor(rawX, rawY) : scaleFor(nearest(rawX, xPts), nearest(rawY, yPts));
			const target = targetRef.current.length === n ? targetRef.current : new Array(n).fill(1);
			const p = n > 0 ? morphP : 0;
			const focusLayout = placeCards(p === 1 ? target : target.map((v) => 1 + (v - 1) * p));
			const focusedAdd = addSlotFor(focusLayout);
			const addCenter = {
				x: railW - 2 * pad - focusedAdd.right - side / 2,
				y: focusedAdd.top + side / 2
			};
			const addScale = 1 + ((engaged && n > 0 ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad)) : 1) - 1) * p;
			/**
			* Drive `morphP` with WAVE_SPRING towards "engaged".
			*
			* ONE spring, ONE curve, either direction: engaging runs it 0 → 1, releasing
			* runs the same formula back 1 → 0 from wherever it currently is (`from` is the
			* live value, so an interrupted enter reverses without a jump). The pointer is
			* not an input here at all — it only moves `target` — which is what keeps the
			* motion continuous while the mouse keeps moving.
			*
			* A rAF loop rather than a transition or a timer: the value is written every
			* frame, so a dropped frame costs a frame of progress and nothing else, and
			* there is no "tween finished?" boundary to land on the wrong side of.
			*/
			react.useEffect(() => {
				const st = morphRef.current;
				const to = engaged ? 1 : 0;
				if (REDUCE_MOTION) {
					if (st.raf) {
						cancelAnimationFrame(st.raf);
						st.raf = 0;
					}
					st.p = to;
					st.from = to;
					st.to = to;
					setMorphP(to);
					return;
				}
				if (Math.abs(to - st.p) < 5e-4) return;
				st.from = st.p;
				st.to = to;
				st.t0 = performance.now();
				if (st.raf) return;
				const settleMs = springSettleMs(WAVE_SPRING);
				const tick = () => {
					const elapsed = performance.now() - st.t0;
					const done = elapsed >= settleMs;
					st.p = done ? st.to : st.from + (st.to - st.from) * springValue(elapsed, WAVE_SPRING);
					setMorphP(st.p);
					st.raf = done ? 0 : requestAnimationFrame(tick);
				};
				st.raf = requestAnimationFrame(tick);
			}, [engaged]);
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
			const morph = engaged || morphP > 5e-4;
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
			/**
			* The overlay slots carry NO transition: every frame of the morph is written
			* from `scaleArr` (spring progress × live target). `none` is also load-bearing
			* — the overlay's slots share the `.dsx-stats-card-slot` class, whose CSS
			* transition belongs to the STATIC deck's re-seating, so leaving it in place
			* would re-introduce exactly the retargeting this design removes.
			*/
			/**
			* 鈹€鈹€ SCROLL GEOMETRY: the one place that decides how far the rail can travel 鈹€鈹€
			*
			* The deck's rows are seated at `rowTop(r) = 2 + r · pitch` (see placeCards), and
			* the rail's scroll range is `scrollContentH –clientH`. For every row to be
			* able to TOP OUT the viewport, the range must reach `rowTop(rows –1) + 2`,
			* i.e. the content needs `rows · pitch` of height —one extra row-pitch worth of
			* padding under the last row. Without it the browser CLAMPS the last detents
			* and the deck simply stops moving (see the tail element's note).
			*
			* So: contentH = max(rows · pitch, deckBottom) + clientH, and `clientH` is
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
			*    therefore always `row · (side + gap)`, which is also why the first frame
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
						const top = 2 + Math.max(0, Math.min(lastRowRef.current, Math.round((r.scrollTop - 2) / pitch))) * pitch;
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
						baseRow = Math.max(0, Math.min(topRow, Math.round((rail.scrollTop - 2) / pitch)));
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
							scrollToDetent(2 + row * pitch);
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
					opacity: morph ? 1 : 0,
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
						transition: "none",
						willChange: "transform",
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
					transition: "none",
					willChange: "transform",
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
		//#endregion
		//#region src/client/rail/wave/wave-geometry.ts
		function createWaveGeometry(input) {
			const { items, side, pad, columns, railW, multi, magnify, realTime } = input;
			const restCenter = (i) => i * (side + pad) + side / 2;
			const peakScale = magnify;
			const stepScale = (d) => {
				const extra = peakScale - 1;
				if (d <= 0) return peakScale;
				const t = Math.max(0, 1 - d / 3);
				if (t <= 0) return 1;
				return 1 + extra * Math.pow(t, 1.6);
			};
			const active = realTime;
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
			return {
				rows,
				active,
				deckBottom,
				staticLayout,
				stepScale,
				scaleFor,
				placeCards,
				nearest,
				xPts,
				yPts,
				addSlotFor
			};
		}
		//#endregion
		//#region src/client/rail/rail-view.tsx
		/**
		* dsh-widgets — the right-rail slot body.
		*
		* Hosted in `conversation.input.overlay`; the registration in `client/index.ts`
		* records why that seat and not `shell.overlay`. One component draws the whole
		* right-rail group as ONE sliding surface:
		*
		*   drawer wrapper ── RailWave ── resting deck (grid of cards + the add tile)
		*                  ├─ the magnify overlay (inside RailWave)
		*                  └─ the add panel (settings pages, portaled to <body>)
		*
		* Moved out of `client/index.ts` (Phase 2.9) with its body unchanged; the
		* indentation is kept on purpose so the move stays byte-auditable. It receives the
		* bridge handles instead of closing over them: `useBridge` / `setPrefs` /
		* `runCommand` are stable, while `prefs` and `railBudget` are LIVE bindings, so
		* those arrive as getters and every EVENT-HANDLER read goes through them (a
		* captured value would go stale between the emit and the re-render).
		*/
		/** Map from interactive action id to the slash command it triggers. */
		const ACTION_COMMANDS = { contextCompact: "/compact" };
		/**
		* Which live source each data-backed widget family reads, and what its loading
		* skeleton looks like, are declared by the UNIT’s own manifest.json and reach
		* the shell as `WIDGET_RUNTIME` (see the generated registry).
		*
		* The SHELL still owns the loading DECISION — a widget cannot distinguish "my
		* source is still in flight" from "my source answered with nothing", and those
		* two states deserve different cards (placeholder pills vs an honest empty
		* state) — but it no longer owns the DATA: adding a widget with a live source
		* means declaring `source` + `skeleton` in that unit’s manifest, and
		* `pnpm check:registry` fails the build if the declaration drifts.
		*/
		/**
		* Is this family's live source still in flight? (see WIDGET_RUNTIME)
		*
		* `commandCodeError` is deliberately part of the test: once the host route has
		* ANSWERED with an error the card must show its real "not configured" state,
		* not a skeleton that never resolves.
		*/
		function isSourcePending(source, snap) {
			if (source === "usage") return snap.usageData === null && (snap.usageMulti === null || snap.usageMulti.keys.length === 0);
			if (source === "cc") return snap.commandCode === null && snap.commandCodeError === null;
			if (source === "github") return snap.github === null && snap.githubError === null;
			return snap.sysinfo === null;
		}
		/** Build the right-rail slot component bound to one composition root. */
		function createRailView(deps) {
			const { useBridge, getPrefs, setPrefs, getRailBudget, runCommand, setDrawerEl } = deps;
			return () => {
				const snap = useBridge();
				const prefs = getPrefs();
				const railBudget = getRailBudget();
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
						...getPrefs().cardConfigs,
						[key]: {
							...getPrefs().cardConfigs[key] ?? {},
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
				const [detailOpen, setDetailOpen] = react.useState(false);
				react.useEffect(() => {
					if (!addOpen) return;
					const onDown = (e) => {
						const target = e.target instanceof Element ? e.target : null;
						if (target === null) return;
						if (target.closest(".dsx-stats-addpanel") !== null) return;
						if (target.closest(".dsx-stats-rail") !== null) return;
						if (target.closest(".dsx-magnify-layer") !== null) return;
						if (target.closest(".dsx-stats-add") !== null) return;
						if (target.closest(".dsx-stats-capsule") !== null) return;
						setAddOpen(false);
					};
					document.addEventListener("pointerdown", onDown, true);
					return () => document.removeEventListener("pointerdown", onDown, true);
				}, [addOpen]);
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
				const items = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1).map((key) => {
					const { widgetId, size } = parseInstanceKey(key);
					const w = WIDGETS.find((x) => x.id === widgetId);
					if (!w || sizesOf(w).indexOf(size) === -1) return null;
					let out;
					try {
						out = w.render(buildLiveStats(snap, prefs, key, armedAction), { size });
					} catch (error) {
						console.error(`[dsh-widgets] widget ${widgetId}@${size} render crashed:`, error);
						out = {
							title: widgetName(w),
							value: "—",
							legend: t("ui.renderError")
						};
					}
					const source = WIDGET_RUNTIME[widgetId]?.source;
					if (source !== void 0 && isSourcePending(source, snap)) {
						const silhouette = WIDGET_RUNTIME[widgetId]?.skeleton;
						out = {
							title: out?.title ?? widgetName(w),
							skeleton: true,
							skeletonRows: silhouette?.rows ?? 1,
							...silhouette === void 0 ? {} : {
								skeletonShape: silhouette.shape,
								skeletonCount: silhouette.count
							}
						};
					}
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
				const scale = side / 150;
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
				const { rows, active, deckBottom, staticLayout, stepScale, scaleFor, placeCards, nearest, xPts, yPts, addSlotFor } = createWaveGeometry({
					items,
					side,
					pad,
					columns,
					railW,
					multi,
					magnify: prefs.magnify,
					realTime: prefs.realTime
				});
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
				const lastRow = Math.max(0, Math.min(rows - 1, Math.ceil((contentBottom + paneH - 2) / scrollPitch) - 1));
				const cardBodyFor = (it, width) => [react.createElement(CardBody, {
					key: "b",
					out: it.out,
					unit: side,
					width,
					squircle: prefs.squircle,
					cornerPercent: prefs.cornerPercent,
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
						const s0 = getPrefs().cardSide;
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
					className: "dsx-stats-addpanel" + (addOpen ? " open" : "") + (prefs.squircle ? " dsx-squircle" : ""),
					style: {
						top: "var(--dsx-rail-top,0px)",
						width: `${detailOpen ? Math.max(pw, 668) : pw}px`,
						borderRadius: `${cardRadius(100, prefs.cornerPercent)}px`
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
						setPrefs,
						onDetailToggle: setDetailOpen,
						detailWidth: Math.max(440, pw - 26 - 190 - 12),
						railSide: side,
						liveStats: (key) => buildLiveStats(snap, prefs, key, armedAction)
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
						setDrawerEl(el);
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
			};
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
		/** Required services: the slot registry (React is a platform module). */
		const inject = ["slots"];
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
				commandCodeDaily: null,
				sysinfo: null,
				host: null,
				hostError: null,
				pricing: null,
				github: null,
				githubError: null
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
				if (e.key !== "harness-widgets.state" && e.key !== "harness-widgets.state.savedAt") return;
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
			/** Space the product’s transcript measure leaves for the rail (px). */
			let railBudget = -1;
			/** The drawer wrapper, so the yield can be applied on the shell’s own beat. */
			let drawerEl = null;
			const measure = createRailMeasure({
				getPrefs: () => prefs,
				getRailBudget: () => railBudget,
				setRailBudget: (next) => {
					railBudget = next;
				},
				getDrawerEl: () => drawerEl,
				emit,
				subscribe
			});
			ctx.effect(() => measure.install());
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
			}, createCollector({
				useBridge,
				setState,
				getState: () => state,
				getPrefs: () => prefs
			})));
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "widgets-panel",
				order: 1e3
			}, createRailView({
				useBridge,
				getPrefs: () => prefs,
				setPrefs,
				getRailBudget: () => railBudget,
				runCommand,
				setDrawerEl: (el) => {
					drawerEl = el;
				}
			})));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "widgets",
				order: 30,
				label: () => t("ui.section.label")
			}, () => {
				const snap = useBridge();
				return react.createElement(WidgetsPage, { controller: {
					prefs: snap.prefs,
					setPrefs,
					liveStats: (key) => buildLiveStats(snap, prefs, key)
				} });
			}));
			ctx.effect(() => installSettingsNavGlyph());
			ctx.effect(() => {
				const apply = () => {
					document.body.classList.toggle("dsx-stats-active", state.open && state.hasSession);
					document.body.classList.toggle("dsx-stats-no-session", !state.hasSession);
					measure.scheduleMeasure();
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