#!/usr/bin/env bash
# Archive a Claude Code session transcript so AI-Transcript trailers resolve.
# Usage: upload-transcript.sh <session-id> <transcript-path>
#
# Backend is selected via `git config ai.transcriptBackend`:
#   file (default) — copy to ai.transcriptArchiveDir (~/claude-transcript-archive)
#   github         — commit to the private repo in ai.transcriptGithubRepo via
#                    the contents API (needs `gh` auth; files must be <100MB)
#   s3             — aws s3 cp to ai.transcriptS3Uri
#   azure          — az storage blob upload to ai.transcriptAzureAccount/Container
#   none           — skip archiving
#
# Transcripts can contain credentials, internal details, or PHI — archive
# targets must be private and access-controlled.
set -euo pipefail

# Transcripts capture everything typed into a session, so a credential pasted
# mid-session flows into the archive by design — and the archive is long-lived
# and, on the github backend, versioned forever. Refuse to upload rather than
# discover it later.
#
# Only high-confidence, prefix-anchored formats are matched. A noisy scanner
# that people habitually override is worse than no scanner. This is a guard,
# not a guarantee: it will not catch a secret that is base64-encoded, split
# across lines, or in a format without a distinctive prefix.
#
# Findings print the pattern name and a match count only — never the match, so
# the scanner's own output cannot leak the secret into CI logs.
scan_secrets() {
  local src=$1 name pattern hits found=0
  while IFS='|' read -r name pattern; do
    [ -z "$name" ] && continue
    # -e: the private-key pattern starts with "-" and is otherwise parsed as a flag.
    hits=$(grep -cE -e "$pattern" "$src" || true)
    if [ "${hits:-0}" -gt 0 ]; then
      echo "  $name — $hits line(s)" >&2
      found=1
    fi
  done <<'PATTERNS'
GitHub personal access token|ghp_[A-Za-z0-9]{36}
GitHub fine-grained token|github_pat_[A-Za-z0-9_]{60,}
GitHub OAuth/app/refresh token|gh[ousr]_[A-Za-z0-9]{36}
Anthropic API key|sk-ant-[A-Za-z0-9_-]{20,}
OpenAI API key|sk-(proj-)?[A-Za-z0-9]{40,}
AWS access key id|(AKIA|ASIA)[0-9A-Z]{16}
Google API key|AIza[0-9A-Za-z_-]{35}
Slack token|xox[baprs]-[0-9A-Za-z-]{10,}
Private key block|-----BEGIN [A-Z ]*PRIVATE KEY-----
PATTERNS
  [ "$found" -eq 0 ]
}

# --scan <file>: check a transcript without uploading it. Exits 0 when clean.
if [ "${1:-}" = "--scan" ]; then
  if scan_secrets "$2"; then
    echo "no secrets detected in $2"
    exit 0
  fi
  echo "secrets detected in $2" >&2
  exit 1
fi

SID=$1
SRC=$2
[ -f "$SRC" ] || exit 0

if [ "${AI_TRANSCRIPT_ALLOW_SECRETS:-}" = "1" ]; then
  echo "AI_TRANSCRIPT_ALLOW_SECRETS=1 — skipping secret scan for $SID" >&2
elif ! scan_secrets "$SRC"; then
  cat >&2 <<EOF

Refusing to archive transcript $SID — it appears to contain a live credential.

  $SRC

Anything archived here is permanent and, on the github backend, versioned.
Do this in order:

  1. Revoke the credential. Assume it is already compromised — it has been
     sitting in a plaintext file on this machine.
  2. Scrub it from the transcript, or delete the transcript if the session is
     not worth keeping.
  3. Re-run this script.

If the match is a false positive, verify it by hand and re-run with
AI_TRANSCRIPT_ALLOW_SECRETS=1. Note that the AI-Transcript trailer on any
commit from this session will not resolve until the upload succeeds.
EOF
  exit 1
fi

BACKEND=$(git config --get ai.transcriptBackend || echo file)
case "$BACKEND" in
  none)
    ;;
  file)
    DEST=$(git config --get ai.transcriptArchiveDir || echo "$HOME/claude-transcript-archive")
    mkdir -p "$DEST"
    cp "$SRC" "$DEST/$SID.jsonl"
    ;;
  github)
    REPO=$(git config --get ai.transcriptGithubRepo)   # e.g. mannix77/ai-transcripts
    # Blob sha of the existing file, needed by the contents API to overwrite.
    # (Trees API instead of GET /contents — the latter errors on files >1MB.)
    SHA=$(gh api "repos/$REPO/git/trees/main" \
      --jq ".tree[] | select(.path==\"$SID.jsonl\") | .sha" 2>/dev/null || true)
    TMP=$(mktemp)
    python3 - "$SRC" "$SID" "$SHA" >"$TMP" <<'PY'
import base64, json, sys
src, sid, sha = sys.argv[1], sys.argv[2], sys.argv[3]
payload = {"message": f"archive transcript {sid}",
           "content": base64.b64encode(open(src, "rb").read()).decode()}
if sha:
    payload["sha"] = sha
print(json.dumps(payload))
PY
    gh api -X PUT "repos/$REPO/contents/$SID.jsonl" --input "$TMP" >/dev/null
    rm -f "$TMP"
    ;;
  s3)
    URI=$(git config --get ai.transcriptS3Uri)
    aws s3 cp "$SRC" "${URI%/}/$SID.jsonl" --only-show-errors
    ;;
  azure)
    ACCOUNT=$(git config --get ai.transcriptAzureAccount)
    CONTAINER=$(git config --get ai.transcriptAzureContainer)
    az storage blob upload --auth-mode login --overwrite \
      --account-name "$ACCOUNT" --container-name "$CONTAINER" \
      --name "$SID.jsonl" --file "$SRC" >/dev/null
    ;;
  *)
    echo "unknown ai.transcriptBackend: $BACKEND" >&2
    exit 1
    ;;
esac
