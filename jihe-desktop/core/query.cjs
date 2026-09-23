const DEFAULT_VARIANTS = {
  "会通河": ["会通河", "會通河", "会通", "會通"],
  "南旺": ["南旺", "南旺分水", "南旺分水口"],
  "戴村坝": ["戴村坝", "戴村壩", "戴村"],
  "分水": ["分水", "分水口", "分水闸", "分水閘"],
  "河工": ["河工", "河政", "河务", "河務", "治河"],
  "闸": ["闸", "閘", "闸座", "閘座", "闸官", "閘官"]
};

function splitTerms(input) {
  return [...new Set(String(input || "").split(/[\n,，;；]/).map((term) => term.trim()).filter(Boolean))];
}

function buildQueue(input, { expandVariants = true } = {}) {
  const terms = splitTerms(input);
  const queue = [];
  for (const term of terms) {
    const variants = expandVariants ? (DEFAULT_VARIANTS[term] || [term]) : [term];
    for (const query of variants) {
      if (!queue.includes(query)) queue.push(query);
    }
  }
  return queue;
}

function normalizeRecord(record) {
  return {
    query: String(record.query || ""),
    title: String(record.title || "").replace(/\s+/g, " ").trim(),
    snippet: String(record.snippet || "").replace(/\s+/g, " ").trim(),
    url: String(record.url || ""),
    collectedAt: record.collectedAt || new Date().toISOString()
  };
}

function mergeUnique(existing, incoming) {
  const known = new Set(existing.map((item) => `${item.url}|${item.title}|${item.snippet}`));
  const output = [...existing];
  for (const raw of incoming) {
    const item = normalizeRecord(raw);
    const key = `${item.url}|${item.title}|${item.snippet}`;
    if (item.title && !known.has(key)) {
      known.add(key);
      output.push(item);
    }
  }
  return output;
}

function makeState({ queue, profileId, delayMs, maxPerQuery }) {
  return {
    version: 1,
    profileId,
    queue,
    cursor: 0,
    delayMs,
    maxPerQuery,
    records: [],
    status: "ready",
    updatedAt: new Date().toISOString()
  };
}

module.exports = { DEFAULT_VARIANTS, splitTerms, buildQueue, normalizeRecord, mergeUnique, makeState };
