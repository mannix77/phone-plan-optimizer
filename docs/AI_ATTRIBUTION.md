# AI Attribution Policy

Every commit and PR in this repo must declare its AI provenance: which model
produced the change and where the session transcript lives. Presence and
format are machine-enforced; the trust model is "declared metadata, verified
by CI, auditable via archived transcripts" (same model as DCO sign-offs).

## The metadata

Commits made during a Claude Code session get these git trailers appended
automatically:

```
AI-Model: claude-fable-5
AI-Session: 13834f83-886f-4ff4-acdc-b0d563ef4cd7
AI-Transcript: /home/you/claude-transcript-archive/13834f83-....jsonl
```

Commits made outside a Claude session get `AI-Assisted: none`. The git author
stays the accountable human; the model is metadata, not the author.

PR descriptions must carry the same fields (see the PR template) — this is
what survives a squash merge, since the squash commit message is built from
the PR body.

## How it's produced (Claude Code side)

| Piece | Role |
|---|---|
| `.githooks/prepare-commit-msg` | Appends the trailers on every commit. Detects Claude via the `CLAUDECODE` / `CLAUDE_CODE_SESSION_ID` env vars Claude Code exports to Bash commands. |
| `.claude/hooks/session_start.py` | SessionStart is the only hook that receives the model id; it writes model + transcript path to `~/.claude/ai-attribution/<session>.env` for the git hook to read. |
| `.claude/hooks/session_end.py` | Archives the transcript when the session ends. |
| `.claude/hooks/post_bash_upload.py` | Also archives right after any `git commit`, so crashed sessions still leave a copy. |
| `scripts/ai-attribution/upload-transcript.sh` | Pluggable archive backend: `file` (default, `~/claude-transcript-archive`), `github` (private repo via contents API), `s3`, `azure`, or `none` via `git config ai.transcriptBackend`. |

One-time developer setup:

```bash
bash scripts/ai-attribution/setup.sh                  # sets core.hooksPath -> .githooks
bash scripts/ai-attribution/setup.sh --global-hooks   # also record the model in every session
```

`--global-hooks` matters more than it looks. `SessionStart` is registered in
`.claude/settings.json`, so it only fires when the Claude Code session was
started inside a project that registers it — start a session in `~` and commit
to this repo from there, and no model id is ever recorded. The git hook used to
stamp `AI-Model: unknown` in that case, which is non-blank and therefore passed
CI: a commit that merged green while declaring nothing. Now the git hook
refuses the commit, and `check-commits.sh` rejects `unknown` on the CI side too.

`--global-hooks` copies **only** the SessionStart recorder to
`~/.claude/hooks/` and registers it in `~/.claude/settings.json`. It writes to
`~/.claude/ai-attribution/` and makes no network calls. The transcript-upload
hooks deliberately stay project-scoped: registered globally they would ship
transcripts of unrelated work — including client work — into this repo's
private archive.

If you can't or don't want to install the global hook, declare the model
per clone instead:

```bash
git config ai.model claude-opus-5
```

To point trailers at a shared archive instead of a local path:

```bash
# GitHub-native (recommended): a dedicated private repo. Access-controlled,
# every overwrite versioned, and trailers become clickable links.
git config ai.transcriptBackend github
git config ai.transcriptGithubRepo mannix77/ai-transcripts
git config ai.transcriptBaseUrl https://github.com/mannix77/ai-transcripts/blob/main

# or cloud object storage:
git config ai.transcriptBackend s3            # or azure
git config ai.transcriptS3Uri s3://my-transcripts
git config ai.transcriptBaseUrl https://audit.example.com/transcripts
```

The `github` backend needs an authenticated `gh` CLI and caps files at the
contents-API limit (~100MB); switch outsized transcripts to Git LFS or object
storage if that's ever hit. Don't use secret gists (readable by anyone with
the URL) or Actions artifacts (expire after 90 days) for this.

### Secret scanning

This policy requires a transcript for every commit, and transcripts capture
whatever gets typed into a session — so a credential pasted mid-session flows
into the archive by design. `upload-transcript.sh` scans before uploading and
refuses when it finds one, because the archive is long-lived and, on the
`github` backend, versioned forever.

```bash
bash scripts/ai-attribution/upload-transcript.sh --scan <transcript.jsonl>
```

Findings print the pattern name and a line count, never the match itself, so
the scanner cannot leak the secret into CI logs. On a hit: revoke the
credential first (assume it is compromised — it has been sitting in a
plaintext file), then scrub it from the transcript or delete the transcript,
then re-run. Until the upload succeeds, `AI-Transcript` trailers from that
session will not resolve. For a verified false positive, re-run with
`AI_TRANSCRIPT_ALLOW_SECRETS=1`.

Only high-confidence, prefix-anchored formats are matched — GitHub, Anthropic,
OpenAI, AWS, Google, and Slack tokens, plus private-key blocks. A noisy
scanner is one people learn to override. It is a guard, not a guarantee: a
secret that is base64-encoded, split across lines, or in a format without a
distinctive prefix will pass.

## How it's enforced (GitHub side — tool-agnostic)

- **`ai-attribution` workflow** (required status check): fails any PR whose
  commits or description lack valid trailers. Works for any AI tool or none —
  other tools just need their own producer hook, or the developer fills the
  fields by hand.
- **Ruleset on `main`**: requires the `AI attribution check` status to pass
  before merge.
- **Squash merges**: repo is configured so the squash commit message uses the
  PR title + body, preserving the validated fields on `main`.
- **`ai-attribution-audit` workflow**: post-merge check on every push to
  `main`; opens an issue if unattributed commits land (e.g. admin bypass or
  direct push).

Exemptions: merge commits and `[bot]`-authored commits (scheduled report
pushes) are skipped by the checker, as are GitHub "commit suggestion"
commits from CodeRabbit reviews — those are created server-side (no local
hooks run) but self-attribute via GitHub's `Co-authored-by: coderabbitai[bot]`
line, with the PR review thread as the durable transcript.

Bot-authored **PRs** get the same exemption their commits do. Dependabot
cannot be made to comply: it builds its PR body from the changelog and ignores
`PULL_REQUEST_TEMPLATE.md`, and its `commit-message` config only supports a
prefix. The bot identity in the author field is the attribution.

### What counts as a trailer

`trailer-block.sh` selects the **last blank-line-delimited paragraph
containing an `AI-` line**, rejoins folded values, and hands only that to the
checks. Both the commit check and the PR-description check use it, so a PR
body and the squash commit built from it are read identically.

This matters more than it sounds. Scanning a whole message means any prose
that quotes the trailer format becomes an indistinguishable trailer — a
documentation PR could fail the audit, and did: three separate false positives
landed on `main` this way, every one on a correctly-attributed commit.

"Last paragraph" would be the obvious rule and is wrong. GitHub builds the
squash message from the PR body, and CodeRabbit appends its release notes to
that body *after* the author's content, so the real trailers routinely sit
well above the end — in `febeb5c` they are at line 109 of 141, with
`Co-authored-by` last.

Known limit: a message that quotes the format but carries no real trailers
will have its example selected as the block. The example must then pass the
same value checks, and the PR template puts the real block last, so this is
not worth more machinery. `git interpret-trailers` is not usable here — it
cannot recognise a trailer block that GitHub has already line-wrapped.

## Caveats & trust model

- CI can enforce that metadata is **present and well-formed**, not that it's
  **true** — a determined developer can hand-type trailers. The audit trail
  (does the transcript exist at the claimed location? does it mention these
  files?) is what makes lying detectable. Add required signed commits to make
  the *human* identity cryptographically real.
- Transcripts can contain credentials, internal details, or PHI. Archive
  destinations must be private and access-controlled — never a public bucket.
- If the model is switched mid-session (`/model`), the state file keeps the
  session's starting model; the transcript remains the source of truth.
- `CLAUDECODE` / `CLAUDE_CODE_SESSION_ID` are exported by current Claude Code
  versions (verified on 2.1.206) but are not formally documented; if absent,
  commits fall back to `AI-Assisted: none` and the CI check still forces a
  human correction.

## Scaling this to an org

- Put the workflow in a central `.github` repo as a reusable workflow and
  call it from each repo.
- On GitHub Enterprise: an **organization ruleset** can require the check on
  every repo's default branch, and **push rules (commit metadata
  restrictions)** can enforce the trailer pattern at push time.
- Claude Code **managed settings** (`managed-settings.json` deployed via MDM)
  can force the SessionStart/SessionEnd hooks org-wide so individual
  developers can't skip the producer side.

Review gate: every PR is also auto-reviewed by CodeRabbit; its status check
and conversation resolution are required by the same ruleset.
