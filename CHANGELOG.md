# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto adere ao
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

> A versão declarada aqui é a mesma de `package.json`, e ela viaja no cabeçalho de todo arquivo de
> backup exportado — ver [o contrato](specs/001-workout-tracking-app/contracts/backup-file.md).
> Mudar de versão sem registrar aqui deixa o usuário sem como saber o que gerou um arquivo antigo.

## [Não publicado]

### Pendente de validação em aparelho

Quatro verificações exigem um iPhone com o aplicativo instalado pela Tela de Início e não são
simuláveis. Enquanto não forem feitas, esta versão não está pronta para uso diário — ver
[docs/validacao.md](docs/validacao.md).

- Persistência do armazenamento após reiniciar o aparelho e após dias sem uso (risco R1).
- Modo avião de ponta a ponta: treino completo, histórico e exportação sem erro de rede.
- Legibilidade sob luz forte e com brilho de tela reduzido.
- Tempo de registro de uma série abaixo de 5 segundos. A contagem de toques já está verificada:
  2 no caminho comum, 3 no pior caso, contra um piso de 3.

## [0.1.0] — 2026-09-20

Primeira versão completa. PWA instalável, offline depois da instalação, sem conta, sem servidor e
sem sincronização — os dados vivem no aparelho, e a continuidade entre aparelhos é feita por
exportação e importação de arquivo.

### Adicionado

#### Montar e manter treinos

- Criação, edição, exclusão e listagem de treinos, com exclusão mediante confirmação explícita que
  diz o que **não** é apagado: as sessões já registradas sobrevivem.
- Exercícios adicionados, removidos e reordenados dentro do treino, com a ordem preservada e
  respeitada na execução.
- Valores planejados por série — repetições, carga e RIR —, podendo variar entre séries do mesmo
  exercício.
- Abordagens tradicional e dropset, como valor de um campo aberto: uma abordagem nova não exige
  alteração estrutural nem migração.
- Catálogo inicial com 56 exercícios curados, e criação de exercícios personalizados, tratados de
  forma equivalente aos do catálogo para execução, histórico, comparação e progressão.
- Busca por nome, grupo muscular ou equipamento, sem sensibilidade a acento ou caixa.
- Exercício com execução no histórico não é excluível, apenas ocultável de novas seleções.

#### Executar o treino

- Registro de carga, repetições e RIR por série, **sem sair da tela de execução**, em 2 toques no
  caminho comum e 3 no pior caso.
- Cada série confirmada é gravada em transação própria no instante da confirmação. O retorno visual
  de sucesso só aparece depois do commit.
- A sessão preserva sua própria cópia dos valores planejados vigentes no início: editar ou excluir
  o treino depois não a alcança.
- Carga da série anterior do mesmo exercício herdada automaticamente, editável, e exibida como dado
  efetivo — sem marca d'água nem estado provisório. A herança não alcança a primeira série de um
  exercício nem atravessa exercícios.
- Carga da execução anterior exibida como referência no cabeçalho, aplicável por um toque. Nenhuma
  carga é pré-preenchida entre sessões.
- Comparação planejado x realizado visível durante a execução, com marca e palavra além da cor.
- Séries extras, séries e exercícios marcados como não realizados, e exercícios acrescentados fora
  do plano.
- Conclusão com resumo planejado x realizado, e descarte com confirmação explícita.
- Uma sessão em andamento por vez, com retomar, concluir ou descartar a pendente.
- RIR opcional: a série é registrável sem ele.

#### Retomar treino interrompido

- Sinalização de sessão em andamento na abertura, em qualquer tela, sem bloquear.
- Retomada no ponto exato em que parou, derivado das séries registradas em vez de guardado.
- Estado preservado ao navegar entre telas, ao minimizar, ao trocar de aplicativo e ao bloquear a
  tela.
- Sessão aberta há mais de 12 horas é tratada como abandonada e oferece concluir ou descartar.
- Falha ao persistir interrompe com mensagem compreensível e alternativa de ação. É a única
  interrupção que o aplicativo se permite durante um treino.

#### Histórico

- Lista de sessões concluídas em ordem cronológica, guardadas sem prazo e sem expurgo automático.
- Detalhe da sessão com planejado e realizado lado a lado, série a série.
- Todas as execuções de um mesmo exercício ao longo do tempo, comparáveis entre si.
- Correção de carga, repetições e RIR de séries já registradas, com confirmação explícita. A
  correção gera uma versão nova e preserva integralmente a anterior; a data do treino e sua posição
  na ordem cronológica não mudam.
- Marca de correção com a data da última alteração.
- O histórico sobrevive à edição e à exclusão do treino que o originou.
- Renomear um exercício mantém íntegras todas as execuções anteriores e todas as comparações.

#### Aviso de aumento de carga

- Indicação de que dá para subir a carga quando as repetições superaram a meta em todas as séries
  planejadas e o RIR realizado ficou no mínimo no planejado. Sem RIR informado, aplica-se só o
  critério de repetições.
- O aviso não bloqueia, não interrompe e não exige interação.
- Os dados que fundamentam a indicação são consultáveis série a série, gerados pela mesma função que
  decidiu o aviso.
- A indicação é sempre consultada, nunca guardada: depois de uma correção, ela reflete os valores
  corrigidos sem exigir ação nenhuma.

#### Evolução das cargas

- Curva das cargas de um exercício ao longo do tempo, agregada sob demanda.
- Cada ponto leva à sessão que o originou.
- Histórico insuficiente recebe uma mensagem dizendo quantas execuções faltam, em vez de uma tela
  vazia.

#### Backup em arquivo

- Exportação de todos os dados num arquivo JSON, entregue pela folha de compartilhamento do sistema,
  com download como caminho alternativo.
- Importação com resumo do que vai entrar **antes** de qualquer gravação, e relatório do que entrou,
  do que foi atualizado e do que foi ignorado.
- Importar o mesmo arquivo duas vezes não produz efeito além do da primeira.
- Arquivo inválido é recusado sem alterar nenhum dado existente, com mensagem específica para cada
  caso: JSON truncado, arquivo de outro aplicativo, referência não resolvida, identificador
  duplicado e versão de formato mais nova que a suportada.
- Correção feita em outro aparelho entra como versão nova, preservando a local.
- Lembrete de backup a cada 7 dias, ou a cada 2 quando o armazenamento persistente não foi
  concedido. O lembrete não aparece durante um treino, e só uma exportação bem-sucedida reinicia a
  contagem.
- Data do último backup visível em Ajustes e no diagnóstico.

#### Plataforma

- PWA instalável, em retrato, com service worker precacheando a aplicação e a fonte.
- Verificação e solicitação de armazenamento persistente na abertura, com estado degradado declarado
  quando não concedido.
- Tela de diagnóstico com estado da persistência, espaço usado e disponível.
- Recusa explícita de operar fora de contexto seguro, na inicialização, apontando a causa real.

### Segurança

- **O arquivo de backup não é criptografado.** Ele carrega o histórico de treinos em texto legível,
  e onde guardá-lo é responsabilidade do usuário. Decisão registrada em
  [Assumptions › Escopo](specs/001-workout-tracking-app/spec.md) e no contrato do arquivo.
- Nenhum dado sai do aparelho por iniciativa do aplicativo. Não há cliente HTTP, telemetria nem
  chamada a serviço externo. A exportação entrega o arquivo ao sistema operacional e perde contato
  com ele.

### Notas técnicas

- `src/domain/` é TypeScript puro e não importa React, Dexie, DOM nem as camadas acima dele. Três
  regras de lint garantem isso, junto da proibição de ler o relógio do sistema no domínio e de gerar
  identificador fora de `src/plataforma/id.ts`.
- Nenhum estado derivável é persistido como fonte de verdade. O único cache do modelo é
  `sessaoVersoes.vigente`, com rotina de reconstrução.
- Exclusão é sempre lógica. Não existe método de remoção física de registro do usuário.
- Migrações de esquema são aditivas por verificação: uma migração que remova tabela ou índice é
  recusada no momento em que o banco abre.
- Contraste de 4,5:1 garantido por construção — os componentes consomem pares de cor já validados, e
  uma suíte recusa cor literal em qualquer lugar de `src/`.
- 457 testes de unidade e integração, 21 de ponta a ponta, cobrindo os quatro portões de teste da
  constituição.

[Não publicado]: https://github.com/lucasreisds/fit-kings/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lucasreisds/fit-kings/releases/tag/v0.1.0
