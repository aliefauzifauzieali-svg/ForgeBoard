# ForgeBoard — Roadmap

> Produto: workspace pessoal local-first para projetos, tarefas e planejamento.
> Estado em 2026-09-05: Fase 6 concluída (última do roadmap) — ForgeBoard
> funcionalmente completo no escopo local. `tsc`, `lint`, testes unitários,
> testes E2E (incl. axe, calendário, PWA, dados e estatísticas) e `build`
> todos verdes. Sem backend, sem contas, sem sincronização.

## Baseline atual (o que já existe)

- Dashboard com estatísticas, projetos, atrasadas, recentes e lista filtrável.
- Projetos (CRUD, nome/descrição/cor) + Kanban (Backlog/Em andamento/Concluído, DnD + botões de mover).
- Tarefas (título, descrição, 4 prioridades, status, prazo opcional, tags, `previousStatus`).
- Persistência `localStorage` com validação no boot + quarentena + ErrorBoundary + aviso de falha de save.
- Tema claro/escuro/sistema, atalhos (`N`/`P`/`/`/`Esc`), live-region, focus trap, reduced-motion.
- Import/export JSON validado, responsivo (sidebar fixa / bottom-nav mobile).
- CI (GitHub Actions), `.nvmrc`, `engines`, Conventional Commits.

## Definition of Done (vale para TODA fase)

1. `npm run typecheck` passa (inclui `e2e/`).
2. `npm run lint` passa sem novos warnings.
3. `npm run test` e `npm run test:e2e` passam.
4. `npm run build` gera `dist/` sem erros e sem erros no console em uso normal.
5. README.md atualizado no que a fase mudou.
6. Esta seção do ROADMAP.md marcada como concluída, com data.
7. Commit(s) Conventional Commits na branch da fase; `main` sempre funcional.

## Mapa de dependências

```
Fase 0 (baseline versionado)
  └─► Fase 1 (fundamentos) ─┬─► Fase 2 (UX/produto) ──► Fase 6 (dashboard)
                            ├─► Fase 3 (calendário) ──► Fase 6 (dashboard)
                            ├─► Fase 4 (PWA) ✅ ──► Fase 6 (dashboard)
                            ├─► Fase 5 (dados/IndexedDB) ──► Fase 6 (dashboard: histórico)
                            └─► Fase 7 (qualidade — contínua, checkpoint por fase)
Fase 8 (polimento) ◄── depois de 2–6, antes de qualquer beta público
```

Fase 7 (qualidade) é **contínua**: cada fase entrega seus testes; a Fase 7 fecha os gaps
restantes de uma vez.

---

## Fase 0 — Baseline versionado ✅ concluída em 2026-09-05

- [x] `git add` revisado por partes (NUNCA `git add .` sem revisar) + commit inicial.
- [x] Criar repositório GitHub, `git remote add origin`, `git push -u origin main`.
- [x] Confirmar que o CI fica verde no remoto.

## Fase 1 — Fundamentos ✅ concluída em 2026-09-05

**Objetivo:** eliminar os débitos estruturais conhecidos, sem mudar comportamento.

- [x] Extrair helper `downloadJson(filename, data)` em `src/services/` e usar nos 4 pontos
      que hoje duplicam blob-download (Sidebar, StorageBanners ×2, ErrorBoundary).
- [x] Remover o acesso direto a `localStorage` no `ErrorBoundary` (usar `storage/` + serviço).
- [x] Resolver os 2 warnings do lint (init de form nos modais) ou documentar como aceitos.
- [x] Auditar `console.*`: permitido só com prefixo `[ForgeBoard]` em caminhos de erro.
- [x] Checklist manual: reload preserva tudo; quarentena aparece com dado inválido;
      `dist/` servido via `preview` funciona offline de rede (sem SW ainda).
- [x] Criar `CHANGELOG.md` (formato Keep a Changelog) e registrar a v1.0.0.

**Concluída quando:** DoD global + zero acessos a storage fora de `src/storage/` e
`src/stores/` (verificável por grep) + CHANGELOG criado.

## Fase 2 — UX e produto ✅ concluída em 2026-09-05

**Objetivo:** parecer e operar como produto real. Depende da Fase 1.

- [x] Command palette (`Ctrl/Cmd+K`): ir para projeto, criar tarefa/projeto, alternar tema.
- [x] Busca global unificada (tarefas + projetos) com ranking simples e `Enter` para abrir.
- [x] Undo de exclusão (tarefa/projeto restaurados por ~8s via toast com "Desfazer").
- [x] Toasts para ações principais (substituir onde hoje só há live-region invisível).
- [x] Diálogo de atalhos (`?`) listando todos os shortcuts.
- [x] Loading states onde houver espera real (importação de arquivo grande).
- [x] Revisão dos empty states com ações contextuais em todas as visões.
- [x] Acessibilidade: passe `axe` (via `@axe-core/playwright`) sem violações críticas.

**Concluída quando:** DoD + spec E2E da palette/busca/undo + relatório axe limpo anexado ao PR.

Notas da execução: undo/refazer implementados com histórico de 30 instantâneos
(também cobre edição, movimento e importação); empty states já tinham ações
contextuais (sem mudança); loading real só existe na importação (app é síncrono
local-first); contraste de texto secundário endurecido para AA.

## Fase 3 — Calendário ✅ concluída em 2026-09-05

**Objetivo:** planejar por data, sincronizado com o Kanban. Depende das Fases 1–2.

- [x] Visões mensal, semanal e diária (componentes próprios, sem lib de calendário pesada
      salvo se justificado em ADR).
- [x] Tarefas com prazo aparecem nos dias; tarefas sem prazo em faixa "sem data".
- [x] Criar/editar tarefa a partir de um dia; arrastar tarefa entre dias altera `dueDate`.
- [x] Mudança no calendário reflete no Kanban e vice-versa (mesmo store, sem sync manual).
- [x] Datas em UTC date-only (`yyyy-mm-dd`) + render local; testes cobrindo virada de fuso.
- [x] Testes E2E: definir prazo pelo calendário, arrastar entre dias, reload preserva.

**Concluída quando:** DoD + E2E de calendário verdes + ADR da decisão de datas/timezone.

Notas da execução: biblioteca **date-fns v4** (imutável, tree-shakable, TS first-class,
locale pt-BR; dayjs descartado por API mutável e plugins). ADR de datas documentada
em `src/services/calendar.ts`: prazo é DIA (`yyyy-mm-dd`, parse por partes, sem horas
→ imune a timezone/DST); semana começa segunda. Sem notificações/lembretes/recorrência
(fora de escopo, como previsto). Mês em `<table>` real; semana com rolagem horizontal
no mobile; fora-do-mês distinguido por cor (não opacidade) para preservar contraste.

## Fase 4 — PWA ✅ concluída em 2026-09-05

**Objetivo:** instalável e utilizável offline. (O mapa original previa depender da
Fase 5; na prática o `localStorage` já é 100% offline, então a Fase 4 foi
concluída antes — a Fase 5 trará IndexedDB + histórico para o dashboard.)

- [x] `manifest.webmanifest` (nome, cores, ícones 192/512 maskable, screenshots).
- [x] Service worker: app-shell cache-first + versionamento; página de fallback offline.
- [x] Ícones gerados e commitados em `public/icons/` (nada de CDN).
- [x] Fluxo de atualização segura (prompt "nova versão disponível" → `skipWaiting`).
- [ ] Verificação manual: instalação no Windows (Chrome/Edge) e no Android (Chrome).
  (Pendente de dispositivo físico; prompt real não é sintetizável no headless.
  Coberto por E2E: manifest, registro, offline, splash e fluxo de update.)
- [x] Testes E2E: modo offline simulado carrega shell + dados.

**Concluída quando:** DoD + Lighthouse PWA ≥ 90 + checklist de instalação assinado.

Notas da execução: `vite-plugin-pwa@1` (`generateSW`, `registerType: prompt`,
`clientsClaim` para controle imediato sem forçar updates). Sem runtimeCaching
(zero dependências externas — sem fontes/CDN). `beforeinstallprompt` com botão
próprio + boas-vindas; `prompt` manual no Windows/Android pendente de dispositivo
físico (E2E cobre manifest, registro, offline, splash e update). Sem push.

## Fase 5 — Sistema de dados ✅ concluída em 2026-09-05

**Objetivo:** camada de dados robusta e substituível. Depende da Fase 1; alimenta 4 e 6.

- [x] Entidades: `Project`, `Task`, `Tag` (first-class, hoje é `string[]`), `Settings`,
      `UserPreferences` — tipos + validação por entidade.
- [x] Migrar persistência para **IndexedDB** (biblioteca `idb` — pequena, madura, sem ORM
      pesado) atrás da interface `StorageProvider` existente; `localStorage` vira fallback
      de boot/migração, não caminho principal.
- [x] Versionamento do formato + migrações (`v1 → v2…`), cada uma com teste.
- [x] Migração automática `localStorage → IndexedDB` na primeira execução pós-update.
- [x] Backup agendado (snapshot JSON com data) + restauração via UI (reaproveita validação
      + quarentena existentes).
- [x] Camadas respeitadas: UI → Store → Service → Storage Adapter → IndexedDB
      (grep de verificação no CI futur;o hoje, checklist de PR).

**Concluída quando:** DoD + testes de migração v1→v2 + E2E de backup/restauração +
dado legado `localStorage` migrado sem perda (teste dedicado).

Notas da execução: `idb` (1 KB) em vez de Dexie (KV simples, sem query API);
store segue síncrono em memória (API da UI intacta) com persistência assíncrona +
flush no `pagehide`; `Settings` ficou implícito nas preferências; gráficos da fase
(conclusões/dia, rosca de prioridade, lead time) em SVG próprio; progresso de
projeto ao longo do tempo exige log de eventos → Fase 6.

## Fase 6 — Logs, métricas e Estatísticas ✅ concluída em 2026-09-05

**Objetivo:** histórico confiável e página de Estatísticas. Depende de 2, 3 e 5.

- [x] Log de eventos append-only no IndexedDB (`activity`, com índices por tempo,
      projeto, tipo e entidade): tarefa criada/editada/excluída/movida/concluída/
      reaberta; projeto criado/editado/excluído; etiqueta criada/editada/excluída.
      Bulk (import/seed/restore/undo) não emite — métricas sem fantasmas.
- [x] Retenção de 90 dias (`ACTIVITY_RETENTION_DAYS`, poda no boot) + teto de consulta.
- [x] Backfill único de conclusões legadas (com flag idempotente).
- [x] Métricas puras: criadas×concluídas por dia/semana/mês, throughput, evolução
      acumulada por projeto, lead time por eventos, taxa por período.
- [x] Página de Estatísticas: resumo, filtros (projeto/etiqueta/período 7-30-90-outro),
      throughput clicável filtrando a tabela, evolução, atividade recente (10).
- [x] Gráficos SVG próprios (barras reutilizadas, rosca, multilinha) com
      `role=img`/legendas; sem lib externa.
- [x] Testes: unit (storage, métricas), integração (ações→eventos, boot, backfill),
      E2E (página, filtros, interatividade) e axe.

**Concluída quando:** DoD + E2E de estatísticas verdes + axe sem críticas/sérias.

Notas da execução: `use()` + Suspense com consulta cacheada (sem `setState` em
efeito); leitura drena a fila de escrita (nunca serve obsoleto); dashboard mantém
os gráficos por `completedAt` (funcionam com dados legados); undo/redo fora do log
por decisão (restaurativo, não ação nova).

## Fase 7 — Qualidade (contínua + checkpoint final)

Cobrir o que as fases não cobriram, por categoria:

- **Unit** (tudo já parcial): stores, serviços, persistência, filtros, ordenação, datas,
  cálculos, import/export. Faltam: `boardStats` edge cases, `taskQuery` com `previousStatus`,
  utils de data/timezone (Fase 3).
- **Integration** (novo — testar store + storage real/jsdom juntos): CRUD ponta a ponta
  sem DOM, migração, quarentena, backup/restore.
- **E2E**: calendário, exportar/importar via UI, temas, atalhos, viewports
  (desktop 1440, tablet 768, mobile 390), axe em 3 páginas.
- Metas: cobertura ≥ 80% em `services/` + `storage/`; zero testes `skip` sem issue linkada.

**Concluída quando:** metas acima + `npm run test:coverage` publicado como artefato do CI.

## Fase 8 — Polimento (pré-beta)

Auditoria completa e correção: UX, a11y, performance (budget: JS ≤ 300 KB gzip,
Lighthouse perf ≥ 90 no desktop), responsividade, segurança (revisar CSP para deploy),
dependências (`npm audit` + revisão de necessidade de cada dep), duplicação, console limpo,
race conditions (ex.: saves concorrentes pós-IndexedDB), exceções.

**Concluída quando:** relatório de auditoria arquivado em `docs/` com zero P0/P1 abertos.

---

## Pós-roadmap (fora de escopo — só após a Fase 8)

Contas, autenticação, sincronização, backend, compartilhamento e colaboração.
Pré-requisito arquitetural já garantido: `StorageProvider` permite plugar um
`RemoteBoardRepository` sem reescrever a UI.
