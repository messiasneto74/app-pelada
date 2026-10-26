#!/usr/bin/env sh
# Karma no CI: CHROME_EXECUTABLE = binário real; CHROME_BIN aponta para este script.
CHROME="${CHROME_EXECUTABLE:?CHROME_EXECUTABLE não definido}"
exec "$CHROME" \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  "$@"
