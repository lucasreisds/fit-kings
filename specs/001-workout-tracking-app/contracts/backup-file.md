# Contract — Arquivo de Backup

**Feature**: `001-workout-tracking-app` | **Date**: 2026-09-19
**formatVersion corrente**: `1`

Este é o **único contrato externo** do aplicativo. Ele não é consumido por um servidor — é
consumido por versões futuras do próprio aplicativo (FR-097) e pelas análises externas previstas
em FR-059 a FR-061. Alterá-lo sem respeitar a política de compatibilidade abaixo quebra backups já
gerados pelo usuário.

**Mídia**: JSON, UTF-8, arquivo único.
**Nome sugerido**: `fit-kings-backup-YYYY-MM-DD.json`.

---

## Estrutura

```jsonc
{
  "formatVersion": 1,
  "geradoEm": "2026-09-19T14:32:05.000Z",     // UTC
  "deslocamentoLocal": "-03:00",
  "aplicacao": { "nome": "fit-kings", "versao": "0.1.0" },

  "exercicios":        [ /* Exercicio[] */ ],
  "treinos":           [ /* Treino[] */ ],
  "itensTreino":       [ /* ItemTreino[] */ ],
  "seriesPlanejadas":  [ /* SeriePlanejada[] */ ],
  "sessoes":           [ /* Sessao[] */ ],
  "exerciciosSessao":  [ /* ExercicioSessao[] */ ],
  "seriesRealizadas":  [ /* SerieRealizada[] */ ]
}
```

Todo registro de todas as coleções carrega os campos comuns: `id`, `criadoEm`, `alteradoEm`,
`deslocamentoLocal`, `excluidoEm`. Ver [data-model.md](../data-model.md) para os campos próprios
de cada entidade.

---

## O que o arquivo contém

Conjunto **completo** dos dados do usuário (FR-095): treinos, exercícios personalizados e todas as
sessões concluídas.

**Inclui**:

- Registros com `excluidoEm` preenchido, com sua marca preservada (FR-098). Sem eles, a importação
  ressuscitaria o que o usuário apagou.
- Exercícios do catálogo efetivamente referenciados pelo histórico, para que o arquivo seja
  autossuficiente.

**Não inclui**:

- Sessões `em_andamento` — só entram no histórico após conclusão.
- Sessões `descartadas`.
- Versões anteriores de sessões corrigidas. **Decisão do proprietário**: o arquivo carrega apenas a
  versão vigente de cada registro. O rastro de correções é local e não sobrevive a uma restauração.
- `metaAplicacao` — estado da instalação, não dado de domínio.

---

## Achatamento das versões de sessão

As sessões aparecem **já resolvidas na versão vigente**. A estrutura `sessaoVersoes` do modelo
interno não é exportada.

Cada `Sessao` exportada carrega, além dos campos do cabeçalho:

| Campo | Tipo | Significado |
|---|---|---|
| `corrigida` | `boolean` | Houve ao menos uma correção (FR-116). |
| `alteradoEm` | `string` | Data da última alteração da versão vigente. **É a chave da comparação em FR-102.** |

Os registros de `exerciciosSessao` e `seriesRealizadas` exportados referenciam `sessaoId`
diretamente, não `sessaoVersaoId`. Na importação, eles são reconstituídos como a versão vigente da
sessão no aparelho de destino.

---

## Semântica da importação

Normativa. Implementa FR-100 a FR-106.

### 1. Validação antes de qualquer escrita (FR-106)

O arquivo inteiro é validado antes de a primeira linha ser gravada. Falha em qualquer ponto aborta
tudo, **sem alterar nenhum dado existente**. Verificações:

- `formatVersion` presente e conhecido por esta versão do aplicativo.
- Todas as coleções obrigatórias presentes e do tipo esperado.
- Todo `id` é um UUID válido e único dentro da sua coleção.
- Toda referência resolve dentro do próprio arquivo: `exercicioId`, `treinoId`, `itemTreinoId`,
  `sessaoId`, `exercicioSessaoId`, `seriePlanejadaId`.
- Todo carimbo de tempo é ISO 8601 válido.

### 2. Mesclagem por identificador (FR-101)

Cada registro é localizado pelo `id`. Registro ausente no aparelho é inserido. Registro presente
segue as regras 3 ou 4.

### 3. Registros editáveis — exercícios, treinos, itens, séries planejadas (FR-103)

Prevalece a versão com `alteradoEm` mais recente. Empate mantém o que está no aparelho.

### 4. Sessões concluídas (FR-102)

Nunca há mesclagem campo a campo, e nenhuma versão é destruída.

| Situação | Resultado |
|---|---|
| Sessão não existe no aparelho | Inserida como versão inicial. |
| `alteradoEm` do arquivo **mais recente** que o local | Entra como **nova versão local**; a versão anterior do aparelho é preservada. |
| `alteradoEm` do arquivo **igual ou anterior** ao local | Operação nula. A sessão do aparelho permanece intacta. |

Esta é a propagação de correção admitida pelo Princípio I da constituição v1.2.0: a importação não
inventa alteração, apenas propaga correção que o próprio usuário fez em outro aparelho, carimbada
por `alteradoEm`.

### 5. Idempotência (FR-104)

Decorre da regra 4: na segunda importação do mesmo arquivo, nenhum `alteradoEm` é mais recente que
o local, e toda operação é nula. **Importar o mesmo arquivo duas vezes não produz efeito algum
além do da primeira vez.**

### 6. Identidade do exercício (FR-105)

`exercicios[].id` nunca é regenerado na importação. É a chave que mantém o histórico comparável.
Regenerá-lo fragmentaria a série histórica do usuário de forma irreversível.

### 7. Confirmação e relatório (FR-107, FR-108)

Antes de aplicar, o usuário vê o resumo do que será importado. Depois, o resultado: o que entrou,
o que foi atualizado e o que foi ignorado por não ser mais recente.

---

## Política de compatibilidade

Exigência do Princípio IV: **toda versão do aplicativo lê backups gerados por versões anteriores.**

- Adicionar campo opcional ou coleção nova: **não** incrementa `formatVersion`. Leitores antigos
  ignoram o que não conhecem; leitores novos aplicam padrão ao que falta.
- Adicionar valor novo a um campo aberto, como uma nova abordagem de série: **não** incrementa.
  É exatamente o caso previsto em FR-014 e SC-014.
- Remover campo, renomear campo ou alterar o significado de um campo existente: **incrementa**
  `formatVersion`, e o leitor precisa de rotina de conversão da versão anterior para a corrente.
- Arquivo com `formatVersion` **maior** que o suportado é recusado com mensagem explícita —
  "este backup foi gerado por uma versão mais nova do aplicativo" —, e não com erro genérico de
  arquivo inválido.

---

## Privacidade

O arquivo **não é criptografado** (Assumptions › Escopo). Ele carrega o histórico de treinos do
usuário em texto legível. Onde guardá-lo é responsabilidade dele.

A exportação entrega o arquivo à folha de compartilhamento do sistema operacional; o destino —
iCloud Drive, aparelho local ou outro — é indiferente ao aplicativo, que não lê de volta, não
observa alterações e não mantém estado remoto. Isso **não** é sincronização e não exige conta
alguma.
