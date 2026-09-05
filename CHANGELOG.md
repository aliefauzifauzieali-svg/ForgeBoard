# Changelog

Todas as mudanças notáveis do ForgeBoard serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased]

### Added

- PWA instalável: manifest (`manifest.json`, standalone, pt-BR, categorias),
  ícones 192/512/maskable gerados do SVG (`scripts/generate-icons.mjs`).
- Service worker via vite-plugin-pwa (`generateSW`, prompt): precache do shell,
  atualização somente com confirmação (toast) e aviso de modo offline.
- Indicador offline/online, botão de instalação (beforeinstallprompt) com
  boas-vindas pós-instalação e splash inicial com `prefers-reduced-motion`.
- Testes PWA (manifest, registro, offline, splash, fluxo de update com rebuild).

### Added

- Calendário global de prazos com visões mensal, semanal e diária, navegação
  entre períodos e botão Hoje.
- Criação de tarefa a partir de qualquer dia (data pré-preenchida) e edição
  clicando no cartão.
- Drag and drop entre dias para remarcar o prazo (com alternativa por teclado
  via modal de edição); sincronização automática com o Kanban (mesmo store).
- Tarefas sem prazo ficam de fora do calendário, com contador e atalho de volta.
- Disciplina date-only (`yyyy-mm-dd`, semana seg–dom, locale pt-BR) via date-fns:
  sem horas em lugar nenhum, à prova de timezone e DST.

### Added

- Paleta de comandos (`Ctrl/⌘+K`) com busca global em projetos, tarefas,
  descrições e tags (insensível a acentos), navegação por teclado e ações
  principais (criar, navegar, tema, exportar, desfazer/refazer, atalhos).
- Desfazer/refazer (`Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z`, `Ctrl+Y`) com histórico de
  30 instantâneos por sessão e botão Desfazer nos toasts de exclusão/importação.
- Sistema de toasts (sucesso/erro/info, auto-dispensa, com ação).
- Diálogo de atalhos de teclado (tecla `?`).
- Estado de carregamento na importação (botão desabilitado + spinner + `aria-busy`).
- Testes axe (crítico/sério) no dashboard, Kanban, modal e paleta.

### Changed

- Texto secundário escurecido (`zinc-500` → `zinc-600` no modo claro) para
  contraste AA; scans axe aguardam o fim das animações de entrada.

### Changed (Fase 1)

- Downloads JSON (exportação, backups, quarentena) centralizados em
  `src/services/download.ts` (`downloadJson` + `datedFilename`).
- Modais de projeto/tarefa inicializam o formulário no mount (remount por `key`
  no `App`), eliminando sincronização via efeito.
- `ErrorBoundary` não acessa mais `localStorage` diretamente: usa `readRawBoard` e
  `clearAllLocalData` da camada `storage/`.

## [1.0.0] - 2026-09-05

### Added

- Dashboard com estatísticas, projetos, tarefas atrasadas/recentes e lista filtrável.
- Projetos (criar, editar, excluir em cascata) com Kanban
  (Backlog / Em andamento / Concluído, drag-and-drop + botões de mover).
- Tarefas com título, descrição, prioridade, status, prazo opcional, tags e
  `previousStatus` (desmarcar conclusão restaura o fluxo anterior).
- Pesquisa, filtros (status, prioridade, só atrasadas) e ordenação.
- Persistência em `localStorage` com validação no boot, quarentena de dados
  inválidos, `ErrorBoundary` e aviso de falha de salvamento.
- Importação/exportação JSON com validação e confirmação antes de substituir.
- Tema claro/escuro/sistema persistido; atalhos `N`/`P`/`/`/`Esc`; região
  `aria-live`; modais com focus trap; `prefers-reduced-motion`.
- Responsivo: sidebar fixa no desktop, navegação inferior no mobile.
- Testes: 47 unitários (Vitest) + 9 E2E (Playwright); CI no GitHub Actions.
- Documentação: README, ROADMAP e este CHANGELOG.
