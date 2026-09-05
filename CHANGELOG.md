# Changelog

Todas as mudanças notáveis do ForgeBoard serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased]

### Changed

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
