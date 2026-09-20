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

## Running it

It's a static page — open `index.html` in a browser, or serve the folder
with any static server (`python3 -m http.server`).

## Data

All pricing lives in [`data/offers.js`](data/offers.js). Every entry
carries the source URL it was taken from and the file records the
retrieval date. Multi-line prices the sources didn't publish are marked
`estimated: true` and shown with an asterisk in the UI.

**Carrier pricing changes constantly. The data here is a point-in-time
sample of major US postpaid offers, not an exhaustive or live feed.
Verify any result on the carrier's site before making a purchase.**

To update offers, edit `data/offers.js` only — the engine in `app.js`
hard-codes no prices.

## Disclaimer

This tool is for comparison purposes only and is not affiliated with any
carrier or manufacturer. Taxes, regulatory fees, and activation fees vary
by locality and are excluded unless you enter your own estimate.
