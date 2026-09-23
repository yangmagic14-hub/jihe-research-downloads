const test = require("node:test");
const assert = require("node:assert/strict");
const { buildQueue, mergeUnique } = require("./query.cjs");

test("buildQueue expands known historical variants without duplicates", () => {
  assert.deepEqual(buildQueue("会通河，南旺"), ["会通河", "會通河", "会通", "會通", "南旺", "南旺分水", "南旺分水口"]);
});

test("mergeUnique preserves distinct visible results", () => {
  const result = mergeUnique([{ title: "甲", url: "u", snippet: "s" }], [{ title: "甲", url: "u", snippet: "s" }, { title: "乙", url: "v", snippet: "t" }]);
  assert.equal(result.length, 2);
  assert.equal(result[1].title, "乙");
});
