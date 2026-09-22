---
description: 'Task list for 002-execution-fixes-rep-ranges'
---

# Tasks: Ajustes da execução e intervalo de repetições

**Input**: Design documents de `/specs/002-execution-fixes-rep-ranges/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/backup-file.md](./contracts/backup-file.md)

**Constituição**: v1.4.0 — os quatro portões continuam obrigatórios e **nenhum dos dez casos de
fronteira do portão 4 pode mudar de resultado**.

> **Numeração**: reinicia em T001. Este arquivo é autocontido; a feature 001 tem o seu próprio.
> As referências a requisitos (FR-127 e adiante) é que ligam os dois.

**Tests**: **incluídos e obrigatórios.** A constituição não considera concluída nenhuma regra de
domínio sem teste cobrindo seus casos de fronteira, e esta feature altera a regra mais sensível do
projeto.

**Ordem de entrega**: a fundação vem primeiro porque duas histórias dependem do esquema. Depois
vem **US1**, que é o que inviabilizou o treino real — quanto antes ela chegar ao aparelho, melhor.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational — esquema e tipos

**Purpose**: a migração aditiva que US3 e US5 exigem. **Bloqueia essas duas**; US1, US2 e US4 não
dependem dela.

- [X] T001 Acrescentar `repeticoesMax: number | null` a `SeriePlanejada` e `descansoSegundos: number | null` a `ItemTreino` em `src/domain/tipos/treino.ts` — ambos opcionais, `null` como valor de todo registro existente
- [X] T002 Criar a migração v2 em `src/dados/migracoes/index.ts` com os dois campos novos, sem remover tabela nem índice — a guarda `verificarAditividade` recusaria
- [X] T003 [P] Teste de integração: migração v1 → v2 sobre banco com dados preserva todos os registros e preenche os campos novos com `null`, em `tests/integracao/migracaoV2.test.ts` (SC-042)

**Checkpoint**: esquema pronto. US3 e US5 liberadas.

---

## Phase 2: US1 — Alcançar qualquer exercício do treino (P1) 🎯 PRIMEIRO

**Goal**: qualquer exercício da sessão alcançável sem tentativa e erro, em tela de 430 px.

**Independent Test**: treino de 5 exercícios, alcançar o quinto em no máximo 2 toques ou 1 gesto.

### Tests for US1

- [X] T004 [P] [US1] Teste ponta a ponta: com 5 exercícios em 430 px, todos são alcançáveis e nenhum fica inatingível, em `tests/e2e/navegacaoExercicios.spec.ts` (SC-035, SC-036, FR-128)
- [X] T005 [P] [US1] Teste ponta a ponta: arrastar horizontalmente troca de exercício; no primeiro e no último sinaliza o limite sem sair da sessão, em `tests/e2e/navegacaoExercicios.spec.ts` (FR-129, FR-131)
- [X] T006 [P] [US1] Teste ponta a ponta de FR-130: arrastar começando **dentro do campo de carga** não troca de exercício, e arrastar sobre a faixa de exercícios rola a faixa sem trocar, em `tests/e2e/navegacaoExercicios.spec.ts`
- [X] T007 [P] [US1] Teste ponta a ponta: trocar de exercício preserva todo valor já registrado, em `tests/e2e/navegacaoExercicios.spec.ts` (FR-132)

### Implementation for US1

- [X] T008 [US1] Implementar o gancho de gesto lateral em `src/funcionalidades/execucao/useGestoLateral.ts` — eventos de ponteiro, limiar de 60 px, exigindo que o deslocamento horizontal supere o vertical (D3)
- [X] T009 [US1] Implementar a guarda de origem do gesto no mesmo gancho — sobe a árvore do DOM a partir do alvo e desiste ao encontrar `input`, `textarea`, `[role="tab"]` ou elemento com rolagem horizontal (FR-130)
- [X] T010 [US1] Implementar o controle de paginação em `src/funcionalidades/execucao/NavegacaoExercicios.tsx` — anterior, posição, próximo, sempre visível, com a faixa mantida para salto direto (D4, FR-127, FR-128)
- [X] T011 [US1] Ligar gesto e paginação à `TelaExecucao.tsx`, com sinalização de limite no primeiro e no último exercício (FR-131)
- [X] T012 [US1] Aplicar a skill `frontend-design` à navegação e registrar a avaliação contra os 5 critérios de D9 em `docs/direcao-visual.md` — o controle precisa **parecer** navegação, que é exatamente o defeito relatado

**Checkpoint**: o treino de 5 exercícios fica utilizável. É o ajuste de maior valor imediato.

---

## Phase 3: US2 — Corrigir e remover séries durante a sessão (P1)

**Goal**: erro registrado no meio do treino deixa de ser irreversível.

**Independent Test**: registrar série com valor errado, corrigi-la; registrar série por engano,
removê-la — tudo sem concluir a sessão.

### Tests for US2

- [X] T013 [P] [US2] Teste de unidade das regras de rascunho em `tests/unidade/domain/rascunhoSessao.test.ts` — renumeração contígua após remoção e re-vínculo de cada série restante à meta da nova posição (FR-135)
- [X] T014 [P] [US2] Teste de integração: corrigir e remover série em sessão `em_andamento` **não** cria versão nova, em `tests/integracao/correcaoEmSessaoAberta.test.ts` (FR-136)
- [X] T015 [P] [US2] Teste de integração: a mesma operação é **recusada** em sessão `concluida`, onde FR-113 e FR-114 continuam valendo, em `tests/integracao/correcaoEmSessaoAberta.test.ts`
- [X] T016 [P] [US2] Teste de integração: a remoção é lógica — a linha permanece na tabela com `excluidoEm` carimbado, em `tests/integracao/correcaoEmSessaoAberta.test.ts`
- [X] T017 [P] [US2] Teste de integração: remover todas as séries devolve o exercício a `nao_alcancado`, **não** a `nao_realizado` — a distinção de FR-125 continua valendo, em `tests/integracao/correcaoEmSessaoAberta.test.ts`
- [X] T018 [P] [US2] Teste ponta a ponta: série removida não aparece no histórico da sessão concluída, e os valores corrigidos aparecem, em `tests/e2e/correcaoEmSessao.spec.ts` (SC-038)

### Implementation for US2

- [X] T019 [US2] Implementar as regras de rascunho como funções puras em `src/domain/sessao/rascunho.ts` — renumeração e re-vínculo à meta por posição (D2, FR-135)
- [X] T020 [US2] Acrescentar `corrigirSerieEmAndamento` e `removerSerieEmAndamento` a `src/dados/repositorios/sessoes.ts`, recusando quando `estado !== 'em_andamento'` — a fronteira é verificada na camada de dados, não na tela (FR-133, FR-134, FR-136)
- [X] T021 [US2] Implementar a edição de série registrada em `src/funcionalidades/execucao/EditorSerieRegistrada.tsx` — carga, repetições e RIR, alcançável a partir do livro-razão (FR-133, SC-037)
- [X] T022 [US2] Implementar a remoção com confirmação explícita no mesmo componente (FR-134)
- [X] T023 [US2] Implementar o estado de **exercício completo** na `TelaExecucao.tsx` — quando todas as planejadas estão registradas, sinalizar a conclusão e oferecer o próximo exercício, em vez de apresentar a série extra como o passo natural (FR-137)
- [X] T024 [US2] Tornar o registro de série além das planejadas uma ação explícita e distinta de confirmar a série seguinte (FR-138)
- [X] T025 [US2] Aplicar a skill `frontend-design` às telas de US2

**Checkpoint**: a armadilha que produziu a série indevida está fechada nas duas pontas.

---

## Phase 4: US3 — Intervalo de repetições (P1)

**Goal**: planejar "3x 6-8" e o critério de aumento de carga responder certo.

**Depends on**: Phase 1.

**Independent Test**: planejar 3x 6-8, executar 8/8/8 e não indicar; executar 9/9/9 e indicar.

### Tests for US3

- [X] T026 [P] [US3] Teste de unidade da regra de intervalo em `tests/unidade/domain/intervaloRepeticoes.test.ts` — `maximo = repeticoesMax ?? repeticoes`; abaixo, dentro e acima; ponta única como caso particular (FR-140, FR-141)
- [X] T027 [P] [US3] **Regressão do portão 4**: os dez casos de fronteira existentes em `tests/unidade/domain/progressao.test.ts` rodam **inalterados** e produzem os mesmos resultados (SC-040)
- [X] T028 [P] [US3] Teste de unidade dos casos de intervalo no portão 4, em `tests/unidade/domain/progressao.test.ts` — 3x 6-8 com 9/9/9 indica; 8/8/8, 9/9/8, 7/7/7 e 5/5/5 não indicam (SC-039, FR-142)
- [X] T029 [P] [US3] Teste de unidade: intervalo com mínimo maior que o máximo é recusado; pontas iguais são aceitas, em `tests/unidade/domain/treino.test.ts` (FR-143)
- [X] T030 [P] [US3] Teste de unidade: intervalo combinado com o critério de RIR, que não muda, em `tests/unidade/domain/progressao.test.ts` (FR-044)
- [X] T031 [P] [US3] Teste de integração: treino planejado com valor único antes da mudança continua válido e produz a mesma avaliação, em `tests/integracao/compatibilidadeIntervalo.test.ts` (FR-144, SC-040)
- [X] T032 [P] [US3] Teste de unidade: backup **sem** `repeticoesMax` é aceito e o campo vira `null`; backup com intervalo invertido é recusado, em `tests/unidade/domain/backup/validacao.test.ts` (SC-042)

### Implementation for US3

- [X] T033 [US3] Implementar a regra única de intervalo em `src/domain/serie/intervalo.ts` — `minimo`, `maximo` e a classificação abaixo/dentro/acima, com ponta única como caso particular (D1, FR-140, FR-141)
- [X] T034 [US3] Passar `compararSerie` em `src/domain/serie/validade.ts` a usar a regra de intervalo (FR-141)
- [X] T035 [US3] Passar `avaliarProgressao` em `src/domain/progressao/avaliar.ts` a usar `realizado > maximo` — para ponta única a expressão é idêntica à atual, que é o que preserva o portão 4 (FR-142)
- [X] T036 [US3] Acrescentar a validação do intervalo em `src/domain/treino/validar.ts` — `repeticoesMax`, quando presente, é inteiro e **não menor que** `repeticoes` (FR-143)
- [X] T037 [US3] Persistir `repeticoesMax` em `src/dados/repositorios/treinos.ts`, respeitando a cópia na escrita de série já executada que FR-017 exige
- [X] T038 [US3] Acrescentar `repeticoesMax` ao arquivo de backup em `src/domain/backup/` — campo opcional, **sem** incrementar `formatVersion`
- [X] T039 [US3] Validar `repeticoesMax` na importação em `src/domain/backup/validar.ts` — ausente é aceito, invertido é recusado (contrato § Validação)
- [X] T040 [US3] Implementar a entrada de intervalo em `src/funcionalidades/treinos/EditorSeries.tsx` — mínimo e máximo, com o valor único continuando simples de informar (FR-139)
- [X] T041 [US3] Exibir o intervalo na meta da tela de execução e na comparação do histórico, em `src/funcionalidades/execucao/` e `src/funcionalidades/historico/ComparacaoSeries.tsx` (FR-141)
- [X] T042 [US3] Aplicar a skill `frontend-design` à entrada e à exibição do intervalo

**Checkpoint**: o critério de aumento de carga passa a responder certo para o treino real.

---

## Phase 5: US4 — Exercício de peso corporal no progresso (P2)

**Goal**: barra fixa registrada sem carga deixa de aparecer como zero execuções.

**Independent Test**: duas sessões de barra fixa sem carga → Progresso mostra duas execuções, com
evolução em repetições.

### Tests for US4

- [X] T043 [P] [US4] Teste de unidade: `agregarEvolucao` **não** descarta série válida sem carga, em `tests/unidade/domain/evolucao.test.ts` (FR-145)
- [X] T044 [P] [US4] Teste de unidade: o modo é `repeticoes` quando nenhuma execução teve carga, e `carga` quando alguma teve, em `tests/unidade/domain/evolucao.test.ts` (FR-146)
- [X] T045 [P] [US4] Teste de unidade: carga nula e carga zero produzem o mesmo resultado, em `tests/unidade/domain/evolucao.test.ts` (FR-147)
- [X] T046 [P] [US4] Teste de integração: exercício sem carga aparece no Progresso com a contagem correta, em `tests/integracao/pesoCorporal.test.ts` (SC-041)

### Implementation for US4

- [X] T047 [US4] Corrigir o filtro em `src/domain/evolucao/agregar.ts` — parar de descartar série sem carga, alinhando a agregação à definição de série válida de FR-092 (FR-145, FR-147)
- [X] T048 [US4] Devolver o modo da série histórica em `agregarEvolucao` — `carga` ou `repeticoes`, derivado a cada consulta e nunca gravado (D5, FR-146)
- [X] T049 [US4] Apresentar a evolução em repetições quando o modo for `repeticoes`, em `src/funcionalidades/progressao/GraficoEvolucao.tsx` e `EvolucaoExercicio.tsx` (FR-146)
- [X] T050 [US4] Ajustar os rótulos da `TelaProgresso.tsx` para o modo em repetições — "kg na última" não cabe num exercício sem carga

**Checkpoint**: o dado que já existia passa a ser apresentado.

---

## Phase 6: US5 — Descanso planejado visível (P3)

**Goal**: o descanso escrito no treino fica visível na hora de executar.

**Depends on**: Phase 1.

**Independent Test**: planejar 90 s de descanso e conferir que aparece junto da meta, sem contagem.

### Tests for US5

- [ ] T051 [P] [US5] Teste de integração: `descansoSegundos` é persistido e lido; ausente é o estado normal, em `tests/integracao/descanso.test.ts` (FR-148, FR-149)
- [ ] T052 [P] [US5] Teste ponta a ponta: o descanso planejado aparece na execução sem toque adicional; exercício sem descanso não exibe nada, em `tests/e2e/descanso.spec.ts` (FR-150, SC-043)
- [ ] T053 [P] [US5] **Teste da fronteira constitucional**: o aplicativo não conta tempo, não emite aviso e não interrompe por causa do descanso — verificado por ausência de temporizador e de contagem regressiva na tela de execução, em `tests/e2e/descanso.spec.ts` (FR-151)

### Implementation for US5

- [X] T054 [US5] Persistir `descansoSegundos` em `src/dados/repositorios/treinos.ts` — inteiro não negativo, opcional
- [ ] T055 [US5] Implementar a entrada de descanso no editor de treino, em `src/funcionalidades/treinos/EditorTreino.tsx` (FR-148)
- [ ] T056 [US5] Exibir o descanso na tela de execução junto dos demais valores planejados, em `src/funcionalidades/execucao/TelaExecucao.tsx` (FR-150)
- [ ] T057 [US5] Acrescentar `descansoSegundos` ao arquivo de backup e à validação em `src/domain/backup/` — campo opcional, **sem** incrementar `formatVersion`

**Checkpoint**: todas as histórias entregues.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T058 Executar todos os cenários de [quickstart.md](./quickstart.md) e registrar o resultado em `docs/validacao.md`
- [ ] T059 [P] Rodar a suíte inteira e confirmar que **os quatro portões passam inalterados** — o portão 4 é o mais sensível a esta feature
- [ ] T060 [P] Confirmar que a auditoria de tokens e o teste de alvos de toque continuam passando nas três larguras, com os controles novos de navegação e de edição de série (SC-009)
- [ ] T061 [P] Atualizar `CHANGELOG.md` e subir a versão em `package.json` — a versão viaja no cabeçalho de todo backup exportado
- [ ] T062 Revisar a implementação contra a constituição v1.4.0, com atenção à fronteira de FR-151, e registrar em `docs/revisao-constitucional.md`
- [ ] T063 ⏳ **APARELHO** — validar no iPhone: alcance dos 5 exercícios, gesto de arrastar com a mão suada, e o descanso legível de relance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: sem dependências. **Bloqueia US3 e US5**
- **US1 (Phase 2)**: independente — pode começar junto da Phase 1
- **US2 (Phase 3)**: independente da Phase 1; ganha sentido depois de US1
- **US3 (Phase 4)**: depende da Phase 1
- **US4 (Phase 5)**: totalmente independente
- **US5 (Phase 6)**: depende da Phase 1
- **Polish (Phase 7)**: depende de tudo

### A ordem não é a da prioridade declarada, e isso é deliberado

US1, US2 e US3 são todas P1. US1 vem primeiro porque é o que inviabilizou o treino real — e porque,
sendo pura interface, não espera pela migração.

US2 vem logo atrás porque as duas formam a cadeia de causa e efeito que produziu o registro
indevido: a navegação quebrada levou aos botões, os botões à série indevida, e a série indevida não
podia ser removida. Entregar só uma das duas deixaria metade da armadilha de pé.

### Parallel Opportunities

- Phase 1 e US1 avançam juntas — nenhuma depende da outra
- US4 é independente de tudo e pode ser feita a qualquer momento
- Todos os testes marcados [P] dentro de uma história rodam juntos

---

## Implementation Strategy

### Menor incremento que resolve o treino real

1. Phase 2 (US1) → o treino de 5 exercícios volta a ser utilizável
2. Phase 3 (US2) → o erro de registro deixa de ser irreversível
3. **PARAR e VALIDAR no aparelho** — são os dois que estragaram a sessão

### Entrega completa

4. Phase 1 + Phase 4 (US3) → o critério de aumento de carga responde certo
5. Phase 5 (US4) → a barra fixa aparece no progresso
6. Phase 6 (US5) → o descanso fica visível
7. Phase 7 → validação e acabamento

---

## Notes

- **Nenhum dos dez casos de fronteira do portão 4 pode mudar de resultado.** É o alarme de SC-040
- Migração aditiva: a guarda `verificarAditividade` recusa o contrário
- `formatVersion` permanece `1` — campo opcional não incrementa
- FR-113 e FR-114 continuam valendo para sessão **concluída**; esta feature alcança só a em andamento
- FR-151 é fronteira constitucional: descanso é exibido, nunca cronometrado
