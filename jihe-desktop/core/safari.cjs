const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function quoteAppleScriptString(value) {
  const escaped = String(value)
    .replace(/\r?\n/g, "\\n")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"");
  return `"${escaped}"`;
}

function buildInspectPageScript() {
  return [
    'tell application "Safari"',
    '  if not running then error "Safari 尚未启动"',
    '  if (count of windows) is 0 then error "Safari 当前没有打开的窗口"',
    '  set activeTab to current tab of front window',
    '  set pageURL to URL of activeTab',
    '  set pageTitle to name of activeTab',
    '  return pageURL & linefeed & pageTitle',
    'end tell'
  ].join("\n");
}

function buildEvaluatePageScript(javascript) {
  const compactJavascript = String(javascript).replace(/\r?\n/g, " ");
  return [
    'tell application "Safari"',
    '  if not running then error "Safari 尚未启动"',
    '  if (count of windows) is 0 then error "Safari 当前没有打开的窗口"',
    '  set activeTab to current tab of front window',
    `  return do JavaScript ${quoteAppleScriptString(compactJavascript)} in activeTab`,
    'end tell'
  ].join("\n");
}

function buildGuardedEvaluationJavascript(expression, profile) {
  const allowedHosts = Array.isArray(profile?.allowedHosts)
    ? profile.allowedHosts.map((host) => String(host).toLowerCase().replace(/^\.+|\.+$/g, ""))
    : [];
  const profileNameJson = JSON.stringify(String(profile?.name || "所选数据源"));
  return `JSON.stringify((() => { const pageUrl = new URL(location.href); const allowedHosts = ${JSON.stringify(allowedHosts)}; const hostAllowed = allowedHosts.some((domain) => domain && (pageUrl.hostname.toLowerCase() === domain || pageUrl.hostname.toLowerCase().endsWith("." + domain))); if (pageUrl.protocol !== "https:") return { __jiheGuardError: "为保护登录会话，只支持通过 HTTPS 访问的数据库页面。" }; if (!hostAllowed) return { __jiheGuardError: "Safari 当前页面已切换到 " + pageUrl.hostname + "，不属于所选数据源“" + ${profileNameJson} + "”。检索已暂停。" }; return { __jiheGuardOk: true, value: (${expression}) }; })())`;
}

function parseSafariPageInfo(output) {
  const value = String(output || "").replace(/\r\n/g, "\n");
  const separator = value.indexOf("\n");
  if (separator < 0) throw new Error("Safari 未返回当前标签页信息。");
  const url = value.slice(0, separator).trim();
  const title = value.slice(separator + 1).trim();
  if (!url) throw new Error("Safari 当前标签页没有可读取的网址。");
  return { url, title };
}

function matchesAllowedHost(hostname, allowedHosts = []) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return allowedHosts.some((allowed) => {
    const domain = String(allowed || "").toLowerCase().replace(/^\.+|\.+$/g, "");
    return domain && (host === domain || host.endsWith(`.${domain}`));
  });
}

function detectProfileIdForUrl(url, profiles) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return Object.entries(profiles || {}).find(([, profile]) => matchesAllowedHost(parsed.hostname, profile.allowedHosts))?.[0] || null;
}

function validateSafariPage(page, profile) {
  let parsed;
  try {
    parsed = new URL(page?.url);
  } catch {
    throw new Error("Safari 当前页面网址无效。请在 Safari 中打开目标数据库页面。");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("为保护登录会话，只支持通过 HTTPS 访问的数据库页面。");
  }
  if (!matchesAllowedHost(parsed.hostname, profile?.allowedHosts)) {
    throw new Error(`Safari 当前页面属于 ${parsed.hostname}，不属于所选数据源“${profile?.name || "未知数据源"}”。请切换到对应数据库页面后重试。`);
  }
  return { ...page, url: parsed.href, hostname: parsed.hostname.toLowerCase() };
}

async function runAppleScript(script) {
  if (process.platform !== "darwin") {
    throw new Error("Safari 当前页面模式仅支持 macOS。");
  }
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], {
      encoding: "utf8",
      timeout: 15000,
      maxBuffer: 1024 * 1024
    });
    return String(stdout || "").replace(/\r?\n$/, "");
  } catch (error) {
    const detail = String(error.stderr || error.message || "").trim();
    if (/javascript.*apple events|allow javascript from apple events/i.test(detail)) {
      throw new Error("Safari 尚未允许 Apple Events 执行网页 JavaScript。请在 Safari 设置的“高级”中显示网页开发者功能，再在“开发”菜单或开发者设置中开启“允许来自 Apple Events 的 JavaScript”。");
    }
    if (/not authorized|不被允许|权限/i.test(detail)) {
      throw new Error(`macOS 尚未授权此应用控制 Safari。请在“系统设置 → 隐私与安全性 → 自动化”中允许籍合研究检索台控制 Safari。${detail}`);
    }
    throw new Error(`无法读取 Safari 当前页面：${detail || "请确认 Safari 已打开。"}`);
  }
}

async function inspectSafariPage() {
  return parseSafariPageInfo(await runAppleScript(buildInspectPageScript()));
}

async function evaluateSafariPage(expression, profile) {
  const javascript = buildGuardedEvaluationJavascript(expression, profile);
  const output = await runAppleScript(buildEvaluatePageScript(javascript));
  let result;
  try {
    result = JSON.parse(output);
  } catch {
    throw new Error("Safari 没有返回可解析的页面结果；请确认当前标签页已加载完成并允许网页脚本控制。");
  }
  if (result?.__jiheGuardError) throw new Error(result.__jiheGuardError);
  if (!result || result.__jiheGuardOk !== true || !Object.hasOwn(result, "value")) {
    throw new Error("Safari 当前标签页没有返回检索结果；任务已暂停。");
  }
  return result.value;
}

module.exports = {
  quoteAppleScriptString,
  buildInspectPageScript,
  buildEvaluatePageScript,
  buildGuardedEvaluationJavascript,
  parseSafariPageInfo,
  matchesAllowedHost,
  detectProfileIdForUrl,
  validateSafariPage,
  runAppleScript,
  inspectSafariPage,
  evaluateSafariPage
};
