# ForgeBoard — Roadmap

> Produto: workspace pessoal local-first para projetos, tarefas e planejamento.
> Estado em 2026-09-05: Fase 2 concluída; `tsc`, `lint`, 72 testes unitários,
> 18 testes E2E (incl. axe) e `build` todos verdes. Sem backend, sem contas,
> sem sincronização (decisão intencional).

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
                            ├─► Fase 5 (dados/IndexedDB) ─┬─► Fase 4 (PWA/offline real)
                            │                             └─► Fase 6 (dashboard: histórico)
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

## Fase 3 — Calendário

**Objetivo:** planejar por data, sincronizado com o Kanban. Depende das Fases 1–2.

- [ ] Visões mensal, semanal e diária (componentes próprios, sem lib de calendário pesada
      salvo se justificado em ADR).
- [ ] Tarefas com prazo aparecem nos dias; tarefas sem prazo em faixa "sem data".
- [ ] Criar/editar tarefa a partir de um dia; arrastar tarefa entre dias altera `dueDate`.
- [ ] Mudança no calendário reflete no Kanban e vice-versa (mesmo store, sem sync manual).
- [ ] Datas em UTC date-only (`yyyy-mm-dd`) + render local; testes cobrindo virada de fuso.
- [ ] Testes E2E: definir prazo pelo calendário, arrastar entre dias, reload preserva.

**Concluída quando:** DoD + E2E de calendário verdes + ADR da decisão de datas/timezone.

## Fase 4 — PWA

**Objetivo:** instalável e utilizável offline. Depende da Fase 5 **para o offline de dados**
(manifest/SW podem andar em paralelo; o cache offline de dados exige IndexedDB).

- [ ] `manifest.webmanifest` (nome, cores, ícones 192/512 maskable, screenshots).
- [ ] Service worker: app-shell cache-first + versionamento; página de fallback offline.
- [ ] Ícones gerados e commitados em `public/icons/` (nada de CDN).
- [ ] Fluxo de atualização segura (prompt "nova versão disponível" → `skipWaiting`).
- [ ] Verificação manual: instalação no Windows (Chrome/Edge) e no Android (Chrome).
- [ ] Testes E2E: modo offline simulado carrega shell + dados.

**Concluída quando:** DoD + Lighthouse PWA ≥ 90 + checklist de instalação assinado.

## Fase 5 — Sistema de dados

**Objetivo:** camada de dados robusta e substituível. Depende da Fase 1; alimenta 4 e 6.

- [ ] Entidades: `Project`, `Task`, `Tag` (first-class, hoje é `string[]`), `Settings`,
      `UserPreferences` — tipos + validação por entidade.
- [ ] Migrar persistência para **IndexedDB** (biblioteca `idb` — pequena, madura, sem ORM
      pesado) atrás da interface `StorageProvider` existente; `localStorage` vira fallback
      de boot/migração, não caminho principal.
- [ ] Versionamento do formato + migrações (`v1 → v2…`), cada uma com teste.
- [ ] Migração automática `localStorage → IndexedDB` na primeira execução pós-update.
- [ ] Backup agendado (snapshot JSON com data) + restauração via UI (reaproveita validação
      + quarentena existentes).
- [ ] Camadas respeitadas: UI → Store → Service → Storage Adapter → IndexedDB
      (grep de verificação no CI futur;o hoje, checklist de PR).

**Concluída quando:** DoD + testes de migração v1→v2 + E2E de backup/restauração +
dado legado `localStorage` migrado sem perda (teste dedicado).

## Fase 6 — Dashboard

**Objetivo:** métricas úteis para uso diário, não enfeite. Depende de 2, 3 e 5.

- [ ] Concluídas/pendentes/atrasadas, progresso por projeto, tarefas por prioridade,
      projetos ativos, atividade recente (event log local — novo, pequeno).
- [ ] Produtividade ao longo do tempo (conclusões por dia/semana; exige histórico da Fase 5).
- [ ] Gráficos em SVG/CSS próprios; lib de charts só com ADR justificando peso.
- [ ] Cada métrica responde "que decisão ela ajuda a tomar" (documentado no PR).

**Concluída quando:** DoD + nenhuma métrica sem justificativa de uso documentada.

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
