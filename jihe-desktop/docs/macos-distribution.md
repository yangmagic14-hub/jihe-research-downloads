# macOS 版本构建与分发

本程序使用 Electron，应用逻辑、界面、检索队列与检查点在 Windows 和 macOS 共用；无需维护两套业务代码。

## 在 Mac 上启动

建议使用 Node.js 20 LTS 或更高版本：

```bash
cd jihe-desktop
npm install
npm start
```

macOS 默认使用 Safari 当前登录会话：先在 Safari 登录并打开所选数据库的检索页面，再启动应用检查当前页面并建立任务。任务直接在 Safari 当前标签页执行，应用不会读取或复制 Safari Cookie，也不需要在应用内再次登录。

Safari 首次使用需要启用网页脚本自动化：在 Safari“设置 → 高级”中显示网页开发者功能，再到“开发”菜单/开发者设置启用“允许来自 Apple Events 的 JavaScript”。首次控制 Safari 时，macOS 还可能询问是否允许应用自动化 Safari。相关设置说明见 [Apple Safari 开发者设置](https://developer.apple.com/documentation/safari-developer-tools/developer-settings)。

## 构建 Apple Silicon / Intel 版本

GitHub Actions 发布工作流会分别在 Apple Silicon 和 Intel 的 macOS runner 上构建 DMG 与 ZIP 包。Windows 代码签名与 macOS 签名/公证使用独立设置；macOS 证书未配置时，产物未签名且不会公证。

在 Apple Silicon Mac 上：

```bash
npm run pack:mac
```

默认产物在 `release/`：

- `籍合研究检索台-<版本>-arm64.dmg`：适用于 M1/M2/M3/M4 Mac。
- `籍合研究检索台-<版本>-arm64.zip`：便于分发或内网部署。

若需 Intel Mac 包，在 Intel Mac 构建，或明确指定：

```bash
npx electron-builder --mac dmg zip --x64
```

要同时发布两种架构，建议在两台对应架构的 Mac 上分别构建和测试；这样不会混入跨架构运行风险。

## 签名与 Gatekeeper

未签名测试包首次打开可能被 Gatekeeper 拦截。仅当确认安装包来自可信来源且未遭篡改时，测试人员可在 Finder 中按住 Control 点击应用，选择“打开”，或按 Apple 官方指引在“系统设置 → 隐私与安全性”中点“仍要打开”。

对外正式发布应在 Apple Developer 账户下配置 `Developer ID Application` 证书、App-specific password 和公证流程，再在 macOS CI 或本机执行签名/公证。证书、Apple ID、密码和应用专用密码必须使用 CI 的受保护变量或本机钥匙串，不能写进代码、配置文件或分发包。

## Windows 主机限制

Windows 可以维护本项目源码，但不能可靠产出经过 Apple 签名与公证的 DMG。请在 macOS 主机或 macOS CI runner 上执行 `pack:mac`；本仓库的脚本与配置已就绪。
