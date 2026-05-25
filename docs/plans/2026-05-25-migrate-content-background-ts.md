# Migrate content/background scripts to TypeScript (MV3) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有 `content.js` 与 `background.js` 迁移为 TypeScript，并保证构建后 `dist/content.js` 与 `dist/background.js` 为稳定文件名、可被 `manifest.json` 引用，且对外行为/消息协议/返回字段不变。

**Architecture:** 将扩展脚本与 React/Vite 的 `app/` 构建解耦：新增 `extension/` 使用 `tsc` 直接 emit 到 `dist/` 根目录；Vite 仍输出到 `dist/app/`。复制脚本只负责静态资源（manifest/popup/images），避免覆盖 `tsc` 产物。

**Tech Stack:** TypeScript (tsc), Vite (React), Chrome Extension MV3

---

### Task 1: Add `extension/` TypeScript build (tsconfig + chrome types)

**Files:**
- Create: `extension/tsconfig.json`
- Create: `extension/chrome.d.ts`

**Step 1: Create `extension/chrome.d.ts`**
- 提供最小 `chrome.*` 类型声明，满足 `content.ts`/`background.ts` 的静态检查

**Step 2: Create `extension/tsconfig.json`**
- `rootDir=extension`
- `outDir=dist`（输出稳定命名 `content.js`/`background.js`）
- `target=ES2022`
- `lib` 包含 `DOM`（content script 需要）
- `strict=true`
- `noEmit=false`

**Step 3: Build smoke test**

Run: `npx tsc -p extension/tsconfig.json`
Expected: exit code 0, outputs `dist/content.js` and `dist/background.js`

---

### Task 2: Migrate `content.js` to `extension/content.ts`

**Files:**
- Create: `extension/content.ts`
- Reference: `content.js`

**Step 1: Port code with runtime-equivalence constraints**
- 保持消息协议：`action=getVideoTimeInfo`
- 保持响应结构：成功 `{ success: true, data: timeInfo }`；失败 `{ success: false, error: string }`
- 保持 `return true` 以支持异步 `sendResponse`
- 不改变返回字段：`currentVideoTitle/currentProgress/remainingVideos/remainingTime/estimatedFinishTime`（以及可能存在的 `note`）

**Step 2: Compile and compare**

Run: `npx tsc -p extension/tsconfig.json`
Expected: `dist/content.js` 不包含任何 import/export，功能与原 JS 等价

---

### Task 3: Migrate `background.js` to `extension/background.ts`

**Files:**
- Create: `extension/background.ts`
- Reference: `background.js`

**Step 1: Port code with runtime-equivalence constraints**
- 保持 `onInstalled` 日志
- 保持消息：`action=checkBilibiliTab`，响应 `{ isBilibiliVideo: boolean }`
- 保持 `return true` 以支持异步 `sendResponse`

**Step 2: Compile**

Run: `npx tsc -p extension/tsconfig.json`
Expected: `dist/background.js` 可作为 MV3 service worker 脚本使用

---

### Task 4: Update build pipeline and copy strategy

**Files:**
- Create: `scripts/clean-dist.mjs`
- Modify: `scripts/copy-extension-assets.mjs`
- Modify: `package.json`

**Step 1: Add dist cleaner**
- `scripts/clean-dist.mjs`：构建前清理整个 `dist/`

**Step 2: Update copy list**
- `copy-extension-assets.mjs` 不再复制根目录的 `content.js/background.js`（避免覆盖 `tsc` 输出）
- 继续复制 `manifest.json`、`popup.*`、`images/`

**Step 3: Update npm scripts**
- `build` 顺序建议：
  1) clean dist
  2) vite build -> `dist/app`
  3) tsc build -> `dist/content.js` & `dist/background.js`
  4) copy extension assets -> `dist/manifest.json`、`dist/popup.*`、`dist/images/*`

**Step 4: Verify output structure**

Run:
- `npm run build`
- `powershell -NoProfile -Command "Test-Path dist/content.js; Test-Path dist/background.js"`
Expected:
- Both return `True`
- `dist/manifest.json` still references `"content.js"` and `"background.js"`

---

### Task 5: Check off Task3/Task4 in `.trae/specs/migrate-react-extension/tasks.md`

**Files:**
- Modify: `.trae/specs/migrate-react-extension/tasks.md`

**Step 1: Mark completed**
- 勾选 Task3、Task4 以及子项

