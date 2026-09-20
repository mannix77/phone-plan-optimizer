/*
 * Offer data — the single place all pricing lives.
 *
 * Every number here was taken from a public source on the date in
 * DATA_RETRIEVED, or is marked estimated: true where the source only
 * published some line counts. Estimated values are shown with an
 * asterisk in the UI. Carrier pricing changes constantly — verify
 * against the carrier's site before acting on any result.
 *
 * To update: edit this file only. Nothing in app.js hard-codes a price.
 */

const DATA_RETRIEVED = "2026-09-20";

// Per-line monthly price by total line count, with autopay discount applied.
// `estimated: true` marks line counts the source did not publish; those are
// interpolated from the published 1-line and 4-line prices and must be
// verified on the carrier's site.
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
    notes: "Autopay pricing. Premium data + 30GB hotspot. Fees/taxes extra.",
    source: "https://www.knowyourmobile.com/carriers/verizon/verizon-plan-prices-guide/",
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
    notes: "5GB premium data. Fees/taxes extra.",
    source: "https://shopcellplans.com/att-plans/",
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
    notes: "75GB premium data. Fees/taxes extra.",
    source: "https://shopcellplans.com/att-plans/",
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
  },
];

// Devices with manufacturer-direct purchase and financing options.
// mfrFinancing is 0% APR where noted by the source.
// mfrTradeIn: credit by trade-in tier (older ≈ 3-year-old flagship,
// recent ≈ last year's flagship), from the manufacturer's own program.
const DEVICES = [
  {
    id: "iphone17-256",
    maker: "Apple",
    name: "iPhone 17 (256GB)",
    retail: 799,
    mfrFinancing: { months: 24, monthly: 33.29, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    source: "https://macmyths.com/apple-iphone-17-pricing-u-s-cost-storage-financing-trade-in-and-carrier-deals/",
  },
  {
    id: "iphone17-512",
    maker: "Apple",
    name: "iPhone 17 (512GB)",
    retail: 999,
    mfrFinancing: { months: 24, monthly: 41.63, apr: 0 },
    mfrTradeIn: { older: 200, recent: 450 },
    source: "https://macmyths.com/apple-iphone-17-pricing-u-s-cost-storage-financing-trade-in-and-carrier-deals/",
  },
  {
    id: "s26",
    maker: "Samsung",
    name: "Galaxy S26 (256GB)",
    retail: 899.99,
    mfrFinancing: { months: 24, monthly: 37.5, apr: 0 },
    mfrTradeIn: { older: 400, recent: 720 },
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
  {
    id: "s26plus",
    maker: "Samsung",
    name: "Galaxy S26+ (256GB)",
    retail: 1099.99,
    mfrFinancing: { months: 24, monthly: 45.83, apr: 0 },
    mfrTradeIn: { older: 400, recent: 720 },
    source: "https://www.androidcentral.com/phones/samsung-galaxy/best-samsung-galaxy-s26-deals",
  },
  {
    id: "s26ultra",
    maker: "Samsung",
    name: "Galaxy S26 Ultra (256GB)",
    retail: 1299.99,
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
