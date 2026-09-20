"use strict";
const assert = require("node:assert");
const { Given, When, Then, Before } = require("@cucumber/cucumber");
const offers = require("../../data/offers.js");
const qci = require("../../data/qci.js");
const engine = require("../../engine.js");

const clone = (v) => structuredClone(v);
const CLOSE = 0.01;
const planKey = (row) => `${row.plan.carrier} ${row.plan.name}`;

function deviceIdByName(data, name) {
  const d = data.DEVICES.find((d) => d.name === name);
  assert.ok(d, `no device named ${name} in the data`);
  return d.id;
}

function assertClose(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < CLOSE,
    `${label}: expected ${expected}, got ${actual}`
  );
}

Before(function () {
  this.data = {
    PLANS: clone(offers.PLANS),
    DEVICES: clone(offers.DEVICES),
    CARRIER_PROMOS: clone(offers.CARRIER_PROMOS),
    CARRIER_FINANCE_MONTHS: offers.CARRIER_FINANCE_MONTHS,
    QCI_BY_PLAN: qci.QCI_BY_PLAN,
  };
  this.input = {
    lines: 1,
    lineConfigs: [{ deviceId: "none", tradeIn: "none" }],
    paths: new Set(["carrier", "mfr", "outright", "lease"]),
    includeMvnos: false,
    feesPerLine: 0,
  };
});

// ------------------------------------------------------------- Givens

Given("{int} line(s) with no new devices", function (lines) {
  this.input.lines = lines;
  this.input.lineConfigs = Array.from({ length: lines }, () => ({ deviceId: "none", tradeIn: "none" }));
});

Given("{int} line(s) with a new {string} and no trade-in", function (lines, deviceName) {
  const deviceId = deviceIdByName(this.data, deviceName);
  this.input.lines = lines;
  this.input.lineConfigs = Array.from({ length: lines }, () => ({ deviceId, tradeIn: "none" }));
});

Given("{int} line(s) with a new {string} and a/an {string} trade-in", function (lines, deviceName, tradeIn) {
  const deviceId = deviceIdByName(this.data, deviceName);
  this.input.lines = lines;
  this.input.lineConfigs = Array.from({ length: lines }, () => ({ deviceId, tradeIn }));
});

Given("{int} lines where {int} get a new {string} and no trade-in", function (lines, withDevice, deviceName) {
  const deviceId = deviceIdByName(this.data, deviceName);
  this.input.lines = lines;
  this.input.lineConfigs = Array.from({ length: lines }, (_, i) =>
    i < withDevice ? { deviceId, tradeIn: "none" } : { deviceId: "none", tradeIn: "none" }
  );
});

Given("MVNOs are included", function () {
  this.input.includeMvnos = true;
});

Given("an estimated taxes and fees of {float} per line per month", function (fees) {
  this.input.feesPerLine = fees;
});

Given("the {string} is not sold by {string}", function (deviceName, carrier) {
  const d = this.data.DEVICES.find((d) => d.name === deviceName);
  assert.ok(d, `no device named ${deviceName}`);
  d.soldBy = d.soldBy.filter((c) => c !== carrier);
});

Given("only the {string} path is selected", function (path) {
  this.input.paths = new Set([path]);
});

Given("no paths are selected", function () {
  this.input.paths = new Set();
});

Given("the {string} path is also selected", function (path) {
  this.input.paths.add(path);
});

// -------------------------------------------------------------- When

When("the scenarios are computed", function () {
  const result = engine.computeScenarios(this.data, this.input);
  this.rows = result.rows;
});

// -------------------------------------------------------------- Thens

function rowsForPlan(rows, key) {
  const matched = rows.filter((r) => planKey(r) === key);
  assert.ok(matched.length, `no rows for plan "${key}"`);
  return matched;
}

function rowForPlanPath(rows, key, path) {
  const row = rows.find((r) => planKey(r) === key && r.pathKey === path);
  assert.ok(row, `no "${path}" row for plan "${key}"`);
  return row;
}

Then("the {string} rows have a 24-month plan cost of {float}", function (key, expected) {
  for (const r of rowsForPlan(this.rows, key)) assertClose(r.plan24, expected, `plan24 of ${key}`);
});

Then("the {string} rows are flagged as estimated", function (key) {
  for (const r of rowsForPlan(this.rows, key)) assert.ok(r.estimated, `${key} not flagged estimated`);
});

Then("the {string} rows are not flagged as estimated", function (key) {
  for (const r of rowsForPlan(this.rows, key)) assert.ok(!r.estimated, `${key} wrongly flagged estimated`);
});

Then("the {string} row for {string} has devices paid of {float}", function (key, path, expected) {
  assertClose(rowForPlanPath(this.rows, key, path).devicePaid24, expected, `devicePaid24 of ${key}/${path}`);
});

Then("the {string} row for {string} has owed at month 24 of {float}", function (key, path, expected) {
  assertClose(rowForPlanPath(this.rows, key, path).owedAt24, expected, `owedAt24 of ${key}/${path}`);
});

Then("the {string} row for {string} has upfront of {float}", function (key, path, expected) {
  assertClose(rowForPlanPath(this.rows, key, path).upfront, expected, `upfront of ${key}/${path}`);
});

Then("the {string} row for {string} has credits applied of {float}", function (key, path, expected) {
  assertClose(rowForPlanPath(this.rows, key, path).creditsApplied, expected, `creditsApplied of ${key}/${path}`);
});

Then("the {string} row for {string} is a promo row", function (key, path) {
  assert.ok(rowForPlanPath(this.rows, key, path).anyPromo, `${key}/${path} is not a promo row`);
});

Then("the {string} row for {string} is not a promo row", function (key, path) {
  assert.ok(!rowForPlanPath(this.rows, key, path).anyPromo, `${key}/${path} is unexpectedly a promo row`);
});

Then("no row uses the {string} path", function (path) {
  assert.ok(this.rows.every((r) => r.pathKey !== path), `found a ${path} row`);
});

Then("the {string} plan has no {string} row", function (key, path) {
  rowsForPlan(this.rows, key);
  assert.ok(!this.rows.some((r) => planKey(r) === key && r.pathKey === path), `${key} has a ${path} row`);
});

Then("every plan has exactly one row and it uses the {string} path", function (path) {
  const byPlan = new Map();
  for (const r of this.rows) byPlan.set(r.plan.id, (byPlan.get(r.plan.id) || 0) + 1);
  assert.ok(this.rows.length > 0, "no rows at all");
  for (const [id, count] of byPlan) assert.strictEqual(count, 1, `plan ${id} has ${count} rows`);
  assert.ok(this.rows.every((r) => r.pathKey === path), `a row uses a path other than ${path}`);
});

Then("every row uses the {string} path", function (path) {
  assert.ok(this.rows.length > 0, "no rows at all");
  assert.ok(this.rows.every((r) => r.pathKey === path), `a row uses a path other than ${path}`);
});

Then("every row's true cost equals its plan cost plus devices paid plus owed at month 24", function () {
  for (const r of this.rows) {
    assertClose(r.effective24, r.plan24 + r.devicePaid24 + r.owedAt24, `effective24 of ${planKey(r)}/${r.pathKey}`);
  }
});

Then("the rows are sorted by true cost ascending", function () {
  for (let i = 1; i < this.rows.length; i++) {
    assert.ok(
      this.rows[i].effective24 >= this.rows[i - 1].effective24 - CLOSE,
      `row ${i} (${this.rows[i].effective24}) sorts before row ${i - 1} (${this.rows[i - 1].effective24})`
    );
  }
});

Then("every plan with device rows has exactly one row tagged best", function () {
  const plans = new Set(this.rows.filter((r) => r.pathKey !== "byod").map((r) => r.plan.id));
  for (const id of plans) {
    const tagged = this.rows.filter((r) => r.plan.id === id && r.bestForPlan);
    assert.strictEqual(tagged.length, 1, `plan ${id} has ${tagged.length} best-tagged rows`);
  }
});

Then("every best-tagged row has the lowest true cost among its plan's device rows", function () {
  for (const r of this.rows.filter((r) => r.bestForPlan)) {
    const siblings = this.rows.filter((s) => s.plan.id === r.plan.id && s.pathKey !== "byod");
    const min = Math.min(...siblings.map((s) => s.effective24));
    assertClose(r.effective24, min, `best-tagged row of ${planKey(r)}`);
  }
});

Then("no {string} row is tagged best", function (path) {
  assert.ok(!this.rows.some((r) => r.pathKey === path && r.bestForPlan), `a ${path} row is tagged best`);
});

Then("the {string} rows carry QCI {int}", function (key, value) {
  for (const r of rowsForPlan(this.rows, key)) {
    assert.ok(r.qci, `${key} has no QCI attached`);
    assert.strictEqual(r.qci.value, value, `${key} QCI is ${r.qci.value}, expected ${value}`);
  }
});

// -------------------------------------------------- Data integrity

Then("every plan in the offer data has a QCI entry", function () {
  for (const p of offers.PLANS) {
    assert.ok(qci.QCI_BY_PLAN[p.id], `plan ${p.id} has no QCI entry in data/qci.js`);
  }
});

Then("every plan has a positive per-line price for 1 through 5 lines", function () {
  for (const p of offers.PLANS) {
    for (const n of [1, 2, 3, 4, 5]) {
      assert.ok(p.perLine[n] && p.perLine[n].price > 0, `plan ${p.id} has no price for ${n} lines`);
    }
  }
});

Then("every plan, device, and promo has an https source URL", function () {
  for (const item of [...offers.PLANS, ...offers.DEVICES, ...offers.CARRIER_PROMOS]) {
    assert.ok(
      typeof item.source === "string" && item.source.startsWith("https://"),
      `${item.id} has no https source`
    );
  }
});

Then("every promo's devices exist and its required tier is valid", function () {
  const deviceIds = new Set(offers.DEVICES.map((d) => d.id));
  for (const promo of offers.CARRIER_PROMOS) {
    for (const id of promo.deviceIds) assert.ok(deviceIds.has(id), `promo ${promo.id} references unknown device ${id}`);
    assert.ok(["base", "mid", "top"].includes(promo.requiresTier), `promo ${promo.id} has invalid tier`);
    assert.ok(offers.PLANS.some((p) => p.carrier === promo.carrier), `promo ${promo.id} carrier has no plans`);
  }
});

Then("every device is sold only by known carriers and has older and recent trade-in values", function () {
  const carriers = new Set(offers.PLANS.map((p) => p.carrier));
  for (const d of offers.DEVICES) {
    for (const c of d.soldBy) assert.ok(carriers.has(c), `device ${d.id} soldBy unknown carrier ${c}`);
    assert.ok(d.mfrTradeIn.older > 0 && d.mfrTradeIn.recent > 0, `device ${d.id} missing trade-in values`);
    assert.ok(d.retail > 0, `device ${d.id} has no retail price`);
  }
});

Then("the offer and QCI retrieval dates are valid dates", function () {
  for (const date of [offers.DATA_RETRIEVED, qci.QCI_RETRIEVED]) {
    assert.ok(!Number.isNaN(new Date(date).getTime()), `invalid retrieval date: ${date}`);
  }
});
