/*
 * TCO engine + UI. All pricing comes from data/offers.js — nothing here
 * hard-codes a dollar amount.
 *
 * Cost model (24-month horizon):
 *  - Plan: per-line price at the chosen line count × lines × 24 months,
 *    plus the user's own taxes/fees estimate.
 *  - Carrier financing: full retail spread over the carrier's finance
 *    term (typically 36 months). Promo bill credits offset the monthly
 *    payment over the promo's credit term. Because carrier terms run
 *    past 24 months, the balance still owed at month 24 is reported
 *    separately — walking away early makes it due and forfeits
 *    remaining credits.
 *  - Manufacturer financing: 0% installments where offered, with the
 *    manufacturer's trade-in credit reducing the financed amount.
 *  - Buy outright: retail minus manufacturer trade-in, paid upfront.
 */

const TIER_RANK = { base: 0, mid: 1, top: 2 };

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function findPromo(plan, device, tradeIn) {
  return CARRIER_PROMOS.find(
    (p) =>
      p.carrier === plan.carrier &&
      p.deviceIds.includes(device.id) &&
      TIER_RANK[plan.tier] >= TIER_RANK[p.requiresTier] &&
      (!p.requiresTradeIn || tradeIn !== "none")
  );
}

// Per-device cost of each purchase path over 24 months.
function devicePaths(plan, device, tradeIn) {
  const paths = [];

  // Path 1 — finance through the carrier (with promo when one applies)
  const promo = findPromo(plan, device, tradeIn);
  const financeMonths = promo ? promo.financeMonths : CARRIER_FINANCE_MONTHS;
  const monthly = device.retail / financeMonths;
  let paid24 = Math.min(24, financeMonths) * monthly;
  let creditsApplied = 0;
  const promoNotes = [];
  if (promo) {
    const instant = promo.instantPortion || 0;
    const monthlyCredit = (promo.credit - instant) / promo.creditMonths;
    creditsApplied = instant + Math.min(24, promo.creditMonths) * monthlyCredit;
    paid24 -= creditsApplied;
    promoNotes.push(promo.label);
    if (promo.creditMonths > 24) {
      promoNotes.push(
        `${money(promo.credit - creditsApplied)} in credits arrives after month 24 — leaving early forfeits it.`
      );
    }
    if (promo.requiresTradeIn) {
      promoNotes.push("Requires an eligible trade-in handed to the carrier.");
    }
  }
  paths.push({
    key: "carrier",
    label: promo ? "Carrier financing + promo" : "Carrier financing",
    upfront: 0,
    paid24: Math.max(0, paid24),
    owedAt24: financeMonths > 24 ? (financeMonths - 24) * monthly : 0,
    creditsApplied,
    monthly: monthly,
    notes: promoNotes,
    promo,
  });

  // Path 2 — manufacturer 0% installments (trade-in reduces financed amount)
  const mfrTrade = tradeIn === "none" ? 0 : device.mfrTradeIn[tradeIn];
  const financed = Math.max(0, device.retail - mfrTrade);
  paths.push({
    key: "mfr",
    label: `${device.maker} 0% financing (24 mo)`,
    upfront: 0,
    paid24: financed,
    owedAt24: 0,
    creditsApplied: mfrTrade,
    monthly: financed / device.mfrFinancing.months,
    notes: mfrTrade
      ? [`${money(mfrTrade)} ${device.maker} trade-in credit applied.`]
      : [],
  });

  // Path 3 — buy outright from the manufacturer
  paths.push({
    key: "outright",
    label: "Buy outright",
    upfront: financed,
    paid24: financed,
    owedAt24: 0,
    creditsApplied: mfrTrade,
    monthly: 0,
    notes: mfrTrade
      ? [`${money(mfrTrade)} ${device.maker} trade-in credit applied.`]
      : ["Full price at purchase. Phone is unlocked and yours immediately."],
  });

  return paths;
}

function computeScenarios(input) {
  const device = DEVICES.find((d) => d.id === input.deviceId);
  const rows = [];
  for (const plan of PLANS) {
    const line = plan.perLine[input.lines];
    if (!line) continue;
    const planMonthly = line.price * input.lines + input.feesPerLine * input.lines;
    const plan24 = planMonthly * 24;
    const paths =
      input.newDevices === 0
        ? [{ key: "byod", label: "Bring your own devices", upfront: 0, paid24: 0, owedAt24: 0, creditsApplied: 0, monthly: 0, notes: [] }]
        : devicePaths(plan, device, input.tradeIn);
    for (const path of paths) {
      const devicePaid24 = path.paid24 * input.newDevices;
      rows.push({
        plan,
        device,
        path,
        planMonthly,
        plan24,
        devicePaid24,
        upfront: path.upfront * input.newDevices,
        owedAt24: path.owedAt24 * input.newDevices,
        creditsApplied: path.creditsApplied * input.newDevices,
        total24: plan24 + devicePaid24,
        estimated: !!line.estimated,
      });
    }
  }
  rows.sort((a, b) => a.total24 - b.total24);
  return rows;
}

// ---------------------------------------------------------------- UI

function readInputs() {
  const lines = Number(document.getElementById("in-lines").value);
  let newDevices = Number(document.getElementById("in-newdevices").value);
  if (newDevices > lines) {
    newDevices = lines;
    document.getElementById("in-newdevices").value = String(lines);
  }
  return {
    lines,
    newDevices,
    deviceId: document.getElementById("in-device").value,
    tradeIn: document.getElementById("in-tradein").value,
    feesPerLine: Number(document.getElementById("in-fees").value) || 0,
  };
}

function rowDetail(r) {
  const d = [];
  d.push(
    `Plan: ${r.plan.carrier} ${r.plan.name} — ${money2(r.plan.perLine[readInputs().lines].price)}/line × ${readInputs().lines} line(s)` +
      ` = ${money2(r.planMonthly)}/mo → ${money(r.plan24)} over 24 months.`
  );
  if (r.plan.notes) d.push(r.plan.notes);
  if (r.path.key !== "byod" && (r.devicePaid24 > 0 || r.path.key !== "outright")) {
    d.push(
      `Device (${r.device.name} × ${readInputs().newDevices}): ` +
        (r.path.key === "outright"
          ? `${money(r.upfront)} upfront.`
          : `${money2(r.path.monthly)}/mo each → ${money(r.devicePaid24)} paid by month 24.`)
    );
  }
  if (r.creditsApplied > 0) d.push(`Credits/trade-in applied by month 24: ${money(r.creditsApplied)}.`);
  if (r.owedAt24 > 0)
    d.push(`Still owed on the device at month 24: ${money(r.owedAt24)} (carrier financing runs past the 24-month window).`);
  for (const n of r.path.notes) d.push(n);
  const sources = [
    `<a href="${r.plan.source}" target="_blank" rel="noopener">plan pricing</a>`,
    `<a href="${r.device.source}" target="_blank" rel="noopener">device pricing</a>`,
  ];
  if (r.path.promo) sources.push(`<a href="${r.path.promo.source}" target="_blank" rel="noopener">promo</a>`);
  d.push(`Sources: ${sources.join(" · ")} (retrieved ${DATA_RETRIEVED}).`);
  return d.map((t) => `<p>${t}</p>`).join("");
}

function render() {
  const input = readInputs();
  const rows = computeScenarios(input);
  const device = DEVICES.find((d) => d.id === input.deviceId);
  const best = rows[0];

  document.getElementById("best-pick").innerHTML = `
    <div class="best-label">Lowest 24-month cost for ${input.lines} line(s), ${input.newDevices} × ${device.name}</div>
    <div class="best-main">${best.plan.carrier} ${best.plan.name} · ${best.path.label}</div>
    <div class="best-total">${money(best.total24)}<span class="best-per"> total · ${money2(best.total24 / 24)}/mo average${best.owedAt24 > 0 ? ` · ${money(best.owedAt24)} still owed at month 24` : ""}</span></div>
  `;

  const anyEstimated = rows.some((r) => r.estimated);
  document.getElementById("estimate-note").hidden = !anyEstimated;

  const tbody = document.getElementById("results-body");
  tbody.innerHTML = rows
    .map(
      (r, i) => `
    <tr class="${i === 0 ? "top-row" : ""}">
      <td>
        <span class="carrier c-${r.plan.carrier.replace(/[^a-z]/gi, "").toLowerCase()}">${r.plan.carrier}</span>
        ${r.plan.name}${r.estimated ? '<span class="est" title="Multi-line price estimated — verify on carrier site">*</span>' : ""}
      </td>
      <td>${r.path.label}${r.path.promo ? ' <span class="pill">promo</span>' : ""}</td>
      <td class="num">${money(r.plan24)}</td>
      <td class="num">${money(r.devicePaid24)}</td>
      <td class="num">${r.upfront ? money(r.upfront) : "—"}</td>
      <td class="num">${r.owedAt24 ? money(r.owedAt24) : "—"}</td>
      <td class="num total">${money(r.total24)}</td>
      <td class="detail-cell">
        <details><summary>math</summary><div class="detail">${rowDetail(r)}</div></details>
      </td>
    </tr>`
    )
    .join("");
}

for (const el of document.querySelectorAll("#inputs input, #inputs select")) {
  el.addEventListener("input", render);
}
document.getElementById("data-date").textContent = DATA_RETRIEVED;
render();
