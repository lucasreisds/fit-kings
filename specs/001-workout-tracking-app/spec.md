# Feature Specification: Aplicativo de Treinos de Academia

**Feature Directory**: `specs/001-workout-tracking-app`

**Created**: 2026-09-16

**Status**: Draft

**Input**: Descrição do usuário: aplicativo mobile-first para montar, executar e acompanhar treinos de academia, com histórico completo, comparação planejado x realizado, aviso de possibilidade de aumento de carga e base de dados preparada para análises futuras com IA.

## Clarifications

### Session 2026-09-17

- Q: Os treinos e o histórico devem existir apenas no aparelho, ou o usuário precisa de conta para acessá-los em outro dispositivo e recuperá-los se trocar de celular? (FR-062) → A: Opção C — conta de usuário com sincronização automática em nuvem.
- Q: Ao adicionar um exercício a um treino, o usuário escolhe de uma lista pronta, digita o nome livremente, ou as duas coisas? (FR-011) → A: Opção A — catálogo de exercícios pré-cadastrado (curado pelo proprietário do aplicativo) somado a exercícios personalizados criados pelo usuário, cada exercício com identificação estável que preserva o histórico e a comparação de desempenho ao longo do tempo.
- Q: O que exatamente conta como "superou a meta" para o aplicativo avisar que dá para aumentar a carga? (FR-043) → A: Repetições realizadas estritamente maiores que as planejadas em todas as séries E RIR realizado maior ou igual ao RIR planejado nas séries em que o RIR foi informado; sem RIR informado, vale apenas o critério de repetições.
- Q: Quando o usuário inicia um treino, os campos já vêm preenchidos com a carga do plano ou com a carga realmente usada na última execução? (FR-016, FR-017) → A: Nenhuma das duas — a carga nunca vem pré-preenchida entre sessões. A carga da última execução é exibida como informação no cabeçalho do exercício, com opção de aplicar por toque. Dentro da mesma execução, a série seguinte herda a carga informada na série anterior. Repetições e RIR planejados continuam vindo do plano, por serem a base de comparação de FR-043.
- Q: O usuário pode trocar ou acrescentar um exercício que não está no plano durante a execução? (FR-016, FR-023) → A: Sim — a sessão continua partindo de um treino salvo, mas permite adicionar exercícios fora do plano e pular exercícios planejados. Exercício planejado que termine sem nenhuma série válida não conta como execução finalizada para FR-043 e a indicação ativa anterior permanece como referência. Exercício adicionado fora do plano é registrado normalmente no histórico, não gera indicação de progressão naquela sessão por não ter metas planejadas, e passa a ser avaliado quando for planejado em um treino.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar e manter treinos (Priority: P1)

Como praticante de musculação, quero montar meus treinos no aplicativo — escolhendo os exercícios, a ordem deles e definindo séries, repetições, carga e RIR planejados — para ter o treino pronto e sempre disponível quando chegar à academia.

**Why this priority**: Sem um treino cadastrado não existe nada para executar nem para registrar. É a base de todas as demais jornadas e já entrega valor sozinha: substitui a anotação em papel ou em aplicativo de notas.

**Independent Test**: Pode ser testada isoladamente criando um treino com vários exercícios, reordenando-os, editando os valores planejados, fechando e reabrindo o aplicativo e confirmando que o treino permanece salvo e íntegro.

**Acceptance Scenarios**:

1. **Given** que não possuo nenhum treino salvo, **When** crio um treino com nome e adiciono três exercícios definindo séries, repetições, carga e RIR planejados, **Then** o treino aparece na minha lista de treinos com os exercícios na ordem em que foram adicionados.
2. **Given** um treino salvo com cinco exercícios, **When** movo o quinto exercício para a segunda posição, **Then** a nova ordem é mantida ao sair e voltar à tela do treino.
3. **Given** um treino salvo, **When** altero a carga planejada de um exercício e salvo, **Then** o novo valor é exibido nas próximas visualizações e execuções desse treino.
4. **Given** um treino salvo, **When** solicito sua exclusão, **Then** o sistema pede confirmação e, após confirmar, o treino deixa de aparecer na lista de treinos disponíveis para execução.
5. **Given** que estou adicionando um exercício ao treino, **When** escolho a abordagem de série "dropset", **Then** posso definir os degraus de carga e repetições dessa abordagem sem precisar criar exercícios separados.

---

### User Story 2 - Executar o treino registrando o que foi realizado (Priority: P2)

Como praticante em plena execução do treino, quero iniciar um treino salvo e registrar, série a série, a carga usada, as repetições realizadas e o RIR realizado, com o mínimo de toques possível, para não perder tempo nem quebrar o ritmo entre as séries.

**Why this priority**: É o momento de uso mais frequente e mais crítico do aplicativo — o usuário está de pé, com as mãos ocupadas e com o descanso correndo. Depende da US1 e é o que alimenta todo o histórico.

**Independent Test**: Pode ser testada iniciando um treino existente, registrando todas as séries de todos os exercícios e concluindo a sessão; ao final, o resumo mostra o que foi planejado e o que foi realizado.

**Acceptance Scenarios**:

1. **Given** um treino salvo, **When** inicio sua execução, **Then** o sistema cria uma sessão em andamento exibindo as repetições e o RIR planejados de cada série, com o campo de carga vazio e a carga da última execução visível no cabeçalho do exercício.
2. **Given** uma sessão em andamento no exercício "Supino reto", **When** registro a carga, as repetições e o RIR realizados da série 1, **Then** a série é marcada como concluída sem que eu precise sair da tela de execução do treino.
3. **Given** um exercício com RIR planejado 2, **When** registro RIR realizado 1, **Then** o aplicativo exibe os dois valores de forma distinta e sinaliza visualmente a diferença entre planejado e realizado.
4. **Given** uma sessão em andamento, **When** realizo uma série a mais do que o planejado para um exercício, **Then** consigo adicionar essa série extra e ela é registrada como parte da execução.
5. **Given** que registrei a série 1 de um exercício com 40 kg, **When** avanço para a série 2 do mesmo exercício, **Then** o campo de carga já vem com 40 kg, herdado da série anterior, e posso alterá-lo.
6. **Given** um exercício com execução anterior registrada a 42,5 kg, **When** o inicio em uma nova sessão, **Then** vejo 42,5 kg no cabeçalho do exercício e consigo aplicar esse valor ao campo de carga com um único toque.
7. **Given** uma sessão em andamento e o aparelho do exercício planejado ocupado, **When** adiciono um exercício que não está no plano, **Then** consigo registrar suas séries normalmente e elas passam a integrar o histórico daquela sessão.
8. **Given** uma sessão em andamento, **When** pulo um exercício ou uma série, **Then** posso marcá-lo como não realizado e concluir a sessão sem que os dados dos demais exercícios sejam afetados.
9. **Given** todas as séries registradas, **When** concluo a sessão, **Then** vejo um resumo com a comparação planejado x realizado de cada exercício e a sessão passa a constar no histórico.

---

### User Story 3 - Retomar um treino interrompido sem perder dados (Priority: P3)

Como praticante que é interrompido durante o treino — troca de aplicativo, atende uma ligação, bloqueia a tela ou sai da academia e volta depois —, quero que tudo o que já registrei seja preservado e que eu consiga continuar exatamente de onde parei.

**Why this priority**: A perda de dados no meio do treino destrói a confiança no aplicativo e faz o usuário voltar ao papel. É um requisito de confiabilidade que sustenta a US2.

**Independent Test**: Pode ser testada registrando parte de um treino, minimizando o aplicativo, usando outros aplicativos, forçando o encerramento e reabrindo — os dados registrados devem estar íntegros e a sessão deve ser retomável.

**Acceptance Scenarios**:

1. **Given** uma sessão em andamento com quatro séries registradas, **When** minimizo o aplicativo, uso outro aplicativo e retorno, **Then** as quatro séries continuam registradas e a sessão segue em andamento no mesmo ponto.
2. **Given** uma sessão em andamento, **When** navego para o histórico e volto para a execução, **Then** nenhum valor preenchido é perdido.
3. **Given** uma sessão em andamento com séries já confirmadas, **When** o aplicativo é encerrado inesperadamente e eu o abro novamente, **Then** o sistema me oferece retomar a sessão em andamento com as séries já confirmadas preservadas.
4. **Given** uma sessão em andamento aberta há muito tempo sem novos registros, **When** abro o aplicativo, **Then** o sistema me pergunta se desejo retomar, concluir ou descartar a sessão, em vez de deixá-la pendente indefinidamente.

---

### User Story 4 - Consultar o histórico de treinos realizados (Priority: P4)

Como praticante, quero consultar os treinos que já realizei, vendo os exercícios, as séries, as cargas, as repetições e o RIR registrados em cada um, para revisar o que venho fazendo e comparar diferentes execuções do mesmo exercício.

**Why this priority**: Transforma o registro em informação útil e é pré-requisito da progressão assistida (US5 e US6). Vem depois da execução porque só faz sentido quando já existe histórico.

**Independent Test**: Pode ser testada com sessões concluídas previamente, abrindo o histórico, entrando em uma sessão específica e listando todas as execuções anteriores de um exercício isolado.

**Acceptance Scenarios**:

1. **Given** cinco sessões concluídas, **When** abro o histórico, **Then** vejo as sessões ordenadas da mais recente para a mais antiga, com data e nome do treino.
2. **Given** uma sessão concluída no histórico, **When** a abro, **Then** vejo todos os exercícios realizados e, para cada série, a carga, as repetições e o RIR registrados, junto dos valores que estavam planejados.
3. **Given** um exercício executado em várias sessões, **When** consulto o histórico desse exercício, **Then** vejo suas execuções ao longo do tempo em uma única lista comparável.
4. **Given** uma sessão concluída, **When** o treino de origem é posteriormente editado ou excluído, **Then** o registro histórico permanece inalterado, preservando o que foi planejado e realizado naquela data.

---

### User Story 5 - Receber aviso de possibilidade de aumento de carga (Priority: P5)

Como praticante que busca progredir, quero que o aplicativo identifique quando superei a meta planejada de um exercício e me avise, no momento em que eu for executar aquele exercício novamente, que existe a possibilidade de aumentar a carga.

**Why this priority**: É o principal diferencial do produto — o histórico deixa de ser um arquivo passivo e passa a apoiar a decisão de progressão. Depende de execução e histórico já existirem.

**Independent Test**: Pode ser testada criando um histórico controlado (planejado 3x8, realizado 9, 9 e 9) e iniciando um novo treino com o mesmo exercício, verificando que o aviso aparece no contexto correto e com os dados anteriores corretos.

**Acceptance Scenarios**:

1. **Given** que na execução anterior de "Supino reto" o planejado era 3 séries de 8 repetições e realizei 9, 9 e 9, **When** inicio um novo treino que contém "Supino reto", **Then** o aplicativo exibe, no contexto desse exercício, a informação do desempenho anterior e o aviso de que é possível aumentar a carga.
2. **Given** um aviso de progressão exibido durante o treino, **When** continuo registrando minhas séries, **Then** o aviso não bloqueia, não interrompe e não exige interação para que eu prossiga.
3. **Given** um exercício que estou realizando pela primeira vez, **When** inicio o treino, **Then** nenhum aviso de progressão é exibido para esse exercício.
4. **Given** que na execução anterior não atingi as repetições planejadas, **When** executo o exercício novamente, **Then** o aplicativo exibe o desempenho anterior sem sugerir aumento de carga.
5. **Given** um aviso de progressão exibido, **When** o consulto, **Then** consigo ver em que dados ele se baseia (carga, repetições, séries, RIR planejado e realizado da execução anterior).

---

### User Story 6 - Acompanhar a evolução das cargas ao longo do tempo (Priority: P6)

Como praticante, quero visualizar como a carga de cada exercício evoluiu ao longo das semanas e dos meses, para enxergar meu progresso de forma consolidada e me manter motivado.

**Why this priority**: Entrega valor de longo prazo e reforça a retenção, mas não é necessária para treinar no dia a dia; só se torna significativa após várias semanas de uso.

**Independent Test**: Pode ser testada com histórico de várias semanas, abrindo a visão de evolução de um exercício e conferindo que os pontos correspondem às cargas registradas nas respectivas datas.

**Acceptance Scenarios**:

1. **Given** oito semanas de histórico de "Agachamento", **When** abro a evolução desse exercício, **Then** vejo a progressão das cargas ao longo do tempo, identificando a data de cada execução.
2. **Given** a visão de evolução de um exercício, **When** seleciono um ponto do período, **Then** consigo acessar os detalhes da sessão correspondente.
3. **Given** um exercício sem histórico suficiente, **When** abro sua evolução, **Then** recebo uma mensagem explicando que ainda faltam execuções registradas, em vez de uma tela vazia.

---

### User Story 7 - Acessar meus treinos em qualquer dispositivo (Priority: P7)

Como praticante, quero entrar na minha conta em qualquer aparelho e encontrar meus treinos e todo o meu histórico, para não depender de um único celular e não perder anos de registro se trocar de aparelho.

**Why this priority**: A conta é pré-requisito estrutural de todas as demais jornadas, mas o valor percebido da sincronização só aparece depois que existe histórico acumulado ou um segundo dispositivo em uso. Por isso é construída cedo e priorizada por último em termos de entrega de valor ao usuário.

**Independent Test**: Pode ser testada criando uma conta, cadastrando treinos e registrando sessões em um aparelho, entrando com a mesma conta em outro aparelho e confirmando que treinos e histórico aparecem íntegros.

**Acceptance Scenarios**:

1. **Given** que não possuo conta, **When** me cadastro e faço login, **Then** passo a ter um espaço de dados próprio, isolado do de qualquer outro usuário.
2. **Given** treinos e histórico registrados no celular, **When** faço login com a mesma conta em um tablet, **Then** os mesmos treinos e o mesmo histórico ficam disponíveis nesse aparelho.
3. **Given** que estou sem conexão na academia, **When** executo e concluo um treino inteiro, **Then** consigo registrar tudo normalmente e, ao recuperar a conexão, os dados são sincronizados sem intervenção minha.
4. **Given** um aparelho perdido ou trocado, **When** instalo o aplicativo em um novo aparelho e faço login, **Then** recupero meus treinos e meu histórico completo.
5. **Given** que estou com a sincronização pendente, **When** consulto o aplicativo, **Then** vejo de forma discreta que existem dados ainda não sincronizados, sem que isso bloqueie meu uso.

---

### Edge Cases

- **Treino editado após execuções**: o usuário altera séries, cargas ou exercícios de um treino que já foi executado — o histórico anterior deve permanecer exatamente como foi registrado.
- **Treino excluído com histórico**: excluir um treino não pode apagar as sessões já concluídas a partir dele.
- **Exercício removido ou renomeado**: o histórico e a comparação ao longo do tempo devem continuar coerentes para as execuções anteriores.
- **Séries a mais ou a menos que o planejado**: o usuário faz 4 séries onde planejou 3, ou abandona o exercício na 2ª de 4 séries.
- **Exercício ou série pulada**: deve ser distinguível de "não registrada" para não contaminar as análises de progressão.
- **Exercício planejado totalmente pulado**: nenhuma série válida registrada — não conta como nova execução e a indicação de progressão anterior daquele exercício permanece ativa.
- **Exercício adicionado fora do plano**: registrado no histórico sem metas planejadas, sem gerar indicação de progressão naquela sessão.
- **Campos parcialmente preenchidos**: o usuário registra carga e repetições, mas não informa o RIR realizado.
- **Sessão abandonada**: sessão iniciada e nunca concluída, permanecendo aberta por dias.
- **Duas sessões simultâneas**: o usuário tenta iniciar um novo treino com outra sessão ainda em andamento.
- **Exercício sem carga externa**: exercícios de peso corporal ou com carga zero, onde a progressão se dá por repetições.
- **Primeira execução de um exercício**: não há base histórica para comparação nem para aviso de progressão.
- **Empate de desempenho**: o realizado é idêntico ao planejado em todas as séries — não deve gerar aviso de aumento de carga.
- **Desempenho irregular entre séries**: planejado 3x8 e realizado 10, 8 e 6 — não atende ao critério de FR-043, pois nem todas as séries superaram as repetições planejadas, e nenhum aviso de aumento de carga é gerado.
- **Dropset**: o registro precisa acomodar múltiplos degraus de carga e repetições dentro de uma mesma série.
- **Conflito de sincronização**: o mesmo treino é editado em dois aparelhos enquanto ambos estão sem conexão.
- **Sessão em andamento e múltiplos aparelhos**: o usuário inicia um treino no celular e abre o aplicativo no tablet antes de concluí-lo.
- **Primeiro login em aparelho novo**: sincronização inicial de um histórico extenso, possivelmente em rede lenta.
- **Conexão perdida no meio da sincronização**: o envio é interrompido parcialmente e precisa ser retomado sem duplicar sessões.
- **Logout com alterações pendentes**: o usuário tenta sair da conta antes de as alterações locais serem sincronizadas.
- **Armazenamento do dispositivo cheio** durante o registro de uma série.
- **Data e hora do dispositivo alteradas** entre sessões, afetando a ordenação do histórico.
- **Histórico extenso**: centenas de sessões acumuladas ao longo de anos, sem degradação perceptível na consulta.
- **Uso em tablet e em telas pequenas**: as ações de registro devem permanecer acessíveis em ambos os extremos de tamanho de tela.

## Requirements *(mandatory)*

### Functional Requirements

#### Gestão de treinos

- **FR-001**: O sistema DEVE permitir que o usuário crie um treino identificado por um nome.
- **FR-002**: O sistema DEVE permitir editar um treino existente, incluindo seu nome, seus exercícios e os valores planejados.
- **FR-003**: O sistema DEVE permitir excluir um treino, mediante confirmação explícita do usuário.
- **FR-004**: O sistema DEVE exibir a lista de treinos salvos do usuário.
- **FR-005**: Os usuários DEVEM poder adicionar um ou mais exercícios a um treino.
- **FR-006**: Os usuários DEVEM poder remover exercícios de um treino.
- **FR-007**: Os usuários DEVEM poder alterar a ordem dos exercícios dentro de um treino, e essa ordem DEVE ser preservada e respeitada durante a execução.
- **FR-008**: O sistema DEVE permitir definir, por exercício do treino, a quantidade de séries planejadas, as repetições planejadas, a carga planejada e o RIR planejado.
- **FR-009**: O sistema DEVE permitir que os valores planejados variem entre as séries de um mesmo exercício, e não apenas um valor único para todas elas.
- **FR-010**: O sistema DEVE persistir os treinos criados, mantendo-os disponíveis para execuções futuras após o fechamento e a reabertura do aplicativo.
- **FR-011**: O sistema DEVE permitir que o usuário selecione o exercício a ser adicionado ao treino a partir do catálogo de exercícios, conforme FR-071 a FR-077.

#### Abordagens de série

- **FR-012**: O sistema DEVE suportar a abordagem de séries tradicionais, em que cada série possui carga, repetições e RIR próprios.
- **FR-013**: O sistema DEVE suportar a abordagem dropset, em que uma mesma série contém múltiplos degraus com cargas e repetições distintas, registrados de forma encadeada.
- **FR-014**: O sistema DEVE tratar a abordagem de série como um conceito extensível, permitindo que novos tipos sejam adicionados posteriormente sem exigir alteração na estrutura dos treinos e do histórico já existentes.
- **FR-015**: O sistema DEVE registrar, no histórico, qual abordagem foi utilizada em cada exercício executado.

#### Execução do treino

- **FR-016**: Os usuários DEVEM poder iniciar a execução de um treino previamente criado, gerando uma sessão de treino.
- **FR-017**: O sistema DEVE preservar, na sessão iniciada, uma cópia dos valores planejados vigentes no momento do início, de modo que alterações posteriores no treino não modifiquem sessões já iniciadas ou concluídas.
- **FR-018**: O sistema DEVE permitir registrar, para cada série executada, a carga utilizada, as repetições realizadas e o RIR realizado.
- **FR-019**: O sistema DEVE tratar RIR planejado e RIR realizado como dados distintos e independentes, exibindo ambos ao usuário.
- **FR-020**: O sistema DEVE exibir, durante a execução, a comparação entre o planejado e o realizado de cada série de forma visualmente distinguível.
- **FR-021**: O sistema DEVE permitir registrar uma série completa sem exigir navegação para outra tela.
- **FR-022**: O sistema DEVE manter as ações mais frequentes da execução (registrar série, avançar de exercício, ajustar valores) acessíveis a partir da tela de execução do treino.
- **FR-023**: O sistema DEVE permitir adicionar séries além das planejadas durante a execução.
- **FR-024**: O sistema DEVE permitir marcar uma série ou um exercício como não realizado, distinguindo essa condição de um registro simplesmente ausente.
- **FR-025**: O sistema DEVE permitir concluir a sessão de treino, encerrando-a e disponibilizando um resumo com a comparação planejado x realizado.
- **FR-026**: O sistema DEVE permitir descartar uma sessão em andamento, mediante confirmação explícita.
- **FR-027**: O sistema DEVE registrar a data e o horário de início e de conclusão de cada sessão.
- **FR-028**: O sistema DEVE impedir que duas sessões fiquem em andamento simultaneamente, oferecendo ao usuário retomar, concluir ou descartar a sessão pendente antes de iniciar outra.
- **FR-029**: O sistema DEVE permitir que o usuário registre uma série mesmo quando informações opcionais, como o RIR realizado, não forem preenchidas.

#### Persistência durante o treino

- **FR-030**: O sistema DEVE preservar todos os valores já registrados em uma sessão em andamento quando o usuário navegar para outra tela do aplicativo.
- **FR-031**: O sistema DEVE preservar o estado da sessão em andamento quando o aplicativo for minimizado, quando o usuário alternar para outro aplicativo ou quando a tela for bloqueada.
- **FR-032**: O sistema DEVE permitir que o usuário retome uma sessão em andamento exatamente no ponto em que parou, ao retornar ao aplicativo.
- **FR-033**: O sistema DEVE gravar cada série confirmada de forma durável no momento da confirmação, de modo que, em caso de encerramento inesperado do aplicativo, os dados já confirmados sejam recuperados na reabertura.
- **FR-034**: O sistema DEVE sinalizar ao usuário, na abertura do aplicativo, a existência de uma sessão em andamento não concluída.

#### Histórico

- **FR-035**: O sistema DEVE armazenar permanentemente todas as sessões concluídas, sem expurgo automático.
- **FR-036**: Os usuários DEVEM poder visualizar a lista de treinos realizados anteriormente, ordenada cronologicamente.
- **FR-037**: Os usuários DEVEM poder consultar, em uma sessão do histórico, os exercícios realizados, as séries executadas, as cargas utilizadas, as repetições realizadas e o RIR registrado.
- **FR-038**: O sistema DEVE exibir, no histórico, tanto os valores planejados quanto os realizados de cada série.
- **FR-039**: Os usuários DEVEM poder consultar todas as execuções de um mesmo exercício ao longo do tempo, de forma comparável entre si.
- **FR-040**: O sistema DEVE preservar os registros históricos quando o treino de origem for editado ou excluído.
- **FR-041**: O sistema DEVE manter a identidade do exercício estável ao longo do tempo, de modo que renomeações não quebrem a comparação histórica.

#### Progressão e avisos

- **FR-042**: O sistema DEVE comparar o desempenho realizado de um exercício com o que havia sido planejado para ele.
- **FR-043**: O sistema DEVE sinalizar a possibilidade de aumento de carga de um exercício quando, na sua execução anterior, ambas as condições forem verdadeiras: (a) as repetições realizadas foram estritamente maiores que as repetições planejadas em todas as séries planejadas; e (b) o RIR realizado foi maior ou igual ao RIR planejado em todas as séries em que o RIR foi informado.
- **FR-044**: Quando o RIR realizado não tiver sido informado em nenhuma série do exercício, a avaliação DEVE ignorar a condição (b) de FR-043 e aplicar somente a condição (a).
- **FR-045**: O sistema DEVE apresentar, no contexto do exercício durante uma nova execução, as informações de desempenho da execução anterior do mesmo exercício.
- **FR-046**: O sistema DEVE apresentar o aviso de possibilidade de aumento de carga sem bloquear, interromper ou exigir interação para que o usuário prossiga com o treino.
- **FR-047**: O sistema DEVE permitir que o usuário consulte os dados que fundamentam o aviso de progressão apresentado.
- **FR-048**: O sistema NÃO DEVE apresentar aviso de progressão para exercícios sem execução anterior registrada.
- **FR-049**: Os usuários DEVEM poder visualizar a evolução das cargas de um exercício ao longo do tempo.

#### Plataforma e experiência de uso

- **FR-050**: O sistema DEVE funcionar em smartphones iPhone e Android e em tablets.
- **FR-051**: O sistema DEVE adaptar-se a diferentes tamanhos de tela de smartphones e tablets, sem perda de funcionalidade e sem rolagem horizontal.
- **FR-052**: O sistema DEVE funcionar adequadamente em orientação retrato.
- **FR-053**: O sistema DEVE ser operável integralmente por toque.
- **FR-054**: Os elementos interativos DEVEM possuir área de toque suficiente para uso confiável durante a prática de exercícios físicos.
- **FR-055**: O sistema DEVE dar destaque visual às informações prioritárias durante a execução do treino: exercício atual, série atual, valores planejados e campos de registro.
- **FR-056**: O sistema DEVE manter legibilidade e contraste adequados às condições de uso em ambiente de academia.
- **FR-057**: O sistema DEVE permanecer plenamente funcional sem conexão à internet durante a execução de um treino.
- **FR-058**: O sistema DEVE informar ao usuário, de forma compreensível e com alternativa de ação, quando não for possível salvar um registro.

#### Dados para evolução futura

- **FR-059**: O sistema DEVE registrar os dados de treino de forma estruturada e consultável, preservando por série: exercício, abordagem, ordem, carga planejada, carga realizada, repetições planejadas, repetições realizadas, RIR planejado, RIR realizado, data e sessão de origem.
- **FR-060**: O modelo de dados DEVE permitir a inclusão de novos atributos por série e por exercício sem invalidar os registros históricos já existentes.
- **FR-061**: O sistema DEVE preservar os dados necessários para análises futuras de progressão de cargas, evolução de repetições, evolução do RIR, frequência de treinos e histórico por exercício.

#### Conta de usuário e sincronização

- **FR-062**: O sistema DEVE permitir que o usuário crie uma conta e faça login para acessar seus treinos e seu histórico.
- **FR-063**: O sistema DEVE manter os dados de cada conta isolados, de modo que um usuário nunca acesse treinos ou histórico de outro.
- **FR-064**: O sistema DEVE sincronizar automaticamente treinos, sessões e histórico entre todos os dispositivos em que a mesma conta estiver autenticada.
- **FR-065**: O sistema DEVE permitir o uso completo do aplicativo sem conexão — criar e editar treinos, executar sessões e consultar o histórico já presente no dispositivo — enfileirando as alterações locais.
- **FR-066**: O sistema DEVE sincronizar automaticamente as alterações pendentes assim que a conexão for restabelecida, sem exigir ação do usuário.
- **FR-067**: O sistema DEVE indicar ao usuário, de forma discreta e não bloqueante, quando existirem alterações ainda não sincronizadas.
- **FR-068**: O sistema DEVE resolver conflitos de sincronização de forma determinística e sem perda de sessões registradas: sessões de treino são tratadas como registros imutáveis após a conclusão e nunca são mescladas nem sobrescritas; para treinos editados em mais de um dispositivo, prevalece a alteração mais recente.
- **FR-069**: O sistema DEVE restaurar os treinos e o histórico completo do usuário ao fazer login em um dispositivo novo ou reinstalado.
- **FR-070**: O sistema DEVE proteger as credenciais e os dados de treino do usuário em trânsito e em repouso, e DEVE permitir que o usuário encerre a sessão de um dispositivo.

#### Catálogo de exercícios

- **FR-071**: O sistema DEVE oferecer um catálogo de exercícios pré-cadastrados, disponível para seleção ao montar treinos.
- **FR-072**: O sistema DEVE permitir que o usuário crie exercícios personalizados quando o exercício desejado não existir no catálogo.
- **FR-073**: Cada exercício DEVE possuir um identificador estável e imutável, independente do seu nome de exibição e da sua origem.
- **FR-074**: O sistema DEVE vincular treinos, sessões e histórico ao identificador estável do exercício, de modo que renomear um exercício mantenha íntegras todas as execuções anteriores e todas as comparações de desempenho.
- **FR-075**: O sistema DEVE permitir buscar e filtrar exercícios ao adicioná-los a um treino.
- **FR-076**: O sistema NÃO DEVE permitir a exclusão definitiva de um exercício que possua execuções registradas no histórico; nesse caso DEVE oferecer apenas ocultá-lo de novas seleções, preservando os registros existentes.
- **FR-077**: O sistema DEVE tratar exercícios personalizados e exercícios do catálogo de forma equivalente para fins de execução, histórico, comparação de desempenho e aviso de progressão.

#### Detalhamento do critério de aumento de carga

- **FR-078**: O sistema NÃO DEVE sinalizar possibilidade de aumento de carga quando qualquer série planejada do exercício tiver sido marcada como não realizada ou não tiver registro, ainda que as demais séries atendam ao critério.
- **FR-079**: Séries extras registradas além das planejadas NÃO DEVEM ser consideradas na avaliação do critério de FR-043 e não invalidam o aviso.
- **FR-080**: A carga de referência do aviso DEVE ser a carga efetivamente utilizada na execução anterior do exercício, e não a carga que havia sido planejada.
- **FR-081**: Quando as repetições realizadas forem iguais às planejadas em todas as séries, o sistema NÃO DEVE sinalizar possibilidade de aumento de carga.

#### Preenchimento da carga durante a execução

- **FR-082**: O sistema NÃO DEVE pré-preencher o campo de carga da primeira série de um exercício ao iniciar uma sessão, nem a partir do plano do treino nem a partir do histórico; a carga DEVE ser informada pelo usuário.
- **FR-083**: O sistema DEVE exibir, no cabeçalho do exercício durante a execução, a carga utilizada na execução anterior do mesmo exercício, quando existir.
- **FR-084**: O sistema DEVE permitir aplicar a carga da execução anterior ao campo de carga com um único toque.
- **FR-085**: Dentro de uma mesma sessão, o campo de carga de uma série DEVE ser preenchido automaticamente com a carga informada na série anterior do mesmo exercício, permanecendo editável.
- **FR-086**: As repetições planejadas e o RIR planejado exibidos durante a execução DEVEM vir do plano registrado na sessão, por serem a base de comparação de FR-043.

#### Exercícios fora do plano e exercícios pulados

- **FR-087**: O sistema DEVE permitir adicionar, durante a execução, exercícios que não constam no plano da sessão.
- **FR-088**: O sistema DEVE registrar no histórico os exercícios adicionados fora do plano com os mesmos dados das demais séries — carga, repetições realizadas e RIR realizado — identificando-os como exercícios sem plano associado.
- **FR-089**: O sistema NÃO DEVE gerar indicação de progressão para um exercício adicionado fora do plano na sessão em que foi adicionado, por não existir meta de repetições e RIR planejados para comparação.
- **FR-090**: Um exercício executado sem plano DEVE passar a ser avaliado por FR-043 a partir do momento em que for incluído no plano de um treino e executado.
- **FR-091**: O sistema DEVE permitir pular um exercício planejado durante a execução, mantendo a sessão válida e concluível.
- **FR-092**: Uma série é considerada válida quando possui repetições realizadas registradas e não está marcada como não realizada.
- **FR-093**: Um exercício planejado que encerre a sessão sem nenhuma série válida registrada NÃO DEVE ser considerado uma execução finalizada para fins de FR-043; uma indicação de progressão ativa para esse exercício DEVE permanecer válida e continuar sendo apresentada.
- **FR-094**: Sempre que esta especificação se referir à execução anterior de um exercício, DEVE ser considerada a sessão concluída mais recente em que aquele exercício teve ao menos uma série válida registrada.

### Key Entities

- **Exercício**: movimento identificável e reutilizável entre treinos e sessões (ex.: "Supino reto"). Possui um identificador estável e imutável, independente do nome exibido — é ele que permite comparar execuções históricas mesmo após renomeações. Tem origem no catálogo pré-cadastrado ou é personalizado, criado pelo usuário, sem diferença de tratamento entre os dois casos. Pode ter atributos descritivos como grupo muscular e equipamento.
- **Treino**: modelo reutilizável criado pelo usuário, com nome e uma lista ordenada de itens. É o que o usuário monta antes de ir à academia.
- **Item de treino**: a presença de um exercício dentro de um treino, com sua posição na ordem, a abordagem de série escolhida e os valores planejados (séries, repetições, carga, RIR).
- **Série planejada**: o alvo de uma série específica de um item de treino — repetições, carga e RIR planejados. Permite que séries de um mesmo exercício tenham alvos diferentes.
- **Abordagem de série**: o tipo de execução aplicado ao exercício (tradicional, dropset e futuros). Determina a estrutura de registro esperada para aquele exercício.
- **Sessão de treino**: uma execução concreta de um treino em uma data e horário, com estado (em andamento, concluída, descartada) e uma cópia dos valores planejados vigentes no início. É a unidade do histórico.
- **Exercício da sessão**: o exercício tal como foi executado dentro de uma sessão, com sua ordem, sua abordagem e seu estado (realizado, parcialmente realizado, não realizado). Pode ter origem no plano da sessão ou ter sido adicionado durante a execução, caso em que não possui metas planejadas associadas.
- **Série realizada**: o registro efetivo de uma série executada — carga utilizada, repetições realizadas, RIR realizado, momento do registro e vínculo com a série planejada correspondente, quando houver. Para dropsets, contém os degraus executados.
- **Conta de usuário**: a identidade sob a qual os treinos e o histórico são armazenados e sincronizados. Delimita o isolamento dos dados e é o vínculo que permite recuperar tudo em um novo dispositivo.
- **Aviso de progressão**: a indicação de possibilidade de aumento de carga associada a um exercício, derivada do histórico, com os dados de origem que a fundamentam.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue registrar uma série completa (carga, repetições e RIR) em no máximo 3 toques e menos de 5 segundos, sem sair da tela de execução do treino.
- **SC-002**: 100% dos dados já registrados em uma sessão são preservados após o usuário minimizar o aplicativo, alternar para outro aplicativo, bloquear a tela e retornar.
- **SC-003**: Após encerramento inesperado do aplicativo, 100% das séries confirmadas antes do encerramento são recuperadas na reabertura.
- **SC-004**: Um usuário novo consegue montar um treino com 6 exercícios, com séries, repetições, carga e RIR definidos, em menos de 5 minutos no primeiro uso, sem consultar ajuda.
- **SC-005**: O usuário localiza a carga e as repetições da execução anterior de um exercício em menos de 15 segundos e no máximo 3 toques a partir da tela inicial.
- **SC-006**: 100% das execuções que atendem ao critério de superação da meta geram o aviso de possibilidade de aumento de carga na próxima execução do mesmo exercício.
- **SC-007**: Nenhum aviso de aumento de carga é apresentado para exercícios sem execução anterior registrada ou cujo desempenho não superou o planejado.
- **SC-008**: Todas as telas permanecem plenamente utilizáveis em orientação retrato, de smartphones pequenos a tablets, sem rolagem horizontal e sem elementos cortados.
- **SC-009**: Todos os elementos interativos possuem área de toque de no mínimo 44 x 44 pontos e contraste de texto de no mínimo 4,5:1.
- **SC-010**: Um histórico com 200 sessões acumuladas é listado em menos de 2 segundos, e a consulta ao histórico de um exercício específico responde em menos de 1 segundo.
- **SC-011**: Um treino completo pode ser executado e registrado do início ao fim sem conexão à internet, sem perda de dados.
- **SC-012**: 90% dos usuários concluem e registram seu primeiro treino completo sem abandonar a execução e sem precisar de suporte.
- **SC-013**: Nenhuma sessão concluída é perdida ou alterada após edição ou exclusão do treino que a originou, verificado em 100% dos casos de teste.
- **SC-014**: A adição de um novo tipo de abordagem de série não exige alteração nos registros históricos existentes nem invalida sessões anteriores.
- **SC-015**: Ao fazer login em um aparelho novo, 100% dos treinos e das sessões concluídas do usuário são recuperados.
- **SC-016**: Alterações feitas sem conexão são sincronizadas automaticamente em até 30 segundos após o restabelecimento da conexão, sem nenhuma ação do usuário.
- **SC-017**: Nenhuma sessão concluída é perdida, duplicada ou alterada em cenários de conflito entre dispositivos, verificado em 100% dos casos de teste.
- **SC-018**: Nenhum usuário consegue acessar treinos ou histórico de outra conta, verificado em 100% dos casos de teste de isolamento.
- **SC-019**: Renomear um exercício preserva 100% das suas execuções históricas e não interrompe a comparação de desempenho ao longo do tempo.
- **SC-020**: O usuário localiza e adiciona um exercício do catálogo a um treino em no máximo 3 toques a partir da tela de edição do treino.
- **SC-021**: O critério de aumento de carga produz o mesmo resultado para os mesmos dados de entrada em 100% das avaliações, sem variação entre execuções.
- **SC-022**: Nenhum campo de carga é apresentado preenchido na primeira série de um exercício em uma nova sessão, verificado em 100% dos casos de teste.
- **SC-023**: Aplicar a carga da execução anterior ao campo de carga exige exatamente 1 toque.
- **SC-024**: Um exercício planejado e totalmente pulado não altera a indicação de progressão vigente daquele exercício, verificado em 100% dos casos de teste.
- **SC-025**: Exercícios adicionados fora do plano aparecem integralmente no histórico da sessão, com carga, repetições e RIR registrados.

## Assumptions

### Escopo

- A implementação da funcionalidade de Inteligência Artificial de análise não faz parte do escopo inicial; o que se exige agora é apenas que os dados sejam preservados de forma estruturada e completa o suficiente para viabilizá-la depois (FR-059 a FR-061).
- Funcionalidades comuns de aplicativos de treino não citadas na descrição são consideradas fora do escopo desta especificação: cronômetro de descanso, planos periodizados por semana, notas de sessão, registro de peso corporal e medidas, mídia demonstrativa dos exercícios, exportação de dados, compartilhamento social e integração com dispositivos vestíveis. Podem ser especificadas como features futuras.
- A rotina de treinos é montada pelo próprio usuário; não há perfil de treinador nem prescrição de treino por terceiros.
- Conta de usuário e sincronização em nuvem fazem parte do escopo inicial. Não fazem parte dele: compartilhamento de treinos entre contas, perfis com múltiplos papéis e colaboração entre usuários.
- O método de autenticação (e-mail e senha, login social ou ambos) será definido na fase de planejamento; a escolha não altera nenhum requisito desta especificação.
- O catálogo inicial de exercícios é cadastrado e mantido pelo proprietário do aplicativo, não pelos usuários finais. Uma interface de administração do catálogo dentro do aplicativo não faz parte do escopo inicial.
- O aplicativo terá inicialmente um único usuário (o próprio proprietário). A conta e a sincronização existem para o uso em múltiplos dispositivos e para a preservação do histórico, não para atender uma base de usuários.

### Dados e domínio

- **RIR** (Reps In Reserve) é registrado como um número inteiro não negativo, representando quantas repetições o usuário acredita que ainda conseguiria realizar ao encerrar a série.
- Um RIR realizado maior que o planejado significa que a série terminou com mais folga do que o pretendido, ou seja, que a carga estava leve demais — por isso o RIR entra no critério de aumento de carga na direção de FR-043 (b).
- As repetições planejadas são definidas como um valor-alvo por série. Faixas de repetições (ex.: 8–12) são tratadas como evolução futura e não fazem parte do escopo inicial.
- A carga é registrada em quilogramas, com suporte a valores fracionados (ex.: 2,5 kg). Outras unidades são evolução futura.
- Exercícios sem carga externa são suportados com carga zero, e sua progressão é observada pelas repetições.
- O histórico é mantido indefinidamente, sem expurgo automático; o volume de dados por usuário é pequeno o suficiente para que isso não seja um problema.
- A sessão de treino guarda uma cópia do plano vigente no seu início; essa é a razão pela qual editar ou excluir um treino não afeta o histórico.
- Uma sessão em andamento pertence ao aparelho em que foi iniciada e só fica disponível nos demais aparelhos após ser concluída ou descartada. Retomar uma sessão em andamento em outro aparelho é evolução futura.

### Uso e ambiente

- O uso principal ocorre no smartphone, dentro da academia, com o aparelho na mão e frequentemente com conexão de rede instável ou ausente. Por isso o aplicativo é offline-first: a conexão é necessária para sincronizar, nunca para treinar.
- A conexão é necessária no primeiro login de um dispositivo, para autenticar e trazer os dados da conta.
- A prioridade de experiência é iPhone, seguido de Android e, por último, tablets; tablets devem funcionar adequadamente, mas não recebem otimização dedicada de layout no escopo inicial.
- A orientação retrato é a orientação suportada no escopo inicial.

### Direcionamentos para a fase de planejamento

Os pontos a seguir foram declarados pelo solicitante como preferências de implementação. Não são requisitos funcionais e devem ser tratados em `/speckit-plan`:

- O estilo visual preferido é **Glassmorphism**, aplicado com moderação e condicionado a não prejudicar legibilidade, desempenho, usabilidade, acessibilidade e facilidade de uso durante o treino. Se houver conflito, a usabilidade durante o treino prevalece sobre o estilo.
- A skill **`frontend-design`** deve ser utilizada durante a implementação das telas.
- A arquitetura e a modelagem de dados devem evitar decisões que dificultem a inclusão futura de novos tipos de abordagem de série, novos indicadores por série e as análises com Inteligência Artificial.
- O momento e o formato exatos de apresentação do aviso de progressão durante o treino serão definidos no planejamento, respeitando FR-046 (não bloquear a execução).

### Governança

- O arquivo `.specify/memory/constitution.md` do projeto ainda está com o conteúdo padrão do template, sem princípios preenchidos. Nenhuma restrição de governança foi aplicada a esta especificação. Recomenda-se executar `/speckit-constitution` antes do planejamento.
