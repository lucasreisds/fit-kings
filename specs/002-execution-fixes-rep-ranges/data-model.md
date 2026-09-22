# Phase 1 — Data Model: ajustes da execução e intervalo de repetições

**Feature**: `002-execution-fixes-rep-ranges` | **Date**: 2026-09-21
**Base**: [data-model.md da 001](../001-workout-tracking-app/data-model.md), que continua normativo
para tudo o que não está aqui.

Duas colunas novas, nenhuma removida, nenhuma ressignificada. É o que o Princípio IV exige, e aqui é
também o que impede invalidar o histórico já registrado no aparelho do usuário.

---

## Alterações de esquema — migração v1 → v2

### `seriesPlanejadas`

| Campo           | Tipo             | Mudança                                                                                                                                                 |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repeticoes`    | `number`         | **Inalterado.** Passa a ser lido como o **mínimo** do intervalo. Sempre foi o alvo mínimo aceitável — o significado não muda, a leitura fica explícita. |
| `repeticoesMax` | `number \| null` | **Novo.** Máximo do intervalo. `null` = intervalo de ponta única, que é o comportamento de hoje.                                                        |

**Regra de leitura, única em todo o projeto**:

```text
minimo = repeticoes
maximo = repeticoesMax ?? repeticoes
```

Com `repeticoesMax` nulo, `maximo === minimo` e toda comparação se reduz à que já existia. É o que
sustenta FR-140 e SC-040: **não há um segundo caminho de código para o valor único.**

**Validação** (FR-143): `repeticoesMax`, quando presente, é inteiro e **não pode ser menor que**
`repeticoes`. Igual é permitido — é a forma explícita do valor único.

### `itensTreino`

| Campo              | Tipo             | Mudança                                                                                                 |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `descansoSegundos` | `number \| null` | **Novo.** Descanso planejado, em segundos. `null` = não planejado, e é o estado de todo item existente. |

Inteiro não negativo. Exibido na tela de execução e em nenhum outro lugar — **não é copiado para a
sessão**, porque não entra em comparação alguma (ver D6 no plano).

### Nenhuma outra tabela muda

`sessoes`, `sessaoVersoes`, `exerciciosSessao`, `seriesRealizadas`, `exercicios`, `treinos` e
`metaAplicacao` permanecem como estão.

---

## Migração

```text
v1 → v2:  seriesPlanejadas ganha repeticoesMax
          itensTreino ganha descansoSegundos
```

Os dois entram com `null` nos registros existentes. Nenhum índice é removido — a guarda
`verificarAditividade`, que já existe, recusaria a migração se fosse.

Nenhum preenchimento retroativo é necessário: `null` **é** o valor correto para o que já existe.
Um item de treino antigo de fato não tem descanso planejado, e uma série planejada antiga de fato
tem ponta única.

---

## Comparação e progressão com intervalo

### Comparação planejado x realizado (FR-141)

| Realizado                 | Resultado           |
| ------------------------- | ------------------- |
| `< minimo`                | abaixo do intervalo |
| `>= minimo` e `<= maximo` | dentro do intervalo |
| `> maximo`                | acima do intervalo  |

Com ponta única, "dentro" é o antigo "igual", e os outros dois não mudam.

### Critério de aumento de carga (FR-142)

Uma série planejada é **superada** quando as repetições realizadas são **estritamente maiores que o
máximo** do intervalo.

Com ponta única, `maximo` é o próprio valor, e a regra vira "estritamente maior que o planejado" —
que é literalmente FR-043 e FR-081 como estão hoje. **Os dez casos de fronteira do portão 4
continuam valendo sem alteração.**

Exemplo de 3x 6-8:

| Execução  | Supera? | Por quê                         |
| --------- | ------- | ------------------------------- |
| 9 / 9 / 9 | sim     | todas acima do máximo           |
| 8 / 8 / 8 | não     | no topo do intervalo, não acima |
| 9 / 9 / 8 | não     | a terceira não superou          |
| 7 / 7 / 7 | não     | dentro do intervalo             |
| 5 / 5 / 5 | não     | abaixo                          |

O critério de RIR não muda e continua se sobrepondo ao de repetições (FR-044).

---

## Evolução de exercício sem carga

Nada é persistido. `agregarEvolucao` deixa de descartar série sem carga e passa a devolver, junto
dos pontos, o **modo** da série histórica:

| Modo         | Quando                                          | O que o ponto mede                     |
| ------------ | ----------------------------------------------- | -------------------------------------- |
| `carga`      | alguma execução registrou carga maior que zero  | maior carga da execução                |
| `repeticoes` | nenhuma execução registrou carga maior que zero | maior número de repetições da execução |

Carga nula e carga zero são equivalentes (FR-147): as duas significam "sem carga externa". É a
leitura coerente com o data-model da 001, que já dizia "zero é válido — peso corporal".

O modo é **derivado a cada consulta**, nunca gravado. O Princípio V proíbe persistir estado
derivável, e este é derivável por definição — ele muda sozinho no dia em que o usuário puser um
cinto de lastro na barra fixa.

---

## Correção e remoção em sessão em andamento

Nenhuma tabela muda. O que muda é o que a camada de dados aceita fazer, e **apenas** com
`sessoes.estado === 'em_andamento'`:

| Operação       | Efeito                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Corrigir série | Escreve `cargaKg`, `repeticoes` ou `rir` na própria linha. Atualiza `alteradoEm`. **Não** cria versão.                |
| Remover série  | Exclusão lógica: carimba `excluidoEm`. A linha permanece na tabela.                                                   |
| Após remover   | As séries restantes do exercício são renumeradas de forma contígua, e cada uma é re-vinculada à meta da nova posição. |

**Sobre a re-vinculação** (FR-135): se o usuário fez três séries e apaga a segunda, sobram duas — e
elas cumprem a primeira e a segunda meta planejada. Manter o vínculo antigo faria a segunda série
restante comparar-se com a terceira meta e deixaria `estadoExercicioSessao()` incoerente: duas
séries válidas de três planejadas continuariam "parcial", mas a comparação apontaria para a meta
errada.

**Em sessão concluída nada disso é permitido.** FR-113 continua proibindo adicionar e remover série,
e FR-114 continua exigindo versão nova para corrigir valor. A fronteira é o estado da sessão, e ela
é verificada na camada de dados, não na tela.

---

## Impacto no arquivo de backup

**`formatVersion` permanece `1`.**

Acrescentar campo opcional não incrementa a versão — é exatamente o caso previsto na política de
compatibilidade do [contrato](../001-workout-tracking-app/contracts/backup-file.md). Leitores
antigos ignoram `repeticoesMax` e `descansoSegundos`; leitores novos aplicam `null` ao que falta.

Consequências verificáveis:

- Um backup gerado **antes** desta feature é importado sem perda (SC-042). Os campos ausentes viram
  `null`, que é o valor correto.
- Um backup gerado **depois** é lido por uma build anterior sem erro, perdendo apenas os dois campos
  novos — que é o comportamento que a política descreve.
