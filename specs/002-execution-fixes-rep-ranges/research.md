# Phase 0 — Research: ajustes da execução e intervalo de repetições

**Feature**: `002-execution-fixes-rep-ranges` | **Date**: 2026-09-21

Nenhum marcador de clarificação sobrou da especificação. O que segue são as investigações que
sustentam as decisões do [plano](./plan.md), com o que foi verificado no código e no aparelho.

---

## R1 — O defeito de navegação é de affordance, não de rolagem

**Investigado**: reprodução em 430 × 932, com um treino de cinco exercícios, medindo a posição dos
elementos.

**Achado**: a faixa de exercícios **não** rola para fora da tela — ela é fixa e permanece visível
mesmo depois de rolar o conteúdo. O problema é outro, e o relato do usuário descreve exatamente:
os itens parecem cartões informativos. Em 430 px cabem 2,5, o terceiro aparece cortado, e nada
indica que a faixa rola na horizontal.

**Consequência para o desenho**: melhorar a pista de rolagem não basta, porque o alcance
continuaria dependendo de o usuário descobrir um gesto não anunciado. Daí D4 — paginação explícita,
com a faixa mantida para salto direto.

---

## R2 — A "série extra" silenciosa é a causa do registro indevido

**Investigado**: captura da tela após registrar as três séries planejadas.

**Achado**: assim que a última série planejada é confirmada, a tela passa a apresentar
**"Série 4 de 4 — série extra"** como o próximo passo, com o botão primário ativo. Não há nenhum
sinal de que o exercício acabou.

**Consequência**: o registro indevido relatado não foi descuido do usuário — o aplicativo conduziu
para lá. Daí FR-137 e FR-138: sinalizar a conclusão e exigir ação explícita e distinta para a série
extra.

Isto é o que liga as três primeiras histórias numa cadeia de causa e efeito, e é a razão de as três
serem P1: corrigir só a navegação deixaria a armadilha de pé.

---

## R3 — O exercício de peso corporal: a agregação é mais estrita que a regra

**Investigado**: leitura de `src/domain/evolucao/agregar.ts` contra a definição de série válida.

**Achado**: `agregarEvolucao` filtra `serie.cargaKg !== null` antes de montar os pontos. Mas FR-092
define série válida como "tem repetições registradas e não está marcada como não realizada" — carga
não entra na definição.

A agregação aplica, portanto, um critério mais estrito que a regra de domínio, e uma execução
legítima de barra fixa vira zero pontos. A tela de Progresso lê `pontos.length` e mostra
"0 execuções" sobre dado que existe e está correto.

**Consequência**: a correção é remover o filtro indevido, não pedir que o usuário digite zero. E,
como uma curva de cargas de barra fixa não diz nada, a evolução desse caso passa a ser apresentada
em repetições (D5).

**Alternativa descartada**: tratar carga ausente como zero na gravação. Resolveria a contagem e
destruiria a distinção entre "peso corporal" e "esqueci de preencher", que é informação real.

---

## R4 — Intervalo de repetições sem quebrar o que existe

**Questão**: como acrescentar intervalo sem invalidar treino, histórico e backup já gravados, e sem
criar um segundo caminho de avaliação.

**Investigado**: as dez fronteiras do portão 4 e a forma de `avaliarProgressao`.

**Achado**: o critério atual é `realizado > planejado`. Se `repeticoes` passar a ser lido como o
mínimo e o máximo vier de `repeticoesMax ?? repeticoes`, o critério vira `realizado > maximo` — e,
para toda linha existente, `maximo === repeticoes`, de modo que a expressão é **idêntica** à atual.

**Consequência**: os dez casos do portão 4 continuam válidos **sem alteração**, e é isso que torna
SC-040 verificável em vez de declaratório. Se algum deles mudar de resultado, o portão quebra.

**Alternativas descartadas**: ver D1 no plano.

---

## R5 — Gesto de arrastar: o difícil é não disparar

**Questão**: implementar a troca de exercício por gesto sem dependência nova e sem atrapalhar os
campos numéricos e a faixa que rola.

**Achado**: a parte de detectar o gesto é curta com eventos de ponteiro. A parte que exige cuidado é
FR-130 — **não** disparar quando o toque começa sobre um campo de entrada ou sobre área com rolagem
horizontal própria. Sem isso, arrastar dentro do campo de carga trocaria de exercício, e rolar a
faixa de exercícios faria o mesmo.

**Decisão**: verificar a origem do toque subindo a árvore do DOM e desistir ao encontrar `input`,
`textarea`, `[role="tab"]`, ou elemento com rolagem horizontal. Exigir também que o deslocamento
horizontal supere o vertical, para não competir com a rolagem da página.

**Alternativa descartada**: biblioteca de gestos. Dezenas de quilobytes precachados, que o Princípio
III desaconselha sem valor correspondente, para resolver o que cabe em poucas dezenas de linhas.

---

## R6 — Correção em sessão aberta: por que não versionar

**Questão**: FR-114 exige versão nova a cada correção. Vale para a sessão em andamento?

**Achado**: a razão de FR-114 é o Princípio I — sessão concluída é registro histórico, e alterá-la
sem rastro seria destruição silenciosa. Uma sessão em andamento não é registro histórico: é o
rascunho que o usuário está escrevendo, e cada série já é gravada de forma durável no ato da
confirmação.

Versionar cada toque de correção numa sessão aberta produziria dezenas de versões descartáveis, sem
nenhuma garantia nova — e tornaria a reconstrução do índice de vigência mais cara sem motivo.

**Decisão**: a fronteira é o estado da sessão, verificada na camada de dados. FR-136 a registra na
especificação para que a leitura não fique em aberto.

---

## R7 — Descanso exibido contra cronômetro vedado

**Questão**: a constituição põe "cronômetro de descanso" fora de escopo. Um valor de descanso
exibido cabe?

**Achado**: a vedação alcança o _cronômetro_ — o mecanismo que conta o tempo e avisa. O que se pede
é um valor planejado, estático, exibido — da mesma natureza de repetições, carga e RIR, que já são
planejados e exibidos sem que ninguém considere isso um cronômetro.

**Decisão**: entra, com FR-151 proibindo por escrito contagem, aviso e interrupção.

**A razão de a nota existir**: com o campo no lugar, o passo seguinte parecerá inofensivo — "já
temos o número, é só contar". Não é. Seria ampliação de escopo vedada pela constituição, e exige
emenda, não uma decisão de implementação. O registro existe para que essa passagem não aconteça por
descuido.
