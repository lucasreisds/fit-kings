# Feature Specification: Corrigir o campo "até" do intervalo de repetições

**Feature Branch**: `task/corrigir-campo-ate`
**Created**: 2026-09-23
**Status**: Draft
**Input**: Defeito relatado no uso do editor de treino, após a entrega da feature 002

## Contexto

O campo "até", que define o máximo do intervalo de repetições, não pode ser preenchido. Ele foi
entregue na feature 002 e nunca funcionou na tela.

A investigação, feita com teste de componente antes desta especificação, separou duas coisas:

- **O campo em si está correto.** Recebendo uma série que carrega o valor máximo, ele o exibe.
- **A tela que monta as séries e as entrega ao editor descarta o valor máximo** ao reconstruir cada
  série a partir do registro gravado. O campo é, portanto, sempre renderizado vazio.

A numeração de requisitos continua a das features anteriores: FR-152 em diante, SC-044 em diante.

---

## O efeito é pior do que um campo inerte

Um campo que recusa digitação é visivelmente quebrado. Este não é isso.

Ao digitar, o valor **é gravado**. A tela então volta a mostrar o campo vazio, porque o valor gravado
é descartado na releitura. O usuário não vê o que escreveu e não tem motivo para supor que algo foi
persistido.

Pior: como o campo se esvazia entre uma tecla e outra, **cada dígito substitui o anterior em vez de
compor um número**. Digitar "12" grava 1 e depois 2, deixando 2.

A consequência é que pode haver, agora, treinos com intervalo gravado que o usuário nunca viu nem
pretendeu criar — e que mudam a avaliação de aumento de carga daquele exercício sem explicação
visível.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Preencher e enxergar o intervalo (Priority: P1)

O usuário planeja "3x 6-8": informa 6 em repetições e 8 no campo "até". Espera ver os dois valores,
sair da tela, voltar, e encontrá-los como os deixou.

**Why this priority**: é a funcionalidade inteira da User Story 3 da feature 002, que hoje está
inacessível. Sem isto, o intervalo de repetições foi entregue e não existe para o usuário.

**Independent Test**: planejar 6-8 num exercício, fechar o editor, reabrir, e confirmar que "até"
mostra 8.

**Acceptance Scenarios**:

1. **Given** uma série com intervalo gravado, **When** o usuário abre o editor do exercício,
   **Then** o campo "até" mostra o valor gravado.
2. **Given** uma série de valor único, **When** o usuário abre o editor, **Then** o campo "até"
   aparece vazio, e não preenchido com o valor de repetições.
3. **Given** o campo "até" em foco, **When** o usuário digita um número de dois ou mais dígitos,
   **Then** o campo mostra aquele número inteiro, e a série passa a valer com ele.
4. **Given** uma série com intervalo, **When** o usuário apaga o conteúdo do campo "até", **Then** a
   série volta a ser de valor único.
5. **Given** qualquer alteração no campo "até", **When** o usuário sai do editor e volta, **Then** o
   valor que ele vê é o que ele deixou.

---

### User Story 2 - Desfazer um intervalo gravado sem intenção (Priority: P1)

Durante o período do defeito, digitar no campo gravava valores invisíveis. Um treino pode ter um
intervalo que o usuário não escolheu e não consegue ver.

**Why this priority**: é dado do usuário alterado sem o consentimento dele, e que afeta a avaliação
de aumento de carga. Corrigir o campo sem dar visibilidade ao que foi gravado deixaria o efeito de
pé.

**Independent Test**: com uma série que tenha máximo gravado por engano, abrir o editor, ver o valor,
e apagá-lo.

**Acceptance Scenarios**:

1. **Given** uma série com máximo gravado durante o período do defeito, **When** o usuário abre o
   editor, **Then** o valor está visível no campo "até".
2. **Given** esse valor visível, **When** o usuário o apaga, **Then** a série volta ao valor único e
   a avaliação de progressão dela volta ao que era antes do defeito.
3. **Given** esse valor visível, **When** o usuário o substitui, **Then** o novo valor vale.

---

### User Story 3 - A mesma classe de defeito não reaparece em outro campo (Priority: P2)

O defeito atravessou a suíte inteira sem ser detectado. Existe teste do componente do campo e teste
da regra de domínio do intervalo — mas nenhum que percorra o caminho do registro gravado até a tela
e de volta.

Qualquer campo futuro pode ser esquecido na mesma reconstrução, com o mesmo resultado: gravar sem
mostrar.

**Why this priority**: não corrige nada visível ao usuário hoje. Impede que o mesmo defeito volte
amanhã, num campo diferente, com a mesma invisibilidade.

**Independent Test**: acrescentar mentalmente um campo novo ao planejamento e verificar que a suíte
acusa se ele não chegar à tela.

**Acceptance Scenarios**:

1. **Given** uma série gravada com todos os seus valores, **When** o editor é aberto, **Then** cada
   valor editável aparece no campo correspondente.
2. **Given** um campo editável do planejamento, **When** ele é omitido na reconstrução da série,
   **Then** a suíte acusa a omissão.

---

### Edge Cases

- **Máximo menor que o mínimo**: já recusado pela validação existente; o usuário precisa ver o que
  digitou para poder corrigir.
- **Apagar o campo durante a digitação**: o estado intermediário vazio não pode gravar valor algum
  nem recusar a digitação seguinte.
- **Série já executada**: editar o intervalo de uma série que já foi levada a uma sessão não pode
  alterar o histórico daquela sessão.
- **Vários exercícios abertos**: o campo de um exercício não pode mostrar o valor de outro.
- **Valor colado em vez de digitado**: precisa valer como se tivesse sido digitado.

---

## Requirements _(mandatory)_

### Correção do campo

- **FR-152**: O sistema DEVE exibir, no campo de máximo do intervalo, o valor gravado na série
  planejada.
- **FR-153**: O sistema DEVE preservar todos os valores editáveis de uma série planejada ao montar a
  tela de edição a partir do registro gravado, sem descartar nenhum.
- **FR-154**: O sistema DEVE permitir informar no campo de máximo um número de qualquer quantidade
  de dígitos, compondo o número digitado em vez de reter apenas o último dígito.
- **FR-155**: O sistema DEVE tratar o campo de máximo esvaziado como ausência de intervalo,
  devolvendo a série ao valor único.
- **FR-156**: O sistema DEVE permitir alterar e remover um valor de máximo já gravado, inclusive um
  gravado sem intenção do usuário.
- **FR-157**: Nenhuma escrita de valor planejado DEVE ocorrer sem que o resultado dela fique visível
  ao usuário na mesma tela.

### Proteção contra a reincidência

- **FR-158**: O sistema DEVE ter verificação automatizada de que cada valor editável de uma série
  planejada percorre o caminho do registro gravado até o campo da tela e de volta.
- **FR-159**: A verificação de FR-158 DEVE falhar quando um valor editável for omitido nesse
  caminho, apontando qual foi omitido.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-044**: O valor de máximo gravado numa série aparece no campo correspondente em 100% das
  aberturas do editor.
- **SC-045**: Um número de dois ou mais dígitos digitado no campo de máximo resulta naquele número
  em 100% dos casos.
- **SC-046**: Esvaziar o campo de máximo devolve a série ao valor único em 100% dos casos, e a
  avaliação de progressão passa a ser a de valor único.
- **SC-047**: 100% dos valores editáveis de uma série planejada sobrevivem ao ciclo de gravar, sair
  do editor e reabrir.
- **SC-048**: A omissão de qualquer valor editável na montagem da tela de edição é acusada pela
  suíte de testes, com indicação de qual valor foi omitido.

---

## Assumptions

- **O defeito alcança apenas o campo de máximo.** Repetições, carga e RIR são preservados na
  reconstrução; a investigação confirmou isso, e o teste de FR-158 passa a cobrir os quatro.
- **O descanso planejado não é afetado.** Ele vive no item do treino, não na série, e é editado por
  outro caminho.
- **Não há migração de dados a fazer.** Valores gravados sem intenção durante o período do defeito
  ficam visíveis assim que a correção entrar, e o próprio usuário decide o que fazer com eles.
  Apagá-los automaticamente removeria também os intervalos que ele gravou de propósito, e não há
  como distinguir uns dos outros.
- **A regra de domínio do intervalo está correta** e não é tocada por esta correção. A feature 002 a
  entregou testada, e o defeito é de apresentação.

---

## Out of Scope

- Alterar a regra de comparação ou o critério de aumento de carga.
- Migração automática de valores gravados durante o período do defeito.
- Intervalo para carga ou RIR.
- Qualquer mudança no descanso planejado.
