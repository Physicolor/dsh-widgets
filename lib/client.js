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
		//#region \0dsh-css:D:\dsh-home\plugins\harness-widgets\src\client\widgets.module.css.mjs
		const css = ".dsx-stats-capsule{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-alias-bg-layer-1);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:14px;align-items:center;gap:6px;padding:0 12px;font-size:13px;line-height:1;display:inline-flex}.dsx-stats-capsule[aria-pressed=true]{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-stats-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,transparent);background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2);flex-direction:column;justify-content:flex-start;display:flex;position:relative;overflow:hidden}.dsx-stats-card.dsx-cyclable{cursor:pointer;transition:transform .24s cubic-bezier(.34,1.56,.64,1)}.dsx-stats-card.dsx-cyclable.dsx-cycle-pressed{transition:transform 80ms ease-out;transform:scale(.93)}.dsx-stats-card-title{color:var(--dsw-alias-state-business-primary);line-height:1.2}.dsx-stats-card-value{color:var(--dsw-alias-label-primary);word-break:break-word;font-weight:600;line-height:1.25}.dsx-stats-card-sub{color:var(--dsw-alias-label-caption);font-size:10px}.dsx-stats-resize{cursor:nesw-resize;z-index:2;opacity:0;background:linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%, var(--dsw-alias-label-tertiary) 62%, transparent 62%);width:18px;height:18px;position:absolute;bottom:0;left:0}.dsx-stats-card:hover .dsx-stats-resize{opacity:1}.dsx-stats-card-corner{background:var(--dsw-alias-state-business-primary);color:#fff;cursor:pointer;width:30px;height:30px;box-shadow:var(--dsw-shadow-lv1);border:none;border-radius:15px;justify-content:center;align-items:center;font-size:12px;transition:background .16s,width .16s,color .16s;display:inline-flex;position:absolute}.dsx-stats-card-corner:hover{background:var(--dsw-alias-state-business-primary);filter:brightness(1.08)}.dsx-stats-card-corner.armed{border-radius:15px;width:56px;font-weight:600}[data-conversation-scroll]{transition:padding-right .2s}.dsx-stats-rail{transform:translateX(calc(var(--dsh-sidebar-width,0px) * -1));transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out);-ms-overflow-style:none}@media (prefers-reduced-motion:reduce){.dsx-stats-rail{transition:none}}.dsx-stats-rail::-webkit-scrollbar{width:0;height:0;display:none}@supports not selector(::-webkit-scrollbar){.dsx-stats-rail{scrollbar-width:none}}body[data-dsh-sidebar-dragging] .dsx-stats-rail{transition:none}body.dsx-stats-active [data-conversation-scroll]{padding-right:var(--dsx-rail-w,220px)!important}body.dsx-stats-active [data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{right:calc(var(--dsh-scrollbar-width) + var(--dsx-rail-w,220px))}[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{transition:right .2s}body.dsx-stats-active [data-slot=\"conversation.composer.dock\"]{visibility:hidden!important}.dsx-stats-card-slot{transition:top .2s var(--ds-ease-in-out), width .2s var(--ds-ease-in-out), height .2s var(--ds-ease-in-out)}.dsx-stats-card-slot .dsx-stats-card{transition:border-color .18s,box-shadow .18s}.dsx-stats-card-slot:hover .dsx-stats-card{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary), 0 10px 28px color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)}.dsx-stats-resize{transition:opacity .12s}.dsx-stats-add{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:border-color .18s ease, color .18s ease, background .18s ease, transform .18s var(--ds-ease-in-out);background:0 0;border-radius:16px;flex-direction:column;flex:none;justify-content:center;align-items:center;gap:6px;display:flex}.dsx-stats-add:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover);transform:scale(1.04)}.dsx-stats-add-icon{color:var(--dsw-alias-state-business-primary);justify-content:center;align-items:center;line-height:1;display:flex}.dsx-stats-add-label{font-size:13px;font-weight:500;line-height:1}.dsx-stats-addpanel{right:calc(var(--dsh-sidebar-width,0px) + var(--dsx-rail-pad,14px));width:auto;bottom:var(--dsx-input-bottom,var(--dsx-rail-pad,14px));z-index:30;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:transform .28s var(--ds-ease-in-out), visibility 0s linear .28s;visibility:hidden;border-radius:16px;flex-direction:column;display:flex;position:fixed;transform:translate(calc(100% + 40px))}.dsx-stats-addpanel.open{visibility:visible;transition-delay:0s;transform:translate(0)}.dsx-stats-addpanel-resize{cursor:ew-resize;z-index:3;width:10px;position:absolute;top:0;bottom:0;left:-5px}.dsx-stats-addpanel-header{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:8px;padding:12px 12px 10px;display:flex}.dsx-stats-addpanel-title{color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;line-height:22px}.dsx-stats-addpanel-close{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;transition:background .12s,color .12s;display:inline-flex}.dsx-stats-addpanel-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsx-stats-addpanel-body{flex:1;min-height:0;padding:12px;overflow-y:auto}.dsx-stats-addpanel-body>div{height:100%}.dsx-order-row{border-radius:8px;align-items:center;gap:8px;padding:2px 0;display:flex}.dsx-order-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-order-row.selected{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);outline:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);cursor:pointer}.dsx-drag-handle{cursor:grab;color:var(--dsw-alias-label-tertiary);align-items:center;padding:6px 2px;display:flex}.dsx-drag-handle:active{cursor:grabbing}.dsx-restore{border:1px solid var(--dsw-alias-border-l2);height:24px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:12px;padding:0 10px;font-size:12px}.dsx-trash{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;transition:color .12s,background .12s;display:flex}.dsx-trash:hover{color:var(--dsw-alias-state-danger,#e5484d);background:var(--dsw-alias-interactive-bg-hover)}.dsx-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);white-space:nowrap;border-radius:9px;flex:none;padding:1px 8px;font-size:11px}.dsx-tabbar{border-bottom:1px solid var(--dsw-alias-border-l2);gap:8px;display:flex}.dsx-tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 2px;font-size:13px;font-weight:500;line-height:16px}.dsx-tab[data-active=true]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary)}.dsx-search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:17px;outline:none;margin-bottom:10px;padding:0 12px;font-size:13px}.dsx-select{-webkit-appearance:none;appearance:none;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-1);min-width:150px;height:34px;color:var(--dsw-alias-label-primary);cursor:pointer;box-sizing:border-box;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%236F6F7A'/></svg>\");background-position:right 12px center;background-repeat:no-repeat;border-radius:17px;outline:none;padding:0 34px 0 12px;font-size:13px}body[data-ds-dark-theme] .dsx-select{background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none'><path d='M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z' fill='%23ECECF1'/></svg>\")}.dsx-select:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}.dsx-select option{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dsx-mlist{flex-direction:column;gap:10px;display:flex}.dsx-mcard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;box-sizing:border-box;border-radius:14px;flex-direction:column;width:100%;padding:14px;display:flex}.dsx-mcard:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-mcard[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary)}.dsx-mhead{align-items:center;gap:8px;margin-bottom:6px;display:flex}.dsx-mname{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}.dsx-mdesc{color:var(--dsw-alias-label-tertiary);margin-bottom:8px;font-size:12px;line-height:18px}.dsx-mid{color:var(--dsw-alias-label-caption);margin-bottom:4px;font-family:monospace;font-size:11px}.dsx-macts{justify-content:flex-end;gap:8px;margin-top:4px;display:flex}.dsx-btn{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border-radius:14px;align-items:center;padding:0 12px;font-size:12px;display:inline-flex}.dsx-btn-primary{background:var(--dsw-alias-state-business-primary);color:#fff;border-color:#0000}.dsx-navbtn{width:32px;height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;transition:background .12s;display:inline-flex}.dsx-navbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsx-dot{background:var(--dsw-alias-border-l2);cursor:pointer;border:none;border-radius:50%;width:8px;height:8px;padding:0}.dsx-dot-active{background:var(--dsw-alias-brand-primary)}.dsx-switch-row{cursor:pointer;flex:none;align-items:center;display:inline-flex;position:relative}.dsx-switch-input{opacity:0;cursor:pointer;width:100%;height:100%;margin:0;position:absolute}.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);border-radius:11px;align-items:center;width:34px;height:20px;padding:0;transition:background .16s;display:inline-flex}.dsx-switch-thumb{width:16px;height:16px;box-shadow:var(--dsw-shadow-lv1);background:#fff;border-radius:50%;margin-left:2px;transition:transform .16s}.dsx-switch-input:checked+.dsx-switch-track{background:var(--dsw-alias-state-success-primary)}.dsx-switch-input:checked+.dsx-switch-track .dsx-switch-thumb{transform:translate(14px)}.dsx-switch-input:focus-visible+.dsx-switch-track{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dsx-switch-input:disabled+.dsx-switch-track{background:var(--dsw-alias-interactive-bg-hover);opacity:.5;cursor:not-allowed}.dsx-switch-input:disabled+.dsx-switch-track .dsx-switch-thumb{box-shadow:none}.dsx-size-warn{background:var(--dsw-alias-state-warn-primary,#f2b04a);color:#4a3800;white-space:nowrap;border-radius:999px;flex:none;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;line-height:1;display:inline-flex}.dsx-limit-tip{z-index:30;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-tertiary));background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 92%, transparent);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv1);pointer-events:none;border-radius:999px;padding:4px 12px;font-size:12px;line-height:20px;position:absolute;top:64px;left:50%;transform:translate(-50%)}body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div,body.dsx-hide-statsline [data-slot=\"conversation.composer.dock\"]>div *{color:#0000!important}.dsx-peak-alert{box-shadow:inset 0 0 22px color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent), inset 0 0 5px color-mix(in srgb, var(--dsw-alias-state-error-primary) 20%, transparent), var(--dsw-shadow-lv2);animation:2.2s ease-in-out infinite alternate dsx-peak-breathe}@keyframes dsx-peak-breathe{0%{box-shadow:inset 0 0 15px color-mix(in srgb, var(--dsw-alias-state-error-primary) 20%, transparent), inset 0 0 4px color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent), var(--dsw-shadow-lv2)}to{box-shadow:inset 0 0 30px color-mix(in srgb, var(--dsw-alias-state-error-primary) 42%, transparent), inset 0 0 7px color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent), var(--dsw-shadow-lv2)}}@media (prefers-reduced-motion:reduce){.dsx-peak-alert{animation:none}}";
		const tagId = "dsh-widgets/widgets.module.css";
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
			"market.previewText": "预览寄语：写一句你的话",
			"group.system": "系统",
			"group.codingPlan": "Coding Plan 用量",
			"group.pricing": "峰谷定价",
			"group.other": "其它",
			"badge.system": "系统",
			"badge.external": "外部",
			"settings.columns.title": "列数",
			"settings.columns.desc": "侧边栏卡片排布列数：1 列 = 纵向 Dock；2 列 / 4 列 = 网格布局，并解锁长方形部件能力",
			"settings.columns.option": "{n} 列",
			"settings.realtime.title": "无极变化（连续跟随）",
			"settings.realtime.desc": "开启后放大峰值跟随鼠标实时连续变化（每个动画帧重排），用于对比观察动画节奏；关闭则离散跳变后由过渡动画补间",
			"settings.magnify.title": "放大倍数",
			"settings.magnify.desc": "被悬浮组件的峰值放大比例（1.0 = 不放大，1.4 = 1.4 倍）",
			"settings.padding.title": "组件栏内边距",
			"settings.padding.desc": "栏内四周与卡片间距（两者一致）",
			"settings.cardSide.title": "卡片边长",
			"settings.cardSide.desc": "所有卡片统一的正方形边长，字体与圆角随比例缩放",
			"settings.panelWidth.title": "添加面板宽度",
			"settings.panelWidth.desc": "右侧“添加组件”面板的宽度，也可拖其左边缘调整",
			"settings.maxWidgets.title": "最多组件数",
			"settings.maxWidgets.desc": "侧边栏最多显示的组件数量，超限后无法再添加",
			"settings.maxWidgets.unit": "个",
			"settings.hideStatsLine.title": "隐藏输入框下方文字条",
			"settings.hideStatsLine.desc": "隐藏输入框下方状态统计条的文字（保留原空间、不影响布局）；关闭时正常显示",
			"align.left": "左",
			"align.center": "居中",
			"align.right": "右",
			"align.top": "上",
			"align.bottom": "下",
			"widget.counts.name": "轮次·步数",
			"widget.counts.desc": "本轮会话的轮次与步骤计数",
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
			"widget.context-water.name": "上下文水位",
			"widget.context-water.desc": "上下文系统/工具/消息占比分段条",
			"widget.task.name": "任务",
			"widget.task.desc": "当前任务的进行中/已完成/待办计数",
			"widget.quote.name": "今日寄语",
			"widget.quote.desc": "显示你自定义的一句话（未填写文本时不显示内容）",
			"widget.heatmap.name": "用量热度图",
			"widget.heatmap.desc": "每日 Token 用量热度图（自记账）。2×2 显示近 3 个月日历，2×4 显示近半年全部用量点；大小可在市场左右切换",
			"widget.heatmap-bars.name": "用量柱状图",
			"widget.heatmap-bars.desc": "最近 7 天 Token 用量的垂直柱状图，柱区高度与日历图一致",
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
			"widget.peak-pricing.name": "峰谷定价",
			"widget.peak-pricing.desc": "DeepSeek V4 峰谷定价：当前是否处于高峰时段（北京时间，工作日 09:00–12:00 与 14:00–18:00 为高峰）",
			"badge.opencode": "OpenCode Go 用量配额",
			"sim.peak": "高峰/低峰",
			"card.counts.value": "{turns}轮 {steps}步",
			"card.context.title": "一键压缩",
			"card.context.waiting": "等待上下文数据",
			"card.context.compact": "压缩",
			"card.context.confirm": "确认",
			"card.contextWater.title": "上下文已用",
			"card.contextWater.system": "系统提示词",
			"card.contextWater.tools": "工具",
			"card.contextWater.messages": "对话消息",
			"card.task.done": "{n} 已完成",
			"card.task.none": "暂无任务",
			"card.task.sub": "{doing} 进行中 · {pending} 待办",
			"card.quote.title": "今日寄语",
			"card.peak.title": "峰谷定价",
			"card.peak.window1": "上午 09:00–12:00",
			"card.peak.window2": "下午 14:00–18:00",
			"card.heatmap.title": "Token 用量",
			"usage.title": "OpenCode 用量",
			"usage.totalKey": "总 Key",
			"usage.cycleHint": "单击循环：{chain}",
			"usage.resets": "重置 {date}",
			"usage.rolling": "滚动",
			"usage.week": "周",
			"usage.month": "月",
			"config.quoteText": "寄语内容",
			"config.showTitle": "显示标题",
			"config.align": "水平对齐",
			"config.valign": "垂直位置",
			"config.wrap": "允许换行",
			"config.monthMode": "窗口对齐方式",
			"config.monthMode.rolling": "滚动(今天最右)",
			"config.monthMode.quarter": "季度对齐",
			"config.monthMode.rolling7": "滚动(最近7天)",
			"config.monthMode.weekly": "每周对齐",
			"config.timeZone": "记账时区",
			"config.timeZone.beijing": "北京 (UTC+8)",
			"config.timeZone.local": "跟随系统",
			"preview.quotePlaceholder": "（填写寄语内容后显示）"
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
			"market.previewText": "Preview quote: write your own words",
			"group.system": "System",
			"group.codingPlan": "Coding Plan Usage",
			"group.pricing": "Peak Pricing",
			"group.other": "Others",
			"badge.system": "System",
			"badge.external": "External",
			"settings.columns.title": "Columns",
			"settings.columns.desc": "Rail column count: 1 = vertical dock; 2 / 4 = grid layouts (enables rectangular widgets)",
			"settings.columns.option": "{n} cols",
			"settings.realtime.title": "Continuous Magnify",
			"settings.realtime.desc": "When on, the magnify peak follows the pointer continuously every frame (for comparing animation rhythm); when off, it snaps between grid points and a transition tween glides it",
			"settings.magnify.title": "Magnification",
			"settings.magnify.desc": "Peak scale of the hovered card (1.0 = no zoom, 1.4 = 1.4×)",
			"settings.padding.title": "Rail Padding",
			"settings.padding.desc": "Padding inside the rail around the cards (applies to all sides)",
			"settings.cardSide.title": "Card Size",
			"settings.cardSide.desc": "Uniform square side for every card; fonts and radii scale with it",
			"settings.panelWidth.title": "Add Panel Width",
			"settings.panelWidth.desc": "Width of the right “Add Widget” panel; drag its left edge to adjust",
			"settings.maxWidgets.title": "Max Widgets",
			"settings.maxWidgets.desc": "Maximum widgets shown in the rail; nothing more can be added beyond it",
			"settings.maxWidgets.unit": "",
			"settings.hideStatsLine.title": "Hide Stats Line",
			"settings.hideStatsLine.desc": "Hide the text of the status stats bar under the input box (space kept, layout untouched); off shows it normally",
			"align.left": "Left",
			"align.center": "Center",
			"align.right": "Right",
			"align.top": "Top",
			"align.bottom": "Bottom",
			"widget.counts.name": "Turns · Steps",
			"widget.counts.desc": "Turns and steps of the current session",
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
			"widget.context-water.name": "Context Level",
			"widget.context-water.desc": "System/tools/messages share as a segmented bar",
			"widget.task.name": "Tasks",
			"widget.task.desc": "Counts of in-progress / completed / pending tasks",
			"widget.quote.name": "Daily Quote",
			"widget.quote.desc": "Shows a custom sentence you typed (hidden while empty)",
			"widget.heatmap.name": "Token Heatmap",
			"widget.heatmap.desc": "Daily token usage heatmap (self-accounted). 2×2 shows a ~3-month calendar, 2×4 the ~half-year history; switch size in the market",
			"widget.heatmap-bars.name": "Token Bars",
			"widget.heatmap-bars.desc": "Vertical bars of the last 7 days of token usage; same height as the calendar view",
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
			"widget.peak-pricing.name": "Peak Pricing",
			"widget.peak-pricing.desc": "DeepSeek V4 peak pricing: whether now is a peak window (Beijing time, weekdays 09:00–12:00 & 14:00–18:00 are peak)",
			"badge.opencode": "OpenCode Go Usage Quota",
			"sim.peak": "Peak/Off-Peak",
			"card.counts.value": "{turns} turns · {steps} steps",
			"card.context.title": "Compact",
			"card.context.waiting": "Waiting for context data",
			"card.context.compact": "Compact",
			"card.context.confirm": "Confirm",
			"card.contextWater.title": "Context Used",
			"card.contextWater.system": "System prompt",
			"card.contextWater.tools": "Tools",
			"card.contextWater.messages": "Messages",
			"card.task.done": "{n} done",
			"card.task.none": "No tasks",
			"card.task.sub": "{doing} in progress · {pending} pending",
			"card.quote.title": "Daily Quote",
			"card.peak.title": "Peak Pricing",
			"card.peak.window1": "Morning 09:00–12:00",
			"card.peak.window2": "Afternoon 14:00–18:00",
			"card.heatmap.title": "Token Usage",
			"usage.title": "OpenCode Usage",
			"usage.totalKey": "All Keys",
			"usage.cycleHint": "Click to cycle: {chain}",
			"usage.resets": "Resets {date}",
			"usage.rolling": "Rolling",
			"usage.week": "Week",
			"usage.month": "Month",
			"config.quoteText": "Quote Text",
			"config.showTitle": "Show Title",
			"config.align": "Horizontal Align",
			"config.valign": "Vertical Position",
			"config.wrap": "Allow Wrap",
			"config.monthMode": "Window Alignment",
			"config.monthMode.rolling": "Rolling (today right)",
			"config.monthMode.quarter": "Quarter-aligned",
			"config.monthMode.rolling7": "Rolling (last 7 days)",
			"config.monthMode.weekly": "Weekly aligned",
			"config.timeZone": "Accounting Timezone",
			"config.timeZone.beijing": "Beijing (UTC+8)",
			"config.timeZone.local": "Follow system",
			"preview.quotePlaceholder": "(shown after you type a quote)"
		};
		let bound = null;
		let localeSubscribed = false;
		const localeListeners = /* @__PURE__ */ new Set();
		/** Feed the official locale service (called from apply). Registers both zh and
		*  en dictionaries for this namespace, then binds the translate function so
		*  `t()` resolves through the runtime's ACTIVE locale on every call. Returns a
		*  disposer that unregisters everything. */
		function installLocale(api) {
			const prev = bound;
			bound = null;
			const disposers = [];
			let unsub;
			if (api) {
				if (api.register) {
					try {
						disposers.push(api.register(NS, "zh", ZH));
					} catch {}
					try {
						disposers.push(api.register(NS, "en", EN));
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
			return interpolate((detectLocale() === "zh" ? ZH : EN)[key] ?? EN[key] ?? key, params);
		}
		//#endregion
		//#region src/client/widgets.ts
		/**
		* Harness Widgets — widget registry and formatting helpers.
		*
		* A widget is a small declarative descriptor: it knows its id, display name,
		* description, whether it is a built-in (system) component, and a pure
		* `render` that folds session stats into a small card shape. The rail and the
		* settings surfaces both consume this registry; nothing here touches React.
		*
		* All user-facing text goes through `t()` so a Settings → Language switch
		* re-renders every surface in the active locale without a reload. Name/desc/
		* labels are thunks re-evaluated at read time (see widgetName/widgetDesc).
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
		/** Resolve which key's usage a usage widget should currently show. */
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
		function usageRender(key, nameKey) {
			return (stats) => {
				const { data, mode } = usageView(stats);
				const u = data?.usage?.[key];
				const cycle = cycleFor(stats);
				if (!u) return {
					title: t(nameKey),
					value: "—",
					legend: modeLabel(mode),
					cycle
				};
				return {
					title: t(nameKey),
					value: `${u.percent}%`,
					legend: modeLabel(mode),
					sub: t("usage.resets", { date: String(u.resetsAt || "").slice(0, 10) }),
					cycle
				};
			};
		}
		/** OpenCode Go dosage as one bar chart across the three windows. */
		function usageBarsRender(stats) {
			const { data, mode } = usageView(stats);
			const u = data?.usage;
			const cycle = cycleFor(stats);
			if (!u) return {
				title: t("usage.title"),
				value: "—",
				legend: modeLabel(mode),
				cycle
			};
			const tone = (p) => p >= 95 ? "danger" : p >= 75 ? "warn" : "success";
			const bars = [
				{
					label: t("usage.rolling"),
					value: u.rolling.percent,
					ratio: u.rolling.percent / 100,
					tone: tone(u.rolling.percent)
				},
				{
					label: t("usage.week"),
					value: u.weekly.percent,
					ratio: u.weekly.percent / 100,
					tone: tone(u.weekly.percent)
				},
				{
					label: t("usage.month"),
					value: u.monthly.percent,
					ratio: u.monthly.percent / 100,
					tone: tone(u.monthly.percent)
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
		/** OpenCode Go dosage as three small donuts (one per window) — same data as the
		*  bars chart, circle form. Each ring shows its percent in the centre and the
		*  window label under it, coloured by the same urgency scale. */
		function usageRingsRender(stats) {
			const { data, mode } = usageView(stats);
			const u = data?.usage;
			const cycle = cycleFor(stats);
			if (!u) return {
				title: t("usage.title"),
				value: "—",
				legend: modeLabel(mode),
				cycle
			};
			const tone = (p) => p >= 95 ? "danger" : p >= 75 ? "warn" : "success";
			const mk = (label, p) => ({
				label,
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
						mk(t("usage.rolling"), u.rolling.percent),
						mk(t("usage.week"), u.weekly.percent),
						mk(t("usage.month"), u.monthly.percent)
					]
				},
				cycle
			};
		}
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
		*  a peak window is active (whole card glows red), CHEAP otherwise. The two
		*  windows live under the title; the active one lights up brand-blue. A preview
		*  can pass meta.sim = { peak: boolean, window?: 0|1 } to force either state. */
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
				alert: peak
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
		/** One-click compaction card: shows context usage percent (bottom-left) and a
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
		/** A quote card only renders content when the user typed a custom text — no
		*  default filler (which used to rotate on every render and re-render). */
		function quoteRender(stats) {
			const c = stats;
			const text = c.text;
			const showTitle = c.showTitle;
			const align = c.align;
			const valign = c.valign;
			const wrap = c.wrap;
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
		/** The complete widget registry. Grouping drives the component-market tabs:
		*  - 'system'      : every built-in widget (the old composer stats-line family
		*                    plus the other stock cards). There is no separate
		*                    install/uninstall — everything ships bundled, so the
		*                    market only ADDS instances to the rail.
		*  - 'opencode-go' : OpenCode Go usage quota cards.
		*  - 'coding-plan' : Token-usage heatmap + last-7-days bars. */
		const WIDGETS = [
			{
				id: "counts",
				group: "system",
				name: () => t("widget.counts.name"),
				desc: () => t("widget.counts.desc"),
				builtin: true,
				render: (s) => ({
					title: t("widget.counts.name"),
					value: t("card.counts.value", {
						turns: s.turns,
						steps: s.steps
					})
				})
			},
			{
				id: "llm",
				group: "system",
				name: () => t("widget.llm.name"),
				desc: () => t("widget.llm.desc"),
				builtin: true,
				render: (s) => s.llmMs > 0 ? {
					title: t("widget.llm.name"),
					value: fmtDuration(s.llmMs)
				} : null
			},
			{
				id: "tool",
				group: "system",
				name: () => t("widget.tool.name"),
				desc: () => t("widget.tool.desc"),
				builtin: true,
				render: (s) => s.toolMs > 0 ? {
					title: t("widget.tool.name"),
					value: fmtDuration(s.toolMs)
				} : null
			},
			{
				id: "ttft",
				group: "system",
				name: () => t("widget.ttft.name"),
				desc: () => t("widget.ttft.desc"),
				builtin: true,
				render: (s) => s.ttftSteps > 0 ? {
					title: t("widget.ttft.name"),
					value: fmtDuration(s.ttftMs / s.ttftSteps)
				} : null
			},
			{
				id: "tps",
				group: "system",
				name: () => t("widget.tps.name"),
				desc: () => t("widget.tps.desc"),
				builtin: true,
				render: (s) => s.decodeMs > 0 ? {
					title: t("widget.tps.name"),
					value: `${fmtTps(s.decodeTokens / (s.decodeMs / 1e3))} tok/s`
				} : null
			},
			{
				id: "cache",
				group: "system",
				name: () => t("widget.cache.name"),
				desc: () => t("widget.cache.desc"),
				builtin: true,
				render: (s) => s.usage && s.usage.inputTokens > 0 && s.usage.cacheReadTokens > 0 ? {
					title: t("widget.cache.name"),
					value: `${Math.round(s.usage.cacheReadTokens / s.usage.inputTokens * 100)}%`
				} : null
			},
			{
				id: "tokens",
				group: "system",
				name: () => t("widget.tokens.name"),
				desc: () => t("widget.tokens.desc"),
				builtin: true,
				render: (s) => s.usage && s.usage.inputTokens > 0 ? {
					title: t("widget.tokens.name"),
					value: `${fmtTokens(s.usage.inputTokens)} ${fmtTokens(s.usage.outputTokens || 0)}`
				} : null
			},
			{
				id: "context",
				group: "system",
				name: () => t("widget.context.name"),
				desc: () => t("widget.context.desc"),
				builtin: true,
				render: contextRender
			},
			{
				id: "context-water",
				group: "system",
				name: () => t("widget.context-water.name"),
				desc: () => t("widget.context-water.desc"),
				builtin: true,
				sizes: ["2x2", "2x4"],
				render: contextWaterRender
			},
			{
				id: "task",
				group: "system",
				name: () => t("widget.task.name"),
				desc: () => t("widget.task.desc"),
				builtin: true,
				render: taskRender
			},
			{
				id: "quote",
				group: "other",
				name: () => t("widget.quote.name"),
				desc: () => t("widget.quote.desc"),
				builtin: true,
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
				]
			},
			{
				id: "heatmap",
				group: "coding-plan",
				name: () => t("widget.heatmap.name"),
				desc: () => t("widget.heatmap.desc"),
				builtin: true,
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
				}]
			},
			{
				id: "heatmap-bars",
				group: "coding-plan",
				name: () => t("widget.heatmap-bars.name"),
				desc: () => t("widget.heatmap-bars.desc"),
				builtin: true,
				render: heatmapBarsRender,
				configSchema: [{
					key: "monthMode",
					label: () => t("config.monthMode"),
					type: "mode",
					default: "rolling",
					options: [["rolling", () => t("config.monthMode.rolling7")], ["weekly", () => t("config.monthMode.weekly")]]
				}]
			},
			{
				id: "usage-bars",
				group: "opencode-go",
				name: () => t("widget.usage-bars.name"),
				desc: () => t("widget.usage-bars.desc"),
				builtin: false,
				badgeLabel: () => t("badge.opencode"),
				render: usageBarsRender
			},
			{
				id: "usage-rings",
				group: "opencode-go",
				name: () => t("widget.usage-rings.name"),
				desc: () => t("widget.usage-rings.desc"),
				builtin: false,
				badgeLabel: () => t("badge.opencode"),
				render: usageRingsRender
			},
			{
				id: "usage-rolling",
				group: "opencode-go",
				name: () => t("widget.usage-rolling.name"),
				desc: () => t("widget.usage-rolling.desc"),
				builtin: false,
				badgeLabel: () => t("badge.opencode"),
				render: usageRender("rolling", "widget.usage-rolling.name")
			},
			{
				id: "usage-weekly",
				group: "opencode-go",
				name: () => t("widget.usage-weekly.name"),
				desc: () => t("widget.usage-weekly.desc"),
				builtin: false,
				badgeLabel: () => t("badge.opencode"),
				render: usageRender("weekly", "widget.usage-weekly.name")
			},
			{
				id: "usage-monthly",
				group: "opencode-go",
				name: () => t("widget.usage-monthly.name"),
				desc: () => t("widget.usage-monthly.desc"),
				builtin: false,
				badgeLabel: () => t("badge.opencode"),
				render: usageRender("monthly", "widget.usage-monthly.name")
			},
			{
				id: "peak-pricing",
				group: "pricing",
				name: () => t("widget.peak-pricing.name"),
				desc: () => t("widget.peak-pricing.desc"),
				builtin: false,
				badgeLabel: () => t("widget.peak-pricing.name"),
				simToggle: () => t("sim.peak"),
				render: peakPricingRender
			}
		];
		WIDGETS.map((w) => w.id);
		/** Every valid instance key (each widget at each of its supported sizes). */
		const ALL_INSTANCES = WIDGETS.flatMap((w) => sizesOf(w).map((s) => instanceKey(w.id, s)));
		/** The default installed set: the stats-line family at 2×2. */
		const DEFAULT_INSTALLED = [
			"counts",
			"llm",
			"tool",
			"ttft",
			"tps",
			"cache",
			"tokens"
		].map((id) => instanceKey(id, "2x2"));
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
					return react.createElement("div", {
						key: i,
						title: `${rg.label} ${Math.round(rg.value)}%`,
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
					})), react.createElement("div", { style: {
						fontSize: `${Math.round(11 * scale)}px`,
						fontWeight: 600,
						color: "var(--dsw-alias-label-primary)",
						fontVariantNumeric: "tabular-nums",
						lineHeight: 1
					} }, `${Math.round(rg.value)}%`));
				});
				return react.createElement("div", { style: {
					display: "flex",
					alignItems: "flex-end",
					gap: mg
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
			if (out.meter && out.meter.length) headEls.push(react.createElement("div", {
				key: "mt",
				className: "dsx-stats-card-meter",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 3,
					marginTop: `${Math.round(4 * scale)}px`
				}
			}, out.meter.map((m, i) => react.createElement("div", {
				key: i,
				style: {
					fontSize: `${m.active ? Math.round(12 * scale) : Math.round(10 * scale)}px`,
					fontWeight: m.active ? 600 : 500,
					color: m.active ? "var(--dsw-alias-state-business-primary)" : "var(--dsw-alias-label-tertiary)",
					lineHeight: 1.2,
					fontVariantNumeric: "tabular-nums",
					transition: "color 0.25s ease, font-size 0.25s ease, font-weight 0.25s ease"
				}
			}, m.label))));
			const head = headEls;
			const body = [];
			if (out.value != null && !out.headRight) body.push(react.createElement("div", {
				key: "v",
				className: "dsx-stats-card-value",
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
				className: "dsx-stats-card" + (out.alert ? " dsx-peak-alert" : "") + (cyclable ? pressed ? " dsx-cyclable dsx-cycle-pressed" : " dsx-cyclable" : ""),
				style: {
					position: "relative",
					width: `${boxW}px`,
					minHeight: `${unit}px`,
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
				const cur = previewSim;
				setPreviewSim(cur && typeof cur.peak === "boolean" ? {
					peak: !cur.peak,
					window: typeof cur.window === "number" ? cur.window : 0
				} : { peak: !peakStatusNow().peak });
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
				if (selWidget.id === "quote") {
					const rawText = selConfig.text;
					if (!rawText || !rawText.trim()) stats.text = t("preview.quotePlaceholder");
				}
				return selWidget.render(stats, {
					size: selSize,
					...previewSim ? { sim: previewSim } : {}
				});
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
			const GROUP_LABELS = {
				system: () => t("group.system"),
				"opencode-go": () => "OpenCode Go",
				"coding-plan": () => t("group.codingPlan"),
				pricing: () => t("group.pricing"),
				other: () => t("group.other")
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
				const previewStats = w && w.id === "quote" ? {
					...PREVIEW_STATS,
					text: t("market.previewText")
				} : PREVIEW_STATS;
				const out = w ? w.render(previewStats, {
					size: curSize,
					...previewSim ? { sim: previewSim } : {}
				}) : null;
				const toggleSim = () => {
					if (!widgetSimToggle(w)) return;
					const cur = previewSim;
					setPreviewSim(cur && typeof cur.peak === "boolean" ? {
						peak: !cur.peak,
						window: typeof cur.window === "number" ? cur.window : 0
					} : { peak: !peakStatusNow().peak });
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
				}, react.createElement("span", { className: "dsx-mhead" }, react.createElement("span", { className: "dsx-mname" }, GROUP_LABELS[groupOf(w)] ? GROUP_LABELS[groupOf(w)]() : widgetName(w)), react.createElement("span", { className: "dsx-badge" }, String(instanceCount))), react.createElement("span", { className: "dsx-mdesc" }, widgetDesc(w)), react.createElement("span", { className: "dsx-macts" }, react.createElement("span", { className: "dsx-btn" }, t("market.details")), react.createElement("span", { className: anyInstalled ? "dsx-btn dsx-btn-primary" : "dsx-btn" }, anyInstalled ? t("market.added") : t("market.add"))));
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
		* Harness Widgets — browser half entry.
		*
		* Registers the right-hand widget rail, the header capsule toggle, and the
		* two settings surfaces (General rows + the "组件" section). One shared bridge
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
		/** Default heatmap accounting timezone: Beijing (UTC+8). Configurable per
		*  heatmap card (cardConfigs.heatmap.timeZone); 'local' = browser clock. */
		const DEFAULT_TZ = "Asia/Shanghai";
		function dateKey(d, tz) {
			const tzName = tz || DEFAULT_TZ;
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
					const liveDays = [dateKey(/* @__PURE__ */ new Date())];
					for (const k of liveDays) if ((next[k] ?? 0) > 0) {
						delete next[k];
						repaired = true;
					}
					if (repaired) {
						saveHeatmap(next);
						saveSeen(/* @__PURE__ */ new Set(), 0);
					}
					localStorage.setItem(repairedKey, "1");
				}
				const tzResetKey = "harness-widgets.heatmap.today-reset-v1";
				if (!localStorage.getItem(tzResetKey)) {
					const tk = dateKey(/* @__PURE__ */ new Date());
					if ((next[tk] ?? 0) > 0) {
						delete next[tk];
						patched = true;
					}
					localStorage.setItem(tzResetKey, "1");
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
			columns: 2,
			hideStatsLine: false
		};
		/** Required services: the slot registry (React is a platform module). */
		const inject = ["slots"];
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
				const disposeLocale = installLocale(ctx.get("locale"));
				const disposeListener = onLocaleChange(() => {
					emit();
				});
				return () => {
					disposeLocale();
					disposeListener();
				};
			});
			try {
				migrateHeatmapV2();
			} catch {}
			let prefs = loadState();
			let state = {
				open: prefs.railOpen,
				hasSession: false,
				stats: null,
				usageData: null,
				usageMulti: null
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
			function measureRailTop() {
				const el = document.querySelector("[data-conversation-scroll]");
				const top = el ? el.getBoundingClientRect().top : 0;
				document.documentElement.style.setProperty("--dsx-rail-top", `${top + 12}px`);
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
				}, react.createElement("span", null, t("ui.capsule")));
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
					fetch("/api/opencode-usage-multi").then((r) => r.json()).then((data) => setState({ usageMulti: data })).catch(() => {});
				}, []);
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
					const seenState = loadSeen();
					const heatTz = prefs.cardConfigs?.heatmap?.timeZone || DEFAULT_TZ;
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
						setHeatmap(heatmapRef.current);
					}
					const current = usage ? inputTokens + outputTokens : 0;
					if (nodeUsageOk && usage && current > anchorRef.current) {
						anchorRef.current = current;
						saveHeatmapAnchor(current);
					}
					if (!nodeUsageOk && usage) {
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
						heatmapGrid: buildHeatmapGrid(heatmapRef.current, prefs.cardConfigs?.heatmap?.monthMode || "rolling", heatTz),
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
					prefs.cardConfigs?.heatmap?.monthMode,
					prefs.cardConfigs?.heatmap?.timeZone
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
				const cyclePool = (key) => (out) => {
					const modes = out.cycle?.modes ?? [];
					if (modes.length === 0) return;
					const current = out.cycle?.current ?? "total";
					const idx = modes.indexOf(current);
					const next = modes[(idx < 0 ? -1 : idx) + 1] ?? modes[0] ?? "total";
					setPrefs({ cardConfigs: {
						...prefs.cardConfigs,
						[key]: {
							...prefs.cardConfigs[key] ?? {},
							poolView: next
						}
					} });
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
				const [focusY, setFocusY] = react.useState(null);
				const [focusX, setFocusX] = react.useState(null);
				const [animPhase, setAnimPhase] = react.useState("idle");
				const animPhaseRef = react.useRef("idle");
				const phaseTimer = react.useRef(void 0);
				const schedulePhase = (next, afterMs) => {
					if (phaseTimer.current !== void 0) window.clearTimeout(phaseTimer.current);
					if (afterMs <= 0) {
						animPhaseRef.current = next;
						setAnimPhase(next);
						return;
					}
					animPhaseRef.current = next;
					setAnimPhase(next);
					phaseTimer.current = window.setTimeout(() => {
						phaseTimer.current = void 0;
						const final = next === "follow" ? armedRef.current ? "follow" : "shrink" : next;
						animPhaseRef.current = final;
						setAnimPhase(final);
					}, afterMs);
				};
				react.useEffect(() => () => {
					if (phaseTimer.current !== void 0) window.clearTimeout(phaseTimer.current);
				}, []);
				const [railScrollTop, setRailScrollTop] = react.useState(0);
				const cardElsRef = react.useRef([]);
				const armedRef = react.useRef(false);
				const lastClientXYRef = react.useRef(null);
				const contentYRef = react.useRef(null);
				const contentXRef = react.useRef(null);
				const rafRef = react.useRef(0);
				const railRectRef = react.useRef(null);
				/** True when the pointer lies inside any static card slot rect. */
				const hitTestCards = (clientX, clientY) => {
					for (const el of cardElsRef.current) {
						if (!el) continue;
						const r = el.getBoundingClientRect();
						if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
					}
					return false;
				};
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
					if (hitTestCards(clientX, clientY)) armedRef.current = true;
					if (!armedRef.current) return;
					if (rafRef.current) return;
					rafRef.current = requestAnimationFrame(() => {
						rafRef.current = 0;
						const x = contentXRef.current;
						const y = contentYRef.current;
						if (prefs.realTime && animPhaseRef.current !== "follow" && animPhaseRef.current !== "grow") {
							schedulePhase("grow", 0);
							schedulePhase("follow", 170);
						} else if (!prefs.realTime && animPhaseRef.current === "idle") {
							schedulePhase("grow", 0);
							schedulePhase("follow", 170);
						}
						setFocusX(x);
						setFocusY(y);
					});
				};
				const railScrollSync = (el) => {
					if (lastClientXYRef.current === null) return;
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
						setFocusY(null);
						setFocusX(null);
						armedRef.current = false;
						cardElsRef.current = [];
						animPhaseRef.current = "idle";
						setAnimPhase("idle");
						if (phaseTimer.current !== void 0) {
							window.clearTimeout(phaseTimer.current);
							phaseTimer.current = void 0;
						}
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
					...statsHeat?.heatmapGrid ? {} : { heatmapGrid: buildHeatmapGrid(fallbackRaw, prefs.cardConfigs?.heatmap?.monthMode || "rolling", prefs.cardConfigs?.heatmap?.timeZone || DEFAULT_TZ) }
				};
				const poolModes = (snap.usageMulti?.keys.length ?? 0) > 1 ? ["total", ...snap.usageMulti.keys.map((entry, i) => entry.label || `Key ${i + 1}`)] : void 0;
				const items = prefs.order.filter((id) => prefs.installed.indexOf(id) !== -1).map((key) => {
					const { widgetId, size } = parseInstanceKey(key);
					const w = WIDGETS.find((x) => x.id === widgetId);
					if (!w || sizesOf(w).indexOf(size) === -1) return null;
					const out = w.render({
						...base,
						usageData: snap.usageData,
						usageMulti: snap.usageMulti,
						poolModes,
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
				const engaged = focusX !== null && focusY !== null && armedRef.current;
				let scaleArr = new Array(n).fill(1);
				let rawX = 0;
				let rawY = 0;
				if (engaged) {
					rawX = (focusX ?? 0) - pad;
					rawY = focusY ?? 0;
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
				const focusLayout = placeCards(engaged ? scaleArr : new Array(n).fill(1));
				const deckBottom = staticLayout.reduce((m, c) => Math.max(m, c.top + c.h), 2);
				const addSlotFor = (layout) => {
					if (n === 0) return {
						top: 2 + pad,
						right: 0
					};
					if (multi) {
						const lastRow = rowIndexOf[n - 1];
						if (colIndexOf[n - 1] + spanOf(n - 1) < columns) {
							let sLeftmost = staticLayout[n - 1];
							for (let i = n - 2; i >= 0; i--) {
								if (rowIndexOf[i] !== lastRow) continue;
								if (staticLayout[i].right > sLeftmost.right) sLeftmost = staticLayout[i];
							}
							if (railW - 2 * pad - sLeftmost.right - sLeftmost.w - pad >= side) {
								let leftmost = layout[n - 1];
								for (let i = n - 2; i >= 0; i--) {
									if (rowIndexOf[i] !== lastRow) continue;
									if (layout[i].right > leftmost.right) leftmost = layout[i];
								}
								return {
									top: leftmost.top,
									right: leftmost.right + leftmost.w + pad
								};
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
				const focusedAdd = addSlotFor(focusLayout);
				const addCenter = {
					x: railW - 2 * pad - focusedAdd.right - side / 2,
					y: focusedAdd.top + side / 2
				};
				const addScale = engaged && n > 0 ? stepScale(Math.hypot(addCenter.x - rawX, addCenter.y - rawY) / (side + pad)) : 1;
				const magnifying = engaged && n > 0 && (scaleArr.some((s) => s > 1.001) || addScale > 1.001);
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
						transition: "opacity 0.15s ease",
						opacity: magnifying ? 0 : 1
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: slotStyle,
						ref: (el) => {
							cardElsRef.current[idx] = el;
						}
					}, react.createElement(CardBody, {
						out: it.out,
						unit: side,
						width: c.w,
						onAction: handleAction,
						onCycle: cyclePool(it.key)
					}), react.createElement("span", {
						className: "dsx-stats-resize",
						"aria-label": t("ui.rail.resizeAria"),
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
					"aria-label": t("ui.rail.addAria"),
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
				}))), react.createElement("span", { className: "dsx-stats-add-label" }, t("ui.rail.addLabel"))))];
				const rail = react.createElement("div", {
					className: "dsx-stats-rail",
					style: {
						position: "fixed",
						top: "var(--dsx-rail-top,0px)",
						right: "0px",
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
						armedRef.current = false;
						setFocusY(null);
						setFocusX(null);
						if (animPhaseRef.current !== "idle" && animPhaseRef.current !== "shrink") schedulePhase("shrink", 0);
						schedulePhase("idle", 200);
					},
					onMouseMove: (e) => moveRailFocus(e.clientX, e.clientY, e.currentTarget),
					onScroll: (e) => {
						setRailScrollTop(e.currentTarget.scrollTop);
						railScrollSync(e.currentTarget);
					}
				}, railChildren);
				const overlayTransition = !active || animPhase === "grow" || animPhase === "shrink" ? "top 0s, right 0s, width 0.15s var(--ds-ease-in-out), height 0.15s var(--ds-ease-in-out)" : "none";
				const magnifyLayer = react.createElement("div", {
					key: "__magnify",
					style: {
						position: "fixed",
						top: "calc(var(--dsx-rail-top,0px) - var(--dsx-rail-scroll,0px))",
						right: "0px",
						width: `${railW}px`,
						boxSizing: "border-box",
						padding: `4px ${pad}px ${pad}px ${pad}px`,
						pointerEvents: "none",
						zIndex: 25,
						overflow: "visible",
						background: "transparent",
						opacity: magnifying ? 1 : 0,
						transition: "opacity 0.15s ease",
						transform: "translateX(calc(var(--dsh-sidebar-width, 0px) * -1))"
					}
				}, react.createElement("div", {
					key: "__mdeck",
					style: {
						position: "relative",
						height: `${stackHeight}px`
					}
				}, focusLayout.map((c, idx) => {
					const it = items[idx];
					const slotStyle = {
						position: "absolute",
						top: `${c.top.toFixed(2)}px`,
						right: `${c.right.toFixed(2)}px`,
						width: `${c.w.toFixed(2)}px`,
						height: `${c.h.toFixed(2)}px`,
						transition: overlayTransition,
						zIndex: Math.round((c.s - 1) * 100)
					};
					return react.createElement("div", {
						key: it.w.id,
						className: "dsx-stats-card-slot",
						style: slotStyle
					}, magnifying ? react.createElement(CardBody, {
						out: it.out,
						unit: side * c.s,
						width: c.w,
						onAction: void 0
					}) : null);
				}), react.createElement("button", {
					key: "__add",
					type: "button",
					className: "dsx-stats-add",
					"aria-label": t("ui.rail.addAria"),
					tabIndex: -1,
					style: {
						position: "absolute",
						top: `${focusedAdd.top.toFixed(2)}px`,
						right: `${focusedAdd.right.toFixed(2)}px`,
						width: `${(side * addScale).toFixed(2)}px`,
						height: `${(side * addScale).toFixed(2)}px`,
						borderRadius: `${Math.round(addRadius * addScale)}px`,
						transition: overlayTransition,
						zIndex: 30
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
				})));
				return react.createElement(react.Fragment, null, rail, magnifyLayer, addPanel);
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
					scheduleMeasure();
				};
				const sub = subscribe(apply);
				apply();
				return () => {
					sub();
					document.body.classList.remove("dsx-stats-active");
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