---
description: 'Task list for 004-dupla-progressao'
---

# Tasks: Gatilho de progressão na faixa de repetições

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Constituição**: v1.4.0 — **o portão 4 é o guardião desta mudança.** Os dez casos de fronteira
rodam inalterados; se algum mudar de resultado, a alteração vazou para o valor único.

---

## Phase 1: A regra

- [ ] T001 Ajustar o gatilho em `src/domain/serie/intervalo.ts` — faixa indica ao **atingir** o máximo; ponta única, só ao **passar** (D1, FR-160, FR-161, FR-162)
- [ ] T002 Acrescentar a classificação "no topo" à posição no intervalo, apenas para faixas, em `src/domain/serie/intervalo.ts` (D2, FR-164)
- [ ] T003 Expor "no topo" na comparação planejado x realizado em `src/domain/serie/validade.ts` (FR-164)
- [ ] T004 Distinguir o motivo "dominou a faixa" de "superou a meta" em `src/domain/progressao/avaliar.ts` (D3)

## Phase 2: Os testes que travam a mudança

- [ ] T005 **Regressão do portão 4**: os dez casos de fronteira rodam **inalterados** (FR-165, SC-051)
- [ ] T006 [P] Teste: 3x 6-8 indica com 8/8/8 e com 9/9/9 (SC-049)
- [ ] T007 [P] Teste: 3x 6-8 não indica com 7/7/7, 8/8/7 nem 5/5/5 (SC-050)
- [ ] T008 [P] Teste: faixa de pontas iguais se comporta como valor único (FR-162)
- [ ] T009 [P] Teste: RIR abaixo do planejado impede a indicação mesmo com o teto alcançado (FR-163)
- [ ] T010 [P] Teste: a classificação distingue dentro, no topo e acima, e valor único não tem topo (FR-164, SC-052)
- [x] T011 Teste de ponta a ponta: planejar 6-8, registrar 8/8/8 e ver o aviso aparecer

## Phase 3: A apresentação

- [x] T012 Exibir a marca de topo na comparação do histórico, em `src/funcionalidades/historico/ComparacaoSeries.tsx` (FR-164)
- [x] T013 Exibir a marca de topo no livro-razão da execução, em `src/funcionalidades/execucao/TelaExecucao.tsx`
- [x] T014 Ajustar o texto do aviso e do detalhe para a faixa dominada, em `src/funcionalidades/progressao/`

## Phase 4: Fecho

- [x] T015 Rodar a suíte inteira e confirmar os quatro portões
- [x] T016 [P] Atualizar `CHANGELOG.md` e a versão em `package.json`
- [x] T017 Registrar em `docs/revisao-constitucional.md` a lição: a implementação estava correta em relação à especificação, e a especificação é que estava errada

---

## Notes

- A alteração alcança **apenas** planejamentos em faixa
- Nada é gravado; nenhuma migração
- Sugerir quanto aumentar, reescrever o plano e progressão direta continuam fora de escopo
