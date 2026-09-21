/*
 * QCI reference file.
 *
 * QCI (QoS Class Identifier) is the priority level a carrier assigns your
 * data during network congestion. Lower is better: 6–8 are "premium"
 * tiers served first; 9 is deprioritized and served last when a tower is
 * busy. It is not throttling — on an uncongested tower a QCI 9 line can
 * be just as fast.
 *
 * Maintenance policy (per project owner):
 *  - QCI assignments rarely change; refresh this file MONTHLY.
 *  - When a new carrier or plan is added to data/offers.js, add its QCI
 *    entry here in the same change.
 *
 * Values retrieved 2026-09-20 from:
 *  - https://www.bestphoneplans.net/news/data-priority
 *  - https://5gstore.com/blog/2025/10/07/understanding-data-prioritization/
 *  - https://www.really.com/post/everything-you-need-to-know-about-qci-qos-class-identifiers
 */

const QCI_RETRIEVED = "2026-09-20";

const QCI_EXPLANATION =
  "QCI (QoS Class Identifier) is the priority your data gets when the " +
  "network is congested — lower is better. QCI 6–8 traffic is served " +
  "first; QCI 9 is deprioritized and slows down on busy towers. This is " +
  "not throttling: on an uncongested tower, speeds are unaffected.";

// Keyed by plan id from data/offers.js.
const QCI_BY_PLAN = {
  // Verizon network: QCI 8 = most postpaid; QCI 9 = Welcome, prepaid, MVNOs
  "vzw-welcome": { value: 9, note: "Deprioritized — Verizon puts Unlimited Welcome below its premium postpaid tiers." },
  "vzw-plus": { value: 8, note: "Premium postpaid priority on Verizon." },
  "vzw-ultimate": { value: 8, note: "Premium postpaid priority on Verizon." },
  "visible": { value: 9, note: "Prepaid/MVNO traffic on Verizon is deprioritized behind all postpaid premium data." },
  "visible-plus": { value: 8, note: "Visible+ carries unlimited premium data — treated as Verizon postpaid priority; verify." },
  "visible-plus-pro": { value: 8, note: "Visible+ Pro carries unlimited premium data — treated as Verizon postpaid priority; verify." },

  // T-Mobile network: QCI 6 = postpaid Experience; QCI 7 = Essentials, Metro, T-Mobile MVNOs
  "tmo-essentials": { value: 7, note: "One step below T-Mobile's top postpaid priority." },
  "tmo-more": { value: 6, note: "T-Mobile's top network priority." },
  "tmo-beyond": { value: 6, note: "T-Mobile's top network priority." },
  "mint": { value: 7, note: "T-Mobile MVNOs like Mint ride at QCI 7 — same as Essentials and Metro." },
  "metro": { value: 7, note: "Metro rides at QCI 7 — same tier as T-Mobile Essentials." },
  "fi-essentials": { value: 6, note: "Google Fi rides at QCI 6 on T-Mobile — the same top priority as T-Mobile's own Experience plans." },
  "fi-standard": { value: 6, note: "Google Fi rides at QCI 6 on T-Mobile — the same top priority as T-Mobile's own Experience plans." },
  "fi-premium": { value: 6, note: "Google Fi rides at QCI 6 on T-Mobile — the same top priority as T-Mobile's own Experience plans." },

  // AT&T network: postpaid tiers carry priority-data allotments; Cricket mostly QCI 9
  "att-value": { value: 8, note: "Priority (QCI 8) for the plan's 5GB premium-data allotment, then deprioritized (QCI 9).", allotment: true },
  "att-extra": { value: 8, note: "Priority (QCI 8) for the plan's 100GB premium-data allotment, then deprioritized (QCI 9).", allotment: true },
  "att-premium": { value: 8, note: "Unlimited premium data at AT&T postpaid priority." },
  "att-elite": { value: 8, note: "Unlimited premium data at AT&T postpaid priority, with Turbo prioritization on top." },
  "us-mobile-starter": { value: 9, note: "Starter tier is deprioritized; US Mobile's Premium tiers ride higher (QCI 8 on Verizon, QCI 7 on T-Mobile) — verify for your network choice." },
  "boost-global": { value: 9, note: "Priority on Boost's own network and roaming partners not published — assumed deprioritized; verify." },
  "total-starter": { value: 9, note: "Prepaid MVNO traffic on Verizon is deprioritized." },
  "straight-talk-silver": { value: 9, note: "Prepaid MVNO traffic on Verizon is deprioritized." },
  "tello-unlimited": { value: 7, note: "T-Mobile MVNOs ride at QCI 7 — same tier as Essentials and Metro." },
  "tmo-choice55": { value: 7, note: "Essentials-family priority (QCI 7) — verify." },
  "tmo-more55": { value: 6, note: "Experience-family top priority (QCI 6)." },
  "tmo-beyond55": { value: 6, note: "Experience-family top priority (QCI 6)." },
  "tmo-essentials-heroes": { value: 7, note: "Essentials-family priority (QCI 7) — verify." },
  "tmo-more-military": { value: 6, note: "Experience-family top priority (QCI 6)." },
  "tmo-beyond-fr": { value: 6, note: "Experience-family top priority (QCI 6)." },
  "tmo-student": { value: 7, note: "Essentials-family priority (QCI 7) — verify." },
  "vzw-55plus": { value: 9, note: "Priority level not published — assumed deprioritized like Verizon's base plans; verify." },
  "att-55plus": { value: 9, note: "Priority level not published — assumed deprioritized; verify." },
  "cricket": { value: 9, note: "Most Cricket lines are deprioritized on AT&T (the Unlimited + 15GB hotspot tier rides at QCI 8)." },
};

// Node export for the BDD suite (features/); ignored in the browser.
if (typeof module !== "undefined") {
  module.exports = { QCI_RETRIEVED, QCI_EXPLANATION, QCI_BY_PLAN };
}
