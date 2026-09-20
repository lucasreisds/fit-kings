# Specification Quality Checklist: Aplicativo de Treinos de Academia

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-16
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Iteração de validação 1 — 2026-09-16

**Reprovado**: "No [NEEDS CLARIFICATION] markers remain" — 3 marcadores em aberto, dentro do limite máximo de 3:

| # | Requisito | Tema | Impacto |
|---|-----------|------|---------|
| Q1 | FR-062 | Escopo de acesso aos dados (local x conta com sincronização) | Escopo — define se há autenticação, backend e sincronização |
| Q2 | FR-011 | Identificação do exercício (catálogo x texto livre) | Escopo/UX — afeta a identidade estável do exercício e a comparação histórica |
| Q3 | FR-043 | Critério de "superou a meta" para o aviso de aumento de carga | UX — define a frequência e a confiabilidade do principal diferencial do produto |

Os demais itens foram aprovados. Observações registradas durante a validação:

- **Detalhes de implementação**: as preferências declaradas pelo solicitante (estilo Glassmorphism e uso da skill `frontend-design`) foram deliberadamente mantidas fora dos requisitos funcionais e registradas em *Assumptions › Direcionamentos para a fase de planejamento*, para não contaminar a especificação com decisões de implementação.
- **Testabilidade**: requisitos originalmente vagos da descrição ("visual moderno", "controles adequados", "alta prioridade visual") foram convertidos em critérios verificáveis — FR-054, FR-055, FR-056, SC-008 e SC-009.
- **Escopo**: funcionalidades comuns não citadas pelo solicitante (cronômetro de descanso, periodização, exportação, integração com wearables, entre outras) foram explicitamente declaradas fora de escopo em *Assumptions › Escopo*.
- **Governança**: `.specify/memory/constitution.md` está com o conteúdo padrão do template, sem princípios preenchidos. Nenhuma restrição de governança foi aplicada. Recomenda-se rodar `/speckit-constitution` antes de `/speckit-plan`.

### Iteração de validação 2 — 2026-09-17 (após `/speckit-clarify`)

**Resultado**: 16/16 itens aprovados (antes: 15/16).

Item que mudou de estado:

- `No [NEEDS CLARIFICATION] markers remain` — de ❌ para ✅. Os 3 marcadores foram resolvidos pelas respostas da sessão de clarificação, e mais 2 ambiguidades detectadas na varredura foram fechadas. Nenhuma regressão.

Decisões incorporadas na sessão de 2026-09-17:

| # | Tema | Decisão | Impacto na spec |
|---|------|---------|-----------------|
| Q1 | Acesso aos dados | Conta de usuário com sincronização automática em nuvem, offline-first | Nova US7, FR-062 a FR-070, entidade Conta de usuário, 5 casos de borda, SC-015 a SC-018 |
| Q2 | Identificação do exercício | Catálogo curado pelo proprietário + exercícios personalizados, com identificador estável | FR-011 reescrito, FR-071 a FR-077, entidade Exercício revista, SC-019 e SC-020 |
| Q3 | Critério de aumento de carga | Repetições estritamente maiores que o planejado em todas as séries E RIR realizado ≥ RIR planejado quando informado | FR-043 e FR-044 reescritos, FR-078 a FR-081, SC-021 |
| Q4 | Preenchimento da carga | Nunca pré-preenchida entre sessões; última carga exibida no cabeçalho com aplicação por 1 toque; herança dentro da mesma sessão | FR-082 a FR-086, 2 cenários novos na US2, SC-022 e SC-023 |
| Q5 | Exercícios fora do plano | Permitido adicionar fora do plano e pular planejados; sem série válida não conta como execução para FR-043 | FR-087 a FR-094, 2 casos de borda, SC-024 e SC-025 |

Totais após a clarificação: 7 user stories, 94 requisitos funcionais, 25 critérios de sucesso, 10 entidades, 0 marcadores em aberto.

### Iteração de validação 3 — 2026-09-19 (revisão de escopo: MVP local)

**Resultado**: 16/16 itens aprovados. Nenhuma regressão.

Revisão solicitada pelo proprietário do produto: retirar conta de usuário, backup em nuvem e sincronização do escopo desta versão, substituindo-os por exportação e importação em arquivo.

| # | Tema | Decisão | Impacto na spec |
|---|------|---------|-----------------|
| D1 | Escopo de continuidade dos dados | MVP local ao dispositivo, sem servidor e sem rede | US7 original removida, FR-062 a FR-070 removidos, SC-015 a SC-018 reescritos, entidade Conta de usuário removida, 5 casos de borda de sincronização removidos |
| D2 | Substituição | Exportação e importação do conjunto de dados em arquivo | Nova US7 com 7 cenários, FR-095 a FR-111, entidade Arquivo de backup, 8 casos de borda novos |
| D3 | Escopo do arquivo | Conjunto completo (treinos + exercícios personalizados + sessões), não apenas o histórico | FR-095, SC-015, SC-026 |
| D4 | Semântica da importação | Mesclagem por identificador estável, idempotente, com a regra de precedência do antigo FR-068 | FR-101 a FR-105, SC-017 |
| D5 | Mitigação da perda de dados | Data do último backup e lembrete periódico não bloqueante | FR-109, FR-110, SC-028 |
| D6 | Independência de rede | FR-057 e SC-011 reforçados em vez de removidos | FR-057, SC-011, FR-111 |

**Totais após a revisão**: 7 user stories, 102 requisitos funcionais, 28 critérios de sucesso, 10 entidades, 27 casos de borda, 0 marcadores em aberto.

Observações registradas durante a validação:

- **Numeração**: FR-062 a FR-070 foram removidos sem reaproveitamento dos números, preservando a validade das referências históricas (o registro de clarificação de 2026-09-17 cita FR-062). A lacuna está documentada por uma nota de revisão na própria seção de requisitos. A entrada de clarificação superada foi marcada como tal, para não ser lida como vigente.
- **Detalhes de implementação**: a nova seção *Assumptions › Premissas de modelo de dados para evolução futura* registra restrições de modelagem (identificadores gerados no cliente, campos de criação e alteração, exclusão lógica, identidade estável do exercício, carimbos em UTC). São restrições declaradas pelo solicitante e vinculantes para o planejamento, não escolhas de tecnologia — nenhum formato, banco ou biblioteca é nomeado. Mesmo tratamento dado às preferências de Glassmorphism e `frontend-design` na iteração 1.
- **Escopo**: a redução foi validada contra a premissa já registrada de usuário único. Conta, backup em nuvem e sincronização permanecem declarados como evolução futura, e as premissas de modelo de dados existem para que essa fase não exija migração nem reescrita do histórico.
- **Cobertura**: os casos de borda de sincronização removidos foram substituídos por casos equivalentes do novo mecanismo (arquivo corrompido, versão anterior do formato, importação repetida, importação em aparelho com dados mais recentes, registro excluído presente no arquivo, usuário que nunca exporta).

### Iteração de validação 4 — 2026-09-19 (após `/speckit-clarify`, pós-emenda constitucional v1.1.0)

**Resultado**: 16/16 itens aprovados. Nenhuma regressão.

*Registrada retroativamente.* No momento em que ocorreu, o `/speckit-clarify` proíbe alterar o arquivo de checklist além do estado dos checkboxes, para evitar diferenças ruidosas — por isso a iteração não foi anotada na ocasião.

A ratificação da constituição (v1.0.0) e suas emendas seguintes expuseram ambiguidades na spec. Três perguntas, três respostas:

| # | Tema | Decisão | Impacto na spec |
|---|------|---------|-----------------|
| Q1 | Correção de sessão concluída | Permitida apenas sobre valores de séries existentes — carga, repetições e RIR —, gerando nova versão do registro; data, horário e ordem cronológica imutáveis | FR-112 a FR-118, SC-029, SC-030, 3 casos de borda |
| Q2 | Importação de sessão corrigida | Mesclagem por identificador; versão do arquivo mais recente entra como nova versão local preservando a anterior; versão não mais recente é operação nula | FR-102 reescrito, SC-031, 2 casos de borda |
| Q3 | Herança de carga entre séries | Mantida dentro do mesmo exercício na mesma sessão; valor herdado é dado efetivo e visualmente indistinguível de um digitado; nunca alcança a primeira série nem atravessa exercícios | FR-085 reescrito, FR-119, SC-032 |

Decorrência: emenda constitucional **v1.2.0**, alinhando os Princípios I e II às decisões Q2 e Q3.

### Iteração de validação 5 — 2026-09-19 (fase de planejamento e abertura da direção visual)

**Resultado**: 16/16 itens aprovados. Nenhuma regressão.

Reúne as revisões da spec originadas em `/speckit-plan` e a decisão posterior do proprietário sobre estilo visual.

| # | Tema | Decisão | Impacto na spec |
|---|------|---------|-----------------|
| P1 | Confiabilidade do armazenamento | Verificar e solicitar a marcação de persistência; não operar como se o armazenamento fosse confiável sem confirmação; estado degradado sinalizado com lembrete de backup mais frequente | FR-120 a FR-123, SC-033, 2 casos de borda |
| P2 | Geração de identificadores | Caminho único em todos os ambientes; ambiente sem as garantias necessárias recusa operar com mensagem explícita, sem mecanismo alternativo | FR-124, SC-034, 2 casos de borda |
| P3 | Independência de rede | FR-057 precisado: a proibição alcança a execução, não o ato de instalar o aplicativo | FR-057 |
| P4 | Direção visual | **Glassmorphism deixa de ser estilo definido.** Nenhum estilo específico é obrigatório; a escolha passa para a implementação, delimitada por 5 restrições verificáveis na constituição | *Assumptions › Direcionamentos para a fase de planejamento* reescrito |

Decorrências constitucionais: **v1.3.0** (Princípios III e IV) e **v1.4.0** (Restrições de Produto e Plataforma).

**Totais após a iteração 5**: 7 user stories, 115 requisitos funcionais, 34 critérios de sucesso, 10 entidades, 36 casos de borda, 0 marcadores em aberto.

Observações registradas durante a validação:

- **Supersessão de Glassmorphism**: as notas das iterações 1 e 3 citam Glassmorphism como preferência declarada do solicitante. **Aquelas menções foram superadas pela iteração 5** e permanecem no arquivo por serem registro datado do que era verdade naquelas validações. A spec não contém mais nenhuma menção ao estilo.
- **Restrições mais rígidas, não mais frouxas**: remover a obrigatoriedade do estilo não afrouxou a exigência visual. A regra anterior admitia o efeito "com moderação"; as 5 restrições proíbem transparência e blur na tela de execução, exigem contraste garantido por construção e fixam carga, repetições e RIR como maior hierarquia visual. Os pisos do Princípio II permanecem intocados.
- **Detalhes de implementação**: FR-120 a FR-124 foram redigidos sem citar nenhuma API, biblioteca ou plataforma — as chamadas concretas ficaram em `research.md`, onde pertencem. O item "No implementation details" continua aprovado.
- **Numeração**: nenhum número de requisito foi reaproveitado em nenhuma das cinco iterações. A lacuna de FR-062 a FR-070 permanece documentada na própria seção de requisitos.

### Iteração de validação 6 — 2026-09-19 (achados de `/speckit-analyze`)

**Resultado**: 16/16 itens aprovados. Nenhuma regressão.

`/speckit-analyze` é read-only: reporta e não grava. Esta iteração é o registro da correção dos quatro achados que ele levantou.

| # | Achado | Decisão | Impacto nos artefatos |
|---|--------|---------|-----------------------|
| D1 | A skill `frontend-design` é obrigatória "na implementação das telas", mas só tinha tarefa em US1, US7, US5 e US6 — faltavam US2, US3 e US4, incluindo a tela de execução, além das telas da própria fundação | Cobertura fechada tela por tela, com tabela de rastreamento em `tasks.md`. T042 continua sendo a única tarefa que **decide** a direção; as demais aplicam | T124 (US2), T125 (US3), T126 (US4), T127 (telas da Phase 2) |
| D2 | `exerciciosSessao.estado` era declarado cache recalculável, mas nenhuma tarefa implementava a reconstrução — e a reconstrução seria impossível, porque `nao_realizado` é intenção do usuário e não deriva das séries | **Intenção separada de derivação.** `estado` sai do esquema; entra `naoRealizado: boolean` como autoridade, e o trio vira função pura `estadoExercicioSessao()`. Some o cache e some a necessidade de reconstrução | FR-125, FR-126, 1 caso de borda; `data-model.md` §`exerciciosSessao` e §*Estado derivado*; T128 a T130; T063, T071 e T088 ajustadas |
| B1 | O intervalo do lembrete de backup nunca fora definido; SC-028 citava "o intervalo definido", que não existia, deixando FR-110, FR-122, SC-028 e SC-033 intestáveis | **7 dias**, reduzidos para **2 dias** sem persistência concedida. Contagem ancorada na última exportação **concluída com sucesso** — não em tentativa falha nem em lembrete exibido. Nunca apresentado durante sessão em andamento: vencendo no meio do treino, aparece no encerramento | FR-110 e FR-122 reescritos, SC-028 e SC-033 reescritos, 1 caso de borda; `data-model.md` §`metaAplicacao`; T055, T056 e T132 |
| E1 | Nada testava que renomear exercício preserva o histórico (SC-019), nem que exportar→importar preserva a identidade do exercício (SC-026, FR-105) | Dois testes automatizados, com os cenários detalhados em `quickstart.md` | T131, T133 |

**Totais após a iteração 6**: 7 user stories, 117 requisitos funcionais, 34 critérios de sucesso, 10 entidades, 38 casos de borda, 0 marcadores em aberto.

Observações registradas durante a validação:

- **Nenhuma emenda constitucional foi necessária.** Os quatro achados eram lacunas de especificação e de rastreabilidade, não conflitos com a constituição. A v1.4.0 permanece vigente e intocada.
- **D2 é a única mudança de esquema.** Ela torna literalmente verdadeira a afirmação do `data-model.md` de que `sessaoVersoes.vigente` é o único cache do modelo — antes a própria página se contradizia, listando `estado` como cache duas linhas acima.
- **Numeração**: FR-125 e FR-126 são números novos; nenhum número foi reaproveitado, mantendo a regra observada nas seis iterações. As tarefas T124 a T133 foram acrescentadas nas fases a que pertencem, sem renumerar T001 a T123, que são referenciados por `plan.md`, `research.md` e `quickstart.md`.

### Pendência

Nenhuma. A especificação está consistente com a constituição v1.4.0, os quatro achados de `/speckit-analyze` estão fechados, e os artefatos de planejamento — `plan.md`, `research.md`, `data-model.md`, `contracts/backup-file.md`, `quickstart.md` e `tasks.md` — estão gerados e consistentes entre si.

Próximo passo recomendado: remover os Sync Impact Reports da constituição (T122) e seguir para `/speckit-implement`.
