# Screenshots

实拍/生成图目录，README 与插件市场展示使用。

| 文件名 | 来源 | 内容 |
| --- | --- | --- |
| `rail-widgets.png` | 实拍 | 右侧部件栏小部件展示 |
| `dock-magnify.png` | 实拍 | macOS Dock 式悬浮放大效果 |
| `add-panel.png` | 实拍 | 添加组件面板 |
| `widget-cards.png` | 生成 | 前五个部件卡片预览（由 `widget-cards-preview.html` 经 headless Edge 截图） |
| `widget-cards-preview.html` | 生成 | 复刻前五个部件卡片的独立 HTML（可用 Edge headless 重截：`msedge --headless=new --screenshot=widget-cards.png --window-size=900,260 widget-cards-preview.html`） |

## 插件市场（dsh-market）PR（可选）

若要控制展示的截图与顺序，向 dsh-market 仓库 `data/screenshots.json` 新增一条，**key 用本插件 GitHub 入口 URL**，图片用 `raw.githubusercontent.com` 直链：

```jsonc
"https://github.com/Physicolor/dsh-widgets": [
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/rail-widgets.png",
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/dock-magnify.png",
  "https://raw.githubusercontent.com/Physicolor/dsh-widgets/main/docs/screenshots/add-panel.png"
]
```

放 1–8 张；不提交 PR 时，市场也会自动从 README 抽图。
