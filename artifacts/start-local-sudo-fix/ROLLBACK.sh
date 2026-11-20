#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-/home/berkwe/Desktop/myProjects/NovoraScansSite/start-local.sh}"
cp -- /home/berkwe/Desktop/myProjects/NovoraScansSite/artifacts/start-local-sudo-fix/ORIGINAL.sh "$TARGET"
if [[ "$TARGET" == /home/berkwe/Desktop/myProjects/NovoraScansSite/start-local.sh ]]; then
  rm -f -- /home/berkwe/Desktop/myProjects/NovoraScansSite/tooling/test_start_local.py
fi
