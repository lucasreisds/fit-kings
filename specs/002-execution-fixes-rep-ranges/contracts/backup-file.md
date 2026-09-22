# Contract — Arquivo de Backup, alterações da feature 002

**Base**: [contrato da 001](../../001-workout-tracking-app/contracts/backup-file.md), que continua
normativo para tudo o que não está aqui.

**`formatVersion` permanece `1`.**

---

## Por que a versão não sobe

A política de compatibilidade do contrato é explícita: _"Adicionar campo opcional ou coleção nova:
**não** incrementa `formatVersion`. Leitores antigos ignoram o que não conhecem; leitores novos
aplicam padrão ao que falta."_

Esta feature acrescenta exatamente isso — dois campos opcionais, nenhum removido, nenhum
ressignificado. Incrementar a versão aqui teria um custo concreto e nenhum ganho: faria toda build
anterior **recusar** arquivos que ela é perfeitamente capaz de ler, com a mensagem "gerado por uma
versão mais nova".

---

## Campos acrescentados

### `seriesPlanejadas[]`

| Campo           | Tipo             | Regra                                                                                                    |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `repeticoesMax` | `number \| null` | Máximo do intervalo de repetições. Ausente ou `null` = ponta única, e o máximo é o próprio `repeticoes`. |

`repeticoes` **não muda de tipo nem de significado**: sempre foi o alvo mínimo aceitável, e passa a
ser lido explicitamente como o mínimo do intervalo.

### `itensTreino[]`

| Campo              | Tipo             | Regra                                                               |
| ------------------ | ---------------- | ------------------------------------------------------------------- |
| `descansoSegundos` | `number \| null` | Descanso planejado, em segundos. Ausente ou `null` = não planejado. |

---

## Validação na importação

Acrescenta-se ao que o contrato já exige:

- `repeticoesMax`, quando presente e não nulo, é um inteiro **maior ou igual a** `repeticoes`.
  Um arquivo com o intervalo invertido é recusado, como qualquer valor fora do domínio.
- `descansoSegundos`, quando presente e não nulo, é um inteiro não negativo.

Ambos, **ausentes**, são aceitos sem reclamação — é o caso de todo arquivo gerado antes desta
feature, e recusá-los quebraria a garantia de que toda versão lê os backups das anteriores.

---

## Compatibilidade nos dois sentidos

| Situação                                   | Comportamento                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquivo **antigo** lido por build **nova** | Campos ausentes viram `null`. Série planejada continua de ponta única, item de treino continua sem descanso. Nenhuma perda (SC-042).                        |
| Arquivo **novo** lido por build **antiga** | Os dois campos são ignorados. O intervalo é lido como o seu mínimo e o descanso se perde. Sem erro, sem recusa — é o comportamento que a política descreve. |

O segundo caso merece ser dito em voz alta: uma build antiga lendo um planejamento de 6-8 vai
entendê-lo como 6. É perda de informação, não corrupção, e é o preço previsto de não incrementar a
versão. Incrementá-la trocaria essa perda por uma recusa total do arquivo, que é pior.
