#!/usr/bin/env sh
# Wrapper para Karma no GitHub Actions (flags de sandbox sem karma.conf).
exec /usr/bin/chromium \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  "$@"
