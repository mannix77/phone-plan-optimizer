# phone-plan-optimizer

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
