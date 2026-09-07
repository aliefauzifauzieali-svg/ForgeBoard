# ForgeBoard — contexto para agentes (leia antes de mexer)

Workspace pessoal **local-first** (React 19 + TS + Vite + Tailwind v3 + Zustand).
Sem backend, sem contas, sem sincronização. Dados no navegador (IndexedDB via
`idb`, 1 KB) com quarentena + backups; PWA instalável; desktop (Tauri v2) e
Android (Capacitor 8). UI em pt-BR.

## Comandos (use exatamente estes)

```powershell
npm run typecheck   # tsc -b (OBRIGATÓRIO; `npx tsc --noEmit` na raiz é NO-OP: o tsconfig solução tem files:[])
npm run lint        # oxlint — 0 erros/avisos exigidos
npm test            # Vitest (run único)
npm run build       # tsc -b && vite build (gera dist/ + SW)
npm run test:e2e    # Playwright dev (sobe o dev sozinho)
npm run test:e2e:pwa # Playwright contra build+preview
```

Gates antes de commit/push: typecheck, lint, testes relevantes (ou suite),
`git diff --check`, sem segredos. Commits **Conventional Commits**, sem
`git add .` cego, sem force push. Branch principal: `main`.

## Mapa rápido

- `src/components/` ui, layout (Sidebar/TopBar/BottomNav), tasks, kanban, projects, settings, charts
- `src/features/` dashboard, project, calendar, stats, palette (+`highlight.ts`), focus (pomodoro)
- `src/stores/` `useBoardStore` (dados+histórico undo/redo), `useUIStore` (visão/modais/filtros),
  `usePrefsStore` (+`useThemeStore`, `useAccentStore` — prefs fora das migrações)
- `src/storage/` `boardStorage.ts` (boot/migração/backups/prefs/notas) + `idb.ts` + `activity.ts`
- `src/services/` lógica pura testável (busca, validação, recorrência, CSV, export, notificações, updaters)
- `src/utils/` core, date, constants, platform (`isTauri()`)
- `src/hooks/`, `src/pages/` (barris p/ features), `src/types/` (formato de dados `FORMAT_VERSION = 3`)
- `e2e/` (+`helpers.ts`: `seedBoard` exige payload **legado v1**!), `scripts/` (geradores de ícones/screenshots)
- `src-tauri/` (Tauri: `tauri.conf.json`, `src/frontend.rs`, `src/lib.rs`, `capabilities/`)
- `android/` (projeto Capacitor versionado), `capacitor.config.ts`, `.github/workflows/` (`ci.yml`, `release.yml`)

## Convenções duras (quebrá-las já deu defeito antes)

- **Estado de formulários/modais:** inicializar no mount + remontar via `key`
  (ver `TaskForm`/`ProjectForm`); **nunca** `setState` síncrono em corpo de
  `useEffect` (oxlint `set-state-in-effect`) — timers/callbacks ok; o único
  caso legítimo centralizado é `useDelayedUnmount` (supressão justificada).
- **Animações:** só CSS/Tailwind, só `transform`/`opacity`; tudo coberto pelo
  `prefers-reduced-motion` global em `index.css`. Keyframes novos entram em
  `tailwind.config.js` **e** no seletor de espera do `e2e/helpers.ts`
  (`expectNoSeriousViolations`), senão o axe mede fade e falha.
- **Acessibilidade:** labels/aria/foco em tudo; `role="checkbox"` custom só com
  `aria-checked`; contraste AA (cuidado com hover que clareia fundo:
  branco/indigo-500 = 4.46 — remover `hover:bg-indigo-500` foi o fix real).
- **Sem dependências pesadas:** gráficos são SVG próprio (`components/charts`);
  `recharts`/`dnd-kit` rejeitados de propósito. DnD é HTML5 (desktop) +
  botões Mover (touch); Kanban empilha na vertical no mobile.
- **Testes JSX exigem `.tsx`**; inputs controlados em testes precisam
  re-render a cada `onChange` (harness fiel); `user-event` + fake timers não
  se misturam (use `fireEvent` + `act(advanceTimersByTime)`).
- **Não commit de build:** `dist/`, `target/`, `test-results/`, APKs, `android/.../assets/`.

## Armadilhas do ambiente Windows/PowerShell 5.1 (todas já morderam)

- Sem `tail`, `&&`, `||`, `<` redirect, `-Recurse` no `Select-String`;
  `Select-String` com regex frágil — prefira a tool `grep`.
- `Get-Content`/`Set-Content` **corrompem UTF-8** (ANSI): edite só via tools;
  nunca faça cirurgia de bytes via shell (quase zeramos um arquivo assim).
- Shell das tools é longevo: `$env:` e PATH **não** atualizam (prefixe
  `cargo`/`java`/`ANDROID_HOME` em todo comando longo); terminais novos herdam ok.
- FS case-insensitive: `FocusTimer.tsx` × `focusTimer.ts` colidem — foi
  renomeado para `pomodoro.ts`. Nunca crie pares que diferem só em caixa.
- Caracteres invisíveis (BOM U+FEFF, combinantes U+0300–36F) quebram testes e
  regex: use escapes (`\uFEFF`, `new RegExp('[\\u0300-\\u036f]')`), nunca literais.
- `git add --chmod=+x android/gradlew` (o bit exec se perde no Windows; CI falhou por isso).
- `e2e` usa Chromium fixo; `test:e2e:install` baixa uma vez.

## Distribuição e auto-update (estado atual)

- **Desktop:** janela em `forgeboard://localhost/` servida da pasta
  `%APPDATA%\com.forgeboard.desktop\frontend\` (`src-tauri/src/frontend.rs`:
  protocolo custom + seed de `bundle.resources` + `version.json` + migração
  IDB `http_tauri.localhost`→`http_forgeboard.localhost` uma vez; localStorage
  recomeça). Origem `http://forgeboard.localhost` = contexto seguro normal
  (IDB, módulos ES, sem CORS especial). Update incremental:
  `frontend_check`/`frontend_apply` (reqwest+zip no Rust, com backup/rollback)
  via `services/desktopUpdater.ts` (mesma assinatura p/ UI). Instalador
  completo segue para 1ª instalação/mudanças Rust.
- **Android:** OTA via `latest.json` (seção `android`: `bundleUrl` zip +
  `apkUrl`), check por **HTTP nativo** (`CapacitorHttp` — `fetch` do WebView
  é bloqueado por CORS, GitHub não envia ACAO p/ `http://localhost`).
  `ANDROID_UPDATE_URL` segue vazio de propósito (plugin Capgo não fala com
  arquivo estático).
- **SW só no navegador** (`initPWA` pula Tauri/nativo): registrar SW no shell
  congela a UI em versão velha (prova: `workbox-precache-v2-http://tauri.localhost/`
  no perfil WebView2). PWA segue intacto no browser.
- **Release:** tag `v*` → workflow gera 4 builds + `latest.json` (desktop
  `platforms` + `android`, via script Python testável com fixtures) + publica
  com `softprops`. Uploads por OS com globs restritos (nunca `bundle/**/*`:
  poluiu a release com `.so`). Chave minisign: pública no conf, privada só
  nos secrets (`TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]`); build local sem chave
  falha SÓ na etapa de assinatura (esperado).
- **Versão** em 4 lugares: `package.json`, `tauri.conf.json`, `Cargo.toml`,
  `Cargo.lock` (sempre juntos + tag).
- **Repo é PÚBLICO de propósito**: downloads anônimos de releases são o canal
  de update (privado = 404 em tudo). Não re-privatize sem trocar o canal.

## Diagnóstico quando algo quebrar

- App desktop em branco/velho: conferir `%APPDATA%\...\frontend\version.json`
  e DataButtons/About; dumps UIA do Chromium são virtualizados (não confie
  em árvore vazia); `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` não abre RDP aqui.
- Perfis WebView2: `%LOCALAPPDATA%\com.forgeboard.desktop\EBWebView`
  (CacheStorage/IDB inspecionáveis em disco).
- CI Ubuntu usa fontes DejaVu: contraste marginal que passa no Windows pode
  falhar lá — verifique ratios reais (axe dump com `fgColor/bgColor`), não chute.
- Falha `color-contrast` em elemento ok? Cheque `:hover` sob o cursor do
  Playwright + animações não cobertas pelo helper do axe.

## Pendências conhecidas (não bloqueiam)

- Dica de kanban vazio (`text-zinc-500` sobre `zinc-100`) é marginal no AA;
  só aparece com kanban vazio (nenhum teste cobre).
- `latest.json` desktop usa convenção `v<versão>` + `forgeboard-web-<tag>.zip`.
