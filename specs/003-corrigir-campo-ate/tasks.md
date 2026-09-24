---
description: 'Task list for 003-corrigir-campo-ate'
---

# Tasks: Corrigir o campo "até" do intervalo de repetições

**Input**: Design documents de `/specs/003-corrigir-campo-ate/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

**Constituição**: v1.4.0 — os quatro portões continuam obrigatórios.

**Tests**: **incluídos e obrigatórios.** A lacuna de teste é o objeto desta correção tanto quanto o
campo: o defeito atravessou 554 testes porque a suíte cobria as duas pontas do caminho e não o
caminho.

---

## Phase 1: O teste que faltava

**Purpose**: escrever primeiro a verificação que teria pegado o defeito. Ela **deve falhar** contra
o código atual — se passar, não está verificando o que deveria.

- [ ] T001 Criar o teste de ida e volta em `tests/unidade/funcionalidades/editorDeSeries.test.tsx` — grava uma série com **todos** os valores editáveis preenchidos, monta a tela de edição e verifica campo a campo que cada um chegou (FR-158, SC-047)
- [ ] T002 Garantir que a falha de T001 **aponta qual valor se perdeu**, em vez de só acusar diferença (FR-159, SC-048)
- [ ] T003 Confirmar que T001 **falha** contra o código atual, pelo motivo certo: `repeticoesMax` ausente

**Checkpoint**: a lacuna está coberta e o defeito, demonstrado.

---

## Phase 2: A correção

- [ ] T004 Criar a projeção única dos valores planejados em `src/funcionalidades/treinos/projecaoDeSeries.ts` — deriva os valores editáveis do registro gravado, sem lista de campos a lembrar (D1, FR-153)
- [ ] T005 Passar `ItemDoEditor` em `src/funcionalidades/treinos/EditorTreino.tsx` a usar a projeção, eliminando a enumeração de campos que causou o defeito (FR-152, FR-153)
- [ ] T006 Confirmar que T001 passa

---

## Phase 3: Os comportamentos que o defeito escondia

- [ ] T007 [P] Teste: o valor gravado aparece ao abrir o editor; série de valor único mostra o campo vazio, e não o valor de repetições (FR-152, SC-044)
- [ ] T008 [P] Teste: digitar um número de dois ou mais dígitos produz aquele número (FR-154, SC-045)
- [ ] T009 [P] Teste: esvaziar o campo devolve a série ao valor único (FR-155, SC-046)
- [ ] T010 [P] Teste: alterar e remover um máximo já gravado funciona — é o caminho de quem tem valor gravado sem intenção (FR-156)
- [ ] T011 Teste de ponta a ponta: planejar 6-8, sair do editor, voltar, e encontrar 6-8 em `tests/e2e/intervaloNoEditor.spec.ts` (SC-044, SC-047)
- [ ] T012 Teste de ponta a ponta: o intervalo planejado chega à execução e à avaliação de progressão — o caminho completo que o defeito interrompia

---

## Phase 4: Fecho

- [ ] T013 Rodar a suíte inteira e confirmar que **os quatro portões passam inalterados**
- [ ] T014 [P] Atualizar `CHANGELOG.md` e subir a versão em `package.json`
- [ ] T015 Registrar em `docs/revisao-constitucional.md` a lição do defeito: testar as duas pontas de um caminho não testa o caminho

---

## Dependencies & Execution Order

- **Phase 1** primeiro, e o teste **deve falhar**. É o que prova que ele verifica o defeito
- **Phase 2** depende da Phase 1
- **Phase 3** depende da Phase 2
- **Phase 4** depende de tudo

### Por que o teste vem antes

Não é ritual. Um teste escrito depois da correção passa na primeira execução, e ninguém descobre se
ele teria pegado o defeito. Escrito antes, ele falha — e a falha é a prova de que a rede foi
colocada no buraco certo.

---

## Notes

- A regra de domínio do intervalo **não é tocada**: a feature 002 a entregou testada, e o defeito é
  de apresentação
- Nenhuma migração de dados: valores gravados durante o defeito ficam visíveis e a decisão é do
  usuário (Princípio I)
- Nenhuma alteração de esquema, nenhuma dependência nova
