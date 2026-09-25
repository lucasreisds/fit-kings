# Feature Specification: Gatilho de progressão na faixa de repetições

**Feature Branch**: `task/dupla-progressao`
**Created**: 2026-09-24
**Status**: Draft
**Input**: Revisão do critério de aumento de carga à luz do protocolo de dupla progressão

## Contexto

A feature 002 acrescentou o planejamento em faixa — "3x 6-8" — e definiu que o aumento de carga é
indicado quando as repetições realizadas **passam** do máximo da faixa (FR-142).

Na revisão, isso se revelou um erro de desenho: **quem segue uma faixa não passa do teto dela.** A
faixa é a prescrição. Trabalha-se dentro dela e para-se em 8. O gatilho, portanto, nunca dispara
para quem usa o recurso como ele foi pedido — a faixa foi entregue e o aviso que ela deveria
alimentar está inerte.

É também o contrário do protocolo de dupla progressão, no qual **atingir o teto é o gatilho**: sobe
as repetições treino após treino até o topo da faixa, e aí aumenta o peso, o que faz as repetições
caírem para a base e reinicia o ciclo.

A numeração continua: FR-160 em diante, SC-049 em diante.

---

## A distinção que a correção introduz

Faixa e valor único **não são a mesma prescrição escrita de formas diferentes**, e é por isso que
o gatilho não pode ser o mesmo:

| Prescrição          | O que ela diz                                       | Quando indicar aumento |
| ------------------- | --------------------------------------------------- | ---------------------- |
| **Faixa** `6-8`     | "trabalhe entre 6 e 8; dominar o teto é o objetivo" | ao **atingir** 8       |
| **Valor único** `8` | "faça 8; sobrando, o peso está leve"                | ao **passar** de 8     |

Na faixa, o máximo é a **meta a alcançar** — chegar nele é a conquista. No valor único, o número é a
**expectativa** — cumpri-la não é superá-la.

Essa diferença preserva integralmente o comportamento de todo treino planejado com valor único, que
é o que existe no histórico do usuário.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A faixa passa a indicar aumento ao ser dominada (Priority: P1)

O usuário planeja "3x 6-8". Nas primeiras semanas faz 6, 7, 7. Numa sessão faz 8 nas três séries —
dominou a faixa. Espera que o aplicativo diga que é hora de subir o peso.

**Why this priority**: sem isto o planejamento em faixa não alimenta o aviso de progressão, que é o
diferencial do produto. O recurso foi entregue e não funciona para o propósito dele.

**Independent Test**: planejar 3x 6-8, registrar 8/8/8 e confirmar que o aviso aparece.

**Acceptance Scenarios**:

1. **Given** um planejamento de 3x 6-8, **When** o usuário realiza 8/8/8, **Then** o aplicativo
   indica que dá para aumentar a carga.
2. **Given** o mesmo planejamento, **When** o usuário realiza 9/9/9, **Then** também indica.
3. **Given** o mesmo planejamento, **When** o usuário realiza 7/7/7, **Then** não indica — ainda há
   faixa a percorrer.
4. **Given** o mesmo planejamento, **When** o usuário realiza 8/8/7, **Then** não indica — uma série
   não alcançou o teto.
5. **Given** o mesmo planejamento, **When** o usuário realiza 5/5/5, **Then** não indica.

---

### User Story 2 - O valor único continua como sempre foi (Priority: P1)

Todo treino planejado antes da faixa existir usa valor único, e o histórico inteiro do usuário
depende dessa avaliação não mudar.

**Why this priority**: mudar em silêncio o resultado de histórico já registrado é o que o Princípio
I proíbe.

**Independent Test**: os dez casos de fronteira do portão 4 rodam inalterados.

**Acceptance Scenarios**:

1. **Given** um planejamento de 3x8 sem faixa, **When** o usuário realiza 8/8/8, **Then** **não**
   indica aumento.
2. **Given** o mesmo, **When** o usuário realiza 9/9/9, **Then** indica.
3. **Given** qualquer treino planejado antes desta mudança, **When** a progressão é avaliada,
   **Then** o resultado é idêntico ao de antes.

---

### User Story 3 - Enxergar que o teto foi alcançado (Priority: P2)

Numa faixa de 6-8, realizar 8 é a conquista que dispara o aumento. Hoje a comparação apresenta isso
apenas como "na meta", igual a ter feito 6 ou 7 — o usuário não vê a diferença entre estar dentro da
faixa e tê-la dominado.

**Why this priority**: sem isto, o aviso aparece e a comparação ao lado não explica por quê. O
Princípio V exige que o usuário consiga consultar os dados que fundamentam qualquer indicação.

**Independent Test**: com faixa 6-8, registrar 7 e depois 8, e ver que a apresentação distingue os
dois.

**Acceptance Scenarios**:

1. **Given** uma faixa de 6-8, **When** o usuário realiza 7, **Then** a série é apresentada como
   dentro da faixa.
2. **Given** a mesma faixa, **When** realiza 8, **Then** a série é apresentada como **no topo** da
   faixa, distinguível de dentro.
3. **Given** a mesma faixa, **When** realiza 9, **Then** acima da faixa.
4. **Given** um planejamento de valor único, **When** realiza o valor exato, **Then** a apresentação
   é a de sempre, sem noção de topo.

---

### Edge Cases

- **Faixa de pontas iguais** (`8-8`): é a forma explícita do valor único e deve se comportar como
  tal — cumprir não é superar.
- **RIR abaixo do planejado com o teto alcançado**: o critério de RIR continua se sobrepondo e
  impede a indicação. Alcançar o teto com esforço maior não é dominar a faixa.
- **Série extra além das planejadas**: continua ignorada.
- **Série planejada sem registro ou marcada como não realizada**: continua invalidando.
- **Faixa alcançada em parte das séries**: não indica; o protocolo exige o teto em todas.

---

## Requirements _(mandatory)_

- **FR-160**: O sistema DEVE indicar aumento de carga quando, num planejamento **em faixa**, as
  repetições realizadas forem **maiores ou iguais ao máximo** da faixa em todas as séries
  planejadas.
- **FR-161**: O sistema DEVE manter, num planejamento de **valor único**, a indicação apenas quando
  as repetições realizadas forem **estritamente maiores** que o valor planejado.
- **FR-162**: O sistema DEVE tratar faixa de pontas iguais como valor único para fins de FR-161.
- **FR-163**: O critério de RIR DEVE continuar se sobrepondo ao de repetições, impedindo a indicação
  quando o RIR realizado ficar abaixo do planejado.
- **FR-164**: O sistema DEVE apresentar, na comparação planejado x realizado de um planejamento em
  faixa, a distinção entre estar dentro da faixa e ter alcançado o seu topo.
- **FR-165**: A avaliação de progressão de todo treino planejado com valor único NÃO DEVE mudar de
  resultado em consequência desta alteração.

- **FR-166**: Alterações consecutivas a campos da mesma série planejada DEVEM todas persistir,
  independentemente da velocidade do aparelho. Nenhuma alteração pode desfazer a anterior.

**FR-142 é substituído por FR-160 e FR-161.**

---

## Success Criteria _(mandatory)_

- **SC-049**: Com planejamento de 3x 6-8, a indicação de aumento aparece em 100% das execuções de
  8/8/8 e de 9/9/9.
- **SC-050**: Com o mesmo planejamento, a indicação não aparece em nenhuma execução de 7/7/7, 8/8/7
  ou 5/5/5.
- **SC-051**: 100% dos treinos planejados com valor único produzem a mesma avaliação de antes desta
  alteração.
- **SC-052**: Numa faixa, a série que alcança o topo é apresentada de forma distinguível da que fica
  dentro da faixa, em 100% dos casos.
- **SC-053**: Preencher o mínimo e o máximo de uma série em sequência imediata grava os dois valores
  em 100% das tentativas, inclusive com a CPU estrangulada em 20x.

---

## Assumptions

- **O ciclo de reinício é do usuário, não do aplicativo.** O protocolo prevê que, aumentado o peso,
  as repetições caiam para a base da faixa. Quem reedita o plano é o usuário; o aplicativo indica e
  não altera planejamento por conta própria.
- **O aplicativo não sugere quanto aumentar.** O protocolo fala em 2% a 5%. Isso é escopo novo e
  fica de fora desta correção.
- **A progressão de peso direta continua fora de escopo** — repetições fixas com peso subindo a cada
  treino, para multiarticulares. É uma decisão separada, ainda não tomada.
- **Nenhuma migração.** A alteração muda apenas a avaliação de planejamentos em faixa, e faixa só
  existe desde a versão anterior.

---

## Out of Scope

- Sugerir o incremento de carga em porcentagem ou quilos.
- Reescrever o planejamento automaticamente após o aumento.
- Progressão de peso direta para multiarticulares.
- Qualquer noção de progressão por volume, densidade ou número de exercícios.
