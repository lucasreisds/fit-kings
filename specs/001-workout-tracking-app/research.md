# Phase 0 — Research: Aplicativo de Treinos de Academia

**Feature**: `001-workout-tracking-app` | **Date**: 2026-09-19
**Spec**: [spec.md](./spec.md) | **Constituição**: v1.2.0

Este documento resolve os pontos marcados como NEEDS CLARIFICATION no Technical Context do
[plan.md](./plan.md). Cada decisão registra a razão e as alternativas descartadas.

---

## D1 — Plataforma de entrega: PWA instalável

**Decisão**: aplicação web progressiva (PWA) instalável na tela inicial, sem build nativo.

**Rationale**: decisão do proprietário. Remove a dependência de macOS para compilar iOS — o
ambiente de desenvolvimento é Windows + WSL, sem Mac —, entrega iPhone, Android e tablet a partir
de uma única base de código, e permite iteração sem ciclo de publicação em loja. Para um produto de
usuário único, o custo de duas toolchains nativas não se justifica.

**Alternativas consideradas**:

- **Flutter**: já instalado na máquina, com camada de domínio em Dart puro facilmente testável.
  Descartado por exigir macOS para gerar e depurar a build iOS, que é a plataforma prioritária da
  spec.
- **React Native + Expo**: mesma barreira de build iOS, com uma camada a mais entre a aplicação e
  a persistência durável exigida pelo Princípio I.
- **Nativo (SwiftUI + Kotlin Compose)**: melhor fidelidade, custo proibitivo para um desenvolvedor
  só, além da mesma barreira de macOS.

**Consequência aceita**: a instalação inicial exige rede uma vez, para buscar o app shell. Depois
de instalado e com o service worker ativo, o aplicativo opera sem rede. Ver R2.

**Limites explícitos do ambiente, fixados pelo proprietário** — o plano não assume nenhum deles:

- Sem conta de desenvolvedor Apple ou Google, e sem custo associado.
- Sem publicação em loja, sem TestFlight, sem processo de revisão.
- Sem simulador iOS e sem depuração interativa em iOS.
- Sem qualquer etapa de compilação nativa na cadeia de build.

**Ambiente de desenvolvimento e validação**: desenvolvimento e teste no navegador desktop em
Windows. Validação em iPhone feita no Safari, com o aplicativo adicionado à Tela de Início, no
aparelho real. Isso significa que a depuração no alvo prioritário é por observação e por registro
em tela, não por ferramentas interativas — o que reforça a escolha de concentrar a lógica de
domínio em funções puras cobertas por teste automatizado, onde falhas aparecem antes do aparelho.

---

## D2 — Linguagem e framework: TypeScript + React + Vite

**Decisão**: TypeScript em modo estrito, React para a camada de interface, Vite como build tool,
`vite-plugin-pwa` (Workbox) para service worker e manifesto.

**Rationale**: TypeScript estrito dá ao modelo de dados a verificação que o Princípio IV exige —
identificadores, carimbos de tempo e marca de exclusão deixam de ser convenção e passam a ser tipo.
React e Vite são o caminho mais documentado para PWA, o que importa para um desenvolvedor sozinho.
A camada de domínio não depende de React: são funções puras em TypeScript, testáveis sem DOM,
conforme o Princípio V.

**Alternativas consideradas**:

- **Svelte + SvelteKit**: bundle menor e menos cerimônia. Descartado por ecossistema menor de
  material de apoio, sem ganho relevante para o tamanho deste aplicativo.
- **Vue + Vite**: equivalente em mérito técnico; React escolhido por volume de referência.
- **Sem framework (TS puro)**: a tela de execução tem estado suficiente para que o custo manual
  de sincronizar DOM supere o peso do framework.

---

## D3 — Persistência local: IndexedDB via Dexie

**Decisão**: IndexedDB como armazenamento, acessado pela biblioteca Dexie, com migrações de esquema
versionadas.

**Rationale**: IndexedDB é o único armazenamento do navegador com capacidade, transações e índices
adequados a centenas de sessões. Dexie oferece transações explícitas — necessárias para a gravação
durável do Princípio I —, índices compostos para as consultas de SC-010, e um mecanismo de migração
versionada que atende à evolução aditiva exigida pelo Princípio IV.

**Alternativas consideradas**:

- **IndexedDB puro**: mesma capacidade, muito mais código de baixo nível e maior chance de erro em
  transação — exatamente onde não se pode errar.
- **SQLite no navegador (wa-sqlite sobre OPFS)**: consultas mais expressivas e um modelo relacional
  mais próximo do domínio. Descartado por peso, complexidade de setup e suporte a OPFS mais recente
  no iOS do que o restante da stack. Reavaliar se as consultas de histórico ficarem complexas.
- **localStorage**: síncrono, limitado a poucos megabytes e sem índices. Inadequado.

---

## D4 — Gravação durável de série confirmada

**Decisão**: cada série confirmada é gravada em uma transação IndexedDB própria, e o retorno visual
de sucesso só é emitido após a transação completar. Nenhum lote, nenhum débito diferido.

**Rationale**: o Princípio I proíbe retorno visual que sugira sucesso antes da gravação concluída.
Gravar por série mantém a unidade de perda em uma série, e não em um exercício ou numa sessão.

**Verificação**: portão de teste 1 da constituição — recarregar a página no meio da sessão e
confirmar que todas as séries confirmadas voltam íntegras.

---

## D5 — Estado da sessão em andamento

**Decisão**: a sessão em andamento vive no IndexedDB como registro de primeira classe, com estado
`em_andamento`. A memória da aplicação é cache de leitura, nunca fonte de verdade.

**Rationale**: FR-030 a FR-034 exigem sobreviver a minimizar o app, trocar de aba, bloquear a tela e
encerramento inesperado. Numa PWA, qualquer um desses eventos pode descartar a memória a qualquer
momento — o navegador descarrega abas em segundo plano sob pressão de memória, e no iOS isso é
frequente. Estado de sessão em memória volátil é perda de dados garantida.

**Alternativas consideradas**: manter a sessão em memória e persistir ao concluir. Descartado — viola
o Princípio I de forma direta.

---

## D6 — Formato do arquivo de backup

**Decisão**: JSON único, codificado em UTF-8, com campo `formatVersion` no topo. Estrutura
documentada em [contracts/backup-file.md](./contracts/backup-file.md).

**Rationale**: FR-096 exige formato estruturado, documentado e legível por máquina, adequado a
ferramentas externas de análise. JSON atende, é inspecionável por humanos quando algo dá errado e é
consumível diretamente pelas análises futuras previstas em FR-059 a FR-061. `formatVersion`
satisfaz FR-097 e a exigência constitucional de que toda versão leia backups de versões anteriores.

**Alternativas consideradas**:

- **CSV**: não representa a estrutura aninhada de sessão → exercício → série → degraus de dropset.
- **SQLite exportado**: opaco para inspeção e acoplado ao motor de armazenamento.
- **JSON comprimido (gzip)**: adiado. O volume previsto não justifica; reavaliar se o arquivo passar
  de alguns megabytes.

**Mecânica na plataforma**: a exportação usa a folha de compartilhamento nativa do iOS, via Web
Share API (`navigator.share` com `files`), o que permite ao usuário salvar o arquivo onde quiser —
inclusive no iCloud Drive. Onde a API não estiver disponível, o caminho alternativo é `Blob` +
download. A importação usa `<input type="file">`.

**Salvar no iCloud Drive não é sincronização.** O aplicativo entrega um arquivo ao sistema
operacional e perde contato com ele; não lê de volta, não observa alterações, não mantém estado
remoto e não exige conta nenhuma para funcionar. O destino escolhido pelo usuário é indiferente ao
aplicativo — iCloud Drive, aparelho local ou outro serviço são o mesmo caso. **O Princípio III
permanece intacto**, e esta nota existe para que nenhuma revisão futura leia "iCloud" como backup
em nuvem no sentido proibido pelo escopo.

---

## D7 — Identificadores e carimbos de tempo

**Decisão**: `crypto.randomUUID()` para todo identificador de entidade. Carimbos de tempo gravados
como ISO 8601 em UTC, acompanhados do deslocamento local vigente no momento do registro, em campo
separado.

**Rationale**: atende diretamente ao Princípio IV. `crypto.randomUUID()` é gerado no cliente, não é
sequencial, está disponível em contexto seguro (HTTPS ou localhost) em todos os navegadores-alvo, e
elimina colisão ao reunir registros de aparelhos diferentes numa importação ou numa futura conta.
Guardar UTC e deslocamento separadamente preserva tanto a ordenação correta quanto a informação de
domínio "a que horas eu treinei".

---

## D8 — Versionamento de registro de sessão

**Decisão**: correção de sessão concluída grava uma nova linha na tabela de versões da sessão,
mantendo a anterior. A sessão referencia sua versão vigente. A exportação carrega apenas a versão
vigente, acompanhada da marca de correção e da data de última alteração.

**Rationale**: FR-112 a FR-118 e a decisão da sessão de clarificação de 2026-09-19. Versões
anteriores são locais e não sobrevivem a uma restauração, por decisão do proprietário.

**Consequência de projeto**: a comparação na importação (FR-102) usa a data de última alteração da
versão vigente. Importação de versão não mais recente é operação nula, o que preserva a
idempotência de FR-104.

---

## D9 — Direção visual: decisão aberta, com critérios de avaliação fixados

**Decisão**: **nenhuma direção visual é escolhida nesta fase.** A escolha cabe à implementação, e a
skill `frontend-design` é obrigatória nas telas. A constituição v1.4.0 removeu a obrigatoriedade de
Glassmorphism e a substituiu por restrições verificáveis.

**Rationale**: fixar um estilo nomeado no planejamento decide a aparência antes de existir qualquer
tela para avaliar, e transforma a discussão em preferência estética. Restrições derivadas do
Princípio II produzem decisão melhor: qualquer direção que passe nos cinco critérios abaixo é
admissível, e nenhuma que falhe em um deles é — independentemente de quão bonita pareça.

**Critérios de avaliação de qualquer proposta de estilo** (normativos, da constituição v1.4.0):

1. **Contraste de 4,5:1 garantido por construção**, e não verificado caso a caso. Fundos de texto
   estáveis e independentes do conteúdo atrás ou abaixo deles.
2. **A tela de execução não usa transparência, blur de fundo, nem qualquer efeito cujo custo de
   renderização dependa do conteúdo sob o elemento.**
3. **Carga, repetições e RIR são os elementos de maior hierarquia visual** da tela de execução.
4. **Legibilidade sob luz forte e com brilho de tela reduzido** — a academia é ambiente de luz alta,
   e o aparelho frequentemente está com brilho baixo por economia de bateria.
5. **Nenhum efeito compromete a fluidez de rolagem nem a meta de 5 segundos por série.**

**Consequência de implementação**: os tokens de tema em `src/ui/` são o mecanismo que torna o
critério 1 estrutural. Pares de cor de texto e fundo são definidos como tokens já validados em
contraste, e componentes consomem os pares — o que elimina a possibilidade de uma combinação
reprovada aparecer por descuido, em vez de depender de auditoria posterior.

**Alternativa descartada**: manter Glassmorphism como direção definida. Descartada por decisão do
proprietário. O critério 2 já tornaria o efeito inaplicável justamente na tela onde o produto é
mais usado, o que reduzia o estilo a decoração de telas secundárias.

**Momento da decisão**: fase de implementação, na primeira tarefa de interface de US1.

---

## D10 — Estratégia de testes

**Decisão**: Vitest para domínio e repositórios, Playwright para os quatro portões constitucionais.

| Camada | Ferramenta | Cobre |
|---|---|---|
| Domínio (funções puras) | Vitest, sem DOM | Critério FR-043 e fronteiras FR-078 a FR-081, FR-092 a FR-094 |
| Repositórios | Vitest + `fake-indexeddb` | Transações, migrações, versionamento, mesclagem de importação |
| Ponta a ponta | Playwright | Portões 1 a 4 da constituição |

**Rationale**: o Princípio V exige que a regra de domínio seja testável sem interface — daí o domínio
em TypeScript puro, sem importar React. O portão de recuperação após encerramento inesperado é
testável em Playwright recarregando a página no meio de uma sessão, que numa PWA é o equivalente
fiel ao encerramento abrupto.

---

## D11 — Geração de identificadores: caminho único, sem contingência

**Decisão**: `crypto.randomUUID()` é o **único** mecanismo de geração de identificador. Não há
fallback, polyfill nem caminho alternativo. O aplicativo verifica `window.isSecureContext` na
inicialização e, se não estiver em contexto seguro, **recusa-se a operar** com mensagem explícita,
antes de qualquer tela de domínio carregar.

**Rationale**: `crypto.randomUUID()` só existe em contexto seguro. Em desenvolvimento, `localhost`
é contexto seguro e funciona; `vite --host` sobre IP de rede em HTTP **não é**, e a API fica
indisponível. A tentação óbvia é adicionar um fallback para o caso da rede local.

Essa tentação é o problema. Um fallback significa identificadores gerados por um caminho em
desenvolvimento e por outro em produção — com propriedades estatísticas, formato e garantias de
unicidade potencialmente diferentes. Identificador é precisamente onde divergência entre ambientes
não pode existir: ele é imutável, é a chave que sustenta a comparação histórica (FR-074) e a
mesclagem de importação (FR-101), e um defeito nele não aparece no momento em que é introduzido —
aparece meses depois, no histórico, quando já não há conserto.

Falhar ruidosamente na inicialização é preferível a falhar silenciosamente no primeiro registro:
a mensagem aponta a causa real — ambiente sem contexto seguro — em vez de produzir um erro
obscuro na hora de salvar a primeira série.

**Consequência operacional**: todo ambiente que executa o aplicativo é contexto seguro.
Desenvolvimento em `localhost`; validação em aparelho por HTTPS, com mkcert ou túnel; produção em
HTTPS. Ver [quickstart.md](./quickstart.md).

**Implementação**: um único `novoId()` em `src/plataforma/`, e uma regra de lint proibindo chamar
`crypto.randomUUID()` diretamente em qualquer outro lugar. O guarda de contexto seguro roda antes
do bootstrap da aplicação.

**Alternativas consideradas**:

- **Polyfill de UUID v4 sempre, sem usar a API nativa**: daria caminho único e funcionaria fora de
  contexto seguro. Descartado porque service worker e instalação da PWA também exigem contexto
  seguro — sem ele o produto não existe, então o polyfill resolveria apenas o sintoma e mascararia
  um ambiente já inviável.
- **Fallback condicional**: rejeitado pelas razões acima. É a opção que parece pragmática e é a
  única que corrompe dados.

**Requisito correspondente**: FR-124. **Regra constitucional**: Princípio IV, a partir da v1.3.0.

---

## R1 — Risco: durabilidade do armazenamento na plataforma web

**Este é o risco principal da escolha de plataforma e precisa de decisão consciente.**

Armazenamento de navegador é despejável. Os vetores conhecidos:

- **Pressão de disco**: o sistema operacional pode limpar dados de origem web quando o
  armazenamento do aparelho fica crítico.
- **Remoção do ícone no iOS**: apagar a PWA da tela inicial apaga os dados associados a ela.
  Não há lixeira nem confirmação que mencione perda de dados.
- **Limpeza manual**: o usuário limpando dados do navegador remove o banco.
- **`navigator.storage.persist()`**: em navegadores baseados em Chromium, marca a origem como
  persistente e reduz drasticamente o risco de despejo. O comportamento no Safari do iOS é mais
  restritivo e **precisa ser verificado em aparelho real** antes de ser considerado garantia.

Um aplicativo nativo não tem nenhum desses vetores. Esta é a contrapartida real de não precisar de
macOS.

**Comportamento obrigatório, fixado pelo proprietário** — não é mitigação opcional, é requisito:

1. O aplicativo **DEVE** verificar `navigator.storage.persisted()` e **DEVE** solicitar
   `navigator.storage.persist()`.
2. O aplicativo **NÃO DEVE** operar como se o armazenamento fosse confiável sem essa confirmação.
3. Quando a persistência **não** for concedida, o aplicativo entra em **estado degradado
   explícito**: a condição é sinalizada ao usuário de forma compreensível, e a frequência do
   lembrete de backup aumenta.
4. O estado da persistência e o espaço disponível (`navigator.storage.estimate()`) são
   consultáveis pelo usuário.

A sinalização do estado degradado respeita o Princípio II: informa sem bloquear, e nunca interrompe
uma sessão em andamento.

**Decorrência de priorização**: a exportação de backup (US7) **é antecipada para a primeira fatia
entregue**, em vez da última. Na ordem original ela é P7 porque a conta em nuvem a tornava
redundante; sem conta e sobre armazenamento despejável, ela é a única rede de proteção existente e
não pode ser a última coisa a ser construída.

**Requisitos correspondentes**: FR-120 a FR-123, acrescentados à spec em 2026-09-19. Critério de
sucesso associado: SC-033. A lacuna de rastreabilidade registrada originalmente no Complexity
Tracking está fechada.

**Tarefa de verificação obrigatória antes de confiar no armazenamento**: instalar um protótipo
mínimo no iPhone alvo, gravar dados, e verificar sobrevivência a reinício do aparelho, a período
sem uso e a pressão de armazenamento. Resultado registrado aqui antes de a implementação avançar
sobre a persistência.

---

## R2 — Tensão com o Princípio III (Autonomia Local)

O Princípio III e FR-057 exigem funcionamento "sem exigir conexão em nenhum momento — inclusive na
primeira execução após a instalação". Numa PWA, **a instalação é o ato de buscar a aplicação pela
rede**. Depois dela, com o service worker ativo, nenhuma execução exige conexão.

A leitura compatível é: a instalação exige rede uma vez; a execução, nunca. Isso não está dito com
essas palavras nem na spec nem na constituição, e um Constitution Check literal reprova.

**Resolvido**: emenda constitucional **v1.3.0**, que distingue execução de instalação no Princípio
III — nenhuma execução exige rede, inclusive a primeira após a instalação; a obtenção inicial do
aplicativo pode exigir rede uma única vez. Não foi reversão do princípio, e sim precisão sobre o
que conta como "execução". FR-057 recebeu a mesma precisão, para que "sem exigir conexão em nenhum
momento" não comporte a leitura que inclui o ato de instalar.

---

## Pontos resolvidos

| Item do Technical Context | Estado |
|---|---|
| Language/Version | Resolvido — D2 |
| Primary Dependencies | Resolvido — D2, D3 |
| Storage | Resolvido — D3, com risco R1 |
| Testing | Resolvido — D10 |
| Target Platform | Resolvido — D1 |
| Project Type | Resolvido — D1 |
| Performance Goals | Resolvido — D3, D9 |
| Constraints | Resolvido — D1, R1, R2 |
| Scale/Scope | Resolvido — spec, SC-010 |

Nenhum NEEDS CLARIFICATION permanece.
