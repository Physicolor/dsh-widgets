# FIX-2026-10-09 — 会话头长高后 `--dsx-rail-top` 不跟着走，组件区首行钻到顶部栏下面

车主报告（截图 2026-10-09）：展开组件区域时，展开再收起置顶摘要卡片后，鼠标悬浮在组件上方，
整个组件区**瞬间上移一小段**，**顶部组件盖过顶部栏上方**；该状态只能靠再次切换对话恢复。

## 根因（实测）

会话头**长高**（标题换行 / 出现「对话 · 轨迹」页签行）时，`--dsx-rail-top` 停在
**旧值**上，组件列首行因此位于不透明会话头下沿之上 —— 而会话头是 `z-index: 21` 的不透明白底，
rail 在 7：**画在上面的东西是被盖住，而不是被命中测试挡掉**（本仓库 measure.ts 里早就写过这一条）。

为什么会长高却不重测：`observeMeasured()` 观察的是
`[data-slot="conversation.session.header"]`，而那个节点是 **`display: contents`** ——
实测它的 `getBoundingClientRect().height` 恒为 **0**，而 ResizeObserver **永远不会为没有盒子的
目标回调**。于是真正有盒子的那个 header（实测高 50）无论怎么变高，都触发不了任何测量：

```
before: headerBottom(对话滚动区顶=会话头下沿)=50  slot headerH=0   railTop=44  首行=50   ← 一致、正确
车主截图：会话头下沿≈66-72（标题+页签行）而 railTop=44 ⇒ 首行 ≈45，被盖住约 20px
```

（不透明 header 的盒子：`[class$="_header"]`，实测高 50；slot 恒 0 —— 这就是"看不见的变化"。）

## 修法

`observeMeasured()` 的观察目标里加上**有盒子的那个 header** `[class$="_header"]`；同时新增一个
**shell 节点替换的再绑定**：MutationObserver 监听 body 的元素级增删（忽略流式转写产生的文本节点
churn，按帧合并），一旦 shell 换掉被观察节点就立刻 `observeMeasured() + scheduleMeasure()`。

## 验证

- `node scripts/verify-rail-hover-alignment.cjs` → **HOVER-ALIGNMENT: ALL PASS**（47 项，悬浮行映射与
  折叠锚点全绿）
- `tsdown` + `tsc --noEmit` 干净
- 跨插件断言（dsh-pinned-summary 的 `verify-yield-and-fold.cjs` 新增 H3b）：收起卡片后
  「首行不得高于会话头下沿」→ PASS（`first row 50 vs header bottom 50`，与设计一致：首行正好落在
  下沿）

## 限制

想在探针里模拟"会话头长高"没能成功（该 header 有固定高度，`padding` 不会把它撑高），所以这次
的验证是：机制由实测值证明（slot 盒子恒 0 ⇒ 不会回调）、观察目标已换成有盒子的节点、两套长期
断言全绿。若车主侧仍复现，需要他给出窗口宽度，再用"改标题让它换行"的真实路径复测。
