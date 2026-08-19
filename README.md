<h1 align="center">Harness Widgets</h1>

<p align="center">
  <strong>为 DeepSeek Harness 打造的美观、可扩展的右侧组件系统。</strong><br>
  多列网格布局 · 2×4 长方形组件 · 连续波峰悬浮放大 · 组件市场与实例管理<br>
  A beautiful, extensible widget system for DeepSeek Harness — multi-column grids, 2×4 tiles, continuous magnification, and a built-in component marketplace.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/harness-widgets?style=flat&label=latest%20release&color=4D6BFE" alt="Latest release">
  <img src="https://img.shields.io/npm/dt/harness-widgets?style=flat&label=total%20downloads&color=4D6BFE" alt="Total downloads">
  <a href="https://github.com/Physicolor/harness-widgets/stargazers"><img src="https://img.shields.io/github/stars/Physicolor/harness-widgets?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License">
  <img src="https://img.shields.io/badge/DSH%200.1.x-4493F8?style=flat-square" alt="Supported: DeepSeek Harness 0.1.x">
</p>

<p align="center">
  <img src="docs/screenshots/cover.jpeg" alt="Harness Widgets 预览" width="100%">
</p>

Harness Widgets 是一个基于 Cordis 的 DeepSeek Harness **持久 bundle 插件**。它在会话页右侧提供一套可定制的多列组件面板，实时展示对话洞察、用量监控与快捷工具，并通过声明式注册表支持无限扩展。

Harness Widgets is a **persistent DSH bundle plugin** built on the Cordis composition model. It provides a customizable multi-column widget rail on the right side of the conversation page — real-time session insights, usage monitoring, and quick actions — with an extensible declarative registry.

---

## 当前功能 · Features

### 多列网格布局 · Multi-Column Grid

| 项目 | 说明 |
| --- | --- |
| 列数 | 1 / 2 / 4 列可选（设置中下拉，默认 2 列） |
| 2×4 长方形组件 | 宽度为两个 2×2 加一个间距，与 2×2 同高；同一组件可同时以两种尺寸独立安装 |
| 无空隙排列 | 组件按格自动打包（best-fit），2×4 造成的空格由后续 2×2 回填，拖动排序始终无空洞 |
| 悬浮放大 | 多列网格同样支持，放大时行/列均按平面距离让位，间距恒定 |

### 连续波峰悬浮放大 · Continuous Magnification

macOS Dock 式悬浮放大，由离散阶梯升级为**连续指数衰减**：指针在 X/Y 平面运动时，波峰跟随平滑响应，四周所有组件（含上行下行）均参与，间距恒定，右侧不溢出。放大倍数可在设置中调节（`1.0–1.4`）。

### 内置部件 · Built-in Widgets

| 部件 | 说明 |
| --- | --- |
| 轮次·步数 | 会话轮次与步骤计数 |
| LLM / 工具时长 | 推理与调用累计耗时 |
| 首 token 延迟 | 平均 TTFT |
| 速率 | 解码吞吐（tok/s） |
| 缓存命中 | 输入缓存命中比例 |
| Tokens | 输入 / 输出 token 计数 |
| 上下文水位 | 系统/工具/消息三段占比条 + 明细；支持 2×2 与 2×4 两种尺寸 |
| 一键压缩 | 上下文占用百分比 + 右下角圆钮（双击执行 compact） |
| 任务 | 进行中 / 已完成 / 待办计数 |
| 用量热度图 | GitHub 式日历热力图，自记账每日用量 |
| 今日寄语 | 随机鼓励语录，可自定义文字/对齐/换行 |

### 组件市场 · Component Marketplace

- 展示全部组件（系统 + 外部），支持搜索、尺寸切换预览、按 `组件@尺寸` 独立安装；
- 已安装列表支持拖拽排序、配置编辑、`2×2 ↔ 2×4` 一键切换（自动去重，同组件同尺寸只保留一个）；
- 组件配置 tab 支持卡片级自定义（今日寄语、热度图窗口对齐等）。

### OpenCode Go 用量 · Usage Monitor

滚动 / 每周 / 每月三个用量窗口 + 百分比 + 重置时间。Host 半注册同源路由代理 `opencode.ai`，浏览器不发跨域请求，密钥走 DSH credentials。

---

## 工作原理 · Architecture

- **部件注册表**：`WIDGETS` 声明式描述符（id / 名称 / 尺寸 / 分组 / render），部件栏与设置页共用同一注册表，新增部件只需追加一条描述符；
- **数据收集器**：挂载在 `conversation.composer.dock` slot，该 slot 仅在活跃会话存在时渲染，天然充当「会话存在」信号；
- **Host 半**：`webServer` + `credentials` 两个服务，注册 `/api/opencode-usage` 同源代理路由；
- **可逆清理**：所有注册通过 fiber 的 effect 生命周期管理，卸载即恢复；
- **Slot 接入**：`shell.overlay`（面板）、`conversation.session.header.utilities`（胶囊开关）、`settings.section`（设置页）。

## 安装 · Installation

```sh
# 通过 npm（插件市场）
dsh plugin --profile web add harness-widgets

# 本地开发（link 方式）
dsh plugin --profile web add link:D:/dsh-home/plugins/harness-widgets
```

安装后**硬刷新浏览器**（Ctrl+Shift+R），在会话页头部点击「组件」胶囊即可展开右侧部件栏。OpenCode Go 部件需先在 Models 设置中配置 `OPENCODE_GO_API_KEY`。

## 开发 · Development

```sh
pnpm install
pnpm run build      # tsdown 构建 lib/
pnpm run check      # 类型检查 + 测试 + 构建
```

- `peerDependencies`：`@deepseek-ai/dsh-client-ui-slots`、`dsh-client-runtime`（由 DSH web profile 提供）；
- `cordis.patch.yml` 插入一行 `widgets` 行，host 半与浏览器半分别由 loader 与 client-modules 加载。

## 兼容性 · Compatibility

- DeepSeek Harness `0.1.0-rc.6` 及兼容的后续 `0.1.x`；
- 通过 `shell.overlay` / `conversation.session.header.utilities` / `conversation.composer.dock` / `settings.section` 等官方 slot 接入；
- 与 `dsh-better-sidebar` 右栏显式协调（共用 `--dsh-sidebar-width`），卸载后无残留。

## 变更日志 · Changelog

<details>
<summary>v0.3.0（当前）</summary>

**新增**
- 多列网格布局：1 / 2 / 4 列可选（默认 2 列），支持悬浮放大。
- 2×4 长方形组件：上下文水位 2×4 版（右上角百分比 + 延展分段条）；同一组件可同时安装 2×2 与 2×4。
- 组件市场含系统组件 + 按实例（`组件@尺寸`）独立安装；已安装与预览均支持 2×2 ↔ 2×4 切换（自动去重）。
- 连续波峰动画：悬浮放大由离散阶梯改为连续指数衰减，随指针 X/Y 平面运动平滑响应。
- 无空隙排列（best-fit 打包），任意拖动顺序均不产生空洞。

**修复**
- 2×4 卡片高度错误地用宽度填充导致异常占空。
- 切换尺寸时不再重复添加，删除不再牵连同名同尺寸实例。
- 悬浮动画在水平切换峰值时上下行不响应。

</details>

<details>
<summary>v0.2.2</summary>

- 修复今日用量跨天不重置（token 累计基准绑定日期，跨天自动清零）。

</details>

<details>
<summary>v0.2.1</summary>

- 修复热度图数值暴涨（记账基线持久化，重挂载只计入真正新增量）。
- 修复种子升级不生效（强制覆盖，版本升至 .3）。

</details>

<details>
<summary>v0.2.0</summary>

- macOS Dock 式悬浮放大（离散阶梯 + 布局换位）。
- 卡片级配置：今日寄语文字/对齐/换行、热度图窗口对齐方式。
- 新增部件：任务、一键压缩、上下文水位、用量热度图（自记账）、今日寄语。
- 品牌蓝标题、一键压缩按钮移至右下角。

</details>

<details>
<summary>v0.1.1</summary>

- 部件栏背景透明、隐藏滚动条（跨浏览器）、取消上内边距。

</details>

<details>
<summary>v0.1.0</summary>

- 右侧部件栏 + 7 个内置统计部件 + 3 个 OpenCode Go 用量部件；
- 设置 → 组件页（预览/安装/排序）；
- 进行中回合 LLM/工具时长每秒增量刷新。

</details>

## 路线图 · Roadmap

部件注册表（`WIDGETS` 描述符）已为更多部件打好框架——新增部件只需追加一条描述符。

- **多平台用量部件**：Z.ai、DeepSeek 余额等，沿用 host 同源代理 + credentials 模式；
- **实用工具部件**：一键 compact（需接入 DSH 官方 compaction 能力）等；
- **外部接口集成**：飞书、微信等推送/交互，密钥严格走 DSH credentials；
- **部件市场**：开放第三方部件注册机制，让社区部件像插件一样入驻。

## License

[MIT](LICENSE)
