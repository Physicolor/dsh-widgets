# FIX 2026-10-04 — 「组件区域在未激活状态下切换工作区对话后会自动显示在页面顶部」

车主报告（原始措辞，2026-10-04）：

> 组件区域在未激活状态下切换工作区对话后会自动显示在页面顶部，排查该问题并修复

补充事实（同日稍后，车主确认触发条件）：

> 未修复。仅切换对话，不移动鼠标指针，鼠标不停在右侧仍然稳定触发。已 Ctrl+R 触发弹窗警告后重启 dsh。

即：**与鼠标、悬浮、放大层完全无关**；触发行就是「切换对话」本身。此前几轮探针都在「组件栏已打开」的状态下测量，量错了对象。

---

## 1. 结论先行

**触发路径与 `--dsx-rail-top` 锚点无关。** 真正的链条是：

1. 组件区的「会话存在」信号来自 composer collector 的挂载 / 卸载（`src/client/index.ts` 的 `conversation.composer.dock` 注册）。
2. 切换对话时它有若干帧处于卸载状态 ⇒ `snap.hasSession` 短暂为 `false`。
3. `src/client/rail/rail-view.tsx` 的
   `keepMounted = retired && snap.hasSession && (everOpenRef.current || prewarm)`
   随之变为 `false`，下一行 `if (retired && !keepMounted) return null` 使**整棵抽屉被 React 卸载**。
4. `hasSession` 回来后是新实例：`everOpenRef` 重新为 `false`，`prewarm` 的 2.5s 定时器再把抽屉挂回来 ——
   挂回来的是一副**从未折叠过**的 deck：13 个槽位带着 inline `transform: none` 落在静止网格
   （x1257 / 1407 / 1557，y50 / 200 / … / 650）。
5. 它们之所以真的被画出来，是因为 `src/client/styles/rail.module.css` 里一条**刻意的**规则：

   ```css
   .dsx-wave-deck .dsx-stats-card-slot,
   .dsx-wave-deck .dsx-stats-add { visibility: visible }
   ```

   波峰覆盖层要静默换牌，所以必须显式声明；同处注释写明**刻意不用 `opacity: 0`**
   （实测每次进入多付 50–68ms 纯绘制停顿，style/layout 仅约 1ms）。
   而**子元素显式 `visibility: visible` 会压过祖先继承来的 `hidden`，与 `!important` 无关** ——
   于是卡片穿过 `hidden` 的 deck → rail → surface → drawer-zoom → drawer 一路画到会话上。

---

## 2. 修复（`src/client/styles/rail.module.css`，同文件末尾顺序更靠后的规则）

```css
.dsx-stats-drawer[data-retired] .dsx-stats-card-slot,
.dsx-stats-drawer[data-retired] .dsx-stats-add,
body.dsx-stats-no-session .dsx-stats-drawer .dsx-stats-card-slot,
body.dsx-stats-no-session .dsx-stats-drawer .dsx-stats-add { visibility: hidden !important }
```

语义边界：

- 抽屉 parking（`[data-retired]`）或会话消失（`body.dsx-stats-no-session`）时才收回那份显式 `visible`；
  正常开合与波峰换牌不受影响。
- 放大覆盖层被 `createPortal` 到 `<body>`，**不在** `.dsx-stats-drawer` 之下，因此悬浮换牌完全不受影响
  （`scripts/verify-rail-covered-hover.cjs` 仍全过）。
- 未改动：`data-dsx-overflow` 语义、`console.warn` 每次翻转一次的语义、
  组件栏 `transition: right` 不得改成 compositor transform。

---

## 3. 证据

### 3.1 复现（修复前）

| 探针 | 结果 |
| --- | --- |
| `scripts/.tmp-closed-switch.cjs --ws=Thesis` | 522 帧中 **390 帧**画出组件区；每帧约 110 个 `dsx-stats-card-slot@y50x1257 140x140 op1`；列 x1257/1407/1557、行 y50/200/350/500/650；`[anchor values] ["44px"]`、`[changes] 0` ⇒ **与锚点无关** |
| `scripts/.tmp-closed-rest.cjs` | 关闭态 `.dsx-stats-card-slot` 自身 `vis=visible`，其上**整整七层**祖先全是 `hidden`（deck / rail / surface / drawer-zoom / drawer）⇒ 泄漏口就是那份显式 `visible` |
| `scripts/.tmp-who-clears.cjs` | 包装 `CSSStyleDeclaration.prototype.transform` 的 setter 并给每个节点打标记：切换后 13 个槽位在同一时刻成批出生，`[transform writes on deck slots SINCE the switch] 0` ⇒ **不是谁清掉了折叠位移，是新节点从来没有过位移**（即整棵卸载后重挂载） |
| `scripts/.tmp-closed-anim.cjs` A/B | A（切换前）`slot0 box=[1966,25,70,70] onScreen=false`；B（切换后）`slot0 box=[1257,50,140,140] onScreen=true tr=none`。截图 `.probe-closed-anim/B-closed-after-switch.png`：右侧完整 11 张卡片可见 |

### 3.2 验证（修复后）

| 探针 | 结果 |
| --- | --- |
| `scripts/verify-closed-switch-leak.cjs`（新增，durable） | **519 帧全清白**：0 帧画出组件区、y<40 的 0 帧、无页面错误；并先断言「整段窗口内组件栏一次都没有被重新点亮」 |
| 同一判据的灵敏度核对 | 栏开着时它能看见 **13 个槽位 @ y50** ⇒ 不是「什么都看不见所以恒过」 |
| `scripts/.tmp-leak-negative.cjs`（负向对照，一次性） | 注入特异性更高的规则把修复压回去，同样流程立刻复现 **786 / 1053 帧泄漏**（`1257x50 140`、`1407x50 140`、`1557x50 140` …）⇒ 那个 0 真的是被这条 CSS 挡住的 |
| 人工截图 | `.probe-closed-switch-leak/after-switch.png`：切到 Thesis 会话后右侧整片空白（修复前同位置是完整 11 张卡片） |
| `scripts/verify-rail-hover-when-retired.cjs` | ALL PASS（retired 时悬浮不激活、指针带不被 drawer 命中、CONTROL 开栏时正常聚焦） |
| `scripts/verify-rail-covered-hover.cjs` | ALL PASS（放大覆盖层换牌不受影响） |
| `scripts/verify-rail-anchor-guard.cjs` | ALL CHECKS PASSED |
| `scripts/verify-swallow-20.cjs --session "修复侧边栏动画卡顿与覆盖效果"` | ALL CHECKS PASSED |
| `scripts/verify-rail-glow-clip.cjs` | ALL PASS |
| `scripts/verify-release-smoke.cjs --session "修复侧边栏动画卡顿与覆盖效果"` | ALL CHECKS PASSED |
| `verify-anim-curve-unit.mjs` / `verify-deck-cascade-unit.mjs` | ALL PASS |
| `pnpm run check` / `pnpm run build` | 绿；产物 `lib/client.js` 920884 B / sha256 `FBF0C856…`，`node --check` 通过 |
| 实际下发的 combo | `/plugins/??…dsh-widgets/client.js…` 200 / 4924629 B，`hasRetiredSlotGuard: true`、`hasNoSessionSlotGuard: true` |

### 3.3 判据教训（写进脚本注释，供以后复用）

- 元素自身的 `visibility: visible` / `opacity: 1` **不代表被画出来**：opacity 不继承，
  放大层是在**图层级**用 opacity 压掉自己的槽位子树。必须用
  `el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })`。
- 过滤条件若依赖「组件栏没被点亮」，就必须**先断言整段窗口它一次都没被点亮**，
  否则一旦它悄悄自己开回来，过滤条件会把要找的帧正好排除掉（本脚本原先就有这个洞）。
- 只测「栏已打开」的切换是**量错对象**：锚点在栏打开时一次都不重写（`.tmp-anchor-writer.cjs`
  同工作区 478 帧、跨工作区 585 帧，写入均为 0 次）。

---

## 4. 未做声称 / 残留

- **仍未改动 shell 一个字节**，全部修复落在插件内部。
- 抽屉在每次切换对话时仍会被卸载再重挂载（本修复只是让它不再**可见**）。
  那一次重挂载的 React 成本（历史记录约 285ms）不在本次范围内，也没有被声称改善。
- 此前那一轮的锚点兜底（`anchorPublished` 门、disposer 不再删变量、
  `html:not([style*='--dsx-rail-top'])` 三重选择器）保留，但它**不是**本次复现的触发路径；
  它关掉的是一条真实存在的静默失效路径。
- 「对话区域平移延迟 / 卡顿」依旧不被声称修复（主体在官方 shell 的 React 提交阶段）。
