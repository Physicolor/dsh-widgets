# Screenshots

占位：把实拍截图放到本目录，并用 README 顶部的名称命名（缺图时预览区块会挂空图）。

建议捕获清单（对应 README「📸 预览」）：

| 文件名 | 内容 | 建议尺寸 |
| --- | --- | --- |
| `rail-overview.png` | 右侧 rail 全貌（多卡片 + 品牌蓝标题） | 宽 ≥ 560px |
| `widget-task.png` | 任务卡片 |
| `widget-compact.png` | 一键压缩卡片（右下角品牌蓝圆钮） |
| `widget-context.png` | 上下文水位（矩形分段条） |
| `widget-heatmap.png` | 用量热度图 |
| `config-tab.png` | 设置 → 组件 → 某部件配置（含下拉选择器） |

截好图后：

1. 把 PNG 放回此目录；
2. 插件市场 PR（可选）：到 `dsh-market` 仓库，向 `data/screenshots.json` 新增一条，**key 用本插件的 GitHub 入口 URL**：

   ```jsonc
   "https://github.com/Physicolor/harness-widgets": [
     "https://raw.githubusercontent.com/Physicolor/harness-widgets/main/docs/screenshots/rail-overview.png",
     "https://raw.githubusercontent.com/Physicolor/harness-widgets/main/docs/screenshots/widget-heatmap.png",
     "https://raw.githubusercontent.com/Physicolor/harness-widgets/main/docs/screenshots/config-tab.png"
   ]
   ```

   放 1–8 张，都用 `raw.githubusercontent.com` 直链；顺序即展示顺序。

> 不提交此 PR 也可以：市场会自动从 README 抽图。提交 PR 只是让你控制截图的选取与顺序。
