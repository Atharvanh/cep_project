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

const {
  mealFromProduct,
  sumMeals,
  localDate,
  nutritionGoals,
  validateMealDays,
} = load("nutrition");
const { loadMeals, updateMeal, MEALS_KEY } = load("storage");
const { buildHealthReport } = load("report");
const p = {
  name: "Alex",
  age: "22",
  gender: "Woman",
  height: "170",
  weight: "70",
  bmi: 24.2,
  bmiCategory: "Normal",
  blood: "Unknown",
  conditions: [],
  cycle: false,
};
const item = {
  barcode: "12345678",
  name: "Food",
  brand: "Brand",
  basis: "100g",
  calories: 200,
  carbs: 30,
  protein: 10,
  fat: 5,
};
const now = new Date(2026, 9, 13, 23, 59);
test("portion scales per 100g and serving independently; invalid or incomplete nutrition rejected", () => {
  const m = mealFromProduct(item, 150, "1", now);
  assert.equal(m.calories, 300);
  assert.equal(m.carbs, 45);
  assert.equal(m.protein, 15);
  assert.equal(m.fat, 7.5);
  assert.equal(m.date, "2026-10-13");
  assert.equal(
    mealFromProduct({ ...item, basis: "serving" }, 2, "2", now).calories,
    400,
  );
  for (const portion of [0, -1, NaN, Infinity, 5001])
    assert.throws(() => mealFromProduct(item, portion, "x", now));
  assert.throws(() =>
    mealFromProduct({ ...item, protein: null }, 100, "x", now),
  );
  assert.equal(mealFromProduct({ ...item, fat: 0 }, 100, "x", now).fat, 0);
});
test("local calendar date crosses midnight without changing previous records", () => {
  const tomorrow = new Date(2026, 9, 14, 0, 1);
  assert.equal(localDate(now), "2026-10-13");
  assert.equal(localDate(tomorrow), "2026-10-14");
  assert.equal(mealFromProduct(item, 100, "a", now).date, "2026-10-13");
  assert.equal(mealFromProduct(item, 100, "b", tomorrow).date, "2026-10-14");
});
test("goals respond to weight/BMI, conserve macro energy, exclude minors/incomplete profiles", () => {
  const g = nutritionGoals(p);
  assert.equal(g.calories, 2100);
  assert.equal(g.protein, 105);
  assert.ok(
    Math.abs(g.carbs * 4 + g.protein * 4 + g.fat * 9 - g.calories) < 0.001,
  );
  assert.equal(nutritionGoals({ ...p, weight: "80", bmi: 28 }).protein, 150);
  assert.equal(nutritionGoals({ ...p, age: "16" }), null);
  assert.equal(nutritionGoals({ ...p, weight: "" }), null);
});
test("daily storage preserves separate dates; concurrent writes, idempotent retry, removal and roundtrip", async () => {
  disk.clear();
  const one = mealFromProduct(item, 100, "one", now);
  const two = mealFromProduct(item, 200, "two", now);
  const later = mealFromProduct(item, 50, "later", new Date(2026, 9, 14));
  await Promise.all([
    updateMeal(one.date, one.id, one),
    updateMeal(two.date, two.id, two),
    updateMeal(later.date, later.id, later),
  ]);
  await updateMeal(one.date, one.id, one);
  let days = await loadMeals();
  assert.equal(days[one.date].length, 2);
  assert.equal(sumMeals(days[one.date]).calories, 600);
  assert.equal(sumMeals(days[later.date]).calories, 100);
  await updateMeal(one.date, one.id, null);
  assert.equal(sumMeals((await loadMeals())[one.date]).calories, 400);
  const saved = disk.get(MEALS_KEY);
  failWrite = true;
  await assert.rejects(updateMeal(one.date, one.id, one));
  failWrite = false;
  assert.equal(disk.get(MEALS_KEY), saved);
  await updateMeal(one.date, one.id, one);
  assert.equal((await loadMeals())[one.date].length, 2);
  disk.set(MEALS_KEY, "bad");
  await assert.rejects(updateMeal(one.date, one.id, one));
  assert.equal(disk.get(MEALS_KEY), "bad");
  assert.throws(() =>
    validateMealDays({ "2026-10-13": [{ ...one, calories: "200" }] }),
  );
});
test("report escapes profile/product text and distinguishes label energy, consumption and unknown data", () => {
  const m = mealFromProduct(item, 100, "one", now);
  const html = buildHealthReport({
    profile: { ...p, name: "<script>bad</script>", conditions: ["A & B"] },
    date: m.date,
    goals: nutritionGoals(p),
    totals: sumMeals([m]),
    meals: [m],
    scans: [
      {
        id: "s",
        timestamp: now.toISOString(),
        productName: "<img src=x onerror=bad>",
        calories: null,
        basis: "serving",
      },
    ],
  });
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("A &amp; B"));
  assert.ok(html.includes("Unavailable / serving"));
  assert.ok(html.includes("not necessarily eaten"));
  assert.ok(html.includes("200 kcal"));
  const empty = buildHealthReport({
    profile: p,
    date: "2026-10-13",
    goals: null,
    totals: sumMeals([]),
    meals: [],
    scans: [],
  });
  assert.ok(empty.includes("No meals logged"));
  assert.ok(empty.includes("No saved scans."));
  assert.ok(empty.includes("Not calculated"));
});
