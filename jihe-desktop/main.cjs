const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { buildQueue, mergeUnique, makeState } = require("./core/query.cjs");
const profiles = require("./profiles.cjs");

let controlWindow;
let sourceWindow;
let activeState;
let stopRequested = false;

const checkpointPath = () => path.join(app.getPath("userData"), "jihe-search-checkpoint.json");
const safeSend = (channel, payload) => controlWindow && !controlWindow.isDestroyed() && controlWindow.webContents.send(channel, payload);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 680,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  controlWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function createSourceWindow(profile) {
  if (sourceWindow && !sourceWindow.isDestroyed()) {
    sourceWindow.show();
    return sourceWindow;
  }
  sourceWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    title: "籍合网：登录与检索页面",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  sourceWindow.loadURL(profile.startUrl);
  sourceWindow.on("closed", () => { sourceWindow = undefined; });
  return sourceWindow;
}

async function saveCheckpoint() {
  if (!activeState) return;
  activeState.updatedAt = new Date().toISOString();
  await fs.writeFile(checkpointPath(), JSON.stringify(activeState, null, 2), "utf8");
}

async function readVisibleResults(profile, query) {
  const script = `(() => {
    const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const firstText = (root, selector) => all(selector, root).map(n => n.innerText || n.textContent || '').map(t => t.trim()).find(Boolean) || '';
    return all(${JSON.stringify(profile.resultItem)}).slice(0, ${Number(activeState.maxPerQuery)}).map(item => {
      const link = item.querySelector(${JSON.stringify(profile.resultLink)});
      return { title: firstText(item, ${JSON.stringify(profile.resultTitle)}), snippet: firstText(item, ${JSON.stringify(profile.resultSnippet)}), url: link ? new URL(link.getAttribute('href'), location.href).href : location.href };
    }).filter(item => item.title);
  })()`;
  const raw = await sourceWindow.webContents.executeJavaScript(script, true);
  return raw.map((item) => ({ ...item, query, collectedAt: new Date().toISOString() }));
}

async function submitQuery(profile, query) {
  const script = `(() => {
    const input = document.querySelector(${JSON.stringify(profile.searchInput)});
    if (!input) return { ok:false, reason:'未找到检索输入框。请在设置中更新选择器。' };
    input.focus(); input.value = ${JSON.stringify(query)};
    input.dispatchEvent(new Event('input', { bubbles:true }));
    input.dispatchEvent(new Event('change', { bubbles:true }));
    const submit = document.querySelector(${JSON.stringify(profile.searchSubmit)});
    if (submit) { submit.click(); return { ok:true }; }
    input.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', bubbles:true }));
    return { ok:true };
  })()`;
  return sourceWindow.webContents.executeJavaScript(script, true);
}

async function runQueue() {
  const profile = profiles[activeState.profileId];
  stopRequested = false;
  activeState.status = "running";
  while (!stopRequested && activeState.cursor < activeState.queue.length) {
    if (!sourceWindow || sourceWindow.isDestroyed()) {
      activeState.status = "paused";
      await saveCheckpoint();
      safeSend("run:update", activeState);
      return;
    }
    const query = activeState.queue[activeState.cursor];
    safeSend("run:log", `检索：${query}`);
    const submitted = await submitQuery(profile, query);
    if (!submitted.ok) {
      activeState.status = "paused";
      activeState.error = submitted.reason;
      await saveCheckpoint();
      safeSend("run:update", activeState);
      return;
    }
    await sleep(activeState.delayMs);
    const records = await readVisibleResults(profile, query);
    activeState.records = mergeUnique(activeState.records, records);
    activeState.cursor += 1;
    await saveCheckpoint();
    safeSend("run:update", activeState);
  }
  activeState.status = stopRequested ? "paused" : "completed";
  await saveCheckpoint();
  safeSend("run:update", activeState);
}

function toCsv(records) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return ["query,title,snippet,url,collectedAt", ...records.map((r) => [r.query, r.title, r.snippet, r.url, r.collectedAt].map(quote).join(","))].join("\n");
}

app.whenReady().then(() => {
  createControlWindow();
  ipcMain.handle("source:open", (_event, profileId = "jihe") => createSourceWindow(profiles[profileId]).webContents.getURL());
  ipcMain.handle("run:start", async (_event, options) => {
    const queue = buildQueue(options.terms, { expandVariants: options.expandVariants });
    activeState = makeState({ queue, profileId: options.profileId, delayMs: Math.max(3000, Number(options.delayMs) || 5000), maxPerQuery: Math.max(1, Math.min(100, Number(options.maxPerQuery) || 20)) });
    createSourceWindow(profiles[activeState.profileId]);
    await saveCheckpoint();
    safeSend("run:update", activeState);
    return activeState;
  });
  ipcMain.handle("run:continue", async () => { if (activeState?.status !== "running") runQueue().catch((error) => safeSend("run:log", error.message)); return activeState; });
  ipcMain.handle("run:pause", async () => { stopRequested = true; return activeState; });
  ipcMain.handle("state:load", async () => { try { return JSON.parse(await fs.readFile(checkpointPath(), "utf8")); } catch { return null; } });
  ipcMain.handle("export:records", async (_event, format) => {
    if (!activeState?.records) return { canceled: true };
    const extension = format === "json" ? "json" : format === "txt" ? "txt" : "csv";
    const result = await dialog.showSaveDialog(controlWindow, { defaultPath: `jihe-results.${extension}`, filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
    if (result.canceled) return result;
    const payload = format === "json" ? JSON.stringify(activeState.records, null, 2) : format === "txt" ? activeState.records.map((r, i) => `${i + 1}. ${r.title}\n检索词：${r.query}\n摘要：${r.snippet}\n链接：${r.url}\n采集时间：${r.collectedAt}\n`).join("\n") : toCsv(activeState.records);
    await fs.writeFile(result.filePath, payload, "utf8");
    return { canceled: false, filePath: result.filePath };
  });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
