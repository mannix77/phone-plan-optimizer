/*
 * TCO engine + UI. All pricing comes from data/offers.js and QCI
 * priority values from data/qci.js — nothing here hard-codes a dollar
 * amount or a QCI number.
 *
 * Cost model (24-month horizon):
 *  - Plan: per-line price at the chosen line count × lines × 24 months
 *    (intro pricing honored where a plan has one), plus the user's own
 *    taxes/fees estimate.
 *  - Carrier financing: full retail spread over the carrier's finance
 *    term (typically 36 months). Promo bill credits offset the monthly
 *    payment. Balances that outlast the 24-month window are reported
 *    in "Owed at mo 24". Only offered where the carrier actually sells
 *    the device (DEVICES[].soldBy); otherwise that line falls back to
 *    manufacturer financing with a visible note.
 *  - Manufacturer financing: 0% installments, with the manufacturer's
 *    trade-in credit reducing the financed amount.
 *  - Buy outright: retail minus manufacturer trade-in, paid upfront.
 *  - MVNO rows: MVNO device catalogs are not in the data, so only
 *    manufacturer purchase paths are offered there.
 */

const TIER_RANK = { base: 0, mid: 1, top: 2 };
const BIG3 = ["Verizon", "T-Mobile", "AT&T"];

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const deviceById = (id) => DEVICES.find((d) => d.id === id);

function findPromo(plan, device, tradeIn) {
  return CARRIER_PROMOS.find(
    (p) =>
      p.carrier === plan.carrier &&
      p.deviceIds.includes(device.id) &&
      TIER_RANK[plan.tier] >= TIER_RANK[p.requiresTier] &&
      (!p.requiresTradeIn || tradeIn !== "none")
  );
}

// Cost of one device line under one purchase path. Returns
// { upfront, paid24, owedAt24, creditsApplied, notes[] }.
function lineCost(pathKey, plan, device, tradeIn, lineNo) {
  const mfrTrade = tradeIn === "none" ? 0 : device.mfrTradeIn[tradeIn];
  const financed = Math.max(0, device.retail - mfrTrade);
  const mfrNotes = mfrTrade
    ? [`Line ${lineNo}: ${money(mfrTrade)} ${device.maker} trade-in credit applied.`]
    : [];

  if (pathKey === "outright") {
    return { upfront: financed, paid24: financed, owedAt24: 0, creditsApplied: mfrTrade, notes: mfrNotes };
  }
  if (pathKey === "mfr") {
    return { upfront: 0, paid24: financed, owedAt24: 0, creditsApplied: mfrTrade, notes: mfrNotes };
  }

  // Carrier financing. Falls back to manufacturer financing when the
  // carrier doesn't sell this device.
  if (!device.soldBy.includes(plan.carrier)) {
    return {
      upfront: 0,
      paid24: financed,
      owedAt24: 0,
      creditsApplied: mfrTrade,
      notes: [
        `Line ${lineNo}: ${device.name} is not sold by ${plan.carrier} — costed at ${device.maker} 0% financing instead.`,
        ...mfrNotes,
      ],
    };
  }
  const promo = findPromo(plan, device, tradeIn);
  const financeMonths = promo ? promo.financeMonths : CARRIER_FINANCE_MONTHS;
  const monthly = device.retail / financeMonths;
  let paid24 = Math.min(24, financeMonths) * monthly;
  let creditsApplied = 0;
  const notes = [];
  if (promo) {
    const instant = promo.instantPortion || 0;
    const monthlyCredit = (promo.credit - instant) / promo.creditMonths;
    creditsApplied = instant + Math.min(24, promo.creditMonths) * monthlyCredit;
    paid24 = Math.max(0, paid24 - creditsApplied);
    notes.push(`Line ${lineNo}: ${promo.label}.`);
    if (promo.creditMonths > 24) {
      notes.push(
        `Line ${lineNo}: ${money(promo.credit - creditsApplied)} in credits arrives after month 24 — leaving early forfeits it.`
      );
    }
    if (promo.requiresTradeIn) notes.push(`Line ${lineNo}: requires an eligible trade-in handed to ${plan.carrier}.`);
  }
  return {
    upfront: 0,
    paid24,
    owedAt24: financeMonths > 24 ? (financeMonths - 24) * monthly : 0,
    creditsApplied,
    notes,
    promo,
  };
}

// Plan cost over 24 months for a line count, honoring intro pricing.
function planCost24(plan, lines, feesPerLine) {
  const normal = plan.perLine[lines].price;
  const introMonths = plan.intro ? plan.intro.months : 0;
  const introPrice = plan.intro ? plan.intro.perLine : 0;
  const planOnly =
    introMonths * introPrice * lines + (24 - introMonths) * normal * lines;
  return planOnly + feesPerLine * lines * 24;
}

function computeScenarios(input) {
  const rows = [];
  const deviceLines = input.lineConfigs
    .map((c, i) => ({ ...c, lineNo: i + 1 }))
    .filter((c) => c.deviceId !== "none");

  for (const plan of PLANS) {
    if (plan.mvno && !input.includeMvnos) continue;
    const line = plan.perLine[input.lines];
    if (!line) continue;
    const plan24 = planCost24(plan, input.lines, input.feesPerLine);
    const planMonthly = plan24 / 24;

    const pathKeys =
      deviceLines.length === 0 ? ["byod"] : plan.mvno ? ["mfr", "outright"] : ["carrier", "mfr", "outright"];

    for (const pathKey of pathKeys) {
      let upfront = 0, paid24 = 0, owedAt24 = 0, creditsApplied = 0;
      let notes = [];
      let anyPromo = false;
      if (pathKey === "byod") {
        notes = [];
      } else {
        if (plan.mvno && pathKey === "mfr") {
          notes.push(`${plan.carrier}'s own device offers aren't in the data yet — devices priced direct from the maker.`);
        }
        for (const dl of deviceLines) {
          const c = lineCost(pathKey, plan, deviceById(dl.deviceId), dl.tradeIn, dl.lineNo);
          upfront += c.upfront;
          paid24 += c.paid24;
          owedAt24 += c.owedAt24;
          creditsApplied += c.creditsApplied;
          notes.push(...c.notes);
          if (c.promo) anyPromo = true;
        }
      }
      const labels = {
        byod: "Bring your own devices",
        carrier: anyPromo ? "Carrier financing + promo" : "Carrier financing",
        mfr: "Manufacturer 0% financing (24 mo)",
        outright: "Buy outright",
      };
      rows.push({
        plan,
        pathKey,
        pathLabel: labels[pathKey],
        anyPromo,
        planMonthly,
        plan24,
        devicePaid24: paid24,
        upfront,
        owedAt24,
        creditsApplied,
        total24: plan24 + paid24,
        estimated: !!line.estimated,
        notes,
        qci: typeof QCI_BY_PLAN !== "undefined" ? QCI_BY_PLAN[plan.id] : undefined,
      });
    }
  }
  rows.sort((a, b) => a.total24 - b.total24);
  return { rows, deviceLines };
}

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
  return {
    lines,
    lineConfigs,
    includeMvnos: $("in-mvnos").checked,
    feesPerLine: Number($("in-fees").value) || 0,
  };
}

function availabilityNotice(deviceLines) {
  const missing = new Map();
  for (const dl of deviceLines) {
    const d = deviceById(dl.deviceId);
    const not = BIG3.filter((c) => !d.soldBy.includes(c));
    if (not.length) missing.set(d.name, not);
  }
  const el = $("availability-note");
  if (!missing.size) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = [...missing.entries()]
    .map(
      ([name, carriers]) =>
        `<strong>${name}</strong> is not sold by ${carriers.join(" or ")} — on those carriers it's priced as a manufacturer purchase (BYOD).`
    )
    .join("<br>");
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
    d.push(`Still owed on devices at month 24: ${money(r.owedAt24)} (carrier financing runs past the 24-month window).`);
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
  const { rows, deviceLines } = computeScenarios(input);
  availabilityNotice(deviceLines);
  const best = rows[0];

  const deviceSummary =
    deviceLines.length === 0
      ? "bring your own devices"
      : deviceLines.length === input.lines && new Set(deviceLines.map((d) => d.deviceId)).size === 1
        ? `${deviceLines.length} × ${deviceById(deviceLines[0].deviceId).name}`
        : `${deviceLines.length} new device(s)`;

  $("best-pick").innerHTML = `
    <div class="best-label">Lowest 24-month cost for ${input.lines} line(s), ${deviceSummary}</div>
    <div class="best-main">${best.plan.carrier} ${best.plan.name} · ${best.pathLabel}</div>
    <div class="best-total">${money(best.total24)}<span class="best-per"> total · ${money2(best.total24 / 24)}/mo average${best.owedAt24 > 0 ? ` · ${money(best.owedAt24)} still owed at month 24` : ""}</span></div>
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
      <td>${r.pathLabel}${r.anyPromo ? ' <span class="pill">promo</span>' : ""}</td>
      <td class="num">${money(r.plan24)}</td>
      <td class="num">${money(r.devicePaid24)}</td>
      <td class="num">${r.upfront ? money(r.upfront) : "—"}</td>
      <td class="num">${r.owedAt24 ? money(r.owedAt24) : "—"}</td>
      <td class="num total">${money(r.total24)}</td>
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
