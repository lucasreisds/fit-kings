# Quickstart — Validação do Aplicativo de Treinos

**Feature**: `001-workout-tracking-app` | **Date**: 2026-09-19

Guia de execução e validação. Não contém implementação — ela pertence a `tasks.md` e à fase de
implementação.

---

## Pré-requisitos

| Item | Versão | Observação |
|---|---|---|
| Node.js | 24 LTS (Krypton) | Instalado no WSL via nvm: `nvm install --lts` |
| npm | acompanha o Node | — |
| Projeto | — | `/home/lucas/codes/fit-kings` (ext4 nativo, nunca `/mnt/c`) |
| iPhone | iOS recente | Para validação no alvo prioritário, no Safari |

Nada de Xcode, simulador, TestFlight ou conta de desenvolvedor. Não há etapa de compilação nativa.

---

## Execução local

```bash
cd ~/codes/fit-kings
npm install
npm run dev
```

Abre em `http://localhost:5173`. `localhost` é contexto seguro, então service worker e
`crypto.randomUUID()` funcionam sem HTTPS.

---

## Validação no iPhone — o detalhe que trava

**`vite --host` expõe a aplicação na rede local por HTTP, e HTTP em IP de rede não é contexto
seguro.** Sem contexto seguro, no iPhone:

- o service worker não registra — logo, não há instalação nem funcionamento offline;
- `crypto.randomUUID()` fica indisponível — logo, não há criação de registro.

O aplicativo simplesmente não roda — **e isso é deliberado**. Não há fallback de geração de
identificador (D11, FR-124): o aplicativo verifica o contexto seguro na inicialização e recusa-se a
operar com mensagem explícita, em vez de gerar registros por um caminho alternativo. Se você vir
essa recusa, a causa é o HTTP, não um defeito.

Dois caminhos:

**HTTPS local com certificado próprio** — sem dependência externa, mas exige confiar no
certificado no iPhone uma vez:

```bash
npm run dev:https      # vite com mkcert
```

**Túnel HTTPS** — mais simples de começar, exige rede:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Com a URL HTTPS aberta no Safari: **Compartilhar → Adicionar à Tela de Início**. A validação real
acontece pelo ícone da tela inicial, não pela aba do Safari — são contextos de armazenamento
distintos, e só o primeiro representa o produto.

---

## Testes

```bash
npm run test          # Vitest — domínio e repositórios
npm run test:e2e      # Playwright — portões constitucionais
npm run test:watch
```

---

## Cenários de validação obrigatórios

Os quatro portões de teste da constituição v1.2.0. Nenhuma entrega é concluída sem eles passando.

### Portão 1 — Recuperação após encerramento inesperado

1. Iniciar um treino e confirmar 4 séries.
2. Recarregar a página à força no meio da sessão (equivale ao encerramento abrupto numa PWA).
3. **Esperado**: as 4 séries voltam íntegras, a sessão continua `em_andamento`, e o aplicativo
   oferece retomá-la no ponto em que parou.

Cobre FR-033, FR-034, SC-003.

### Portão 2 — Imutabilidade do histórico

1. Concluir uma sessão.
2. Editar o treino de origem — trocar cargas, remover um exercício.
3. Excluir o treino de origem.
4. **Esperado**: a sessão no histórico permanece byte a byte como foi registrada, com os valores
   planejados daquele dia.

Cobre FR-017, FR-040, SC-013.

### Portão 3 — Importação idempotente e recusa de arquivo inválido

1. Exportar o backup.
2. Importar o mesmo arquivo. **Esperado**: nenhum registro duplicado, nenhuma sessão alterada.
3. Importar de novo. **Esperado**: operação nula, relatório indicando tudo ignorado.
4. Importar um arquivo truncado, um JSON de outro aplicativo e um com `formatVersion` maior que o
   suportado. **Esperado**: recusa com mensagem específica em cada caso, e **nenhum** dado existente
   alterado.

Cobre FR-102, FR-104, FR-106, SC-017, SC-018.

### Portão 4 — Determinismo do critério de aumento de carga

Executado em Vitest, sem interface. Casos de fronteira obrigatórios:

| Cenário | Esperado |
|---|---|
| Planejado 3×8, realizado 9/9/9 | Indica aumento |
| Planejado 3×8, realizado 8/8/8 | Não indica (FR-081) |
| Planejado 3×8, realizado 10/8/6 | Não indica — nem todas superaram |
| Uma série planejada sem registro | Não indica (FR-078) |
| Série extra além das planejadas | Ignorada na avaliação (FR-079) |
| RIR não informado em nenhuma série | Aplica só o critério de repetições (FR-044) |
| RIR realizado abaixo do planejado | Não indica |
| Exercício sem execução anterior | Não indica (FR-048) |
| Exercício planejado totalmente pulado | Indicação anterior permanece (FR-093) |
| Exercício adicionado fora do plano | Não indica naquela sessão (FR-089) |

Cobre FR-043, FR-044, FR-078 a FR-081, FR-092 a FR-094, SC-006, SC-007, SC-021.

---

## Validações manuais no aparelho

Não automatizáveis. Feitas no iPhone, pelo ícone da tela inicial.

**Persistência do armazenamento** — antes de confiar em qualquer coisa:

1. Verificar o estado reportado de `navigator.storage.persisted()` na tela de diagnóstico.
2. Registrar dados, reiniciar o aparelho, reabrir. **Esperado**: tudo presente.
3. Deixar sem uso por vários dias e reabrir. **Esperado**: tudo presente.
4. **Se a persistência não for concedida**: o aplicativo precisa estar sinalizando o estado
   degradado e aumentando a frequência do lembrete de backup.

**Modo avião** — cobre FR-057, SC-011: com o aplicativo já instalado, ativar o modo avião e
executar um treino completo do início ao fim, consultar o histórico e exportar o backup. Nada pode
falhar nem exibir erro de rede.

**Toque e contraste** — cobre SC-009: alvos de no mínimo 44×44 pontos e contraste de texto de no
mínimo 4,5:1. O contraste é garantido por construção pelos tokens de tema, então a verificação no
aparelho é de **aderência aos tokens**, não de medição caso a caso.

**Direção visual** — cobre os critérios de D9: a tela de execução não usa transparência nem blur;
carga, repetições e RIR são os elementos de maior hierarquia; a interface permanece legível sob luz
forte e com o brilho reduzido; nenhum efeito compromete a rolagem ou a meta de 5 s por série.

**Registro de série** — cobre SC-001: 3 toques e menos de 5 segundos, sem sair da tela de execução.

---

## Ordem de entrega recomendada

Diferente da ordem de prioridade da spec, por causa do risco R1 em [research.md](./research.md).

1. **Fundação** — esquema, repositórios, guarda de contexto seguro, verificação de persistência.
2. **Montar e manter treinos (US1)** — primeiro dado que o usuário não quer perder.
3. **Exportação e importação (US7)** — **antecipada de P7 para cá**. Sobre armazenamento
   despejável, o backup é a única rede de proteção existente e não pode ser a última coisa
   construída. Não pode vir antes de US1 porque não haveria o que exportar.
4. **Executar o treino (US2)** + **retomada (US3)** — indissociáveis na prática. Acrescentam as
   sessões ao arquivo de backup, o que não incrementa `formatVersion`.
5. **Histórico (US4)** + correção de sessão concluída
6. **Aviso de progressão (US5)**
7. **Evolução de cargas (US6)**

Detalhamento por tarefa em [tasks.md](./tasks.md).
