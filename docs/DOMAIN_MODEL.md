# Domain model — the relationship graph behind the questions

The consultation and the filtering both hang off this graph. Each
question exists because an entity on the left constrains an entity on
the right; when an edge's answer is already known (or moot), the
question is skipped or prefilled. This is what keeps the flow short and
the results filtered with fewer errors.

```mermaid
graph LR
  subgraph "Step 1 — Today (CurrentState)"
    CS_LINES[Lines on account]
    CS_CARRIER[Current carrier]
    CS_MONTHLY[Service-only $/mo]
    CS_BALANCE[Device balance owed]
    CS_AGE[Current phone age]
  end

  subgraph "Step 2 — Needs"
    N_DATA[Priority-data level]
    N_HOTSPOT[Hotspot GB]
    N_INTL[International]
  end

  subgraph "Step 3 — Devices"
    D_MODEL[Device model per line]
    D_COUNT[Lines getting a device]
    D_TRADE[Trade-in tier]
  end

  subgraph "Step 4 — Paying"
    P_PATHS[Acquisition paths]
    P_MVNO[Include MVNOs]
    P_FEES[Taxes and fees estimate]
  end

  subgraph "Offer data (data/offers.js + data/qci.js)"
    PLAN["Plan (perLine prices, tier, features, QCI)"]
    DEVICE["Device (retail, soldBy, mfr financing, trade-in, lease)"]
    PROMO["Promo (credit, term, requiresTier, requiresTradeIn)"]
  end

  subgraph "Results"
    OPTION["Option = Plan × best Path (true 24-mo cost)"]
    BEST[Best option]
    CHEAP[Cheapest option]
    DIFF[Differentiators]
    TODAY[Savings vs. today]
  end

  CS_LINES -->|sets line count for| PLAN
  CS_AGE -->|prefills| D_TRADE
  CS_MONTHLY -->|baseline for| TODAY
  CS_BALANCE -->|constant across options, displayed not ranked| TODAY
  CS_CARRIER -->|labels| OPTION

  N_DATA -->|filters on features.premiumData| PLAN
  N_HOTSPOT -->|filters on features.hotspotGB| PLAN
  N_INTL -->|filters on features.international| PLAN

  D_MODEL -->|must be in soldBy for carrier financing| DEVICE
  D_COUNT -->|zero devices skips Step 4| P_PATHS
  D_TRADE -->|gates| PROMO
  PLAN -->|tier gates| PROMO
  DEVICE -->|coverage gates| PROMO

  P_PATHS -->|selects paths priced per| OPTION
  P_MVNO -->|widens plan set| PLAN
  P_FEES -->|adds to plan cost| OPTION

  PLAN --> OPTION
  DEVICE --> OPTION
  PROMO --> OPTION
  OPTION --> BEST
  OPTION --> CHEAP
  OPTION --> DIFF
```

## The rules the graph encodes

**Question generation / skipping**

| Edge | Behavior |
| --- | --- |
| Current phone age → trade-in | The trade-in answer is prefilled from the phones' age (`suggestTradeIn`); the user can override it. |
| Device count → paying step | Zero new devices makes every acquisition-path question moot, so Step 4 is skipped. |
| Calls & texts | Never asked: every plan in the data includes unlimited calls and texts, so the question carries no information. |

**Filtering (all engine-enforced, BDD-tested)**

| Edge | Rule |
| --- | --- |
| Needs → Plan | `matchesNeeds`: priority data, hotspot GB, international must meet or exceed the stated need; failing plans are excluded and reported. |
| Device.soldBy → carrier financing | A carrier that doesn't sell the device can't finance it; that line falls back to manufacturer financing with a note. |
| Trade-in + Plan.tier + Device → Promo | A promo applies only when its carrier, device list, minimum tier, and trade-in requirement are all satisfied. |
| Device.lease → lease path | No lease offer in the data means no lease option (never estimated). |
| MVNO → paths | MVNO device catalogs aren't in the data, so MVNO options price devices direct from the maker. |

**Classification**

| Output | Definition |
| --- | --- |
| True 24-month cost | Everything paid in months 1–24 plus device balance still owed at month 24. |
| Cheapest option | Lowest true 24-month cost among qualifying options (one option per plan — its best path). |
| Best option | Highest feature score (priority data, hotspot, international), tie broken by lower true cost. |
| Differentiators | A superlative uniquely held (most hotspot, largest credits, best QCI) or a feature most options lack (international, price lock, taxes included). Differentiated options rank above undifferentiated ones. |
| Savings vs. today | `currentMonthly × 24 − option true cost` — labeled as service-only vs. all-in. The current device balance is owed under every option, so it's displayed but never changes the ranking. |

When adding an entity (a carrier, a plan type, a new acquisition path),
add its edges here first — the edges tell you which question, filter, or
differentiator has to exist, and the BDD suite's data-integrity
scenarios enforce the data side.
