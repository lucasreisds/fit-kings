# Phase 1 — Data Model: Aplicativo de Treinos de Academia

**Feature**: `001-workout-tracking-app` | **Date**: 2026-09-19
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Constituição**: v1.2.0

Armazenamento: IndexedDB via Dexie. Todo nome de tabela e de campo aqui é normativo para a
implementação.

---

## Campos comuns a todas as entidades

Exigidos pelo Princípio IV. Nenhuma tabela pode omiti-los.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | `string` | UUID de `crypto.randomUUID()`. Gerado no cliente, não sequencial, imutável após a criação. |
| `criadoEm` | `string` | ISO 8601 em UTC. Imutável. |
| `alteradoEm` | `string` | ISO 8601 em UTC. Atualizado a cada escrita. Base da precedência em FR-103 e FR-102. |
| `deslocamentoLocal` | `string` | Deslocamento do aparelho no momento do registro, ex.: `-03:00`. Informação de domínio. |
| `excluidoEm` | `string \| null` | Exclusão lógica. `null` = ativo. Remoção física é proibida. |

Toda leitura de uso corrente filtra `excluidoEm === null`. A exportação **não** filtra: FR-098
exige que os registros excluídos viajem com sua marca.

---

## Tabelas

### `exercicios`

Catálogo curado e exercícios personalizados, tratados de forma equivalente (FR-077).

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | `string` | Exibição. Mutável — renomear nunca quebra histórico (FR-041, FR-074). |
| `origem` | `'catalogo' \| 'personalizado'` | FR-071, FR-072. |
| `grupoMuscular` | `string \| null` | Descritivo. |
| `equipamento` | `string \| null` | Descritivo. |
| `ocultoEm` | `string \| null` | Ocultação de novas seleções (FR-076), distinta de exclusão. |

**Índices**: `id`, `nome`, `origem`, `[origem+ocultoEm]`.

**Regra**: exercício com execução registrada no histórico não pode ser excluído, apenas ocultado
(FR-076). A verificação é feita antes da escrita, consultando `exerciciosSessao`.

---

### `treinos`

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | `string` | Obrigatório, não vazio (FR-001). |

**Índices**: `id`, `nome`, `excluidoEm`.

---

### `itensTreino`

A presença de um exercício dentro de um treino.

| Campo | Tipo | Regra |
|---|---|---|
| `treinoId` | `string` | → `treinos.id`. |
| `exercicioId` | `string` | → `exercicios.id`. Sempre o identificador estável, nunca o nome. |
| `ordem` | `number` | Posição no treino (FR-007). |
| `abordagem` | `string` | `'tradicional' \| 'dropset' \| <futuras>`. Valor aberto por FR-014. |

**Índices**: `id`, `treinoId`, `[treinoId+ordem]`.

---

### `seriesPlanejadas`

Alvo por série. Permite valores distintos entre séries do mesmo exercício (FR-009).

| Campo | Tipo | Regra |
|---|---|---|
| `itemTreinoId` | `string` | → `itensTreino.id`. |
| `ordem` | `number` | Número da série. |
| `repeticoes` | `number` | Valor-alvo. Inteiro positivo. |
| `cargaKg` | `number` | Aceita fracionados (2,5). Zero é válido — peso corporal. |
| `rir` | `number \| null` | Inteiro não negativo. `null` = não planejado. |

**Índices**: `id`, `itemTreinoId`, `[itemTreinoId+ordem]`.

---

### `sessoes`

Cabeçalho da sessão. **Todos os campos abaixo são imutáveis após a conclusão** — nenhuma correção
os alcança (FR-115).

| Campo | Tipo | Regra |
|---|---|---|
| `treinoId` | `string \| null` | Origem. `null` se o treino foi excluído — o histórico sobrevive (FR-040). |
| `nomeTreino` | `string` | Cópia do nome no início. Sobrevive à edição e à exclusão do treino. |
| `iniciadaEm` | `string` | UTC. Imutável. |
| `concluidaEm` | `string \| null` | UTC. Imutável após definida. |
| `estado` | `'em_andamento' \| 'concluida' \| 'descartada'` | Ver transições. |
| `versaoVigenteId` | `string` | → `sessaoVersoes.id`. **Autoridade** sobre qual versão vale. |
| `corrigida` | `boolean` | `true` após a primeira correção (FR-116). |

**Índices**: `id`, `estado`, `concluidaEm`, `[estado+concluidaEm]`.

O índice `[estado+concluidaEm]` é o que sustenta SC-010: listar 200 sessões concluídas em ordem
cronológica sem varredura.

**Invariante**: no máximo uma sessão com `estado === 'em_andamento'` (FR-028). Verificado em
transação antes de criar uma nova.

---

### `sessaoVersoes`

Versionamento por instantâneo. Correção cria uma nova versão; a anterior permanece intacta.

| Campo | Tipo | Regra |
|---|---|---|
| `sessaoId` | `string` | → `sessoes.id`. |
| `numero` | `number` | Sequencial dentro da sessão, começando em 1. |
| `motivo` | `'inicial' \| 'correcao'` | Origem desta versão. |
| `vigente` | `0 \| 1` | **Índice reconstruível**, não autoridade. Ver nota abaixo. |

**Índices**: `id`, `sessaoId`, `[sessaoId+numero]`, `[sessaoId+vigente]`.

> **Nota de conformidade com o Princípio V**: `vigente` é estado derivável — a autoridade é
> `sessoes.versaoVigenteId`. Ele existe apenas como índice de consulta, é escrito na mesma
> transação que cria a versão, e a implementação **deve** expor uma rotina de reconstrução que
> recalcule todos os `vigente` a partir de `sessoes.versaoVigenteId`. Nenhuma regra de domínio pode
> tratá-lo como fonte de verdade.

---

### `exerciciosSessao`

O exercício tal como executado, dentro de uma versão de sessão.

| Campo | Tipo | Regra |
|---|---|---|
| `sessaoVersaoId` | `string` | → `sessaoVersoes.id`. |
| `exercicioId` | `string` | → `exercicios.id`. |
| `ordem` | `number` | Ordem de execução. |
| `abordagem` | `string` | Registrada no histórico (FR-015). |
| `origem` | `'planejado' \| 'fora_do_plano'` | FR-088. `fora_do_plano` não tem metas. |
| `itemTreinoId` | `string \| null` | → `itensTreino.id`. `null` quando `origem = 'fora_do_plano'`. |
| `estado` | `'realizado' \| 'parcial' \| 'nao_realizado'` | FR-024, FR-091. |

**Índices**: `id`, `sessaoVersaoId`, `exercicioId`, `[exercicioId+sessaoVersaoId]`.

O índice por `exercicioId` é o que sustenta a consulta de histórico de um exercício em menos de
1 segundo (SC-010, FR-039).

---

### `seriesRealizadas`

| Campo | Tipo | Regra |
|---|---|---|
| `exercicioSessaoId` | `string` | → `exerciciosSessao.id`. |
| `ordem` | `number` | Número da série. |
| `cargaKg` | `number \| null` | `null` = não informada. Corrigível (FR-112). |
| `repeticoes` | `number \| null` | `null` = não informada. Corrigível. |
| `rir` | `number \| null` | Opcional (FR-029). Corrigível. |
| `naoRealizada` | `boolean` | Distinto de ausência de registro (FR-024). |
| `seriePlanejadaId` | `string \| null` | → `seriesPlanejadas.id`. `null` em série extra ou fora do plano. |
| `degraus` | `Degrau[] \| null` | Dropset (FR-013). `null` em série tradicional. |

`Degrau`: `{ ordem: number, cargaKg: number, repeticoes: number }`.

**Índices**: `id`, `exercicioSessaoId`, `[exercicioSessaoId+ordem]`.

**Série válida** (FR-092): `repeticoes !== null && naoRealizada === false`. Esta definição é função
pura e vive na camada de domínio, não no banco.

---

### `metaAplicacao`

Registro único de estado da instalação. Não é dado de domínio.

| Campo | Tipo | Regra |
|---|---|---|
| `ultimoBackupEm` | `string \| null` | UTC. FR-109. |
| `persistenciaConcedida` | `boolean \| null` | Resultado de `navigator.storage.persist()`. `null` = ainda não consultado. |
| `persistenciaVerificadaEm` | `string \| null` | UTC da última verificação. |

Quando `persistenciaConcedida !== true`, o aplicativo opera em estado degradado declarado: sinaliza
a condição ao usuário e aumenta a frequência do lembrete de backup.

---

## Relacionamentos

```text
exercicios ──< itensTreino >── treinos
                   │
                   └──< seriesPlanejadas

sessoes ──< sessaoVersoes ──< exerciciosSessao ──< seriesRealizadas
   │            (vigente)            │                    │
   └─ versaoVigenteId ───────────────┘                    │
                                     │                    │
exercicios ──────────────────────────┘                    │
seriesPlanejadas ─────────────────────────────────────────┘  (vínculo opcional)
```

---

## Transições de estado da sessão

```text
                  concluir (FR-025)
  em_andamento ──────────────────────> concluida ──> [correção: nova versão, estado inalterado]
       │                                              (FR-112 a FR-118)
       │ descartar (FR-026)
       └──────────────────────────────> descartada
```

- Não há transição de volta a `em_andamento`.
- `descartada` não integra o histórico nem a exportação.
- Correção **não** é transição de estado: cria versão, preserva `estado`, `iniciadaEm` e
  `concluidaEm`.
- Sessão `em_andamento` não é exportada (premissa de escopo da spec).

---

## Estado derivado — proibido persistir

O Princípio V proíbe persistir como fonte de verdade qualquer coisa desta lista. Tudo aqui é
calculado por consulta, no momento do uso:

| Derivação | Como é obtida |
|---|---|
| **Indicação de progressão** | Função pura sobre a execução finalizada mais recente do exercício (FR-094), avaliando FR-043, FR-044 e FR-078 a FR-081. |
| **Execução anterior de um exercício** | Consulta a `exerciciosSessao` por `exercicioId`, restrita a versões vigentes de sessões concluídas, com ao menos uma série válida. |
| **Carga da última execução** (FR-083) | Derivada da mesma consulta acima. |
| **Estado do exercício na sessão** | Derivável das séries; persistido apenas como conveniência de leitura e recalculável. |
| **Evolução de cargas** (FR-049) | Agregação sobre o histórico, calculada sob demanda. |

Único cache admitido: `sessaoVersoes.vigente`, com rotina de reconstrução obrigatória.

---

## Evolução de esquema

O Princípio IV exige evolução **aditiva**. A política:

1. Migrações Dexie são versionadas e sempre aditivas: novos campos entram com valor padrão, nunca
   destroem nem reescrevem registros existentes.
2. Nova abordagem de série é valor novo no campo `abordagem`, sem alteração estrutural (FR-014,
   SC-014).
3. Novo atributo por série entra como campo opcional em `seriesRealizadas` (FR-060).
4. Nenhuma migração pode remover coluna nem alterar o significado de coluna existente. Campo
   descontinuado é marcado como tal e deixa de ser escrito.
5. Toda migração precisa ler arquivos de backup de `formatVersion` anteriores — ver
   [contracts/backup-file.md](./contracts/backup-file.md).

---

## Regras de validação derivadas de requisitos

| Regra | Origem |
|---|---|
| Nome de treino não vazio | FR-001 |
| Ordem dos itens preservada e respeitada na execução | FR-007 |
| RIR inteiro não negativo ou nulo | Assumptions › Dados e domínio |
| Carga ≥ 0, fracionados permitidos | Assumptions › Dados e domínio |
| No máximo uma sessão `em_andamento` | FR-028 |
| Exercício com histórico não é excluível, apenas ocultável | FR-076 |
| Série extra não participa da avaliação de FR-043 | FR-079 |
| Exercício `fora_do_plano` nunca gera indicação na própria sessão | FR-089 |
| `iniciadaEm` e `concluidaEm` imutáveis sob correção | FR-115 |
| Correção não adiciona nem remove séries ou exercícios | FR-113 |
