# Performance — ForgeBoard

Medido em 2026-09-05 com Lighthouse 12 sobre `vite preview` local
(Chromium do Playwright; `lh-desktop.json` = preset desktop).

## Lighthouse (build atual)

| Categoria      | Desktop | Mobile |
|----------------|---------|--------|
| Performance    | 100     | 100    |
| Acessibilidade | 98      | 98     |
| Best Practices | 100     | 100    |
| SEO            | 91      | 91     |

Métricas: FCP ~0,4s · LCP ~0,5s · TBT 0ms · CLS 0.

> PWA não aparece no relatório do Lighthouse aqui (instalabilidade é coberta
> pelo E2E próprio: manifest, registro/controle do SW, offline, splash e fluxo
> de update com rebuild — `e2e/pwa.spec.ts`).

## Orçamento

- JS: 373 KB brutos / **~109 KB gzip** (alvo Fase 8: folga confortável).
- CSS: ~40 KB (7,5 KB gzip). Precache SW: ~424 KB totais.
- Nenhuma fonte, script ou imagem externa: zero RTT de terceiros.

## Decisões

- **Sem code-splitting por rota**: o `date-fns` é compartilhado com o bundle
  principal via Dashboard (`services/stats.ts` → `services/calendar.ts`), e os
  componentes das visões somam poucos KB — o custo de Suspense/waterfalls
  superaria o ganho (~5%). Reavaliar se o JS gzip passar de 150 KB.
- **Sem lib de gráficos**: SVG próprio (~3 KB) em vez de ~100 KB de Chart.js.
- **`idb` (1 KB)** em vez de Dexie (~30 KB) para o KV simples.
- Debounce só onde há espera real (persistência de prefs); mutações de board
  escrevem direto (barato e transacional).
- Teste E2E de orçamento: FCP < 8s no build (`pwa.spec.ts`, "carregamento
  inicial"). Limite folgado de propósito — é rede de segurança contra
  regressões catastróficas, não gate de perf fina.
