#!/usr/bin/env bash
# Verify every commit in a range carries AI-attribution trailers.
# Shared by the PR status check and the post-merge audit workflow.
# Usage: check-commits.sh <base-ref> [<head-ref>]
set -euo pipefail

BASE=$1
HEAD=${2:-HEAD}
fail=0

TRAILER_BLOCK="$(dirname "$0")/trailer-block.sh"

for sha in $(git rev-list --no-merges "$BASE..$HEAD"); do
  # Bot-authored commits (e.g. scheduled report pushes) are exempt.
  author=$(git log -1 --format='%an <%ae>' "$sha")
  case "$author" in *"[bot]"*) continue ;; esac

  # Only the trailer block, with folded values rejoined — never the whole
  # message. Grepping every line makes prose that quotes the trailer format
  # indistinguishable from a real trailer; see trailer-block.sh.
  full=$(git log -1 --format=%B "$sha")
  msg=$(bash "$TRAILER_BLOCK" <<<"$full")

  if grep -qE '^AI-Assisted:[[:space:]]*none[[:space:]]*$' <<<"$msg"; then
    continue
  fi

  # "Commit suggestion" commits from CodeRabbit reviews are created server-side
  # by GitHub (no local hooks run), but GitHub appends a Co-authored-by line
  # that self-attributes them; the PR review thread is the durable transcript.
  # Only trust the trailer when the commit really was made by GitHub's
  # web-flow committer — the free-text line alone is spoofable locally.
  #
  # Matched against the full message, not the trailer block: GitHub appends
  # this line in its own block, and CodeRabbit's release notes can sit between
  # that and the AI trailers, so it is routinely outside the selected block.
  if grep -qiE '^Co-authored-by: coderabbitai\[bot\]' <<<"$full"; then
    committer=$(git log -1 --format='%cn <%ce>' "$sha")
    if [ "$committer" = "GitHub <noreply@github.com>" ]; then
      continue
    fi
  fi

  # An unfilled template value, i.e. the whole value is a <bracketed> token,
  # rather than a "<" anywhere in the value (#36). Block selection now keeps
  # documentation prose out of here in the first place, so this is the second
  # line of defence rather than the only one — kept narrow because a value that
  # merely contains a bracket is not evidence of an unfilled template.
  if grep -qE '^AI-(Model|Session|Transcript):[[:space:]]*<[^>]*>[[:space:]]*$' <<<"$msg"; then
    echo "::error::commit $sha has placeholder AI-attribution values — fill in real ones"
    fail=1
    continue
  fi

  # "unknown" is what the git hook used to stamp when the SessionStart hook had
  # not recorded a model id. It is non-blank, so the presence checks below pass
  # while the commit declares nothing. Reject it explicitly.
  if grep -qiE '^AI-Model:[[:space:]]*(unknown|none|n/a|tbd)[[:space:]]*$' <<<"$msg"; then
    echo "::error::commit $sha declares a placeholder AI-Model — amend with the real model id (see docs/AI_ATTRIBUTION.md)"
    fail=1
    continue
  fi

  missing=""
  grep -qE '^AI-Model:[[:space:]]*\S+' <<<"$msg"      || missing="$missing AI-Model"
  grep -qE '^AI-Session:[[:space:]]*\S+' <<<"$msg"    || missing="$missing AI-Session"
  grep -qE '^AI-Transcript:[[:space:]]*\S+' <<<"$msg" || missing="$missing AI-Transcript"
  if [ -n "$missing" ]; then
    echo "::error::commit $sha ($author) is missing trailer(s):$missing — or add 'AI-Assisted: none' for human-only commits"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "All commits in $BASE..$HEAD carry AI attribution."
fi
exit $fail
