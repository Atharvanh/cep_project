const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
// Execute our TypeScript utilities with a deterministic AsyncStorage adapter.
// This exercises serialization and failure paths without importing a native runtime.
const disk = new Map();
let failWrite = false;
const storage = {
  getItem: async (k) => disk.get(k) ?? null,
  setItem: async (k, v) => {
    if (failWrite) throw new Error("Disk unavailable");
    disk.set(k, v);
  },
};
const cache = {};
function load(name) {
  if (cache[name]) return cache[name].exports;
  const module = { exports: {} };
  cache[name] = module;
  const source = fs.readFileSync(
    path.join(__dirname, "..", name + ".ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (id) =>
      id.startsWith("./")
        ? load(id.slice(2))
        : id.includes("async-storage")
          ? storage
          : require(id),
    module,
    module.exports,
  );
  return module.exports;
}
const { calculateBMI, normalizeProfile, healthMatch } = load("health");
const { parseProduct, fetchProduct } = load("products");
const {
  saveProfile,
  loadProfile,
  appendScan,
  loadScanHistory,
  PROFILE_KEY,
  HISTORY_KEY,
} = load("storage");
const profile = {
  name: " Alex ",
  age: "22",
  gender: "Woman",
  blood: "Unknown",
  conditions: ["High blood pressure"],
  cycle: true,
  height: "170",
  weight: "80",
  bmi: null,
  bmiCategory: null,
};
const product = (n) =>
  parseProduct(
    { status: 1, product: { product_name: "Food", nutriments: n } },
    "12345678",
  );

test("BMI boundaries use unrounded values; invalid measurements rejected", () => {
  for (const [bmi, category] of [
    [18.49, "Underweight"],
    [18.5, "Normal"],
    [24.99, "Normal"],
    [25, "Overweight"],
    [29.99, "Overweight"],
    [30, "Obese"],
  ]) {
    assert.equal(calculateBMI(200, bmi * 4).bmiCategory, category);
  }
  for (const pair of [
    [0, 70],
    [170, 0],
    [NaN, 70],
    [170, Infinity],
    [300, 70],
  ])
    assert.throws(() => calculateBMI(...pair));
});
test("profile recalculates BMI and does not apply adult categories to minors", () => {
  const adult = normalizeProfile({ ...profile, bmi: 1, bmiCategory: "Normal" });
  assert.equal(adult.name, "Alex");
  assert.equal(adult.bmiCategory, "Overweight");
  assert.equal(normalizeProfile({ ...profile, age: "16" }).bmiCategory, null);
  assert.equal(normalizeProfile({ ...profile, gender: "Man" }).cycle, false);
  assert.throws(() => normalizeProfile({ ...profile, weight: "12.3.4" }));
  assert.throws(() => normalizeProfile({ ...profile, name: "  " }));
});
test("product parser preserves missing vs zero, numeric strings and kJ conversion", () => {
  const p = product({
    energy_100g: 418.4,
    fat_100g: 0,
    carbohydrates_100g: "12.5",
    proteins_100g: "invalid",
  });
  assert.ok(Math.abs(p.calories - 100) < 0.00001);
  assert.equal(p.fat, 0);
  assert.equal(p.carbs, 12.5);
  assert.equal(p.protein, null);
  assert.equal(p.basis, "100g");
});
test("serving fallback never mixes nutrition bases and ignores unsafe images", () => {
  const p = parseProduct(
    {
      status: 1,
      product: {
        nutriments: { "energy-kcal_serving": 80, fat_serving: 3 },
        nutriscore_grade: "unknown",
        nova_group: 8,
        image_url: "http://unsafe",
      },
    },
    "12345678",
  );
  assert.equal(p.basis, "serving");
  assert.equal(p.calories, 80);
  assert.equal(p.nutriscore, null);
  assert.equal(p.nova, null);
  assert.equal(p.imageUrl, null);
  assert.equal(
    product({ fat_100g: 1, "energy-kcal_serving": 80 }).calories,
    null,
  );
});
test("not found, empty nutrition, malformed response", () => {
  assert.equal(parseProduct({ status: 0 }, "12345678"), null);
  assert.equal(product({}).calories, null);
  assert.throws(() => parseProduct({}, "12345678"));
});
test("warning takes precedence over positive grade; high sugar uses 100g", () => {
  const p = { ...product({}), nutriscore: "a", sugars100g: 23 };
  assert.equal(healthMatch(p, normalizeProfile(profile)).tone, "warning");
  assert.equal(
    healthMatch({ ...p, sugars100g: null }, normalizeProfile(profile)).tone,
    "good",
  );
  assert.equal(
    healthMatch({ ...p, nutriscore: "d" }, normalizeProfile(profile)).tone,
    "warning",
  );
  assert.equal(
    healthMatch(
      { ...p, nutriscore: null, sugars100g: null, sugars: 30 },
      normalizeProfile(profile),
    ).tone,
    "neutral",
  );
  assert.equal(
    healthMatch(
      { ...p, nutriscore: "d" },
      normalizeProfile({ ...profile, age: "16" }),
    ).tone,
    "neutral",
  );
});
test("profile roundtrip, corrupt data and write failure do not overwrite disk", async () => {
  disk.clear();
  assert.equal(await loadProfile(), null);
  const saved = await saveProfile(profile);
  assert.deepEqual(await loadProfile(), saved);
  failWrite = true;
  await assert.rejects(saveProfile({ ...profile, name: "New" }));
  failWrite = false;
  assert.equal((await loadProfile()).name, "Alex");
  disk.set(PROFILE_KEY, "bad json");
  await assert.rejects(loadProfile());
});
test("scan writes serialize, retry is idempotent, history capped at 100", async () => {
  disk.clear();
  const record = (i) => ({
    id: String(i),
    timestamp: new Date(2026, 9, 13).toISOString(),
    productName: "Product " + i,
    calories: i === 0 ? null : 100,
    basis: "100g",
  });
  await Promise.all(
    Array.from({ length: 105 }, (_, i) => appendScan(record(i))),
  );
  let history = await loadScanHistory();
  assert.equal(history.length, 100);
  assert.equal(history[0].id, "104");
  await appendScan(record(104));
  assert.equal((await loadScanHistory()).length, 100);
  failWrite = true;
  await assert.rejects(appendScan(record(200)));
  failWrite = false;
  await appendScan(record(201));
  assert.equal((await loadScanHistory())[0].id, "201");
  disk.set(HISTORY_KEY, "corrupted");
  await assert.rejects(appendScan(record(202)));
  assert.equal(disk.get(HISTORY_KEY), "corrupted");
});
test("API success, not-found, rate limit, invalid JSON, network and timeout", async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url) => {
      assert.match(url, /\/api\/v2\/product\/12345678\?fields=/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 1,
          product: { product_name: "Live", nutriments: {} },
        }),
      };
    };
    assert.equal((await fetchProduct("12345678")).name, "Live");
    global.fetch = async () => ({ ok: false, status: 404 });
    assert.equal(await fetchProduct("12345678"), null);
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(fetchProduct("12345678"), /Too many/);
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Bad JSON");
      },
    });
    await assert.rejects(fetchProduct("12345678"));
    global.fetch = async () => {
      throw new TypeError("Network");
    };
    await assert.rejects(fetchProduct("12345678"), /internet/);
    global.fetch = async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("Aborted"))),
      );
    await assert.rejects(fetchProduct("12345678", undefined, 10), /timed out/);
    const controller = new AbortController();
    const pending = fetchProduct("12345678", controller.signal);
    controller.abort();
    await assert.rejects(pending, /Aborted/);
    await assert.rejects(fetchProduct("invalid"), /valid numeric/);
  } finally {
    global.fetch = original;
  }
});
