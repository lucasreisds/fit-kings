# Feature Specification: Aplicativo de Treinos de Academia

**Feature Directory**: `specs/001-workout-tracking-app`

**Created**: 2026-09-16

**Last Updated**: 2026-09-19

**Status**: Draft

**Input**: Descrição do usuário: aplicativo mobile-first para montar, executar e acompanhar treinos de academia, com histórico completo, comparação planejado x realizado, aviso de possibilidade de aumento de carga e base de dados preparada para análises futuras com IA.

## Clarifications

### Session 2026-09-17

- Q: Os treinos e o histórico devem existir apenas no aparelho, ou o usuário precisa de conta para acessá-los em outro dispositivo e recuperá-los se trocar de celular? (FR-062) → A: Opção C — conta de usuário com sincronização automática em nuvem. **⚠️ Superada pela revisão de escopo de 2026-09-19 (D1): a conta e a sincronização saíram do escopo desta versão e foram substituídas por exportação e importação em arquivo.**
- Q: Ao adicionar um exercício a um treino, o usuário escolhe de uma lista pronta, digita o nome livremente, ou as duas coisas? (FR-011) → A: Opção A — catálogo de exercícios pré-cadastrado (curado pelo proprietário do aplicativo) somado a exercícios personalizados criados pelo usuário, cada exercício com identificação estável que preserva o histórico e a comparação de desempenho ao longo do tempo.
- Q: O que exatamente conta como "superou a meta" para o aplicativo avisar que dá para aumentar a carga? (FR-043) → A: Repetições realizadas estritamente maiores que as planejadas em todas as séries E RIR realizado maior ou igual ao RIR planejado nas séries em que o RIR foi informado; sem RIR informado, vale apenas o critério de repetições.
- Q: Quando o usuário inicia um treino, os campos já vêm preenchidos com a carga do plano ou com a carga realmente usada na última execução? (FR-016, FR-017) → A: Nenhuma das duas — a carga nunca vem pré-preenchida entre sessões. A carga da última execução é exibida como informação no cabeçalho do exercício, com opção de aplicar por toque. Dentro da mesma execução, a série seguinte herda a carga informada na série anterior. Repetições e RIR planejados continuam vindo do plano, por serem a base de comparação de FR-043.
- Q: O usuário pode trocar ou acrescentar um exercício que não está no plano durante a execução? (FR-016, FR-023) → A: Sim — a sessão continua partindo de um treino salvo, mas permite adicionar exercícios fora do plano e pular exercícios planejados. Exercício planejado que termine sem nenhuma série válida não conta como execução finalizada para FR-043 e a indicação ativa anterior permanece como referência. Exercício adicionado fora do plano é registrado normalmente no histórico, não gera indicação de progressão naquela sessão por não ter metas planejadas, e passa a ser avaliado quando for planejado em um treino.

### Session 2026-09-19 — Revisão de escopo

Revisão solicitada pelo proprietário do produto, reduzindo o escopo desta versão e substituindo a continuidade de dados por um mecanismo local.

- **D1**: Conta de usuário, backup em nuvem e sincronização entre dispositivos saem do escopo desta versão. Esta versão é inteiramente local ao dispositivo, sem servidor e sem dependência de rede. Motivo: esta especificação já registra que o aplicativo terá inicialmente um único usuário, e o custo de autenticação, backend, fila de sincronização e resolução de conflitos entre aparelhos não se justifica nessa condição. Removidos: US7 original, FR-062 a FR-070, SC-015 a SC-018, a entidade Conta de usuário e os casos de borda de sincronização.
- **D2**: Em substituição, entram no escopo desta versão a exportação e a importação dos dados do usuário em arquivo, para backup manual (FR-095 a FR-111, nova US7).
- **D3**: O arquivo de backup contém o conjunto completo de dados do usuário — treinos, exercícios personalizados e sessões —, e não apenas o histórico. Motivo: um arquivo contendo somente as sessões produziria, ao ser importado, referências a exercícios inexistentes no destino, violando FR-074 e deixando de restaurar os treinos.
- **D4**: A importação mescla o conteúdo do arquivo com os dados já presentes no dispositivo, identificando cada registro pelo seu identificador estável, e é idempotente. A regra de precedência é a que já havia sido decidida para conflitos de sincronização no antigo FR-068: sessões concluídas são imutáveis e nunca mescladas nem sobrescritas; para registros editáveis prevalece a alteração mais recente.
- **D5**: Como deixa de existir backup automático, o aplicativo passa a exibir a data do último backup e a lembrar o usuário periodicamente, de forma não bloqueante (FR-109, FR-110). É a contrapartida da retirada da sincronização do escopo.
- **D6**: FR-057 e SC-011 não foram removidos e sim reforçados: de "funciona sem conexão durante a execução do treino" para "funciona integralmente sem qualquer conexão de rede", que é o requisito correto na ausência de servidor.

### Session 2026-09-19 — Clarificação pós-emenda da constituição v1.1.0

- Q: O usuário deve poder corrigir uma sessão de treino já concluída e, se puder, o que exatamente ele pode corrigir? → A: Opção A — corrigir apenas os valores registrados das séries existentes (carga, repetições e RIR realizados), sem adicionar nem remover séries ou exercícios. A correção de valores dispara a reavaliação da indicação de progressão da execução corrigida, e a indicação ativa daquele exercício é reconsultada. Corrigir valores nunca altera o momento da execução nem a ordem cronológica das sessões.
- Q: Dentro de uma mesma sessão, ao passar da série 1 para a série 2 do mesmo exercício, o campo de carga deve vir preenchido com o valor que acabou de ser usado, ou vazio? (FR-085) → A: Opção A — mantém o preenchimento automático dentro da mesma sessão, editável. O valor herdado DEVE ser visualmente indistinguível de um valor digitado, por ser dado efetivo e não sugestão. A herança nunca alcança a primeira série de um exercício nem atravessa exercícios diferentes dentro da mesma sessão. A proibição de pré-preenchimento vale entre sessões.
- Q: Ao importar um backup que contém uma sessão já corrigida, quando o aparelho de destino ainda tem a versão antiga dela, o que deve acontecer? (FR-102) → A: Opção A — a importação aplica a versão do arquivo quando ela for mais recente que a do aparelho, pela data de última alteração, gerando nova versão local e preservando a anterior. Nunca há mesclagem campo a campo. O Princípio I da constituição impede que a importação *invente* alteração em sessão concluída, não que ela *propague* uma correção feita pelo próprio usuário e carimbada como tal.

### Session 2026-09-19 — Decisões da fase de planejamento

Decisões do proprietário tomadas durante `/speckit-plan`, que introduzem comportamento visível ao
usuário e por isso precisam de requisito próprio.

- **P1**: O aplicativo DEVE verificar e solicitar a marcação de persistência do armazenamento local, e NÃO DEVE operar como se o armazenamento fosse confiável enquanto isso não for confirmado. Quando a persistência não for concedida, o estado degradado é sinalizado ao usuário e a frequência do lembrete de backup aumenta. Origem: o armazenamento da plataforma de entrega escolhida é despejável pelo sistema operacional, o que enfraquece a garantia do Princípio I. Vira FR-120 a FR-123.
- **P2**: A geração de identificadores DEVE ter caminho único em todos os ambientes. Ambiente de execução que não ofereça as garantias necessárias não executa o aplicativo: a falha é explícita na inicialização, nunca um mecanismo alternativo de geração. Origem: um caminho alternativo produziria identificadores de origens distintas entre desenvolvimento e produção, corrompendo silenciosamente a identidade estável exigida pelo Princípio IV. Vira FR-124.

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

### User Story 7 - Fazer backup e restaurar meus dados em arquivo (Priority: P7)

Como praticante que acumula anos de registro em um único aparelho, quero exportar todos os meus dados para um arquivo e conseguir importá-lo de volta, para não perder meu histórico se o aparelho quebrar, for perdido ou for substituído.

**Why this priority**: É a única proteção contra perda total de dados nesta versão, que não possui conta nem backup em nuvem. O valor não aparece no primeiro dia de uso, mas cresce a cada semana de histórico acumulado — por isso é construída cedo e priorizada por último em termos de valor percebido no uso diário.

**Independent Test**: Pode ser testada cadastrando treinos e registrando sessões em um aparelho, exportando o arquivo, instalando o aplicativo em outro aparelho, importando o arquivo e confirmando que treinos, exercícios personalizados e histórico aparecem íntegros e comparáveis.

**Acceptance Scenarios**:

1. **Given** treinos cadastrados e sessões registradas, **When** solicito a exportação, **Then** o aplicativo gera um único arquivo contendo meus treinos, meus exercícios personalizados e todas as minhas sessões, e me permite salvá-lo ou compartilhá-lo pelos mecanismos do dispositivo.
2. **Given** um arquivo exportado e um aparelho novo com o aplicativo recém-instalado, **When** importo o arquivo, **Then** meus treinos, meus exercícios personalizados e meu histórico completo passam a estar disponíveis nesse aparelho.
3. **Given** um arquivo exportado, **When** o importo em um aparelho que já contém parte desses dados, **Then** os registros já existentes não são duplicados e as sessões já registradas permanecem inalteradas.
4. **Given** que acabei de importar um arquivo, **When** importo exatamente o mesmo arquivo novamente, **Then** nada muda em relação ao estado resultante da primeira importação.
5. **Given** um arquivo corrompido, incompleto ou gerado por outro aplicativo, **When** tento importá-lo, **Then** o aplicativo recusa a importação com uma mensagem compreensível e nenhum dado existente no aparelho é alterado.
6. **Given** um histórico com exercícios renomeados ao longo do tempo, **When** exporto e importo em outro aparelho, **Then** cada execução continua vinculada ao mesmo exercício e a comparação de desempenho ao longo do tempo permanece íntegra.
7. **Given** que nunca exportei meus dados ou que faz muito tempo desde o último backup, **When** uso o aplicativo, **Then** vejo a data do último backup e um lembrete discreto para exportar, sem que isso interrompa ou bloqueie qualquer ação.

---

### Edge Cases

- **Treino editado após execuções**: o usuário altera séries, cargas ou exercícios de um treino que já foi executado — o histórico anterior deve permanecer exatamente como foi registrado.
- **Treino excluído com histórico**: excluir um treino não pode apagar as sessões já concluídas a partir dele.
- **Exercício removido ou renomeado**: o histórico e a comparação ao longo do tempo devem continuar coerentes para as execuções anteriores.
- **Séries a mais ou a menos que o planejado**: o usuário faz 4 séries onde planejou 3, ou abandona o exercício na 2ª de 4 séries.
- **Exercício ou série pulada**: deve ser distinguível de "não registrada" para não contaminar as análises de progressão.
- **Exercício marcado como não realizado tendo séries já registradas**: o usuário registra duas séries e em seguida marca o exercício como pulado — as séries registradas não podem ser apagadas, e a combinação de marcação ativa com série válida é estado inconsistente detectável, não caso a resolver em silêncio (FR-126).
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
- **Arquivo de backup corrompido ou incompatível**: o arquivo está truncado, foi alterado manualmente ou foi gerado por outro aplicativo.
- **Arquivo de versão anterior do formato**: gerado por uma versão mais antiga do aplicativo, com menos campos por série do que a versão atual espera.
- **Mesmo arquivo importado duas vezes**: não pode duplicar treinos, exercícios nem sessões.
- **Importação em aparelho com dados mais recentes**: o arquivo é antigo e o aparelho já contém sessões e edições posteriores às dele.
- **Importação com sessão em andamento**: o usuário aciona a importação enquanto existe uma sessão de treino não concluída.
- **Registro excluído presente no arquivo**: a importação não pode restabelecer treinos ou exercícios que o usuário havia removido.
- **Armazenamento do dispositivo cheio durante a exportação** de um histórico extenso.
- **Usuário nunca exporta**: histórico de meses ou anos acumulado sem nenhum backup, com risco de perda total na troca ou na perda do aparelho.
- **Intervalo de backup vencido durante o treino**: os 7 dias de FR-110 — ou os 2 dias de FR-122 — se esgotam com uma sessão em andamento; o lembrete não pode aparecer ali e precisa ser apresentado no encerramento da sessão, tenha ela sido concluída ou descartada.
- **Correção que inverte a indicação de progressão**: a carga ou as repetições corrigidas fazem o exercício deixar de atender — ou passar a atender — ao critério de FR-043, alterando o aviso exibido na próxima execução.
- **Correção da execução que fundamenta um aviso ativo**: o usuário corrige justamente a sessão que originou a indicação de progressão vigente daquele exercício.
- **Correção de sessão já exportada**: o backup existente contém a versão anterior; a versão corrigida só chega a outro aparelho na próxima exportação.
- **Importação de arquivo mais antigo que a versão local**: o aparelho já tem a sessão corrigida e o arquivo traz a versão anterior — a correção não pode ser desfeita pela importação.
- **Importação com correções feitas dos dois lados**: a mesma sessão foi corrigida no aparelho e no aparelho que gerou o arquivo, com datas de alteração distintas.
- **Persistência do armazenamento negada**: o dispositivo recusa marcar o armazenamento como persistente, e o usuário precisa entender o risco sem ser impedido de treinar.
- **Dados removidos pelo dispositivo**: o armazenamento local é limpo pelo sistema operacional ou pelo próprio usuário, e o aplicativo reabre vazio — com ou sem backup disponível para importar.
- **Ambiente de execução sem as garantias necessárias**: o aplicativo é aberto em ambiente que não suporta o mecanismo único de geração de identificadores, e precisa recusar-se a operar em vez de gerar registros por outro caminho.
- **Armazenamento do dispositivo próximo do limite**: o espaço disponível se aproxima do esgotamento com o histórico ainda crescendo.
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
- **FR-057**: O sistema DEVE funcionar integralmente sem qualquer conexão de rede, em todas as suas telas e funcionalidades, sem exigir conexão em nenhum momento da sua execução — inclusive na primeira execução após a instalação. A obtenção inicial do aplicativo, isto é, sua instalação no dispositivo, não constitui execução e PODE exigir conexão uma única vez, conforme a plataforma de entrega adotada.
- **FR-058**: O sistema DEVE informar ao usuário, de forma compreensível e com alternativa de ação, quando não for possível salvar um registro.

#### Dados para evolução futura

- **FR-059**: O sistema DEVE registrar os dados de treino de forma estruturada e consultável, preservando por série: exercício, abordagem, ordem, carga planejada, carga realizada, repetições planejadas, repetições realizadas, RIR planejado, RIR realizado, data e sessão de origem.
- **FR-060**: O modelo de dados DEVE permitir a inclusão de novos atributos por série e por exercício sem invalidar os registros históricos já existentes.
- **FR-061**: O sistema DEVE preservar os dados necessários para análises futuras de progressão de cargas, evolução de repetições, evolução do RIR, frequência de treinos e histórico por exercício.

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
- **FR-085**: Dentro de uma mesma sessão, o campo de carga de uma série DEVE ser preenchido automaticamente com a carga informada na série anterior do mesmo exercício, permanecendo editável. A herança NÃO DEVE alcançar a primeira série de um exercício nem atravessar exercícios distintos dentro da mesma sessão.
- **FR-119**: O valor de carga herdado da série anterior DEVE ser apresentado de forma visualmente indistinguível de um valor informado pelo usuário, sem tratamento de sugestão, marca d'água ou estado provisório, por constituir dado efetivo da série.
- **FR-086**: As repetições planejadas e o RIR planejado exibidos durante a execução DEVEM vir do plano registrado na sessão, por serem a base de comparação de FR-043.

#### Exercícios fora do plano e exercícios pulados

- **FR-087**: O sistema DEVE permitir adicionar, durante a execução, exercícios que não constam no plano da sessão.
- **FR-088**: O sistema DEVE registrar no histórico os exercícios adicionados fora do plano com os mesmos dados das demais séries — carga, repetições realizadas e RIR realizado — identificando-os como exercícios sem plano associado.
- **FR-089**: O sistema NÃO DEVE gerar indicação de progressão para um exercício adicionado fora do plano na sessão em que foi adicionado, por não existir meta de repetições e RIR planejados para comparação.
- **FR-090**: Um exercício executado sem plano DEVE passar a ser avaliado por FR-043 a partir do momento em que for incluído no plano de um treino e executado.
- **FR-091**: O sistema DEVE permitir pular um exercício planejado durante a execução, mantendo a sessão válida e concluível.
- **FR-125**: A marcação de um exercício da sessão como não realizado (FR-024, FR-091) é intenção explícita do usuário e DEVE ser registrada como tal, por ser indistinguível, a partir das séries, de um exercício que a sessão ainda não alcançou. O estado apresentado do exercício na sessão — realizado, parcialmente realizado ou não realizado — NÃO DEVE ser persistido: ele DEVE ser derivado, por regra única e determinística, das séries registradas e dessa marcação.
- **FR-126**: Marcar um exercício como não realizado NÃO DEVE apagar séries já registradas nele, e registrar uma série DEVE limpar a marcação. A ocorrência simultânea de marcação ativa e série válida registrada no mesmo exercício da sessão DEVE ser tratada como estado inconsistente detectável e sinalizada ao usuário, nunca resolvida em silêncio por escolha arbitrária entre os dois.
- **FR-092**: Uma série é considerada válida quando possui repetições realizadas registradas e não está marcada como não realizada.
- **FR-093**: Um exercício planejado que encerre a sessão sem nenhuma série válida registrada NÃO DEVE ser considerado uma execução finalizada para fins de FR-043; uma indicação de progressão ativa para esse exercício DEVE permanecer válida e continuar sendo apresentada.
- **FR-094**: Sempre que esta especificação se referir à execução anterior de um exercício, DEVE ser considerada a sessão concluída mais recente em que aquele exercício teve ao menos uma série válida registrada.

#### Exportação e importação de dados

- **FR-095**: O sistema DEVE permitir que o usuário exporte, em um único arquivo, o conjunto completo dos seus dados: treinos, exercícios personalizados e todas as sessões registradas.
- **FR-096**: O arquivo exportado DEVE adotar um formato estruturado, documentado e legível por máquina, adequado ao consumo por ferramentas externas de análise, atendendo ao propósito de FR-059 a FR-061.
- **FR-097**: O arquivo exportado DEVE conter a identificação da versão do formato, de modo que versões futuras do aplicativo consigam interpretar arquivos gerados por versões anteriores.
- **FR-098**: A exportação DEVE incluir os registros marcados como excluídos, preservando sua marca de exclusão, para que a importação não restabeleça dados que o usuário havia removido.
- **FR-099**: O sistema DEVE permitir que o usuário salve ou compartilhe o arquivo exportado por meio dos mecanismos do sistema operacional do dispositivo.
- **FR-100**: O sistema DEVE permitir importar um arquivo previamente exportado, restaurando treinos, exercícios personalizados e histórico.
- **FR-101**: A importação DEVE mesclar o conteúdo do arquivo com os dados já presentes no dispositivo, identificando cada registro pelo seu identificador estável, sem duplicar registros já existentes.
- **FR-102**: Na importação, as sessões concluídas NÃO DEVEM ser mescladas campo a campo nem ter qualquer versão destruída. Quando o arquivo contiver uma versão mais recente da mesma sessão — comparada pela data de última alteração —, essa versão DEVE ser aplicada como nova versão local, preservando a versão anterior do aparelho. Quando a versão do arquivo não for mais recente, a sessão do aparelho DEVE permanecer inalterada.
- **FR-103**: Na importação, para os registros editáveis presentes tanto no arquivo quanto no dispositivo, DEVE prevalecer a versão com alteração mais recente.
- **FR-104**: Importar o mesmo arquivo mais de uma vez NÃO DEVE produzir resultado diferente do da primeira importação.
- **FR-105**: A importação DEVE preservar a identidade estável dos exercícios, de modo que o histórico importado permaneça vinculado aos mesmos exercícios e que as comparações de desempenho de FR-039, FR-043 e FR-074 continuem íntegras.
- **FR-106**: O sistema DEVE validar o arquivo antes de aplicar qualquer alteração e DEVE recusar arquivo inválido, corrompido ou de formato incompatível sem modificar nenhum dado existente no dispositivo.
- **FR-107**: O sistema DEVE apresentar ao usuário um resumo do que será importado e DEVE exigir confirmação explícita antes de aplicar a importação.
- **FR-108**: O sistema DEVE informar o resultado da importação, indicando o que foi importado e o que foi ignorado por já existir.
- **FR-109**: O sistema DEVE registrar e exibir ao usuário a data do último backup realizado.
- **FR-110**: O sistema DEVE lembrar o usuário de realizar o backup quando se passarem **7 dias** desde a última exportação concluída com sucesso, de forma discreta e não bloqueante. A contagem parte da data da última exportação **concluída com sucesso** — não de uma tentativa que tenha falhado, nem da última exibição do lembrete. Exibir o lembrete NÃO DEVE adiar a contagem: o intervalo permanece vencido até que uma nova exportação seja concluída com sucesso. Quando nunca houve exportação bem-sucedida, a contagem parte da criação do primeiro registro do usuário. O lembrete NÃO DEVE ser apresentado durante uma sessão em andamento; quando o intervalo vencer no meio de um treino, o lembrete DEVE ser apresentado ao encerramento da sessão, seja por conclusão ou por descarte.
- **FR-111**: A exportação e a importação DEVEM funcionar integralmente sem conexão de rede.

#### Correção de sessão concluída

- **FR-112**: O sistema DEVE permitir que o usuário corrija, em uma sessão concluída, os valores registrados das séries existentes: carga utilizada, repetições realizadas e RIR realizado.
- **FR-113**: O sistema NÃO DEVE permitir, na correção de uma sessão concluída, adicionar séries, remover séries, adicionar exercícios, remover exercícios nem alterar a abordagem de série utilizada.
- **FR-114**: A correção DEVE gerar uma nova versão do registro da sessão, preservando integralmente a versão anterior no dispositivo. Toda leitura — histórico, comparações de desempenho e avisos de progressão — DEVE utilizar a versão vigente.
- **FR-115**: A correção NÃO DEVE alterar a data e o horário de início e de conclusão da sessão, nem a sua posição na ordem cronológica do histórico.
- **FR-116**: O sistema DEVE registrar, na versão vigente, a indicação de que houve correção e a data da última alteração, e DEVE exibi-las ao usuário ao consultar a sessão.
- **FR-117**: Após uma correção de valores, a avaliação do critério de FR-043 para a execução corrigida DEVE ser refeita e a indicação de progressão vigente do exercício DEVE ser reconsultada conforme FR-094, sem exigir ação do usuário.
- **FR-118**: A correção de uma sessão concluída DEVE exigir confirmação explícita do usuário.

#### Confiabilidade do armazenamento e ambiente de execução

- **FR-120**: O sistema DEVE verificar, ao iniciar, se o armazenamento local do dispositivo está marcado como persistente, e DEVE solicitar essa marcação quando ela não existir.
- **FR-121**: O sistema NÃO DEVE operar como se o armazenamento fosse confiável enquanto a persistência não estiver confirmada.
- **FR-122**: Quando a persistência não for concedida, o sistema DEVE sinalizar ao usuário, de forma compreensível e não bloqueante, que seus dados estão sujeitos a remoção pelo dispositivo, e DEVE reduzir de 7 para **2 dias** o intervalo do lembrete de backup de FR-110. As demais regras de FR-110 permanecem inalteradas: a contagem continua ancorada na última exportação concluída com sucesso, e o lembrete continua proibido durante uma sessão em andamento.
- **FR-123**: O sistema DEVE permitir que o usuário consulte o estado da persistência do armazenamento e o espaço disponível no dispositivo.
- **FR-124**: O sistema DEVE utilizar um único mecanismo de geração de identificadores em todos os ambientes de execução. Quando o ambiente não oferecer as garantias necessárias a esse mecanismo, o sistema DEVE recusar-se a operar, apresentando mensagem explícita na inicialização, e NÃO DEVE recorrer a mecanismo alternativo de geração nem degradar silenciosamente.

> **Nota de revisão (2026-09-19)**: os requisitos FR-062 a FR-070, que tratavam de conta de usuário e sincronização em nuvem, foram removidos do escopo desta versão (ver *Clarifications › Session 2026-09-19*). Seus números não foram reaproveitados, para preservar a validade das referências históricas registradas nesta especificação.

### Key Entities

- **Exercício**: movimento identificável e reutilizável entre treinos e sessões (ex.: "Supino reto"). Possui um identificador estável e imutável, independente do nome exibido — é ele que permite comparar execuções históricas mesmo após renomeações. Tem origem no catálogo pré-cadastrado ou é personalizado, criado pelo usuário, sem diferença de tratamento entre os dois casos. Pode ter atributos descritivos como grupo muscular e equipamento.
- **Treino**: modelo reutilizável criado pelo usuário, com nome e uma lista ordenada de itens. É o que o usuário monta antes de ir à academia.
- **Item de treino**: a presença de um exercício dentro de um treino, com sua posição na ordem, a abordagem de série escolhida e os valores planejados (séries, repetições, carga, RIR).
- **Série planejada**: o alvo de uma série específica de um item de treino — repetições, carga e RIR planejados. Permite que séries de um mesmo exercício tenham alvos diferentes.
- **Abordagem de série**: o tipo de execução aplicado ao exercício (tradicional, dropset e futuros). Determina a estrutura de registro esperada para aquele exercício.
- **Sessão de treino**: uma execução concreta de um treino em uma data e horário, com estado (em andamento, concluída, descartada) e uma cópia dos valores planejados vigentes no início. É a unidade do histórico. Após concluída, admite correção de valores pelo usuário, que gera nova versão do registro preservando a anterior; a data e o horário da execução e a posição cronológica permanecem imutáveis (FR-112 a FR-118).
- **Exercício da sessão**: o exercício tal como foi executado dentro de uma sessão, com sua ordem e sua abordagem. Pode ter origem no plano da sessão ou ter sido adicionado durante a execução, caso em que não possui metas planejadas associadas. Registra a marcação de exercício não realizado como intenção explícita do usuário (FR-125). O estado apresentado — realizado, parcialmente realizado, não realizado — **não é registro persistido**: é derivado das séries registradas e dessa marcação, por regra única de domínio.
- **Série realizada**: o registro efetivo de uma série executada — carga utilizada, repetições realizadas, RIR realizado, momento do registro e vínculo com a série planejada correspondente, quando houver. Para dropsets, contém os degraus executados.
- **Arquivo de backup**: representação completa e versionada dos dados do usuário em um instante — treinos, exercícios personalizados e sessões, incluindo os registros excluídos logicamente. É a unidade de portabilidade dos dados: o que permite restaurar tudo em um aparelho novo e o que alimentará as análises externas previstas em FR-059 a FR-061.
- **Aviso de progressão**: a indicação de possibilidade de aumento de carga associada a um exercício, acompanhada dos dados de origem que a fundamentam. **Não é registro persistido**: é projeção calculada sob demanda a partir do histórico, sempre obtida por consulta à execução finalizada mais recente do exercício (FR-094). Consta nesta lista por ser conceito de domínio, não por ocupar lugar no modelo de armazenamento.

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
- **SC-011**: O aplicativo executa 100% das suas funcionalidades com o dispositivo em modo avião — do primeiro uso após a instalação até a exportação do backup —, sem degradação e sem perda de dados.
- **SC-012**: 90% dos usuários concluem e registram seu primeiro treino completo sem abandonar a execução e sem precisar de suporte.
- **SC-013**: Nenhuma sessão concluída é perdida ou alterada após edição ou exclusão do treino que a originou, verificado em 100% dos casos de teste.
- **SC-014**: A adição de um novo tipo de abordagem de série não exige alteração nos registros históricos existentes nem invalida sessões anteriores.
- **SC-015**: Importar um arquivo de backup em um aparelho recém-instalado restaura 100% dos treinos, dos exercícios personalizados e das sessões concluídas contidos no arquivo.
- **SC-016**: A exportação de um histórico com 200 sessões produz um único arquivo em menos de 10 segundos, sem conexão de rede.
- **SC-017**: Importar o mesmo arquivo duas vezes seguidas não cria nenhum registro duplicado e não altera nenhuma sessão já existente, verificado em 100% dos casos de teste.
- **SC-018**: Uma tentativa de importar arquivo inválido, corrompido ou incompatível não altera nenhum dado existente no aparelho, verificado em 100% dos casos de teste.
- **SC-019**: Renomear um exercício preserva 100% das suas execuções históricas e não interrompe a comparação de desempenho ao longo do tempo.
- **SC-020**: O usuário localiza e adiciona um exercício do catálogo a um treino em no máximo 3 toques a partir da tela de edição do treino.
- **SC-021**: O critério de aumento de carga produz o mesmo resultado para os mesmos dados de entrada em 100% das avaliações, sem variação entre execuções.
- **SC-022**: Nenhum campo de carga é apresentado preenchido na primeira série de um exercício em uma nova sessão, verificado em 100% dos casos de teste.
- **SC-023**: Aplicar a carga da execução anterior ao campo de carga exige exatamente 1 toque.
- **SC-024**: Um exercício planejado e totalmente pulado não altera a indicação de progressão vigente daquele exercício, verificado em 100% dos casos de teste.
- **SC-025**: Exercícios adicionados fora do plano aparecem integralmente no histórico da sessão, com carga, repetições e RIR registrados.
- **SC-026**: Após um ciclo completo de exportação e importação, 100% das execuções históricas continuam vinculadas ao mesmo exercício, e a consulta de evolução de qualquer exercício produz exatamente o mesmo resultado do aparelho de origem.
- **SC-027**: O usuário conclui a exportação do backup em no máximo 3 toques a partir da tela inicial.
- **SC-028**: O aplicativo exibe a data do último backup e, ultrapassado o intervalo de FR-110, apresenta o lembrete sem interromper, bloquear ou exigir interação. Durante uma sessão em andamento o lembrete não é apresentado; vencido o intervalo no meio de um treino, ele aparece no encerramento da sessão. Exibir o lembrete não reinicia a contagem — apenas uma exportação concluída com sucesso o faz. Verificado em 100% dos casos de teste.
- **SC-029**: Corrigir um valor em uma sessão concluída preserva a versão anterior no dispositivo e não altera a data, o horário nem a posição cronológica da sessão, verificado em 100% dos casos de teste.
- **SC-030**: Após a correção de valores de uma sessão concluída, a indicação de progressão do exercício reflete os valores corrigidos já na consulta seguinte, sem nenhuma ação adicional do usuário.
- **SC-031**: Importar um arquivo que contém uma sessão corrigida aplica a correção no aparelho de destino e preserva a versão local anterior; importar um arquivo cuja versão não seja mais recente que a local não altera a sessão. Ambos verificados em 100% dos casos de teste.
- **SC-032**: O valor de carga herdado da série anterior é apresentado com o mesmo tratamento visual de um valor digitado, sem qualquer marcação de sugestão ou provisoriedade, verificado em 100% dos casos de teste.
- **SC-033**: Quando a persistência do armazenamento não é concedida, o usuário consegue identificar essa condição e o risco associado sem consultar ajuda, e o intervalo do lembrete de backup passa de 7 para 2 dias — verificado em 100% dos casos de teste, inclusive com o intervalo vencendo durante a execução de um treino, onde o lembrete não pode ser apresentado nem bloquear.
- **SC-034**: Em ambiente de execução sem as garantias necessárias à geração de identificadores, o aplicativo recusa-se a operar com mensagem explícita na inicialização, e nenhum registro chega a ser criado, verificado em 100% dos casos de teste.

## Assumptions

### Escopo

- A implementação da funcionalidade de Inteligência Artificial de análise não faz parte do escopo inicial; o que se exige agora é apenas que os dados sejam preservados de forma estruturada e completa o suficiente para viabilizá-la depois (FR-059 a FR-061).
- Funcionalidades comuns de aplicativos de treino não citadas na descrição são consideradas fora do escopo desta especificação: cronômetro de descanso, planos periodizados por semana, notas de sessão, registro de peso corporal e medidas, mídia demonstrativa dos exercícios, exportação de dados, compartilhamento social e integração com dispositivos vestíveis. Podem ser especificadas como features futuras.
- A rotina de treinos é montada pelo próprio usuário; não há perfil de treinador nem prescrição de treino por terceiros.
- Conta de usuário, backup em nuvem e sincronização entre dispositivos estão **fora do escopo desta versão**. Esta versão é local ao dispositivo: não há servidor, não há autenticação e nenhuma funcionalidade depende de rede. Seguem igualmente fora de escopo: compartilhamento de treinos entre contas, perfis com múltiplos papéis e colaboração entre usuários.
- A continuidade dos dados nesta versão é responsabilidade da exportação manual em arquivo (FR-095 a FR-111). Não existe backup automático; a mitigação prevista para esse risco é o lembrete não bloqueante de FR-109 e FR-110.
- O arquivo exportado não é criptografado. Proteger o local onde ele é guardado é responsabilidade do usuário. Criptografia do backup é evolução futura.
- O catálogo inicial de exercícios é cadastrado e mantido pelo proprietário do aplicativo, não pelos usuários finais. Uma interface de administração do catálogo dentro do aplicativo não faz parte do escopo inicial.
- O aplicativo terá inicialmente um único usuário (o próprio proprietário). É essa condição que justifica dispensar conta e sincronização nesta versão: o problema real a resolver é a preservação do histórico ao longo do tempo, não o acesso concorrente de múltiplos usuários ou a edição simultânea em vários aparelhos.

### Dados e domínio

- **RIR** (Reps In Reserve) é registrado como um número inteiro não negativo, representando quantas repetições o usuário acredita que ainda conseguiria realizar ao encerrar a série.
- Um RIR realizado maior que o planejado significa que a série terminou com mais folga do que o pretendido, ou seja, que a carga estava leve demais — por isso o RIR entra no critério de aumento de carga na direção de FR-043 (b).
- As repetições planejadas são definidas como um valor-alvo por série. Faixas de repetições (ex.: 8–12) são tratadas como evolução futura e não fazem parte do escopo inicial.
- A carga é registrada em quilogramas, com suporte a valores fracionados (ex.: 2,5 kg). Outras unidades são evolução futura.
- Exercícios sem carga externa são suportados com carga zero, e sua progressão é observada pelas repetições.
- O histórico é mantido indefinidamente, sem expurgo automático; o volume de dados por usuário é pequeno o suficiente para que isso não seja um problema.
- A sessão de treino guarda uma cópia do plano vigente no seu início; essa é a razão pela qual editar ou excluir um treino não afeta o histórico.
- Uma sessão em andamento existe apenas no aparelho em que foi iniciada e não é incluída na exportação enquanto não for concluída ou descartada. Apenas sessões concluídas compõem o histórico exportável.

### Uso e ambiente

- O uso principal ocorre no smartphone, dentro da academia, com o aparelho na mão e frequentemente com conexão de rede instável ou ausente. Nesta versão a questão deixa de se colocar: o aplicativo não depende de rede em nenhuma funcionalidade, nem mesmo na primeira execução após a instalação.
- A prioridade de experiência é iPhone, seguido de Android e, por último, tablets; tablets devem funcionar adequadamente, mas não recebem otimização dedicada de layout no escopo inicial.
- A orientação retrato é a orientação suportada no escopo inicial.

### Premissas de modelo de dados para evolução futura

Conta de usuário, backup em nuvem e sincronização estão fora desta versão, mas são evolução prevista. As premissas a seguir existem para que essa fase futura seja adicionada sem migração de dados nem reescrita do histórico já acumulado, e são vinculantes para `/speckit-plan`:

- **Identificadores gerados no cliente e não sequenciais**: toda entidade recebe um identificador único gerado no próprio dispositivo, sem depender de numeração sequencial ou de um servidor. É o que garante que registros criados em aparelhos diferentes — ou, na fase futura, por usuários diferentes — nunca colidam ao serem reunidos, e é o que torna a mesclagem da importação (FR-101) possível.
- **Campos de criação e alteração em todas as entidades**: cada registro carrega o momento em que foi criado e o momento da sua última alteração. São a base da regra de precedência de FR-103 e, futuramente, da resolução de conflitos de sincronização.
- **Exclusão lógica em vez de física**: nenhuma entidade é removida fisicamente; a exclusão é marcada no registro. Sem essa marca, a importação e a sincronização futura ressuscitariam dados que o usuário apagou (FR-098). Isto generaliza para todas as entidades o que FR-076 já exige para exercícios com histórico.
- **Identidade estável do exercício preservada entre exportação e importação**: o identificador do exercício é a chave que mantém o histórico comparável (FR-041, FR-073, FR-074) e não pode ser regenerado durante a importação, sob pena de fragmentar a série histórica do usuário.
- **Carimbos de tempo em UTC com o deslocamento local preservado**: com exclusão lógica e precedência por "alteração mais recente", o relógio do aparelho deixa de ser detalhe de exibição e passa a afetar a correção da mesclagem. O deslocamento local é preservado porque a hora em que o treino foi feito é informação de domínio.
- **Nenhum campo de titular é introduzido agora**: os identificadores gerados no cliente são justamente o que permite associar todos os registros a uma conta na fase futura sem reescrever identificadores nem migrar o histórico. Antecipar um campo de titular seria especulação sem uso nesta versão.

Uma premissa adicional decorre de requisito desta versão, e não da fase futura, mas é igualmente vinculante para o planejamento:

- **Versionamento do registro de sessão**: corrigir uma sessão concluída gera nova versão do registro e preserva a anterior no dispositivo (FR-114). As versões anteriores são locais e não sobrevivem a uma restauração: a exportação carrega apenas a versão vigente de cada registro, acompanhada da marca de que houve correção e da data da última alteração (FR-116). A comparação entre a versão do arquivo e a do aparelho, na importação, usa a data de última alteração (FR-102). A data e o horário da execução nunca participam do versionamento — são imutáveis (FR-115).

### Direcionamentos para a fase de planejamento

Os pontos a seguir foram declarados pelo solicitante como preferências de implementação. Não são requisitos funcionais e devem ser tratados em `/speckit-plan`:

- **Nenhum estilo visual específico é definido nesta especificação.** A direção visual é decisão da fase de implementação, delimitada pelas restrições de estilo registradas na constituição (seção *Restrições de Produto e Plataforma*): contraste garantido por construção e fundos de texto estáveis; proibição de transparência, blur e efeitos dependentes do conteúdo sob o elemento na tela de execução; campos de carga, repetições e RIR como elementos de maior hierarquia visual; legibilidade sob luz forte e com brilho reduzido; nenhum efeito que comprometa a rolagem ou a meta de 5 segundos por série. Os requisitos de contraste, área de toque e desempenho desta spec — FR-051, FR-054, FR-055, FR-056, SC-001, SC-008 e SC-009 — permanecem integralmente válidos e são o piso que qualquer direção visual precisa atender.
- A skill **`frontend-design`** deve ser utilizada durante a implementação das telas.
- A arquitetura e a modelagem de dados devem evitar decisões que dificultem a inclusão futura de novos tipos de abordagem de série, novos indicadores por série e as análises com Inteligência Artificial.
- O momento e o formato exatos de apresentação do aviso de progressão durante o treino serão definidos no planejamento, respeitando FR-046 (não bloquear a execução).

### Governança

- O arquivo `.specify/memory/constitution.md` do projeto ainda está com o conteúdo padrão do template, sem princípios preenchidos. Nenhuma restrição de governança foi aplicada a esta especificação. Recomenda-se executar `/speckit-constitution` antes do planejamento.
