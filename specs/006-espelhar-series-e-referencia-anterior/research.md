# Research: Séries que acompanham a primeira e referência da última vez no mesmo treino

Não havia `NEEDS CLARIFICATION` no contexto técnico. As decisões abaixo resolvem as escolhas de
desenho que a spec deixou abertas.

## D1 — "Acompanhar a primeira" por igualdade, não por marca

- **Decision**: uma série `i > 0` acompanha a série 1 se, **imediatamente antes** da edição, todos
  os seus valores editáveis (`repeticoes`, `repeticoesMax`, `cargaKg`, `rir`) forem iguais aos da
  série 1. A comparação usa a projeção do formulário (`ValoresPlanejados`), não a linha gravada.
- **Rationale**: dispensa campo novo (Princípio IV), sobrevive a reabrir e a importar (FR-190) e
  é a regra mais previsível para quem vê a tela: "o que está igual à primeira anda junto".
- **Alternatives considered**:
  - Marca `personalizada` por série, gravada — exige campo novo, migração aditiva, entra no
    backup, e cria estado que pode divergir do que se vê.
  - Marca só em memória de tela — perde-se ao fechar o editor; contradiz o cenário 6 da US1.
  - Espelhar só no campo alterado, comparando apenas aquele campo — faria a série 4 com carga
    própria continuar acompanhando repetições, o que a spec descarta ("um campo diferente basta").

## D2 — Onde a regra roda

- **Decision**: `EditorSeries.alterar` monta um `transformar` que chama
  `espelhar(atuais, indice, campo, valor)`. O repositório já aplica `transformar` ao gravado dentro
  de uma transação (`repositorioTreinos.transformarSeries`).
- **Rationale**: a igualdade é avaliada sobre o **gravado**, não sobre o renderizado — o mesmo
  motivo que levou `aoMudar` a receber função (defeito corrigido na 004: a segunda tecla desfazia
  a primeira). Digitar "40" tecla a tecla funciona: a cada tecla a série 2 está igual à série 1
  anterior e anda junto. A atomicidade de FR-191 vem de graça.
- **Alternatives considered**: espelhar no repositório — misturaria regra de formulário com
  persistência e afetaria `definirSeries` chamado de outros lugares.

## D3 — Valor vazio durante a digitação

- **Decision**: a conversão de texto em valor (`''` → `null` ou `0`, conforme o campo aceite nulo)
  continua na tela, como hoje. `espelhar` recebe o valor já convertido e o propaga igual.
- **Rationale**: o comportamento campo a campo não muda; só o alcance da alteração.

## D4 — Consulta da execução anterior restrita ao treino

- **Decision**: nova função `execucaoAnteriorNoTreino(exercicioId, treinoId, ocorrencia, opcoes)`
  em `execucao/consultas.ts`, ao lado de `execucaoAnterior`, com os mesmos filtros (concluída,
  versão vigente, ao menos uma série válida, ignorar a sessão corrente) **mais** `sessao.treinoId
  === treinoId`. Quando `treinoId` da sessão corrente é `null`, devolve `null`.
- **Rationale**: a `execucaoAnterior` existente alimenta a linha "Última vez" e o aviso de
  progressão; mudar seu critério alteraria FR-083/FR-094 (vedado por FR-201). Uma segunda função
  mantém cada regra com um único significado.
- **Alternatives considered**: parâmetro opcional `treinoId` em `execucaoAnterior` — viável, mas a
  regra de ocorrência (D5) só existe aqui e deixaria a função original com um modo a mais para
  quem não precisa.

## D5 — Exercício repetido no mesmo treino

- **Decision**: a ocorrência é a posição (0, 1, …) do exercício entre os exercícios de mesmo
  `exercicioId` da sessão, ordenados por `ordem`. Na sessão anterior procura-se a ocorrência de
  mesmo índice; se não existir ou não tiver série válida, aquela sessão não serve e a busca segue
  para a próxima mais antiga.
- **Rationale**: é o caso raro, e "primeira com primeira" é o que o usuário espera ao montar, por
  exemplo, supino no início e no fim.

## D6 — Conteúdo da referência

- **Decision**: função pura `referenciasPorSerie(series)` → `Map<ordem, { repeticoes, cargaKg }>`
  contendo apenas séries válidas. Em série de dropset, usa `degraus[0]` (repetições e carga do
  primeiro degrau). `cargaKg` `0` ou `null` é exibido como só repetições.
- **Rationale**: série tradicional guarda carga e repetições diretamente; série de dropset guarda a
  soma das repetições em `repeticoes`, que não é comparável ao que o usuário vai registrar no
  primeiro degrau.

## D7 — Onde a referência aparece

- **Decision**:
  - **Série corrente**: na linha de identificação, abaixo da meta, alinhada à direita, em texto
    secundário: `anterior 40 kg × 10`.
  - **Séries registradas**: segunda linha sob os valores, na mesma coluna — hoje em cima, a
    última vez embaixo.
  - Formato: **carga × repetições**, a mesma ordem da série registrada e dos campos (carga à
    esquerda). A primeira ideia, "10 × 40 kg", foi descartada na implementação: logo abaixo de
    "40 kg × 11", a ordem trocada obrigava a ler em zigue-zague. Sem carga: "12 reps".
  - Palavra: "anterior", e não "última vez" — o cabeçalho já usa "Última vez" para a carga de
    qualquer treino, e a mesma expressão com dois sentidos na mesma tela confundiria.
- **Rationale**: a linha de identificação fica logo acima dos campos de carga e repetições: o olho
  passa por ela antes de digitar, sem disputar hierarquia com os campos (restrição de estilo da
  constituição). Na razão, a referência ao lado do realizado é a comparação que o usuário pediu.
  Nenhuma das posições acrescenta altura que empurre "Confirmar série" (rodapé fixo).
- **Alternatives considered**: chip tocável que preenche o campo — vedado pelo Princípio II e por
  FR-198.

## D8 — Carregamento

- **Decision**: as referências são calculadas no mesmo `useLiveQuery` que já carrega
  `anteriores`, um `Map<exercicioSessaoId, Map<ordem, Referencia>>`.
- **Rationale**: mesmo padrão e mesmo ciclo de atualização; o custo é uma varredura por exercício
  da sessão, igual à consulta existente.
