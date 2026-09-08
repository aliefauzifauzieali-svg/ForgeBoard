# Changelog

Todas as mudanças notáveis do ForgeBoard serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased]

### Added

- Seção Manutenção nas Configurações: "Reinstalar o app" (desktop, com
  progresso e confirmação) e "Restaurar padrão" (todos, apaga dados locais
  com confirmação e aviso).
- Drag-and-drop universal por Pointer Events no Kanban: caminho único para
  mouse e toque, com fantasma do cartão, coluna alvo por geometria,
  autoscroll e Esc para cancelar (substitui HTML5 DnD + hook de toque).
- Overlay de captura durante o arrasto (`touch-action: none`, sem seleção
  nem menu do sistema, trava de scroll): firewall contra o sequestro de
  gestos no WebView Android.

- Kanban por toque: segurar o cartão (~450ms) inicia o arrasto entre colunas,
  com destaque da coluna de destino, autoscroll nas bordas e Esc para
  cancelar; botões Mover de cada cartão seguem como alternativa.
- Interruptor animado (`Switch`, pino com spring) nas opções de atalhos e
  notificações das Configurações.
- Anel de progresso no widget Modo Foco com tempo tabular grande e controle
  segmentado de modo (Foco/Pausa).
- Entradas padrão `pop-in` (modais/paleta) e `toast-in` (notificações).

### Changed (visual, sem mudança de comportamento)

- Retrabalho dark estilo Linear: fundo `#0E0E11` com gradiente radial no
  topo; superfícies `#151519`/`#1A1A1E` com bordas brancas translúcidas;
  sombras pretas com blur maior; títulos de página em semibold.
- Sidebar com item ativo em pill `white/6` (ícone indigo, sem barra
  lateral); navegação mobile com item ativo em pílula clara e ícone escuro.
- Kanban dark: cards `#1A1A1E` com hover de borda indigo, colunas quase
  fundidas ao fundo, prioridades em pills neutras com ícone colorido.
- Dashboard: números `text-4xl` com sparkline indigo, gráfico de barras com
  gradiente, linhas de tarefa sutis (`white/5`); Modo Foco com timer
  `text-6xl` e botão START em pill com glow; modais `#1A1A1E` com overlay
  `black/60`; botões com raio 8px e clareamento no hover.
- Fundação motion: easing spring (`cubic-bezier(0.16, 1, 0.3, 1)`), entradas
  com fill `backwards` (hovers com translate voltam a funcionar após a
  entrada) e transições explícitas (sem `transition: all`).
- Dashboard: `StatCard` com elevação no hover, gráficos na cor de destaque e
  linhas com hover sutil; Kanban com transições explícitas e drop suave.
- Calendário: troca de período com fade + slide; chips com faixa lateral de
  prioridade e hover com elevação.
- Sidebar com hover deslizante nos itens; navegação mobile vira pill
  flutuante com indicador de ativo; inputs com glow de foco na cor de
  destaque; botões de tema/destaque com microinterações.

### Removed

- Updater antigo só-de-interface no desktop (`frontend_check` /
  `frontend_apply` e comandos Rust): atualização agora é só via instalador
  oficial (plugin `tauri-plugin-updater`); Sobre mostra só a versão
  instalada.

### Fixed

- Toggle das Configurações: pino proporcional (`translate-x-full`, sem px
  fixo) — alinhado em qualquer fonte-raiz/zoom, sem overflow.
- Layout das Configurações: status de permissão em bloco de aviso âmbar com
  botão "Permitir notificações"; seção Sobre sempre acessível via scroll.
- Auto-update desktop instala o binário: Configurações > Sobre oferece
  "Baixar e instalar o app" quando o executável está atrás do `latest.json`
  (plugin oficial, com progresso).
- Drag-and-drop no app desktop (Windows): `dragDropEnabled: false` na
  janela principal — o handler de file-drop do Tauri revogava o IDropTarget
  nativo do WebView2 e a página nunca recebia `dragover`/`drop` (a doc
  oficial exige `false` p/ HTML5 DnD no Windows). Sem impacto no app: nenhum
  listener de `tauri://drag-drop` (import é via `<input type=file>`).
- Drop por toque no Kanban: a coluna de destino é resolvida antes de
  remover o marcador do card arrastado (solturas rápidas não caem mais na
  coluna de origem).
- Arrasto por toque no Android: cards com seleção/callout desativados e
  `touch-action: pan-y` (o menu do sistema no toque longo matava o gesto
  com `pointercancel`); menu de contexto suprimido durante o arrasto.
- Teste E2E (Pixel 7) do arrasto por toque: long-press move a tarefa de
  coluna; toque rápido com movimento não inicia arrasto.

### Fixed

- Contraste da dica de kanban vazio (`text-zinc-600` sobre fundo `zinc-50`).
- Overflow horizontal em 375px: etiquetas com truncate e `min-w-0` em
  cartões/listas do Dashboard e Kanban (calendário largo segue em scroll
  próprio, intencional).

- Update desktop não é mais apagado ao reabrir o app (seed só quando falta;
  nunca sobrescreve pasta válida); respostas do protocolo com `no-store`;
  Sobre mostra versão da interface + bundle.
- Android lê o manifesto mesmo com content-type não-JSON (octet-stream).

### Added

- Modo Foco (Pomodoro 25/5) no Dashboard: iniciar/pausar/reiniciar, troca
  de modo, contagem de ciclos, estado em localStorage e notificação
  (toast + sistema) ao fim de cada ciclo.
- Busca fuzzy na paleta: tolera erros de digitação (Levenshtein com teto
  por tamanho do token, com penalidade no ranking).
- Notas rápidas no Dashboard: textarea com salvamento automático
  (IndexedDB, `kv.quickNotes`, teto de 5000 caracteres).
- Cor de destaque customizável (6 opções) em Configurações > Aparência,
  salva em localStorage e aplicada via variáveis CSS.
- Gráficos do Dashboard (barras de conclusões + donut de prioridades) já
  existiam como SVG próprio acessível/responsivo: sem `recharts`
  (dependência pesada desnecessária).

- Empacotamento Desktop com **Tauri v2** (`src-tauri/`, id `com.forgeboard.app`,
  janela 1200×800): `npm run tauri:dev` / `npm run tauri:build` geram
  instaladores para Windows, Linux e macOS a partir do mesmo `dist/`.
- Empacotamento Android com **Capacitor** (`capacitor.config.ts`, `android/`,
  id `com.forgeboard.app`): `npm run android:sync/open/build`; ícones
  adaptativos e splash com a identidade ForgeBoard; offline via assets
  empacotados, IndexedDB persistente.
- Tarefas recorrentes (diária, semanal, mensal, personalizada com intervalo):
  ao concluir, a próxima ocorrência é criada automaticamente; indicador de
  repetição nos cartões e edição/remoção no modal da tarefa.
- Subtarefas (título + checkbox) com editor no modal (adicionar, renomear,
  concluir, excluir, reordenar) e progresso compacto (`2/4`) no Kanban.
- Exportação em CSV (RFC 4180, com BOM) e Markdown, com seletor de formato
  na sidebar; JSON mantido como padrão.
- Importação de tarefas via CSV (colunas título, descrição, status,
  prioridade, prazo, tags, projeto opcional), com validação por linha,
  criação de etiquetas e feedback de sucesso/erros.
- Notificações locais de prazo (Web Notifications + toast), opcionais, com
  antecedência configurável (1/2/3/7 dias) nas Configurações.
- Busca global: filtro por `#etiqueta`, ranking por prioridade e prazo, e
  destaque dos termos nos resultados da paleta.
- Criação rápida com prazo: clique no número do dia no calendário abre nova
  tarefa com a data; atalho `T` cria tarefa com o prazo de hoje.
- Formato de dados v3 (migração automática v1/v2 → v3: `recurrence`,
  `subtasks` com padrões).

### Changed (visual, sem mudança de comportamento)

- Microinterações: botões com escala no `active`, inputs com transição de borda,
  hover com elevação nos cards de estatística, cursor de arrasto nos cartões.
- Entrada escalonada (`stagger`) em listas e grades; fade na troca de mês/semana
  do calendário; destaque com sombra na coluna de drop do Kanban.
- Indicador lateral no item ativo da sidebar; screenshots do README atualizadas.
- Saída animada (160ms) em modais e paleta via `useDelayedUnmount` (fecha na
  hora, desmonta depois); formulários remontam por `key` interno no
  `TaskForm`/`ProjectForm`.
- Transição suave de tema claro↔escuro (`body` + `.card`); glow no hover do
  `.btn-primary`; riscado animado ao concluir tarefa (`.strike`); skeleton
  com brilho deslizante (`.skeleton`); fade a cada troca de visão.
- Tudo em CSS/Tailwind, coberto pelo `prefers-reduced-motion` global existente.

### Added

- Screenshots reais em `docs/screenshots/` (geradas por
  `scripts/capture-screenshots.mjs`) e documentadas no README.
- `docs/deploy.md` (CSP de produção com hash, headers, offline) e
  `docs/performance.md` (Lighthouse, orçamento, decisões).
- Teste E2E de CSP restritiva e teste E2E de orçamento de FCP (< 8s).
- Testes de branches dos stores (seed, reset, deletes inexistentes, undo de restore).

### Fixed

- Ações de projeto/tarefa sempre visíveis no touch (`max-sm:opacity-100`).

### Fixed

- `exportBoardNow` agora recebe dados por parâmetro (remove inversão
  serviço→store); chamadas atualizadas na sidebar e na paleta.
- Conexão IndexedDB fecha ao ceder upgrade para outra aba (`blocking`).
- Boot avisa com toast em vez de subir vazio quando o storage falha.
- Guarda `matchMedia` no efeito de tema (ambientes sem a API, ex.: jsdom/SSR).

### Added

- Testes: `utils/date`, `utils/core`, theme store, filtros do UI store, prefs,
  `exportBoardNow`, boot resiliente, atalhos por teclado (integração com App),
  E2E de import inválido, axe mobile/dark/atalhos/confirmação/estatísticas.
- Helper `expectNoSeriousViolations` centralizado em `e2e/helpers.ts`.

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
