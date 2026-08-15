# Harness Widgets

> DeepSeek Harness Web UI 右侧部件栏：把会话统计以美观的小组件形式利用右侧空间呈现，并逐步扩展——更多平台的用量查询部件、更强的视觉表现（图片/定制图标）、更多实用工具（如一键 compact），乃至飞书、微信等外部接口集成。

Harness Widgets 是一个 **client 为主、带少量 host 代理** 的 DSH bundle 插件。它在会话页右侧提供一套可定制的部件面板，实时展示当前对话的轮次/耗时/速率/token 用量，以及 OpenCode Go 订阅套餐用量。

当前版本：**v0.1.1**（持续迭代中）

---

## ✨ 当前功能

### 1. 右侧部件栏

- 会话页右侧固定面板，随会话头对齐；**与 dsh-better-sidebar 的右栏并排**（锚定 `--dsh-sidebar-width`，侧边栏展开/收起时同步滑动，互不遮挡）；
- 会话页头部新增"组件"胶囊开关（`conversation.session.header.utilities` slot），激活态为品牌蓝底白字；
- 卡片可**拖拽调整大小**（100–220px），仅在有活跃会话时显示，无会话时自动隐藏；开关状态随 localStorage 持久化，刷新后保持展开；
- 面板背景**透明**、隐藏滚动条（Chromium/Edge/Safari 走 `::-webkit-scrollbar`，Firefox 走 `scrollbar-width: none`），首张卡片顶对齐会话头、无上内边距。

### 2. 实时会话统计（内置 7 个系统部件）

| 部件 | 内容 |
| --- | --- |
| 轮次·步数 | 本轮会话的轮次与步骤计数 |
| LLM 时长 | 模型推理累计耗时 |
| 工具调用 | 工具调用累计耗时 |
| 首 token 平均 | 平均首 token 延迟 |
| 速率 | 解码吞吐（tok/s） |
| 缓存命中 | 输入缓存命中比例 |
| Tokens | 输入 / 输出 token 计数 |

- 数据来自官方 `sessionStats` / `tokenUsage` 投影 + 会话 timeline 折叠，**进行中的回合每秒增量刷新**（1s tick），不是等回合结束才更新。

### 3. OpenCode Go 套餐用量（3 个外部部件）

- 滚动 / 每周 / 每月三个用量窗口 + 百分比 + 重置时间；
- **host 半**注册同源路由 `/api/opencode-usage`，代理 `https://opencode.ai/zen/go/v1/usage`——浏览器不发跨域请求，API 密钥**不出浏览器**；
- 密钥走 DSH credentials 缝（`OPENCODE_GO_API_KEY`，与 Models 设置页配置的 opencode-go provider 是同一把），每次请求时解析，不落盘。

### 4. 设置 → 组件 页 + 通用设置行

- 部件**预览 / 安装与卸载**（系统部件 vs OpenCode Go 部件分组展示）；
- **拖拽排序**、卡片大小、面板内边距；
- 全部偏好持久化在 localStorage，刷新保留。

## 🔧 工作原理

- **部件注册表**：`WIDGETS` 是一组声明式描述符（id / 名称 / 说明 / 是否内置 / 分组 / 纯函数 `render`），部件栏与设置页共用同一注册表——**新增部件只需追加一条描述符**；
- **数据收集器**：挂载在 `conversation.composer.dock` slot，该 slot 仅在活跃会话存在时渲染，天然充当"会话存在"信号；
- **host 半**：`webServer` + `credentials` 两个服务，注册 `/api/opencode-usage` 同源代理路由；
- **可逆清理**：所有注册（rail/开关/collector/设置面）都通过 fiber 的 effect 生命周期管理，卸载即恢复。

## 🚀 安装

```sh
# 发布到 npm / 插件市场后
dsh plugin --profile web add harness-widgets

# 本地开发（link 方式）
dsh plugin --profile web add link:D:/dsh-home/plugins/harness-widgets
```

装完**硬刷新浏览器**（Ctrl+Shift+R），在会话页头部点击"组件"胶囊即可展开右侧部件栏；OpenCode Go 部件需先在 Models 设置中配置 `OPENCODE_GO_API_KEY`。

## 📝 变更日志

> 每次发布都在此记录：本次做了什么，以及接下来打算做什么。

### v0.1.1（当前）

**本次改动**

- 部件栏背景改为**透明**（原先为 `--dsw-alias-bg-base` 实色底，会在页面上显出一条白板边界）；
- **隐藏右侧滚动条**（跨浏览器：Chromium/Edge/Safari 用 `::-webkit-scrollbar`，Firefox 用 `@supports` 门控的 `scrollbar-width: none`，旧 Edge 用 `-ms-overflow-style`），滚动功能保留；
- **取消上内边距**：首张卡片顶对齐会话头底边，不再在顶部留 24px 空隙。

### v0.1.0（初始发布）

- 右侧部件栏 + 7 个内置统计部件 + 3 个 OpenCode Go 用量部件；
- 设置 → 组件 页（预览/安装/排序）+ 通用设置行（内边距/卡片边长）；
- 进行中回合的 LLM/工具时长每秒增量刷新；与 dsh-better-sidebar 并排避让。

## 🗺️ 接下来目标

部件注册表（`WIDGETS` 描述符）已经为"更多部件"打好框架——新增部件只需追加一条描述符。按以下方向推进（均尚未实现，正在开发中）：

- **阶段一 · 多平台用量部件**：在 OpenCode Go 之外引入更多平台的用量/配额查询部件（如 Z.ai、DeepSeek 余额等），沿用 host 同源代理 + credentials 的模式；
- **阶段二 · 视觉表现升级**：为部件引入图片/定制图标、更精致的信息排版，让右侧面板不只是数字堆叠；
- **阶段三 · 实用工具部件**：在信息展示之外加入可操作工具，如**一键 compact**（需接入 DSH 官方 compaction 能力）等；
- **阶段四 · 外部接口集成**：集成飞书、微信等外部渠道（推送/交互），密钥严格走 DSH credentials 缝、不出浏览器（与现有 OpenCode Go 代理同一安全模型）；
- **阶段五 · 部件市场**：开放第三方部件注册机制（部件清单 / 远端部件源 / 一键安装），让社区部件像插件一样入驻部件栏。

## 🛠️ 开发

```sh
pnpm install
pnpm run build      # tsdown 构建 lib/
pnpm run check      # 类型检查 + 测试 + 构建
```

- 官方包以 `peerDependencies` 声明（`@deepseek-ai/dsh-client-ui-slots`、`dsh-client-runtime`），由 DSH web profile 提供；
- `cordis.patch.yml` 插入一行 `widgets` 行，host 半与浏览器半分别由 loader 与 client-modules 加载。

## ✅ 兼容性

- DSH `0.1.0-rc.6` 及兼容的后续 `0.1.x`；
- 通过 `shell.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section` 等官方 slot 接入；
- 与 dsh-better-sidebar 右栏显式协调（共用 `--dsh-sidebar-width`），卸载后无残留。

## 📄 License

MIT
