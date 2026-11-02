# 参与 dsh-widgets

这个仓库围绕一件事构建：**一张卡就是一个独立单元**——一个目录、一个 manifest、一个
render 函数——所以绝大多数贡献都不需要碰共享文件。

## 五分钟加一张卡

新卡就是 `src/widgets/` 下的一个目录：

```sh
mkdir src/widgets/my-widget
cp src/widgets-template/template/manifest.json src/widgets/my-widget/
cp src/widgets-template/template/index.ts   src/widgets/my-widget/
# 改这两个文件：目录名 === manifest.id === index.ts 里的 `id: 'my-widget'`
pnpm gen:registry
pnpm run build
pnpm test
```

完整契约（manifest 字段、`source` / `skeleton`、标题规则、尺寸公式）见
[`src/widgets-template/README.md`](src/widgets-template/README.md)；正式生产流程见
[`docs/workflow/README.md`](docs/workflow/README.md)。

**不要**为了加一张卡去改 `src/client/index.ts`、`lib/registry.ts`、
`src/client/data/collector.tsx` 或 `generated.registry.ts`——注册表由生成器产出，
改共享文件正是两份贡献开始互相踩踏的方式。

## 卡片放在自己的插件里

如果这张卡不该合进本仓库，可以做成运行时单元：`registerExternalUnit()` 用同一份规则
清单，离线审核门是

```sh
node scripts/validate-external-unit.mjs <unit-dir>
```

见 [`docs/workflow/10-third-party-units.md`](docs/workflow/10-third-party-units.md)。

## 开 PR 之前

```sh
pnpm check          # 注册表校验 + tsc，0 错
pnpm run build      # CSS 闸门读构建产物，必须先构建
pnpm test           # 全部离线闸门（G1–G14），必须全绿
```

- **改行为就要配闸门。** 如果修的是产品依赖的规则，加一个小的离线检查
  （`scripts/verify-*.mjs`）并注册进 `scripts/gates.mjs`；浏览器探针不进 CI。
- **改 CSS 要有意刷新基线**：`node scripts/extract-css.mjs --write`，并把重新生成的
  `docs/architecture/baseline/css.json` 一起提交。
- **只用主题 token**——不要写死颜色、圆角或阴影，用 `--dsw-alias-*` / `--ds-*`
  变量，卡片才会跟随应用主题。
- **文案中英同步**（`zh` + `en`），并且用界面里对同一个东西的叫法。单元自己的文案写进
  该单元的 `manifest.locale`，不要写进 `src/client/i18n.ts`。
- **一个 PR 只做一件事。** 渲染改动和设置页重设计混在同一个 diff 里，两边背后的
  实测都读不出来。

## 反馈

- 数字不对、卡片卡住、控制台报错 → 用 **Bug report**（附 DSH 版本、插件版本、系统，
  以及卡片当时显示的内容）。
- 想要一张新卡 → 用 **Widget idea**（说明它读什么数据、为什么值得放在对话旁边）。
- 安全问题：不要开公开 issue，请用仓库的私密漏洞报告。

## 行为准则

具体、友善。批评测量，不批评人。中英文都欢迎；README 本身就是双语的。
