#!/bin/sh
# Connect clamdscan to a separate ClamAV service and stream the uploaded file.
set -eu
SCAN_HOST="${CLAMAV_HOST:-clamav}"
SCAN_PORT="${CLAMAV_PORT:-3310}"
CFG="$(mktemp)"
trap 'rm -f "$CFG"' EXIT
printf 'TCPSocket %s\nTCPAddr %s\n' "$SCAN_PORT" "$SCAN_HOST" > "$CFG"
clamdscan --config-file="$CFG" --stream "$@"
