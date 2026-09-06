# Validação Beta — ForgeBoard

> Fase 9. Nada aqui é inventado: cada status AUTOMATED foi executado pelo
> agente; itens MANUAL aguardam o usuário. Última atualização: 2026-09-05.

## 1. Objetivo

Preparar e validar o ForgeBoard como produto beta real: estabilidade,
confiabilidade dos dados, UX, acessibilidade, performance e compatibilidade —
antes de qualquer funcionalidade nova.

## 2. Ambientes efetivamente testados

| Ambiente | Como | Status |
|---|---|---|
| Chromium desktop 1280px (dev) | Playwright, 40+ testes | AUTOMATED ✅ |
| Chromium build produção (preview) | Playwright, 6 testes PWA | AUTOMATED ✅ |
| Viewport mobile 390px (Pixel 7 emulado) | Playwright | AUTOMATED ✅ |
| Tema escuro | Playwright (`localStorage` + reload) | AUTOMATED ✅ |
| Offline (rede cortada) | Playwright `setOffline` | AUTOMATED ✅ |
| Windows físico / Android físico / iOS / Safari / Firefox | — | MANUAL ⏳ |
| Instalação PWA real (prompt do navegador) | — | MANUAL ⏳ |
| Leitor de tela real (NVDA/VoiceOver) | — | MANUAL ⏝ (axe cobre regras) |

## 3. Matriz de validação

Legenda: ✅ AUTOMATED (executado) · ⏳ MANUAL (aguarda usuário) · ❌ falha aberta.

### 3.1 Dados

| Item | Status | Evidência |
|---|---|---|
| criar/editar/excluir projeto | ✅ | `projects.spec`, `tasks.spec` |
| restaurar (undo) | ✅ | `palette.spec` (toast Desfazer) |
| criar/editar/excluir/duplicar tarefa | ✅ | `tasks.spec` |
| alterar status/prioridade/prazo/tags | ✅ | `tasks.spec`, `calendar.spec`, `tags.spec` |
| persistência após reload | ✅ | `persistence.spec` (+ waits de durabilidade) |
| persistência após fechar/reabrir | ✅ | `persistence.spec` (reload limpo) |
| importação v1/v2/inválida | ✅ | `data.spec`, `importExport.test` |
| exportação v2 | ✅ | `data.spec` (download lido e validado) |
| backup manual + restauração | ✅ | `data.spec`, `boardIntegration.test` |
| dados inválidos → quarentena | ✅ | `persistence.spec` (+ banner) |
| reset de dados | ✅ | `resetBoard` em todos os specs |
| multi-abas simultâneas | ✅ | probe §5 (leitura compartilhada; sem sync ao vivo — documentado) |
| reload durante escrita | ✅ | waits de durabilidade; flush no `pagehide` |
| storage cheio/quebrado | ✅ | `saveError` + banner (unit com falha injetada) |

### 3.2 Navegação

| Item | Status | Evidência |
|---|---|---|
| Dashboard/projetos/Kanban/calendário/estatísticas | ✅ | specs dedicados |
| busca, paleta, atalhos, modais, drawers | ✅ | `palette.spec`, `keyboard.spec`, modais em specs |
| navegação só-teclado fim a fim | ✅ | `keyboard.spec.ts` (Fase 9) |

### 3.3 UX

| Item | Status | Evidência |
|---|---|---|
| empty/loading/error states | ✅ | `EmptyState` em 4 visões; spinner na importação; splash |
| confirmações destrutivas | ✅ | `ConfirmDialog` em 6 fluxos |
| undo + toasts + feedback | ✅ | undo 30 níveis; toasts com ação |
| responsivo desktop/tablet/mobile, touch | ✅ | `responsive.spec`, `a11y-mobile.spec`, botões 44px+ |

### 3.4 PWA / offline

| Item | Status | Evidência |
|---|---|---|
| manifest, registro, controle do SW | ✅ | `pwa.spec` |
| offline (carga + CRUD + reload offline) | ✅ | `pwa.spec` (reload offline com banner) |
| update com confirmação | ✅ | `pwa.spec` (rebuild real) |
| instalação real / prompt do navegador | ⏳ | MANUAL — headless não sintetiza `beforeinstallprompt` |
| comportamento sem SW/IDB (navegador antigo) | ⏳ | MANUAL — app degrada (banners), sem matriz de browsers legados |

### 3.5 Acessibilidade

| Item | Status | Evidência |
|---|---|---|
| axe crítico/sério: 9 páginas/estados | ✅ | `a11y.spec` (6) + `a11y-mobile.spec` (2) + diálogos |
| teclado completo (fluxo só-teclado) | ✅ | `keyboard.spec.ts` (Fase 9) |
| foco visível, labels, dialogs, contraste | ✅ | axe + `:focus-visible` global + zinc-600 |
| `prefers-reduced-motion` | ✅ | `a11y-reduced-motion.spec.ts` (Fase 9) |
| leitor de tela real | ⏳ | MANUAL — axe não substitui NVDA/VoiceOver |

### 3.6 Robustez

| Item | Status | Evidência |
|---|---|---|
| JSON malformado/versão futura/schema inválido | ✅ | unit + E2E |
| migração v1→v2 idempotente | ✅ | fixture real + E2E (todo seed exercita) |
| retenção 90 dias poda corretamente | ✅ | `activity.test` (datas reais) |
| backfill idempotente (flag) | ✅ | `boardIntegration.test` |
| writes concorrentes (geração anti-stale) | ✅ | unit `store.test` (mock de falha) |
| quota excedida | ✅ | `saveError` (unit); E2E real impraticável — documentado |

## 4. Checklist de uso real (para o usuário, no dia a dia)

- [ ] Criar 2–3 projetos reais com descrições e cores.
- [ ] Criar 10+ tarefas reais com prazos, prioridades e etiquetas.
- [ ] Mover tarefas no Kanban diariamente por uma semana.
- [ ] Usar o calendário para planejar a semana (arrastar prazos).
- [ ] Abrir Estatísticas após alguns dias e conferir throughput/tabela.
- [ ] Usar `Ctrl+K` em vez do mouse por um dia.
- [ ] Usar undo (`Ctrl+Z`) após uma exclusão real.
- [ ] Exportar JSON e guardar como backup externo.
- [ ] Recarregar no meio de uma edição (rascunho não é salvo — comportamento esperado?).
- [ ] Ficar offline 1h (Wi-Fi off) e continuar trabalhando.
- [ ] Instalar como PWA no Windows e no Android.
- [ ] Usar no celular por um dia (touch, bottom-nav).
- [ ] Testar com leitor de tela (NVDA ou VoiceOver) nas 3 visões principais.

## 5. Probes executados pelo agente (resultados reais)

| Probe | Resultado |
|---|---|
| Multi-abas (2 páginas, mesmo contexto): criar na aba A → reload na aba B | ✅ B enxerga os dados (storage compartilhado; sem sync ao vivo — edição simultânea = last-writer-wins, documentado como limitação) |
| Volume (500 tarefas via seed v1): boot com migração + render + filtro | ✅ boot 200ms, filtro 61ms (`e2e/perf.spec.ts` permanente) |
| `prefers-reduced-motion`: animações zeradas | ✅ E2E dedicado (`e2e/a11y-reduced-motion.spec.ts`) |
| Seed v1 sem campo `tags` | ✅ Quarentena atuou corretamente (validação estrita); seed corrigido no teste |

## 6. Problemas encontrados

| # | Categoria | Severidade | Descrição | Reprodução | Status |
|---|---|---|---|---|---|
| 1 | UX | Baixa | Seed E2E inválido ia para quarentena em vez de migrar (campo `tags` ausente) — comportamento do app correto; erro era do seed | `e2e/perf.spec.ts` inicial | Corrigido no teste ✅ |
| 2 | TECH DEBT | Baixa | `expectNoSeriousViolations` duplicado em 2 specs | grep | Corrigido: centralizado em `helpers.ts` ✅ |
| 3 | COMPATIBILITY | Média | Sem sync ao vivo entre abas (last-writer-wins) | probe §5 | Documentado como limitação; sync realtime é pós-roadmap — NÃO corrigir aqui |

## 7. Triagem de features (NÃO implementar na Fase 9)

| Item | Motivo | Prioridade | Decisão |
|---|---|---|---|
| Backend / auth / sync / colaboração | pós-roadmap declarado | — | Adiado |
| Recorrência de tarefas | aparece em uso real | Média | Adiado (pós-beta) |
| Exportação CSV/Markdown | já listado no README | Baixa | Adiado |
| Subtarefas/comentários/anexos | já listado no README | Média | Adiado |
| Sincronização multi-abas ao vivo (`storage` events) | probe §5 mostra last-writer-wins | Média | Adiado — documentado como limitação |
| Paginação da consulta de eventos (teto 2000) | volume futuro | Baixa | Adiado — limite atual folgado para uso pessoal |
| Rascunho de edição sobrevivendo a reload | checklist §4 levanta a questão | Baixa | Adiado — comportamento atual (sem rascunho) é consistente |

## 8. Itens MANUAL pendentes (aguardando usuário)

1. Instalação PWA real no Windows e no Android.
2. Uso offline prolongado e uso mobile por um dia.
3. Leitor de tela real (NVDA/VoiceOver).
4. Checklist de uso real (§4) durante 1–2 semanas.
5. Navegadores além do Chromium (Firefox, Safari, desktop e mobile).

## 9. Decisões

- Nenhuma funcionalidade nova nesta fase; só correções reproduzíveis.
- Seeds dos testes E2E exercitam a migração v1→v2 a cada run (cobertura contínua).
- Cobertura como rede, não meta: sem testes artificiais.
