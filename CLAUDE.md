# phone-plan-optimizer

## BDD / TDD policy (required)

Development is test-first. For any change to calculations or behavior:

1. Write (or update) the Gherkin scenario in `features/*.feature` and its
   step definitions in `features/steps/` first.
2. Run `npm test` and watch the new scenario fail (red).
3. Build the smallest change that makes it pass (green), then refactor.

All calculation logic lives in `engine.js` — pure functions that take the
offer data as an argument, testable in Node and used unchanged by the
browser. `app.js` is UI only and must not contain calculations. The
`tests` workflow runs the suite on every PR; a PR with failing or missing
scenarios for changed behavior is not mergeable.

## AI attribution policy (required)

Commit trailers are added automatically by `.githooks/prepare-commit-msg`
(run `bash scripts/ai-attribution/setup.sh` once if commits are missing
`AI-*` trailers).

When opening a PR, fill the **AI Attribution** block in the PR body with real
values — the `ai-attribution` status check rejects blanks and placeholders:

- `AI-Model:` — the model id for this session
- `AI-Session:` — the value of `$CLAUDE_CODE_SESSION_ID`
- `AI-Transcript:` — same transcript reference as the commit trailers
  (`git log -1 --format=%B` shows it)

See `docs/AI_ATTRIBUTION.md` for the full policy.

## Data rules

- All pricing lives in `data/offers.js`, all network-priority (QCI) values
  in `data/qci.js` — the engine in `app.js` hard-codes no prices or QCI
  values. Every entry carries a source URL; each file records its
  retrieval date.
- Refresh the data monthly (a scheduled workflow opens the reminder
  issue). When adding a carrier to `data/offers.js`, add its QCI entry to
  `data/qci.js` in the same change.
- Never invent a price, promo, or QCI value: unpublished numbers are
  marked `estimated: true` (shown with an asterisk in the UI), and a
  missing offer (e.g. no lease program for a device) stays missing — the
  UI says so instead of estimating one.
