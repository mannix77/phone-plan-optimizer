"use strict";
/*
 * Source manifest: every citation in the data files, one entry per
 * (item, field). The weekly source-check workflow fetches these to
 * detect unreachable or drifted sources; the BDD suite requires every
 * plan, device, and trade-in device to contribute at least one.
 */
const offers = require("../../data/offers.js");

// Aggregators worth re-checking even when no single item cites them —
// the broadest research surfaces for plans and devices.
const RESEARCH_SOURCES = [
  { id: "research:yournavi", kind: "aggregator", url: "https://www.yournavi.com/" },
  { id: "research:whistleout", kind: "aggregator", url: "https://www.whistleout.com/CellPhones" },
];

function collectSources() {
  const entries = [...RESEARCH_SOURCES];
  const push = (id, kind, url) => {
    if (typeof url === "string" && url.length) entries.push({ id, kind, url });
  };
  for (const p of offers.PLANS) {
    push(`plan:${p.id}`, "plan-pricing", p.source);
    if (p.features) push(`plan:${p.id}#features`, "plan-features", p.features.source);
    for (const [seg, d] of Object.entries(p.segmentDiscounts || {})) {
      push(`plan:${p.id}#discount-${seg}`, "segment-discount", d.source);
    }
  }
  for (const d of offers.DEVICES) push(`device:${d.id}`, "device-pricing", d.source);
  for (const promo of offers.CARRIER_PROMOS) push(`promo:${promo.id}`, "promo", promo.source);
  for (const t of offers.TRADE_IN_DEVICES) push(`tradein:${t.id}`, "trade-in", t.source);
  return entries;
}

module.exports = { collectSources };
