# fit-kings Constitution

## Core Principles

### I. Integridade do Registro (NÃO NEGOCIÁVEL)

O dado registrado pelo usuário é o ativo que este aplicativo existe para proteger.

- Toda série confirmada DEVE ser gravada de forma durável no instante da confirmação, antes de
  qualquer retorno visual que sugira sucesso. Confirmar na interface sem a gravação concluída é
  defeito, não otimização de desempenho.
- Sessão concluída é registro imutável quanto a alteração destrutiva. Nenhuma operação DEVE
  sobrescrever, mesclar ou remover uma sessão já concluída, qualquer que seja a sua origem.
- O usuário PODE corrigir uma sessão concluída — um erro de digitação envenena o histórico e
  contamina a comparação de desempenho. A correção DEVE gerar uma nova versão do registro,
  preservando integralmente a versão anterior. Toda leitura utiliza a versão vigente.
- Operações externas — edição ou exclusão do treino de origem, migração de esquema — NÃO DEVEM
  alterar sessões concluídas por meio nenhum, inclusive por versionamento. A proibição alcança
  toda alteração originada fora do usuário.
- A importação de arquivo NÃO DEVE inventar alteração em sessão concluída, mas PODE propagar
  correção que o próprio usuário tenha feito em outro dispositivo, identificada pela data de
  última alteração do registro. Mesmo nesse caso permanecem proibidas a mesclagem campo a campo e
  a destruição de qualquer versão: a versão recebida entra como nova versão local e a anterior é
  preservada.
- O histórico NÃO DEVE depender do treino que o originou: a sessão carrega sua própria cópia dos
  valores planejados vigentes no início.
- Falha ao persistir DEVE ser comunicada ao usuário com alternativa de ação. Perda silenciosa de
  registro é proibida.

**Rationale**: perder dados no meio do treino destrói a confiança e devolve o usuário ao papel —
é a falha da qual o produto não se recupera. Verificável por FR-017, FR-033, FR-040, FR-058,
SC-002, SC-003 e SC-013.

### II. A Academia é o Ambiente de Projeto (NÃO NEGOCIÁVEL)

O aplicativo é projetado para quem está de pé, com as mãos ocupadas e o descanso correndo.

- Registrar uma série completa DEVE custar no máximo 3 toques e menos de 5 segundos, sem sair da
  tela de execução do treino.
- Elementos interativos DEVEM ter área de toque de no mínimo 44 x 44 pontos, e o texto, contraste
  de no mínimo 4,5:1.
- Nada DEVE bloquear, interromper ou exigir interação durante uma sessão em andamento — avisos de
  progressão, lembretes de backup e sugestões inclusive.
- Exceção única: a falha ao persistir um registro DEVE interromper, por servir ao Princípio I.
  Perder a série é pior do que interromper o treino. Nenhuma outra condição qualifica como
  exceção a esta regra.
- Nenhum valor de carga DEVE ser pré-preenchido entre sessões, nem a partir do plano do treino
  nem a partir do histórico. Exibir a carga da execução anterior como referência e oferecer sua
  aplicação por toque é permitido; preencher o campo automaticamente, não.
- Dentro da mesma sessão, a carga informada na série anterior DEVE ser herdada pela série
  seguinte do mesmo exercício, permanecendo editável. A herança não alcança a primeira série de
  um exercício nem atravessa exercícios distintos. O valor herdado é dado efetivo da série, não
  sugestão, e DEVE ser visualmente indistinguível de um valor digitado pelo usuário.
- Quando estilo visual e usabilidade durante o treino entrarem em conflito, a usabilidade
  prevalece, sem exceção e sem renegociação caso a caso.

**Rationale**: é o momento de uso mais frequente e mais crítico do produto. Uma interface que
funciona bem sentado à mesa e falha com o usuário suado e apressado não cumpre o propósito.
Verificável por FR-021, FR-046, FR-054, FR-056, SC-001, SC-009 e SC-028.

### III. Autonomia Local

Nesta versão o aplicativo é autossuficiente no dispositivo.

- Nenhuma execução DEVE exigir conexão de rede. Instalado o aplicativo, todas as suas telas e
  funcionalidades operam integralmente offline, inclusive na primeira execução após a instalação.
- A obtenção inicial do aplicativo — o ato de instalá-lo no aparelho — PODE exigir rede uma única
  vez, conforme a plataforma de entrega adotada. A proibição deste princípio alcança a execução,
  não a instalação.
- Nenhum componente DEVE ser introduzido se seu funcionamento depender de ida e volta a um
  servidor.
- A continuidade dos dados entre aparelhos DEVE ser obtida por exportação e importação de arquivo,
  não por serviço remoto.
- Conta de usuário, backup em nuvem e sincronização estão fora do escopo desta versão. Incluí-los
  exige emenda desta constituição, não apenas uma decisão da fase de planejamento.

**Rationale**: a rede na academia é instável ou inexistente, e o produto tem um único usuário —
infraestrutura remota adicionaria custo, modos de falha e superfície de ataque sem valor
correspondente. Verificável por FR-057, FR-111 e SC-011.

### IV. Modelo de Dados Aditivo

O histórico deve durar anos e sobreviver a todas as versões futuras do aplicativo.

- Toda entidade DEVE ter identificador único gerado no cliente, não sequencial e imutável.
- A geração de identificador DEVE ter caminho único em todos os ambientes — desenvolvimento, teste
  e produção. Nenhum mecanismo alternativo ou de contingência é admitido. Ambiente de execução que
  não suporte o caminho único NÃO DEVE executar o aplicativo, e a recusa DEVE ser explícita na
  inicialização, nunca uma degradação silenciosa. Dois caminhos de geração produzem identificadores
  de origens distintas entre ambientes e corrompem sem alarde a identidade estável que este
  princípio existe para proteger.
- Toda entidade DEVE registrar o momento de criação e o da última alteração, em UTC, preservando
  o deslocamento local.
- A exclusão DEVE ser lógica. Remoção física de registro do usuário é proibida.
- A identidade do exercício DEVE permanecer estável entre renomeações, exportações e importações.
- A evolução do esquema DEVE ser aditiva: novos tipos de abordagem de série e novos atributos por
  série NÃO DEVEM invalidar, reescrever nem exigir migração destrutiva de registros existentes.
- Toda versão DEVE conseguir ler os arquivos de backup gerados pelas versões anteriores.

**Rationale**: estas restrições são o que permite acrescentar conta e sincronização numa fase
futura sem migrar dados nem reescrever histórico, e o que viabiliza as análises com IA previstas.
Um erro de modelagem aqui só se manifesta anos depois, quando já não há como corrigir sem perder
o histórico. Verificável por FR-014, FR-041, FR-059 a FR-061, FR-073, FR-074, FR-097, FR-105,
SC-014, SC-019 e SC-026.

### V. Domínio Determinístico e Verificável

As regras que produzem informação derivada — a começar pelo aviso de aumento de carga — são o
diferencial do produto e precisam ser confiáveis.

- Toda regra de domínio DEVE ser função pura dos dados registrados: mesma entrada, mesmo
  resultado, sempre. NÃO DEVE depender de idioma, fuso, ordem de navegação, estado de interface
  nem da leitura do relógio do sistema no momento do cálculo. Os carimbos de tempo armazenados
  nos registros são dado de entrada legítimo e permanecem permitidos.
- Cada regra DEVE ser implementada em um único lugar e DEVE ser testável sem a interface.
- Estado derivável dos dados registrados NÃO DEVE ser persistido como fonte de verdade. Cache é
  permitido apenas se for descartável, reconstruível a qualquer momento a partir dos registros e
  nunca consultado como autoridade. A indicação ativa de progressão é o caso exemplar: ela é, por
  definição, a vinculada à execução finalizada mais recente do exercício, e DEVE ser obtida por
  consulta, nunca por campo persistido.
- O usuário DEVE conseguir consultar os dados que fundamentam qualquer indicação apresentada.
- Regra de domínio sem teste automatizado cobrindo seus casos de fronteira NÃO DEVE ser
  considerada concluída.

**Rationale**: um aviso de progressão que varia sem explicação é pior do que nenhum aviso — corrói
a confiança no produto inteiro. Verificável por FR-042 a FR-048, FR-078 a FR-081, FR-092 a FR-094,
SC-006, SC-007 e SC-021.

## Restrições de Produto e Plataforma

**Plataformas**: iPhone é a prioridade de experiência, seguido de Android e, por último, tablets.
Tablets DEVEM funcionar adequadamente, sem otimização dedicada de layout nesta versão. A orientação
retrato é a única suportada. O aplicativo DEVE ser operável integralmente por toque.

**Acessibilidade**: os pisos de 44 x 44 pontos de área de toque e de 4,5:1 de contraste são mínimos,
não metas. Nenhuma tela DEVE apresentar rolagem horizontal ou elementos cortados, do menor
smartphone ao tablet.

**Estilo visual**: nenhum estilo visual específico é obrigatório. A direção visual é decidida na
implementação e DEVE atender a estas restrições, que prevalecem sobre qualquer preferência
estética:

- O contraste mínimo de 4,5:1 DEVE ser garantido por construção, e não verificado caso a caso.
  Fundos de texto DEVEM ser estáveis e independentes do conteúdo que estiver atrás ou abaixo deles.
- A tela de execução de treino NÃO DEVE usar transparência, blur de fundo ou qualquer efeito cujo
  custo de renderização dependa do conteúdo sob o elemento.
- Os campos de carga, repetições e RIR DEVEM ser os elementos de maior hierarquia visual da tela
  de execução.
- A interface DEVE permanecer legível sob luz forte e em tela com brilho reduzido.
- Efeitos visuais NÃO DEVEM comprometer a fluidez de rolagem nem a meta de 5 segundos por série.

Estas restrições decorrem do Princípio II e não flexibilizam nenhum de seus pisos.

A skill `frontend-design` DEVE ser utilizada na implementação das telas.

**Unidades e domínio**: carga em quilogramas, com suporte a valores fracionados; RIR como inteiro
não negativo; repetições planejadas como valor-alvo por série.

**Fora de escopo desta versão**: conta de usuário, backup em nuvem, sincronização, compartilhamento
entre contas, cronômetro de descanso, periodização, mídia demonstrativa dos exercícios, exportação
para formatos de terceiros, integração com dispositivos vestíveis e interface de administração do
catálogo. Ampliar este escopo exige emenda.

## Fluxo de Desenvolvimento e Portões de Qualidade

**Fluxo**: o projeto segue o Spec Kit. Nenhuma implementação começa sem `plan.md` e `tasks.md`
derivados da especificação vigente. Mudança de escopo é registrada na especificação antes de ser
construída, nunca depois.

**Rastreabilidade**: toda tarefa de implementação de funcionalidade DEVE referenciar o requisito
funcional ou o critério de sucesso que a justifica. Código de funcionalidade sem requisito
correspondente é escopo não aprovado. A regra não alcança código de infraestrutura e ferramental —
configuração de build, injeção de dependência, tratamento de erro, andaimes de teste e
equivalentes —, que existe para sustentar os requisitos sem implementar nenhum diretamente.

**Portões de teste obrigatórios** — nenhuma entrega é considerada concluída sem cobertura
automatizada para:

1. Recuperação integral das séries confirmadas após encerramento inesperado do aplicativo.
2. Imutabilidade do histórico diante de edição e de exclusão do treino de origem.
3. Idempotência da importação e recusa de arquivo inválido sem alteração dos dados existentes.
4. Determinismo do critério de aumento de carga, incluindo os casos de fronteira de FR-078 a
   FR-081 e de FR-092 a FR-094.

**Revisão**: toda alteração DEVE ser verificada contra esta constituição antes de ser integrada.
Violação identificada bloqueia a integração até ser corrigida ou até a constituição ser emendada.

## Governance

Esta constituição prevalece sobre qualquer outra prática, preferência ou conveniência de
implementação do projeto. Havendo conflito entre ela e um plano, uma tarefa ou uma decisão técnica,
a constituição vence.

**Emendas**: alterar princípios, restrições ou portões exige (a) registro da mudança e da sua
justificativa, (b) incremento de versão conforme a política abaixo e (c) atualização da
especificação afetada na mesma ocasião. Emenda não é retroativa sobre dados já registrados: o
Princípio I permanece válido sobre o histórico existente qualquer que seja a emenda.

**Versionamento**: MAJOR para remoção ou redefinição incompatível de princípio ou de regra de
governança; MINOR para novo princípio ou nova seção, ou ampliação material de orientação existente;
PATCH para esclarecimentos, correções de redação e refinamentos sem efeito semântico.

**Conformidade**: todo `plan.md` DEVE conter verificação explícita contra estes princípios antes de
gerar tarefas. Complexidade adicional DEVE ser justificada por um requisito — "pode ser útil depois"
é justificativa insuficiente, exceto onde o Princípio IV já a torna obrigatória. Portões de
qualidade não são dispensáveis por prazo.

**Version**: 1.4.0 | **Ratified**: 2026-09-19 | **Last Amended**: 2026-09-19
