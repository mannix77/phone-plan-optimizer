# Phone Plan Optimizer

Compare the true 24-month cost of owning a cell phone plan + device
combination across US carriers.

Enter your line count, the device you want, how many lines need a new
device, and your trade-in situation. The app computes the total cost of
ownership over 24 months for every carrier plan × purchase path
combination and ranks them:

- **Carrier financing** — full retail spread over the carrier's term
  (typically 36 months), with promotional bill credits applied where your
  plan tier and trade-in qualify. Because carrier terms outlast the
  24-month window, the balance still owed at month 24 is reported
  separately.
- **Manufacturer 0% financing** — Apple/Samsung installments, with the
  manufacturer's trade-in credit reducing the financed amount.
- **Buy outright** — retail minus manufacturer trade-in, paid upfront.

Options:

- **MVNOs / prepaid** — Visible, Mint, Metro, and Cricket can be included
  with a toggle. MVNO rows carry an asterisked **QCI badge** (e.g.
  `*QCI 9`): QCI is the priority your data gets during network
  congestion — lower is better, and QCI 9 traffic is served last on a
  busy tower (deprioritization, not throttling). The badge and the
  per-row math explain this.
- **Per-line customization** — toggle "Customize each line" to give every
  line its own device and trade-in instead of one model for all.
- **Device options** — pick which acquisition paths to compare: finance
  through the carrier, finance through the manufacturer, buy outright,
  lease/upgrade program, or bring your own (plan-only baseline). Lease
  rows appear only for devices with a lease offer in the data (currently
  Apple's iPhone Upgrade Program); the app says so when a selected device
  has none rather than estimating one.
- **Device availability** — each device lists which carriers sell it
  (`soldBy`). If a selected device isn't sold by a carrier, the app says
  so and prices that carrier's row as a manufacturer purchase instead.

## Running it

It's a static page — open `index.html` in a browser, or serve the folder
with any static server (`python3 -m http.server`). Pushes to `main`
deploy to GitHub Pages via `.github/workflows/pages.yml`.

## Data

All pricing lives in [`data/offers.js`](data/offers.js) and network
priority (QCI) values in [`data/qci.js`](data/qci.js). Every entry
carries the source URL it was taken from, and each file records its
retrieval date. Multi-line prices the sources didn't publish are marked
`estimated: true` and shown with an asterisk in the UI.

**Refresh policy:** data is refreshed monthly — a scheduled workflow
opens a reminder issue on the 1st. QCI values rarely change but are
checked on the same cadence. **When a new carrier is added to
`data/offers.js`, its QCI entry must be added to `data/qci.js` in the
same change.** The app shows a staleness warning when the data is more
than 35 days old.

**Carrier pricing changes constantly. The data here is a point-in-time
sample of major US offers, not an exhaustive or live feed. Verify any
result on the carrier's site before making a purchase.**

To update offers, edit the `data/` files only — the engine in `app.js`
hard-codes no prices or QCI values.

### Toward live offers

Carriers publish no public pricing API, so truly live collection means
per-carrier scraping, which is fragile and needs its own iteration
(scheduled job, per-carrier parsers, failure alerting). Until then the
data files + monthly refresh are the source of truth.

## Disclaimer

This tool is for comparison purposes only and is not affiliated with any
carrier or manufacturer. Taxes, regulatory fees, and activation fees vary
by locality and are excluded unless you enter your own estimate.
