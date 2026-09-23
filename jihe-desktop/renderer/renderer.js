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

function options() { return { profileId: $("#profile").value, terms: $("#terms").value, expandVariants: $("#variants").checked, delayMs: $("#delay").value, maxPerQuery: $("#max").value }; }
function log(line) { $("#log").textContent = `${new Date().toLocaleTimeString()} ${line}\n${$("#log").textContent}`.slice(0, 5000); }

$("#open-source").addEventListener("click", async () => { await window.jihe.openSource($("#profile").value); log("已打开籍合网登录窗口。"); });
$("#create").addEventListener("click", async () => { render(await window.jihe.start(options())); log("任务已创建；请确认已在籍合网窗口登录。\n"); });
$("#run").addEventListener("click", async () => { if (!state) render(await window.jihe.start(options())); await window.jihe.continue(); log("检索队列已开始。\n"); });
$("#pause").addEventListener("click", async () => { await window.jihe.pause(); log("已请求暂停；当前批次结束后将写入检查点。\n"); });
document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", async () => { const response = await window.jihe.export(button.dataset.export); if (!response.canceled) log(`已导出：${response.filePath}`); }));
window.jihe.onUpdate(render);
window.jihe.onLog(log);
window.jihe.load().then((saved) => { if (saved) { render(saved); log("已恢复上次检查点。\n"); } });
