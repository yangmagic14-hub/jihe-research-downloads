const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const {
  quoteAppleScriptString,
  buildInspectPageScript,
  buildEvaluatePageScript,
  buildGuardedEvaluationJavascript,
  parseSafariPageInfo,
  detectProfileIdForUrl,
  validateSafariPage
} = require("./safari.cjs");

test("AppleScript string quoting preserves quotes, slashes and line breaks", () => {
  assert.equal(quoteAppleScriptString('a\\b"c\nd'), '"a\\\\b\\"c\\\\nd"');
});

test("inspection script reads only Safari's active tab metadata", () => {
  const script = buildInspectPageScript();
  assert.match(script, /current tab of front window/);
  assert.match(script, /URL of activeTab/);
  assert.match(script, /name of activeTab/);
  assert.doesNotMatch(script, /cookies|password/i);
});

test("evaluation script safely embeds the requested page script", () => {
  const script = buildEvaluatePageScript('document.title + " \\\"ok\\\""');
  assert.match(script, /do JavaScript/);
  assert.match(script, /activeTab/);
  assert.ok(script.includes(`do JavaScript ${quoteAppleScriptString('document.title + " \\\"ok\\\""')} in activeTab`));
});

test("multiline evaluation code is compacted inside the AppleScript string", () => {
  const script = buildEvaluatePageScript("(() => {\n return 1;\n})()");
  const commandLine = script.split("\n").find((line) => line.includes("do JavaScript"));
  assert.ok(commandLine);
  assert.match(commandLine, /return 1/);
  assert.doesNotMatch(commandLine, /\\n/);
});

test("page evaluation checks HTTPS and the selected host in the same Safari script", () => {
  const script = buildGuardedEvaluationJavascript("({ ok: true })", {
    name: "籍合网",
    allowedHosts: ["ancientbooks.cn"]
  });
  assert.match(script, /pageUrl\.protocol !== "https:"/);
  assert.match(script, /pageUrl\.hostname\.toLowerCase\(\)\.endsWith/);
  assert.match(script, /ancientbooks\.cn/);
  assert.match(script, /__jiheGuardError/);
  assert.match(script, /__jiheGuardOk: true/);
  const allowed = JSON.parse(vm.runInNewContext(script, {
    URL,
    location: { href: "https://www.ancientbooks.cn/search" }
  }));
  assert.deepEqual(allowed, { __jiheGuardOk: true, value: { ok: true } });
  const rejected = JSON.parse(vm.runInNewContext(script, {
    URL,
    location: { href: "https://example.org/" }
  }));
  assert.match(rejected.__jiheGuardError, /不属于所选数据源/);
  const insecure = JSON.parse(vm.runInNewContext(script, {
    URL,
    location: { href: "http://www.ancientbooks.cn/" }
  }));
  assert.match(insecure.__jiheGuardError, /HTTPS/);
});

test("page metadata parser preserves multiline titles", () => {
  assert.deepEqual(parseSafariPageInfo("https://example.org/search\nA title\ncontinued"), {
    url: "https://example.org/search",
    title: "A title\ncontinued"
  });
});

test("profile host validation accepts exact hosts and subdomains only over HTTPS", () => {
  const profile = { allowedHosts: ["ancientbooks.cn"] };
  assert.equal(validateSafariPage({ url: "https://www.ancientbooks.cn/search", title: "Search" }, profile).hostname, "www.ancientbooks.cn");
  assert.throws(() => validateSafariPage({ url: "https://ancientbooks.cn.attacker.test/", title: "Bad" }, profile), /不属于/);
  assert.throws(() => validateSafariPage({ url: "http://ancientbooks.cn/", title: "Insecure" }, profile), /HTTPS/);
});

test("Safari host auto-detection selects a configured database and ignores unknown sites", () => {
  const profiles = {
    jihe: { allowedHosts: ["ancientbooks.cn"] },
    classics: { allowedHosts: ["fjlib.net"] }
  };
  assert.equal(detectProfileIdForUrl("https://s.fjlib.net:6443/search", profiles), "classics");
  assert.equal(detectProfileIdForUrl("https://www.ancientbooks.cn/search", profiles), "jihe");
  assert.equal(detectProfileIdForUrl("https://example.org/", profiles), null);
  assert.equal(detectProfileIdForUrl("http://www.ancientbooks.cn/", profiles), null);
});
