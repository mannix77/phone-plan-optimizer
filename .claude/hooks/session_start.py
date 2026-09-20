#!/usr/bin/env python3
"""SessionStart hook: record model + transcript path for this session.

The model id is only available in SessionStart hook input (not in the Bash
environment), so it is persisted here for the prepare-commit-msg git hook,
which stamps AI-* trailers onto commits made during the session.
"""
import json
import sys
import time
from pathlib import Path

data = json.load(sys.stdin)
state_dir = Path.home() / ".claude" / "ai-attribution"
state_dir.mkdir(parents=True, exist_ok=True)

sid = data.get("session_id")
if sid:
    model = data.get("model", "unknown")
    transcript = data.get("transcript_path", "")
    (state_dir / f"{sid}.env").write_text(
        f"AI_MODEL='{model}'\nTRANSCRIPT_PATH='{transcript}'\n"
    )

# Prune state files older than 30 days.
cutoff = time.time() - 30 * 86400
for f in state_dir.glob("*.env"):
    if f.stat().st_mtime < cutoff:
        f.unlink(missing_ok=True)
