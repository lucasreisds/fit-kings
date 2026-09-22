# Feature Specification: Ajustes da execução e intervalo de repetições

**Feature Branch**: `task/execution-fixes-rep-ranges`
**Created**: 2026-09-21
**Status**: Draft
**Input**: Achados do primeiro uso real do aplicativo numa sessão de treino, em iPhone 16

## Contexto

O aplicativo foi usado num treino de verdade pela primeira vez. Cinco problemas apareceram, e
nenhum deles teria sido encontrado pela suíte de testes: quatro são de uso em tela de 430 px com as
mãos ocupadas, e o quinto é um requisito que a especificação original não capturou.

A numeração de requisitos continua a da feature 001: FR-127 em diante, SC-035 em diante.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Alcançar qualquer exercício do treino durante a execução (Priority: P1)

Durante a sessão, o usuário precisa ir de um exercício a outro — para conferir o que vem, para
voltar a um que ficou pela metade, ou porque a academia está cheia e ele trocou a ordem.

Hoje isso não acontece. A faixa de exercícios no topo não é reconhecida como navegação: os itens
parecem cartões de informação. Em 430 px cabem cerca de dois e meio, e o terceiro aparece cortado
sem nenhuma pista de que a faixa rola. Num treino de cinco exercícios, o quarto e o quinto são
inalcançáveis na prática.

**Why this priority**: sem isto o aplicativo não completa um treino real de cinco exercícios. É o
problema que custou boa parte da sessão ao usuário, e o que produziu, em cascata, o problema da
User Story 2.

**Independent Test**: montar um treino de cinco exercícios, iniciar a sessão e alcançar o quinto
exercício sem tentativa e erro.

**Acceptance Scenarios**:

1. **Given** uma sessão com 5 exercícios em tela de 430 px, **When** o usuário olha a tela de
   execução, **Then** fica evidente que há mais exercícios além dos visíveis e como alcançá-los.
2. **Given** a mesma sessão, **When** o usuário arrasta horizontalmente sobre a área do exercício
   corrente, **Then** o aplicativo avança para o exercício seguinte da sessão.
3. **Given** que o usuário está no último exercício, **When** arrasta para avançar, **Then** o
   aplicativo não avança e sinaliza que é o último.
4. **Given** que o usuário está em qualquer exercício, **When** usa a navegação do topo, **Then**
   cada exercício da sessão é alcançável, incluindo o quinto.
5. **Given** um exercício alcançado por navegação, **When** ele aparece, **Then** todos os valores
   já registrados nele continuam íntegros.

---

### User Story 2 - Corrigir e remover séries durante a sessão (Priority: P1)

Erro de digitação e toque acidental acontecem no meio do treino, com a mão suada e o descanso
correndo. Hoje o registro de uma série é irreversível até a sessão terminar: o livro-razão é apenas
leitura, e a correção só existe depois de concluída.

Foi o que aconteceu no uso real. Sem conseguir trocar de exercício, o usuário foi tentando os
botões disponíveis e registrou uma quarta série que não existia no plano. Ela entrou no histórico e
não havia como desfazer.

Agrava o problema um comportamento do aplicativo: terminadas as séries planejadas, ele oferece em
silêncio uma "série extra", em vez de sinalizar que o exercício acabou e apontar o próximo.

**Why this priority**: o Princípio I existe para proteger o dado do usuário, e um registro errado
que não pode ser corrigido no ato envenena o histórico exatamente como um dado perdido. A diferença
entre esta correção e a da sessão concluída é o momento, não a natureza.

**Independent Test**: durante uma sessão, registrar uma série com valor errado, corrigi-la, e
registrar uma série por engano e removê-la — sem concluir a sessão.

**Acceptance Scenarios**:

1. **Given** uma série já registrada na sessão em andamento, **When** o usuário a seleciona,
   **Then** pode alterar carga, repetições e RIR.
2. **Given** uma série registrada por engano, **When** o usuário a remove, **Then** ela deixa de
   contar para o exercício e não aparece no histórico da sessão concluída.
3. **Given** que o usuário removeu a última série registrada, **When** ele registra a próxima,
   **Then** a numeração das séries continua contígua.
4. **Given** um exercício cujas séries planejadas foram todas registradas, **When** o usuário olha a
   tela, **Then** o aplicativo sinaliza que o exercício está completo e oferece o próximo, em vez de
   apresentar uma série adicional como o passo natural.
5. **Given** um exercício completo, **When** o usuário quer mesmo registrar uma série a mais,
   **Then** consegue, por uma ação explícita e distinta de confirmar a série seguinte.

---

### User Story 3 - Planejar repetições como intervalo (Priority: P1)

O treino real do usuário é escrito em intervalos: "supino reto 3x 6-8". A série é cumprida em
qualquer valor dentro do intervalo, e superar o intervalo — não um número único — é o que indica
que dá para aumentar a carga.

Hoje o planejamento aceita só um valor-alvo por série. Quem treina com intervalo precisa escolher
entre registrar a ponta de baixo, e ver o aplicativo indicar aumento cedo demais, ou a de cima, e
ver o aplicativo nunca indicar.

**Why this priority**: sem isto o critério de aumento de carga — o diferencial do produto — dá a
resposta errada na maior parte do treino deste usuário.

**Independent Test**: planejar um exercício em 3x 6-8, executá-lo com 8/8/8 e confirmar que não
indica aumento; repetir com 9/9/9 e confirmar que indica.

**Acceptance Scenarios**:

1. **Given** um exercício sendo planejado, **When** o usuário define as repetições, **Then** pode
   informar um valor único ou um intervalo de mínimo e máximo.
2. **Given** um planejamento de 6-8, **When** o usuário realiza 7 repetições, **Then** a comparação
   apresenta a série como dentro do intervalo.
3. **Given** um planejamento de 6-8, **When** o usuário realiza 5, **Then** a comparação apresenta a
   série como abaixo do intervalo.
4. **Given** um planejamento de 6-8, **When** o usuário realiza 9, **Then** a comparação apresenta a
   série como acima do intervalo.
5. **Given** um planejamento de 3x 6-8 e uma execução de 8/8/8, **When** a progressão é avaliada,
   **Then** não indica aumento de carga.
6. **Given** o mesmo planejamento e uma execução de 9/9/9, **When** a progressão é avaliada,
   **Then** indica aumento de carga.
7. **Given** um treino planejado com valor único antes desta mudança, **When** o usuário o abre,
   **Then** ele continua válido e a avaliação de progressão dele não muda.

---

### User Story 4 - Exercício de peso corporal aparece no progresso (Priority: P2)

Barra fixa, paralelas, flexão e abdominal são feitos sem carga externa. O usuário registrou barra
fixa deixando a carga em branco — que é o gesto natural — e a tela de Progresso mostrou
"0 execuções", apesar de as séries terem repetições registradas.

**Why this priority**: é dado do usuário existente, correto e registrado, que o aplicativo apresenta
como inexistente. Não custa histórico, mas contradiz o que ele fez.

**Independent Test**: registrar duas sessões de barra fixa sem informar carga e confirmar que o
Progresso mostra duas execuções, com evolução legível.

**Acceptance Scenarios**:

1. **Given** um exercício registrado com repetições e sem carga informada, **When** o usuário abre o
   Progresso, **Then** a execução é contada.
2. **Given** um exercício cujas execuções nunca tiveram carga, **When** o usuário abre a evolução
   dele, **Then** a evolução é apresentada em repetições, não em carga.
3. **Given** um exercício com carga em algumas execuções e sem carga em outras, **When** o usuário
   abre a evolução, **Then** o aplicativo apresenta algo coerente e não descarta execuções.
4. **Given** um exercício registrado com carga zero, **When** o usuário abre o Progresso, **Then** o
   comportamento é o mesmo de carga não informada.

---

### Edge Cases

- **Arrastar durante a digitação**: o gesto de trocar de exercício não pode disparar enquanto o
  usuário arrasta dentro de um campo numérico ou de uma área que rola na horizontal.
- **Arrastar no primeiro e no último exercício**: não há para onde ir; o aplicativo não pode parecer
  travado nem sair da sessão.
- **Remover todas as séries de um exercício**: ele volta ao estado de não alcançado, e não ao de não
  realizado — a distinção de FR-125 continua valendo.
- **Remover uma série do meio**: as seguintes são renumeradas, e o vínculo de cada uma com a meta
  que ela cumpria precisa continuar correto.
- **Corrigir a série que a progressão usaria**: a indicação é reconsultada, como já ocorre na
  correção de sessão concluída.
- **Intervalo invertido ou de ponta única**: mínimo maior que máximo, ou os dois iguais.
- **Intervalo com RIR**: o critério de RIR continua valendo como hoje, sobreposto ao de repetições.
- **Série extra num exercício planejado com intervalo**: continua sendo ignorada na avaliação.
- **Arquivo de backup gerado antes desta mudança**: precisa continuar sendo importado sem perda.

---

## Requirements _(mandatory)_

### Navegação entre exercícios

- **FR-127**: O sistema DEVE tornar evidente, na tela de execução, que a sessão tem exercícios além
  dos visíveis na tela, e como alcançá-los.
- **FR-128**: O sistema DEVE permitir alcançar qualquer exercício da sessão a partir da tela de
  execução, sem depender de acerto de posição de toque.
- **FR-129**: O sistema DEVE permitir trocar de exercício por gesto de arrastar horizontalmente na
  tela de execução.
- **FR-130**: O gesto de arrastar NÃO DEVE disparar quando iniciado sobre um campo de entrada ou
  sobre uma área com rolagem horizontal própria.
- **FR-131**: O sistema DEVE sinalizar, ao tentar avançar além do último exercício ou recuar antes
  do primeiro, que não há mais exercícios naquela direção, sem encerrar nem interromper a sessão.
- **FR-132**: A troca de exercício NÃO DEVE alterar nem descartar valor algum já registrado.

### Correção durante a sessão

- **FR-133**: O sistema DEVE permitir corrigir carga, repetições e RIR de uma série já registrada
  enquanto a sessão está em andamento.
- **FR-134**: O sistema DEVE permitir remover uma série registrada enquanto a sessão está em
  andamento, mediante confirmação explícita.
- **FR-135**: A remoção de uma série DEVE renumerar as séries restantes do exercício de forma
  contígua, preservando o vínculo de cada uma com a meta planejada que ela cumpre.
- **FR-136**: A correção e a remoção durante a sessão NÃO DEVEM gerar nova versão da sessão: a
  sessão em andamento ainda não é registro histórico, e o versionamento de FR-114 alcança apenas a
  sessão concluída.
- **FR-137**: O sistema DEVE sinalizar quando todas as séries planejadas de um exercício foram
  registradas, e oferecer o exercício seguinte como próximo passo.
- **FR-138**: O registro de uma série além das planejadas DEVE exigir ação explícita, distinta da
  ação de confirmar a série seguinte.

### Intervalo de repetições planejadas

- **FR-139**: O sistema DEVE permitir planejar as repetições de uma série como um intervalo de
  mínimo e máximo, além do valor único já suportado.
- **FR-140**: O sistema DEVE tratar o valor único como caso particular do intervalo, em que mínimo e
  máximo coincidem, de modo que exista uma única regra de comparação.
- **FR-141**: Na comparação planejado x realizado, uma série DEVE ser apresentada como dentro do
  intervalo quando as repetições realizadas estiverem entre o mínimo e o máximo, inclusive; abaixo,
  quando forem menores que o mínimo; e acima, quando forem maiores que o máximo.
- **FR-142**: O critério de aumento de carga DEVE considerar superada a série cujas repetições
  realizadas forem **estritamente maiores que o máximo** do intervalo planejado.
- **FR-143**: O sistema DEVE recusar intervalo cujo mínimo seja maior que o máximo.
- **FR-144**: Treinos, sessões e arquivos de backup criados antes desta mudança DEVEM continuar
  válidos, e a avaliação de progressão sobre eles NÃO DEVE mudar de resultado.

### Exercício sem carga

- **FR-145**: O sistema DEVE contar como execução, para fins de histórico e de progresso, a série
  válida que não tenha carga informada.
- **FR-146**: O sistema DEVE apresentar a evolução de um exercício cujas execuções nunca tiveram
  carga em termos de repetições, e não de carga.
- **FR-147**: O sistema DEVE tratar carga não informada e carga zero de forma equivalente para fins
  de contagem de execuções e de progresso.

### Key Entities

- **Repetições planejadas**: deixa de ser um valor único e passa a ser um intervalo com mínimo e
  máximo. O valor único é o caso em que os dois coincidem.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-035**: Em um treino de 5 exercícios, o usuário alcança qualquer um deles em no máximo 2
  toques ou 1 gesto, a partir de qualquer outro.
- **SC-036**: 100% dos exercícios de uma sessão são alcançáveis em tela de 430 px de largura.
- **SC-037**: O usuário corrige o valor de uma série registrada por engano, durante a sessão, em
  menos de 10 segundos.
- **SC-038**: Uma série registrada por engano pode ser removida antes da conclusão da sessão, e não
  aparece no histórico em 100% dos casos.
- **SC-039**: Com planejamento de 3x 6-8, a avaliação de progressão indica aumento em 100% das
  execuções de 9/9/9 e em 0% das execuções de 8/8/8, 7/8/8 e 6/6/6.
- **SC-040**: 100% dos treinos planejados com valor único antes desta mudança produzem a mesma
  avaliação de progressão depois dela.
- **SC-041**: Um exercício registrado sem carga informada aparece no Progresso com a contagem
  correta de execuções em 100% dos casos.
- **SC-042**: 100% dos arquivos de backup gerados antes desta mudança continuam sendo importados sem
  perda de dado.

---

## Assumptions

- **Intervalo aberto não é necessário.** "6-8" cobre o caso do usuário; "8 ou mais" e "até 8" não
  foram pedidos e ficam fora.
- **O gesto de arrastar é horizontal.** Arrastar na vertical continua sendo rolagem de conteúdo.
- **Remover série em sessão concluída continua proibido.** FR-113 não muda: o que esta feature
  acrescenta vale apenas enquanto a sessão está em andamento, e a distinção é deliberada — sessão
  concluída é registro histórico, sessão em andamento é rascunho do usuário.
- **A evolução por repetições vale para o exercício, não para a série.** Um exercício é apresentado
  em repetições quando nenhuma de suas execuções registrou carga.
- **O intervalo vale por série.** Séries diferentes do mesmo exercício podem ter intervalos
  diferentes, como já ocorre com o valor único (FR-009).
- **RIR continua como está.** Não ganha intervalo nesta feature.
- **A migração do modelo é aditiva.** O Princípio IV proíbe migração destrutiva, então o intervalo
  entra sem invalidar o que já foi gravado.

---

## Out of Scope

- Intervalo de RIR ou de carga.
- Intervalo aberto em qualquer das pontas.
- Reordenar exercícios durante a sessão em andamento.
- Remover ou acrescentar séries e exercícios em sessão **concluída** — FR-113 permanece.
- Cronômetro de descanso, periodização e qualquer item já fora do escopo da constituição.
