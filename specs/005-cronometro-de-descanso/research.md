# Research: Campo de carga apagável e cronômetro de descanso

## Aviso sonoro numa PWA no iOS

**Decisão**: Web Audio API, um oscilador curto, criado no toque que inicia a contagem.

**Justificativa**: o Safari no iOS só permite áudio depois de um gesto do usuário, e recusa
`AudioContext` criado fora dele. O toque que inicia o descanso é um gesto, e é o único caminho pelo
qual a contagem começa (FR-173) — logo, não existe cenário em que o áudio seja necessário sem que o
gesto tenha ocorrido. Um arquivo de som seria um recurso a mais para carregar e servir offline; um
oscilador não pesa nada e não precisa de rede.

**Alternativas consideradas**:
- `<audio>` com arquivo: exige o arquivo no cache do service worker e tem a mesma restrição de gesto.
- `navigator.vibrate`: não existe no Safari do iOS. Seria código morto no alvo prioritário.
- Notificação do sistema via Web Push: alcançaria a tela bloqueada, mas exige servidor de push.
  Quebra o Princípio III. Recusado com o usuário antes de escrever a especificação.

## Contagem que sobrevive a segundo plano

**Decisão**: derivar o restante de `(início, duração, agora)` a cada redesenho; usar `setInterval`
apenas como gatilho de redesenho, e forçar um recálculo em `visibilitychange`.

**Justificativa**: o iOS congela temporizadores de abas em segundo plano. Um contador que decrementa
a cada tique simplesmente para, e volta mostrando o valor de quando parou — mentindo sobre o tempo
decorrido. Derivar do relógio dá a resposta certa em todos os casos, inclusive "já terminou".

**Alternativas consideradas**:
- Contador decrescente: falha exatamente no caso de uso descrito pelo usuário.
- `Web Worker`: também é congelado em segundo plano no iOS; acrescenta complexidade sem resolver.
- Service worker com `setTimeout`: o service worker é encerrado pelo navegador a qualquer momento.

## Onde guardar o descanso em andamento

**Decisão**: `localStorage`, chave única, descartada quando a sessão não bate.

**Justificativa**: precisa sobreviver a recarga (FR-178) e não pode aparecer no backup nem no
histórico (FR-186, SC-061). O IndexedDB do aplicativo é integralmente exportado, então guardar lá
significaria excluir explicitamente da exportação — regra nova a lembrar para sempre, pelo mesmo
motivo que as listas de campos causaram os defeitos das features 003 e 004.

**Alternativas consideradas**:
- Tabela no IndexedDB: migração, exclusão da exportação e um campo permanente para um dado efêmero.
- Só memória (Zustand): não sobrevive à recarga, que é requisito explícito.
- `sessionStorage`: some ao fechar a aba, e no iOS a aba é descartada com frequência — perderia o
  descanso justamente no caso que o requisito existe para cobrir.

## Terceiro estado do campo de carga

**Decisão**: valor etiquetado com a própria origem — `{ origem: 'herdado' }` ou
`{ origem: 'usuario', valor }`.

**Justificativa**: torna o estado ambíguo irrepresentável. As features 003 e 004 tiveram a mesma
causa por dois caminhos diferentes — uma lista de campos a lembrar, e um campo opcional fácil de
esquecer. A lição registrada em `docs/revisao-constitucional.md` é que o tipo deve recusar a
construção incompleta, e não que alguém deve lembrar de preenchê-la.

**Alternativas consideradas**:
- `undefined` como terceiro estado: já ocupado por `Partial<Rascunho>`, onde significa "não altere".
- Campo booleano paralelo: dois campos a manter em sincronia; é a forma do defeito que já tivemos.
- Materializar a herança no rascunho ao focar o exercício: elimina o terceiro estado, mas precisa de
  um efeito que escreve no estado durante a renderização e tem de decidir, de novo, quando não
  sobrescrever o que o usuário digitou — a mesma pergunta, num lugar pior.
