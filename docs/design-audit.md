# Auditoria visual — Fase 16 retrabalho (refs × estado atual)

Data: 2026-09-07. Método: leitura das 14 referências (`ref/`) + screenshots
atuais do app (1920px e 375px, dark e light — ver §6). Nenhum código foi
alterado antes desta auditoria.

> Escopo: somente **dark mode** muda. Light mode permanece intacto
> (todas as mudanças usam variantes `dark:` ou overrides `.dark`).

## 1. O que as referências mostram

- **Linear (10 telas)**: fundo quase-preto `#0E0E11`; superfícies `#1A1A1E`
  sem painel duplo (colunas do board são só cabeçalho + cards sobre o fundo);
  bordas `rgba(255,255,255,0.06–0.08)`; item ativo = pill `rgba(255,255,255,0.06)`
  com ícone colorido e texto branco (SEM barra lateral); secundário
  `#8B8B93`; pills/labels com fundo sutil + dot colorido + texto neutro;
  números tabulares grandes; tabelas com `border-b white/5` e hover `white/5`.
- **Minimal Kanban**: cards escuros `rounded-lg`, borda sutil, hover com
  borda indigo + lift; cabeçalho de coluna com contador; tags em pills
  neutras com dot colorido.
- **BottomNav (mobile)**: barra flutuante escura com blur; item ativo =
  pílula CLARA (`bg-zinc-100`) com ícone PRETO.
- **Pomodoro**: timer gigante tabular (`text-6xl`), anel de progresso,
  botão START em pill larga com glow.
- **SaaS (Knowvio)**: stat cards com ícone em caixa colorida + número grande
  + sparkline; gráfico com gradiente; linhas de tabela com divisória sutil.

## 2. Diferenças encontradas (atual → alvo)

| # | Área | Estado atual (dark) | Referência / alvo |
|---|------|---------------------|-------------------|
| 1 | Fundo página | `zinc-950` chapado (`#09090b`) | `#0E0E11` + gradiente radial sutil no topo |
| 2 | Superfícies (cards, modais, inputs) | `zinc-900` (`#18181b`) + borda `zinc-800` | `#151519`/`#1A1A1E` + borda `white/7–8` |
| 3 | Sombras | `rgb(16 24 40 / 0.16)` (tom azulado, somem no preto) | pretas `rgb(0 0 0 / 0.5)` com blur maior |
| 4 | Sidebar ativa | pill com tint de accent + barra lateral | pill `white/6`, ícone indigo, texto branco, SEM barra |
| 5 | BottomNav ativa | texto accent + pill accent/12 | pílula `bg-zinc-100` com ícone preto |
| 6 | Kanban cards | `rounded-xl`, borda `zinc-700/80`, fundo `zinc-900` | `rounded-lg`, fundo `#1A1A1E`, borda `white/6`, hover borda indigo + lift |
| 7 | Colunas Kanban | painel `zinc-900/60` com borda cheia | superfície quase fundida (`white/2`, borda `white/6`) |
| 8 | PriorityBadge | pill chapada colorida (ex.: `bg-orange-100`) | pill neutra (`white/5` + borda `white/10`) com ÍCONE colorido |
| 9 | StatCards | número `text-2xl`, sem sparkline | número `text-4xl`, sparkline indigo no card de conclusões |
| 10 | TaskRow (dark) | card `zinc-900` + borda `zinc-800` | linha `white/2`, borda `white/5`, hover `white/5` |
| 11 | Gráfico barras | fill chapado `#6366f1`/`var(--accent)` | gradiente indigo (sólido → transparente) |
| 12 | Focus timer | `text-4xl`, botão retangular padrão | `text-6xl`, START em pill larga com glow |
| 13 | Modais | painel `zinc-900`, overlay `zinc-950/60` blur-[2px]→md | painel `#1A1A1E` + borda `white/10`, overlay `black/60` |
| 14 | Botões | `rounded-xl`, hover sem clarear | `rounded-lg` (8px), primário clareia no hover (`brightness`), sombra `indigo/20` |
| 15 | Títulos página | `font-extrabold` | `font-semibold` (Linear usa semibold, não black) |
| 16 | Secundário | `zinc-400/500` ok | manter (equivale a `#8B8B93` na prática) |

## 3. O que foi mantido de propósito

- Light mode: zero mudanças.
- Sem libs novas, sem webfont externa (CSP + offline).
- Acessibilidade: alvo axe 0; superfícies novas são MAIS escuras que as
  atuais (contraste de texto preservado/melhorado).
- Funcionalidade: nenhuma mudança em stores/services; só classes/CSS.

## 4. Estratégia de implementação

Overrides `.dark` centralizados em `src/index.css` (remap `zinc-950 → #0E0E11`,
`zinc-900 → #151519`, `zinc-800 (borda) → white/7`, sombras pretas) +
edições pontuais com variantes `dark:` onde há modificador de opacidade
(`bg-zinc-900/60` etc. não são alcançados pelo remap) ou mudança estrutural
(sidebar ativa, BottomNav ativa, badges, timer, botões `rounded-lg`).

## 5. Commits

Atômicos por área (`style: ...`), gates locais por commit
(typecheck + lint), suite completa + screenshots ao final.

## 6. Screenshots de referência (antes/depois)

- Antes (Fase 16): `C:\Users\Fauzi\AppData\Local\Temp\opencode\shots\`
  (`dash-dark.png`, `dash-light.png`, `kanban-dark.png`, `modal-dark.png`,
  `cal-dark.png`, `mob-dash-dark.png`, `mob-kanban-dark.png`).
- Depois (retrabalho): mesma pasta, sufixo `-v2`.
