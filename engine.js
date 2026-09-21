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

// Priority-data GB a plan must offer for each stated level of data use.
// "maximum" demands unlimited premium data.
const DATA_NEED_GB = { light: 0, moderate: 30, heavy: 75, maximum: Infinity };

// Does a plan's published feature set meet the user's stated needs?
// needs = { dataUse: "light"|"moderate"|"heavy"|"maximum",
//           hotspotGB: number, international: boolean } (or absent = no filter).
function matchesNeeds(plan, needs) {
  if (!needs) return true;
  const f = plan.features || {};
  const premium = f.premiumData === "unlimited" ? Infinity : f.premiumData || 0;
  if (premium < DATA_NEED_GB[needs.dataUse]) return false;
  if ((f.hotspotGB || 0) < (needs.hotspotGB || 0)) return false;
  if (needs.international && !f.international) return false;
  return true;
}

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

// Plan cost over 24 months for a line count, honoring intro pricing and
// the taxes choice: { mode: "none" } compares pre-tax prices,
// { mode: "custom", perLine } adds a user-known $/line/mo, and
// { mode: "estimate", rate } applies the published average wireless
// tax rate. Plans whose price already includes taxes are never inflated.
function planCost24(plan, lines, taxes) {
  const normal = plan.perLine[lines].price;
  const introMonths = plan.intro ? plan.intro.months : 0;
  const introPrice = plan.intro ? plan.intro.perLine : 0;
  const planOnly = introMonths * introPrice * lines + (24 - introMonths) * normal * lines;
  if (plan.taxesIncluded || !taxes || taxes.mode === "none") return planOnly;
  if (taxes.mode === "custom") return planOnly + (taxes.perLine || 0) * lines * 24;
  if (taxes.mode === "estimate") return planOnly * (1 + (taxes.rate || 0));
  return planOnly;
}

function computeScenarios(data, input) {
  const deviceById = (id) => data.DEVICES.find((d) => d.id === id);
  const rows = [];
  const excludedByNeeds = [];
  const deviceLines = input.lineConfigs
    .map((c, i) => ({ ...c, lineNo: i + 1 }))
    .filter((c) => c.deviceId !== "none");

  for (const plan of data.PLANS) {
    if (plan.mvno && !input.includeMvnos) continue;
    if (!matchesNeeds(plan, input.needs)) {
      excludedByNeeds.push(plan);
      continue;
    }
    const line = plan.perLine[input.lines];
    if (!line) continue;
    const plan24 = planCost24(plan, input.lines, input.taxes);
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
  return { rows, deviceLines, excludedByNeeds };
}

// ------------------------------------------------ Result classification

// How much plan a plan is: priority data (unlimited 2, ≥30GB 1),
// high-speed hotspot (≥100GB 2, ≥30GB 1), international (1). Used only
// to pick the "best option" — the most plan for the money, tie broken
// by lower true cost.
function featureScore(plan) {
  const f = plan.features || {};
  const premium = f.premiumData === "unlimited" ? Infinity : f.premiumData || 0;
  let score = 0;
  score += premium === Infinity ? 2 : premium >= 30 ? 1 : 0;
  score += (f.hotspotGB || 0) >= 100 ? 2 : (f.hotspotGB || 0) >= 30 ? 1 : 0;
  score += f.international ? 1 : 0;
  return score;
}

// Differentiators: what sets this option apart from the field. A
// superlative must be uniquely held; a binary feature counts when at
// most half of the options have it.
function differentiators(o, options, cheapest) {
  const d = [];
  if (o === cheapest) d.push("Cheapest overall");
  const others = options.filter((x) => x !== o);
  if (others.length === 0) return d;

  const premium = (r) => {
    const f = r.plan.features || {};
    return f.premiumData === "unlimited" ? Infinity : f.premiumData || 0;
  };
  const hotspot = (r) => (r.plan.features && r.plan.features.hotspotGB) || 0;

  if (premium(o) > 0 && others.every((x) => premium(x) < premium(o))) d.push("Most priority data");
  if (hotspot(o) > 0 && others.every((x) => hotspot(x) < hotspot(o))) d.push("Most high-speed hotspot");
  if (o.qci && others.every((x) => !x.qci || x.qci.value > o.qci.value)) d.push("Best network priority");
  if (o.creditsApplied > 0 && others.every((x) => x.creditsApplied < o.creditsApplied)) d.push("Largest promo credits");

  const minority = (pred, label) => {
    if (pred(o) && options.filter(pred).length * 2 <= options.length) d.push(label);
  };
  minority((r) => !!(r.plan.features && r.plan.features.international), "International included");
  minority((r) => !!r.plan.taxesIncluded, "Taxes & fees included");
  minority((r) => !!(r.plan.features && r.plan.features.priceGuaranteeYears), "5-year price lock");
  minority((r) => r.pathKey !== "byod" && r.devicePaid24 > 0 && r.owedAt24 === 0, "Device paid off within 24 months");
  minority((r) => r.pathKey !== "byod" && r.devicePaid24 > 0 && r.upfront === 0, "Nothing due upfront");

  return d;
}

// Reduce a computeScenarios result to one option per plan (that plan's
// best path; the BYOD rows when no devices are in play), classified as
// cheapest (lowest true cost) and best (highest featureScore, tie
// broken by lower true cost), each carrying its differentiators.
// Options with a differentiator rank above options without one; within
// each group, cheaper ranks higher.
function classifyResults(result) {
  const rows = result.rows;
  const options = rows.some((r) => r.bestForPlan) ? rows.filter((r) => r.bestForPlan) : rows.slice();
  if (options.length === 0) return { options: [], cheapest: null, best: null };

  // rows are sorted by effective24, so the first is the cheapest and the
  // first max-score option is the cheapest among ties.
  const cheapest = options[0];
  let best = options[0];
  let bestScore = featureScore(options[0].plan);
  for (const o of options) {
    const s = featureScore(o.plan);
    if (s > bestScore) {
      best = o;
      bestScore = s;
    }
  }
  for (const o of options) o.diffs = differentiators(o, options, cheapest);
  const ranked = [...options].sort(
    (a, b) => (b.diffs.length > 0 ? 1 : 0) - (a.diffs.length > 0 ? 1 : 0)
  );
  return { options: ranked, cheapest, best };
}

// --------------------------------------------------- Current state

// Savings over the 24-month window versus what the user pays today for
// service alone. Positive = the option costs less than staying put.
// Note the comparison is service-only today vs. all-in option cost —
// the UI labels it that way.
function savingsVsCurrent(option, currentMonthly) {
  return currentMonthly * 24 - option.effective24;
}

// The current phone's age drives the suggested trade-in tier, so the
// flow can prefill the answer instead of asking twice.
function suggestTradeIn(phoneAge) {
  return { under2: "recent", twoToFour: "older", overFour: "none", none: "none" }[phoneAge] || "none";
}


// What choosing the best option over the cheapest costs and buys: the
// true-cost difference and the features gained. Drives the "worth $X
// more for ..." line in the results.
function bestPremium(classified) {
  const { best, cheapest } = classified;
  if (!best || !cheapest || best === cheapest) return { amount: 0, gains: [] };
  const fb = best.plan.features || {};
  const fc = cheapest.plan.features || {};
  const prem = (f) => (f.premiumData === "unlimited" ? Infinity : f.premiumData || 0);
  const gains = [];
  if (prem(fb) > prem(fc)) {
    gains.push(fb.premiumData === "unlimited" ? "unlimited priority data" : `${fb.premiumData}GB priority data`);
  }
  if ((fb.hotspotGB || 0) > (fc.hotspotGB || 0)) gains.push(`${fb.hotspotGB}GB hotspot`);
  if (fb.international && !fc.international) gains.push("international included");
  if (best.creditsApplied > cheapest.creditsApplied) {
    gains.push(`${money(best.creditsApplied - cheapest.creditsApplied)} more promo credits`);
  }
  return { amount: best.effective24 - cheapest.effective24, gains };
}

if (typeof module !== "undefined") {
  module.exports = { TIER_RANK, money, money2, findPromo, matchesNeeds, lineCost, planCost24, computeScenarios, featureScore, classifyResults, bestPremium, savingsVsCurrent, suggestTradeIn };
}
