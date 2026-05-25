# 迁移报告（原功能 - 现功能 - 是否实现）

本报告用于对照“原始版本（根目录下的原生 JS/HTML/CSS 扩展实现）”与“迁移后版本（React + Vite + TypeScript 工程化实现）”的功能等价情况，结论仅基于仓库当前代码，不包含任何新增功能。

| 原功能（旧实现） | 现功能（新实现） | 是否实现 |
| --- | --- | --- |
| MV3 扩展清单：`manifest.json` 引用 `popup.html`、`content.js`、`background.js`，并包含图标资源 | 构建后 `dist/manifest.json` 仍引用 `popup.html`、`content.js`、`background.js`；图标资源复制到 `dist/images/*` | ✅ |
| 产物目录可作为“加载已解压的扩展程序”的根目录（加载含 `manifest.json` 的目录） | `dist/` 作为唯一加载目录；构建流程确保 `dist/` 内具备最小可加载结构 | ✅ |
| 弹窗：展示标题/进度/剩余视频数/剩余总时长/预计完成时间 | React 弹窗仍展示相同字段与含义 | ✅ |
| 弹窗：点击“刷新数据”重新计算并刷新展示 | React 弹窗保留“刷新数据”按钮并复用同一数据获取逻辑 | ✅ |
| 弹窗：非 B 站视频页提示“请在B站视频页面使用此扩展” | React 弹窗保持语义一致提示 | ✅ |
| 弹窗与内容脚本消息协议：向当前 Tab 发送 `action=getVideoTimeInfo` | React 弹窗仍通过 `chrome.tabs.sendMessage(..., { action: 'getVideoTimeInfo' })` 请求数据 | ✅ |
| 内容脚本：监听 `action=getVideoTimeInfo` 并返回 `{ success, data/error }` | TypeScript 内容脚本保持同一监听与返回结构 | ✅ |
| 内容脚本：计算逻辑（列表识别、当前集定位、时长解析、缺失集估算、格式化、预计完成时间等） | TypeScript 内容脚本保留同等逻辑与关键分支 | ✅ |
| 后台脚本：`onInstalled` 打印安装日志 | TypeScript 后台脚本保留安装日志 | ✅ |
| 后台脚本：处理 `action=checkBilibiliTab` 并返回 `{ isBilibiliVideo }` | TypeScript 后台脚本保留相同消息处理与返回 | ✅ |
| 构建：输出文件名稳定（manifest 不依赖哈希文件名） | Vite 构建配置固定 `assets/[name].js` 等命名，并提供 `dist:check` 校验哈希文件名 | ✅ |

## 关键代码对应

- 旧版（原生实现）
  - 弹窗：[popup.js](file:///d:/TheRestTimeOfVideo/popup.js)，[popup.html](file:///d:/TheRestTimeOfVideo/popup.html)，[popup.css](file:///d:/TheRestTimeOfVideo/popup.css)
  - 内容脚本：[content.js](file:///d:/TheRestTimeOfVideo/content.js)
  - 后台脚本：[background.js](file:///d:/TheRestTimeOfVideo/background.js)
- 新版（迁移后实现）
  - 弹窗（React）：[popup.tsx](file:///d:/TheRestTimeOfVideo/app/src/popup/popup.tsx)，入口 [main.tsx](file:///d:/TheRestTimeOfVideo/app/src/popup/main.tsx)，页面 [popup.html](file:///d:/TheRestTimeOfVideo/app/popup.html)
  - 内容脚本（TS）：[content.ts](file:///d:/TheRestTimeOfVideo/extension/content.ts)
  - 后台脚本（TS）：[background.ts](file:///d:/TheRestTimeOfVideo/extension/background.ts)
  - 构建与产物校验：[vite.config.ts](file:///d:/TheRestTimeOfVideo/vite.config.ts)，[check-dist.mjs](file:///d:/TheRestTimeOfVideo/scripts/check-dist.mjs)，[copy-extension-assets.mjs](file:///d:/TheRestTimeOfVideo/scripts/copy-extension-assets.mjs)

