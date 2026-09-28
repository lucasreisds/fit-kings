---
description: "Task list for feature implementation"
---

# Tasks: Campo de carga apagável e cronômetro de descanso

**Input**: Design documents from `specs/005-cronometro-de-descanso/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: obrigatórios. O Princípio V recusa regra de domínio sem teste de fronteira, e os quatro
portões constitucionais seguem valendo.

**Organization**: por história de usuário, em ordem de prioridade.

## Phase 1: Setup

- [x] T001 Criar `src/domain/descanso/` com `index.ts` reexportando o módulo, seguindo o formato dos
      demais diretórios de domínio

## Phase 2: Foundational

Nada aqui bloqueia as histórias. O defeito do campo de carga e o cronômetro são independentes e
podem ser feitos em qualquer ordem — não há tarefa comum às duas.

---

## Phase 3: User Story 1 — Trocar 45 kg por 50 kg (P1)

**Goal**: o campo de carga pode ser esvaziado e permanece vazio, e o que é gravado é o que está na
tela.

**Independent Test**: registrar uma série com carga, ir para a seguinte, apagar os dígitos um a um e
digitar um valor com primeiro dígito diferente.

- [x] T002 [P] [US1] Definir `CampoDeCarga` e `cargaEfetiva` em `src/domain/serie/campoDeCarga.ts`,
      com os três estados de data-model.md: `{ origem: 'herdado' }`,
      `{ origem: 'usuario', valor: number }` e `{ origem: 'usuario', valor: null }`. `cargaEfetiva`
      devolve a carga herdada em `herdado` e o valor em `usuario`, **inclusive quando é `null`**
      (FR-167)
- [x] T003 [P] [US1] Escrever `tests/unidade/domain/campoDeCarga.test.ts` cobrindo os três estados,
      e o caso de fronteira que é o defeito: `usuario` com `null` e herança de 45 devolve `null`,
      não 45 (FR-167, FR-168)
- [x] T004 [US1] Trocar `Rascunho.cargaKg` de `number | null` para `CampoDeCarga` em
      `src/funcionalidades/execucao/store.ts`, com `RASCUNHO_VAZIO` usando `{ origem: 'herdado' }`
      (FR-167)
- [x] T005 [US1] Usar `cargaEfetiva(rascunho.cargaKg, cargaHerdada(...))` no valor exibido do campo
      de carga em `src/funcionalidades/execucao/TelaExecucao.tsx`, e gravar `origem: 'usuario'` em
      toda digitação, inclusive quando o campo fica vazio (FR-168)
- [x] T006 [US1] Usar a mesma `cargaEfetiva` na confirmação da série em
      `src/funcionalidades/execucao/TelaExecucao.tsx`, de modo que confirmar com o campo apagado
      registre a série sem carga (FR-169)
- [x] T007 [US1] Conferir que os atalhos de repetições e o campo de repetições não foram tocados em
      `src/funcionalidades/execucao/TelaExecucao.tsx` (FR-170)
- [x] T008 [US1] Escrever `tests/e2e/campoDeCarga.spec.ts`: registrar 45, na série 2 apagar dígito a
      dígito, conferir campo vazio, digitar 50 e confirmar (SC-054, SC-055); e conferir que quem não
      toca no campo continua vendo 45 (SC-056)

**Checkpoint**: o defeito relatado está corrigido e verificado de ponta a ponta.

---

## Phase 4: User Story 2 — Descansar entre séries sem olhar o relógio (P1)

**Goal**: um cronômetro que o usuário inicia, que conta a partir do descanso planejado e avisa ao
terminar.

**Independent Test**: iniciar o descanso num exercício com tempo planejado e conferir que conta para
trás a partir daquele valor e avisa em zero.

- [x] T009 [P] [US2] Definir `DescansoEmAndamento`, `duracaoDoDescanso`, `segundosRestantes` e
      `terminou` em `src/domain/descanso/contagem.ts`. `duracaoDoDescanso` devolve o planejado, ou
      **120** quando ele for `null` ou **zero** (FR-174). `segundosRestantes` recebe `agora` como
      parâmetro e nunca devolve negativo (FR-177)
- [x] T010 [P] [US2] Escrever `tests/unidade/domain/contagemDeDescanso.test.ts` com os casos de
      fronteira: planejado ausente, planejado zero, restante exato em zero, `agora` anterior ao
      início e `agora` muito depois do fim (FR-174, FR-177)
- [x] T011 [P] [US2] Escrever `src/plataforma/som.ts` com um bipe curto por `AudioContext`, criado
      no gesto do usuário, que engole toda falha sem lançar nem registrar erro visível (FR-185)
- [x] T012 [P] [US2] Escrever `src/plataforma/descansoPersistido.ts` para ler e gravar
      `{ sessaoId, iniciadoEm, duracaoSegundos }` em `localStorage`, descartando registro de outra
      sessão na leitura (FR-178, FR-183)
- [x] T013 [US2] Escrever `src/funcionalidades/execucao/useDescanso.ts`, que liga a regra pura ao
      relógio: `setInterval` de 1 s **apenas** como gatilho de redesenho, recálculo em
      `visibilitychange`, e o som disparado uma única vez na transição para terminado (FR-175,
      FR-176, FR-177)
- [x] T014 [US2] Escrever `src/funcionalidades/execucao/Descanso.tsx` com o botão de iniciar, a
      contagem, a ação de cancelar e o aviso de fim (FR-172, FR-175, FR-176, FR-179)
- [x] T015 [US2] Montar `Descanso` na tela de execução junto do descanso planejado já exibido, em
      `src/funcionalidades/execucao/TelaExecucao.tsx`, usando a skill `frontend-design` e sem
      transparência nem blur, e sem disputar hierarquia visual com carga, repetições e RIR (FR-172,
      D5)
- [x] T016 [US2] Garantir que nada inicia a contagem sozinho: nenhum efeito em
      `src/funcionalidades/execucao/TelaExecucao.tsx` deve chamar o início ao confirmar série, ao
      focar exercício ou ao abrir a tela (FR-173, SC-057)
- [x] T017 [US2] Escrever `tests/integracao/descansoPersistido.test.ts`: o descanso sobrevive à
      releitura e é descartado quando o `sessaoId` não bate (FR-178, FR-183)

**Checkpoint**: o cronômetro funciona, conta certo e avisa.

---

## Phase 5: User Story 3 — O treino não para por causa do cronômetro (P1)

**Goal**: a sessão inteira segue utilizável com a contagem rodando.

**Independent Test**: iniciar a contagem e percorrer a sessão inteira com ela em andamento.

- [x] T018 [US3] Encerrar a contagem ao concluir e ao descartar a sessão, em
      `src/funcionalidades/execucao/TelaExecucao.tsx` (FR-183)
- [x] T019 [US3] Manter a contagem visível e correndo ao trocar de exercício — um descanso por
      sessão, não por exercício (FR-180)
- [x] T020 [US3] Conferir que o aviso de fim não é modal, não captura foco e não exige fechamento
      em `src/funcionalidades/execucao/Descanso.tsx` (FR-181, FR-182)
- [x] T021 [US3] Acrescentar a `tests/e2e/descanso.spec.ts`: com a contagem rodando, registrar uma
      série, trocar de exercício e concluir o treino, sem toque para dispensar o cronômetro
      (SC-060); e conferir que nada começa sozinho ao confirmar uma série (SC-057)
- [x] T022 [US3] Estender `tests/e2e/layout.spec.ts` ou conferir por lá que a tela de execução com a
      contagem visível continua sem rolagem horizontal e com alvos de 44 x 44 pt (Princípio II)

**Checkpoint**: o Princípio II está verificado com o cronômetro na tela.

---

## Phase 6: User Story 4 — Sair do aplicativo e voltar (P2)

**Goal**: a contagem mostra o tempo certo depois de recarregar ou de voltar do segundo plano.

**Independent Test**: iniciar a contagem, recarregar a página, conferir o tempo restante.

- [x] T023 [US4] Acrescentar a `tests/e2e/descanso.spec.ts`: iniciar a contagem, recarregar a página
      e conferir que o restante caiu junto com o relógio, e não voltou ao começo (SC-059)
- [x] T024 [US4] Acrescentar a `tests/e2e/descanso.spec.ts`: com o relógio adiantado além do fim,
      voltar à tela e encontrar o descanso já terminado, e não recém-começado (FR-177)

**Checkpoint**: o cronômetro não mente sobre o tempo decorrido.

---

## Phase 7: Polish

- [x] T025 Rodar a suíte inteira e confirmar os quatro portões constitucionais
- [x] T026 [P] Conferir que nada de descanso aparece no arquivo de backup exportado (SC-061)
- [x] T027 [P] Atualizar `CHANGELOG.md` e a versão em `package.json`
- [x] T028 [P] Registrar em `docs/revisao-constitucional.md` a emenda v1.5.0 e a razão dela
- [x] T029 [P] Acrescentar a `docs/validacao.md` as verificações que exigem aparelho: som no iPhone
      instalado, volta do segundo plano e legibilidade da contagem

---

## Dependencies

- T001 antes de T009.
- US1 (T002–T008) e US2 (T009–T017) são independentes entre si.
- US3 depende de US2. US4 depende de US2.
- Phase 7 depende de tudo.

## Parallel Opportunities

- T002 e T003 com T009 a T012: arquivos distintos, sem dependência.
- T026 a T029 entre si.

## Implementation Strategy

**MVP**: User Story 1 sozinha já entrega valor — é o defeito relatado no uso, e é a correção mais
urgente das duas. Ela pode ser integrada sem nada do cronômetro.

Depois, US2 traz o cronômetro utilizável; US3 e US4 são o que o tornam confiável na academia e não
apenas na mesa.
