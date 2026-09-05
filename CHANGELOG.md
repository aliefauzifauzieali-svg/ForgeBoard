# Changelog

Todas as mudanças notáveis do ForgeBoard serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [1.0.0] - 2026-09-05

Primeira release oficial — workspace pessoal local-first completo: projetos,
Kanban, calendário, estatísticas, PWA instalável e dados versionados.

### Added

**Projetos, tarefas e Kanban**
- Dashboard com estatísticas, projetos, tarefas atrasadas/recentes e lista com
  pesquisa, filtros (status, prioridade, só atrasadas) e ordenação.
- Projetos (criar, editar, excluir em cascata; nome, descrição, cor) com quadro
  Kanban (Backlog / Em andamento / Concluído, drag-and-drop + botões de mover).
- Tarefas (título, descrição, prioridade, status, prazo opcional, etiquetas,
  `previousStatus`, `completedAt`); criar, editar, excluir e duplicar.

**Calendário**
- Visões mensal, semanal e diária com navegação entre períodos e botão Hoje.
- Criação a partir de qualquer dia (data pré-preenchida) e edição pelo cartão.
- Drag and drop entre dias para remarcar o prazo (alternativa por teclado no modal).
- Sincronização automática com o Kanban (mesmo store, dois sentidos).
- Disciplina date-only (`yyyy-mm-dd`, semana seg–dom, locale pt-BR) via date-fns:
  sem horas em lugar nenhum, à prova de timezone e DST.

**Estatísticas e atividade**
- Log de atividades append-only no IndexedDB (12 tipos de evento, índices por
  tempo/projeto/tipo/entidade, retenção de 90 dias, backfill de conclusões legadas).
- Página de Estatísticas: resumo numérico, filtros (projeto, etiqueta, período
  7/30/90/personalizado), throughput com barras clicáveis, evolução acumulada por
  projeto e tabela de atividades recentes.
- Dashboard com conclusões por dia, rosca por prioridade, lead time médio e taxa
  de conclusão (gráficos SVG próprios, sem biblioteca).

**Etiquetas, preferências e dados**
- Etiquetas de primeira classe (id, nome, cor): CRUD em Configurações,
  autocomplete no modal, chips coloridos, renomear/excluir com cascata.
- Preferências separadas (tema, atalhos, última visão restaurada no boot).
- Persistência em IndexedDB (`idb`) com boot assíncrono, flush ao ocultar a aba
  e espelho síncrono do tema (sem flash).
- Migrações versionadas (`v1 → v2`, idempotentes, com fixture real) e quarentena
  com baixar cópia, restaurar backup ou recomeçar.
- Backups automáticos (a cada 10 alterações + diário, retém 5) e manuais, com
  restauração confirmada; exportação/importação JSON versionada (v1 migra).

**PWA e experiência**
- PWA instalável: manifest (`manifest.json`, standalone, pt-BR, categorias),
  ícones 192/512/maskable gerados do SVG (`scripts/generate-icons.mjs`).
- Service worker via vite-plugin-pwa (`generateSW`, prompt): precache do shell,
  atualização somente com confirmação (toast) e aviso de modo offline.
- Indicador offline/online, botão de instalação (`beforeinstallprompt`) com
  boas-vindas pós-instalação e splash inicial com `prefers-reduced-motion`.
- Paleta de comandos (`Ctrl/⌘+K`) com busca global (projetos, tarefas,
  descrições, etiquetas; insensível a acentos) e ações principais.
- Desfazer/refazer (`Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z`, `Ctrl+Y`, 30 níveis) com botão
  Desfazer nos toasts; sistema de toasts; diálogo de atalhos (`?`); loading na
  importação; tema claro/escuro/sistema; responsivo completo; acessibilidade
  (focus trap, live regions, sem depender só de cor, axe limpo).

**Qualidade e docs**
- 121 testes Vitest + 40 E2E Playwright (+5 PWA com rebuild); `tsc`, lint e build
  verdes; CI no GitHub Actions (typecheck → lint → testes → build → E2E).
- Documentação: README, ROADMAP (fases 0–6) e este CHANGELOG.

### Changed

- Texto secundário escurecido (`zinc-500` → `zinc-600` no modo claro) para
  contraste AA; scans axe aguardam o fim das animações de entrada.
