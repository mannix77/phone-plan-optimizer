#!/usr/bin/env python3
"""PostToolUse(Bash) hook: after a `git commit` runs, snapshot the transcript
to the archive immediately, so even a crashed session (where SessionEnd never
fires) leaves an auditable copy behind."""
import json
import re
import subprocess
import sys
from pathlib import Path

data = json.load(sys.stdin)
cmd = (data.get("tool_input") or {}).get("command", "")
if not re.search(r"\bgit\b[^\n|;&]*\bcommit\b", cmd):
    sys.exit(0)

sid = data.get("session_id", "")
transcript = data.get("transcript_path", "")
if not sid or not transcript:
    sys.exit(0)

upload = Path(__file__).resolve().parents[2] / "scripts" / "ai-attribution" / "upload-transcript.sh"
subprocess.run(["bash", str(upload), sid, transcript], check=False)
