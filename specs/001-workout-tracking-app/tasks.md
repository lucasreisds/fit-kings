---

description: "Task list for 001-workout-tracking-app"
---

# Tasks: Aplicativo de Treinos de Academia

**Input**: Design documents from `/specs/001-workout-tracking-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/backup-file.md](./contracts/backup-file.md)

**Constituição**: v1.4.0 — os portões de teste da seção *Fluxo de Desenvolvimento* são obrigatórios.

> **Numeração**: as tarefas T124 a T132 foram acrescentadas depois da geração original para fechar
> os quatro achados de `/speckit-analyze` (D1, D2, B1, E1). Elas aparecem na fase a que pertencem, e
> não no fim do arquivo — por isso a numeração não é crescente ao longo do documento. Os IDs de
> T001 a T123 não foram remexidos de propósito: `plan.md`, `research.md` e `quickstart.md` os
> referenciam, e renumerar 123 tarefas para ganhar ordem visual quebraria essas referências.

**Tests**: **incluídos e obrigatórios.** Não são opcionais aqui: a constituição define quatro
portões de teste sem os quais nenhuma entrega é concluída, e 14 critérios de sucesso da spec exigem
verificação "em 100% dos casos de teste".

**Organization**: tarefas agrupadas por user story, para implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos distintos, sem dependência pendente)
- **[Story]**: a qual user story a tarefa pertence (US1..US7)
- Todo caminho de arquivo é explícito

## Path Conventions

Projeto único de front-end, sem backend — o Princípio III proíbe componente que dependa de
servidor. Raiz do repositório: `fit-kings/`.

- `src/domain/` — TypeScript puro, **sem React, sem Dexie, sem DOM**
- `src/dados/` — Dexie, repositórios, migrações
- `src/funcionalidades/` — telas por jornada
- `src/ui/` — componentes e tokens de tema
- `src/plataforma/` — armazenamento, compartilhamento, service worker
- `tests/unidade/`, `tests/integracao/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicialização do projeto e das guardas automatizadas que sustentam os princípios.

- [X] T001 Criar a estrutura de diretórios conforme Project Structure do plan.md, em `fit-kings/src/` e `fit-kings/tests/`
- [X] T002 Inicializar projeto npm com Vite, React 19 e TypeScript em modo estrito (`strict: true`, `noUncheckedIndexedAccess: true`) em `fit-kings/package.json` e `fit-kings/tsconfig.json`
- [X] T003 [P] Adicionar dependências `dexie`, `zustand`, `vite-plugin-pwa` em `fit-kings/package.json`
- [X] T004 [P] Configurar ESLint e Prettier em `fit-kings/eslint.config.js`
- [X] T005 [P] Adicionar regra de lint proibindo qualquer import de `react`, `dexie` ou de API de DOM dentro de `src/domain/**`, em `fit-kings/eslint.config.js` — torna o Princípio V verificável por ferramenta, não por disciplina
- [X] T006 [P] Adicionar regra de lint proibindo chamada direta a `crypto.randomUUID()` fora de `src/plataforma/id.ts`, em `fit-kings/eslint.config.js` (FR-124)
- [X] T007 [P] Configurar Vitest com `fake-indexeddb` em `fit-kings/vitest.config.ts`
- [X] T008 [P] Configurar Playwright em `fit-kings/playwright.config.ts`
- [X] T009 [P] Adicionar script `dev:https` com mkcert em `fit-kings/package.json` e `fit-kings/vite.config.ts` — sem ele não há validação em iPhone, porque HTTP em IP de rede não é contexto seguro
- [X] T010 Configurar `vite-plugin-pwa` em `fit-kings/vite.config.ts` e o manifesto em `fit-kings/public/manifest.webmanifest` com `display: standalone` e `orientation: portrait` (FR-052)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura sem a qual nenhuma user story pode começar.

**⚠️ CRITICAL**: nenhum trabalho de user story começa antes desta fase terminar.

- [X] T011 Implementar guarda de contexto seguro e `novoId()` em `fit-kings/src/plataforma/id.ts` e `fit-kings/src/plataforma/contextoSeguro.ts` — caminho único, **sem fallback**; ambiente sem contexto seguro recusa operar com mensagem explícita na inicialização (FR-124, SC-034)
- [X] T012 Implementar carimbo de tempo em UTC com deslocamento local preservado em `fit-kings/src/plataforma/tempo.ts` (Princípio IV)
- [X] T013 [P] Definir os tipos comuns a toda entidade — `id`, `criadoEm`, `alteradoEm`, `deslocamentoLocal`, `excluidoEm: string | null` — em `fit-kings/src/domain/tipos/base.ts`
- [X] T014 [P] Definir os tipos de domínio de exercício, treino, sessão e série em `fit-kings/src/domain/tipos/`, conforme data-model.md
- [X] T015 Criar o esquema Dexie versão 1 com as 9 tabelas e todos os índices de data-model.md em `fit-kings/src/dados/db.ts` — incluindo `[estado+concluidaEm]` em `sessoes` e `[exercicioId+sessaoVersaoId]` em `exerciciosSessao`, que sustentam SC-010
- [X] T016 Implementar a política de migração aditiva em `fit-kings/src/dados/migracoes/index.ts` — nova migração nunca remove coluna nem altera significado de coluna existente (Princípio IV)
- [X] T017 Implementar repositório base com exclusão lógica e atualização automática de `alteradoEm` em `fit-kings/src/dados/repositorios/base.ts` — remoção física é proibida
- [X] T018 Implementar verificação e solicitação de persistência do armazenamento em `fit-kings/src/plataforma/persistencia.ts` (FR-120, FR-121)
- [X] T019 Implementar o registro `metaAplicacao` com `ultimoBackupEm`, `persistenciaConcedida` e `persistenciaVerificadaEm` em `fit-kings/src/dados/repositorios/metaAplicacao.ts`
- [X] T020 Implementar o app shell e a navegação em `fit-kings/src/app/`
- [X] T021 [P] Implementar os tokens de tema em `fit-kings/src/ui/tokens.ts` como **pares de cor texto/fundo já validados em 4,5:1**, consumidos pelos componentes — garante o contraste por construção em vez de auditoria posterior (D9, critério 1, SC-009)
- [X] T022 [P] Implementar componentes de entrada com área de toque mínima de 44×44 pt em `fit-kings/src/ui/` (FR-054, SC-009)
- [X] T023 Implementar o aviso não bloqueante de estado degradado de persistência em `fit-kings/src/ui/AvisoPersistencia.tsx` (FR-122)
- [X] T024 Implementar a tela de diagnóstico com estado da persistência e espaço disponível em `fit-kings/src/funcionalidades/diagnostico/` (FR-123)
- [X] T025 [P] Teste de unidade: `novoId()` gera UUID válido e a guarda recusa operar fora de contexto seguro, em `fit-kings/tests/unidade/plataforma/id.test.ts` (SC-034)
- [X] T026 [P] Teste de integração: repositório base marca `excluidoEm` sem remover fisicamente e atualiza `alteradoEm` a cada escrita, em `fit-kings/tests/integracao/repositorioBase.test.ts`
- [X] T027 [P] Teste de integração: migração aditiva preserva registros existentes, em `fit-kings/tests/integracao/migracoes.test.ts` (SC-014)

**Checkpoint**: fundação pronta. As user stories podem começar.

---

## Phase 3: User Story 1 - Montar e manter treinos (Priority: P1) 🎯 MVP

**Goal**: criar, editar, reordenar e excluir treinos com séries, repetições, carga e RIR
planejados, persistidos entre aberturas do aplicativo.

**Independent Test**: criar um treino com vários exercícios, reordená-los, editar valores
planejados, fechar e reabrir o aplicativo, e confirmar que tudo permanece íntegro.

### Tests for User Story 1

- [X] T028 [P] [US1] Teste de unidade: validação de treino — nome não vazio, ordem contígua dos itens — em `fit-kings/tests/unidade/domain/treino.test.ts` (FR-001, FR-007)
- [X] T029 [P] [US1] Teste de integração: treino com itens e séries planejadas sobrevive a fechar e reabrir o banco, em `fit-kings/tests/integracao/treinos.test.ts` (FR-010)
- [X] T030 [P] [US1] Teste de integração: exercício com execução no histórico não pode ser excluído, apenas ocultado, em `fit-kings/tests/integracao/exercicios.test.ts` (FR-076)

### Implementation for User Story 1

- [X] T031 [P] [US1] Implementar regras de domínio de treino e item de treino em `fit-kings/src/domain/treino/` — ordem preservada, valores planejados por série (FR-007, FR-009)
- [X] T032 [P] [US1] Implementar o repositório de exercícios em `fit-kings/src/dados/repositorios/exercicios.ts` — `origem: 'catalogo' | 'personalizado'`, `ocultoEm` distinto de `excluidoEm` (FR-071 a FR-077)
- [X] T033 [US1] Implementar o repositório de treinos, itens e séries planejadas em `fit-kings/src/dados/repositorios/treinos.ts` (depende de T031, T032)
- [X] T034 [US1] Semear o catálogo inicial de exercícios curado em `fit-kings/src/dados/seed/catalogo.ts` (FR-071)
- [X] T035 [US1] Implementar a tela de lista de treinos em `fit-kings/src/funcionalidades/treinos/ListaTreinos.tsx` (FR-004)
- [X] T036 [US1] Implementar a tela de edição de treino em `fit-kings/src/funcionalidades/treinos/EditorTreino.tsx` — adicionar, remover e reordenar exercícios (FR-002, FR-005, FR-006, FR-007)
- [X] T037 [US1] Implementar o seletor de exercício com busca e filtro em `fit-kings/src/funcionalidades/treinos/SeletorExercicio.tsx` — no máximo 3 toques a partir da edição do treino (FR-011, FR-075, SC-020)
- [X] T038 [US1] Implementar a criação de exercício personalizado em `fit-kings/src/funcionalidades/treinos/NovoExercicio.tsx` (FR-072)
- [X] T039 [US1] Implementar o editor de séries planejadas por exercício em `fit-kings/src/funcionalidades/treinos/EditorSeries.tsx` — `repeticoes` inteiro positivo, `cargaKg` ≥ 0 com fracionados, `rir` inteiro não negativo ou nulo (FR-008, FR-009)
- [X] T040 [US1] Implementar a abordagem dropset com degraus de carga e repetições em `fit-kings/src/funcionalidades/treinos/EditorDropset.tsx` (FR-013)
- [X] T041 [US1] Implementar a exclusão de treino com confirmação explícita em `fit-kings/src/funcionalidades/treinos/` (FR-003)
- [X] T042 [US1] **Decidir a direção visual do produto** com a skill `frontend-design` e aplicá-la às telas de US1, registrando a decisão e sua avaliação contra os 5 critérios de D9 em `fit-kings/docs/direcao-visual.md` — a constituição v1.4.0 não obriga nenhum estilo, mas reprova qualquer um que falhe em um dos critérios
- [X] T127 [US1] Aplicar a direção visual decidida em T042 às telas já construídas na fundação — app shell e navegação (T020), aviso de persistência (T023) e tela de diagnóstico (T024) — em `fit-kings/src/app/`, `fit-kings/src/ui/AvisoPersistencia.tsx` e `fit-kings/src/funcionalidades/diagnostico/`. Essas telas são construídas na Phase 2, **antes** de a direção existir; sem esta tarefa elas ficariam como a única parte do aplicativo fora da exigência da constituição

**Checkpoint**: dá para montar e manter treinos. O aplicativo já substitui a anotação em papel.

---

## Phase 4: User Story 7 - Backup e restauração em arquivo (Priority: P7, antecipada)

**Goal**: exportar todos os dados em um arquivo e importá-lo de volta, com mesclagem idempotente.

**Independent Test**: cadastrar dados, exportar, instalar em outro aparelho, importar, e confirmar
que tudo aparece íntegro; importar o mesmo arquivo duas vezes sem duplicar nada.

> **Por que esta fase vem aqui, e não por último.** Na spec ela é P7. O risco R1 de
> [research.md](./research.md) muda a ordem: o armazenamento da plataforma é despejável pelo
> sistema operacional, e a partir de US1 já existe dado que o usuário não quer perder. Construir o
> backup por último seria construir o paraquedas depois do salto. Ela não pode vir antes de US1
> porque não haveria o que exportar. Quando US2 acrescentar sessões, o arquivo ganha coleções
> novas — o que **não** incrementa `formatVersion`, exatamente como a política de compatibilidade
> do contrato prevê.

### Tests for User Story 7

- [X] T043 [P] [US7] Teste de unidade: validação do arquivo — `formatVersion` desconhecido, JSON truncado, referência não resolvida, `id` duplicado — em `fit-kings/tests/unidade/domain/backup/validacao.test.ts` (FR-106)
- [X] T044 [P] [US7] Teste de unidade: mesclagem por identificador, precedência por `alteradoEm` e idempotência, em `fit-kings/tests/unidade/domain/backup/mesclagem.test.ts` (FR-101, FR-103, FR-104)
- [X] T045 [P] [US7] Teste ponta a ponta do **Portão 3**: exportar, importar, importar de novo sem duplicar, e recusar arquivo inválido sem alterar dado existente, em `fit-kings/tests/e2e/backup.spec.ts` (SC-017, SC-018)
- [X] T132 [P] [US7] Teste de unidade da regra do lembrete de backup em `fit-kings/tests/unidade/funcionalidades/lembreteBackup.test.ts` — relógio controlado, sem interface. Casos obrigatórios: 6 dias não apresenta e 8 dias apresenta com persistência concedida; 1 dia não apresenta e 3 dias apresentam sem persistência concedida; `ultimoBackupEm` nulo ancora no primeiro registro; exportação que **falha** não move a âncora; lembrete exibido não move a âncora e continua vencido na avaliação seguinte; intervalo vencido com sessão `em_andamento` não apresenta, e passa a apresentar ao concluir e ao descartar a sessão (FR-110, FR-122, SC-028, SC-033)

### Implementation for User Story 7

- [X] T046 [P] [US7] Definir os tipos do arquivo de backup em `fit-kings/src/domain/backup/tipos.ts`, conforme [contracts/backup-file.md](./contracts/backup-file.md)
- [X] T047 [US7] Implementar a validação completa do arquivo como função pura em `fit-kings/src/domain/backup/validar.ts` — valida **tudo** antes de qualquer escrita; falha aborta sem tocar em nada (FR-106)
- [X] T048 [US7] Implementar a mesclagem como função pura em `fit-kings/src/domain/backup/mesclar.ts` — localiza por `id`, resolve editáveis por `alteradoEm` mais recente, empate mantém o local (FR-101, FR-103)
- [X] T049 [US7] Implementar a montagem do arquivo de exportação em `fit-kings/src/domain/backup/montar.ts` — inclui registros com `excluidoEm` preenchido e sua marca; exclui sessões `em_andamento` e `descartadas` (FR-095, FR-098)
- [X] T050 [US7] Implementar a aplicação da importação em transação única em `fit-kings/src/dados/repositorios/backup.ts` — nada é gravado se qualquer etapa falhar
- [X] T051 [US7] Implementar a exportação pela folha de compartilhamento em `fit-kings/src/plataforma/compartilhar.ts` — `navigator.share` com arquivo, e download por `Blob` onde indisponível (FR-099)
- [X] T052 [US7] Implementar a seleção de arquivo para importação em `fit-kings/src/funcionalidades/backup/SelecionarArquivo.tsx` (FR-100)
- [X] T053 [US7] Implementar a tela de resumo pré-importação com confirmação explícita em `fit-kings/src/funcionalidades/backup/ResumoImportacao.tsx` (FR-107)
- [X] T054 [US7] Implementar o relatório pós-importação — importados, atualizados e ignorados por não serem mais recentes — em `fit-kings/src/funcionalidades/backup/RelatorioImportacao.tsx` (FR-108)
- [X] T055 [US7] Implementar o registro e a exibição da data do último backup em `fit-kings/src/funcionalidades/backup/` — `metaAplicacao.ultimoBackupEm` é escrito **somente** após a exportação concluir com sucesso, nunca ao iniciá-la e nunca após falha (FR-109, FR-110)
- [X] T056 [US7] Implementar o lembrete de backup não bloqueante em `fit-kings/src/funcionalidades/backup/LembreteBackup.tsx` — intervalo de **7 dias** desde `ultimoBackupEm`, reduzido para **2 dias** quando `persistenciaConcedida !== true`; âncora no primeiro registro do usuário quando nunca houve exportação; **exibir o lembrete não reinicia a contagem** — só a exportação bem-sucedida reinicia; e o lembrete **não é apresentado durante sessão `em_andamento`**, ficando para o encerramento dela por conclusão ou descarte (FR-110, FR-122, SC-028, SC-033)
- [X] T057 [US7] Aplicar a skill `frontend-design` às telas de US7

**Checkpoint**: os dados de US1 já têm rede de proteção. A partir daqui, nada construído fica sem backup.

---

## Phase 5: User Story 2 - Executar o treino registrando o realizado (Priority: P2)

**Goal**: iniciar um treino salvo e registrar série a série, com o mínimo de toques.

**Independent Test**: iniciar um treino existente, registrar todas as séries de todos os
exercícios e concluir; o resumo mostra planejado x realizado.

### Tests for User Story 2

- [X] T058 [P] [US2] Teste de unidade: série válida é a que tem repetições registradas e não está marcada como não realizada, em `fit-kings/tests/unidade/domain/serie.test.ts` (FR-092)
- [X] T059 [P] [US2] Teste de unidade: herança de carga não alcança a primeira série de um exercício nem atravessa exercícios distintos, em `fit-kings/tests/unidade/domain/heranca.test.ts` (FR-085)
- [X] T060 [P] [US2] Teste de integração: cada série confirmada é gravada em transação própria e sobrevive à recarga, em `fit-kings/tests/integracao/execucao.test.ts` (FR-033)
- [X] T061 [P] [US2] Teste de integração: a sessão preserva cópia dos valores planejados e não muda quando o treino é editado depois, em `fit-kings/tests/integracao/snapshotPlano.test.ts` (FR-017)
- [X] T129 [P] [US2] Teste de unidade de `estadoExercicioSessao()` em `fit-kings/tests/unidade/domain/estadoExercicioSessao.test.ts` — casos de fronteira exigidos pelo Princípio V: nenhuma série e sem marcação → não alcançado; nenhuma série e marcação ativa → `nao_realizado`; todas as séries planejadas válidas → `realizado`; parte delas válida → `parcial`; série extra não altera o estado; série marcada como não realizada não conta como válida; e **marcação ativa com série válida → estado inconsistente explícito**, nunca `realizado` nem `nao_realizado` por escolha silenciosa (FR-125, FR-126)
- [X] T130 [P] [US2] Teste de integração dos invariantes de FR-126 em `fit-kings/tests/integracao/exercicioNaoRealizado.test.ts` — marcar exercício como não realizado preserva as séries já gravadas nele, e gravar uma série limpa `naoRealizado` na mesma transação (FR-126)

### Implementation for User Story 2

- [X] T062 [P] [US2] Implementar as transições de estado da sessão em `fit-kings/src/domain/sessao/estado.ts` — `em_andamento → concluida | descartada`, sem retorno
- [X] T128 [P] [US2] Implementar `estadoExercicioSessao()` como função pura em `fit-kings/src/domain/sessao/estadoExercicio.ts` — recebe as séries do exercício e `naoRealizado`, devolve `realizado | parcial | nao_realizado | nao_alcancado | inconsistente`. **Regra única, em um só lugar**: nenhuma tela, repositório ou consulta pode recalcular esse estado por conta própria. O valor `inconsistente` é retorno de primeira classe, não exceção (FR-125, FR-126, Princípio V)
- [X] T063 [US2] Implementar o repositório de sessões, versões, exercícios da sessão e séries realizadas em `fit-kings/src/dados/repositorios/sessoes.ts` — grava a versão inicial com `motivo: 'inicial'` e `numero: 1`; `exerciciosSessao` persiste `naoRealizado: boolean` e **nunca** um campo de estado, que é sempre derivado por T128 (FR-125)
- [X] T064 [US2] Implementar o início de sessão com cópia dos valores planejados em `fit-kings/src/funcionalidades/execucao/iniciarSessao.ts` (FR-016, FR-017)
- [X] T065 [US2] Impedir duas sessões simultâneas, oferecendo retomar, concluir ou descartar a pendente, em `fit-kings/src/funcionalidades/execucao/` (FR-028)
- [X] T066 [US2] Implementar o store da sessão em andamento em `fit-kings/src/funcionalidades/execucao/store.ts` — memória é cache de leitura; o banco é a fonte de verdade (D5)
- [X] T067 [US2] Implementar a tela de execução em `fit-kings/src/funcionalidades/execucao/TelaExecucao.tsx` — registrar série completa sem trocar de tela, em até 3 toques e 5 s; **sem transparência, sem blur de fundo e sem efeito cujo custo dependa do conteúdo sob o elemento**, com carga, repetições e RIR no topo da hierarquia visual (FR-021, FR-022, FR-055, SC-001, D9 critérios 2 e 3)
- [X] T068 [US2] Implementar a gravação durável por série em `fit-kings/src/funcionalidades/execucao/` — retorno visual de sucesso **somente após** o commit da transação (FR-033, Princípio I)
- [X] T069 [US2] Implementar o cabeçalho do exercício com a carga da execução anterior e aplicação por um toque em `fit-kings/src/funcionalidades/execucao/CabecalhoExercicio.tsx` (FR-083, FR-084, SC-023)
- [X] T070 [US2] Implementar a herança de carga entre séries em `fit-kings/src/funcionalidades/execucao/` — campo da primeira série **nunca** pré-preenchido entre sessões; valor herdado visualmente indistinguível de um digitado (FR-082, FR-085, FR-119, SC-022, SC-032)
- [X] T071 [US2] Implementar séries extras, série ou exercício marcado como não realizado, e exercício adicionado fora do plano em `fit-kings/src/funcionalidades/execucao/` — marcar o exercício como não realizado **não apaga** as séries já gravadas nele, e gravar uma série define `naoRealizado = false` na mesma transação; a exibição do estado vem de T128, inclusive o caso inconsistente, que é sinalizado ao usuário em vez de resolvido em silêncio (FR-023, FR-024, FR-087, FR-088, FR-091, FR-125, FR-126)
- [X] T072 [US2] Implementar o registro de dropset com degraus em `fit-kings/src/funcionalidades/execucao/RegistroDropset.tsx` (FR-013, FR-015)
- [X] T073 [US2] Implementar a conclusão da sessão com resumo planejado x realizado, e o descarte com confirmação, em `fit-kings/src/funcionalidades/execucao/` (FR-025, FR-026, FR-027)
- [X] T074 [US2] Estender o arquivo de backup com as coleções `sessoes`, `exerciciosSessao` e `seriesRealizadas` em `fit-kings/src/domain/backup/` — acréscimo de coleção **não** incrementa `formatVersion`
- [X] T124 [US2] Aplicar a skill `frontend-design` às telas de US2, com a **tela de execução** como caso central, e registrar em `fit-kings/docs/direcao-visual.md` a avaliação dela contra os 5 critérios de D9. É a tela onde as restrições da constituição mais apertam: sem transparência, sem blur de fundo, sem efeito cujo custo dependa do conteúdo sob o elemento, e carga, repetições e RIR como os elementos de maior hierarquia visual. A direção escolhida em T042 vale aqui, mas cede à usabilidade se conflitar (Princípio II, D9 critérios 2 e 3)

**Checkpoint**: dá para treinar e registrar. Com US1 e US7, o produto já é utilizável na academia.

---

## Phase 6: User Story 3 - Retomar treino interrompido (Priority: P3)

**Goal**: preservar tudo o que foi registrado e retomar exatamente do ponto em que parou.

**Independent Test**: registrar parte de um treino, minimizar, usar outros aplicativos, forçar o
encerramento e reabrir — os dados registrados estão íntegros e a sessão é retomável.

### Tests for User Story 3

- [X] T075 [P] [US3] Teste ponta a ponta do **Portão 1**: recarga forçada no meio da sessão preserva 100% das séries confirmadas e a sessão continua retomável, em `fit-kings/tests/e2e/retomada.spec.ts` (SC-003)
- [X] T076 [P] [US3] Teste ponta a ponta: navegar para o histórico e voltar não perde nenhum valor preenchido, em `fit-kings/tests/e2e/retomada.spec.ts` (FR-030, SC-002)

### Implementation for User Story 3

- [X] T077 [US3] Implementar a detecção de sessão em andamento na abertura do aplicativo em `fit-kings/src/app/` (FR-034)
- [X] T078 [US3] Implementar a retomada no ponto exato em `fit-kings/src/funcionalidades/execucao/retomar.ts` (FR-032)
- [X] T079 [US3] Preservar o estado ao trocar de tela dentro do aplicativo em `fit-kings/src/funcionalidades/execucao/` (FR-030)
- [X] T080 [US3] Tratar `visibilitychange` e `pagehide` para consolidar estado ao minimizar ou bloquear a tela, em `fit-kings/src/plataforma/cicloDeVida.ts` (FR-031)
- [X] T081 [US3] Implementar o tratamento de sessão abandonada há muito tempo — perguntar se deseja retomar, concluir ou descartar (FR-034, caso de borda "Sessão abandonada")
- [X] T082 [US3] Implementar a mensagem compreensível com alternativa de ação quando não for possível salvar um registro, em `fit-kings/src/funcionalidades/execucao/` — **única interrupção permitida durante a sessão**, por servir ao Princípio I (FR-058, Princípio II)
- [X] T125 [US3] Aplicar a skill `frontend-design` às telas de US3 — aviso de sessão em andamento na abertura (T077), diálogo de retomar/concluir/descartar (T065, T081) e a mensagem de falha ao persistir (T082). Esta última é a única coisa autorizada a interromper um treino: precisa ser inconfundível e oferecer a alternativa de ação sem ambiguidade, sob as mesmas restrições visuais da tela de execução

**Checkpoint**: a confiabilidade da execução está fechada.

---

## Phase 7: User Story 4 - Consultar o histórico (Priority: P4)

**Goal**: consultar sessões realizadas, comparar execuções de um mesmo exercício e corrigir valores
registrados por engano.

**Independent Test**: com sessões concluídas, abrir o histórico, entrar numa sessão, listar as
execuções de um exercício isolado e corrigir um valor preservando a versão anterior.

### Tests for User Story 4

- [X] T083 [P] [US4] Teste ponta a ponta do **Portão 2**: editar e excluir o treino de origem não altera a sessão concluída, em `fit-kings/tests/e2e/imutabilidade.spec.ts` (SC-013)
- [X] T084 [P] [US4] Teste de integração: correção cria nova versão, preserva a anterior e não altera `iniciadaEm`, `concluidaEm` nem a ordem cronológica, em `fit-kings/tests/integracao/correcao.test.ts` (FR-114, FR-115, SC-029)
- [X] T085 [P] [US4] Teste de integração: listar 200 sessões em menos de 2 s e consultar o histórico de um exercício em menos de 1 s, em `fit-kings/tests/integracao/desempenhoHistorico.test.ts` (SC-010)
- [X] T131 [P] [US4] Teste de integração: **renomear um exercício preserva o histórico**, em `fit-kings/tests/integracao/identidadeExercicio.test.ts` — com execuções em três sessões concluídas, renomear o exercício e verificar que as três continuam vinculadas ao mesmo `id`, que a consulta de FR-039 devolve as três, que a evolução de cargas produz os mesmos pontos de antes e que a avaliação de progressão não muda. Vale para exercício de catálogo e para personalizado (SC-019, FR-041, FR-073, FR-074)
- [X] T133 [P] [US4] Teste ponta a ponta: **exportar → importar preserva a identidade do exercício**, em `fit-kings/tests/e2e/identidadeExercicio.spec.ts` — com histórico de vários exercícios, exportar, limpar o armazenamento do navegador, importar, e verificar que 100% das execuções continuam vinculadas aos mesmos exercícios e que a consulta de evolução de cada um produz resultado idêntico ao do aparelho de origem, valor a valor. Inclui um exercício renomeado depois da exportação, para provar que o vínculo é pelo `id` e não pelo nome (SC-026, FR-105)

### Implementation for User Story 4

- [X] T086 [US4] Implementar a consulta de sessões concluídas em ordem cronológica em `fit-kings/src/dados/repositorios/historico.ts`, usando o índice `[estado+concluidaEm]` (FR-036)
- [X] T087 [US4] Implementar a consulta de execuções de um exercício ao longo do tempo em `fit-kings/src/dados/repositorios/historico.ts`, restrita às versões vigentes (FR-039)
- [X] T088 [US4] Implementar a rotina de reconstrução do índice `sessaoVersoes.vigente` a partir de `sessoes.versaoVigenteId` em `fit-kings/src/dados/repositorios/sessoes.ts` — exigida pela ressalva de cache do Princípio V. `vigente` é o **único** cache do modelo, e portanto esta é a única rotina de reconstrução que o projeto precisa ter; qualquer campo futuro que a exija é sinal de que ele deveria ser derivação, não coluna
- [X] T089 [US4] Implementar a lista do histórico em `fit-kings/src/funcionalidades/historico/ListaHistorico.tsx` (FR-036)
- [X] T090 [US4] Implementar o detalhe da sessão com planejado e realizado lado a lado em `fit-kings/src/funcionalidades/historico/DetalheSessao.tsx` (FR-037, FR-038)
- [X] T091 [US4] Implementar a visão de histórico por exercício em `fit-kings/src/funcionalidades/historico/HistoricoExercicio.tsx` (FR-039)
- [X] T092 [US4] Implementar a correção de valores de sessão concluída em `fit-kings/src/funcionalidades/historico/CorrigirSessao.tsx` — apenas `cargaKg`, `repeticoes` e `rir`; **não** permite adicionar nem remover séries, exercícios, nem alterar a abordagem (FR-112, FR-113)
- [X] T093 [US4] Implementar a criação de versão na correção em `fit-kings/src/domain/sessao/versionar.ts` — nova versão com `motivo: 'correcao'`, anterior preservada, `corrigida: true` (FR-114, FR-116)
- [X] T094 [US4] Exigir confirmação explícita na correção e exibir a marca de correção com a data da última alteração em `fit-kings/src/funcionalidades/historico/` (FR-116, FR-118)
- [X] T095 [US4] Ajustar a exportação e a importação para o achatamento na versão vigente, com `corrigida` e `alteradoEm`, em `fit-kings/src/domain/backup/` (FR-102, contrato § achatamento)
- [X] T096 [US4] Implementar a regra de importação de sessão corrigida em `fit-kings/src/domain/backup/mesclar.ts` — arquivo mais recente entra como nova versão local preservando a anterior; igual ou anterior é operação nula (FR-102, SC-031)
- [X] T126 [US4] Aplicar a skill `frontend-design` às telas de US4 — lista do histórico (T089), detalhe da sessão com planejado e realizado lado a lado (T090), histórico por exercício (T091) e correção de sessão (T092 a T094). A comparação planejado x realizado é densa em número: a direção visual precisa deixá-la legível sem recorrer a cor como único portador de significado, e a marca de correção precisa ser visível sem competir com os valores

**Checkpoint**: o histórico está completo, consultável e corrigível sem destruição.

---

## Phase 8: User Story 5 - Aviso de aumento de carga (Priority: P5)

**Goal**: identificar que a meta foi superada e avisar, sem bloquear, na próxima execução.

**Independent Test**: com histórico controlado (planejado 3×8, realizado 9/9/9), iniciar um novo
treino com o mesmo exercício e verificar que o aviso aparece com os dados corretos.

### Tests for User Story 5

- [X] T097 [P] [US5] Teste de unidade do **Portão 4**: os 10 casos de fronteira do critério de aumento de carga listados em [quickstart.md](./quickstart.md), em `fit-kings/tests/unidade/domain/progressao.test.ts` (FR-043, FR-044, FR-078 a FR-081, SC-006, SC-007, SC-021)
- [X] T098 [P] [US5] Teste de unidade: "execução anterior" é a sessão concluída mais recente com ao menos uma série válida, em `fit-kings/tests/unidade/domain/execucaoAnterior.test.ts` (FR-094)
- [X] T099 [P] [US5] Teste de unidade: exercício planejado totalmente pulado não conta como execução e a indicação anterior permanece, em `fit-kings/tests/unidade/domain/progressao.test.ts` (FR-093, SC-024)
- [X] T100 [P] [US5] Teste de integração: após corrigir valores, a indicação reflete os corrigidos na consulta seguinte, sem ação do usuário, em `fit-kings/tests/integracao/progressaoAposCorrecao.test.ts` (FR-117, SC-030)

### Implementation for User Story 5

- [X] T101 [US5] Implementar o critério de aumento de carga como função pura em `fit-kings/src/domain/progressao/avaliar.ts` — repetições estritamente maiores em **todas** as séries planejadas, e RIR realizado ≥ planejado nas séries em que foi informado; sem RIR em nenhuma, aplica só repetições (FR-043, FR-044)
- [X] T102 [US5] Implementar as exclusões do critério em `fit-kings/src/domain/progressao/avaliar.ts` — série planejada sem registro ou marcada como não realizada invalida; série extra é ignorada; empate não indica (FR-078, FR-079, FR-081)
- [X] T103 [US5] Implementar a consulta da execução anterior em `fit-kings/src/dados/repositorios/progressao.ts` — **por consulta, nunca por campo persistido** (Princípio V, FR-094)
- [X] T104 [US5] Implementar a apresentação do desempenho anterior e do aviso na tela de execução em `fit-kings/src/funcionalidades/progressao/AvisoProgressao.tsx` — não bloqueia, não interrompe, não exige interação (FR-045, FR-046)
- [X] T105 [US5] Implementar a consulta dos dados que fundamentam o aviso em `fit-kings/src/funcionalidades/progressao/DetalheAviso.tsx` (FR-047)
- [X] T106 [US5] Garantir que exercício sem execução anterior e exercício fora do plano não gerem aviso, em `fit-kings/src/domain/progressao/` (FR-048, FR-089, SC-025)

**Checkpoint**: o diferencial do produto está entregue e é determinístico.

---

## Phase 9: User Story 6 - Evolução das cargas (Priority: P6)

**Goal**: visualizar a progressão das cargas de um exercício ao longo das semanas.

**Independent Test**: com histórico de várias semanas, abrir a evolução de um exercício e conferir
que os pontos correspondem às cargas registradas nas datas respectivas.

### Tests for User Story 6

- [X] T107 [P] [US6] Teste de unidade: a agregação da evolução é calculada sob demanda e nunca lida de campo persistido, em `fit-kings/tests/unidade/domain/evolucao.test.ts` (Princípio V)

### Implementation for User Story 6

- [X] T108 [US6] Implementar a agregação da evolução de cargas em `fit-kings/src/domain/evolucao/agregar.ts` (FR-049)
- [X] T109 [US6] Implementar a visualização da evolução em `fit-kings/src/funcionalidades/progressao/EvolucaoExercicio.tsx` (FR-049)
- [X] T110 [US6] Implementar a navegação de um ponto do período para a sessão correspondente em `fit-kings/src/funcionalidades/progressao/` (US6, cenário 2)
- [X] T111 [US6] Implementar a mensagem de histórico insuficiente em vez de tela vazia em `fit-kings/src/funcionalidades/progressao/` (US6, cenário 3)
- [X] T112 [US6] Aplicar a skill `frontend-design` às telas de US5 e US6

**Checkpoint**: todas as user stories entregues.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T113 ⏳ **APARELHO** — Exige iPhone com o aplicativo instalado pela Tela de Início — não simulável. Ver `docs/validacao.md` § Pendente. — **Verificação de persistência em iPhone real** — instalar pela Tela de Início, registrar dados, reiniciar o aparelho, deixar dias sem uso e confirmar sobrevivência. **Pré-requisito do plano**: o resultado é registrado em [research.md](./research.md) § R1
- [ ] T114 ⏳ **APARELHO** — Exige o service worker instalado no aparelho — não simulável. Ver `docs/validacao.md` § Pendente. — Validar o modo avião de ponta a ponta no aparelho — treino completo, consulta ao histórico e exportação, sem nenhum erro de rede (FR-057, SC-011)
- [X] T115 [P] Auditar área de toque em todas as telas e confirmar que nenhum par de cor fora dos tokens validados foi usado, em `fit-kings/src/` — o contraste é garantido por construção em T021, e esta auditoria verifica a **aderência** aos tokens, não cada combinação (SC-008, SC-009, D9 critério 1)
- [ ] T116 ⏳ **APARELHO** — Exige leitura sob luz forte e brilho reduzido no aparelho. Critérios 1 a 3 de D9 já fechados por ferramenta em `docs/direcao-visual.md`. — [P] Validar a direção visual escolhida contra os 5 critérios de D9 em aparelho real, sob luz forte e com brilho reduzido, registrando o resultado em `fit-kings/docs/direcao-visual.md` (D9 critérios 4 e 5)
- [ ] T117 ⏳ **APARELHO** — A **contagem de toques** já está verificada: 2 no caminho comum, 3 no pior caso, contra um piso de 3. Falta medir o **tempo** no aparelho. — [P] Medir e ajustar o registro de série para 3 toques e menos de 5 s em aparelho real (SC-001)
- [X] T118 [P] Validar layout de smartphone pequeno a tablet, em retrato, sem rolagem horizontal (SC-008)
- [X] T119 [P] Teste de unidade: leitura de arquivo de `formatVersion` anterior, e recusa explícita de `formatVersion` superior ao suportado, em `fit-kings/tests/unidade/domain/backup/compatibilidade.test.ts` (FR-097)
- [X] T120 Executar todos os cenários de [quickstart.md](./quickstart.md) e registrar os resultados
- [X] T121 [P] Escrever o README com instruções de execução, HTTPS local e instalação no iPhone, em `fit-kings/README.md`
- [x] T122 Remover os Sync Impact Reports de `.specify/memory/constitution.md` antes do commit da constituição — feito em 2026-09-19, junto da correção dos achados de `/speckit-analyze`; antecipada da Phase 10 porque o arquivo ainda não havia sido empurrado
- [X] T123 Revisar toda a implementação contra a constituição v1.4.0 — exigido pela seção *Revisão* antes da integração

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende da Phase 1 — **bloqueia todas as user stories**
- **US1 (Phase 3)**: depende da Phase 2
- **US7 (Phase 4)**: depende de US1 — não há o que exportar antes
- **US2 (Phase 5)**: depende da Phase 2; T074 depende de US7
- **US3 (Phase 6)**: depende de US2
- **US4 (Phase 7)**: depende de US2; T095, T096 e T133 dependem de US7
- **US5 (Phase 8)**: depende de US2 e US4
- **US6 (Phase 9)**: depende de US4
- **Polish (Phase 10)**: depende de tudo o que se pretende entregar

### Dependência fora do padrão, explicada

US7 **não** é independente das demais, diferente do que o padrão de user stories pressupõe. O
arquivo de backup é a projeção de todas as entidades, então ele cresce a cada story que adiciona
entidade: T074 acrescenta as sessões, T095 e T096 acrescentam o versionamento. Isso é consequência
direta da natureza do artefato, não falha de decomposição — e o contrato foi escrito para absorvê-la
sem incrementar `formatVersion`.

### Within Each User Story

- Testes escritos **antes** da implementação, e devem falhar primeiro
- Domínio antes de repositório, repositório antes de tela
- Nenhuma tela antes de a regra que ela exibe estar testada

### Parallel Opportunities

- Setup: T003 a T009 em paralelo
- Foundational: T013 e T014 juntas; T021 e T022 juntas; T025 a T027 juntas
- Todos os testes marcados [P] dentro de uma story rodam juntos
- US2 e US4 podem avançar em paralelo por pessoas distintas após US1 e US7

---

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "Teste de unidade de validação de treino em tests/unidade/domain/treino.test.ts"
Task: "Teste de integração de persistência de treino em tests/integracao/treinos.test.ts"
Task: "Teste de integração de exclusão de exercício com histórico em tests/integracao/exercicios.test.ts"

# Implementação paralelizável de US1:
Task: "Regras de domínio de treino em src/domain/treino/"
Task: "Repositório de exercícios em src/dados/repositorios/exercicios.ts"
```

---

## Implementation Strategy

### MVP (Phases 1 a 4)

1. Phase 1: Setup
2. Phase 2: Foundational — **crítica, bloqueia tudo**
3. Phase 3: US1 — montar e manter treinos
4. Phase 4: US7 — backup e restauração
5. **PARAR e VALIDAR**: montar um treino, exportar, limpar os dados do navegador, importar e
   confirmar que tudo volta

Este é o menor incremento que entrega valor **e** protege o que foi entregue. Parar no fim da
Phase 3 deixaria dados sem rede de proteção sobre armazenamento despejável.

### Entrega incremental

1. Phases 1–4 → substitui a anotação em papel, com backup
2. + Phases 5–6 (US2, US3) → **utilizável na academia**, é aqui que o produto passa a ser usado
   de verdade
3. + Phase 7 (US4) → histórico consultável e corrigível
4. + Phase 8 (US5) → o diferencial: aviso de aumento de carga
5. + Phase 9 (US6) → evolução ao longo do tempo
6. + Phase 10 → validação no aparelho e acabamento

### Nota sobre a ordem

A ordem acima **não** é a ordem de prioridade da spec, e a diferença é deliberada: US7 sobe de
último para quarto por causa do risco R1. As demais seguem a prioridade declarada.

---

## Notes

- Tarefas [P] tocam arquivos distintos e não têm dependência pendente
- Nenhum código em `src/domain/` pode importar React ou Dexie — a regra de lint T005 impede
- Nenhuma chamada a `crypto.randomUUID()` fora de `src/plataforma/id.ts` — a regra T006 impede
- Confirmar que cada teste falha antes de implementar
- Commitar por tarefa ou grupo lógico
- Parar em qualquer checkpoint para validar a story de forma independente

### Cobertura da skill `frontend-design`

A constituição exige a skill "na implementação das telas" — todas elas, sem recorte. A cobertura
fechada, tela por tela:

| Fase | Tarefa | Telas |
|---|---|---|
| Phase 2 | coberta por T127 | app shell, aviso de persistência, diagnóstico |
| US1 | T042 | decide a direção visual e aplica às telas de treino |
| US7 | T057 | seleção de arquivo, resumo, relatório, lembrete |
| US2 | T124 | **tela de execução** e demais telas de US2 |
| US3 | T125 | sessão pendente, retomada, falha ao persistir |
| US4 | T126 | histórico, detalhe, histórico por exercício, correção |
| US5, US6 | T112 | aviso de progressão, evolução de cargas |
| Phase 10 | T116 | valida a direção em aparelho real |

T042 é a única que **decide**; as demais aplicam a decisão dela. As telas da Phase 2 nascem antes
dessa decisão — daí T127 existir na Phase 3 e não na Phase 2.
