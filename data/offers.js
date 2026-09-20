/*
 * Offer data — the single place all pricing lives.
 *
 * Every number here was taken from a public source on the date in
 * DATA_RETRIEVED, or is marked estimated where the source only published
 * some values. Estimated values are shown with an asterisk in the UI.
 * Carrier pricing changes constantly — verify against the carrier's site
 * before acting on any result.
 *
 * Note: Apple raised US iPhone prices by $100 on 2026-09-10 and
 * discontinued the iPhone 17 Pro models (per MacRumors/9to5Mac); prices
 * below reflect the raise.
 *
 * To update: edit this file only. Nothing in engine.js or app.js
 * hard-codes a price. Plan *features* (premium data, hotspot,
 * international) drive the needs assessment and are checked weekly by
 * .github/workflows/plan-definitions-check.yml.
 */

const DATA_RETRIEVED = "2026-09-20";

// Per-line monthly price by total line count, with autopay discount applied.
// `estimated: true` marks line counts the source did not publish; those are
// interpolated from the published prices and must be verified.
//
// features drive the needs assessment: premiumData is the GB of priority
// (non-deprioritized) data per line ("unlimited" or a number; 0 = none),
// hotspotGB is high-speed hotspot data, international is whether the plan
// includes international use. estimatedFeatures lists feature fields the
// source did not state directly.
const PLANS = [
  {
    id: "vzw-welcome",
    carrier: "Verizon",
    name: "Unlimited Welcome",
    tier: "base",
    perLine: {
      1: { price: 65 },
      2: { price: 55, estimated: true },
      3: { price: 40, estimated: true },
      4: { price: 30 },
      5: { price: 30, estimated: true },
    },
    taxesIncluded: false,
    notes: "Autopay pricing. ~$3.30/line admin fee and taxes not included.",
    source: "https://www.knowyourmobile.com/carriers/verizon/verizon-plan-prices-guide/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      international: false,
      source: "https://www.verizon.com/support/welcome-unlimited-faqs/",
      note: "Deprioritized data, no high-speed hotspot.",
    },
  },
  {
    id: "vzw-plus",
    carrier: "Verizon",
    name: "Unlimited Plus",
    tier: "mid",
    perLine: {
      1: { price: 80 },
      2: { price: 70, estimated: true },
      3: { price: 55, estimated: true },
      4: { price: 45 },
      5: { price: 45, estimated: true },
    },
    taxesIncluded: false,
    notes: "Autopay pricing. Fees/taxes extra.",
    source: "https://www.knowyourmobile.com/carriers/verizon/verizon-plan-prices-guide/",
    features: {
      premiumData: "unlimited",
      hotspotGB: 30,
      international: false,
      source: "https://www.verizon.com/support/unlimited-plus-faqs/",
      note: "Unlimited premium data; 30GB high-speed hotspot, then 3 Mbps.",
    },
  },
  {
    id: "vzw-ultimate",
    carrier: "Verizon",
    name: "Unlimited Ultimate",
    tier: "top",
    perLine: {
      1: { price: 90 },
      2: { price: 80, estimated: true },
      3: { price: 65, estimated: true },
      4: { price: 55 },
      5: { price: 55, estimated: true },
    },
    taxesIncluded: false,
    notes: "Autopay pricing. Top tier — required for Verizon's biggest device promos.",
    source: "https://www.knowyourmobile.com/carriers/verizon/verizon-plan-prices-guide/",
    features: {
      premiumData: "unlimited",
      hotspotGB: 200,
      international: true,
      source: "https://www.rvmobileinternet.com/verizon-upgrades-its-premium-unlimited-ultimate-smartphone-plan-with-more-hotspot-and-international-data/",
      note: "200GB high-speed hotspot then 6 Mbps; international data/talk/text in 210+ destinations (15GB high speed).",
    },
  },
  {
    id: "tmo-essentials",
    carrier: "T-Mobile",
    name: "Essentials",
    tier: "base",
    perLine: {
      1: { price: 60 },
      2: { price: 45, estimated: true },
      3: { price: 35, estimated: true },
      4: { price: 30, estimated: true },
      5: { price: 27, estimated: true },
    },
    taxesIncluded: false,
    notes: "Taxes and fees extra. Budget tier.",
    source: "https://www.rvmobileinternet.com/t-mobile-announces-new-experience-plans-including-up-to-250-gb-of-mobile-hotspot-data-but-taxes-and-fees-are-now-extra/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      international: false,
      estimatedFeatures: ["premiumData"],
      source: "https://www.t-mobile.com/cell-phone-plans",
      note: "Lower priority than Experience plans; hotspot at reduced speeds only.",
    },
  },
  {
    id: "tmo-more",
    carrier: "T-Mobile",
    name: "Experience More",
    tier: "mid",
    perLine: {
      1: { price: 85 },
      2: { price: 70, estimated: true },
      3: { price: 55, estimated: true },
      4: { price: 43, estimated: true },
      5: { price: 40, estimated: true },
    },
    taxesIncluded: false,
    notes: "Autopay pricing. Taxes and fees now extra on Experience plans. 5-year price guarantee.",
    source: "https://www.rvmobileinternet.com/t-mobile-announces-new-experience-plans-including-up-to-250-gb-of-mobile-hotspot-data-but-taxes-and-fees-are-now-extra/",
    features: {
      premiumData: "unlimited",
      hotspotGB: 60,
      priceGuaranteeYears: 5,
      international: false,
      estimatedFeatures: ["premiumData", "international"],
      source: "https://www.rvmobileinternet.com/t-mobile-announces-new-experience-plans-including-up-to-250-gb-of-mobile-hotspot-data-but-taxes-and-fees-are-now-extra/",
      note: "60GB high-speed hotspot.",
    },
  },
  {
    id: "tmo-beyond",
    carrier: "T-Mobile",
    name: "Experience Beyond",
    tier: "top",
    perLine: {
      1: { price: 100 },
      2: { price: 85, estimated: true },
      3: { price: 66, estimated: true },
      4: { price: 55, estimated: true },
      5: { price: 50, estimated: true },
    },
    taxesIncluded: false,
    notes: "Top tier — required for T-Mobile's biggest device promos. Taxes and fees extra.",
    source: "https://www.rvmobileinternet.com/t-mobile-announces-new-experience-plans-including-up-to-250-gb-of-mobile-hotspot-data-but-taxes-and-fees-are-now-extra/",
    features: {
      premiumData: "unlimited",
      hotspotGB: 250,
      priceGuaranteeYears: 5,
      international: true,
      source: "https://wellkeptwallet.com/t-mobile-experience-beyond-plan/",
      note: "No deprioritization; 250GB high-speed hotspot; travel benefits; Starlink backup.",
    },
  },
  {
    id: "att-value",
    carrier: "AT&T",
    name: "Value 2.0",
    tier: "base",
    perLine: {
      1: { price: 50 },
      2: { price: 43, estimated: true },
      3: { price: 36, estimated: true },
      4: { price: 30 },
      5: { price: 30, estimated: true },
    },
    taxesIncluded: false,
    notes: "Fees/taxes extra.",
    source: "https://shopcellplans.com/att-plans/",
    features: {
      premiumData: 5,
      hotspotGB: 3,
      international: false,
      source: "https://www.reviews.org/mobile/att-unlimited-plans-explained/",
      note: "5GB priority data, then deprioritized; 3GB hotspot.",
    },
  },
  {
    id: "att-extra",
    carrier: "AT&T",
    name: "Extra 2.0",
    tier: "mid",
    perLine: {
      1: { price: 70 },
      2: { price: 60, estimated: true },
      3: { price: 50, estimated: true },
      4: { price: 40 },
      5: { price: 40, estimated: true },
    },
    taxesIncluded: false,
    notes: "Fees/taxes extra.",
    source: "https://shopcellplans.com/att-plans/",
    features: {
      premiumData: 75,
      hotspotGB: 50,
      international: false,
      source: "https://www.reviews.org/mobile/att-unlimited-plans-explained/",
      note: "75GB priority data, then deprioritized; 50GB hotspot.",
    },
  },
  {
    id: "att-premium",
    carrier: "AT&T",
    name: "Premium 2.0",
    tier: "top",
    perLine: {
      1: { price: 90 },
      2: { price: 78, estimated: true },
      3: { price: 63, estimated: true },
      4: { price: 53, estimated: true },
      5: { price: 50, estimated: true },
    },
    taxesIncluded: false,
    notes: "Unlimited premium data. Top tier — required for AT&T's biggest device promos.",
    source: "https://shopcellplans.com/att-plans/",
    features: {
      premiumData: "unlimited",
      hotspotGB: 100,
      international: true,
      source: "https://www.rvmobileinternet.com/att-launches-elite-2-0-smartphone-plan-with-250gb-of-mobile-hotspot-and-included-tablet-and-wearable-lines/",
      note: "100GB high-speed hotspot; unlimited talk/text/high-speed data in 20 Latin American countries.",
    },
  },

  // ------------------------------------------------------------- MVNOs
  // MVNO device catalogs are not in the data yet, so the app prices MVNO
  // rows with manufacturer purchase paths only. [ASSUMED — confirm:
  // whether to add each MVNO's own device store/financing offers.]
  // Multi-line prices marked estimated are flat single-line rates —
  // some MVNOs offer multi-line discounts not captured here.
  {
    id: "visible",
    carrier: "Visible",
    name: "Visible Unlimited",
    tier: "base",
    mvno: true,
    network: "Verizon",
    perLine: {
      1: { price: 25 },
      2: { price: 25 },
      3: { price: 25 },
      4: { price: 25 },
      5: { price: 25 },
    },
    taxesIncluded: true,
    notes: "Prepaid, taxes and fees included, no multi-line discount needed — every line is $25.",
    source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      international: false,
      estimatedFeatures: ["hotspotGB"],
      source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
      note: "Deprioritized on Verizon; hotspot at reduced speed only.",
    },
  },
  {
    id: "mint",
    carrier: "Mint Mobile",
    name: "Mint Unlimited",
    tier: "base",
    mvno: true,
    network: "T-Mobile",
    intro: { months: 12, perLine: 15 },
    perLine: {
      1: { price: 30 },
      2: { price: 30, estimated: true },
      3: { price: 30, estimated: true },
      4: { price: 30, estimated: true },
      5: { price: 30, estimated: true },
    },
    taxesIncluded: false,
    notes: "Prepaid annually. $15/mo for the first 12 months with 12-month prepayment, then renews at $30/mo.",
    source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      international: false,
      estimatedFeatures: ["hotspotGB"],
      source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
      note: "QCI 7 on T-Mobile; small hotspot allotment not captured.",
    },
  },
  {
    id: "metro",
    carrier: "Metro",
    name: "Metro Unlimited",
    tier: "base",
    mvno: true,
    network: "T-Mobile",
    perLine: {
      1: { price: 50 },
      2: { price: 50, estimated: true },
      3: { price: 50, estimated: true },
      4: { price: 50, estimated: true },
      5: { price: 50, estimated: true },
    },
    taxesIncluded: false,
    notes: "T-Mobile's prepaid brand. A $40 lower tier exists; multi-line discounts not yet captured.",
    source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      priceGuaranteeYears: 5,
      international: false,
      estimatedFeatures: ["hotspotGB"],
      source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
      note: "QCI 7 on T-Mobile; hotspot allotment not captured.",
    },
  },
  {
    id: "cricket",
    carrier: "Cricket",
    name: "Cricket Unlimited",
    tier: "base",
    mvno: true,
    network: "AT&T",
    perLine: {
      1: { price: 55 },
      2: { price: 55, estimated: true },
      3: { price: 55, estimated: true },
      4: { price: 55, estimated: true },
      5: { price: 55, estimated: true },
    },
    taxesIncluded: false,
    notes: "AT&T's prepaid brand. $55/mo with autopay ($60 without); multi-line discounts not yet captured.",
    source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
    features: {
      premiumData: 0,
      hotspotGB: 0,
      international: false,
      estimatedFeatures: ["hotspotGB"],
      source: "https://www.usmobile.com/blog/best-prepaid-phone-plans/",
      note: "Mostly deprioritized on AT&T; hotspot allotment not captured.",
    },
  },
];

// Devices with manufacturer-direct purchase and financing options.
// mfrFinancing is 0% APR where noted by the source.
// mfrTradeIn: credit by trade-in tier (older ≈ 3-year-old flagship,
// recent ≈ last year's flagship), from the manufacturer's own program.
// soldBy: carriers whose own store sells this device (carrier financing
// is only possible there). A device missing from a carrier's list is
// flagged in the UI and costed as a manufacturer purchase on that
// carrier. Update this list as carrier catalogs change.
const DEVICES = [
  {
    id: "iphone17-256",
    maker: "Apple",
    name: "iPhone 17 (256GB)",
    retail: 899,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 37.46, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    // Lease-style offer. Devices without a `lease` entry have no lease
    // offer in the data — the UI says so instead of estimating one.
    // Monthly was published before Apple's 2026-09-10 price raise —
    // verify against apple.com.
    lease: {
      program: "iPhone Upgrade Program",
      monthly: 42.41,
      months: 24,
      note: "Includes AppleCare+; upgrade option after 12 payments; you own the phone after all 24 payments.",
    },
    source: "https://www.macrumors.com/2026/09/09/apple-raises-iphone-17-prices/",
  },
  {
    id: "iphone17-512",
    maker: "Apple",
    name: "iPhone 17 (512GB)",
    retail: 1099,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 45.79, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    source: "https://www.macrumors.com/2026/09/09/apple-raises-iphone-17-prices/",
  },
  {
    id: "iphone-air-256",
    maker: "Apple",
    name: "iPhone Air (256GB)",
    retail: 1099,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 45.79, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    source: "https://www.macrumors.com/2026/09/09/apple-raises-iphone-17-prices/",
  },
  {
    id: "iphone17e-128",
    maker: "Apple",
    name: "iPhone 17e (128GB)",
    retail: 699,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 29.13, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    source: "https://www.macrumors.com/2026/09/09/apple-raises-iphone-17-prices/",
  },
  {
    id: "pixel10-128",
    maker: "Google",
    name: "Pixel 10 (128GB)",
    retail: 799,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 33.29, apr: 0 },
    // Estimated from Google Store trade-in promos — verify at checkout.
    mfrTradeIn: { older: 200, recent: 580 },
    tradeInNote: "Google Store trade-in values estimated from published promos — verify.",
    source: "https://www.itechguides.com/google-pixel-10-price-release-date-and-how-to-buy-in-the-u-s/",
  },
  {
    id: "s26",
    maker: "Samsung",
    name: "Galaxy S26 (256GB)",
    retail: 899.99,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 37.5, apr: 0 },
    mfrTradeIn: { older: 400, recent: 720 },
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
  {
    id: "s26plus",
    maker: "Samsung",
    name: "Galaxy S26+ (256GB)",
    retail: 1099.99,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 45.83, apr: 0 },
    mfrTradeIn: { older: 400, recent: 720 },
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
  {
    id: "s26ultra",
    maker: "Samsung",
    name: "Galaxy S26 Ultra (256GB)",
    retail: 1299.99,
    soldBy: ["Verizon", "T-Mobile", "AT&T"],
    mfrFinancing: { months: 24, monthly: 54.17, apr: 0 },
    mfrTradeIn: { older: 400, recent: 720 },
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
];

// Carrier device promotions. Structure every carrier promo shares:
// full retail is financed over `financeMonths`, and the credit is paid
// back as equal monthly bill credits over `creditMonths`. Leaving early
// forfeits remaining credits and makes the balance due.
// requiresTier: minimum plan tier ("top" | "mid" | "base") on that carrier.
// requiresTradeIn: whether an eligible trade-in is required for the full credit.
const CARRIER_PROMOS = [
  {
    id: "tmo-iphone17",
    carrier: "T-Mobile",
    deviceIds: ["iphone17-256", "iphone17-512"],
    credit: 1100,
    financeMonths: 36,
    creditMonths: 36,
    requiresTier: "top",
    requiresTradeIn: true,
    label: "Up to $1,100 off via 36 monthly bill credits",
    source: "https://www.shopback.com/blog/electronics/iphone-17-verizon-vs-att-vs-best-buy-trade-in-2026",
  },
  {
    id: "vzw-iphone17",
    carrier: "Verizon",
    deviceIds: ["iphone17-256", "iphone17-512"],
    credit: 1200,
    instantPortion: 400,
    financeMonths: 36,
    creditMonths: 24,
    requiresTier: "top",
    requiresTradeIn: true,
    label: "Up to $1,200: $400 instant + $800 in bill credits over 24 months",
    source: "https://www.shopback.com/blog/electronics/iphone-17-verizon-vs-att-vs-best-buy-trade-in-2026",
  },
  {
    id: "att-s26",
    carrier: "AT&T",
    deviceIds: ["s26plus", "s26ultra"],
    credit: 1100,
    financeMonths: 36,
    creditMonths: 36,
    requiresTier: "mid",
    requiresTradeIn: true,
    label: "Up to $1,100 off after 36 monthly bill credits with eligible trade-in",
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
];

// Default carrier financing when no promo applies: 36 months, 0% APR,
// full retail divided evenly. [ASSUMED — confirm: standard across all
// three carriers for these devices.]
const CARRIER_FINANCE_MONTHS = 36;

// Node export for the BDD suite (features/); ignored in the browser.
if (typeof module !== "undefined") {
  module.exports = { DATA_RETRIEVED, PLANS, DEVICES, CARRIER_PROMOS, CARRIER_FINANCE_MONTHS };
}
