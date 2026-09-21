/*
 * UI layer: a guided five-step consultation (Today / Data needs /
 * Devices / Paying / Confirm), then a verdict-first recommendation.
 * All calculations live in engine.js (BDD-tested via features/), all
 * pricing in data/offers.js, and QCI values in data/qci.js — nothing
 * here hard-codes a dollar amount or a QCI number. Results are computed
 * only after the user confirms their answers.
 */

const BIG3 = ["Verizon", "T-Mobile", "AT&T"];
const LAST_STEP = 5;

const ENGINE_DATA = {
  PLANS,
  DEVICES,
  CARRIER_PROMOS,
  CARRIER_FINANCE_MONTHS,
  QCI_BY_PLAN: typeof QCI_BY_PLAN !== "undefined" ? QCI_BY_PLAN : undefined,
};

const deviceById = (id) => DEVICES.find((d) => d.id === id);
const $ = (id) => document.getElementById(id);
const checkedValue = (name) => {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
};

// ------------------------------------------------------------- Wizard

let step = 1;
let skippedPaying = false;

const DATA_USE_LABEL = {
  light: "Light data",
  moderate: "Moderate data (priority)",
  heavy: "Heavy data (priority)",
  maximum: "Maximum data (always priority)",
};
const TRADE_LABEL = { none: "no trade-in", older: "older-flagship trade-ins", recent: "recent-flagship trade-ins" };
const AGE_LABEL = { under2: "under 2 years old", twoToFour: "2–4 years old", overFour: "over 4 years old", none: "unknown age" };

function summaries() {
  const lines = Number($("in-lines").value);
  const carrier = $("in-current-carrier").value;
  const monthly = Number($("in-current-monthly").value) || 0;
  const balance = Number($("in-current-balance").value) || 0;
  const s = {};
  s.today =
    `${lines} line(s)${carrier ? ` on ${carrier}` : ""}` +
    (monthly ? ` · ${money2(monthly)}/mo service` : "") +
    (balance ? ` · ${money(balance)} owed on phones` : "") +
    ` · phones ${AGE_LABEL[$("in-phone-age").value]}`;
  const hotspot = Number(checkedValue("hotspot"));
  s.needs =
    `${DATA_USE_LABEL[checkedValue("datause")]}` +
    (hotspot ? ` · up to ${hotspot}GB hotspot` : " · no hotspot") +
    ($("in-intl").checked ? " · international" : "");
  const cfg = currentLineConfigs();
  const withDevice = cfg.filter((c) => c.deviceId !== "none");
  if (withDevice.length === 0) {
    s.devices = "No new devices — keeping current phones";
  } else {
    const names = [...new Set(withDevice.map((c) => deviceById(c.deviceId).name))];
    s.devices = `${withDevice.length} × ${names.join(" / ")} · ${TRADE_LABEL[withDevice[0].tradeIn]}`;
  }
  const paths = [...document.querySelectorAll(".path-option:checked")].map((el) => el.value);
  const taxes = readTaxes();
  const taxText =
    taxes.mode === "estimate"
      ? ` · taxes estimated at ${WIRELESS_TAX_RATE.label}`
      : taxes.mode === "custom"
        ? ` · +${money2(taxes.perLine)}/line/mo taxes`
        : " · pre-tax prices";
  s.paying =
    (paths.length === 0 ? "Plan-only comparison" : `Comparing: ${paths.join(", ")}`) +
    ($("in-mvnos").checked ? " · MVNOs included" : "") +
    taxText;
  return s;
}

function railCard(label, text, gotoStep) {
  return `<div class="rail-card">
    <div class="rail-card-label">${label}</div>
    <div class="rail-card-text">${text}</div>
    <button type="button" class="rail-edit" data-goto="${gotoStep}">Edit</button>
  </div>`;
}

function renderRail() {
  const s = summaries();
  const cards = [];
  if (step > 1) cards.push(railCard("Today", s.today, 1));
  if (step > 2) cards.push(railCard("Data needs", s.needs, 2));
  if (step > 3) cards.push(railCard("Devices", s.devices, 3));
  if (step > 4 && !skippedPaying) cards.push(railCard("Paying", s.paying, 4));
  $("rail-answers").innerHTML = cards.join("");
  for (const btn of document.querySelectorAll(".rail-edit")) {
    btn.addEventListener("click", () => {
      step = Number(btn.dataset.goto);
      showStep();
    });
  }
}

function renderConfirm() {
  const s = summaries();
  const card = (label, text, gotoStep) => `<div class="confirm-card">
    <div>
      <div class="rail-card-label">${label}</div>
      <div class="confirm-text">${text}</div>
    </div>
    <button type="button" class="rail-edit" data-goto="${gotoStep}">Edit</button>
  </div>`;
  $("confirm-body").innerHTML =
    card("Today", s.today, 1) +
    card("Data needs", s.needs, 2) +
    card("Devices", s.devices, 3) +
    (skippedPaying ? "" : card("Paying", s.paying, 4));
  for (const btn of document.querySelectorAll("#confirm-body .rail-edit")) {
    btn.addEventListener("click", () => {
      step = Number(btn.dataset.goto);
      showStep();
    });
  }
}

function showStep() {
  for (const panel of document.querySelectorAll(".step")) {
    panel.hidden = Number(panel.dataset.step) !== step;
  }
  for (const li of document.querySelectorAll("#stepper li")) {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === step);
    li.classList.toggle("done", n < step && !(n === 4 && skippedPaying));
    li.classList.toggle("skipped", n === 4 && skippedPaying && step > 4);
  }
  if (step === 3) {
    $("stepper-of").textContent = `of ${$("in-lines").value}`;
    tradeInHint();
  }
  if (step === 5) renderConfirm();
  renderRail();
  $("btn-back").disabled = step === 1;
  $("btn-next").textContent =
    step === 5 ? "Show my recommendation" : step === 4 ? "Review my answers" : "Next";
}

function anyNewDevices() {
  return currentLineConfigs().some((c) => c.deviceId !== "none");
}

$("btn-back").addEventListener("click", () => {
  if (step === 5 && skippedPaying) step = 3;
  else if (step > 1) step--;
  showStep();
});

$("btn-next").addEventListener("click", () => {
  if (step === 5) {
    showResults();
    return;
  }
  // Graph-driven flow: the payment-paths question only exists when a new
  // device is in play, so it is skipped when nobody needs a phone.
  if (step === 3 && !anyNewDevices()) {
    skippedPaying = true;
    step = 5;
  } else {
    if (step === 3) skippedPaying = false;
    step++;
  }
  showStep();
});

$("btn-edit").addEventListener("click", () => {
  $("results").hidden = true;
  $("app-shell").hidden = false;
  showStep();
});

// ------------------------------------------------------------- Inputs

function deviceOptions(selected) {
  const opts = DEVICES.map(
    (d) => `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${d.name}</option>`
  );
  return `<option value="none" ${selected === "none" ? "selected" : ""}>No new device (BYOD)</option>` + opts.join("");
}

function tradeInOptions(selected) {
  return ["none", "older", "recent"]
    .map(
      (v) =>
        `<option value="${v}" ${v === selected ? "selected" : ""}>` +
        { none: "No trade-in", older: "Older flagship (~3 yrs)", recent: "Recent flagship (last year)" }[v] +
        "</option>"
    )
    .join("");
}

function renderDeviceCards() {
  $("device-cards").innerHTML =
    DEVICES.map(
      (d, i) => `<label class="choice-card choice-device"><input type="radio" name="device" value="${d.id}" ${i === 0 ? "checked" : ""}>
      <span class="choice-meta">${d.maker}</span>
      <span class="choice-title">${d.name}</span>
      <span class="choice-desc">${money2(d.retail)}</span>
    </label>`
    ).join("") +
    `<label class="choice-card choice-device"><input type="radio" name="device" value="none">
      <span class="choice-meta">Keep current phones</span>
      <span class="choice-title">No new device</span>
      <span class="choice-desc">Plan-only comparison</span>
    </label>`;
}

function renderLineEditor() {
  const lines = Number($("in-lines").value);
  const wrap = $("line-editor");
  const existing = wrap.querySelectorAll(".line-row").length;
  if (existing === lines) return;
  const prev = [...wrap.querySelectorAll(".line-row")].map((row) => ({
    deviceId: row.querySelector(".line-device").value,
    tradeIn: row.querySelector(".line-tradein").value,
  }));
  wrap.innerHTML = Array.from({ length: lines }, (_, i) => {
    const p = prev[i] || { deviceId: i === 0 ? DEVICES[0].id : "none", tradeIn: "none" };
    return `<div class="line-row">
      <span class="line-label">Line ${i + 1}</span>
      <select class="line-device" aria-label="Line ${i + 1} device">${deviceOptions(p.deviceId)}</select>
      <select class="line-tradein" aria-label="Line ${i + 1} trade-in">${tradeInOptions(p.tradeIn)}</select>
    </div>`;
  }).join("");
}

$("in-customlines").addEventListener("input", () => {
  const custom = $("in-customlines").checked;
  $("uniform-inputs").hidden = custom;
  $("line-editor").hidden = !custom;
  if (custom) renderLineEditor();
});

// Graph-driven prefill: the current phones' age answers the trade-in
// question before it is asked (the user can still override it).
function tradeInHint() {
  const age = $("in-phone-age").value;
  const hint = $("tradein-hint");
  if ($("in-tradein").dataset.touched === "yes") {
    hint.hidden = true;
    return;
  }
  $("in-tradein").value = suggestTradeIn(age);
  const label = { recent: "Recent flagship", older: "Older flagship", none: "No trade-in" }[suggestTradeIn(age)];
  hint.hidden = false;
  hint.innerHTML = `Because your current phones are ${AGE_LABEL[age]}, the trade-in is set to <strong>${label}</strong> — trade-ins unlock the biggest carrier promos. Change it above if that's wrong.`;
}
$("in-phone-age").addEventListener("input", tradeInHint);
$("in-tradein").addEventListener("input", () => {
  $("in-tradein").dataset.touched = "yes";
  $("tradein-hint").hidden = true;
});

// Device-count stepper.
function clampDevices(delta) {
  const lines = Number($("in-lines").value);
  const el = $("in-newdevices");
  let v = Number(el.value) + delta;
  v = Math.max(0, Math.min(lines, v));
  el.value = String(v);
}
$("dev-minus").addEventListener("click", () => clampDevices(-1));
$("dev-plus").addEventListener("click", () => clampDevices(1));

function currentLineConfigs() {
  const lines = Number($("in-lines").value);
  if ($("in-customlines").checked) {
    renderLineEditor();
    return [...$("line-editor").querySelectorAll(".line-row")].map((row) => ({
      deviceId: row.querySelector(".line-device").value,
      tradeIn: row.querySelector(".line-tradein").value,
    }));
  }
  let newDevices = Number($("in-newdevices").value);
  if (newDevices > lines) {
    newDevices = lines;
    $("in-newdevices").value = String(lines);
  }
  const deviceId = checkedValue("device") || "none";
  const tradeIn = $("in-tradein").value;
  return Array.from({ length: lines }, (_, i) =>
    i < newDevices && deviceId !== "none" ? { deviceId, tradeIn } : { deviceId: "none", tradeIn: "none" }
  );
}

function readInputs() {
  const paths = new Set(
    [...document.querySelectorAll(".path-option:checked")].map((el) => el.value)
  );
  return {
    lines: Number($("in-lines").value),
    lineConfigs: currentLineConfigs(),
    paths,
    needs: {
      dataUse: checkedValue("datause"),
      hotspotGB: Number(checkedValue("hotspot")),
      international: $("in-intl").checked,
    },
    includeMvnos: $("in-mvnos").checked,
    taxes: readTaxes(),
  };
}

function readTaxes() {
  const mode = checkedValue("taxmode") || "estimate";
  if (mode === "custom") return { mode, perLine: Number($("in-fees").value) || 0 };
  if (mode === "estimate") return { mode, rate: WIRELESS_TAX_RATE.rate };
  return { mode: "none" };
}

// ------------------------------------------------------------ Results

function availabilityNotice(deviceLines, input) {
  const messages = [];
  const missing = new Map();
  for (const dl of deviceLines) {
    const d = deviceById(dl.deviceId);
    const not = BIG3.filter((c) => !d.soldBy.includes(c));
    if (not.length) missing.set(d.name, not);
  }
  for (const [name, carriers] of missing) {
    messages.push(
      `<strong>${name}</strong> is not sold by ${carriers.join(" or ")} — on those carriers it's priced as a manufacturer purchase (BYOD).`
    );
  }
  if (input.paths.has("lease")) {
    const noLease = [...new Set(
      deviceLines.map((dl) => deviceById(dl.deviceId)).filter((d) => !d.lease).map((d) => d.name)
    )];
    if (noLease.length) {
      messages.push(
        `No lease offer in the data for <strong>${noLease.join(", ")}</strong> — lease options are omitted for this selection.`
      );
    }
  }
  const el = $("availability-note");
  el.hidden = messages.length === 0;
  el.innerHTML = messages.join("<br>");
}

function qciBadge(o) {
  if (!o.plan.mvno || !o.qci) return "";
  return `<span class="qci" title="${QCI_EXPLANATION}">*QCI ${o.qci.value}</span>`;
}

function featureSummary(plan) {
  const f = plan.features || {};
  const parts = [];
  parts.push(
    f.premiumData === "unlimited" ? "unlimited priority data" : f.premiumData ? `${f.premiumData}GB priority data` : "no priority data"
  );
  if (f.hotspotGB) parts.push(`${f.hotspotGB}GB hotspot`);
  if (f.international) parts.push("international included");
  return parts.join(" · ");
}

function optionDetail(o, input) {
  const d = [];
  const priceNow = o.plan.perLine[input.lines].price;
  d.push(
    `Plan: ${o.plan.carrier} ${o.plan.name} — ${money2(priceNow)}/line × ${input.lines} line(s)` +
      (o.plan.intro ? ` (first ${o.plan.intro.months} months at ${money2(o.plan.intro.perLine)}/line)` : "") +
      ` ≈ ${money2(o.planMonthly)}/mo → ${money(o.plan24)} over 24 months.`
  );
  if (!o.plan.taxesIncluded && input.taxes && input.taxes.mode === "estimate") {
    d.push(`Includes estimated taxes & fees at ${WIRELESS_TAX_RATE.label} — the national average; your state runs from under 17% to over 38%.`);
  }
  if (o.plan.notes) d.push(o.plan.notes);
  if (o.qci) {
    d.push(`Network priority: QCI ${o.qci.value}${o.plan.mvno ? ` on the ${o.plan.network} network` : ""}. ${o.qci.note}`);
    if (o.plan.mvno) d.push(QCI_EXPLANATION);
  }
  if (o.pathKey !== "byod") {
    d.push(
      o.pathKey === "outright"
        ? `Devices: ${money(o.upfront)} paid upfront.`
        : `Devices: ${money(o.devicePaid24)} paid by month 24.`
    );
  }
  if (o.creditsApplied > 0) d.push(`Credits/trade-in applied by month 24: ${money(o.creditsApplied)}.`);
  if (o.owedAt24 > 0)
    d.push(
      `Still owed on devices at month 24: ${money(o.owedAt24)} (financing runs past the 24-month window). ` +
        `True 24-month cost: ${money(o.total24)} paid + ${money(o.owedAt24)} payoff = ${money(o.effective24)}.`
    );
  for (const n of o.notes) d.push(n);
  const sources = [`<a href="${o.plan.source}" target="_blank" rel="noopener">plan pricing</a>`];
  for (const id of new Set(input.lineConfigs.filter((c) => c.deviceId !== "none").map((c) => c.deviceId))) {
    const dev = deviceById(id);
    sources.push(`<a href="${dev.source}" target="_blank" rel="noopener">${dev.name} pricing</a>`);
  }
  d.push(`Sources: ${sources.join(" · ")} (retrieved ${DATA_RETRIEVED}).`);
  return d.map((t) => `<p>${t}</p>`).join("");
}

function chips(o) {
  return o.diffs.map((t) => `<span class="chip">${t}</span>`).join("");
}

function vsToday(o, current) {
  if (!current.monthly) return "";
  const s = savingsVsCurrent(o, current.monthly);
  const verb = s >= 0 ? "save about" : "spend about";
  return `<div class="hero-today">vs. today's ${money2(current.monthly)}/mo service-only bill: ${verb} ${money(Math.abs(s))} over 24 months (this option's number includes device costs; today's doesn't).</div>`;
}

function currentCarrierChip(o, current) {
  return o.plan.carrier === current.carrier ? '<span class="chip chip-muted">Your current carrier</span>' : "";
}

function heroCard(o, label, input, why, current) {
  return `<div class="hero-card ${label.startsWith("Best") ? "hero-best" : ""}">
    <div class="hero-label">${label}</div>
    <div class="hero-plan">${o.plan.carrier} ${o.plan.name}${o.estimated ? '<span class="est" title="Multi-line price estimated — verify on carrier site">*</span>' : ""}${qciBadge(o)}</div>
    <div class="hero-path">${o.pathLabel}</div>
    <div class="hero-total">${money(o.effective24)}<span class="hero-per"> over 24 months · ${money2(o.effective24 / 24)}/mo</span></div>
    ${o.owedAt24 > 0 ? `<div class="hero-owed">${money(o.total24)} paid in 24 months + ${money(o.owedAt24)} device balance at month 24</div>` : ""}
    <div class="hero-why">${why}</div>
    ${vsToday(o, current)}
    <div class="chips">${chips(o)}${currentCarrierChip(o, current)}</div>
    <details><summary>See the math</summary><div class="detail">${optionDetail(o, input)}</div></details>
  </div>`;
}

function optionRow(o, rank, maxEff, input, current, isTop) {
  const barPct = Math.max(4, Math.round((o.effective24 / maxEff) * 100));
  return `<div class="option-row ${isTop ? "option-top" : ""}">
    <div class="option-rank">${rank}</div>
    <div class="option-main">
      <div class="option-plan">${o.plan.carrier} ${o.plan.name}${o.estimated ? '<span class="est" title="Multi-line price estimated — verify on carrier site">*</span>' : ""}${qciBadge(o)} <span class="option-path">· ${o.pathLabel}</span></div>
      <div class="cost-bar"><div class="cost-bar-fill ${isTop ? "" : "cost-bar-muted"}" style="width: ${barPct}%;"></div></div>
      <div class="chips">${o.diffs.length ? chips(o) : '<span class="chip chip-muted">No standout advantage</span>'}${currentCarrierChip(o, current)}</div>
      <details><summary>See the math</summary><div class="detail">${optionDetail(o, input)}</div></details>
    </div>
    <div class="option-cost">${money(o.effective24)}<div class="option-per">${money2(o.effective24 / 24)}/mo</div></div>
  </div>`;
}

function verdictText(input, deviceLines) {
  const parts = [`For ${input.lines} line(s)`];
  parts.push(DATA_USE_LABEL[input.needs.dataUse].toLowerCase());
  if (input.needs.hotspotGB) parts.push(`${input.needs.hotspotGB}GB hotspot`);
  if (input.needs.international) parts.push("international use");
  if (deviceLines.length) {
    const names = [...new Set(deviceLines.map((d) => deviceById(d.deviceId).name))];
    parts.push(`${deviceLines.length} new ${names.join(" / ")}`);
  }
  return `${parts.join(", ")} — here's where you land.`;
}

function showResults() {
  const input = readInputs();
  const result = computeScenarios(ENGINE_DATA, input);
  const { deviceLines, excludedByNeeds } = result;

  availabilityNotice(deviceLines, input);
  const needsNote = $("needs-note");
  if (excludedByNeeds.length) {
    needsNote.hidden = false;
    needsNote.innerHTML =
      `${excludedByNeeds.length} plan(s) don't meet your data needs and were set aside: ` +
      excludedByNeeds.map((p) => `${p.carrier} ${p.name}`).join(", ") + ".";
  } else {
    needsNote.hidden = true;
  }

  const current = {
    monthly: Number($("in-current-monthly").value) || 0,
    balance: Number($("in-current-balance").value) || 0,
    carrier: $("in-current-carrier").value,
  };
  const classified = classifyResults(result);
  const { options, cheapest, best } = classified;

  $("verdict").textContent = options.length ? verdictText(input, deviceLines) : "";

  if (!options.length) {
    $("hero-cards").innerHTML = `<div class="hero-card"><div class="hero-plan">No plan in the data meets these needs</div><div class="hero-why">Relax a requirement — hotspot size and international coverage are the usual constraints.</div></div>`;
    $("ranked-title").textContent = "";
    $("ranked-list").innerHTML = "";
    $("tail-list").innerHTML = "";
    $("btn-tail").hidden = true;
    $("estimate-note").hidden = true;
  } else {
    const premium = bestPremium(classified);
    const bestWhy =
      premium.amount > 0
        ? `Worth ${money(premium.amount)} more than the cheapest for: ${premium.gains.join(", ")}.`
        : `The most plan for your needs: ${featureSummary(best.plan)}. And nothing qualifying costs less.`;
    const cheapWhy = `The lowest true 24-month cost that still meets your needs.`;
    $("hero-cards").innerHTML =
      (best === cheapest
        ? heroCard(best, "Best & cheapest option", input, bestWhy, current)
        : heroCard(best, "Best option", input, bestWhy, current) + heroCard(cheapest, "Cheapest option", input, cheapWhy, current)) +
      (current.balance > 0
        ? `<div class="banner">You still owe ${money(current.balance)} on your current phones — that's due (or settled by trade-in) whichever option you pick, so it doesn't change the ranking.</div>`
        : "");

    const maxEff = Math.max(...options.map((o) => o.effective24));
    const headline = options.filter((o) => o.diffs.length > 0);
    const tail = options.filter((o) => o.diffs.length === 0);
    $("ranked-title").textContent = `Every qualifying option, ranked (${options.length})`;
    $("ranked-list").innerHTML = headline
      .map((o, i) => optionRow(o, i + 1, maxEff, input, current, o === best || o === cheapest))
      .join("");
    if (tail.length) {
      $("btn-tail").hidden = false;
      $("btn-tail").textContent = `${tail.length} more option(s) without a standout advantage — show them`;
      $("tail-list").innerHTML = tail
        .map((o, i) => optionRow(o, headline.length + i + 1, maxEff, input, current, false))
        .join("");
      $("tail-list").hidden = true;
    } else {
      $("btn-tail").hidden = true;
      $("tail-list").innerHTML = "";
    }
    $("estimate-note").hidden = !options.some((o) => o.estimated);
  }

  $("app-shell").hidden = true;
  $("results").hidden = false;
  window.scrollTo({ top: 0 });
}

$("btn-tail").addEventListener("click", () => {
  const list = $("tail-list");
  list.hidden = !list.hidden;
  $("btn-tail").textContent = list.hidden
    ? $("btn-tail").textContent.replace("hide them", "show them")
    : $("btn-tail").textContent.replace("show them", "hide them");
});

// -------------------------------------------------------------- Setup

// Stale-data warning: offer data is meant to be refreshed monthly.
(function staleCheck() {
  const days = Math.floor((Date.now() - new Date(DATA_RETRIEVED)) / 86400000);
  if (days > 35) {
    $("stale-note").hidden = false;
    $("stale-note").textContent =
      `This offer data is ${days} days old and past its monthly refresh window — treat results as directional and verify current pricing.`;
  }
})();

// Plan-definitions reference panel: what the needs assessment matches on.
$("defs-date").textContent = DATA_RETRIEVED;
$("plan-defs-body").innerHTML = PLANS.map((p) => {
  const f = p.features || {};
  const est = new Set(f.estimatedFeatures || []);
  const mark = (field, text) => text + (est.has(field) ? "*" : "");
  const premium = f.premiumData === "unlimited" ? "unlimited priority data" : f.premiumData ? `${f.premiumData}GB priority data` : "no priority data";
  return `<p><strong>${p.carrier} ${p.name}</strong> — ${mark("premiumData", premium)} · ${mark("hotspotGB", `${f.hotspotGB}GB high-speed hotspot`)} · ${mark("international", f.international ? "international included" : "no international")}${f.note ? ` <span class="defs-detail">(${f.note})</span>` : ""}</p>`;
}).join("");

renderDeviceCards();
$("qci-legend").textContent = `* ${QCI_EXPLANATION}`;
$("data-date").textContent = DATA_RETRIEVED;
$("tax-rate-label").textContent = WIRELESS_TAX_RATE.label;
showStep();
