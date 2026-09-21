# Validação — resultados

**Data**: 2026-09-20 | **Tarefa**: T120 (cenários de [quickstart.md](../specs/001-workout-tracking-app/quickstart.md))

Execução: `npm run test` (457 testes, 27 arquivos) e `npm run test:e2e` (21 testes). Todos passam.

> **Motor dos testes de ponta a ponta**: Chromium com as características do iPhone 13 em retrato.
> O alvo prioritário do produto é o Safari, e a verificação nele é manual, no aparelho — T113, T114,
> T116 e T117. O que esta suíte protege é a **regra**: gravação durável, imutabilidade do histórico
> e idempotência da importação não dependem de motor de renderização.

---

## Portões constitucionais

### Portão 1 — Recuperação após encerramento inesperado ✅

`tests/e2e/retomada.spec.ts` — cobre FR-033, FR-034, SC-003.

| Passo do quickstart | Resultado |
|---|---|
| Iniciar treino e confirmar séries | ✅ |
| Recarregar a página à força no meio da sessão | ✅ |
| As séries voltam íntegras | ✅ 3 de 3, com carga, repetições e comparação |
| A sessão continua `em_andamento` | ✅ |
| O aplicativo oferece retomá-la no ponto em que parou | ✅ cai no exercício e na série seguintes |

Verificado também: navegar para outras telas e voltar não perde valor preenchido (FR-030, SC-002),
e duas sessões simultâneas são impedidas (FR-028).

### Portão 2 — Imutabilidade do histórico ✅

`tests/e2e/imutabilidade.spec.ts` — cobre FR-017, FR-040, SC-013.

| Passo do quickstart | Resultado |
|---|---|
| Concluir uma sessão | ✅ |
| Editar o treino de origem — trocar cargas e metas | ✅ o treino muda |
| Excluir o treino de origem | ✅ some da lista |
| A sessão permanece como foi registrada, com os valores planejados daquele dia | ✅ |

**O mecanismo**: `seriesPlanejadas` é aditiva e a exclusão é lógica. Uma série planejada **já
executada** nunca é alterada no lugar — editá-la cria uma sucessora e marca a anterior. O plano da
sessão é então reconstruído por consulta temporal em `iniciadaEm`, em vez de duplicado linha a
linha. Ver `repositorioTreinos.seriesPlanejadasEm`.

Verificado também: a correção cria versão nova sem mudar a data nem a posição cronológica
(FR-114, FR-115).

### Portão 3 — Importação idempotente e recusa de arquivo inválido ✅

`tests/e2e/backup.spec.ts` — cobre FR-102, FR-104, FR-106, SC-017, SC-018.

| Passo do quickstart | Resultado |
|---|---|
| Exportar o backup | ✅ |
| Importar o mesmo arquivo: nenhum registro duplicado | ✅ |
| Importar de novo: operação nula, tudo ignorado | ✅ |
| Arquivo truncado | ✅ recusado — "não é um JSON válido… truncado" |
| JSON de outro aplicativo | ✅ recusado — "não declara a versão do formato" |
| `formatVersion` maior que o suportado | ✅ recusado — "gerado por uma versão mais nova" |
| Nenhum dado existente alterado em qualquer recusa | ✅ |

### Portão 4 — Determinismo do critério de aumento de carga ✅

`tests/unidade/domain/progressao.test.ts`, em Vitest, sem interface.

Os dez casos de fronteira do quickstart, na mesma ordem:

| # | Cenário | Esperado | Resultado |
|---|---|---|---|
| 1 | Planejado 3×8, realizado 9/9/9 | Indica | ✅ |
| 2 | Planejado 3×8, realizado 8/8/8 | Não indica (FR-081) | ✅ |
| 3 | Planejado 3×8, realizado 10/8/6 | Não indica | ✅ |
| 4 | Uma série planejada sem registro | Não indica (FR-078) | ✅ |
| 5 | Série extra além das planejadas | Ignorada (FR-079) | ✅ |
| 6 | RIR não informado em nenhuma série | Só repetições (FR-044) | ✅ |
| 7 | RIR realizado abaixo do planejado | Não indica | ✅ |
| 8 | Exercício sem execução anterior | Não indica (FR-048) | ✅ |
| 9 | Exercício planejado totalmente pulado | Indicação anterior permanece (FR-093) | ✅ |
| 10 | Exercício adicionado fora do plano | Não indica naquela sessão (FR-089) | ✅ |

---

## Cenários de identidade do exercício

### Renomeação preserva o histórico (SC-019) ✅

`tests/integracao/identidadeExercicio.test.ts`, rodado para exercício de catálogo **e**
personalizado (FR-077 os trata como equivalentes).

Com três sessões concluídas, renomear o exercício preserva: o vínculo pelo mesmo `id`, a consulta de
FR-039, os pontos da evolução valor a valor, e a avaliação de progressão inalterada.

### Ciclo de exportação e importação (SC-026, FR-105) ✅

`tests/e2e/identidadeExercicio.spec.ts`.

Exportar, limpar o armazenamento do navegador, importar: 100% das execuções continuam vinculadas aos
mesmos exercícios, e a consulta de evolução produz resultado idêntico ao de antes, valor a valor.
Um exercício renomeado **depois** da exportação continua sendo o mesmo registro — o vínculo é pelo
`id`, nunca pelo nome.

---

## Lembrete de backup ✅

`tests/unidade/funcionalidades/lembreteBackup.test.ts`, com relógio controlado.

| Situação | Esperado | Resultado |
|---|---|---|
| 6 dias, persistência concedida | Não apresenta | ✅ |
| 8 dias, persistência concedida | Apresenta | ✅ |
| 1 dia, persistência **não** concedida | Não apresenta | ✅ |
| 3 dias, persistência **não** concedida | Apresenta | ✅ |
| Nunca exportou | Conta do primeiro registro do usuário | ✅ |
| Exportação **falhou** | Âncora não se move | ✅ |
| Lembrete já exibido | Âncora não se move | ✅ |
| Vence durante sessão `em_andamento` | Não apresenta | ✅ |
| A sessão é concluída ou descartada | Apresenta no encerramento | ✅ |

---

## Layout e acessibilidade

`tests/e2e/layout.spec.ts` e `tests/unidade/ui/`.

| Verificação | Larguras | Resultado |
|---|---|---|
| Sem rolagem horizontal em nenhuma tela (SC-008) | 320, 390, 834 px | ✅ |
| Numerais da execução inteiros, sem corte | 320, 390, 834 px | ✅ |
| Todo alvo interativo com no mínimo 44 pt (SC-009) | 320, 390, 834 px | ✅ |
| Todo par de cor com no mínimo 4,5:1 (D9 critério 1) | — | ✅ 16 pares |
| Contorno de controle com no mínimo 3:1 | — | ✅ |
| Nenhuma cor literal fora dos tokens | todo `src/` | ✅ |
| Execução sem transparência, blur ou sombra (D9 critério 2) | — | ✅ verificado por ferramenta |

**Achados corrigidos durante a auditoria**, ambos violações reais:

1. A cor de estado pressionado do botão primário estava escrita à mão na folha, fora do sistema de
   tokens. Virou o token `acentoPressionado`, com par validado.
2. A ação "Ver diagnóstico" era um link no meio de uma frase, com 22 px de altura — metade do piso
   de SC-009. As ações de faixa passaram a ficar **abaixo** do texto, com 44 pt.

---

## Pendente: validação em aparelho real

Quatro verificações não são automatizáveis e **exigem um iPhone**, instalado pela Tela de Início.
Elas permanecem abertas.

| Tarefa | O que verificar | Por que só no aparelho |
|---|---|---|
| **T113** | Persistência do armazenamento: registrar dados, reiniciar o aparelho, deixar dias sem uso | É o risco R1 inteiro. O iOS é a plataforma mais restritiva, e nenhum emulador reproduz sua política de despejo |
| **T114** | Modo avião de ponta a ponta: treino completo, histórico e exportação sem erro de rede (FR-057, SC-011) | Exige o service worker instalado de verdade, pelo ícone da tela inicial |
| **T116** | Direção visual sob luz forte e com brilho reduzido (D9 critérios 4 e 5) | É uma condição física de leitura. Nenhum teste a simula |
| **T117** | Registro de série em 3 toques e menos de 5 s (SC-001) | O tempo real inclui o teclado do sistema e a resposta ao toque |

Sobre T117, o que já se pode afirmar do código: no caminho comum — carga herdada da série anterior —
registrar uma série custa **2 toques** (aplicar as repetições num dos dois atalhos, confirmar), e
**3** quando as repetições não são nem a meta nem a meta mais uma. O piso da constituição é 3. O que
falta medir é o tempo, não a contagem.
