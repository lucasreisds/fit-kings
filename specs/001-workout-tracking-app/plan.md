# Implementation Plan: Aplicativo de Treinos de Academia

**Branch**: `001-workout-tracking-app` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-workout-tracking-app/spec.md`
**Constituição**: v1.3.0 | **Research**: [research.md](./research.md)

## Summary

Aplicativo para montar, executar e acompanhar treinos de musculação, com histórico permanente,
comparação planejado x realizado e indicação de possibilidade de aumento de carga derivada do
próprio histórico. Nesta versão não há conta, servidor nem sincronização: os dados vivem no
aparelho, e a continuidade entre aparelhos é feita por exportação e importação de arquivo.

**Abordagem técnica**: PWA instalável em TypeScript, React e Vite, com persistência em IndexedDB
via Dexie. A lógica de domínio — critério de progressão, validade de série, versionamento e
mesclagem de backup — é escrita como funções puras, sem React e sem acesso a banco, e testada sem
interface. A interface consome essa camada. Não há etapa de compilação nativa em nenhum ponto da
cadeia.

## Technical Context

**Language/Version**: TypeScript 5.x em modo estrito, ES2022

**Primary Dependencies**: React 19, Vite 6, Dexie 4 (IndexedDB), `vite-plugin-pwa` (Workbox),
Zustand (estado da sessão em andamento)

**Storage**: IndexedDB no dispositivo. Sem servidor, sem banco remoto. Ver
[data-model.md](./data-model.md)

**Testing**: Vitest (domínio e repositórios, com `fake-indexeddb`), Playwright (ponta a ponta)

**Target Platform**: PWA instalável. iPhone via Safari com Adicionar à Tela de Início — alvo
prioritário. Android via Chrome. Tablets suportados sem otimização dedicada. Retrato apenas.

**Project Type**: Aplicação web front-end única, offline-first, sem backend

**Performance Goals**: registro de série em menos de 5 s e no máximo 3 toques (SC-001); listagem de
200 sessões em menos de 2 s; histórico de um exercício em menos de 1 s (SC-010); interface fluida
em 60 fps na tela de execução

**Constraints**: nenhuma dependência de rede após a instalação (FR-057); contraste mínimo 4,5:1 e
alvos de toque mínimos de 44×44 pt (SC-009); armazenamento despejável pelo sistema operacional —
ver R1 em [research.md](./research.md); sem Xcode, simulador, TestFlight, conta de desenvolvedor ou
qualquer build nativo

**Scale/Scope**: um usuário, um aparelho principal. Centenas de sessões acumuladas ao longo de
anos. 7 jornadas de usuário, 110 requisitos funcionais, 32 critérios de sucesso

## Constitution Check

*GATE: avaliado antes da Phase 0 e reavaliado após a Phase 1.*

| Princípio | Pré-Phase 0 | Pós-Phase 1 | Como o plano atende |
|---|---|---|---|
| **I. Integridade do Registro** | ⚠️ | ✅ com risco | Cada série confirmada grava em transação IndexedDB própria, e o retorno visual de sucesso só ocorre após o commit (D4). Sessão em andamento vive no banco, não em memória (D5). Correção gera versão nova sem destruir a anterior (D8). **Risco R1 registrado**: o armazenamento é despejável pelo sistema operacional — condição da plataforma, não do caminho de escrita. |
| **II. A Academia é o Ambiente de Projeto** | ✅ | ✅ | Direção visual em aberto, delimitada pelas cinco restrições de estilo da constituição v1.4.0: tela de execução sem transparência nem blur, fundos de texto estáveis, campos de registro no topo da hierarquia visual (D9). Herança de carga entre séries conforme FR-085 e FR-119. Sinalização de estado degradado informa sem bloquear. |
| **III. Autonomia Local** | ❌ | ✅ **resolvido** | Após instalada, a PWA não depende de rede em nenhuma tela. A violação era literal — o princípio alcançava o próprio ato de instalar — e foi resolvida pela emenda v1.3.0, que distingue execução de instalação, com a mesma precisão aplicada a FR-057. |
| **IV. Modelo de Dados Aditivo** | ✅ | ✅ | `crypto.randomUUID()` em toda entidade, por **caminho único** e sem fallback, com guarda de contexto seguro na inicialização (D11, FR-124); `criadoEm`/`alteradoEm` em UTC com deslocamento local; `excluidoEm` em vez de remoção física; migrações Dexie exclusivamente aditivas; `formatVersion` no backup com política de compatibilidade explícita (D7, D8, [contracts/backup-file.md](./contracts/backup-file.md)). |
| **V. Domínio Determinístico e Verificável** | ✅ | ✅ | Camada `src/domain/` em TypeScript puro, sem React, sem Dexie, sem DOM. Indicação de progressão nunca persistida — sempre consultada. Único cache admitido é `sessaoVersoes.vigente`, descartável, reconstruível e não-autoridade, conforme a ressalva do próprio princípio. |
| **Restrições de Produto e Plataforma** | ✅ | ✅ | Retrato fixado no manifesto; operável por toque; contraste garantido por construção via tokens de tema, e não verificado caso a caso; skill `frontend-design` obrigatória na implementação das telas. **A direção visual é decisão aberta** — ver D9. |
| **Fluxo e Portões de Qualidade** | ⚠️ | ✅ **resolvido** | Os quatro portões estão especificados em [quickstart.md](./quickstart.md). A lacuna de rastreabilidade foi fechada: o comportamento de persistência virou FR-120 a FR-123 e SC-033, e o caminho único de identificador virou FR-124 e SC-034. |

**Resultado do gate**: **passa sem violações abertas.** As duas violações registradas na primeira
avaliação foram resolvidas — a primeira pela emenda constitucional v1.3.0, a segunda pela inclusão
de FR-120 a FR-124 na especificação. Permanece o risco R1, que é condição de plataforma e não
violação de princípio.

## Project Structure

### Documentation (this feature)

```text
specs/001-workout-tracking-app/
├── plan.md                    # Este arquivo
├── spec.md                    # Especificação
├── research.md                # Phase 0
├── data-model.md              # Phase 1
├── quickstart.md              # Phase 1
├── contracts/
│   └── backup-file.md         # Phase 1 — único contrato externo
├── checklists/
│   └── requirements.md
└── tasks.md                   # Phase 2 — criado por /speckit-tasks
```

### Source Code (repository root)

```text
fit-kings/
├── public/
│   ├── manifest.webmanifest        # display standalone, orientation portrait
│   └── icons/
├── src/
│   ├── domain/                     # TypeScript puro: sem React, sem Dexie, sem DOM
│   │   ├── progressao/             # FR-043, FR-044, FR-078..081, FR-092..094
│   │   ├── serie/                  # série válida, comparação planejado x realizado
│   │   ├── sessao/                 # transições de estado, versionamento
│   │   ├── backup/                 # validação e mesclagem do arquivo (funções puras)
│   │   └── tipos/
│   ├── dados/                      # Dexie
│   │   ├── db.ts
│   │   ├── migracoes/
│   │   └── repositorios/
│   ├── funcionalidades/
│   │   ├── treinos/                # US1
│   │   ├── execucao/               # US2, US3
│   │   ├── historico/              # US4, correção de sessão
│   │   ├── progressao/             # US5, US6
│   │   └── backup/                 # US7
│   ├── ui/                         # componentes e tokens de tema (contraste por construção)
│   ├── plataforma/                 # storage.persist, folha de compartilhamento, service worker
│   └── app/
├── tests/
│   ├── unidade/                    # Vitest — domínio
│   ├── integracao/                 # Vitest + fake-indexeddb — repositórios
│   └── e2e/                        # Playwright — portões 1 a 3
├── index.html
├── vite.config.ts
└── package.json
```

**Structure Decision**: projeto único de front-end. **Não há diretório de backend, e isso é
deliberado** — o Princípio III proíbe qualquer componente que dependa de servidor. A separação que
carrega peso arquitetural aqui não é cliente/servidor, e sim `domain/` contra todo o resto:
`domain/` não importa React nem Dexie, o que torna a exigência de testabilidade sem interface do
Princípio V verificável por uma regra de lint, e não por disciplina.

## Complexity Tracking

**Nenhuma violação aberta.** As duas registradas na primeira avaliação do gate foram resolvidas
antes de `/speckit-tasks`, e ficam aqui como histórico da decisão.

| Violação (resolvida) | Por que existia | Como foi resolvida |
|---|---|---|
| **1. Princípio III — a instalação da PWA exige rede uma vez** | Instalar uma PWA *é* buscá-la pela rede, e o princípio proibia exigir conexão "em nenhum momento". A PWA foi escolhida pelo proprietário para eliminar a dependência de macOS, que de outro modo impediria entregar no iPhone — a plataforma prioritária da spec. Aplicativo nativo satisfaria o princípio ao pé da letra, ao custo de macOS, conta de desenvolvedor paga e processo de loja, desproporcional para um produto de usuário único. | **Emenda constitucional v1.3.0**: o Princípio III passa a distinguir execução de instalação. Nenhuma execução exige rede, inclusive a primeira após a instalação; a obtenção inicial pode exigir rede uma única vez. FR-057 recebeu a mesma precisão. |
| **2. Rastreabilidade — comportamento de persistência sem requisito** | O proprietário determinou verificação e solicitação de persistência do armazenamento, recusa de operar como se ele fosse confiável sem confirmação, e estado degradado com lembrete de backup mais frequente. É comportamento visível ao usuário, não código de infraestrutura, logo não coberto pela ressalva de rastreabilidade da v1.1.0. | **FR-120 a FR-123 e SC-033** acrescentados à especificação. Na mesma revisão, o caminho único de geração de identificador virou **FR-124 e SC-034**, e regra do Princípio IV na v1.3.0. |

### Risco aceito, sem violação formal

**R1 — despejo de armazenamento.** IndexedDB pode ser limpo sob pressão de disco, e no iOS apagar
o ícone da Tela de Início apaga os dados. Nenhum aplicativo nativo tem esses vetores. O caminho de
escrita continua atendendo ao Princípio I — o commit é durável no instante da confirmação e
sobrevive a recarga, fechamento e reinício —, mas a *garantia de longo prazo* é mais fraca que a de
um app nativo.

Por isso o plano faz duas coisas que a ordem de prioridade da spec não previa: **antecipa a
exportação de backup (US7) para a primeira fatia entregue**, e exige verificação de persistência em
iPhone real antes de a implementação avançar sobre a camada de dados.
