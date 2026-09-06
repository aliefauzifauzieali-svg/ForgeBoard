# ForgeBoard

Dashboard pessoal de gerenciamento de projetos e tarefas, **local-first**: roda 100% no navegador, sem backend. Projetos com quadro Kanban (Backlog → Em andamento → Concluído), tarefas com prioridade, prazos, tags e filtros, tarefas recorrentes (diária/semanal/mensal/personalizada), subtarefas com progresso, calendário mensal/semanal/diário com drag and drop, etiquetas com cores, gráficos de atividade, backup automático, instalável como PWA e 100% funcional offline, tema claro/escuro, atalhos de teclado, paleta de comandos (`Ctrl+K`), desfazer/refazer, toasts, notificações locais de prazo, importação/exportação JSON versionada, exportação CSV/Markdown, importação de CSV e persistência em IndexedDB (com migração do formato antigo) e página de Estatísticas com log de atividades e métricas históricas.

## Screenshots

> Geradas com `node scripts/capture-screenshots.mjs` (após `npm run build`).

| Dashboard | Quadro Kanban |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Kanban](docs/screenshots/kanban.png) |

| Calendário | Estatísticas |
|---|---|
| ![Calendário](docs/screenshots/calendar.png) | ![Estatísticas](docs/screenshots/stats.png) |

| Modo escuro | Mobile |
|---|---|
| ![Dark](docs/screenshots/dark.png) | ![Mobile](docs/screenshots/mobile.png) |

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Estilo | Tailwind CSS 3 (modo escuro via classe) |
| Estado | Zustand |
| Ícones | Lucide React |
| Datas | date-fns (cálculos + locale pt-BR) |
| Dados | IndexedDB via `idb` (`fake-indexeddb` nos testes) |
| Testes unitários | Vitest + Testing Library + jsdom |
| Testes E2E | Playwright (Chromium) + axe-core |
| PWA | vite-plugin-pwa (generateSW, manifest, offline) |
| Lint | oxlint |

## Estrutura do projeto

```
ForgeBoard/
├── e2e/                      # Testes E2E (Playwright)
│   ├── helpers.ts            # resetBoard, seedBoard, createProject…
│   ├── projects.spec.ts
│   ├── tasks.spec.ts
│   ├── palette.spec.ts
│   ├── calendar.spec.ts
│   ├── tags.spec.ts
│   ├── data.spec.ts
│   ├── stats.spec.ts
│   ├── pwa.spec.ts
│   ├── responsive.spec.ts
│   ├── a11y.spec.ts
│   └── persistence.spec.ts
├── src/
│   ├── components/           # UI burra/reutilizável
│   │   ├── kanban/           # KanbanBoard, KanbanColumn (drag-and-drop nativo)
│   │   ├── layout/           # Sidebar, TopBar, BottomNav (mobile)
│   │   ├── projects/         # ProjectCard, ProjectModal
│   │   ├── tasks/            # TaskCard, TaskRow, TaskModal, TaskFiltersBar
│   │   ├── settings/         # SettingsModal (tema, atalhos, etiquetas, backup)
│   │   ├── charts/           # SVG próprios (barras, rosca, linhas — sem lib)
│   │   └── ui/               # Modal, ConfirmDialog, Toasts, banners, PWA…
│   ├── features/             # Seções com regra de negócio
│   │   ├── dashboard/        # estatísticas, projetos, atrasadas, recentes
│   │   ├── palette/          # paleta de comandos + busca global
│   │   ├── calendar/         # mês/semana/dia + DnD de prazos (date-fns)
│   │   ├── stats/            # página de Estatísticas + métricas
│   │   └── project/          # visão do projeto + Kanban filtrado
│   ├── pages/                # wrappers finos sobre features
│   ├── hooks/                # atalhos, focus trap
│   ├── stores/               # board, UI, tema, prefs (Zustand, API síncrona)
│   ├── types/                # Project, Task, Tag, BoardData, filtros…
│   ├── services/             # pura: stats, calendar, query, validation, boot…
│   ├── storage/              # idb + boardStorage + migrations + activity
│   ├── utils/                # id, datas, constantes, cn()
│   └── tests/                # testes unitários Vitest + setup (+fixtures/)
├── playwright.config.ts
├── vite.config.ts            # + config do Vitest
└── tailwind.config.js
```

## Instalação

Pré-requisitos: **Node.js 20+** e npm.

```powershell
cd ForgeBoard
npm install
npm run dev        # http://127.0.0.1:5173
```

Primeira execução para E2E (baixa o Chromium):

```powershell
npm run test:e2e:install
```

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | `tsc -b` + build de produção (`dist/`) |
| `npm run preview` | serve o build de produção |
| `npm run typecheck` | apenas `tsc -b` |
| `npm run lint` | oxlint |
| `npm run test` | testes unitários (Vitest, run único) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:e2e` | Playwright dev (sobe o `dev` sozinho via `webServer`) |
| `npm run test:e2e:pwa` | Playwright contra o build (`preview`): manifest, SW, offline, update |
| `npm run tauri:dev` | app desktop em desenvolvimento (exige Rust) |
| `npm run tauri:build` | instaladores desktop em `src-tauri/target/release/bundle/` |
| `npm run android:sync` | copia `dist/` + config para o projeto Android |
| `npm run android:open` | abre o projeto no Android Studio |
| `npm run android:build` | gera o APK de debug (`android/app/build/outputs/apk/debug/`) |
| `npm run android:build:win` | mesmo build via `.\gradlew` (PowerShell/Windows) |

## Instalação Desktop (Tauri — Windows/Linux/macOS)

Pré-requisitos: Node.js 20+ e o toolchain **Rust estável** (`rustup`), além das
dependências de sistema do [guia Tauri](https://v2.tauri.app/start/prerequisites/)
(WebView2 no Windows 10/11 — já incluso no Windows 11; WebKitGTK no Linux).
No Windows, instale via winget (toolchain verificada: Rust 1.98.1):

```powershell
winget install --id Rustlang.Rustup -e --silent --accept-package-agreements
#toolchain MSVC (link.exe) vem com o Visual Studio 2022 + workload C++
```

```powershell
npm install
npm run tauri:dev    # janela desktop apontando para o Vite em dev
npm run tauri:build  # instaladores em src-tauri/target/release/bundle/
```

Saídas: Windows (`.msi` + `.exe` NSIS), macOS (`.dmg` + `.app`), Linux (`.deb` + `.AppImage`).
O frontend é o mesmo `dist/` do PWA — nenhuma lógica muda; o armazenamento
continua em IndexedDB/localStorage dentro da WebView.

## Instalação Android (Capacitor — APK)

Pré-requisitos: Node.js 20+, **JDK 21** e **Android SDK** (cmdline-tools +
platform-tools + uma platform Android), com `ANDROID_HOME`/`ANDROID_SDK_ROOT`
apontando para o SDK. No Windows, instale via winget (toolchain verificada:
Temurin JDK 21.0.12, SDK com platform android-36 + build-tools 35):

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK -e --silent --accept-package-agreements
#Android Studio (traz o SDK): winget install --id Google.AndroidStudio -e
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
#Reabra o terminal para herdar as variáveis.
```

```powershell
npm install
npm run build
npm run android:sync    # copia dist/ para android/app/src/main/assets
npm run android:build   # APK debug em android/app/build/outputs/apk/debug/
```

Alternativa sem linha de comando: `npm run android:open` e Build > Build APK no
Android Studio. Offline funciona porque os assets vão empacotados no APK;
IndexedDB/localStorage persistem entre reinicializações. Nota: na WebView o
service worker pode não registrar (esquema próprio do Capacitor) — irrelevante
aqui, pois nada é buscado da rede; o `pwa.ts` trata a falha em silêncio.

## Atualizações automáticas

### Desktop (Tauri, assinado)

O app verifica `latest.json` no GitHub Releases ao iniciar (silencioso) e em
Configurações > Atualizações (botão "Verificar atualização" + "Instalar e
reiniciar", com progresso). Pacotes verificados por assinatura minisign.

- Chave: gerada com `tauri signer generate`; a pública está em
  `tauri.conf.json` (`plugins.updater.pubkey`); a privada vive nos secrets
  `TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]` do repositório (nunca no código).
- O workflow de release assina os bundles e publica `latest.json` junto aos
  instaladores (Windows: `-setup.exe`; Linux: `.AppImage`; macOS: `.app.tar.gz`).
- Teste manual: instale uma versão antiga, publique tag maior, abra o app —
  o toast indica a nova versão; instale por Configurações e confirme a versão.

### Android (Capacitor, OTA via servidor)

Atualizações over-the-air do bundle web via plugin Capgo (`autoUpdate: false`
por padrão — nada é verificado sozinho). Passos para habilitar:

1. Contrate/choque um servidor de bundles (nuvem Capgo ou próprio compatível).
2. Preencha `ANDROID_UPDATE_URL` em `src/services/updateServer.ts`
   (fonte única: alimenta `capacitor.config.ts` e o serviço).
3. `npm run android:sync` + rebuild do APK (`android:build:win`).
4. No app: Configurações > Atualizações do Android > Verificar > Baixar e
   aplicar; a troca vale após reiniciar. Bundles OTA não pedem confirmação
   do sistema (só reinstalações de APK pedem).
5. Quando houver servidor, chame `CapacitorUpdater.notifyAppReady()` no boot
   (evita rollback automático do bundle).

Sem servidor, a seção mostra "não configurado" e nenhuma rede é tocada.

## Nova versão (release automática)

O workflow `.github/workflows/release.yml` gera instaladores Windows/Linux/macOS
(Tauri) + APK Android (Capacitor) a cada tag `v*`:

```powershell
#1. Sincronize a versão do app com a tag (package.json + src-tauri/tauri.conf.json)
#2. Commit, tag e push — o resto é automático:
git tag v1.3.0
git push origin main v1.3.0
#3. Acompanhe em Actions > Release; os artefatos vão para a release do GitHub.
```

Também dá para disparar manualmente em Actions > Release > Run workflow
(`workflow_dispatch`). iOS fora de escopo.

## Como executar os testes

```powershell
npm run test          # testes unitários (Vitest)
npm run test:e2e      # testes E2E no Chromium (dev + mobile)
npm run test:e2e:pwa   # E2E do PWA contra o build (SW, offline, update)
```

Cobertura unitária: criação de tarefas, mudança de status, `previousStatus`, filtros, ordenação, busca global, undo/redo, calendário (grades, agrupamento, datas), PWA (banner offline, instalação), toasts, persistência (`boardStorage` + quarentena), importação/exportação com validação, cálculo de progresso, guards do store, `saveError`, ErrorBoundary/focus-trap, log de atividades (CRUD/consulta/retenção/upgrade), métricas (throughput, lead time, evolução) e etiquetas. E2E: criar projeto, criar tarefa, mover no Kanban, editar tarefa, paleta de comandos, undo via toast e atalho, calendário (criar/arrastar/sincronia/navegação), PWA (manifest, SW, offline, splash, update com rebuild), estatísticas (resumo, filtros, interatividade), etiquetas e backup/restore, diálogo de atalhos, axe (dashboard/Kanban/modal/paleta/calendário/configurações/estatísticas), reload mantendo os dados, recuperação de quarentena e fluxos mobile.

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `N` | nova tarefa (herda o projeto aberto) |
| `T` | nova tarefa com o prazo de hoje |
| `P` | novo projeto |
| `/` | focar pesquisa |
| `Ctrl/⌘+K` | paleta de comandos e busca global (funciona em qualquer lugar) |
| `Ctrl/⌘+Z` | desfazer última alteração |
| `Ctrl/⌘+Shift+Z` ou `Ctrl+Y` | refazer alteração desfeita |
| `?` | abrir lista de atalhos |
| `Esc` | fechar modal / confirmação / paleta / menu mobile |

Teclas simples ignoradas enquanto o foco está em `input`, `textarea`, `select` ou conteúdo editável — e também quando qualquer modal/confirmação está aberto (só `Esc` age). `Ctrl/⌘+Z` em campos de texto mantém o comportamento nativo do navegador.

## Robustez dos dados

- **Validação no boot**: `loadInitialData` aplica migrações e as mesmas regras da importação. Payload ausente, malformado ou inválido resulta em board vazio — e o conteúdo bruto é preservado na **quarentena**, com banner oferecendo baixar a cópia, restaurar backup ou descartar.
- **ErrorBoundary**: qualquer erro de render mostra tela de recuperação com exportação de backup antes de recomeçar.
- **Falha de persistência**: se o IndexedDB falhar (cota excedida, modo privado), um banner avisa e oferece exportar backup — nada se perde em silêncio.
- **CI** (`.github/workflows/ci.yml`): typecheck → lint → testes → build → E2E a cada push/PR.

## Decisões arquiteturais importantes

1. **Camada de armazenamento isolada** (`src/storage/`): a UI nunca toca storage diretamente. Hoje há o IndexedDB (`idb.ts`: `kv` + `backups`) com migrações versionadas (`migrations.ts`); o `localStorage` serve só de espelho do tema e quarentena. Um backend futuro implementa o mesmo repositório (`loadInitialData`/`persistSnapshot`) sem reescrever componentes — só o store passa a chamar o serviço remoto. Stores partem vazios e são hidratados explicitamente no boot (`services/boot.ts`), sem I/O no momento do import.
2. **Lógica pura fora dos componentes** (`src/services/`): estatísticas, filtros/ordenação e validação de import são funções puras, 100% testáveis sem React. Stores e componentes apenas orquestram.
3. **Dois stores Zustand com papéis distintos**: `useBoardStore` (dados de domínio + persistência) e `useUIStore` (visão, filtros, modais). Tema em `useThemeStore` com preferência `light|dark|system` persistida e `matchMedia` para o modo sistema.
4. **Drag-and-drop nativo (HTML5) em vez de biblioteca**: zero dependências, com alternativa por teclado (cada cartão tem botões “Mover para coluna anterior/próxima” operáveis por teclado e título focável que abre a edição — sem interativos aninhados). Playwright testa o movimento via esses botões.
5. **Validação defensiva na importação**: `validateBoardData` nunca lança — retorna `{ ok, errors, data }`; nada é substituído sem passar na validação **e** sem confirmação explícita do usuário (`ConfirmDialog`).
6. **Sem roteador**: navegação por estado (`view: dashboard | project`), suficiente para app local de página única e evita dependência extra; E2E não depende de URLs.
7. **Tailwind v3 + `darkMode: 'class'`**: modo escuro robusto e testável, incluindo `color-scheme` no `<html>`.
8. **Dados em camadas**: store síncrono em memória (a UI nunca espera I/O) + `IndexedDB` assíncrono (`idb`, 1 KB) com flush no `pagehide`; `localStorage` só espelha tema/quarentena. Migrações versionadas e idempotentes; backups automáticos + manuais com retenção de 5.
9. **Log de atividades append-only** (`activity` no mesmo banco, com índices): eventos de domínio com metadados mínimos (títulos para entidades excluídas, sem snapshots); bulk (import/undo/seed usa lote próprio) não polui métricas; retenção de 90 dias com poda no boot; leitura via `use()` + Suspense com cache invalidado na escrita.

## Limitações atuais

- Persistência limitada à cota do IndexedDB do navegador e a um único dispositivo — sem sincronização.
- Sem colaboração em tempo real, anexos ou contas de usuário (fora do escopo local-first).
- Drag-and-drop usa HTML5 DnD (sem animações físicas de bibliotecas como dnd-kit); no toque (mobile) o movimento é feito pelos botões “Mover”.
- Sem migração automática além de `v1 → v3` (versões futuras desconhecidas vão para quarentena em vez de migrar).

## Possíveis melhorias futuras

- [ ] Backend opcional (REST/Supabase/Firebase) implementando o repositório de dados + sincronização e resolução de conflitos.
- [x] Migrações versionadas de schema (`v1 → v3`).
- [x] Subtarefas com progresso (sem comentários/anexos).
- [x] Visões de calendário (mês/semana/dia) com drag and drop de prazos.
- [x] Recorrência de tarefas (diária/semanal/mensal/personalizada).
- [x] Busca global com paleta de comandos (`Ctrl/⌘+K`), filtro `#etiqueta`, ranking e destaque, e atalhos (`?` lista todos).
- [ ] Arrastar com `@dnd-kit` + suporte completo a toque.
- [x] PWA instalável.
- [x] Exportação CSV/Markdown e importação de CSV.
- [x] Testes de acessibilidade automatizados (axe) no CI.
