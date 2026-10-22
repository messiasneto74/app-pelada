# Publicação — web, Google Play e App Store

O **MVP** entrega o produto como **site/PWA** (`apps/pelada-web`). As **lojas** (Play Store e App Store) são um **empacotamento** do mesmo frontend — não um segundo app em outra pasta solta.

| Canal | Quando | Onde sobe | Issue |
|-------|--------|-----------|--------|
| **Web / PWA** | MVP (primeiro) | Hospedagem estática + domínio (ex. Nginx, Cloudflare Pages, Firebase Hosting) | `DEPLOY-1` |
| **Google Play** | Depois do MVP web estável (ou em paralelo no fim do M4) | [Google Play Console](https://play.google.com/console) | `STORE-1` |
| **Apple App Store** | Idem Android | [App Store Connect](https://appstoreconnect.apple.com) + Mac com Xcode | `STORE-1` |

Detalhes de deploy web: [arquitetura-backend-frontend.md](arquitetura-backend-frontend.md) · ambiente local: [desenvolvimento-local.md](desenvolvimento-local.md).

---

## Onde o código das lojas vive (monorepo)

Quando o monorepo existir (issues `F0-1`, `F0-5`), a estrutura recomendada é:

```text
app-pelada/
├── apps/
│   ├── pelada-web/          # Angular — fonte única de UI
│   └── api/                 # Nest — não vai para as lojas
├── packages/
│   └── core/                # sorteio — usado pela API e opcionalmente pelo web
└── apps/pelada-mobile/      # Capacitor (criado em STORE-1)
    ├── capacitor.config.ts  # webDir → ../pelada-web/dist/pelada-web/browser
    ├── android/             # projeto Gradle — build AAB para Play
    └── ios/                 # projeto Xcode — build IPA para App Store
```

**Regra:** não duplicar telas em `android/` ou `ios/` — só o **shell nativo** (WebView, ícones, splash, permissões, deep links). Toda tela segue [ui-referencia-resenha.md](ui-referencia-resenha.md) / `prototipo/visual/`.

**Ferramenta:** [Capacitor](https://capacitorjs.com/) no app Angular (`@capacitor/core`, `@capacitor/cli`, plataformas `android` e `ios`). Alternativa possível: Ionic + Capacitor no mesmo repo; o plano assume **Angular standalone + Capacitor**.

Fluxo de build típico:

```bash
# na raiz do monorepo (comandos finais no desenvolvimento-local.md)
npm run build:web          # gera dist em apps/pelada-web
cd apps/pelada-mobile
npx cap sync               # copia o bundle web para android/ e ios/
```

---

## Google Play Store

### Contas e artefatos

| Item | Onde |
|------|------|
| Conta desenvolvedor | [Play Console](https://play.google.com/console) — taxa única (Google) |
| App listing | Play Console → **Criar app** → ficha (nome, descrição, screenshots **phone/tablet**, ícone 512×512) |
| Binário | **Android App Bundle (`.aab`)** — obrigatório para novos apps |
| Assinatura | **Play App Signing** (recomendado): upload key no CI ou máquina do dev |
| Testes | Faixa **Teste interno** → **Teste fechado** → **Produção** |
| Política | Política de privacidade em URL pública (mesmo domínio do site) |

### Build Android (resumo)

1. `apps/pelada-mobile/android/` aberto no **Android Studio** ou via `./gradlew bundleRelease`.
2. Keystore de upload guardado em cofre (não commitar — ver `.env` / secrets no `DEPLOY-1` / `STORE-1`).
3. Enviar `.aab` em **Release** → **Criar nova versão**.
4. Preencher **Data safety**, público-alvo, classificação de conteúdo (questionário do Console).

**Deep links / OAuth:** redirect URIs do Keycloak devem incluir o scheme do app (`https://seu-dominio` e, se usar, `com.seudominio.pelada://callback`) — configurar em `F0-6` + `STORE-1`.

---

## Apple App Store

### Contas e artefatos

| Item | Onde |
|------|------|
| Conta | [Apple Developer Program](https://developer.apple.com/programs/) (anual) |
| App | [App Store Connect](https://appstoreconnect.apple.com) → **Meus apps** → novo app (bundle ID) |
| Binário | **`.ipa`** via Xcode **Archive** → **Distribute App** → App Store Connect |
| Certificados | Apple Developer → **Certificates, Identifiers & Profiles** (Distribution cert + provisioning) |
| Testes | **TestFlight** (interno/externo) antes da revisão da App Store |
| Revisão | Guidelines da Apple (login, conta, privacidade, pagamentos in-app se houver) |

### Build iOS (resumo)

1. Mac com **Xcode** (versão alinhada ao `ios` deployment target do Capacitor).
2. `npx cap open ios` em `apps/pelada-mobile` → selecionar team → **Product → Archive**.
3. Screenshots obrigatórios por tamanho de dispositivo (usar capturas 390×844 do protótipo como base; gerar conjuntos exigidos pelo Connect).
4. **App Privacy** (nutrition labels) coerente com API/Keycloak (dados de conta, não vender dados).

**Observação:** build de iOS **não** roda no CI Windows do dia a dia; use Mac local ou CI macOS (GitHub Actions `macos-latest`) na issue `STORE-1`.

---

## PWA vs app de loja

| | PWA (`DEPLOY-1`) | Play / App Store (`STORE-1`) |
|--|------------------|------------------------------|
| Instalação | “Adicionar à tela inicial” / navegador | Ícone na loja |
| Atualização | Deploy web imediato | Nova versão + revisão (Apple mais lenta) |
| Push nativo | Limitado na web | Plugins Capacitor (épico Depois) |
| Custo operacional | Baixo | Contas dev + builds nativos |

**Recomendação do plano:** lançar uso real pela **web**; submeter lojas quando login, API e fluxo MVP estiverem estáveis (após `E2E-1` / `DEPLOY-1`).

---

## Checklist STORE-1 (Definition of Done sugerida)

- [ ] `apps/pelada-mobile` com Capacitor apontando para build de produção do Angular
- [ ] Ícone e splash alinhados ao visual Resenha (`#173d32`, lime `#dcf58a`)
- [ ] AAB em teste interno (Play) + build TestFlight (Apple)
- [ ] Política de privacidade e suporte (e-mail/URL) publicados
- [ ] Keycloak e API acessíveis em HTTPS a partir do app empacotado
- [ ] Documentar versões mínimas (Android API level, iOS) no README

Issue no plano: [plano-issues-fases-milestones.md](plano-issues-fases-milestones.md) (F7).
