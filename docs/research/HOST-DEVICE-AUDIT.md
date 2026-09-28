# HOST-DEVICE-AUDIT — 本机设备 / 运维数据的 host 侧可行性实测

> 只读调研。**本文件是本次任务唯一写入的文件**，`dsh-widgets` 仓库其余部分未被修改。
>
> 实测环境：`SPARXIE` / Windows 11（PowerShell **5.1**.26100.9444）/ Node **v22.22.2** / 用户 `SPARXIE\12404`、**非管理员**（`IsInRole(Administrator)=False`）/ DSH web PID **28536**（`@deepseek-ai/dsh@0.1.5-rc.2`，`dsh web`，已运行 14059 s）。
> 全部耗时均为 **Node `execFile` / `fs.promises` 实测**（即 host 模块真实调用路径），非热 shell 内测量；跑 3 次取中位数。
> 未在本机安装的候选（`wmic`）已实测报错，如实记录，不臆测。

---

## §0 结论表

| # | 项 | 可行性 | 单次耗时（中位） | 建议 cadence | 输出形状 | 风险 / 备注 |
|---|---|---|---|---|---|---|
| 1 | 磁盘容量（`fs.statfs`） | ✅ 强烈推荐 | **1.9 ms**（26 个盘符全探，异步）/ 0.2 ms（同步） | 30 s | `{drives:[{root,total,free,usedPercent}]}` | 无。**不要**用 `Get-Volume`（2208 ms）/ `Get-CimInstance Win32_LogicalDisk`（69 ms）；`wmic` 本机已不存在 |
| 2 | DSH 自检（sessions / storages） | ✅ 推荐 | **41 ms**（sessions，339 文件 / 341.4 MiB）· **13 ms**（storages，328 文件 / 38.9 MiB） | 60 s | `{sessions:{files,bytes,new1h,new24h},storages:{...}}` | 纯 `node:fs`，无进程 spawn。全量遍历 36–42 ms，**可以直接每 60 s 跑一次**，不必缓存增量索引 |
| 3 | 网络吞吐（收/发速率） | ⚠️ 可行但慢 | **353 ms**（`Win32_PerfRawData_Tcpip_NetworkInterface` via PS） | 采样 2 s（速率差分需 ≥2 s 间隔） | `{rxBps,txBps,rxTotal,txTotal,adapters:[...]}` | **Windows 独有**；`netstat -e` 只有 29 ms 但**实测数值错误（见 §1.3）**；PS 冷启动地板 270 ms |
| 4 | 供电 / 电池 | ✅ 可行（**本机是笔记本**） | **369 ms**（`Win32_Battery`）/ **22 ms**（`powercfg /getactivescheme`） | 60 s | `{present:true,ac:true,percent:100,minutesLeft:null,plan:'平衡'}` | `Win32_PowerPlan` **需要管理员**（实测报权限错）；无电池机器 → `battery:null` |
| 5 | Top 进程（工作集） | ✅ 可行 | **337 ms**（`Get-Process` via PS） | 5–10 s | `[{name,pid,wsMB}]` | `tasklist` 500 ms 更慢且单位是字符串；**每进程显存拿不到**（WDDM 下恒为 `N/A`） |
| 6 | 本地服务健康（TCP 探活） | ✅ 强烈推荐 | **0.2–1.3 ms/端口**，4 端口并行 **2–3 ms** | 5 s（端口表 30 s） | `[{label,host,port,status,ms}]` | 纯 `node:net`，跨平台。端口表用 `netstat -ano`（32 ms）而非 `Get-NetTCPConnection`（596 ms） |
| 7 | 代理出口健康 | ✅ 可行，但**必须异步** | TCP **0.3 ms** · CONNECT **0.7–2.2 ms（无意义）** · 真实出口 GET **1311 ms**（8/8 成功） | 60 s，超时 8 s | `{tcpMs,exitMs,verdict:'ok'\|'proxy-down'\|'blocked'\|'unreachable'}` | 出口延迟 897–3596 ms **远大于 1 s**，绝不能放进同步 handler；`NO_PROXY` 等环境变量在本机 dsh 进程里**不存在**，代理地址必须硬编码/取自设置 |
| 8 | Web 进程自身指标 | ✅ 强烈推荐 | **~0 ms**（`process.*`） | 5 s | `{pid,rssMB,heapUsedMB,uptimeS,cpuUserMs,cpuSysMs}` | **host 就在 `dsh web` 进程内（PID 28536）**，已实测确认；`rss` 是**整个 harness 的足迹**（444–546 MB），不是 widgets 的 |
| + | 温度（附加发现） | ⚠️ 与本仓库既有注释相反 | **345 ms** | 30 s | `{zones:[{name,celsius}]}` | `Win32_PerfFormattedData_Counters_ThermalZoneInformation` **非管理员可用且随负载变化**（实测 63.7→66.1 °C）。但它是 ACPI 热区，不是核心温度 |

**总成本**：以上全部跑一遍 = **冷 1569 ms / 热 1314 ms**（实测，见 §2.2）→ 远超现有 ~1 s 缓存模型，**必须分节 TTL + stale-while-revalidate**（§2.1）。

---

## §1 逐项实测

### §1.1 磁盘

**盘符枚举三方案对比**

```
# PowerShell 内测量（同一台机器、已预热的 pwsh）
Get-PSDrive -PSProvider FileSystem          ->  C/D 两个盘, 未见耗时问题但需 PS 进程
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"   ->  69.1 ms
Get-Volume                                  ->  2208.6 ms   ❌
cmd /c wmic logicaldisk get ...             ->  'wmic' is not recognized as an internal or external command  ❌
cmd /c mountvol                             ->  32.1 ms（但只输出用法，需参数）
```

**Node 原生（推荐）**：固定探测 A–Z，`statfs` 命中即存在，未命中报 `ENOENT`。

```
$ node "$env:TEMP\host-audit\disk.mjs"
probeFixed (26 letters, async statfs): 1.9 ms
[
  { "root": "C:\\", "total": 322128834560, "free": 71987404800, "type": 0, "totalGB": 300.01, "freeGB": 67.04 },
  { "root": "D:\\", "total": 700611293184, "free": 67667435520, "type": 0, "totalGB": 652.5,  "freeGB": 63.02 }
]
probeFixedSync: 0.2 ms
statfs C: raw: {"type":0,"bsize":4096,"blocks":78644735,"bfree":17575050,"bavail":17575050,"files":0,"ffree":0}
```

与系统真值交叉验证：`Get-PSDrive` 报 C 已用 233 GB / 可用 67 GB、D 已用 589.5 / 可用 63 —— 与 `statfs` 的 67.04 / 63.02 GiB 一致。`Win32_LogicalDisk` 的 `FreeSpace=71987466240` 比 `statfs` 的 `bsize*bavail=71987404800` 多 61440 B（15 个簇，采样瞬间差异，可忽略）。

**Node 版本确认**：本机 `v22.22.2`；`node -p "typeof require('node:fs').statfs"` → `function`，`Object.keys(fs).filter(/statfs/)` → `statfs,statfsSync`。`fs.statfs` 自 **Node 18.15.0 / 19.6.0** 起可用，`node:fs/promises` 只有 `statfs`（**没有** `statfsSync`，实测 `SyntaxError: The requested module 'node:fs/promises' does not provide an export named 'statfsSync'`）。

**可直接抄的片段**

```ts
import { statfs } from 'node:fs/promises'

/** Fixed-letter probe — Get-PSDrive (69 ms) / Get-Volume (2209 ms) are not worth the spawn. */
export async function readDrives(): Promise<Array<{ root: string; total: number; free: number; usedPercent: number }>> {
  const roots = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `${l}:\\`)
  const out = []
  for (const root of roots) {
    try {
      const s = await statfs(root)           // ENOENT(-4058) = 该盘符不存在
      const total = s.bsize * s.blocks
      const free = s.bsize * s.bavail        // bavail（非特权用户可用），不是 bfree
      out.push({ root, total, free, usedPercent: total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0 })
    } catch { /* 未挂载盘符：跳过 */ }
  }
  return out
}
```

- **权限**：不需要管理员。**安全软件**：不触碰。
- **可移植性**：`statfs` 跨平台（Linux/macOS 均可用，`bavail` 语义一致）；盘符字母枚举是 **Windows 专有**，非 win32 时应改为 `statfs('/')` 或解析 `/proc/mounts`。
- **cadence**：30 s 足够（容量变化慢）；实测 1.9 ms，甚至 5 s 也无压力。
- **注意**：`statfs.type=0`，**拿不到“是否可移动盘/网络盘”**（需 `Get-Volume` 的 `DriveType`，2208 ms，不值）。

---

### §1.2 DSH 自检（sessions / storages）

**命令**

```
$ node "$env:TEMP\host-audit\scandir.mjs" "D:\dsh-home\sessions" "D:\dsh-home\storages"
D:\dsh-home\sessions
  42 ms | files=338 dirs=339 bytes=340.8MiB errs=0
  1h: 6 files / 4.01MiB | 24h: 25 files / 14.72MiB | newest=2026-09-28T16:23:20.270Z
D:\dsh-home\storages
  15 ms | files=328 dirs=3 bytes=38.9MiB errs=0
  1h: 10 files / 29.07MiB | 24h: 29 files / 29.85MiB | newest=2026-09-28T16:23:19.430Z
```

三次重复的中位（`readdir(withFileTypes)` + `stat` 全量遍历）：

| 树 | 三次实测 | 中位 | 规模 |
|---|---|---|---|
| `sessions` | 42 / 39 / 41 ms | **41 ms** | 338–339 文件 / 340.8 MiB |
| `storages` | 15 / 13 / 13 ms | **13 ms** | 328 文件 / 38.9 MiB |

结构（供形状设计参考）：

```
sessions/<workspace-slug>/<session-id>/session.v3.jsonl.zstd
  -> 339 个 .zstd 文件, 341.4 MB, 扩展名只有 .zstd 一种（一个会话一个文件）
storages/usage-center/index.json   27.72 MB   <-- 占 storages 体积的 71%，且 1h 内被整体重写
storages/dsh-mem.json               1.28 MB
storages/session_projcache.json     0.87 MB
```

**可直接抄的片段**

```ts
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface TreeStat {
  files: number; bytes: number
  /** 按 mtime 分桶（无状态，但语义是“最近被写过”，不是“净增长”）。 */
  last1h: { files: number; bytes: number }
  last24h: { files: number; bytes: number }
  newestMs: number
}

export async function scanTree(root: string): Promise<TreeStat> {
  const now = Date.now()
  const out: TreeStat = { files: 0, bytes: 0, last1h: { files: 0, bytes: 0 }, last24h: { files: 0, bytes: 0 }, newestMs: 0 }
  const stack: string[] = [root]
  while (stack.length > 0) {
    const dir = stack.pop()!
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { continue }   // 单个目录失败不拖垮整树
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { stack.push(p); continue }
      if (!e.isFile()) continue
      try {
        const st = await stat(p)
        out.files++; out.bytes += st.size
        if (st.mtimeMs > out.newestMs) out.newestMs = st.mtimeMs
        const age = now - st.mtimeMs
        if (age < 3_600_000) { out.last1h.files++; out.last1h.bytes += st.size }
        if (age < 86_400_000) { out.last24h.files++; out.last24h.bytes += st.size }
      } catch { /* 遍历途中被删：忽略 */ }
    }
  }
  return out
}
```

该片段是本报告实测脚本 `%TEMP%\host-audit\scandir.mjs` 的工作版（实测输出见上）；串行 `await stat` 在这里够用（41 ms），要再快就换 `opendir` 或并发 `Promise.all` 分批，但没必要。

**更优写法（已与并行开发的 `src/host/machine.ts` 交叉验证）**：Node 20+ 的 `readdir(root, { recursive: true, withFileTypes: true })` 一次拿全树，比显式栈快约 20%，且结果逐字节一致：

```
stack walk                   median=32ms runs=[31,32,33] -> {"files":339,"bytes":358179743} OK
readdir recursive            median=26ms runs=[25,26,27] -> {"files":339,"bytes":358179743} OK
entry.parentPath available: string    (Node 22.22.2)
```

即 `join(e.parentPath ?? root, e.name)` 即可复原全路径，无需自己维护目录栈。**推荐用这一版。**

- **缓存判断**：36–42 ms 全量遍历，**完全可以直接挂在 60 s TTL 上**，不需要目录 mtime 指纹或增量索引（对比：本仓库 RailWave/collector 那类热路径才需要）。
- **增长率语义**：「1h/24h」用 mtime 分桶是**无状态**的，但 `session.v3.jsonl.zstd` 是**整体重写**而非 append，所以该数字表示「最近被写过的文件及其当前大小」，**不等于净增量**。要真正的「增速」需保存上一次的 `{files,bytes,ts}` 基线做差分（与 §1.3 网络速率同一套 `last` 状态形状）。
- **权限/AV**：不需要管理员；`D:\dsh-home` 下无 AV 拦截迹象（errs=0）。
- **可移植性**：纯 `node:fs`，跨平台（路径从 HostContext / `DSH_HOME` 取，不要硬编码 `D:\dsh-home`）。

---

### §1.3 网络吞吐

**候选方案实测（Node execFile，中位 3 次）**

| 方案 | 中位 | 三次 | 结论 |
|---|---|---|---|
| `netstat.exe -e` | **29 ms** | 27/29/32 | 最快，但**数值错误** ❌ |
| `Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface`（PS） | **353 ms** | 352/353/360 | ✅ **选中**（按网卡、准确） |
| `Get-NetAdapterStatistics`（PS） | **799 ms** | 777/799/953 | 准确但慢一倍 |
| `typeperf -sc 1` | 1216 ms | — | ❌ |
| `Get-Counter '\Network Interface(*)\Bytes Received/sec'` | 2012 ms | — | ❌ |
| 常驻 PS 子进程（每 500 ms 自采样） | **边际 ~30 ms/次** | 间隔 519–534 ms | 可选优化，需生命周期管理 |
| 参照：`powershell.exe -c 0` 空跑 | **270 ms** | 255/270/284 | ← PS 的 spawn 地板，解释了上面所有数字 |
| 参照：`cmd /c echo.` | 26 ms | 23/26/29 | |
| 参照：`node -e 0` | 49 ms | 48/49/50 | |

原始输出样本：

```
$ node -e "..." # 见 %TEMP%\host-audit\bench-all.mjs
== Win32_PerfRawData_Tcpip_NetworkInterface
   median=353ms runs=[352,353,360] outlen=220
   -> [{"Name":"Realtek Gaming 2.5GbE Family Controller","BytesReceivedPersec":0,"BytesSentPersec":0},
       {"Name":"MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card","BytesReceivedPersec":1720901522,"BytesSentPersec":928560759}]

$ netstat -e
   median=29ms runs=[27,29,32] outlen=330
```

注意 `Win32_PerfRawData_*` 里的 `BytesReceivedPersec` 名字骗人：它是**累积计数器**（与 `Get-NetAdapterStatistics.ReceivedBytes` 同一量级、同一含义），需要自己两次采样做差。

**为什么不能用 `netstat -e`（关键证据）**：受控下载 4,012,608 B（`registry.npmjs.org/.../dsh-widgets-1.6.1.tgz`），同时段对比：

```
download: {"status":200,"bytes":4012608,"ms":3387}
  netstat   dRx = 31290156 dTx = 1025358     <-- 31.3 MB，虚高 6.0 倍
  adapters  dRx sum = 5227563               <-- 5.2 MB，与实际下载量吻合
     WLAN: dRx=5227563 dTx=173435
     Tailscale: dRx=0 dTx=0   （以太网：dRx=0 dTx=0，Disconnected）
```

即 `netstat -e` 既不是「所有网卡之和」（同一时刻它 1684772709 < WLAN 单独的 1711727803），也不是单网卡值 —— **作为吞吐信号不可用**。另有解析风险：它的表头是**本地化**的（本机 execFile 直出为 `接口统计 / 接收的 / 发送的 / 字节`，即 GBK 字节流被 UTF-8 解码成乱码），**不能按 "Bytes" 字符串解析**。

**可直接抄的片段**

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)

interface NicSample { name: string; rx: number; tx: number }
/** Cumulative per-adapter counters. ~353 ms (powershell spawn floor is ~270 ms). */
export async function readNicCounters(): Promise<NicSample[]> {
  const { stdout } = await execFileP('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | Select-Object Name,BytesReceivedPersec,BytesSentPersec | ConvertTo-Json -Compress',
  ], { timeout: 10_000, windowsHide: true, maxBuffer: 1 << 20 })
  const raw = stdout.trim()
  if (raw === '') return []                      // 无网卡实例时 ConvertTo-Json 输出空串，JSON.parse 会抛
  const rows = JSON.parse(raw) as Array<{ Name: string; BytesReceivedPersec: number; BytesSentPersec: number }>
  return (Array.isArray(rows) ? rows : [rows]).map((r) => ({ name: r.Name, rx: r.BytesReceivedPersec, tx: r.BytesSentPersec }))
}

/** 差分的状态形状：与 sysinfo 的 lastCpu 同型，一次采样既是“值”也是“基线”。 */
interface NicDiffState { ts: number; total: { rx: number; tx: number }; per: Map<string, { rx: number; tx: number }> }
let lastNic: NicDiffState | null = null

export function diffNic(samples: NicSample[], now: number) {
  const total = samples.reduce((a, s) => ({ rx: a.rx + s.rx, tx: a.tx + s.tx }), { rx: 0, tx: 0 })
  let rxBps: number | null = null, txBps: number | null = null
  if (lastNic !== null) {
    const dt = (now - lastNic.ts) / 1000
    if (dt > 0) {
      rxBps = Math.max(0, Math.round((total.rx - lastNic.total.rx) / dt))
      txBps = Math.max(0, Math.round((total.tx - lastNic.total.tx) / dt))
    }
  }
  lastNic = { ts: now, total, per: new Map(samples.map((s) => [s.name, { rx: s.rx, tx: s.tx }])) }
  return { rxBps, txBps, rxTotal: total.rx, txTotal: total.tx }
}
```

- **⚠️ 计数器回绕/重置**：网卡重连（本机 Wi-Fi 会掉）会让累积值归零 → 差分为负。片段里 `Math.max(0, ...)` 只是兜底，更稳的做法是检测 `cur < prev` 时把该次速率置 `null` 并重设基线。
- **权限**：不需要管理员。**安全软件**：会连开 `powershell.exe`，AV 可能记录；本机 `MsMpEng` 在跑，未见拦截。
- **可移植性**：**只有 Windows 有**这一路径（Linux 读 `/sys/class/net/*/statistics/{rx,tx}_bytes`，macOS 无免特权源）。
- **cadence**：353 ms 决定了它**不能**进 1 s 缓存路径。建议 **2 s TTL**（差分窗口 ≥2 s，速率才有意义）。若与 CPU/内存同屏，用 stale-while-revalidate 让它异步刷新（§2.1）。

---

### §1.4 供电 / 电池

**本机结论：笔记本**（`RTX 5070 Ti **Laptop** GPU` + 存在 `Win32_Battery` 实例 `internal battery / 内部电池`）。

```
$ node bench-all.mjs
== battery
   median=369ms runs=[344,369,374] outlen=120
   -> {"Name":"standard","BatteryStatus":2,"EstimatedChargeRemaining":100,"EstimatedRunTime":71582788,"DesignVoltage":16607}

== powercfg /getactivescheme
   median=22ms runs=[21,22,23] outlen=57
   -> 电源方案 GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (平衡)
```

完整记录（`Get-CimInstance Win32_Battery | Format-List *`）：

```
Caption : 内部电池        Description : 内部电池        Name : standard        Status : OK
Availability : 2          BatteryStatus : 2            EstimatedChargeRemaining : 100
EstimatedRunTime : 71582788                        <-- 哨兵值！不是 71582788 分钟
DesignVoltage : 16607     Chemistry : 2              FullChargeCapacity / TimeOnBattery : 空
```

- `BatteryStatus`：**2 = AC 供电（插电）**。1 = 放电中，4/5/6/7/8/9/11 各有含义，UI 只需区分 `ac: BatteryStatus !== 1`。
- `EstimatedRunTime`：**`71582788 = 0x04444444` 是「交流供电 / 未知」哨兵**，不是真实分钟数。放电时才是分钟；必须 `> 6000` 或 `=== 0x4444444` 时置 `null`，否则 UI 会显示「剩余 71582788 分钟」。

**不可用的两个替代**：

```
Win32_PowerPlan: 68.2 ms ->
ERROR: 在终端服务远程会话期间，只有管理员有添加、删除或配置服务器软件的权限。……
        （即 root\cimv2\power 需要管理员，非管理员下整类查询失败）
MSAcpi_ThermalZoneTemperature (root/wmi): 127.2 ms -> 无实例（空结果，非报错）
```

**可直接抄的片段**

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)

export interface BatteryInfo { present: boolean; ac: boolean; percent: number; minutesLeft: number | null }

/** ~369 ms. Emits battery:null (present:false) on desktops / when the CIM class is absent. */
export async function readBattery(): Promise<BatteryInfo | null> {
  const { stdout } = await execFileP('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_Battery | Select-Object BatteryStatus,EstimatedChargeRemaining,EstimatedRunTime | ConvertTo-Json -Compress',
  ], { timeout: 10_000, windowsHide: true })
  const raw = stdout.trim()
  if (raw === '') return null                       // 无实例 -> 空串 -> JSON.parse 会抛（已实测）
  const row = JSON.parse(raw) as { BatteryStatus?: number; EstimatedChargeRemaining?: number; EstimatedRunTime?: number }
  const status = row.BatteryStatus ?? 0
  const ac = status !== 1
  const rt = row.EstimatedRunTime ?? 0
  // 0x04444444 (71582788) = AC/unknown sentinel; 0 也当未知
  const minutesLeft = !ac || rt === 0 || rt >= 5_000_000 ? null : rt
  return { present: true, ac, percent: row.EstimatedChargeRemaining ?? 0, minutesLeft }
}
// 电源方案（更快、更稳，22 ms）：execFileP('powercfg.exe', ['/getactivescheme'])
//   stdout = '电源方案 GUID: <guid>  (平衡)' —— 取括号内容；同样受本地化影响，建议只报 GUID。
```

- **权限**：`Win32_Battery`、`powercfg` 均**不需要管理员**；`Win32_PowerPlan` **需要**（实测权限错）。
- **可移植性**：Windows 专有（Linux 读 `/sys/class/power_supply/*`）。
- **cadence**：60 s（电量变化慢）。369 ms 的代价放在 60 s TTL 上完全可接受。

---

### §1.5 Top 进程 + 显存

```
== top-processes (Get-Process)
   median=337ms runs=[333,337,357] outlen=361
   -> [{"Name":"Memory Compression","Id":4080,"ws":1745072128},
       {"Name":"msedge","Id":33100,"ws":627523584},
       {"Name":"node","Id":28536,"ws":546213888},      <-- 就是 dsh web 自己
       {"Name":"MsMpEng","Id":5712,"ws":432734208},
       {"Name":"QQ","Id":14904,"ws":...}]

== tasklist /fo csv /nh
   median=500ms runs=[495,500,537] outlen=18022 -> "System Idle Process","0","Services","0","8 K"   ❌ 更慢

== nvidia-smi compute-apps
   median=48ms runs=[47,48,57] outlen=52
   -> "31784, D:\Program Files\Tencent\QQNT\QQ.exe, [N/A]"

== nvidia-smi --query-gpu=...
   median=47ms -> "NVIDIA GeForce RTX 5070 Ti Laptop GPU, 122, 12227, 0, 46, 5.88"
```

**⚠️ 显存占用拿不到（重要否定结论）**。本机 GPU 工作在 **WDDM** 模式，`nvidia-smi` 全量输出里每进程显存就是 `N/A`：

```
$ nvidia-smi            (195.1 ms)
|   0  NVIDIA GeForce RTX 5070 ...  WDDM  | ... |
| Processes:                                                                    |
|    0   N/A  N/A           31784    C+G   ...ram Files\Tencent\QQNT\QQ.exe      N/A      |
$ nvidia-smi pmon -c 1  (73.1 ms)
    0      31784   C+G      -      -      -      -      -      -    QQ.exe
```

`--query-compute-apps=pid,process_name,used_memory` 返回 `[N/A]`，以及 TCC 模式下才有的真实 MB 值。**在 WDDM（消费级 Windows 的默认模式）下，按进程显存占用不可得**；只有 GPU **总量** `memory.used / memory.total`（122 / 12227 MiB）可靠 —— 这正是现有 `sysinfo.ts` 已经在做的。

**可直接抄的片段**

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)

/** ~337 ms via PowerShell (or ~337 ms + sorting in JS). Top-N by working set. */
export async function readTopProcesses(n = 8): Promise<Array<{ name: string; pid: number; wsMB: number }>> {
  const { stdout } = await execFileP('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    'Get-Process | Sort-Object -Descending WorkingSet64 | Select-Object -First 8 Name,Id,@{n="ws";e={$_.WorkingSet64}} | ConvertTo-Json -Compress',
  ], { timeout: 10_000, windowsHide: true })
  const raw = stdout.trim()
  if (raw === '') return []
  const rows = JSON.parse(raw)
  return (Array.isArray(rows) ? rows : [rows]).map((r: { Name: string; Id: number; ws: number }) =>
    ({ name: r.Name, pid: r.Id, wsMB: Math.round(r.ws / 1048576) }))
}

/** ~48 ms, cross-platform. usedMem is null on WDDM (nvidia-smi prints "[N/A]"). */
export async function readGpuApps(): Promise<Array<{ pid: number; name: string; usedMemMB: number | null }>> {
  try {
    const { stdout } = await execFileP('nvidia-smi', [
      '--query-compute-apps=pid,process_name,used_memory', '--format=csv,noheader,nounits',
    ], { timeout: 3000, windowsHide: true })
    return stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const [pid, name, mem] = line.split(',').map((s) => s.trim())
      return { pid: Number(pid), name: name ?? '', usedMemMB: /^\d+$/.test(mem ?? '') ? Number(mem) : null }
    })
  } catch { return [] }        // 无驱动/无 nvidia-smi -> 空数组，永不抛
}
```

- **权限**：不需要。**AV**：`Get-Process` 会读取所有进程的工作集，通常无害；本机 `MsMpEng` 未被拦。
- **可移植性**：`Get-Process` Windows 专有（Linux 读 `/proc/*/statm`，更快）；`nvidia-smi` 跨平台。
- **cadence**：5–10 s。337 ms 必须走异步刷新；不建议进 1 s。

---

### §1.6 本地服务健康（TCP 探活 + 端口表）

**TCP 探活（`node:net`）实测**

```
$ node "$env:TEMP\host-audit\netprobe.mjs"
tcp DSH web    127.0.0.1:3080   open      1.3 ms
tcp Ollama     127.0.0.1:11434  open      0.5 ms
tcp LM Studio  127.0.0.1:1234   refused   0.6 ms     <-- LM Studio 未运行
tcp xray proxy 127.0.0.1:10808  open      0.3 ms
tcp generic    127.0.0.1:8080   refused   0.3 ms
tcp clash      127.0.0.1:7890   refused   0.2 ms
tcp unused     127.0.0.1:9999   refused   0.4 ms
all tcp probes total: 5 ms (sequential)
parallel: 2 ms -> oororrr
```

`refused` 与 `timeout` 的区分天然由 `error.code === 'ECONNREFUSED'` vs `socket` timeout 给出 —— 这正是「服务没开」与「防火墙静默丢包」的分界。

**本机实际监听的本地端口表**（`Get-NetTCPConnection -State Listen`，596 ms，含进程名；`netstat -ano` 版本 32 ms）

两次快照（间隔 12 s）**36 个端口完全一致，零漂移**：

| 端口 | 绑定 | 进程 | 对 coding agent 的意义 | 稳定性 |
|---|---|---|---|---|
| **3080** | 127.0.0.1 | node（PID 28536） | **DSH web 本体** | 稳定（dsh 运行期） |
| **10808** | 127.0.0.1 | **xray** | **代理出口（http + socks5）** | 稳定（手动开着） |
| **11434** | :: (0.0.0.0) | **ollama** | Ollama 服务 | 稳定 |
| 52210 | 127.0.0.1 | ollama app | Ollama 托盘/UI | 稳定 |
| 1234 | — | — | **LM Studio：未运行** | 缺席 |
| 4001 / 4301 / 4310 / 5283 / 9210 | 127.0.0.1 | QQ | 无关 | 稳定 |
| 14013 / 14016 / 14019 / 14022 / 14023 | 127.0.0.1 | Weixin | 无关 | 稳定 |
| 9080 | 127.0.0.1 | NahimicService | 音频驱动 | 稳定 |
| 18488 / 54844 / 60928 / 64876 | 127.0.0.1 | WorkBuddy | 无关 | 稳定 |
| 19234 | 127.0.0.1 | browser-bridge | 无关 | 稳定 |
| 39099 | 127.0.0.1 | editor_sdk | 无关 | 稳定 |
| 51000 | 127.0.0.1 | TRAE SOLO CN | 无关 | 稳定 |
| 13688 | 0.0.0.0 + :: | GCUBridge | 无关 | 稳定 |
| 62305 / 62551 | 127.0.0.1 | GameViewerServer | 无关 | 稳定 |
| 135 / 445 / 5040 / 5357 / 7680 | 0.0.0.0 或 :: | svchost / System | 系统（RPC/SMB/WinRM 等） | 稳定 |
| 49664–49671 | 0.0.0.0 或 :: | lsass / wininit / svchost / spoolsv / services | 系统 RPC 动态端口 | 稳定（重启后变） |

**结论**：对这台机器**只有 4 个端口值得做成 widget**：`3080`（DSH web）、`11434`（Ollama）、`10808`（代理）、`1234`（LM Studio，当前缺席 → 正好演示 `stopped` 状态）。其余要么是系统 RPC，要么是无关应用，做成表格只会噪声。

**可直接抄的片段**

```ts
import net from 'node:net'

export interface PortProbe { label: string; host: string; port: number; status: 'open' | 'refused' | 'timeout' | 'error'; ms: number }

/** ~0.2–1.4 ms per port; run the set with Promise.all. Never throws. */
export function probeTcp(label: string, host: string, port: number, timeoutMs = 800): Promise<PortProbe> {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const sock = new net.Socket()
    let settled = false
    const finish = (status: PortProbe['status']) => {
      if (settled) return
      settled = true
      sock.destroy()
      resolve({ label, host, port, status, ms: Date.now() - t0 })
    }
    sock.setTimeout(timeoutMs)
    sock.once('connect', () => finish('open'))
    sock.once('timeout', () => finish('timeout'))          // 静默丢包 / 防火墙 DROP
    sock.once('error', (e) => finish((e as NodeJS.ErrnoException).code === 'ECONNREFUSED' ? 'refused' : 'error'))
    sock.connect(port, host)
  })
}

/** Listening table: netstat -ano (32 ms) beats Get-NetTCPConnection (596 ms) 18x.
 *  Header is LOCALISED (this box prints 侦听 / LISTENING) -> match both. */
export async function readListenPorts(): Promise<Array<{ port: number; pid: number }>> {
  const { stdout } = await execFileP('netstat.exe', ['-ano'], { windowsHide: true, maxBuffer: 8 << 20 })
  const seen = new Map<number, number>()
  for (const line of stdout.split(/\r?\n/)) {
    if (!/LISTENING|侦听/i.test(line)) continue
    const m = /:(\d+)\s+(\d+)\s*$/.exec(line.trim())
    if (m) seen.set(Number(m[1]), Number(m[2]))
  }
  return [...seen].map(([port, pid]) => ({ port, pid }))
}
```

- **权限**：TCP connect 不需要任何权限；`netstat -ano` 不需要管理员。
- **可移植性**：TCP 探活跨平台；`netstat -ano` 的**表头本地化**，必须双语匹配或按结构解析（见片段）。
- **cadence**：探活 5 s（成本 2–3 ms，可进 1 s 缓存）；端口表 30 s（32 ms，不必频繁）。

---

### §1.7 代理出口健康（127.0.0.1:10808）

**TCP 握手**：`0.3 ms`（`open`）。

**HTTP 代理 CONNECT**：**不能用**——

```
CONNECT ok        {"status":"tunnel-open","ms":2.2,"head":"HTTP/1.1 200 Connection established"}
CONNECT bad-dns   {"status":"tunnel-open","ms":0.9,...}     <-- 不存在的域名，照样 200
CONNECT dead-port {"status":"tunnel-open","ms":0.7,...}     <-- 目标端口 9，照样 200
CONNECT 到关闭的代理端口 {"status":"error:ECONNREFUSED","ms":0.5}
```

xray 的 HTTP inbound **在拨号上游之前就回 `200 Connection established`**，所以 CONNECT 只证明「代理进程活着且 HTTP inbound 在工作」（而且很快，0.7–2.2 ms），**不证明出口通**。

**真实出口探针（HTTP 绝对 URI GET）** —— 8 次，中间隔 400 ms：

```
{"status":"http-204","ms":896.6}  {"status":"http-204","ms":994.7}  {"status":"http-204","ms":898.8}
{"status":"http-204","ms":1311}   {"status":"http-204","ms":3595.6} {"status":"http-204","ms":1006.4}
{"status":"http-204","ms":1866.3} {"status":"http-204","ms":1940.5}
success 8 /8   ms sorted: 896.6, 898.8, 994.7, 1006.4, 1311, 1866.3, 1940.5, 3595.6
median 1311
direct (no proxy): {"status":"http-204","ms":90.2}
```

`http://www.gstatic.com/generate_204` 与 `http://cp.cloudflare.com/generate_204` 都是 **HTTP 204**，可作为「出口 OK」判据（204 且 0 字节）。直连同一目标 90 ms → **代理链路额外开销 ≈ 0.8–3.5 s**，且抖动很大。

**失败模式区分（实测矩阵）**

| 观测 | 含义 |
|---|---|
| `error:ECONNREFUSED`（TCP 阶段，0.3–0.5 ms） | **端口不通**：代理进程没起 / 端口错 |
| CONNECT 回 `200` | 代理 HTTP inbound 活着（**不能判出口**） |
| CONNECT 回 4xx/5xx | 「**代理拒绝**」（本机 xray 未观察到，样本留空） |
| GET 成功 `http-204` | 出口 OK |
| GET `error:ECONNRESET`（**1.2 ms 内**） | DNS 解析失败 / 路由拒绝（`no-such-host-zzz.invalid` 实测 0.3 ms RST）；**但也可能是 keep-alive 复用毛刺** —— 未加 `Connection: close` 时，紧接成功请求的第二次同目标请求会 1.2 ms RST。**探针必须带 `Connection: close`，否则误报** |
| GET `timeout`（>8 s） | 「**出口不可达**」/上游挂起 |

**可直接抄的片段**

```ts
import net from 'node:net'
import http from 'node:http'

export type ProxyVerdict = 'ok' | 'proxy-down' | 'blocked' | 'unreachable'

/** Full proxy health: TCP handshake (~0.3 ms) then a REAL egress round trip (0.9–3.6 s).
 *  MUST run off the request path — never inside a 1 s-cached handler. */
export async function probeProxy(host = '127.0.0.1', port = 10808, timeoutMs = 8000): Promise<{
  verdict: ProxyVerdict; tcpMs: number | null; exitMs: number | null; httpStatus: number | null
}> {
  const t0 = Date.now()
  const tcp = await new Promise<boolean>((resolve) => {
    const s = new net.Socket()
    let done = false
    const fin = (ok: boolean) => { if (done) return; done = true; s.destroy(); resolve(ok) }
    s.setTimeout(800); s.once('connect', () => fin(true)); s.once('timeout', () => fin(false))
    s.once('error', () => fin(false)); s.connect(port, host)
  })
  const tcpMs = Date.now() - t0
  if (!tcp) return { verdict: 'proxy-down', tcpMs, exitMs: null, httpStatus: null }

  // Absolute-URI GET through the HTTP proxy. Connection: close avoids the keep-alive RST false alarm.
  const url = 'http://www.gstatic.com/generate_204'
  const exit = await new Promise<{ status: number | null; kind: 'ok' | 'timeout' | 'reset' | 'error' }>((resolve) => {
    const t = Date.now()
    const req = http.request({ host, port, method: 'GET', path: url, headers: { Host: new URL(url).host, Connection: 'close' } })
    let done = false
    const fin = (status: number | null, kind: 'ok' | 'timeout' | 'reset' | 'error') => {
      if (done) return; done = true; req.destroy(); resolve({ status, kind, ms: Date.now() - t } as never)
    }
    req.setTimeout(timeoutMs, () => fin(null, 'timeout'))
    req.on('error', (e: NodeJS.ErrnoException) => fin(null, e.code === 'ECONNRESET' ? 'reset' : 'error'))
    req.on('response', (res) => { res.resume(); res.on('end', () => fin(res.statusCode ?? null, 'ok')) })
    req.end()
  })
  const exitMs = (exit as unknown as { ms: number }).ms
  if (exit.kind === 'ok' && exit.status === 204) return { verdict: 'ok', tcpMs, exitMs, httpStatus: 204 }
  if (exit.kind === 'ok') return { verdict: 'blocked', tcpMs, exitMs, httpStatus: exit.status }
  if (exit.kind === 'timeout') return { verdict: 'unreachable', tcpMs, exitMs, httpStatus: null }
  return { verdict: 'blocked', tcpMs, exitMs, httpStatus: null }   // reset / error
}
```

- **权限**：不需要。**安全软件**：出网请求可能被 AV/防火墙拦，探针失败要落到 `unreachable` 而不是抛错。
- **可移植性**：跨平台（代理地址需配置化）。
- **⚠️ 环境变量**：实测 dsh 进程环境里**没有** `HTTP_PROXY / HTTPS_PROXY / ALL_PROXY`（只有空的 `npm_config_noproxy`）→ **不能依赖环境变量发现代理**，必须硬编码候选（10808 / 7890 / 8080）或读插件设置。
- **cadence**：60 s，超时 8 s，**异步刷新**。
- **隐私**：探针只发 `GET /generate_204`，无凭据、无 body、无用户数据；响应体长度 0。符合「不发敏感数据」。

---

### §1.8 Web 进程自身

**确认：host 就跑在 `dsh web` 进程里**。证据链：

```
# 1) 当前工具 shell 的祖先链（Get-CimInstance Win32_Process 逐级上溯）
35040 powershell.exe :: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoLogo -NoProfile ...
37128 node.exe       :: D:\tools\node\node.exe ...\@deepseek-ai\dsh-subprocess-local\lib\runner.js ...
28536 node.exe       :: "node" "...\node_modules\.bin\..\@deepseek-ai\dsh\lib\bin.js" web     <-- dsh web
8800  cmd.exe        :: C:\Windows\system32\cmd.exe /d /s /c dsh web
5748  node.exe       :: "D:\tools\node\\node.exe" "...\npm\bin\npx-cli.js" -y @deepseek-ai/dsh@0.1.5-rc.2 web

# 2) 自证：host 进程身份查询（median 423 ms）
$ Get-CimInstance Win32_Process -Filter "ProcessId=28536"
  {"ProcessId":28536,"Name":"node.exe","WorkingSetSize":546848768,
   "CommandLine":"\"node\" \"...\@deepseek-ai\dsh\lib\bin.js\" web"}

# 3) 本机全部 node.exe 只有 4 个：11292(Chrome native host) / 5748(npx) / 28536(dsh web) / 37128(工具 subprocess runner)
# 4) 插件 host 装载器 @deepseek-ai/dsh-cordis-host-runner 内 grep worker_threads|child_process|new Worker|spawn -> 无匹配
```

→ **`process.pid === 28536`**，`process.uptime()` = `dsh web` 的启动时长（实测 14059.8 s），`process.memoryUsage().rss` = **整个 harness 的 RSS（444–546 MB，含所有插件、会话、前端静态资源）**，不是 widgets 自身的足迹。

```
$ node -e "..."   # 500 ms 窗口内的同型调用
demo process metrics in a 500ms window:
 pid 25452 uptime_s 0.52
 cpuUsage diff: user_ms 0.00 system_ms 0.00
 memoryUsage: rss_MB 52.7 heapUsed_MB 3.6 external_MB 1.3 arrayBuffers_MB 0.0
 rss vs heap ratio 14.59
```

注意 `rss / heapUsed ≈ 15x` —— V8 的 RSS 大头是未归还的堆页 + native 层，**用 rss 描述「插件占了多少」会严重高估**。

**可直接抄的片段**

```ts
/** ~0 ms. Runs in the dsh web process itself (verified PID 28536 = `dsh web`). */
let lastCpuSelf: NodeJS.CpuUsage | null = null
export function readSelfMetrics() {
  const now = Date.now()
  const cpu = process.cpuUsage()                       // 累积 µs（user/system），全进程
  let cpuUserMs: number | null = null, cpuSysMs: number | null = null
  if (lastCpuSelf !== null) {
    const d = process.cpuUsage(lastCpuSelf)            // 传上一次快照即得差分（Node 原生支持）
    cpuUserMs = Math.round(d.user / 1000)
    cpuSysMs = Math.round(d.system / 1000)
  }
  lastCpuSelf = cpu
  const mu = process.memoryUsage()
  return {
    pid: process.pid,
    uptimeS: Math.round(process.uptime()),             // = dsh web 的启动时长
    rssMB: Math.round(mu.rss / 1048576),               // ⚠️ 整个 harness，不是本插件
    heapUsedMB: Math.round(mu.heapUsed / 1048576),
    externalMB: Math.round(mu.external / 1048576),
    cpuUserMs, cpuSysMs, ts: now,
  }
}
```

- **权限/AV**：无。
- **可移植性**：100% 跨平台。
- **cadence**：5 s（成本 ~0）。`process.cpuUsage(prev)` 的差分与 `sysinfo.ts` 里 `lastCpu` 的 CPU 利用率差分是两套口径（一个是**自己进程**，一个是**机器**），可同屏对照。

---

### §1.9 附加发现：温度（与本仓库既有注释冲突）

`sysinfo.ts` 第 17–19 行写着「Windows exposes no reliable, privilege-free CPU temperature source（researched, abandoned）」。本次实测发现**一个非管理员可用的活源**：

```
$ Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ThermalZoneInformation
Name          HighPrecisionTemperature Temperature
\_TZ.TZ01                       3370         337
\_SB.ECTZ                       3372         337

# 非管理员（isAdmin=False），345 ms 中位（3 次：340/345/411）
# 加载 4 个 worker 线程跑满 CPU 后连续采样：
[{"Name":"\\_TZ.TZ01","HighPrecisionTemperature":3374},{"Name":"\\_SB.ECTZ","HighPrecisionTemperature":3382}]
[{"Name":"\\_TZ.TZ01","HighPrecisionTemperature":3392},{"Name":"\\_SB.ECTZ","HighPrecisionTemperature":3392}]  <- 负载后 +2 °C
```

`HighPrecisionTemperature` 单位是 **0.1 K**（3370 → 63.85 °C）。

- **可行性**：✅ 本机可用、可读、**随负载变化**（不是静态假值）。
- **⚠️ 但它不是核心温度**：`\_TZ.TZ01` 是 ACPI 热区、`\_SB.ECTZ` 是嵌入式控制器热区，粒度 0.1 K、响应慢（数秒），**不同机型上可能缺失、可能恒为常数、也可能报的是主板而非 CPU**。
- **对照失败项**：`MSAcpi_ThermalZoneTemperature`（`root/wmi`）127 ms 返回**空实例**。
- **建议**：若要加，形状必须是 `{ zones: [{name, celsius}] }` 并允许 `[]`，**不要**标成「CPU 温度」；同时把 `sysinfo.ts` 那段注释更新为「per-core 温度无免特权源；ACPI 热区可用但语义不同」。

---

## §2 建议的 host 模块划分与缓存策略

### §2.1 组合根：一个路由 + 分节 TTL + stale-while-revalidate

全部项跑一遍 **冷 1569 ms / 热 1314 ms**（实测），而现有 `sysinfo.ts` 的模型是「~1 s 缓存，命中就直接回」。**直接把所有项塞进一个同步 handler 会毁掉 1 s 模型**（一次冷启动阻塞 1.5 s，浏览器 1 s 轮询会立刻堆积）。

推荐结构：

```
src/host/probe/
  cache.ts       ← 通用 section cache：TTL + stale-while-revalidate + 单飞（in-flight 合并）
  disk.ts        ← statfs 盘符        TTL 30s   1.9ms
  dsh-home.ts    ← sessions/storages  TTL 60s   54ms (41+13)
  net.ts         ← 网卡差分           TTL 2s    353ms   ⚠️ 最重
  power.ts       ← 电池 + 方案        TTL 60s   391ms
  procs.ts       ← top N + GPU apps   TTL 5s    385ms
  services.ts    ← TCP 探活 + 端口表  TTL 5s/30s  3ms / 32ms
  proxy.ts       ← TCP→CONNECT→GET    TTL 60s   0.3–4000ms  ⚠️ 必须后台
  self.ts        ← process.*          TTL 5s    ~0ms
  thermal.ts     ← ACPI 热区（可选）  TTL 30s   345ms
```

**核心契约**（与现有 `sysinfo.ts` 的 `cache = { ts, payload }` 同型，但每节独立）：

```ts
interface Section<T> { ttlMs: number; value: T | null; ts: number; inflight: Promise<void> | null }
function get<T>(s: Section<T>, load: () => Promise<T>): T | null {
  const now = Date.now()
  if (s.value !== null && now - s.ts < s.ttlMs) return s.value        // 新鲜 -> 直接给
  if (s.inflight === null) {                                          // 过期 -> 后台刷新，本次仍给旧值
    s.inflight = load().then((v) => { s.value = v; s.ts = Date.now() })
      .catch(() => { /* 保留上一次的好值；永不把 null 写成 payload */ })
      .finally(() => { s.inflight = null })
  }
  return s.value                                                       // 首次为 null -> UI 显示 pending
}
```

要点：

1. **handler 永不 await 重活**：响应时间恒为「JSON.stringify(cached)」≈ 0.1–1 ms。冷启动第一帧各节为 `null`，前端显示骨架，1–2 帧后到位。
2. **单飞**：`inflight` 合并并发请求；`proxy` 这种 4 s 的项必须如此，否则 60 s 内多个 widget 会各开一条。
3. **PowerShell 串行队列**：全局最多 1 个 `powershell.exe`（`battery`+`net`+`procs`+`thermal` 若同时过期就是 4 个 350 ms 的进程，≈1.4 s 的 CPU/句柄峰值）。用一条 Promise 链把 spawn 串起来，或直接合并成**一次** PS 调用返回多节 JSON。
4. **合并 PS 调用（推荐优化）**：`battery / procs / thermal / net` 四个都用 PS → 实测「4 个独立 spawn」≈ 4×340 ms；合并成 1 个脚本输出一个 JSON ≈ **350–450 ms 一次搞定**（省掉 3×270 ms 的 spawn 地板）。这是本报告最值钱的一条性能结论。
5. **绝不在同一 handler 里既 spawn 又 await 4 s**。

### §2.2 实测依据

```
--- cold (first ever call in this process) ---
  disk statfs C:+D:              1 ms
  sessions scan                 36 ms
  net (perfraw via ps)         396 ms
  battery (CIM via ps)         412 ms
  top processes (via ps)       572 ms
  nvidia-smi gpu+apps          114 ms
  listen ports (netstat -ano)   35 ms
  tcp 4 ports parallel           3 ms
  TOTAL 1569 ms
--- warm (immediately after) ---
  ... TOTAL 1314 ms
```

### §2.3 路由形态（建议）

- 保持**一个** `/api/sysinfo` 不变（1 s，CPU/内存/GPU/历史环形缓冲）。
- 新增**一个** `/api/host/overview`：返回 `{ ts, disk, dshHome, net, power, procs, services, proxy, self, thermal }`，各节独立 TTL。
- 或者按 cadence 拆成 2–3 条路由（`/api/host/fast` 1 s、`/api/host/slow` 30 s）。**不推荐每项一条路由** —— 浏览器要为每项维护一个定时器，且 host 侧的单飞/串行队列会退化。
- `proxy` 那一节**首帧可能 60 s 内都是 `null`**（首次探测跑 0.9–4 s），UI 必须把 `null` 渲染成「检测中」而不是「不可用」。

---

## §3 不建议做的项与理由

| 项 | 实测证据 | 结论 |
|---|---|---|
| **`netstat -e` 作为吞吐源** | 受控下载 4.01 MB，网卡 dRx=5.23 MB 而 netstat dRx=**31.29 MB（6.0×）**；同一时刻 1684772709 < 单网卡 1711727803 | ❌ 数值语义不明且严重虚高。**唯一价值**是 29 ms 的速度，但错的数据不如没有 |
| **`Get-Volume` / `Get-PSDrive` 枚举盘符** | `Get-Volume` **2208.6 ms**；`Get-CimInstance Win32_LogicalDisk` 69.1 ms | ❌ 相比 `fs.statfs` 26 盘 1.9 ms 慢 1000×。仅当你需要「可移动盘/网络盘」标志时才考虑，而本机 C/D 都是 Fixed，收益为 0 |
| **`wmic` 任何查询** | `'wmic' is not recognized as an internal or external command` | ❌ 本机已移除（微软自 Win11 24H2 起淘汰）。**任何新代码都不要用 wmic** |
| **`Get-Counter` / `typeperf` 取速率** | `Get-Counter` **2012 ms**、`typeperf -sc 1` **1216 ms**（且 PDH 引号在 PS 5.1 下极脆） | ❌ 慢 3–6 倍，还多一层本地化/引号坑 |
| **`Get-NetAdapterStatistics`** | 799 ms（vs perfraw 353 ms） | ⚠️ 能用但慢一倍；除非要 `Name/LinkSpeed` 一起拿 |
| **`Win32_PowerPlan`** | 非管理员下：`ERROR: 在终端服务远程会话期间，只有管理员有添加、删除或配置服务器软件的权限。……` | ❌ 需要管理员。电源方案改用 `powercfg /getactivescheme`（22 ms，免特权） |
| **每进程显存占用** | WDDM 下 `nvidia-smi` 全量输出的 GPU Memory 列 = `N/A`；`--query-compute-apps=used_memory` = `[N/A]` | ❌ 本机不可得（TCC 模式才行）。只有 GPU 总量 122/12227 MiB 可靠 —— 现有 `sysinfo.ts` 已经做了 |
| **`MSAcpi_ThermalZoneTemperature`** | 127 ms，返回**空实例** | ❌ 无数据且位于 `root/wmi`。要温度用 `Win32_PerfFormattedData_Counters_ThermalZoneInformation`（见 §1.9），且**必须标明是热区不是核心** |
| **`tasklist /fo csv` 替代 `Get-Process`** | 500 ms vs 337 ms，且内存是 `"8 K"` 字符串需再解析 | ❌ 更慢更难解析 |
| **每项一条独立路由 + 独立轮询** | 全量刷新 1.3–1.6 s | ❌ 会摧毁 ~1 s 缓存模型；见 §2.1 |
| **`Get-NetTCPConnection` 做端口表** | 596 ms vs `netstat -ano` 32 ms | ⚠️ 只在你需要「友好进程名」时才用；本机 `netstat -ano` + `Get-Process -Id` 查表更划算（但查表本身要 ~330 ms，建议只对白名单端口查名） |
| **常驻 PowerShell 子进程（每 500 ms 自采样）** | 边际 **~30 ms/次**，首帧 914 ms | ⚠️ 技术上成立、性能最好，但引入子进程生命周期（崩溃重启、dispose 回收、僵尸进程）。**除非 §2.1 的「合并成一次 PS 调用」仍不够，否则不要上** |
| **依赖 `HTTP_PROXY` 环境变量发现代理** | dsh 进程环境里只有空的 `npm_config_noproxy`，无 `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY` | ❌ 必须硬编码候选端口或读插件设置 |
| **CPU 温度（逐核心）** | — | ❌ 与既有结论一致：Windows 无免特权逐核心温度源。可用的是 ACPI 热区（§1.9），语义不同 |

---

## 附录：本次实测脚本位置（不在仓库内）

| 脚本 | 用途 |
|---|---|
| `%TEMP%\host-audit\disk.mjs` | `statfs` 26 盘符 + sync 对比 |
| `%TEMP%\host-audit\scandir.mjs` | sessions/storages 全量遍历 + mtime 分桶 |
| `%TEMP%\host-audit\bench-net.mjs` / `bench-all.mjs` | execFile 中位耗时横评 |
| `%TEMP%\host-audit\traffic.mjs` | 受控下载 → 验证 `netstat -e` 数值错误 |
| `%TEMP%\host-audit\pshelper2.mjs` | 常驻 PS 子进程边际成本 |
| `%TEMP%\host-audit\netprobe.mjs` / `proxyfail.mjs` / `proxyrate.mjs` | TCP 探活、代理失败模式、出口延迟分布 |
| `%TEMP%\host-audit\thermal.mjs` | ACPI 热区活性（CPU 负载前后对比） |
| `%TEMP%\host-audit\compose.mjs` | 冷/热全量组合成本 |

> 全部脚本只读系统数据；唯一的网络写出是对 `generate_204` 的无 payload GET。
