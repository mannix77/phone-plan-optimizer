#!/usr/bin/env bash
# Read a commit message or PR body on stdin; write just its AI trailer block to
# stdout, with folded values rejoined. Shared by check-commits.sh and the
# PR-description step in ai-attribution.yml so the two cannot drift apart.
#
# Why a block rather than the whole message: git trailers are the last block of
# a message, but the checks used to grep every line, so any prose that quoted
# the trailer format became an indistinguishable trailer. That is not
# hypothetical — PR #25's body documented the fold defect it was fixing, the
# quoted example was read as a real trailer, and the post-merge audit failed on
# main (issue #35).
#
# "Last paragraph" is too naive. GitHub builds a squash message from the PR
# body, and CodeRabbit appends its release notes to that body after the author's
# content, so the real trailers can sit well above the end — in febeb5c they are
# at line 109 of 141, with Co-authored-by last. The rule that holds for both
# shapes is the last blank-line-delimited paragraph that contains an AI- line.
#
# Known limit: a message that quotes the format but carries no real trailers
# will have its example selected as the block. The example then has to pass the
# same value checks to be accepted, and the PR template puts the real block
# last, so this is not worth more machinery.
set -euo pipefail

# Paragraph mode (RS="") makes "last block containing an AI- line" a one-liner.
# $0 keeps its internal newlines, so the block comes out intact.
select_block() {
  awk '
    BEGIN { RS = ""; ORS = "" }
    /(^|\n)AI-[A-Za-z]+:/ { block = $0 "\n" }
    END { printf "%s", block }
  '
}

# GitHub hard-wraps long lines when it builds a squash-merge commit message from
# the PR body, which orphans a long trailer's value onto the following line:
#
#     AI-Transcript:
#     https://github.com/owner/ai-transcripts/blob/main/SESSION.jsonl
#
# The trailer is present and correct, just folded. Rejoin those before matching
# so a properly-attributed commit is not reported as missing a trailer. An
# AI-Transcript line is ~109 characters, so it wraps essentially every time.
#
# Only a plausible continuation is joined: a non-blank line that does not itself
# start a trailer, a comment, or an HTML comment. That keeps a genuinely empty
# trailer failing, instead of silently swallowing the next line as its value.
unwrap_trailers() {
  awk '
    function flush() { if (held != "") { print held; held = "" } }
    {
      if (held != "") {
        if ($0 ~ /^[^[:space:]]/ && $0 !~ /^AI-/ && $0 !~ /^#/ && $0 !~ /^</) {
          print held " " $0; held = ""; next
        }
        flush()
      }
      if ($0 ~ /^AI-(Model|Session|Transcript):[[:space:]]*$/) { held = $0; next }
      print
    }
    END { flush() }
  '
}

select_block | unwrap_trailers
