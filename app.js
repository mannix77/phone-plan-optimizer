/*
 * UI layer: a four-step guided flow, then a classified recommendation.
 * All calculations live in engine.js (BDD-tested via features/), all
 * pricing in data/offers.js, and QCI values in data/qci.js — nothing
 * here hard-codes a dollar amount or a QCI number. Results are computed
 * only when the user finishes the questions.
 */

const BIG3 = ["Verizon", "T-Mobile", "AT&T"];
const LAST_STEP = 4;

const ENGINE_DATA = {
  PLANS,
  DEVICES,
  CARRIER_PROMOS,
  CARRIER_FINANCE_MONTHS,
  QCI_BY_PLAN: typeof QCI_BY_PLAN !== "undefined" ? QCI_BY_PLAN : undefined,
};

const deviceById = (id) => DEVICES.find((d) => d.id === id);
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------- Wizard

let step = 1;

function showStep() {
  for (const panel of document.querySelectorAll(".step")) {
    panel.hidden = Number(panel.dataset.step) !== step;
  }
  for (const li of document.querySelectorAll("#stepper li")) {
    li.classList.toggle("active", Number(li.dataset.step) === step);
    li.classList.toggle("done", Number(li.dataset.step) < step);
  }
  $("btn-back").disabled = step === 1;
  $("btn-next").textContent = step === LAST_STEP ? "See my recommendation" : "Next";
}

$("btn-back").addEventListener("click", () => {
  if (step > 1) step--;
  showStep();
});

$("btn-next").addEventListener("click", () => {
  // Graph-driven flow: the payment-paths question only exists when a new
  // device is in play, so it is skipped when nobody needs a phone.
  if (step === 3 && !anyNewDevices()) {
    showResults();
    return;
  }
  if (step < LAST_STEP) {
    step++;
    showStep();
  } else {
    showResults();
  }
});

function anyNewDevices() {
  if ($("in-customlines").checked) {
    return [...$("line-editor").querySelectorAll(".line-device")].some((el) => el.value !== "none");
  }
  return Number($("in-newdevices").value) > 0;
}

// Graph-driven prefill: the current phones' age answers the trade-in
// question before it is asked (the user can still override it).
$("in-phone-age").addEventListener("input", () => {
  $("in-tradein").value = suggestTradeIn($("in-phone-age").value);
});

$("btn-edit").addEventListener("click", () => {
  $("results").hidden = true;
  $("wizard").hidden = false;
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

function readInputs() {
  const lines = Number($("in-lines").value);
  const custom = $("in-customlines").checked;
  let lineConfigs;
  if (custom) {
    renderLineEditor();
    lineConfigs = [...$("line-editor").querySelectorAll(".line-row")].map((row) => ({
      deviceId: row.querySelector(".line-device").value,
      tradeIn: row.querySelector(".line-tradein").value,
    }));
  } else {
    let newDevices = Number($("in-newdevices").value);
    if (newDevices > lines) {
      newDevices = lines;
      $("in-newdevices").value = String(lines);
    }
    const deviceId = $("in-device").value;
    const tradeIn = $("in-tradein").value;
    lineConfigs = Array.from({ length: lines }, (_, i) =>
      i < newDevices ? { deviceId, tradeIn } : { deviceId: "none", tradeIn: "none" }
    );
  }
  const paths = new Set(
    [...document.querySelectorAll(".path-option:checked")].map((el) => el.value)
  );
  return {
    lines,
    lineConfigs,
    paths,
    needs: {
      dataUse: $("in-datause").value,
      hotspotGB: Number($("in-hotspot").value),
      international: $("in-intl").checked,
    },
    includeMvnos: $("in-mvnos").checked,
    feesPerLine: Number($("in-fees").value) || 0,
  };
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
  return `<div class="hero-card ${label === "Best option" ? "hero-best" : ""}">
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

function showResults() {
  const input = readInputs();
  const result = computeScenarios(ENGINE_DATA, input);
  const { rows, deviceLines, excludedByNeeds } = result;

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
  const { options, cheapest, best } = classifyResults(result);

  if (!options.length) {
    $("hero-cards").innerHTML = `<div class="hero-card"><div class="hero-plan">No plan in the data meets these needs</div><div class="hero-why">Relax a requirement — hotspot size and international coverage are the usual constraints.</div></div>`;
    $("ranked-title").textContent = "";
    $("ranked-list").innerHTML = "";
    $("estimate-note").hidden = true;
  } else {
    const bestWhy = `The most plan for your needs: ${featureSummary(best.plan)}.`;
    const cheapWhy = `The lowest true 24-month cost that still meets your needs.`;
    $("hero-cards").innerHTML =
      (best === cheapest
        ? heroCard(best, "Best & cheapest option", input, `${bestWhy} And nothing qualifying costs less.`, current)
        : heroCard(best, "Best option", input, bestWhy, current) + heroCard(cheapest, "Cheapest option", input, cheapWhy, current)) +
      (current.balance > 0
        ? `<div class="banner">You still owe ${money(current.balance)} on your current phones — that's due (or settled by trade-in) whichever option you pick, so it doesn't change the ranking.</div>`
        : "");

    $("ranked-title").textContent = `Every qualifying option, ranked (${options.length})`;
    $("ranked-list").innerHTML = options
      .map(
        (o, i) => `<div class="option-row ${o === best || o === cheapest ? "option-top" : ""}">
        <div class="option-rank">${i + 1}</div>
        <div class="option-main">
          <div class="option-plan">${o.plan.carrier} ${o.plan.name}${o.estimated ? '<span class="est" title="Multi-line price estimated — verify on carrier site">*</span>' : ""}${qciBadge(o)} <span class="option-path">· ${o.pathLabel}</span></div>
          <div class="chips">${o.diffs.length ? chips(o) : '<span class="chip chip-muted">No standout advantage</span>'}${currentCarrierChip(o, current)}</div>
          <details><summary>See the math</summary><div class="detail">${optionDetail(o, input)}</div></details>
        </div>
        <div class="option-cost">${money(o.effective24)}<div class="option-per">${money2(o.effective24 / 24)}/mo</div></div>
      </div>`
      )
      .join("");
    $("estimate-note").hidden = !options.some((o) => o.estimated);
  }

  $("wizard").hidden = true;
  $("results").hidden = false;
  window.scrollTo({ top: 0 });
}

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

$("in-device").innerHTML = DEVICES.map(
  (d, i) => `<option value="${d.id}" ${i === 0 ? "selected" : ""}>${d.name}</option>`
).join("");
$("qci-legend").textContent = `* ${QCI_EXPLANATION}`;
$("data-date").textContent = DATA_RETRIEVED;
showStep();
