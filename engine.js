/*
 * Pure TCO calculation engine — no DOM, no globals. Every function takes
 * the offer data as an argument, so the same code runs in the browser
 * (loaded before app.js, which passes the data files' globals) and in
 * the BDD suite (required by features/steps/steps.js).
 *
 * Cost model (24-month horizon):
 *  - Plan: per-line price at the chosen line count × lines × 24 months
 *    (intro pricing honored where a plan has one), plus the user's own
 *    taxes/fees estimate.
 *  - Carrier financing: full retail spread over the carrier's finance
 *    term (typically 36 months). Promo bill credits offset the monthly
 *    payment. Balances that outlast the 24-month window are reported in
 *    owedAt24. Only offered where the carrier sells the device
 *    (DEVICES[].soldBy); otherwise that line falls back to manufacturer
 *    financing with a visible note. MVNO device catalogs are not in the
 *    data, so MVNO rows get manufacturer purchase paths only.
 *  - Manufacturer financing: 0% installments, with the manufacturer's
 *    trade-in credit reducing the financed amount.
 *  - Buy outright: retail minus manufacturer trade-in, paid upfront.
 *  - Lease: the program's published monthly price (no trade-in modeled).
 *  - effective24 ("true 24-month cost") = plan + paid + still owed;
 *    rows rank on it so financing past 24 months isn't artificially
 *    cheap, and the cheapest device path per plan is tagged bestForPlan.
 */

const TIER_RANK = { base: 0, mid: 1, top: 2 };

const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function findPromo(promos, plan, device, tradeIn) {
  return promos.find(
    (p) =>
      p.carrier === plan.carrier &&
      p.deviceIds.includes(device.id) &&
      TIER_RANK[plan.tier] >= TIER_RANK[p.requiresTier] &&
      (!p.requiresTradeIn || tradeIn !== "none")
  );
}

// Cost of one device line under one purchase path. Returns
// { upfront, paid24, owedAt24, creditsApplied, notes[], promo? }.
function lineCost(data, pathKey, plan, device, tradeIn, lineNo) {
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
  if (pathKey === "lease") {
    const l = device.lease;
    const notes = [`Line ${lineNo}: ${l.program} at ${money2(l.monthly)}/mo — ${l.note}`];
    if (tradeIn !== "none") notes.push(`Line ${lineNo}: trade-in is not modeled for the lease/upgrade program.`);
    return {
      upfront: 0,
      paid24: l.monthly * Math.min(24, l.months),
      owedAt24: l.months > 24 ? (l.months - 24) * l.monthly : 0,
      creditsApplied: 0,
      notes,
    };
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
  const promo = findPromo(data.CARRIER_PROMOS, plan, device, tradeIn);
  const financeMonths = promo ? promo.financeMonths : data.CARRIER_FINANCE_MONTHS;
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
  const planOnly = introMonths * introPrice * lines + (24 - introMonths) * normal * lines;
  return planOnly + feesPerLine * lines * 24;
}

function computeScenarios(data, input) {
  const deviceById = (id) => data.DEVICES.find((d) => d.id === id);
  const rows = [];
  const deviceLines = input.lineConfigs
    .map((c, i) => ({ ...c, lineNo: i + 1 }))
    .filter((c) => c.deviceId !== "none");

  for (const plan of data.PLANS) {
    if (plan.mvno && !input.includeMvnos) continue;
    const line = plan.perLine[input.lines];
    if (!line) continue;
    const plan24 = planCost24(plan, input.lines, input.feesPerLine);
    const planMonthly = plan24 / 24;

    const leaseAvailable =
      deviceLines.length > 0 && deviceLines.every((dl) => deviceById(dl.deviceId).lease);
    let pathKeys;
    if (deviceLines.length === 0) {
      pathKeys = ["byod"];
    } else {
      const offered = plan.mvno ? ["mfr", "outright", "lease"] : ["carrier", "mfr", "outright", "lease"];
      pathKeys = offered.filter((k) => input.paths.has(k) && (k !== "lease" || leaseAvailable));
      if (input.paths.has("byod")) pathKeys.push("byod");
      if (pathKeys.length === 0) pathKeys = ["byod"];
    }

    for (const pathKey of pathKeys) {
      let upfront = 0, paid24 = 0, owedAt24 = 0, creditsApplied = 0;
      let notes = [];
      let anyPromo = false;
      if (pathKey !== "byod") {
        if (plan.mvno && pathKey === "mfr") {
          notes.push(`${plan.carrier}'s own device offers aren't in the data yet — devices priced direct from the maker.`);
        }
        for (const dl of deviceLines) {
          const c = lineCost(data, pathKey, plan, deviceById(dl.deviceId), dl.tradeIn, dl.lineNo);
          upfront += c.upfront;
          paid24 += c.paid24;
          owedAt24 += c.owedAt24;
          creditsApplied += c.creditsApplied;
          notes.push(...c.notes);
          if (c.promo) anyPromo = true;
        }
      }
      const labels = {
        byod: deviceLines.length ? "Bring your own (plan only, no new device)" : "Bring your own devices",
        carrier: anyPromo ? "Carrier financing + promo" : "Carrier financing",
        mfr: "Manufacturer 0% financing (24 mo)",
        outright: "Buy outright",
        lease: "Lease / upgrade program",
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
        // What 24 months truly costs: everything paid plus the device
        // balance still owed. Ranking on this keeps 36-month carrier
        // financing from looking artificially cheap.
        effective24: plan24 + paid24 + owedAt24,
        estimated: !!line.estimated,
        notes,
        qci: data.QCI_BY_PLAN ? data.QCI_BY_PLAN[plan.id] : undefined,
      });
    }
  }
  // Determine the best device path per plan (BYOD baseline excluded).
  const bestByPlan = new Map();
  for (const r of rows) {
    if (r.pathKey === "byod") continue;
    const cur = bestByPlan.get(r.plan.id);
    if (!cur || r.effective24 < cur.effective24) bestByPlan.set(r.plan.id, r);
  }
  for (const r of rows) r.bestForPlan = bestByPlan.get(r.plan.id) === r;
  rows.sort((a, b) => a.effective24 - b.effective24);
  return { rows, deviceLines };
}

if (typeof module !== "undefined") {
  module.exports = { TIER_RANK, money, money2, findPromo, lineCost, planCost24, computeScenarios };
}
