# B站视频剩余时长计算器

Chrome/Edge 扩展：在 B 站合集/多集视频页面计算“从当前集开始到看完”的剩余总时长，并在弹窗中展示标题、进度、剩余集数、剩余总时长与预计完成时间。

## 使用者

### 加载 dist（推荐）

浏览器只需要加载构建产物 `dist/` 目录（而不是仓库根目录）。

1. 确保你拿到的是 `dist/` 目录（其中包含 `manifest.json`）
2. 打开扩展管理页：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
3. 打开右上角“开发者模式”
4. 点击“加载已解压的扩展程序”，选择 `dist/` 目录
5. 安装完成后，工具栏会出现扩展图标

### 使用方法

1. 打开任意 B 站视频页（`bilibili.com/video/*`），并开始播放
2. 点击扩展图标打开弹窗
3. 弹窗会展示：
   - 当前视频标题
   - 当前播放进度
   - 剩余视频数
   - 剩余总时长
   - 预计完成时间
4. 点击“刷新数据”重新计算

### 注意事项

- 仅在 `bilibili.com/video/*` 页面生效；非视频页会提示“请在B站视频页面使用此扩展”
- 计算基于页面可解析到的视频列表与时长信息；如结果异常可尝试刷新页面后重试

## 开发者

### 安装

```bash
npm install
```

### 开发（调试弹窗 UI）

```bash
npm run dev
```

启动后在浏览器打开 Vite 提供的地址，并访问 `popup.html`（例如 `http://localhost:5173/popup.html`）进行弹窗 UI 开发调试。

### 构建（生成可加载的 dist）

```bash
npm run build
```

构建完成后：
- `dist/` 可直接在 Chrome/Edge 以“加载已解压的扩展程序”方式加载
- `dist/manifest.json` 引用稳定文件名（不依赖 hash 文件名）

### 校验（可选但推荐）

```bash
npm run verify
```

该命令会依次执行类型检查、构建与 `dist/` 结构校验。

## 迁移报告

- [docs/migration-report.md](docs/migration-report.md)

## 隐私说明

本扩展不会收集任何个人数据，所有计算均在本地完成。扩展仅在 B 站视频页面上运行，且只读取与时长计算相关的信息。
