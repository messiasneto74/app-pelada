# STORE-1 — evidência pós-merge (mantenedor)

O PR entrega o **shell Capacitor** e documentação. AAB (Play) e TestFlight (Apple) exigem contas desenvolvedor e máquinas com Android Studio / Xcode — fora do CI Windows.

## Checklist após merge

1. Publicar web staging (`DEPLOY-1`) e confirmar `https://app.<dominio>/privacidade.html`.
2. Play Console — teste interno — enviar `.aab` de:
   `apps/pelada-mobile/android` → `./gradlew bundleRelease` (keystore em cofre).
3. App Store Connect — Archive no Mac → TestFlight.
4. Anexar na issue **#59** (ou comentário no PR de release): links faixa de teste + screenshot da ficha com URL de privacidade.

## Comandos

```powershell
npm.cmd run build:mobile:staging
npm.cmd run cap:open:android
```

```bash
cd apps/pelada-mobile/android
./gradlew connectedDebugAndroidTest   # valida package com.pelada.app
```
