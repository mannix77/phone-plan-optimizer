/*
 * UI layer. All calculations live in engine.js (BDD-tested via
 * features/), all pricing in data/offers.js, and QCI priority values in
 * data/qci.js — nothing here hard-codes a dollar amount or a QCI number.
 */

const BIG3 = ["Verizon", "T-Mobile", "AT&T"];

const ENGINE_DATA = {
  PLANS,
  DEVICES,
  CARRIER_PROMOS,
  CARRIER_FINANCE_MONTHS,
  QCI_BY_PLAN: typeof QCI_BY_PLAN !== "undefined" ? QCI_BY_PLAN : undefined,
};

const deviceById = (id) => DEVICES.find((d) => d.id === id);

// ---------------------------------------------------------------- UI

const $ = (id) => document.getElementById(id);

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
  for (const el of wrap.querySelectorAll("select")) el.addEventListener("input", render);
}

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
  $("uniform-inputs").hidden = custom;
  $("line-editor").hidden = !custom;
  const paths = new Set(
    [...document.querySelectorAll(".path-option:checked")].map((el) => el.value)
  );
  return {
    lines,
    lineConfigs,
    paths,
    includeMvnos: $("in-mvnos").checked,
    feesPerLine: Number($("in-fees").value) || 0,
  };
}

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
        `No lease offer in the data for <strong>${noLease.join(", ")}</strong> — lease rows are hidden for this selection.`
      );
    }
  }
  const el = $("availability-note");
  el.hidden = messages.length === 0;
  el.innerHTML = messages.join("<br>");
}

function qciBadge(r) {
  if (!r.plan.mvno || !r.qci) return "";
  return `<span class="qci" title="${QCI_EXPLANATION}">*QCI ${r.qci.value}</span>`;
}

function rowDetail(r, input) {
  const d = [];
  const priceNow = r.plan.perLine[input.lines].price;
  d.push(
    `Plan: ${r.plan.carrier} ${r.plan.name} — ${money2(priceNow)}/line × ${input.lines} line(s)` +
      (r.plan.intro ? ` (first ${r.plan.intro.months} months at ${money2(r.plan.intro.perLine)}/line)` : "") +
      ` ≈ ${money2(r.planMonthly)}/mo → ${money(r.plan24)} over 24 months.`
  );
  if (r.plan.notes) d.push(r.plan.notes);
  if (r.qci) {
    d.push(`Network priority: QCI ${r.qci.value}${r.plan.mvno ? ` on the ${r.plan.network} network` : ""}. ${r.qci.note}`);
    if (r.plan.mvno) d.push(QCI_EXPLANATION);
  }
  if (r.pathKey !== "byod") {
    d.push(
      r.pathKey === "outright"
        ? `Devices: ${money(r.upfront)} paid upfront.`
        : `Devices: ${money(r.devicePaid24)} paid by month 24.`
    );
  }
  if (r.creditsApplied > 0) d.push(`Credits/trade-in applied by month 24: ${money(r.creditsApplied)}.`);
  if (r.owedAt24 > 0)
    d.push(
      `Still owed on devices at month 24: ${money(r.owedAt24)} (financing runs past the 24-month window). ` +
        `True 24-month cost: ${money(r.total24)} paid + ${money(r.owedAt24)} payoff = ${money(r.effective24)}.`
    );
  for (const n of r.notes) d.push(n);
  const sources = [`<a href="${r.plan.source}" target="_blank" rel="noopener">plan pricing</a>`];
  for (const dl of new Set(input.lineConfigs.filter((c) => c.deviceId !== "none").map((c) => c.deviceId))) {
    const dev = deviceById(dl);
    sources.push(`<a href="${dev.source}" target="_blank" rel="noopener">${dev.name} pricing</a>`);
  }
  d.push(`Sources: ${sources.join(" · ")} (retrieved ${DATA_RETRIEVED}).`);
  return d.map((t) => `<p>${t}</p>`).join("");
}

function render() {
  const input = readInputs();
  const { rows, deviceLines } = computeScenarios(ENGINE_DATA, input);
  availabilityNotice(deviceLines, input);
  const best = rows[0];

  const deviceSummary =
    deviceLines.length === 0
      ? "bring your own devices"
      : deviceLines.length === input.lines && new Set(deviceLines.map((d) => d.deviceId)).size === 1
        ? `${deviceLines.length} × ${deviceById(deviceLines[0].deviceId).name}`
        : `${deviceLines.length} new device(s)`;

  $("best-pick").innerHTML = `
    <div class="best-label">Lowest true 24-month cost for ${input.lines} line(s), ${deviceSummary}</div>
    <div class="best-main">${best.plan.carrier} ${best.plan.name} · ${best.pathLabel}</div>
    <div class="best-total">${money(best.effective24)}<span class="best-per"> true cost · ${money(best.total24)} paid in 24 mo${best.owedAt24 > 0 ? ` + ${money(best.owedAt24)} device payoff` : ""} · ${money2(best.total24 / 24)}/mo average</span></div>
    ${deviceLines.length ? `<div class="best-path-note">${best.pathKey === "byod" ? "" : `Best way to get the device${input.lines > 1 ? "s" : ""} here: <strong>${best.pathLabel.toLowerCase()}</strong>. Each plan's best path is tagged in the table.`}</div>` : ""}
  `;

  $("estimate-note").hidden = !rows.some((r) => r.estimated);

  $("results-body").innerHTML = rows
    .map(
      (r, i) => `
    <tr class="${i === 0 ? "top-row" : ""}">
      <td>
        <span class="carrier">${r.plan.carrier}</span>
        ${r.plan.name}${r.estimated ? '<span class="est" title="Multi-line price estimated — verify on carrier site">*</span>' : ""}
        ${qciBadge(r)}
      </td>
      <td>${r.pathLabel}${r.anyPromo ? ' <span class="pill">promo</span>' : ""}${r.bestForPlan && deviceLines.length ? ' <span class="pill best-pill">best path</span>' : ""}</td>
      <td class="num">${money(r.plan24)}</td>
      <td class="num">${money(r.devicePaid24)}</td>
      <td class="num">${r.upfront ? money(r.upfront) : "—"}</td>
      <td class="num">${r.owedAt24 ? money(r.owedAt24) : "—"}</td>
      <td class="num">${money(r.total24)}</td>
      <td class="num total">${money(r.effective24)}</td>
      <td class="detail-cell">
        <details><summary>math</summary><div class="detail">${rowDetail(r, input)}</div></details>
      </td>
    </tr>`
    )
    .join("");

  $("qci-legend").hidden = !input.includeMvnos;
}

// Stale-data warning: offer data is meant to be refreshed monthly.
(function staleCheck() {
  const days = Math.floor((Date.now() - new Date(DATA_RETRIEVED)) / 86400000);
  if (days > 35) {
    $("stale-note").hidden = false;
    $("stale-note").textContent =
      `This offer data is ${days} days old and past its monthly refresh window — treat results as directional and verify current pricing.`;
  }
})();

$("in-device").innerHTML = DEVICES.map(
  (d, i) => `<option value="${d.id}" ${i === 0 ? "selected" : ""}>${d.name}</option>`
).join("");
$("qci-legend").textContent = `* ${QCI_EXPLANATION}`;
$("data-date").textContent = DATA_RETRIEVED;
for (const el of document.querySelectorAll("#inputs input, #inputs select")) {
  el.addEventListener("input", render);
}
render();
