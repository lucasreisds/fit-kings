# Feature Specification: Séries que acompanham a primeira e referência da última vez no mesmo treino

**Feature Branch**: `task/espelhar-series-e-referencia-anterior`
**Created**: 2026-11-12
**Status**: Draft
**Input**: Pedido de uso. (1) Ao montar um exercício no treino, não precisar digitar três ou quatro
vezes os mesmos valores: depois de preencher a primeira série, as seguintes se preenchem sozinhas.
(2) Durante a execução do treino X, ver discretamente, ao lado de cada série, quantas repetições e
quanta carga foram feitas na mesma série da última vez em que aquele exercício foi feito no treino
X, para ter a referência a superar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Planejar 4x10 com 40 kg digitando uma vez só (Priority: P1)

O usuário acrescenta o supino reto ao treino A e quer 4 séries de 10 repetições com 40 kg. Hoje ele
acrescenta as séries e corrige cada uma. Com esta alteração, ele ajusta a série 1 para 10
repetições e 40 kg e as séries 2, 3 e 4 mostram os mesmos valores, sem que ele toque nelas.

**Why this priority**: É o caso mais comum de planejamento: séries iguais. Hoje cada valor é digitado
uma vez por série, o que multiplica o trabalho e os erros de digitação.

**Independent Test**: Num exercício com 4 séries iguais, alterar repetições, máximo do intervalo,
carga e RIR da série 1 e conferir que as séries 2 a 4 passam a ter os mesmos valores.

**Acceptance Scenarios**:

1. **Given** um exercício com 4 séries de valores iguais, **When** o usuário muda a carga da série 1
   de 0 para 40, **Then** as séries 2, 3 e 4 passam a mostrar 40 kg.
2. **Given** o mesmo exercício, **When** o usuário muda as repetições, o máximo do intervalo ou o
   RIR da série 1, **Then** as séries que acompanham a primeira recebem o mesmo valor no mesmo
   campo.
3. **Given** as 4 séries iguais com 40 kg, **When** o usuário muda a carga da série 4 para 35,
   **Then** só a série 4 muda, e ela deixa de acompanhar a série 1.
4. **Given** a série 4 com 35 kg e as séries 1 a 3 com 40 kg, **When** o usuário muda a carga da
   série 1 para 42,5, **Then** as séries 2 e 3 passam a 42,5 e a série 4 continua em 35.
5. **Given** um exercício com uma única série preenchida, **When** o usuário acrescenta uma série,
   **Then** a nova série nasce com os valores da última e, se eles forem iguais aos da série 1, passa
   a acompanhá-la.
6. **Given** um exercício salvo com séries que acompanhavam a primeira, **When** o usuário fecha o
   treino e o reabre outro dia, **Then** alterar a série 1 continua levando junto as séries que
   estão iguais a ela.

---

### User Story 2 - Ver o que fiz na mesma série da última vez neste treino (Priority: P1)

O usuário está no treino A. Na última vez em que fez o treino A, fez 10, 10 e 10 repetições com
40 kg no supino. Hoje, ao lado da série 1 do supino, aparece "anterior 40 kg × 10"; na série 2, o mesmo;
na série 3, o mesmo. Ele vê o que precisa superar sem sair da tela e tenta fazer 11.

**Why this priority**: É o pedido central. A sobrecarga progressiva depende de saber o que se fez
da última vez, série por série, e hoje a tela mostra só a carga, de qualquer treino.

**Independent Test**: Concluir uma sessão do treino A com valores conhecidos no exercício, iniciar
outra sessão do treino A e conferir a referência ao lado de cada série.

**Acceptance Scenarios**:

1. **Given** a última sessão do treino A com o supino em 10/10/10 repetições com 40 kg, **When** o
   usuário abre o supino numa nova sessão do treino A, **Then** cada uma das séries 1, 2 e 3 mostra
   discretamente "40 kg × 10" como referência da última vez.
2. **Given** a última sessão do treino A com o supino em 10 × 40, 9 × 40 e 8 × 40, **When** o
   usuário vê a série 2, **Then** a referência mostrada é "40 kg × 9", e não a da série 1.
3. **Given** que o supino foi feito no treino B depois da última vez no treino A, **When** o usuário
   executa o treino A, **Then** a referência vem da última sessão do treino A, e não da do treino B.
4. **Given** um exercício que nunca foi feito no treino A, **When** o usuário o executa no treino A,
   **Then** nenhuma referência aparece ao lado das séries, mesmo que ele tenha sido feito em outro
   treino.
5. **Given** a última vez no treino A com 3 séries e hoje 4 séries planejadas, **When** o usuário vê
   a série 4, **Then** ela não mostra referência.
6. **Given** a referência exibida, **When** o usuário olha os campos de repetições e carga da série,
   **Then** nenhum deles foi preenchido a partir da referência.
7. **Given** uma série já confirmada na sessão de hoje, **When** o usuário olha a linha dela, **Then**
   a referência da última vez continua visível ao lado, para comparação.

---

### Edge Cases

- **Série 1 alterada para um valor igual ao de uma série divergente**: a série 4 está com 35 kg e o
  usuário muda a série 1 para 35. A partir daí a série 4 está igual à série 1 e passa a acompanhá-la
  nas próximas alterações. Acompanhar é estar igual, não um estado guardado à parte.
- **Remover a série 1**: a série que se torna a primeira passa a ser a referência das demais.
- **Exercício de dropset**: o planejamento por degraus fica fora desta alteração (ver Out of Scope).
  Na execução, a referência de uma série de dropset mostra o primeiro degrau da série de mesmo
  número da última vez.
- **Série da última vez marcada como não realizada ou sem repetições**: aquela série não mostra
  referência. As outras séries mostram normalmente.
- **Série da última vez sem carga ou com 0 kg**: a referência mostra só as repetições
  (ex.: "anterior 12 reps").
- **Exercício presente duas vezes no mesmo treino**: cada ocorrência busca a referência na ocorrência
  de mesma posição relativa (primeira com primeira, segunda com segunda) da última sessão do treino.
- **Exercício acrescentado fora do plano**: se o mesmo exercício já foi feito numa sessão anterior
  do treino A, a referência aparece; caso contrário, não.
- **Sessão anterior corrigida**: vale a versão vigente da sessão, como em todas as leituras.
- **Última sessão do treino A em que o exercício foi pulado**: a referência vem da sessão mais
  recente do treino A em que o exercício teve ao menos uma série válida.
- **Treino A excluído e recriado com o mesmo nome**: é outro treino; as sessões do antigo não servem
  de referência.

## Requirements *(mandatory)*

### Functional Requirements

#### Séries planejadas que acompanham a primeira

- **FR-187**: Ao alterar um valor da primeira série planejada de um exercício no treino (repetições,
  máximo do intervalo, carga ou RIR), o sistema DEVE aplicar a mesma alteração, no mesmo campo, a
  toda série seguinte que estava com valores idênticos aos da primeira imediatamente antes da
  alteração.
- **FR-188**: Uma série seguinte cujos valores diferem dos da primeira NÃO DEVE ser alterada por uma
  mudança na primeira.
- **FR-189**: Alterar uma série que não seja a primeira DEVE afetar somente aquela série.
- **FR-190**: Acompanhar a primeira série DEVE ser decidido pela igualdade dos valores no momento da
  alteração, sem estado próprio gravado, de modo que o comportamento seja o mesmo ao reabrir o
  treino em outro dia ou em outro aparelho após importação.
- **FR-191**: A alteração aplicada às séries que acompanham a primeira DEVE ser gravada na mesma
  operação que a da primeira série: nunca deve ficar visível ou gravado um estado em que só parte
  delas foi atualizada.
- **FR-192**: Acrescentar uma série DEVE continuar copiando os valores da última série, como hoje.
- **FR-193**: Esta regra vale apenas para o planejamento do treino. Sessões já iniciadas ou
  concluídas NÃO DEVEM ser alteradas por ela.
- **FR-203**: As séries com que um exercício nasce ao ser acrescentado ao treino DEVEM ser
  idênticas entre si, para que todas acompanhem a primeira desde o início. (Acrescentada na
  implementação: o padrão anterior criava a terceira série com RIR diferente, o que a deixava de
  fora do espelhamento no caso mais comum.)

#### Referência da última vez no mesmo treino

- **FR-194**: Na tela de execução, o sistema DEVE exibir ao lado de cada série de um exercício as
  repetições e a carga registradas na série de mesmo número da execução anterior desse exercício
  **no mesmo treino** da sessão em andamento.
- **FR-195**: A execução anterior no mesmo treino é a sessão concluída mais recente, originada do
  mesmo treino, em que o exercício teve ao menos uma série válida, lida na versão vigente.
- **FR-196**: Quando não houver execução anterior do exercício no mesmo treino, o sistema NÃO DEVE
  exibir referência por série, mesmo que haja execução em outro treino.
- **FR-197**: Uma série sem correspondente válido na execução anterior (inexistente, não realizada
  ou sem repetições) NÃO DEVE exibir referência.
- **FR-198**: A referência DEVE ser apenas exibida. Ela NÃO DEVE preencher, sugerir dentro do campo,
  nem alterar qualquer valor da série (Princípio II).
- **FR-199**: A referência DEVE ser visualmente secundária aos campos da série — menor e de menor
  contraste que os valores editáveis, mas com contraste mínimo de 4,5:1 — e NÃO DEVE reduzir a área
  de toque dos controles da série nem empurrar a confirmação da série para fora da tela.
- **FR-200**: A referência DEVE permanecer visível nas séries já confirmadas da sessão em andamento.
- **FR-201**: A linha atual "Última vez" com a carga da execução anterior em qualquer treino e a
  ação de aplicá-la por toque (FR-083) NÃO DEVEM mudar.
- **FR-202**: A referência NÃO DEVE ser gravada na sessão, no histórico nem no arquivo de backup.
  Ela é consultada a cada vez (Princípio V).

### Key Entities

Nenhuma entidade nova. A alteração usa as séries planejadas do item de treino e as sessões
concluídas já existentes, com o vínculo que cada sessão guarda com o treino que a originou.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-062**: Planejar 4 séries iguais de repetições, carga e RIR custa no máximo um preenchimento
  de cada campo, na série 1, em 100% dos casos.
- **SC-063**: Uma série ajustada para valores próprios nunca é alterada por mudança na série 1
  enquanto permanecer diferente dela, em 100% das tentativas.
- **SC-064**: Ao executar um exercício já feito no mesmo treino, a referência da última vez aparece
  em 100% das séries que têm correspondente válido, e em 0% das que não têm.
- **SC-065**: Num exercício nunca feito no treino em andamento, nenhuma referência por série aparece
  em 100% dos casos, mesmo havendo execução em outro treino.
- **SC-066**: Nenhum campo de série é preenchido a partir da referência em 100% das sessões.
- **SC-067**: Registrar uma série continua custando no máximo 3 toques e menos de 5 segundos com a
  referência visível.

## Assumptions

- "Acompanhar a primeira" é definido por igualdade de todos os valores da série (repetições,
  máximo do intervalo, carga e RIR). Ter um único campo diferente já basta para a série deixar de
  acompanhar. É a regra mais previsível e dispensa qualquer marcação extra.
- A série 1 é sempre a fonte; não existe cadeia (alterar a 2 não leva a 3).
- Para o texto da referência adota-se "anterior 40 kg × 10", na mesma ordem da série registrada.
  A forma exata é decisão de desenho (ver research.md D7).
- O vínculo da sessão com o treino é o que ela já guarda desde o início. Um treino excluído não
  pode mais ser executado, e um treino recriado com o mesmo nome tem outra identidade — por isso
  as sessões do antigo nunca servem de referência para ele.

## Out of Scope

- Espelhamento no planejamento de dropset (degraus).
- Espelhamento durante a execução: lá a herança de carga entre séries (FR-085) continua sendo a
  única regra.
- Exibir RIR na referência.
- Mudar a linha "Última vez" para considerar só o mesmo treino.
- Comparar com mais de uma execução anterior ou mostrar tendência.
