# DSH 客户端可读 session 投影调研（PROJECTIONS-AUDIT）

调研日期：2026-09-28
调研对象：`@deepseek-ai/dsh-*`（npx 缓存 `C:\Users\12404\AppData\Local\npm-cache\_npx\c40503fdf38a82ea\node_modules\@deepseek-ai\`，240 个包）
性质：**只读调研**。本文件是唯一产出，未修改任何源码。
版本基线：所有 `dsh-*` 包均为 `0.1.5-rc.2`（`dsh-web-app/package.json`）。

> 路径约定：下文 `PKG/...` 一律指上述 `@deepseek-ai` 目录下的相对路径。
> 已被 dsh-widgets 使用的 key（`sessionStats` / `tokenUsage` / `contextPressure` / `contextBreakdown` / `todos`）**不在 §1 展开**，只在 §2 与去重对比中列出。

---

## §0 结论速览

### 0.1 本次点名的 12 项

| key | 可读? | 默认 web 加载? | 一句话形状 | 能撑 150px 卡片? |
|---|---|---|---|---|
| `subagentCatalog` | 是 | 是（base `subagent` 行） | `SubagentCatalogEntry[]`：`{id, createdAt, mode, label?}`，**没有 token / 状态 / 时长** | 可以（N 个子代理 + label + 一行 lineage） |
| `subagentTiming` | 是，但**语义是「本 session 自己作为子代理时的活跃时长」** | 是（同一 `subagent` 行） | `{settledMs:number, active?:{since,through}}`，全 epoch ms | 单独太薄；与 `subagentCatalog` 组合才值钱 |
| `modelSelection` | 是 | 是（web-app `session-controller` 行） | `{lastUsed: Sel\|null, next: Sel\|null}`，`Sel={provider,model,reasoningEffort?}` | 可以（provider/model 一行 + effort 徽标） |
| `goal` | 是 | 是（base `goal` 行） | `GoalProjection \| null` | 可以（objective + phase + rounds/max） |
| `plan` | 是 | **仅当 session 用的 preset 挂了它**（web-app 显式 disable，standard preset 再挂） | `{active:boolean, pending:boolean}` | 太薄，不如并进别的卡片 |
| `permissions` | 是 | 是（base `permission` 行） | `{options: PresetOption[], currentValue: string}` | 可以（当前档 + description） |
| `sandboxMode` | **否**（host-only，无 `wire`） | 注册了但不是 client-visible | `SandboxMode \| null` | 否 |
| `llmRetry` | **否**（仅 `SessionProjectionStateMap`） | 注册了但不是 client-visible | `Record<string,{retry,retryId}>` | 否 |
| `schedule` | 是 | **否**（整套 default web 组合里没有任何 `dsh-schedule` 行；`ui-schedule` 还 `disabled: true`） | `readonly ScheduleRecord[]`（`{id,kind,prompt,afterSeconds\|everySeconds\|—,scheduledAt:string}`） | 有数据时很好（倒计时 + prompt 摘要） |
| `compaction` | **不适用** | — | **不是投影**：`dsh-tool-cordis` 里的 cordis **服务** key | 否 |
| `toolResultPruner` | **不适用** | — | **不是投影**：同上（服务 key） | 否 |
| `jobsBySession` | 是，但**不是投影** | 是 | `Readonly<Record<SessionId, readonly SessionJob[]>>`，走 slot prop `useSessions` | **最好**（状态点 + label + 实时时长） |

### 0.2 额外发现（值得做卡片的新可读项）

| key | 可读? | 默认加载? | 形状 | 150px? |
|---|---|---|---|---|
| `jobsBySession`（非投影，`useSessions`） | 是 | 是 | `SessionJob[]` | **推荐 #1** |
| `subagentCatalog` + `byId[].projectionValues.subagentTiming` | 是 | 是 | 目录 + 活跃时长 | **推荐 #2** |
| `turnOutline` | 是 | 是（web-app `session-turn-outline` 行） | `readonly TurnOutlineEntry[]`（turn/seq/prompt/response 预览） | **推荐 #3** |
| `permissions` | 是 | 是 | 见上 | 可 |
| `title` | 是 | 是 | `string \| null` | 只够一行 |
| `agentPreset` | 是 | 是（web-app `agent-presets` 行） | `string \| null` | 只够一行 |
| `sessionListMetadata` | 是 | 是 | `{blank:boolean, lastPromptAt:number\|null}` | 只够一行 |
| `inbox` | 是 | 是（base `agent` 行） | `{next-turn: JsonValue[], next-step: JsonValue[]}`，元素是**明文 JSON 事件载荷** | 可（排队数），内容不宜渲染 |
| `imageLimits` | 是 | 是 | 6 个数字 + mediaTypes | 配置类，不像卡片 |
| `subagent` | 是 | 是 | `{mode,label,seq} \| null` | 太薄 |

**另有 7 个 key 是 host-only（客户端读不到，不用考虑）**：`turnBoundary`、`sandboxMode`、`llmRetry`、`titleInput`、`timeContext`、`tmuxContext`、`subagentModelSelectionPolicy` —— 全名单与证据见 §2.3。

---

## §1 逐项详述

### 1.1 `subagentCatalog`

**声明**：`dsh-subagent/lib/types/projection-types.d.ts:57-59`

```ts
// PKG/dsh-subagent/lib/types/projection-types.d.ts:8-17
/** One current direct-child discovery row materialized from parent facts. */
export type SubagentCatalogEntry = {
    readonly id: SessionId;
    readonly createdAt: number;
} & ({
    readonly mode: 'one-shot';
    readonly label?: string;
} | {
    readonly mode: 'continuable';
    readonly label: string;
});
```

```ts
// PKG/dsh-subagent/lib/types/projection-types.d.ts:57-59
interface SessionProjectionMap {
    /** Direct children in parent catalog event order, excluding fork-inherited facts. */
    subagentCatalog: SubagentCatalogEntry[];
```

**view 返回什么**：就是上面的 `SubagentCatalogEntry[]`，`view = subagentCatalogEntries`，字面证据：

```ts
// PKG/dsh-subagent/lib/types/catalog.d.ts:50-62
export declare const subagentCatalogProjectionDefinition: {
    key: "subagentCatalog";
    stateSchema: z.ZodType<SubagentCatalogState, unknown, ...>;
    init: (_header, inheritedEventCount) => { inheritedEventCount };
    apply: (state, event) => SubagentCatalogState;
    stateVersion: number;
    wire: {
        viewSchema: z.ZodType<SubagentCatalogEntry[], ...>;
        view: typeof subagentCatalogEntries;      // ← 就是 SubagentCatalogEntry[]
    };
};
```

**有没有 token / 状态 / 时长？** 都没有。逐字段核对：

- `id`：`SessionId`（branded string）
- `createdAt`：number，单位**Unix epoch 毫秒** —— 来源是 `SessionHeader.createdAt`：
  `PKG/dsh-session/lib/types/types.d.ts:66-67`「Non-negative safe-integer Unix epoch milliseconds when the session was created.」
- `mode`：`'one-shot' | 'continuable'`
- `label?`：string（one-shot 可缺，continuable 必有）

**没有** token 用量、**没有** running/status 字段、**没有** duration。折叠源只有 `subagent/catalog` 事件（parent-owned）：

```ts
// PKG/dsh-subagent/lib/types/catalog.d.ts:13-23
export type SubagentCatalogEvent = {
    readonly version: 0;
    readonly childId: SessionId;
    readonly childCreatedAt: number;
} & ({ mode: 'one-shot'; label?: string } | { mode: 'continuable'; label: string });
```

**配套的 `subagentTiming` 存在，但不在同一个 session 上**（见 1.2）。这是本项最大的坑。

**第三方怎么读**：`useProjection('subagentCatalog')`（在**父** session 作用域）。
官方没有客户端包用这个 key（`grep -r "subagentCatalog" --include=*.js` 在各 `dsh-client-ui-*` 里 0 命中）；官方 `ui-subagent` 走的是 `useSessions(s => s.subagentsByParent)`（`PKG/dsh-client-ui-subagent/lib/client.js:411`）。所以 `subagentCatalog` 是**首个官方无人消费但已上线的 client-visible 投影**，正好留给第三方。

**替代读法（更丰富，见 §3.2）**：`useSessions(s => s.subagentsByParent[parentId])` → `SubagentCatalogSnapshot`，其 `entries: SubagentListEntry[]` 额外带 `activity: 'running'|'inactive'` 与 `hasChildren`：

```ts
// PKG/dsh-subagent/lib/types/control-types.d.ts:30-55（节选）
export type SubagentListEntry = {
    readonly kind: 'child';
    readonly id: SessionId;
    readonly activity: 'running' | 'inactive';
    readonly hasChildren: boolean;
} & ({ readonly mode: 'one-shot'; readonly label?: string }
   | { readonly mode: 'continuable'; readonly label: string })
  | { readonly kind: 'diagnostic'; readonly id: SessionId;
      readonly reason: 'corrupt' | 'unsupported' | 'unavailable'; };
```

### 1.2 `subagentTiming`（+ `subagent`）

```ts
// PKG/dsh-subagent/lib/types/projection-types.d.ts:19-29
export interface SubagentTimingProjection {
    /** Milliseconds accumulated across completed turns after the child's own descriptor. */
    settledMs: number;
    /** Same-cut bounds of the currently open turn, when one has not reached `turn/end`. */
    active?: {
        /** Start of the open turn. */
        since: number;
        /** Latest event time folded into this projection cut. */
        through: number;
    };
}
```

```ts
// PKG/dsh-subagent/lib/types/projection-types.d.ts:60-61
/** Active-turn duration for a descriptor-backed subagent session. */
subagentTiming: SubagentTimingProjection;
```

**语义（关键）**：折叠的是 `subagent/descriptor` **之后**该 child 自己日志里的 turn 边界（`PKG/dsh-subagent/lib/types/projection.d.ts:30-37`）。也就是说：

- `useProjection('subagentTiming')` 在**父**作用域拿到的是**父自己作为子代理时**的时长 —— 对上层的子代理**不可见**。
- 想拿某个 child 的时长，必须去 **child 的 projection store**。第三方可行的两条路：
  1. `useSessions(s => s.byId[childId]?.projectionValues?.subagentTiming)` —— 列表行自带投影值。官方就是这么做的：
     `PKG/dsh-client-ui-subagent/lib/client.js:106-113`
     ```js
     function activityDuration(summary, activity, now) {
       const timing = summary.projectionValues?.subagentTiming;
       if (timing === void 0) return void 0;
       if (timing.active === void 0) return timing.settledMs;
       const end = activity === "running" ? now : timing.active.through;
       return timing.settledMs + Math.max(0, end - timing.active.since);
     }
     ```
     列表行的 `projectionValues` 由 manager 填：`PKG/dsh-api-session-controller/lib/client.js:2896-2900`、`:3374`；类型在 `PKG/dsh-api-session-controller/lib/types/client/sessions/lineage.d.ts:22-23`。
  2. `ctx.get('sessions').binding(childId)?.session.projections.faceOf('subagentTiming')` —— 只有在 child 已被 materialize 成 scope 时才有（`PKG/dsh-api-session-controller/lib/types/client/sessions/service.d.ts:307-312`：`binding(id)` 对既不在 list 也未 scoped 的 session 返回 `undefined`）。

**时间戳单位**：`settledMs` 是毫秒（注释原文）；`since` / `through` 是事件时间，同一份类型的注释是「Unix epoch milliseconds」（`PKG/dsh-session/lib/types/types.d.ts:465-466`）。

**`subagent`（identity）**：

```ts
// PKG/dsh-subagent/lib/types/projection-types.d.ts:36-55
export type SubagentIdentityProjection = {
    mode: 'one-shot'; label?: string; seq: SessionSeq;
} | {
    mode: 'continuable'; label: string; seq: SessionSeq;
};
// :71  subagent: SubagentIdentityProjection | null;
```

`null` ⟺ 无有效 descriptor（缺失/畸形/不识别版本，故意不区分）。同样是 **child 自己的**投影。

### 1.3 `modelSelection`

```ts
// PKG/dsh-api-session-controller/lib/types/types.d.ts:76-95
export interface ModelSelection {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
}
export interface ModelSelectionProjection {
    /** Selection consumed by the latest recorded model request. */
    readonly lastUsed: ModelSelection | null;
    /** Selection the next request should use, falling back to {@link lastUsed}. */
    readonly next: ModelSelection | null;
}
```

```ts
// PKG/dsh-api-session-controller/lib/types/types.d.ts:20-27
interface SessionProjectionMap {
    sessionListMetadata: SessionListMetadata;
    imageLimits: ImageAttachmentLimits;
    modelSelection: ModelSelectionProjection;
}
```

**view**：`state => ({ lastUsed: state.lastUsed, next: state.pending ?? state.lastUsed })`
—— `PKG/dsh-api-session-controller/lib/types/model-selection-projection.js:42-52`；注册入口 `installModelSelectionProjection(ctx)`（同文件 `:63-65`），宿主调用点 `PKG/dsh-api-session-controller/lib/index.js:2727`。

注意一个语义细节：`wire` 的 `next` 字段来自 state 的 `pending`。所以 `next !== lastUsed` ⟺ 用户改了模型但还没发请求。

**官方消费**：`PKG/dsh-client-ui-model-selection/lib/client.js:305` 用 `binding.session.projections.faceOf("modelSelection")` 喂 `ModelDirectory`。

### 1.4 `goal`

```ts
// PKG/dsh-goal/lib/types/types.d.ts:90-99
export interface GoalProjection {
    /** Current durable goal snapshot (the CAS ref for mutations rides on it). */
    readonly goal: GoalSnapshot;
    /** Highest admitted round number for this goal. */
    readonly roundsStarted: number;
    /** Epoch milliseconds of the create mutation. */
    readonly createdAt: number;
    /** Epoch milliseconds of the latest mutation. */
    readonly updatedAt: number;
}
// PKG/dsh-goal/lib/types/types.d.ts:47-56
export interface GoalSnapshot extends GoalRef {
    readonly objective: string;
    readonly phase: GoalPhase;              // 'active' | 'paused' | 'blocked' | 'complete'
    readonly blockedReason?: GoalBlockReason;  // {code, message}
    readonly maxGoalRounds: number;
}
// PKG/dsh-goal/lib/types/types.d.ts:113-120
interface SessionProjectionMap {
    goal: GoalProjection | null;            // null = 未创建或已 clear
}
```

**时间戳单位**：`createdAt` / `updatedAt` 都是 **epoch 毫秒**（注释原文）。
`activation: 'armed'|'disarmed'` 是 process-local，**故意不在投影里**（`types.d.ts:84-89`）。

**官方消费**：`PKG/dsh-client-ui-goal/lib/client.js:535`、`:559`（`faceOf("goal")`）；`ui-conversation` 用 `useProjection("goal", g => g != null)` 判有无（`PKG/dsh-client-ui-conversation/lib/client.js:15816`）。

### 1.5 `plan`

```ts
// PKG/dsh-plan-mode/lib/types/types.d.ts:19-22
export interface PlanProjection {
    active: boolean;
    pending: boolean;
}
// :42-45  plan: PlanProjection;
```

`active` = 日志里在force的状态（最后一次 `plan/mode`，之前为 inactive）；`pending` = 有一次 `/plan` 选择指向与 `active` 不同的状态且尚未落地。**能力缺席 = key 缺席，而不是某个值**（`:16-17`）。**没有任何时间戳、没有 plan 文本**（计划正文只在 `exit_plan_mode` 的工具调用里，不属于该投影）。

**官方消费**：`PKG/dsh-client-ui-conversation/lib/client.js:15815`（`useProjection("plan", ...)`）、`PKG/dsh-client-ui-plan` 的 `PlanChip`。

**默认加载：仅 preset 层**。见 §0 与 §4.2。

### 1.6 `permissions`

```ts
// PKG/dsh-permission-presets/lib/types/types.d.ts:12-30
export interface PresetOption {
    /** Stable option value: the table key, or `custom`. */
    value: string;
    /** The display label. */
    name: string;
    /** One user-facing sentence on what the value means; omitted when not configured. */
    description?: string;
}
export interface PermissionSelect {
    /** Switchable presets, plus `custom` appended exactly while it is current. */
    options: PresetOption[];
    /** The effective current value: a preset table key, or `custom`. */
    currentValue: string;
}
// :31-40   permissions: PermissionSelect;
```

折叠自三个 whole-value 事件 `permission/preset` / `sandbox/mode` / `approval/policy`（`:34-36`）。**key 缺席 = 没装 permission 服务**，客户端应隐藏控件。

**无时间戳。**
**官方消费**：`PKG/dsh-client-ui-permission-presets/lib/client.js:404`。

### 1.7 `sandboxMode` —— 不可读（host-only）

```js
// PKG/dsh-sandbox-policy/lib/index.js:114-120
ctx.sessionProjections.register({
    key: "sandboxMode",
    stateVersion: 1,
    stateSchema: sandboxModeStateSchema,   // z.union([literal('read-only'), literal('workspace-write'), literal('danger-full-access')]).nullable()
    init: () => null,
    apply: (state, event) => event.type === "sandbox/mode" ? event.data.mode : state
    // ← 没有 wire 字段
});
```

**判据（本报告的核心机制）**：

```ts
// PKG/dsh-session-projection/lib/types/index.d.ts:59-72
/** Client view. Omit for host-only units. */
wire?: K extends keyof SessionProjectionMap ? { viewSchema; view } : never;

// :150-152  注册「client-visible」单元：wire 必填
register<K extends keyof SessionProjectionMap, S extends ...>(
  definition: Omit<ProjectionDefinition<K,S>,'wire'> & { wire: NonNullable<...> }): () => void;
// :153-159  注册「host-only」单元：K 必须**只在** SessionProjectionStateMap 里
register<K extends Exclude<keyof SessionProjectionStateMap, keyof SessionProjectionMap>, S extends ...>(
  definition: Omit<ProjectionDefinition<K,S>,'wire'>): () => void;
```

**没有 `wire` ⇒ 永远不进 client snapshot ⇒ `useProjection('sandboxMode')` 永远 `undefined`。**

它**只**声明在 StateMap（注意：`.d.ts` 里 interface 成员名是**不加引号**的，所以用 `grep "'sandboxMode'"` 找不到它 —— 必须读合并块）：

```ts
// PKG/dsh-sandbox-policy/lib/types/index.d.ts:56-63
/** The sandbox-mode projection's state schema (state equals the public shape). */
declare const sandboxModeStateSchema: zod.ZodNullable<zod.ZodUnion<...>>;
type SandboxModeState = zod.infer<typeof sandboxModeStateSchema>;
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** Last logged sandbox-mode override, or null before one (deployment default applies at resolve time). */
        sandboxMode: SandboxModeState;
    }
}
```

**没有 `SessionProjectionMap` 合并** ⇒ 类型系统里 `useProjection('sandboxMode')` 根本不可写（`Exclude<keyof StateMap, keyof Map>` 把它排除在第一个 `register` 重载之外）。

### 1.8 `llmRetry` —— 不可读（host-only）

```ts
// PKG/dsh-llm-retry/lib/types/index.d.ts:34-39
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** Retry state for the current step by provider and policy. */
        llmRetry: LlmRetryState;      // = Record<string, { retry: number; retryId: RetryId }>
    }
}
```

只在 **StateMap** 里，不在 **Map** 里；运行时注册亦无 `wire`：

```js
// PKG/dsh-llm-retry/lib/index.js:88-107
ctx.sessionProjections.register({
    key: "llmRetry",
    stateVersion: 1,
    stateSchema: llmRetryStateSchema,      // record(string, {retry:int>=0, retryId:string})
    init: () => ({}),
    apply: (state, event) => { /* step/start|turn/end → {}; 否则只在 llm/retry 时更新 */ }
});
```

`useProjection('llmRetry')` ⇒ `undefined`。想显示重试只能看 token/流量，或读原始 chat 事件。

### 1.9 `schedule`

```ts
// PKG/dsh-schedule/lib/types/types.d.ts:9-44（三种 record，节选）
export interface AfterScheduleRecord {
    readonly id: ScheduleId; readonly kind: 'after';
    readonly prompt: string; readonly afterSeconds: number;
    readonly scheduledAt: string;          // Four-digit-year RFC 3339 UTC target
}
export interface AtScheduleRecord {
    readonly id: ScheduleId; readonly kind: 'at';
    readonly prompt: string; readonly scheduledAt: string;
}
export interface EveryScheduleRecord {
    readonly id: ScheduleId; readonly kind: 'every';
    readonly prompt: string; readonly everySeconds: number;   // 固定间隔，>=300s
    readonly scheduledAt: string;
}
// :59   export type ScheduleRecord = OneShotScheduleRecord | EveryScheduleRecord;
// :182-186
interface SessionProjectionMap {
    /** Complete active reminders owned by this Session's post-fork suffix. */
    schedule: readonly ScheduleRecord[];
}
```

**view 就是 record 数组，不含 `state`/`deliveryMode`**：

```ts
// PKG/dsh-schedule/lib/types/projection.d.ts:24-27
wire: {
    viewSchema: z.ZodType<readonly ScheduleRecord[], ...>;
    view: (state) => readonly ScheduleRecord[];
};
```

注意 `ScheduleView = ScheduleRecord & { state:'scheduled'|'overdue'; deliveryMode:'session-local' }`（`types.d.ts:91-100`）**只用于模型侧工具返回值**，**不在投影 wire 里**。所以 `scheduledAt` 的 overdue 判定要客户端自己算。

**时间戳单位**：`scheduledAt` 是 **RFC 3339 UTC 字符串**（不是 ms）；`afterSeconds` / `everySeconds` 是秒。

**官方消费**：`PKG/dsh-client-ui-schedule/lib/client.js:125`（`useProjection("schedule") ?? EMPTY_RECORDS`）。

**默认加载：未加载**（§4.3 有证据链）。

### 1.10 `compaction` —— 不是投影

`grep -rn "key: 'compaction'"` 只命中两处，都不是 session projection：

```js
// PKG/dsh-tool-cordis/lib/index.js:990-993
{
  key: "compaction",
  summary: "Abstract compaction service.",
  description: "Abstract compaction service. Implementations own trigger policy, ...",
  methods: [ { signature: "abstract compactIfNeeded(agent, trigger, signal): Promise<CompactionResult|null>" }, ... ]
},
```

这是 **cordis 服务注册表的自省元数据**（`dsh-tool-cordis` 是给模型看的服务目录），与 `ctx.sessionProjections` 无关。同文件 `:4214-4217` 的 `toolResultPruner` 也是同一形状（`{key, summary, description, methods:[...]}`，方法是 `measureContent` / `pruneContent`）。

**结论**：`useProjection('compaction')` / `useProjection('toolResultPruner')` 永远 `undefined`；它们的能力数据不在任何 session 投影里。压缩相关的**可见**痕迹只能从 `tokenUsage`/`contextPressure`（`projectedTokens` 会随 compaction 移动，见 `PKG/dsh-token-meter/lib/types/projection.d.ts:35-43`）或原始 `compaction/*` 事件推断。

### 1.11 `jobsBySession` —— 不是投影，走 `useSessions`

**它不是 session projection**：`grep -rn "jobsBySession"` 只命中 `dsh-api-session-controller`（client sessions 服务）与 `dsh-client-ui-jobs`。它是 **session 列表镜像**的一个字段：

```ts
// PKG/dsh-api-session-controller/lib/types/client/sessions/service.d.ts:61-79（SessionListState，节选）
export interface SessionListState {
    ids: SessionId[];
    byId: Record<SessionId, SessionSummary>;
    current: SessionId | undefined;
    phase: SessionListPhase;
    subagentsByParent: Readonly<Record<SessionId, SubagentCatalogSnapshot>>;
    /**
     * Background jobs each session can see, mirrored last-wins from Session
     * Controller's control baseline and `jobs` frames. A missing key is an empty
     * set, so consumers read absence rather than a sentinel.
     */
    jobsBySession: Readonly<Record<SessionId, readonly JobView[]>>;
    currentAddress: SubagentAddress | undefined;
}
```

`JobView` = `SessionJob`（`service.d.ts:21` 的 `import type { SessionJob as JobView }`）：

```ts
// PKG/dsh-api-session-controller/lib/types/types.d.ts:499-508
/** Browser-safe background-job row. */
export interface SessionJob {
    readonly id: JobId;
    readonly kind: string;
    readonly label: string;
    readonly status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed';
    readonly detail?: string;
    readonly startedAt: number;
    readonly finishedAt?: number;
}
```

```ts
// PKG/dsh-api-session-controller/lib/types/types.d.ts:509-514
export interface SessionControlBaseline {
    readonly queues: Readonly<Record<SessionId, readonly SessionQueuedItem[]>>;
    readonly jobs: Readonly<Record<SessionId, readonly SessionJob[]>>;
    readonly projections: Readonly<Record<SessionId, SessionProjectionBaseline>>;
}
// :531-533   SessionControlFrame 的 'jobs' 变体：{ type:'jobs', sessionId, jobs }
```

**第三方到底怎么读到它（可复制代码）**：slot props 里的标准 hook `useSessions`。

```tsx
// 任何 session 作用域 slot 组件：
function JobsCard({ sessionId, useSessions }: PropsRuntime<'...'>) {
  const jobs = useSessions((s) => s.jobsBySession[sessionId]) ?? [];
  const live = jobs.filter((j) => j.status === 'running' || j.status === 'stopping');
  // ...
}
```

官方实现完全一样 —— `PKG/dsh-client-ui-jobs/lib/client.js:117-118`：

```js
function JobListAction({ sessionId, useSessions, t }) {
    const jobs = useSessions((state) => state.jobsBySession[sessionId]) ?? NO_TASKS;
```

而 `useSessions` 的来源链（三段，缺一不可）：

1. **root hook 源**：`PKG/dsh-client-ui-session/lib/client.js:319-326`
   ```js
   function apply(ctx) {
       const service = new UiSession(ctx, ctx.sessions);
       ctx.slots.provideRoot({ hooks: {
           sessions: ctx.sessions.list,                       // ← useSessions
           sessionPendingInteraction: service.pendingInteractions
       } });
       ctx.slots.installScope("session", service.adapter);
   }
   ```
2. **hook → prop 命名**：`use<Capitalize(name)>` —— `PKG/dsh-cordis-client-runner/lib/client.js:1892`（`PropsHooks`：「`[N in keyof HS & string as \`use${Capitalize<N>}\`]`」）。所以 `sessions` → `useSessions`，keyed hook `projection` → `useProjection`（`:1897` 的 `PropsKeyedHooks`）。
3. **root 源展开进每个 slot 的 standard kit**：`PKG/dsh-client-ui-renderer/lib/client.js:537-548`（`materializeStandardBinding`）+ `:550-572`（`standardProps`：`scope!=='root'` 时 `{...root, ...scopeBinding}`）。**所以任何 slot 组件（含第三方）都能拿到 `useSessions`，不需要额外 declare。**

**时间戳单位**：`startedAt` / `finishedAt` 是 number；类型没写单位，但官方消费按 **epoch 毫秒**处理 —— `PKG/dsh-client-ui-jobs/lib/client.js:105-107`（`left.startedAt - right.startedAt` 参与排序）与 `:81-84`（`Math.floor(elapsedMs / 1e3)` 前先 `now - startedAt`，`:120` 的 `now` 来自 `Date.now()`）。**这是按用法推断，类型注释未明说单位**。

### 1.12 其余 client-visible key（形状速查）

**`title`**（`PKG/dsh-session-title/lib/types/types.d.ts:72-79`）：`string | null`，最后一次 `session/title`（last-wins）；`null` = 首个标题尚未落地。
**`turnOutline`**：

```ts
// PKG/dsh-session-turn-outline/lib/types/types.d.ts:12-21
export interface TurnOutlineEntry {
    /** Host-assigned turn number (the `turn/start` payload). */
    readonly turn: number;
    /** The turn's `turn/start` event seq — paging a window back through this seq loads the whole turn. */
    readonly seq: SessionSeq;
    /** Bounded first-human-prompt preview (one rail-card line); `''` until an eligible prompt lands. */
    readonly prompt: string;
    /** Bounded final-response preview (up to three rail-card lines); `''` until the turn ends with assistant text. */
    readonly response: string;
}
// :40-43   turnOutline: readonly TurnOutlineEntry[];
```

无时间戳。官方消费：`PKG/dsh-client-ui-chat/lib/client.js:2076`。

**`agentPreset`**（`PKG/dsh-agent-presets/lib/types/types.d.ts:71-74`）：`string | null`（preset id，如 `standard`）；`null` = 部署未组合任何 preset。
**`sessionListMetadata`**（`PKG/dsh-api-session-controller/lib/types/types.d.ts:39-44`）：

```ts
export interface SessionListMetadata {
    readonly blank: boolean;
    /** Latest human-authored prompt time in the folded prefix. */
    readonly lastPromptAt: number | null;
}
```

`lastPromptAt` 是「durable message time」，与事件 `time` 同源 ⇒ **epoch 毫秒**。

**`imageLimits`**（`PKG/dsh-attachment/lib/types/types.d.ts:64-73`）：`{maxImageBytes, maxImagesPerMessage, maxMessageImageBytes, maxImagePixels, maxImageDimension, mediaTypes: readonly ImageMediaType[]}`。宿主 view 直接读服务：`PKG/dsh-api-session-controller/lib/index.js:1795-1801`（`view: () => attachmentCtx.attachments.imageLimits`）。**注意该注册整体包在 `ctx.inject(['attachments'], ...)` 里**（`:1793`）⇒ 没有 `attachments` 服务时这个 key **完全不注册**（默认 web 有 `attachment-local`，见 `dsh-base/cordis.patch.yml:118-119`）。
**`inbox`**（`PKG/dsh-agent/lib/types/types.d.ts:37-49`）：`{ 'next-turn': readonly JsonValue[]; 'next-step': readonly JsonValue[] }` —— 待投递用户消息的 **JSON 化**载荷（完整 `UserMessage` 不能过 typert 边界，见 `:31-36`）。
**`subagent`**：见 1.2 末尾。

---

## §2 全部投影 key 全表

### 2.1 收集方法

`SessionProjectionMap` 是通过 declaration merging 扩展的空接口（`PKG/dsh-session-projection/lib/types/types.d.ts:16-17`），定义域不在一处。收集方式：

1. `grep -rn "interface SessionProjectionMap" --include=*.d.ts` 得到 **14 个合并点**（其中 `dsh-session-projection` 自身是空基表）。
2. 对每个合并点抓其成员 key + 类型。
3. 用 `grep -rn "key: '<k>'" --include=*.js` 交叉验证运行时注册点与 `wire` 有无。
4. 用 `PKG/dsh-api-remotes/lib/client.js:7538-7663` 的 wire schema 反查「哪些 key 会真的过线」。

### 2.2 全表

| key | 定义包（合并点） | view 返回类型 | client-visible? | 默认 web 加载 |
|---|---|---|---|---|
| `inbox` | dsh-agent `lib/types/types.d.ts:46-49` | `InboxWireState` | 是 | 是（base `agent:67`） |
| `agentPreset` | dsh-agent-presets `lib/types/types.d.ts:71-74` | `string \| null` | 是 | 是（web-app `agent-presets:481`） |
| `sessionListMetadata` | dsh-api-session-controller `lib/types/types.d.ts:20-27` | `SessionListMetadata` | 是 | 是（web-app `session-controller:105`） |
| `imageLimits` | 同上 | `ImageAttachmentLimits` | 是 | 是（同上） |
| `modelSelection` | 同上 | `ModelSelectionProjection` | 是 | 是（同上） |
| `goal` | dsh-goal `lib/types/types.d.ts:113-120` | `GoalProjection \| null` | 是 | 是（base `goal:292`） |
| `permissions` | dsh-permission-presets `lib/types/types.d.ts:31-40` | `PermissionSelect` | 是 | 是（base `permission:229`） |
| `plan` | dsh-plan-mode `lib/types/types.d.ts:42-45` | `PlanProjection` | 是 | **preset 层**（web-app `plan-mode:417` disabled → standard preset `agent.cordis.yml:105`） |
| `schedule` | dsh-schedule `lib/types/types.d.ts:182-186` | `readonly ScheduleRecord[]` | 是 | **否**（全组合无该行） |
| `sessionStats` | dsh-session-stats `lib/types/types.d.ts:36-39` | `{turns,steps,llmMs,toolMs,ttftMs,ttftSteps,decodeMs,decodeTokens}` | 是 | 是（web-app `session-stats:86`） |
| `title` | dsh-session-title `lib/types/types.d.ts:72-79` | `string \| null` | 是 | 是（base `session-title:48`） |
| `turnOutline` | dsh-session-turn-outline `lib/types/types.d.ts:40-43` | `readonly TurnOutlineEntry[]` | 是 | 是（web-app `session-turn-outline:91`） |
| `subagentCatalog` | dsh-subagent `lib/types/projection-types.d.ts:57-59` | `SubagentCatalogEntry[]` | 是 | 是（base `subagent:328`） |
| `subagentTiming` | 同上 `:60-61` | `SubagentTimingProjection` | 是 | 是（同上） |
| `subagent` | 同上 `:71` | `SubagentIdentityProjection \| null` | 是 | 是（同上） |
| `tokenUsage` | dsh-token-meter `lib/types/projection.d.ts:64-73` | `TokenUsageProjection` | 是 | 是（base `token-meter:317`） |
| `contextPressure` | 同上 | `ContextPressureProjection` | 是 | 是（同上） |
| `contextBreakdown` | 同上 | `ContextBreakdownProjection` | 是 | 是（同上） |
| `todos` | dsh-tool-todo `lib/types/types.d.ts:38-45` | `TodoItem[] \| null` | 是 | **preset 层**（web-app `tool-todo:467` disabled → standard preset `agent.cordis.yml:241`） |

### 2.3 host-only：7 个客户端读不到的 key

判据见 §1.7 引用的两个 `register` 重载（`PKG/dsh-session-projection/lib/types/index.d.ts:150-159`）：**只出现在 `SessionProjectionStateMap`、不在 `SessionProjectionMap` 里的 key，注册时不允许带 `wire`，永远不进 client snapshot。**

| key | 定义包 | StateMap 合并点 | state 类型 | 运行时注册（无 `wire`） |
|---|---|---|---|---|
| `turnBoundary` | dsh-agent / dsh-agent-loop | `dsh-agent/lib/types/projection.d.ts:2-7` | `TurnBoundaryProjection` = `{openTurnStartSeq, lastStepStartSeq, lastStepBoundary, lastTurn}` | `dsh-agent-loop/lib/index.js:1299-1347` |
| `sandboxMode` | dsh-sandbox-policy | `dsh-sandbox-policy/lib/types/index.d.ts:59-63` | `'read-only'\|'workspace-write'\|'danger-full-access' \| null` | `dsh-sandbox-policy/lib/index.js:114-120` |
| `llmRetry` | dsh-llm-retry | `dsh-llm-retry/lib/types/index.d.ts:34-39` | `Record<string, {retry:number, retryId:string}>` | `dsh-llm-retry/lib/index.js:88-107` |
| `titleInput` | dsh-session-title | `dsh-session-title/lib/types/types.d.ts:65-71` | `TitleInputState` = `{first?, count, lastSeq}` | `dsh-session-title/lib/index.js:236-250` |
| `timeContext` | dsh-time-context | `dsh-time-context/lib/types/index.d.ts:12-17` | `{lastMessageTime, lastInjectionTime, lastTurnInjectionTime}`（全 `number\|null`） | `dsh-time-context/lib/index.js:181-214` |
| `tmuxContext` | dsh-tmux-context | `dsh-tmux-context/lib/types/index.d.ts:45-50` | `{state:string, time:number} \| null` | `dsh-tmux-context/lib/index.js:1493-1508` |
| `subagentModelSelectionPolicy` | dsh-tool-subagent | `dsh-tool-subagent/lib/types/model-selection-state.d.ts:20-25` | `AllowedModelRoute[] \| null`（`{provider,model}[]`） | `dsh-tool-subagent/lib/index.js:199-214` |

其中 `subagentModelSelectionPolicy` 的类型注释**自己就写着**「Host-only projection of the durable model-selection policy.」（`model-selection-state.d.ts:26`），是本判据最直白的一处佐证。

**其余 key 同时出现在两张表里**（state 是内部折叠态，view 是过线值）：`inbox`(dsh-agent `types.d.ts:41-49`) `agentPreset`(dsh-agent-presets `:67-74`) `sessionListMetadata`/`imageLimits`/`modelSelection`(api-session-controller `:11-27`) `goal`(dsh-goal `:109-120`) `permissions`(dsh-permission-presets `types/index.d.ts:24-28` + `types/types.d.ts:31-40`) `plan`(dsh-plan-mode `:37-45`) `schedule`(dsh-schedule `projection.d.ts:30-34`) `sessionStats`(dsh-session-stats `:64-68`) `title`(dsh-session-title `:65-79`) `turnOutline`(dsh-session-turn-outline `:35-43`) `subagentCatalog`/`subagentTiming`/`subagent`(dsh-subagent) `tokenUsage`/`contextPressure`(usage-projection `:31-36`) `contextBreakdown`(breakdown-projection `:8-12`) `todos`(dsh-tool-todo `:34-45`)。

**检索方法学提醒（本次踩过的坑）**：`.d.ts` 里 interface 的成员名是**不加引号的**，所以 `grep "'sandboxMode'"` 会给出 0 命中；key 字面量只出现在 `lib/**/*.js` 的注册对象里。全表必须靠读合并块（`interface SessionProjectionMap` / `interface SessionProjectionStateMap`）而不是 grep 带引号的 key。`SessionProjectionStateMap` 共 **22 个合并点**，`SessionProjectionMap` 共 **14 个合并点**。

**另一个同名陷阱**：`dsh-tool-cordis` 里还有一批 `{key:'...'}`，它们是**服务目录**不是投影，其中两个与投影 key 高度撞名：
- `dsh-tool-cordis/lib/index.js:991` → `compaction`（服务）
- `dsh-tool-cordis/lib/index.js:3699` → `subagentModelSelection`（服务；投影叫 `subagentModelSelectionPolicy`）


### 2.4 「过线」的 wire schema 交叉验证

`PKG/dsh-api-remotes/lib/client.js:7538-7663`（`session.control` 的 projections 载荷）里被**显式 typed** 的 key 只有 11 个：
`inbox`(7541) `agentPreset`(7561) `title`(7562) `todos`(7563) `sessionListMetadata`(7571) `imageLimits`(7575) `modelSelection`(7588) `subagentCatalog`(7600) `subagentTiming`(7613) `subagent`(7620) `goal`(7633)。

其余 key（`tokenUsage` `contextPressure` `contextBreakdown` `sessionStats` `permissions` `plan` `schedule` `turnOutline`）在 api-remotes 里 **0 命中**（`grep -c` 全部为 0），但它们仍然过线，因为它们落在该字段的**兜底分支**上：

```js
// PKG/dsh-api-remotes/lib/client.js:7654-7662
}), record(string(), union([ literal(null), string(), number(), literal(false), literal(true),
    array(lazy(() => JsonValueRemoteCodec$schema4)),
    record(string(), lazy(() => JsonValueRemoteCodec$schema4)) ])).readonly()).readonly()
```

即：typed 部分校验已知 key，`record(string(), JsonValue)` 放行任意其他 key。宿主侧的权威来源是 **无 filter 的全量快照**：

```js
// PKG/dsh-api-session-controller/lib/index.js:1070-1080
projectionBaseline(sessions) {
    const blocks = Object.create(null);
    for (const session of sessions) {
        const snapshot = this.ctx.sessionProjections.snapshot(session);   // ← 不传 keys = 所有 client-visible 单元
        blocks[session.id] = { asOfSeq: snapshot.asOfSeq, values: snapshot.values };
    }
    return blocks;
}
```

`snapshot(session, keys?)` 的语义：「optional client-visible outputs; state materialization remains complete ... `values` is empty when no selected client-visible unit is registered」（`PKG/dsh-session-projection/lib/types/index.d.ts:176-185`）。**不传 keys ⇒ 全部已注册的 client-visible key。**

**统一点**：`PKG/dsh-session-projection/lib/types/index.d.ts:129-132` ——
> Registrants sharing a key share one unit and are counted: the same tool package mounted in N agent presets registers N times, and the key survives until the last one unloads.

**推论**：一个 key 只要**任一**已挂载的插件（host 行或 preset 行）注册过 client-visible 单元，全进程所有 session 的 `useProjection('<key>')` 就都能读到值；没注册过的 session 读到的是该 fold 的 `init`（例如 `todos` 读到 `null`）。这解释了为什么「preset 层注册」对第三方仍然可用。

---

## §3 读法与降级

### 3.1 未注册的 key：返回 `undefined`，不抛错

四段证据链（从类型到运行时）：

1. **类型契约**：`PKG/dsh-api-session-controller/lib/types/client/sessions/projection-store.d.ts:24-27`
   ```ts
   export type UseProjection = {
       <K extends Extract<keyof SessionProjectionMap, string>>(key: K): SessionProjectionMap[K] | undefined;
       <K ..., S>(key: K, selector: (value: ...) => S, eq?): S;
   };
   ```
   `d.ts:15-23` 的注释直接写明：「`undefined` uniformly means capability absent — host unit unmounted, or no baseline/frame has carried the key yet.」

2. **store 语义**：同文件 `:44-48`「A key the store has never seen reads `undefined` (capability absent). Faces are identity-stable per key (create-on-demand, cached)」。

3. **face 永远存在，快照才是 undefined**：`PKG/dsh-api-session-controller/lib/client.js:778-792`
   ```js
   channel(key) {
       let channel = this.channels.get(key);
       if (channel === void 0) {
           const notifier = new Notifier(() => {});
           channel = { notifier, face: {
               getSnapshot: () => this.rows.get(key)?.value,     // ← 未注册 ⇒ undefined
               subscribe: (listener) => notifier.subscribe(listener)
           } };
           this.channels.set(key, channel);
       }
       return channel;
   }
   ```
   注释（`:690-696`）：「Always defined — absence is an `undefined` snapshot, never a missing face, so a component may subscribe before the key ever carries a value.」

4. **hook 层兜底**：`PKG/dsh-client-ui-renderer/lib/client.js:233-246`
   ```js
   function keyedObservableHook(source) {
       if (source === void 0) return absentKeyedHook;
       let hook = keyedHookCache.get(source);
       if (hook === void 0) {
           hook = (key, selector, equal) =>
               observableHook(source(key) ?? absentSource)(selector ?? identity, equal);
           keyedHookCache.set(source, hook);
       }
       return hook;
   }
   const identity = (value) => value;
   const absentKeyedHook = (_key, selector, equal) => observableHook(absentSource)(selector ?? identity, equal);
   const absentSource = { getSnapshot: () => void 0, subscribe: () => () => {} };   // :212-215
   ```

**结论**：`useProjection('anyUnknownKey')` → **`undefined`，零异常、零警告**。带 selector 时 selector 收到 `undefined`（所以 selector 必须自己处理 `undefined`，官方都这么写，如 `PKG/dsh-client-ui-conversation/lib/client.js:15815-15816`）。

**对 dsh-widgets 的含义**：现有 `useProjection ? useProjection('todos') : undefined` 的写法安全；但**「有值」与「key 未注册」两种情况不能区分** —— 想区分只能旁证（例如 `todos === undefined` = 没装 tool-todo；`todos === null` = 装了但还没写过）。dsh-widgets `collector.tsx:62-66` 目前把 `undefined` 与「空」合并处理，这是可接受的降级。

### 3.2 第三方拿到 `jobsBySession` 的完整配方

```tsx
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';

type Props = PropsRuntime<'<你的 slot key>'>;   // 会自动带上 useSessions / useProjection / useSession ...

function JobsCard({ sessionId, useSessions }: Props) {
  // 缺 key = 空集合的约定由官方注释保证（service.d.ts:73-75）
  const jobs = useSessions((s) => s.jobsBySession[sessionId]) ?? [];
  const now = Date.now();                                   // 官方用 interval 每 1s 刷新（ui-jobs client.js:126-135）
  const live = jobs.filter((j) => j.status === 'running' || j.status === 'stopping');
  const elapsed = (j) => (j.finishedAt ?? now) - j.startedAt;
  return /* ... */;
}
```

- **不要试图用 `useProjection('jobsBySession')`** —— 它不是投影，永远 `undefined`。
- 也**不需要 RPC**：`dsh-client-ui-jobs` 的包注释明确写「The data arrives entirely through the `jobsBySession` list mirror, so the plugin issues no RPC and holds no state of its own beyond popover visibility.」（`PKG/dsh-client-ui-jobs/lib/types/client/index.d.ts:1-6`）。
- 数据源是 host 的 Session Control 流：`SessionControlBaseline.jobs`（`types.d.ts:512`）+ `{type:'jobs', sessionId, jobs}` 增量帧（`:531-533`），生产者 `PKG/dsh-api-session-controller/lib/index.js:1025`、`:1084`、`:1091`。客户端侧镜像写入 `PKG/dsh-api-session-controller/lib/client.js:2677-2689`。

### 3.3 想读「别的 session」的投影（子代理时长）

`useProjection` 只作用于**当前 slot 的 session 作用域**（`PKG/dsh-client-ui-session/lib/client.js:67`：`keyedHooks: { projection: (key) => binding.session.projections.faceOf(key) }`）。跨 session 只有两条路：

1. **列表行的 `projectionValues`**（推荐，零 RPC）：`useSessions(s => s.byId[childId]?.projectionValues?.['subagentTiming'])`。
   类型：`PKG/dsh-api-session-controller/lib/types/client/sessions/lineage.d.ts:22-23`；填充：`PKG/dsh-api-session-controller/lib/client.js:2896-2900`。
2. **`ctx.get('sessions').binding(childId)`**：需要 child 已被 materialize（`service.d.ts:307-312`），第三方不建议依赖。

### 3.4 时间戳单位汇总（本报告涉及的全部）

| 字段 | 单位 | 证据 |
|---|---|---|
| `SubagentCatalogEntry.createdAt` | epoch **ms** | `dsh-session/lib/types/types.d.ts:66-67` |
| `subagentTiming.settledMs` | **ms** | `projection-types.d.ts:20`「Milliseconds accumulated...」 |
| `subagentTiming.active.since` / `.through` | epoch **ms** | 事件 `time`：`dsh-session/lib/types/types.d.ts:465-466` |
| `goal.createdAt` / `updatedAt` | epoch **ms** | `dsh-goal/lib/types/types.d.ts:77-80` |
| `sessionStats.llmMs` / `toolMs` / `ttftMs` / `decodeMs` | **ms** | `dsh-session-stats/lib/types/projection.d.ts:32-43`（「ms」） |
| `sessionListMetadata.lastPromptAt` | epoch **ms**（durable message time） | `dsh-api-session-controller/lib/types/types.d.ts:42-43` + 事件 time 约定 |
| `SessionJob.startedAt` / `finishedAt` | epoch **ms**（类型未注明，按官方用法） | `dsh-client-ui-jobs/lib/client.js:81-84`、`:105-107`、`:120` |
| `ScheduleRecord.scheduledAt` | **RFC 3339 UTC 字符串** | `dsh-schedule/lib/types/types.d.ts:18`、`:29`、`:42` |
| `ScheduleRecord.afterSeconds` / `everySeconds` | **秒** | `dsh-schedule/lib/types/types.d.ts:17`、`:41` |
| `TurnOutlineEntry` | **无时间戳** | `dsh-session-turn-outline/lib/types/types.d.ts:12-21` |
| `PlanProjection` / `PermissionSelect` | **无时间戳** | `dsh-plan-mode/.../types.d.ts:19-22`；`dsh-permission-presets/.../types.d.ts:25-30` |

---

## §4 默认加载：证据与未能证实项

### 4.1 默认 web 组合的事实链

组合不是硬编码列表，而是**三层 patch 叠加**：

1. `D:\dsh-home\profiles\web\package.json:19-39` 的 `dsh.profile.bundles`：
   `["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-ui-harmonizer", "dsh-widgets", "dshmarket", "dsh-notification", "dsh-better-sidebar", "@omdsh-dev/dsh-genui", "dsh-mem", "dsh-multikey-pool", "@nanmicoder/dsh-agent-teams", "research-cordis", "dsh-lifeline", "dsh-usage-center", "@mars-sea/dsh-commandcode-provider"]`
2. `PKG/dsh-base/cordis.patch.yml`（共享核心）。
3. `PKG/dsh-web-app/cordis.patch.yml`（浏览器面，按 id 覆盖 base）。
4. 最后 `D:\dsh-home\profiles\web\cordis.patch.yml`（本机只禁用了 `multikey-pool`、`dsh-lifeline` 两行）。
5. `D:\dsh-home\profiles\web\cordis.yml` 是空数组 —— 注释明写「The tree is composed as patches」。

（注：`@deepseek-ai/dsh-web-app` 的 `dsh.bundle.patch` 指向自己的 `cordis.patch.yml`，`package.json` 里那串 dependencies 是装配依赖，真正的行清单在 patch 文件里。）

### 4.2 每个 key 的「默认加载」判定与依据行

| key | 行 id / 文件:行 | 是否默认 |
|---|---|---|
| 投影**注册表** | `session-projection`，`dsh-base/cordis.patch.yml:138-139` | 是 |
| `title` | `session-title`，base `:48-53` | 是 |
| `inbox` | `agent`，base `:67-68` | 是 |
| `llmRetry` | `llm-retry`，base `:84-85` | 注册了（host-only） |
| `sandboxMode` | `sandbox-policy`，base `:208-212` | 注册了（host-only） |
| `permissions` | `permission`，base `:229-241` | 是 |
| `goal` | `goal`，base `:292-293` | 是 |
| `plan` | `plan-mode`，base `:301-305` → **web-app `:417-419` `disabled: true`** → standard preset `presets/standard/agent.cordis.yml:105-112` | **仅 preset 层** |
| `tokenUsage`/`contextPressure`/`contextBreakdown` | `token-meter`，base `:317-318`；web-app `:420-425` 注释重申「token METER stays on the host plane」 | 是 |
| `subagentCatalog`/`subagentTiming`/`subagent` | `subagent`，base `:328-329`；web-app `:436-441` 注释重申「subagent registry ... STAY in the host plane」 | 是 |
| `todos` | `tool-todo`，base `:401-404` → **web-app `:467-468` `disabled: true`** → standard preset `agent.cordis.yml:241-244` | **仅 preset 层** |
| `sessionStats` | `session-stats`，web-app `:86-87` | 是 |
| `turnOutline` | `session-turn-outline`，web-app `:91-92` | 是 |
| `modelSelection`/`sessionListMetadata`/`imageLimits` | `session-controller`，web-app `:105-106` | 是 |
| `agentPreset` | `agent-presets`，web-app `:480-484`（`config.default: standard`） | 是 |
| `schedule` | 无 | **否** |
| `compaction`/`toolResultPruner` | `compaction-basic` base `:320-321` / `tool-result-pruner` base `:394-399`；web-app `:427-434` 均 disable | 服务，非投影 |
| `jobsBySession` | `jobs`(=`dsh-jobs-local`) base `:81-82` + 客户端 `ui-jobs` web-app `:311-312` | 是 |

**关于「preset 层」**：`plan` 与 `todos` 的注册发生在 agent preset 的 standing scope 内，但投影注册表是**进程级**服务（`sessionProjections` 不在任何 `isolate` 列表里；standard preset 的 isolate 只有 `planMode` / `compaction` / `toolResultPruner` / `workflowEngine`）。注册表的键共享语义见 §2.4 引用的 `index.d.ts:129-132`：「the key survives until the last one unloads」。所以只要本会话用的 preset 挂了 `dsh-plan-mode` / `dsh-tool-todo`，第三方 `useProjection('plan')` / `useProjection('todos')` 就能读到值。**本机默认 preset 是 `standard`（web-app `:484`），而 `standard` 两者都挂** ⇒ 实际可用。

### 4.3 `schedule` 未加载的证据

- `grep -rn "dsh-schedule"` 覆盖 `PKG/**/*.yml|yaml` + `D:\dsh-home\**/*.yml|yaml`（排除 node_modules）：**只有第三方插件市场的目录条目命中**（`dsh-market-fork/data/plugins/magicOF2__dsh-schedule.yml` 等），没有任何 cordis 组合引用 `@deepseek-ai/dsh-schedule`。
- `PKG/dsh-web-app/cordis.patch.yml:303-308` 原文：
  > `# Read-only active Schedule catalog. The shipped Web graph resolves the client package but leaves it disabled; the explicit Schedule overlay enables this same row together with the host Schedule services.`
  > `- id: ui-schedule` / `name: '@deepseek-ai/dsh-client-ui-schedule'` / `disabled: true`
- 即：**default web 组合里既没有 host 侧 `dsh-schedule` 行，也没有启用 `ui-schedule`**。要有数据必须显式加 overlay。`useProjection('schedule')` 在当前组合下 **永远 `undefined`**（`ui-schedule` 自己也做了 `?? EMPTY_RECORDS` 兜底，`PKG/dsh-client-ui-schedule/lib/client.js:125`）。

### 4.4 明确「未能证实」的项

1. **`dsh-client-connection` 里的投影表是开发 fixture，不是生产宿主。**
   `PKG/dsh-client-connection/lib/client.js:3181-3201`（`projectionValuesOf` / `modelSelectionProjectionOf` / `projectionFramesOf`）位于一个 fixture 镜像模块中 —— 同文件 `:3342` 的注释「Fixture mirror of host session-scoped attachment authorization」证明该文件含 fixture。它列出的 key（`permissions/plan/goal/tokenUsage/contextPressure/contextBreakdown/sessionStats/imageLimits/title/todos`）与生产一致，但**生产路径应以 `PKG/dsh-api-session-controller/lib/index.js:1070-1080` 为准**。**未能证实**该 fixture 文件在 default web bundle 中被启用与否 —— 我没有去追 `dsh-client-connection` 的运行时条件（超出「哪些投影可读」的问题范围）。

2. ~~`imageLimits` 在生产宿主的注册条件未逐行核实。~~ **已证实（本轮复查补上）**：
   `imageLimits` 的注册被包在 `ctx.inject(['attachments'], ...)` 里 —— `PKG/dsh-api-session-controller/lib/index.js:1793-1801`
   ```js
   ctx.inject(["attachments"], (attachmentCtx) => {
       ctx.sessionProjections.register({
           key: "imageLimits",
           stateSchema: z$1.null(),
           init: () => null,
           apply: (state) => state,
           wire: { viewSchema: imageLimitsSchema, view: () => attachmentCtx.attachments.imageLimits },
           stateVersion: 1
       });
   ```
   （同样的形态也在 `lib/types/list.js:68-78`。）⇒ 若组合里没有 `attachments` 服务，**`imageLimits` 这个 key 整体不注册**，`useProjection('imageLimits')` 返回 `undefined`。默认 web 组合有 `attachment-local`（`dsh-base/cordis.patch.yml:118-119`），所以默认可用；但**这是条件性可用，不是无条件可用**。

3. **`SessionJob.startedAt`/`finishedAt` 的单位类型注释未明说毫秒。**
   我按官方消费代码推断为 epoch ms（§3.4）。类型定义（`PKG/dsh-api-session-controller/lib/types/types.d.ts:506-507`）**没有单位注释**。**这是推断，非文档事实。**

4. **`jobsBySession` 的 `useSessions` 在「非 session 作用域」slot（如 root/sidebar 全局 slot）里能拿到什么。**
   我确认了 root hook `sessions` 会展开进每个 standard kit（`renderer/lib/client.js:537-572`），且 `ui-layout` 的 `AppFrame`、`DocumentTitle` 等 root 级组件确实声明了 `useSessions`。但**没有**验证一个第三方 root-slot 组件声明 `useSessions` 时是否会被授权（slot 的 standard source 声明机制在 `dsh-client-ui-slots`，而**该包在 npx 缓存里不存在实体目录** —— `Get-ChildItem -Directory | Where Name -match "slots|client-ui$"` 无结果；它只以 require specifier 出现在各 bundle 里）。**未能证实第三方 root slot 能否拿到 `useSessions`；session 作用域 slot 能拿到是确证的**（用的是同一 `standardProps` 路径）。

5. **官方是否**有任何包读 `subagentCatalog` 投影 —— **未找到证据（0 命中）**。
   `grep -rn "subagentCatalog" --include=*.js` 在 `dsh-client-ui-*` 全部 0 命中；命中项都是类型/schema/`setSubagentCatalogOpen`（方法名，与投影无关）。官方 `ui-subagent` 走 `subagentsByParent`（`PKG/dsh-client-ui-subagent/lib/client.js:411`）。所以我判定这是「已上线但官方无人消费」的投影，**但无法排除**它被某个非 `dsh-client-ui-*` 的客户端包消费（我只搜了 `*.js` 中的字面量）。

6. **`dsh-tool-cordis` 的 `{key,summary,description,methods}` 结构是否等同于「服务 key」的权威定义。**
   我依据的是形状（`PKG/dsh-tool-cordis/lib/index.js:990-993` 与 `:4214-4217` 同构，且描述文案是给模型看的服务目录语言）与「全仓 `key: 'compaction'` 只有这两处」。**没有**找到一份文档明确写「这个数组就是 cordis 服务 key 清单」。判定「不是投影」的核心依据其实是更强的：**`grep` 全仓 `ctx.sessionProjections.register` 的调用点里没有 `compaction` / `toolResultPruner`**。这一点已确证。

---

## 附录：本次使用过的全部检索命令（可复现）

```powershell
$p="C:\Users\12404\AppData\Local\npm-cache\_npx\c40503fdf38a82ea\node_modules\@deepseek-ai"

# 1. 投影表合并点
Get-ChildItem $p -Recurse -Include *.d.ts | Select-String -SimpleMatch "interface SessionProjectionMap"

# 2. key 的运行时注册点（找出无 wire 的 host-only）
Get-ChildItem $p -Recurse -Include *.js,*.d.ts | Select-String -SimpleMatch "key: '<KEY>'"

# 3. 谁在消费
Get-ChildItem $p -Recurse -Include *.js | Select-String -SimpleMatch "useProjection("

# 4. 默认组合
#   PKG/dsh-base/cordis.patch.yml
#   PKG/dsh-web-app/cordis.patch.yml
#   D:\dsh-home\profiles\web\package.json  (.dsh.profile.bundles)
#   D:\dsh-home\profiles\web\cordis.patch.yml
```
