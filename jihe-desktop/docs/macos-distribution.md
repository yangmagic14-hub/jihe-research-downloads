# macOS 版本构建与分发

本程序使用 Electron，应用逻辑、界面、检索队列与检查点在 Windows 和 macOS 共用；无需维护两套业务代码。

## 在 Mac 上启动

建议使用 Node.js 20 LTS 或更高版本：

```bash
cd jihe-desktop
npm install
npm start
```

首次打开时，在独立的籍合网窗口完成正常登录。登录信息仍仅保存在该用户的浏览器会话中，应用不会写入账号、密码或 Cookie。

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

未签名测试包首次打开可能被 Gatekeeper 拦截。测试人员可在 Finder 中按住 Control 点击应用，选择“打开”。

对外正式发布应在 Apple Developer 账户下配置 `Developer ID Application` 证书、App-specific password 和公证流程，再在 macOS CI 或本机执行签名/公证。证书、Apple ID、密码和应用专用密码必须使用 CI 的受保护变量或本机钥匙串，不能写进代码、配置文件或分发包。

## Windows 主机限制

Windows 可以维护本项目源码，但不能可靠产出经过 Apple 签名与公证的 DMG。请在 macOS 主机或 macOS CI runner 上执行 `pack:mac`；本仓库的脚本与配置已就绪。
