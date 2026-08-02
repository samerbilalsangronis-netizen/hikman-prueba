#!/bin/bash
set -euo pipefail

# Only relevant for Claude Code on the web — each remote session starts from a
# fresh container, so the graphify CLI (installed as a uv tool, not tracked by
# git) has to be reinstalled every time. graphify-out/ itself IS committed to
# the repo, so this only restores the tool, not the graph.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "graphify session-start hook: uv not found, skipping graphify install" >&2
  exit 0
fi

if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy -q
fi

graphify install >/dev/null
