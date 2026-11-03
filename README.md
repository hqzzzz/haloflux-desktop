# HALOFLUX Desktop — 会话驱动的桌面光环壁纸

把 [dsh-haloflux](https://github.com/Ke-wood/dsh-haloflux)（HALOFLUX 实时光环的 DeepSeek Harness 移植）
从 Harness 窗口背景改造成 **桌面壁纸**，并且仍然跟着 Harness 的真实会话走：
词元流出、工具调用、运行/静默状态，桌面光环实时同步。

```
Harness GUI（会话事件流）
  └─ bridge/  无界面桥插件 · 客户端半边（渲染 null，220ms 推一次快照）
       └─ bridge/  宿主半边（127.0.0.1:52771 本机 SSE 中继）
            └─ wallpaper/  Lively 壁纸页 EventSource 订阅
                 └─ HALOFLUX Canvas 引擎（dataMode 2 完全抓取）
```

Harness 关闭或无会话时，壁纸 4 秒内自动回落为**纯动画档**（原作示例数据 + 呼吸节奏），
断线由 EventSource 每 2 秒自动重连，全程无感。

## 目录

| 目录 | 内容 |
|---|---|
| `wallpaper/` | Lively Wallpaper 桌面壁纸包（引擎 + 驱动 + 本地节奏 + 桥接订阅） |
| `bridge/` | Harness 无界面桥接插件（headless，零像素，只搬运会话数据） |

## 部署

### 1. 壁纸（Lively）

1. 安装 [Lively Wallpaper](https://github.com/rocksdanister/lively)（Microsoft Store 或 GitHub Releases）；
2. 把你的壁纸图复制为 `wallpaper/photo.png`（版权自理，仓库不附带图片；没有图也不影响运行，暗底纯光环同样好看）；
3. Lively 中「添加壁纸 → 浏览文件夹」选择 `wallpaper/` 目录（含 `LivelyInfo.json`），或命令行：
   `lively setwp --file "<绝对路径>\wallpaper"`（Store 版可重启应用带参执行）。

### 2. 桥（Harness）

需要 DSH ≥ 0.2.1-rc 系（Web 界面或桌面版均可）：

```bash
dsh plugin --profile desktop add "<绝对路径>\bridge"   # web 版用 --profile web
```

重启 Harness 后：宿主半边自动监听 `127.0.0.1:52771`，客户端半边把当前会话数据推上桥。
壁纸页无需任何配置，自动连接。

## 调参

壁纸运行时无 UI，参数在 `wallpaper/driver.js` 顶部的 `DESKTOP` 表（全 109 项见上游 README）：

```js
dataMode: 2,          // 桥在线=完全抓取；桥离线自动降回 0（纯动画）
opacity: 0.85,        // 叠加强度
centerX: 0, centerY: -0.02, scale: 0.9,   // 构图
idleMotion: 0.35, runLevel: 1,
```

开发调试：浏览器直接打开 `wallpaper/index.html`，控制台里
`haloflux.tune({ scale: 0.8 })` 即时生效；`bridge/tools/` 下有两个离线测试脚本
（`test-pusher.mjs` 模拟会话流、`test-capture.mjs` 抓桥流样本），不依赖 Harness 即可验证链路。

## 兼容性注意

- 桥的数据抓取依赖 Harness 客户端内部约定（`shell.overlay` 槽 props、`sessions.binding()` 的
  `eventSource`、`assistant/live-chunk` 流式条目），跨大版本可能漂移——工具/状态事件与
  词元流的解析点集中在 `bridge/src/live.js`（复制自上游），失效时优先核对那里；
- 引擎与移植代码版权归属见 `LICENSE` / `NOTICE`，**仅限非商业使用**。

## 许可与致谢

- 原作 HALOFLUX：Copyright (c) 2026 Ryder191 — <https://github.com/Ryder191/haloflux>
- DSH 移植：Copyright (c) Ke-wood — <https://github.com/Ke-wood/dsh-haloflux>
- 桌面封装与桥接：本仓库，PolyForm Noncommercial 1.0.0，转发请保留 `NOTICE`。
