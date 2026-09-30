const $ = (selector) => document.querySelector(selector);
let state = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);

function render(next) {
  state = next || state;
  if (!state) return;
  $("#status").textContent = state.status || "未创建";
  $("#progress").textContent = `${state.cursor || 0} / ${(state.queue || []).length}`;
  $("#records").textContent = (state.records || []).length;
  $("#bar").style.width = `${state.queue?.length ? Math.round((state.cursor / state.queue.length) * 100) : 0}%`;
  $("#error").textContent = state.error || "";
  const records = state.records || [];
  $("#result-list").innerHTML = records.length ? records.slice().reverse().map((record) => `<article class="record"><h3>${escapeHtml(record.title)}</h3><p><b>检索词：</b>${escapeHtml(record.query)}　${escapeHtml(record.collectedAt)}</p><p>${escapeHtml(record.snippet)}</p><a href="#">${escapeHtml(record.url)}</a></article>`).join("") : '<p class="empty">尚无结果。</p>';
}

function options() { return { profileId: $("#profile").value, browserMode: browserMode.value, terms: $("#terms").value, expandVariants: $("#variants").checked, delayMs: $("#delay").value, maxPerQuery: $("#max").value }; }
function log(line) { $("#log").textContent = `${new Date().toLocaleTimeString()} ${line}\n${$("#log").textContent}`.slice(0, 5000); }

const browserMode = $("#browser-mode");
const safariOption = browserMode.querySelector('option[value="safari"]');
const browserModeLabel = browserMode.closest("label");
const profileSelect = $("#profile");
const autoProfileOption = profileSelect.querySelector('option[value="auto"]');

function syncBrowserMode() {
  const usingSafari = browserMode.value === "safari";
  $("#open-source").textContent = usingSafari ? "检查 Safari 当前页面" : "打开数据库登录窗口";
  $("#hint").textContent = usingSafari
    ? "先在 Safari 登录并打开数据库检索页面；数据源可选择自动识别，也可手动指定。首次使用需开启“允许来自 Apple Events 的 JavaScript”；工具只操作当前 Safari 标签页、读取页面已显示结果，不读取或保存 Cookie。"
    : "先打开数据源，在应用内窗口完成正常登录与验证码；回到这里再开始。程序只读取页面已经显示的结果，不保存账号、密码或 Cookie。";
}

if (window.jihe.platform === "darwin") {
  safariOption.hidden = false;
  autoProfileOption.hidden = false;
  browserMode.value = "safari";
  profileSelect.value = "auto";
} else {
  browserModeLabel.hidden = true;
}
browserMode.addEventListener("change", () => {
  if (browserMode.value === "embedded" && profileSelect.value === "auto") profileSelect.value = "jihe";
  syncBrowserMode();
});
syncBrowserMode();

$("#open-source").addEventListener("click", async () => {
  try {
    if (browserMode.value === "safari") {
      const page = await window.jihe.inspectSafari($("#profile").value);
      log(`已识别数据源：${page.profileName}\nSafari 当前页面：${page.title || "（无标题）"}\n${page.url}`);
    } else {
      await window.jihe.openSource($("#profile").value);
      log("已打开数据源登录窗口。");
    }
    $("#error").textContent = "";
  } catch (error) {
    $("#error").textContent = error.message;
    log(error.message);
  }
});
$("#create").addEventListener("click", async () => {
  try {
    render(await window.jihe.start(options()));
    $("#error").textContent = "";
    log(browserMode.value === "safari" ? "任务已创建，将使用 Safari 当前登录会话。\n" : "任务已创建；请确认已在数据源窗口登录。\n");
  } catch (error) {
    $("#error").textContent = error.message;
    log(error.message);
  }
});
$("#run").addEventListener("click", async () => {
  try {
    if (!state) render(await window.jihe.start(options()));
    await window.jihe.continue();
    log("检索队列已开始。\n");
  } catch (error) {
    $("#error").textContent = error.message;
    log(error.message);
  }
});
$("#pause").addEventListener("click", async () => { await window.jihe.pause(); log("已请求暂停；当前批次结束后将写入检查点。\n"); });
document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", async () => { const response = await window.jihe.export(button.dataset.export); if (!response.canceled) log(`已导出：${response.filePath}`); }));
window.jihe.onUpdate(render);
window.jihe.onLog(log);
window.jihe.load().then((saved) => { if (saved) { render(saved); if (saved.profileId) profileSelect.value = saved.profileId; browserMode.value = saved.browserMode === "safari" && window.jihe.platform === "darwin" ? "safari" : "embedded"; syncBrowserMode(); log("已恢复上次检查点。\n"); } });
