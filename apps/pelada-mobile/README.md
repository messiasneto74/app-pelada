# @pelada/mobile (Capacitor — STORE-1)

Shell nativo que embute o build estático de `apps/pelada-web`. **Não** duplique UI aqui — só ícone, splash, permissões e deep links.

## Pré-requisitos

- Node 22+ (monorepo)
- **Android:** Android Studio, JDK 17+ (`./gradlew bundleRelease` → `.aab`)
- **iOS:** macOS + Xcode (Archive → TestFlight) — não roda no CI Windows

API e Keycloak em **HTTPS** (ver [docs/deploy-staging.md](../../docs/deploy-staging.md)). No client Keycloak, inclua redirect/deep link do app quando usar scheme customizado.

## Comandos (raiz do monorepo)

```powershell
npm.cmd run build:mobile          # build web produção + cap sync
npm.cmd run build:mobile:staging    # build web staging + cap sync
npm.cmd run cap:open:android
npm.cmd run cap:open:ios            # só macOS
```

## Play Store / App Store (mantenedor)

1. Keystore de upload em cofre (não commitar).
2. Play Console → teste interno → enviar `.aab` de `android/app/build/outputs/bundle/release/`.
3. App Store Connect → TestFlight após Archive no Xcode.

Política de privacidade e suporte: [docs/privacidade-mvp.md](../../docs/privacidade-mvp.md).

Referência completa: [docs/publicacao-lojas-play-app-store.md](../../docs/publicacao-lojas-play-app-store.md).
