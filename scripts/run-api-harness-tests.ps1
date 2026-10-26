# TEST-API-HARNESS — Postgres teste + migrate + Jest (issue #55)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".\.env")) {
  Copy-Item ".\.env.example" ".\.env"
  Write-Host "Criado .env a partir de .env.example"
}

if (-not (Select-String -Path ".\.env" -Pattern "(?m)^DATABASE_URL_TEST=" -Quiet)) {
  @"

# Postgres de teste (TEST-API-HARNESS)
DATABASE_URL_TEST=postgresql://pelada_test:pelada_test_dev@localhost:5435/pelada_app_test
POSTGRES_APP_TEST_USER=pelada_test
POSTGRES_APP_TEST_PASSWORD=pelada_test_dev
POSTGRES_APP_TEST_PORT=5435
"@ | Add-Content -Path ".\.env" -Encoding utf8
  Write-Host "Adicionado DATABASE_URL_TEST ao .env"
}

Write-Host "==> 1/3 Postgres de teste (5435)..."
npm.cmd run db:test:up
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FALHOU: Docker. Abra o Docker Desktop, espere ficar verde, feche e abra o PowerShell de novo."
  exit $LASTEXITCODE
}

Write-Host "==> 2/3 Migrations..."
npm.cmd run db:test:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> 3/3 test:api (RUN_DB_TESTS=1)..."
$env:RUN_DB_TESTS = "1"
npm.cmd run test:api
$code = $LASTEXITCODE
if ($code -ne 0) {
  Write-Host ""
  Write-Host "FALHOU: test:api. Se for EPERM em query_engine: pare npm run dev:api e rode de novo."
}
exit $code
