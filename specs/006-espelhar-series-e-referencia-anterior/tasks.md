---
description: "Task list for feature implementation"
---

# Tasks: Séries que acompanham a primeira e referência da última vez no mesmo treino

**Input**: Design documents from `specs/006-espelhar-series-e-referencia-anterior/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: obrigatórios. O Princípio V recusa regra de domínio sem teste de fronteira, e os quatro
portões constitucionais seguem valendo (a suíte inteira precisa continuar verde).

**Organization**: por história de usuário. As duas histórias são independentes e podem ser feitas em
qualquer ordem.

## Phase 1: Setup

Nada a preparar: sem dependência nova, sem esquema novo, sem migração.

## Phase 2: Foundational

Nada bloqueia as histórias. Não há código comum às duas.

---

## Phase 3: User Story 1 — Planejar 4x10 com 40 kg digitando uma vez só (P1)

**Goal**: alterar a série 1 leva junto as séries que estavam idênticas a ela; série com valores
próprios não é tocada.

**Independent Test**: num exercício com 4 séries iguais, alterar cada campo da série 1 e conferir as
séries 2–4; personalizar a 4 e conferir que ela não acompanha mais.

### Tests for User Story 1

- [X] T001 [P] [US1] Testes da função pura `espelhar` em `tests/unidade/domain/espelharSeries.test.ts`:
      (a) edição na série 0 propaga a todas as idênticas, para cada campo `repeticoes`,
      `repeticoesMax`, `cargaKg`, `rir` (FR-187); (b) série com **um único** campo diferente não é
      alterada (FR-188); (c) edição em `indice > 0` altera só aquela série (FR-189); (d) série que
      volta a ficar igual à primeira passa a acompanhar (FR-190); (e) lista de uma série; (f)
      `indice` fora do intervalo devolve a entrada; (g) não muta `atuais`; (h) propagação de
      `null` em `rir`/`repeticoesMax`
- [X] T002 [P] [US1] Casos de espelhamento em `tests/unidade/funcionalidades/editorDeSeries.test.tsx`,
      usando o helper `aplicar` existente: mudar "Carga da série 1 em quilos" com 4 séries iguais
      produz 4 séries com a carga nova; com a série 4 divergente, ela permanece; mudar "Carga da
      série 3" altera só a 3 (FR-187–FR-189, SC-062, SC-063)
- [X] T003 [P] [US1] Teste de integração em `tests/integracao/espelharSeries.test.ts`: `transformarSeries`
      com `espelhar` grava todas as séries alteradas numa única transação, e a releitura do item
      reflete o espelhamento; com o item já executado, a sessão concluída mantém os valores
      antigos (FR-191, FR-193)
- [X] T004 [P] [US1] E2E em `tests/e2e/espelharSeries.spec.ts` seguindo `quickstart.md` US1 passos
      1–6, inclusive digitar "40" tecla a tecla e reabrir o treino (SC-062, SC-063)

### Implementation for User Story 1

- [X] T005 [US1] Criar `src/domain/treino/espelhar.ts` com
      `espelhar(atuais, indice, campo, valor): readonly ValoresPlanejados[]` conforme
      `contracts/dominio.md`; igualdade compara exatamente `repeticoes`, `repeticoesMax`, `cargaKg`,
      `rir`, avaliada sobre `atuais[0]` **antes** da alteração; reexportar em
      `src/domain/treino/index.ts` (FR-187–FR-190)
- [X] T006 [US1] Em `src/funcionalidades/treinos/EditorSeries.tsx`, `alterar` mantém a conversão de
      texto (`''` → `null` para `rir`/`repeticoesMax`, → `0` para os demais) e passa a chamar
      `aoMudar((atuais) => espelhar(atuais, indice, campo, valorConvertido))`; atualizar o
      comentário de cabeçalho citando FR-187 (FR-191 via transação existente)
- [X] T021 [US1] Em `src/funcionalidades/treinos/EditorTreino.tsx`, `SERIES_INICIAIS` passa a ter as
      três séries idênticas (RIR 2) (FR-203) — acrescentada na implementação
- [X] T007 [US1] Rodar T001–T004 e a suíte do editor (`intervaloNoEditor.spec.ts`) até verde

**Checkpoint**: US1 funcional e testável sozinha.

---

## Phase 4: User Story 2 — Ver o que fiz na mesma série da última vez neste treino (P1)

**Goal**: na execução do treino X, cada série mostra discretamente repetições e carga da série de
mesmo número na última execução do exercício no treino X.

**Independent Test**: concluir uma sessão do Treino A com valores conhecidos, outra do Treino B com
valores diferentes, abrir nova sessão do Treino A e conferir as referências.

### Tests for User Story 2

- [X] T008 [P] [US2] Testes de `referenciasPorSerie` em `tests/unidade/domain/referenciaPorSerie.test.ts`:
      séries válidas viram entrada por `ordem`; `naoRealizada` e `repeticoes === null` não geram
      entrada (FR-197); dropset usa `degraus[0]`; carga `null` preservada
- [X] T009 [P] [US2] Testes de `formatarReferencia` em `tests/unidade/plataforma/formato.test.ts`:
      `{10,40}` → `"10 × 40 kg"`, `{10,42.5}` → `"10 × 42,5 kg"`, `{12,0}` → `"12"`,
      `{12,null}` → `"12"`
- [X] T010 [P] [US2] Integração em `tests/integracao/execucaoAnteriorNoTreino.test.ts`
      (padrão de `tests/unidade/domain/execucaoAnterior.test.ts`): (a) mais recente do mesmo
      treino vence uma mais nova de outro treino (FR-195); (b) nunca feito no treino → `null`
      mesmo havendo em outro (FR-196); (c) sessão do treino em que o exercício foi pulado é
      ignorada e vale a anterior; (d) sessão descartada ou em andamento ignorada; (e)
      `ignorarSessaoId`; (f) versão vigente após correção; (g) `treinoId === null` → `null`;
      (h) ocorrência 0 e 1 de exercício repetido; (i) nada é gravado pela consulta (FR-202)
- [X] T011 [P] [US2] E2E em `tests/e2e/referenciaAnterior.spec.ts` seguindo `quickstart.md` US2:
      referência por série, campos **não** pré-preenchidos (FR-198, SC-066), referência na série
      registrada (FR-200), 4ª série sem referência (FR-197), linha "Última vez" inalterada
      (FR-201), registro de série ainda em ≤ 3 toques (SC-067)

### Implementation for User Story 2

- [X] T012 [P] [US2] Criar `src/domain/serie/referencia.ts` com `ReferenciaDeSerie` e
      `referenciasPorSerie(series)` conforme `data-model.md` (FR-194, FR-197)
- [X] T013 [P] [US2] Acrescentar `formatarReferencia` em `src/plataforma/formato.ts` usando
      `formatarCarga` existente
- [X] T014 [US2] Acrescentar `execucaoAnteriorNoTreino(exercicioId, treinoId, ocorrencia, opcoes, db)`
      em `src/funcionalidades/execucao/consultas.ts` conforme `contracts/dominio.md`, reutilizando
      os filtros de `execucaoAnterior` sem alterar esta (FR-195, FR-196, FR-201)
- [X] T015 [US2] Em `src/funcionalidades/execucao/TelaExecucao.tsx`, no `useLiveQuery`, calcular
      `referencias: Map<exercicioSessaoId, ReadonlyMap<ordem, ReferenciaDeSerie>>` com a ocorrência
      de cada exercício entre os de mesmo `exercicioId` da sessão, ordenados por `ordem`; usar
      `sessao.sessao.treinoId` e `ignorarSessaoId: sessao.sessao.id` (FR-194, FR-202)
- [X] T016 [US2] Usando a skill `frontend-design` (exigência constitucional), exibir a referência
      conforme `contracts/interface.md`: na `identificacaoSerie` do cartão da série corrente
      (abaixo da meta) e na linha `linhaRazaoEditavel` de cada série registrada, com
      `data-referencia-anterior`, prefixo "anterior", texto por extenso para leitor de tela; estilo em
      `src/funcionalidades/execucao/execucao.module.css` com token de texto secundário, sem
      transparência, sem reduzir área de toque (FR-198–FR-200)
- [X] T017 [US2] Rodar T008–T011 e a suíte e2e de execução (`layout.spec.ts`,
      `navegacaoExercicios.spec.ts`, `campoDeCarga.spec.ts`) até verde

**Checkpoint**: US2 funcional e testável sozinha.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T018 [P] Registrar a feature em `CHANGELOG.md` no formato das entradas anteriores
- [X] T019 Rodar `npm run lint`, `npm run build`, `npm test` e `npm run test:e2e` completos; os quatro
      portões constitucionais continuam verdes
- [X] T020 Validar manualmente `quickstart.md` no app em execução (dev server + navegador), em largura
      de iPhone, nos temas claro e escuro

---

## Dependencies & Execution Order

- US1 (T001–T007) e US2 (T008–T017) são independentes.
- Dentro de US1: T001–T004 [P] → T005 → T006 → T007.
- Dentro de US2: T008–T011 [P] e T012–T013 [P] → T014 → T015 → T016 → T017.
- Polish depende das duas histórias.

## Parallel Example

```text
US1 testes:  T001, T002, T003, T004
US2 base:    T008, T009, T010, T011, T012, T013
```

## Implementation Strategy

- **MVP**: US1 sozinha já elimina a digitação repetida e é entregável.
- Em seguida US2, que não depende de US1.
- Cada checkpoint deixa a suíte inteira verde antes de seguir.
