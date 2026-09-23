# 籍合研究检索台

桌面端研究助手：在用户自行登录籍合网后，把关键词队列逐个填入官方网页的检索框，读取**页面已经呈现**的题名、摘要和链接，去重并导出。适合建立书目与引文候选池，不能替代人工阅读和出处核验。

## 运行与分发

```powershell
cd jihe-desktop
npm install
npm start
npm run pack:win
```

`npm run pack:win` 会在 `jihe-desktop/release` 生成 Windows 便携版；`npm run pack:mac` 会生成 macOS 的 DMG 和 ZIP。分发时只发送该目录内生成的应用，不发送本项目的任何个人检查点。macOS 构建、签名和 Gatekeeper 处理见 [docs/macos-distribution.md](docs/macos-distribution.md)。

## 使用方式

1. 选择直接“籍合网”或“福建省图书馆馆外访问 → 中华经典古籍库”，点击“打开籍合网并登录”。在独立窗口自行完成机构访问、正常登录及可能出现的验证码。
2. 填入关键词，创建任务；程序会保存检索词、游标和已采集结果至当前 Windows 用户的应用数据目录。
3. 点击“开始／继续”。默认每词间隔五秒，可暂停；重启后会显示检查点。
4. 导出 CSV、JSON 或 TXT，再对每条结果到原网页复核。

## 安全与合规

- 不保存或导出账号、密码、Cookie、验证码。
- 不规避 CAPTCHA、登录、付费、版权、下载或访问频率限制。
- 仅收集网站当前可见的检索结果；不批量下载全文或图像。
- `profiles.cjs` 是选择器配置。籍合网改版时，先用浏览器开发工具确认页面实际选择器，再由维护者更新并测试。
