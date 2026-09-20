#!/usr/bin/env python3
"""SessionEnd hook: archive the session transcript so the AI-Transcript
trailer in commits resolves to a durable copy."""
import json
import subprocess
import sys
from pathlib import Path

data = json.load(sys.stdin)
sid = data.get("session_id", "")
transcript = data.get("transcript_path", "")
if not sid or not transcript:
    sys.exit(0)

upload = Path(__file__).resolve().parents[2] / "scripts" / "ai-attribution" / "upload-transcript.sh"
subprocess.run(["bash", str(upload), sid, transcript], check=False)
