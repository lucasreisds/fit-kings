# Revisão contra a constituição v1.4.0

**Tarefa**: T123 | **Data**: 2026-09-20

A seção _Revisão_ da constituição exige que toda alteração seja verificada contra ela antes de ser
integrada, e que violação identificada bloqueie a integração. Esta é essa verificação, princípio a
princípio, com o **mecanismo** que sustenta cada regra — não a intenção de cumpri-la.

A distinção importa: uma regra sustentada por disciplina é uma regra que a próxima alteração
quebra sem avisar.

---

## I. Integridade do Registro (não negociável)

| Regra                                                                                     | Mecanismo                                                                                                                                     | Estado |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Série confirmada gravada de forma durável **antes** de qualquer retorno visual de sucesso | `registrarSerie` grava em transação própria e só então resolve a promessa. A interface não tem estado otimista: o retorno depende do `await`  | ✅     |
| Sessão concluída é imutável quanto a alteração destrutiva                                 | Não existe transição de volta a `em_andamento`. `proximoEstado` lança em qualquer tentativa                                                   | ✅     |
| Correção gera versão nova preservando integralmente a anterior                            | `corrigir` copia exercícios e séries para uma versão nova e só move o ponteiro `versaoVigenteId`. Nada é sobrescrito nem apagado              | ✅     |
| Operações externas não alteram sessão concluída, **inclusive por versionamento**          | Edição de série planejada já executada faz cópia na escrita; o plano da sessão é reconstruído por consulta temporal em `iniciadaEm`. Portão 2 | ✅     |
| Importação não inventa alteração, mas propaga correção do próprio usuário                 | `planejarImportacao` só produz `inserir` e `nova_versao` para sessão. Não existe caminho de mesclagem campo a campo nem de remoção            | ✅     |
| Histórico não depende do treino que o originou                                            | `nomeTreino` é cópia no cabeçalho; `treinoId` aceita nulo. Excluir o treino não toca na sessão                                                | ✅     |
| Falha ao persistir comunicada com alternativa de ação                                     | `FalhaAoPersistir` é modal, não fecha no Esc sem escolha, e oferece tentar de novo ou anotar os valores                                       | ✅     |

**Risco R1 permanece**, e é condição de plataforma, não violação: o armazenamento é despejável pelo
sistema operacional. Mitigado por solicitação de persistência, estado degradado declarado, lembrete
de backup encurtado e backup em arquivo antecipado para a segunda fatia entregue. **A confirmação
em aparelho real (T113) continua pendente.**

## II. A Academia é o Ambiente de Projeto (não negociável)

| Regra                                                                           | Mecanismo                                                                                                                                | Estado                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Série completa em no máximo 3 toques e menos de 5 s, sem sair da tela           | 2 toques no caminho comum, 3 no pior caso. Nenhuma navegação                                                                             | ✅ toques; ⏳ tempo (T117) |
| Alvo de toque de no mínimo 44×44 pt; contraste de no mínimo 4,5:1               | Verificado por teste em três larguras e por auditoria dos pares de cor. Dois achados reais foram corrigidos                              | ✅                         |
| Nada bloqueia, interrompe ou exige interação durante a sessão                   | Avisos de progressão e lembretes de backup são faixas. O lembrete é suprimido durante sessão `em_andamento` por regra de domínio testada | ✅                         |
| Exceção única: falha ao persistir                                               | É o único `showModal()` do fluxo de execução                                                                                             | ✅                         |
| Nenhuma carga pré-preenchida entre sessões                                      | `cargaHerdada` devolve nulo na primeira série, por construção. A execução anterior aparece como referência com aplicação por um toque    | ✅                         |
| Carga herdada dentro da sessão, editável e **indistinguível** de valor digitado | Mesmo campo, mesmo tamanho, mesmo peso, mesma cor. Sem marca d'água nem estado provisório                                                | ✅                         |
| Usabilidade prevalece sobre estilo em conflito                                  | Registrado em `docs/direcao-visual.md`                                                                                                   | ✅                         |

## III. Autonomia Local

| Regra                                               | Mecanismo                                                                                              | Estado                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Nenhuma execução exige rede                         | Sem cliente HTTP em `src/`. A fonte é servida de `public/fontes/`, não de CDN. Workbox precacheia tudo | ✅ código; ⏳ modo avião no aparelho (T114) |
| Instalação pode exigir rede uma vez                 | É o caso da PWA, admitido pela emenda v1.3.0                                                           | ✅                                          |
| Nenhum componente depende de ida e volta a servidor | Não há backend, nem diretório para um                                                                  | ✅                                          |
| Continuidade entre aparelhos por arquivo            | US7 inteira                                                                                            | ✅                                          |
| Conta, nuvem e sincronização fora de escopo         | Nada disso existe no código. `navigator.share` entrega o arquivo ao sistema e perde contato com ele    | ✅                                          |

## IV. Modelo de Dados Aditivo

| Regra                                                                                 | Mecanismo                                                                                                                   | Estado |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| Identificador único, gerado no cliente, não sequencial, imutável                      | `crypto.randomUUID()`                                                                                                       | ✅     |
| **Caminho único** de geração, sem contingência, com recusa explícita na inicialização | `novoId()` é o único chamador, garantido por regra de lint. `exigirContextoSeguro()` roda antes de qualquer tela de domínio | ✅     |
| `criadoEm` e `alteradoEm` em UTC, com deslocamento local                              | Carimbados pelo repositório base, não pelo chamador                                                                         | ✅     |
| Exclusão lógica; remoção física proibida                                              | O repositório base não expõe método de remoção. Verificado por teste                                                        | ✅     |
| Identidade do exercício estável entre renomeações, exportações e importações          | Testado para catálogo e personalizado, e no ciclo completo de backup                                                        | ✅     |
| Evolução aditiva do esquema                                                           | `verificarAditividade` **recusa** migração que remova tabela ou índice, no momento em que o banco abre                      | ✅     |
| Toda versão lê backups de versões anteriores                                          | Política de compatibilidade testada, incluindo campo e coleção desconhecidos e valor novo em campo aberto                   | ✅     |

## V. Domínio Determinístico e Verificável

| Regra                                                                     | Mecanismo                                                                                                                                                 | Estado |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Regra de domínio é função pura dos dados registrados                      | `src/domain/` não importa React, Dexie, DOM nem a camada de dados — regra de lint                                                                         | ✅     |
| Não depende do relógio do sistema no momento do cálculo                   | Regra de lint proíbe `Date.now()` e `new Date()` em `src/domain/`. O instante entra por parâmetro                                                         | ✅     |
| Cada regra num único lugar, testável sem interface                        | `avaliarProgressao`, `estadoExercicioSessao`, `serieEhValida`, `cargaHerdada`, `avaliarLembrete`, `agregarEvolucao` — todas puras, todas testadas sem DOM | ✅     |
| Estado derivável não persistido como fonte de verdade                     | Nenhuma tabela tem campo de estado de exercício, de indicação de progressão ou de evolução. Verificado por teste                                          | ✅     |
| Cache só se descartável, reconstruível e nunca consultado como autoridade | `sessaoVersoes.vigente` é o **único** cache do modelo, e tem rotina de reconstrução. A autoridade é sempre `sessoes.versaoVigenteId`                      | ✅     |
| O usuário consegue consultar os dados que fundamentam qualquer indicação  | "Ver por quê" abre o detalhe série a série, gerado pela mesma função que decidiu o aviso                                                                  | ✅     |
| Regra sem teste de fronteira não é concluída                              | Portão 4 (10 casos), `estadoExercicioSessao` (18 casos), lembrete (22 casos), herança (9 casos)                                                           | ✅     |

## Restrições de Produto e Plataforma

| Regra                                                                                 | Estado                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| iPhone prioritário, Android em seguida, tablets adequados                             | ✅ layout testado em 320, 390 e 834 px                                             |
| Retrato como única orientação                                                         | ✅ `orientation: portrait` no manifesto                                            |
| Operável integralmente por toque                                                      | ✅                                                                                 |
| Sem rolagem horizontal nem elementos cortados                                         | ✅ testado nas três larguras                                                       |
| Contraste garantido **por construção**                                                | ✅ pares validados por teste; auditoria impede cor literal                         |
| Execução sem transparência, blur ou efeito dependente do conteúdo embaixo             | ✅ verificado por ferramenta na folha da execução e em todo `src/`                 |
| Carga, repetições e RIR com a maior hierarquia visual                                 | ✅ 72 px contra 24 px do segundo elemento                                          |
| Legibilidade sob luz forte e brilho reduzido                                          | ⏳ T116                                                                            |
| Efeitos não comprometem rolagem nem a meta de 5 s                                     | ✅ nenhuma animação de entrada; só o corpo rola                                    |
| Skill `frontend-design` usada na implementação das telas                              | ✅ todas as fases, registrado em `docs/direcao-visual.md`                          |
| Quilogramas com fracionados; RIR inteiro não negativo; repetições como alvo por série | ✅                                                                                 |
| Fora de escopo respeitado                                                             | ✅ sem conta, nuvem, sincronização, cronômetro, periodização, mídia ou integrações |

## Fluxo e Portões de Qualidade

| Regra                                                               | Estado                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Nenhuma implementação sem `plan.md` e `tasks.md`                    | ✅                                                                      |
| Rastreabilidade: toda tarefa de funcionalidade referencia requisito | ✅ e as referências estão nos comentários do código, não só nas tarefas |
| Portão 1 — recuperação após encerramento inesperado                 | ✅                                                                      |
| Portão 2 — imutabilidade do histórico                               | ✅                                                                      |
| Portão 3 — importação idempotente e recusa de arquivo inválido      | ✅                                                                      |
| Portão 4 — determinismo do critério de aumento de carga             | ✅                                                                      |

---

## Conclusão

**Nenhuma violação aberta.** Os quatro portões passam, os cinco princípios têm mecanismo verificável
— e não apenas intenção —, e as duas violações registradas na primeira avaliação do gate em
`plan.md` continuam resolvidas.

**A integração não está completa até T113, T114, T116 e T117.** As quatro exigem um iPhone com o
aplicativo instalado pela Tela de Início, e nenhuma delas é simulável. T113 é a mais importante: ela
é o risco R1 inteiro, e o plano a declarou pré-requisito para a implementação avançar sobre a camada
de dados.

### Decisões tomadas na implementação que valem registro

1. **Cópia na escrita para série planejada executada.** FR-017 exige que a sessão preserve uma cópia
   dos valores planejados. A implementação não duplica linha a linha: apoia-se em a tabela ser
   aditiva e a exclusão ser lógica, e reconstrói o plano por consulta temporal em `iniciadaEm`. Uma
   série planejada que já foi executada torna-se imutável; editá-la cria uma sucessora. Foi o que
   fez o Portão 2 passar — antes disso a edição vazava para o histórico.

2. **O ponto de retomada é derivado, não guardado.** Um campo "exercício corrente" seria um cache
   que o Princípio V proíbe, e que ficaria errado assim que uma série fosse registrada fora de
   ordem. Em compensação, a derivação **não** decide a navegação durante o treino: o foco é fixado
   ao confirmar uma série, senão completar a última série de um exercício tiraria da vista, no mesmo
   instante, a série que o usuário acabou de registrar.

3. **Interface clara, sem modo escuro.** Decisão do critério 4 de D9, não de gosto. Sob luz forte
   com brilho reduzido, uma interface escura vira espelho preto. Registrado em
   `docs/direcao-visual.md`.

---

# Revisão da feature 002 — ajustes da execução e intervalo

**Data**: 2026-09-21

Três pontos desta feature chegam perto de regras constitucionais, e cada um é verificado por
mecanismo, não por intenção.

| Ponto                                   | Risco                                                                      | Mecanismo que o contém                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correção de série durante a sessão      | Abrir brecha em FR-113 e FR-114, que protegem a imutabilidade do histórico | A verificação do estado da sessão vive na **camada de dados**, não na tela. `SessaoNaoEstaEmAndamentoError` recusa a operação em sessão concluída ou descartada, e há teste para os dois casos        |
| Generalização do critério de progressão | Mudar em silêncio o resultado de histórico já registrado                   | Os dez casos de fronteira do portão 4 rodam **inalterados**. O valor único é tratado como intervalo de pontas coincidentes, de modo que a expressão avaliada é idêntica à anterior                    |
| Descanso planejado                      | Virar o cronômetro que a constituição veda                                 | FR-151 proíbe por escrito contagem, aviso e interrupção. `tests/e2e/descanso.spec.ts` espera 6 s sobre um descanso de 5 s e verifica que nada se moveu, que nada foi anunciado e que nada interrompeu |

**O terceiro merece uma nota.** O teste da fronteira não verifica uma funcionalidade — verifica que
uma funcionalidade **não** existe. Ele foi escrito porque, com o campo de descanso já no lugar,
acrescentar a contagem regressiva vai parecer inofensivo numa alteração futura. Não é: seria
ampliação do escopo que a constituição fecha, e exige emenda, não uma decisão de implementação.

## Princípios

- **I** — correção e remoção alcançam apenas a sessão em andamento, que ainda não é registro
  histórico. A remoção é lógica; a linha permanece na tabela.
- **II** — é o princípio que motiva a feature inteira. Nada novo interrompe: o descanso é exibido,
  nunca cronometrado.
- **III** — nenhuma dependência nova. O gesto usa eventos de ponteiro do próprio navegador.
- **IV** — migração v1 → v2 aditiva, recusada pela guarda se não fosse. `formatVersion` permanece 1.
- **V** — o intervalo é regra única, num lugar só; o modo da evolução é derivado a cada consulta e
  nunca gravado.

**Nenhuma violação aberta.** As quatro pendências de aparelho da feature 001 seguem abertas, e
soma-se a elas T063: validar no iPhone o alcance dos cinco exercícios e o gesto com a mão suada.

---

# Revisão da feature 003 — a lição do campo "até"

**Data**: 2026-09-23

Esta correção foi pequena. O que ela revelou, não.

## O defeito atravessou 554 testes, e não foi por falta de cobertura

Havia teste do componente do campo: ele recebia uma série pronta e a exibia certo. Havia teste da
regra de domínio do intervalo: ela avaliava certo. **Nenhum teste percorria o trecho entre os
dois** — e era exatamente ali, na reconstrução da série para o formulário, que o valor se perdia.

> **Testar as duas pontas de um caminho não testa o caminho.**

`tests/unidade/funcionalidades/editorDeSeries.test.tsx` fecha essa lacuna, e falha **nomeando** o
campo que se perdeu.

## A causa não era o campo esquecido

Era a **existência de uma lista de campos que alguém precisa lembrar de atualizar**. Acrescentar
`repeticoesMax` à lista teria corrigido o sintoma e deixado a causa de pé para o próximo campo.

`projecaoDeSeries.ts` inverte isso: deriva a projeção **por omissão** do que não pertence ao
formulário, em vez de enumeração do que pertence. Um campo novo no modelo aparece sem ninguém tocar
naquele arquivo.

## Princípio I: escrita invisível é perda de dado pelo outro lado

O Princípio I fala em não perder o que o usuário registrou. Este defeito fez o contrário — **gravou
o que ele não registrou**, sem mostrar. O efeito sobre a confiança é o mesmo: o histórico deixa de
refletir o que aconteceu.

FR-157 passa a exigir por escrito que nenhuma escrita de valor planejado ocorra sem que o resultado
fique visível na mesma tela.

## Sobre não migrar automaticamente

Apagar os valores gravados durante o defeito removeria junto os intervalos gravados de propósito, e
não há como distinguir uns dos outros. Torná-los visíveis e deixar a decisão com o usuário é o que
o Princípio I pede — a alternativa seria o aplicativo destruir dado por conta própria, que é
exatamente o que ele existe para não fazer.

**Nenhuma violação aberta.** As pendências de aparelho seguem as mesmas.

---

# 004 — Dupla progressão: quando a especificação é que está errada

## O que aconteceu

A regra de progressão exigia **superar** a meta para indicar aumento de carga. Com meta de valor
único isso é evidente: meta 8, fez 9, suba. Quando a faixa de repetições foi acrescentada na 0.2.0,
a mesma regra foi aplicada ao máximo do intervalo — numa faixa de 6-8, era preciso fazer 9.

A implementação estava **correta em relação à especificação**, e a especificação é que estava
errada. FR-142 dizia, com todas as letras, "ficar no topo é cumprir a meta, não superá-la", e havia
um teste afirmando exatamente isso. Tudo passava. O recurso não servia para nada.

## Por que nenhum portão pegou

Os quatro portões verificam que o sistema faz o que foi especificado. Nenhum deles pergunta se o
que foi especificado é o que o usuário precisa. A faixa de 6-8 com gatilho em 9 é internamente
coerente e externamente inútil: o topo da faixa não era nem meta cumprida nem gatilho, era um lugar
onde não acontecia nada.

O que revelou o erro não foi um teste. Foi descrever o protocolo em voz alta — subir repetições
dentro da faixa, chegar ao topo, subir o peso, as repetições caem para a base — e notar que o
aplicativo não tinha o passo do meio.

## A omissão que o compilador deixou passar três vezes

Ao corrigir a regra, os testes de domínio passaram e o de ponta a ponta não. A tela mostrava
"acima da meta" para 8 numa faixa de 6-8, que é a resposta de quem comparou contra **6**.

`repeticoesMax` era opcional no tipo da meta (`repeticoesMax?: number | null`). Três lugares
montavam a meta campo a campo e o esqueciam: o livro-razão da execução, o resumo da sessão e — a
pior delas — a chamada da avaliação de progressão. O histórico, que passava o campo, era o único
que comparava certo.

Tornar o campo obrigatório fez as três aparecerem na mesma compilação. **Um campo opcional num tipo
que descreve uma meta é um convite a esquecê-lo**, e o Princípio V depende de a meta chegar inteira
a quem decide.

## O padrão, outra vez

Na 003 a causa foi uma lista de campos que alguém precisava lembrar de atualizar. Aqui foi um campo
opcional que ninguém precisava preencher. São a mesma coisa vista de dois ângulos: o tipo permitia
a construção incompleta, e a construção incompleta aconteceu em todo lugar onde era permitida.

## O que fica

- Um recurso pode estar implementado, testado e inerte ao mesmo tempo. Cobertura não é evidência
  de utilidade.
- Quando a implementação segue a especificação e o resultado não serve, corrigir o código é
  corrigir o sintoma. FR-160 substitui FR-142 por escrito, com o teste antigo reescrito e comentado
  dizendo qual regra o substituiu — apagá-lo silenciosamente esconderia que houve uma decisão.
- Campo que descreve meta não é opcional.

**Nenhuma violação aberta.** As pendências de aparelho seguem as mesmas.
