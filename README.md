# ForgeBoard

Dashboard pessoal de gerenciamento de projetos e tarefas, **local-first**: roda 100% no navegador, sem backend. Projetos com quadro Kanban (Backlog → Em andamento → Concluído), tarefas com prioridade, prazos, tags e filtros, calendário mensal/semanal/diário com drag and drop, etiquetas com cores, gráficos de atividade, backup automático, instalável como PWA e 100% funcional offline, tema claro/escuro, atalhos de teclado, paleta de comandos (`Ctrl+K`), desfazer/refazer, toasts, importação/exportação JSON versionada e persistência em IndexedDB (com migração do formato antigo) e página de Estatísticas com log de atividades e métricas históricas.

## Screenshots (placeholder)

> Substitua pelos prints reais em `docs/screenshots/`.

| Dashboard | Quadro Kanban |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Kanban](docs/screenshots/kanban.png) |

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
- Sem migração automática além de `v1 → v2` (versões futuras desconhecidas vão para quarentena em vez de migrar).

## Possíveis melhorias futuras

- [ ] Backend opcional (REST/Supabase/Firebase) implementando o repositório de dados + sincronização e resolução de conflitos.
- [x] Migrações versionadas de schema (`v1 → v2`).
- [ ] Subtarefas, comentários e anexos (IndexedDB para binários).
- [x] Visões de calendário (mês/semana/dia) com drag and drop de prazos.
- [ ] Recorrência de tarefas.
- [x] Busca global com paleta de comandos (`Ctrl/⌘+K`) e atalhos (`?` lista todos).
- [ ] Arrastar com `@dnd-kit` + suporte completo a toque.
- [x] PWA instalável.
- [ ] Exportação CSV/Markdown.
- [x] Testes de acessibilidade automatizados (axe) no CI.
