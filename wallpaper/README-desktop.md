# HALOFLUX 桌面壁纸包

把 [dsh-haloflux](https://github.com/Ke-wood/dsh-haloflux) 的纯 Canvas 光环引擎从
DeepSeek Harness 界面里搬出来，作为 **桌面壁纸** 运行（经 Lively Wallpaper 的 WebView2 渲染）。

- 引擎文件 `engine.js` / `state.js` 直接复制自插件仓库 `src/`，未改一行；
- `driver.js` 是本地驱动：喂给引擎一个模拟的会话节奏（运行/静默交替 + 活动度正弦），
  并把参数切到适合桌面的档位（`dataMode: 0` 纯动画、全不透明度、关闭正文静区与 HUD）；
- 深色底由 `index.html` 的 CSS 渐变提供，画布本身是透明加色光层（`mix-blend-mode: screen`）。

## 应用到桌面

```powershell
# Lively 命令行（Store 版经 COM 激活传参，见部署会话记录）
setwp --file "C:\Users\yangl\Documents\deepseek-harness\default-workspace\haloflux-desktop"
```

或在 Lively 窗口里「浏览 → 选择文件」指到本目录（含 `LivelyInfo.json` 即可被识别为壁纸）。

## 调参

打开 `index.html`（Edge 即可），按 F12 在控制台里：

```js
haloflux.tune({ scale: 0.8 })          // 整体缩放
haloflux.tune({ runLevel: 1.3 })       // 运行态强度
haloflux.tune({ idleMotion: 0.2 })     // 静默态亮度
haloflux.tune({ backdrop: 0.25 })      // 画布内深色底比例
haloflux.tune({ hue: 280 })            // 色相
```

全部 109 项参数见插件仓库 README 的参数表。改完刷新即可预览，满意后把默认值写进
`driver.js` 的 `DESKTOP` 对象，壁纸每次启动就是它。

## 更新引擎

插件仓库发新版后：

```powershell
Copy-Item ..\dsh-haloflux\src\engine.js .\engine.js -Force
Copy-Item ..\dsh-haloflux\src\state.js .\state.js -Force
```

然后在 Lively 里重新应用（或右键壁纸 → 重新播放）。

## 许可

- 原作 HALOFLUX：Copyright (c) 2026 Ryder191，PolyForm Noncommercial 1.0.0（见 `LICENSE`）；
- DSH 移植与桌面封装保留 `NOTICE` 要求的署名行，仅限非商业使用。
