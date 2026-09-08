# Teste manual — arrasto no Kanban (Android)

Por que manual: neste ambiente não há dispositivo (`adb devices` vazio),
nem AVD, nem imagens de sistema instaladas (sem `system-images/`, sem
`cmdline-tools`), então não foi possível rodar emulador. O arrasto é
coberto no Chromium via `e2e/kanban-touch.spec.ts` (Pointer Events
sintéticos) e `e2e/kanban-mouse.spec.ts`.

## Pré-requisito

- APK da release ≥ 1.6.4 (`forgeboard-v1.6.4.apk` em
  https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases) instalado
  no celular (versões anteriores usam o sistema antigo de arrasto).

## Passo a passo (≈ 3 min)

1. Abra o app, crie um projeto (ou abra um existente) com 1 tarefa no
   Backlog e abra o Quadro.
2. **Toque longo:** pressione o cartão e SEGURE PARADO por ~1s, sem mover.
   - Esperado: o cartão "descola" (fantasma elevado segue o dedo; origem
     esmaecida) e a coluna sob o dedo acende. Sem menu "copiar", sem
     seleção de texto.
3. **Arrastar:** ainda segurando, mova o dedo até outra coluna e solte.
   - Esperado: a tarefa aparece na coluna de destino (contador atualiza).
4. **Rolagem:** deslize rápido para cima/baixo começando sobre um cartão.
   - Esperado: a página rola normalmente (NÃO inicia arrasto).
5. **Toque simples:** toque curto no título do cartão.
   - Esperado: abre a edição (sem arrasto, sem clique suprimido).
6. **Fallback:** use os botões Mover (cima/baixo) do cartão.
   - Esperado: movem entre colunas como antes.
7. **Cancelar:** inicie o arrasto e toque em voltar do sistema.
   - Esperado: o fantasma some e nada muda (se o gesto cancelar).

## Se algo falhar, anote

- Modelo do Android + versão do WebView do sistema
  (Configurações > Apps > Android System WebView).
- Qual passo falhou e o que apareceu (menu? seleção? nada?).
- Se possível, repita com "Depuração USB" e capture `adb logcat`.
