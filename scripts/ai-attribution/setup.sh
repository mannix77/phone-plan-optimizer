#!/usr/bin/env bash
# One-time developer setup for the AI attribution policy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git config core.hooksPath .githooks
mkdir -p "$HOME/.claude/ai-attribution"

echo "core.hooksPath -> .githooks (AI attribution trailers now added on commit)"

# --global-hooks: register the SessionStart recorder in ~/.claude/settings.json
# so the model id is captured no matter which directory the Claude Code session
# was started in. Without it, a session started outside this repo records no
# model and the git hook refuses to commit.
#
# Only the SessionStart recorder is installed globally. It writes to
# ~/.claude/ai-attribution/ and makes no network calls. The transcript-upload
# hooks stay project-scoped on purpose: registered globally they would ship
# transcripts of unrelated work — including client work — to this repo's
# private archive.
if [ "${1:-}" = "--global-hooks" ]; then
  dest="$HOME/.claude/hooks/ai-attribution-session-start.py"
  mkdir -p "$(dirname "$dest")"
  cp .claude/hooks/session_start.py "$dest"
  chmod +x "$dest"
  python3 - "$dest" <<'PY'
import json, pathlib, sys

hook = sys.argv[1]
path = pathlib.Path.home() / ".claude" / "settings.json"
cfg = json.loads(path.read_text()) if path.exists() else {}
groups = cfg.setdefault("hooks", {}).setdefault("SessionStart", [])
if any(h.get("command") == hook for g in groups for h in g.get("hooks", [])):
    print(f"SessionStart recorder already registered in {path}")
else:
    groups.append({"hooks": [{"type": "command", "command": hook}]})
    path.write_text(json.dumps(cfg, indent=2) + "\n")
    print(f"SessionStart recorder registered in {path}")
PY
  echo "Restart Claude Code (or start a new session) for it to take effect."
fi
echo
echo "Optional transcript archive configuration (default: copy to ~/claude-transcript-archive):"
echo "  git config ai.transcriptBackend github|s3|azure|file|none"
echo "  git config ai.transcriptBaseUrl https://...   # URL prefix used in AI-Transcript trailers"
echo
echo "GitHub-repo archive (recommended):"
echo "  git config ai.transcriptBackend github"
echo "  git config ai.transcriptGithubRepo mannix77/ai-transcripts"
echo "  git config ai.transcriptBaseUrl https://github.com/mannix77/ai-transcripts/blob/main"
