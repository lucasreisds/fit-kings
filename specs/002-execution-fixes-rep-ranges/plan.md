# Implementation Plan: Ajustes da execução e intervalo de repetições

**Branch**: `task/execution-fixes-rep-ranges` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Constituição**: v1.4.0 | **Feature anterior**: [001-workout-tracking-app](../001-workout-tracking-app/plan.md)

## Summary

Cinco ajustes vindos do primeiro uso real, mais o descanso planejado. Três deles corrigem defeitos
que só aparecem com o aparelho na mão; dois acrescentam o que a especificação original não capturou.

**A restrição que governa o plano inteiro**: já existe histórico registrado no aparelho do usuário,
publicado e em uso. Nenhuma alteração pode invalidar treino, sessão ou arquivo de backup já
existente. Isso empurra todas as decisões de modelo para a forma aditiva — que é o que o Princípio
IV já exigia, e que aqui deixa de ser precaução e vira necessidade concreta.

## Technical Context

Nada muda na pilha: TypeScript 5 estrito, React 19, Vite 8, Dexie 4, Vitest, Playwright. Sem
dependência nova — inclusive o gesto de arrastar, que é implementado com eventos de ponteiro em vez
de biblioteca (D3).

**Esquema**: migração Dexie da versão 1 para a 2, estritamente aditiva.

**Contrato de backup**: dois campos opcionais novos. Pela política de compatibilidade,
**`formatVersion` permanece 1** — acrescentar campo opcional não incrementa a versão, e leitores
antigos ignoram o que não conhecem.

## Constitution Check

_GATE: avaliado antes da Phase 0 e reavaliado após a Phase 1._

| Princípio                                  | Pré | Pós | Como o plano atende                                                                                                                                                                                                                                                         |
| ------------------------------------------ | --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Integridade do Registro**             | ⚠️  | ✅  | Correção e remoção de série alcançam **apenas a sessão em andamento**, que ainda não é registro histórico. A sessão concluída continua imutável: FR-113 intacto, e o versionamento de FR-114 segue valendo só para ela. A remoção é lógica, nunca física (D2).              |
| **II. A Academia é o Ambiente de Projeto** | ✅  | ✅  | É o princípio que motiva a feature. A navegação deixa de depender de acerto de toque (D4), o gesto de arrastar é o caminho rápido, e a correção no ato evita que um toque errado envenene o histórico. Nada novo interrompe: o descanso é exibido, nunca cronometrado (D6). |
| **III. Autonomia Local**                   | ✅  | ✅  | Nenhuma dependência nova, nenhuma chamada de rede. O gesto é implementado com API do próprio navegador.                                                                                                                                                                     |
| **IV. Modelo de Dados Aditivo**            | ⚠️  | ✅  | Dois campos opcionais novos, nenhum removido, nenhum ressignificado. `repeticoes` mantém o significado que sempre teve — o mínimo do intervalo — e o valor único vira o caso de pontas coincidentes (D1). Migração v1→v2 aditiva, verificada pela guarda que já existe.     |
| **V. Domínio Determinístico**              | ⚠️  | ✅  | O intervalo entra como **generalização da regra existente**, não como segundo caminho: uma única função de comparação, com o valor único como caso particular (D1). A evolução por repetições é derivação, não campo (D5).                                                  |
| **Restrições de Produto**                  | ⚠️  | ✅  | O descanso exibido não é o cronômetro vedado pela constituição — FR-151 fixa a fronteira, e D6 registra por que a distinção não é retórica.                                                                                                                                 |
| **Portões de Qualidade**                   | ✅  | ✅  | Os quatro portões continuam valendo e ganham casos novos. O portão 4 ganha os casos de intervalo.                                                                                                                                                                           |

**Resultado**: **passa sem violações abertas.** Três pontos exigiram atenção e estão resolvidos por
decisão explícita: o alcance da correção (D2), a forma do intervalo (D1) e a fronteira do descanso
(D6).

## Decisões

### D1 — Intervalo de repetições: `repeticoes` vira o mínimo

**Decisão**: `seriesPlanejadas` ganha **um** campo: `repeticoesMax: number | null`. O campo
`repeticoes` que já existe passa a ser lido como o **mínimo** do intervalo. `repeticoesMax` nulo
significa intervalo de ponta única — exatamente o comportamento de hoje.

**Rationale**: é a única forma que satisfaz FR-140, FR-144 e o Princípio IV ao mesmo tempo.

- Nenhuma linha existente precisa ser reescrita: `repeticoes: 8` com `repeticoesMax: null` continua
  significando "8 repetições", e a avaliação sobre ela não muda (SC-040).
- Não existe um segundo caminho de comparação. A regra passa a ser sempre
  `realizado > max`, onde `max = repeticoesMax ?? repeticoes`. Para valor único, `max` é o próprio
  valor, e a regra se reduz à que já existia.

**Alternativas descartadas**:

- **Dois campos novos, `repeticoesMin` e `repeticoesMax`, deixando `repeticoes` obsoleto.**
  Ressignificaria dado existente por omissão e criaria três estados a interpretar. O Princípio IV
  proíbe alterar significado de coluna existente — e aqui o significado não muda: 8 sempre foi o
  alvo mínimo aceitável.
- **Campo de texto "6-8" interpretado na leitura.** Joga a regra para a camada de apresentação e
  quebra a testabilidade sem interface.

### D2 — Correção durante a sessão: escrita direta, sem versionar

**Decisão**: corrigir ou remover série de sessão **em andamento** escreve direto em
`seriesRealizadas`, sem criar versão. Remover é exclusão lógica, como toda remoção no projeto.

**Rationale**: FR-114 versiona a correção de sessão **concluída** porque ela é registro histórico —
alterá-la sem rastro violaria o Princípio I. Uma sessão em andamento não é isso: é o rascunho que o
usuário está escrevendo agora, e cada série já é gravada de forma durável no ato. Versionar cada
toque numa sessão em andamento produziria dezenas de versões descartáveis e nenhuma garantia nova.

A fronteira é o estado, e está escrita em FR-136.

**Consequência**: ao remover uma série, as restantes são renumeradas e **re-vinculadas à meta
correspondente à nova posição**. Se o usuário fez três séries e apaga a segunda, sobram duas — e
elas cumprem a primeira e a segunda meta. É o que mantém `estadoExercicioSessao()` coerente sem
caso especial.

### D3 — Gesto de arrastar sem biblioteca

**Decisão**: eventos de ponteiro (`pointerdown`/`pointermove`/`pointerup`), num gancho próprio.
Limiar de 60 px horizontais, com a condição de o movimento horizontal superar o vertical.

**Rationale**: o Princípio III desaconselha dependência sem valor correspondente, e o gesto aqui é
simples. Uma biblioteca de gestos custaria dezenas de quilobytes precachados para resolver o que
cabe em poucas dezenas de linhas.

**FR-130 é a parte difícil**: o gesto não pode disparar sobre campo de entrada nem sobre área com
rolagem horizontal própria. A verificação é feita na origem do toque, subindo a árvore em busca de
`input`, `textarea`, `[role="tab"]` ou elemento com rolagem horizontal — e desistindo se achar.

### D4 — Navegação de exercícios: alcance garantido, não descoberto

**Decisão**: a faixa de cartões deixa de ser o único caminho. A tela ganha um **controle de
paginação explícito** — anterior, posição, próximo — sempre visível, e a faixa continua para salto
direto.

**Rationale**: o defeito reportado não é de rolagem, é de **affordance**. Os cartões funcionam e
ninguém percebe que são tocáveis; o terceiro aparece cortado e nada indica que há mais. Com
paginação explícita, o alcance de qualquer exercício deixa de depender de o usuário descobrir que a
faixa rola — que é o que SC-036 exige.

O desenho concreto é decidido na implementação, com a skill `frontend-design`, sob as mesmas
restrições de D9 da feature 001.

### D5 — Evolução sem carga: modo derivado, não campo

**Decisão**: `agregarEvolucao` deixa de descartar série sem carga e passa a devolver, junto dos
pontos, o **modo** da série histórica: `carga` ou `repeticoes`. O modo é `repeticoes` quando
nenhuma execução do exercício registrou carga.

**Rationale**: o defeito é que a agregação aplicava critério mais estrito que a definição de série
válida de FR-092 — uma série com repetições e sem carga **é** válida. Corrigir o filtro resolve
FR-145; devolver o modo resolve FR-146 sem persistir nada, como o Princípio V exige.

Carga não informada e carga zero são equivalentes para esse fim (FR-147): as duas significam
"sem carga externa".

### D6 — Descanso: valor exibido, e a fronteira do cronômetro

**Decisão**: `itensTreino` ganha `descansoSegundos: number | null`. É exibido na tela de execução e
em nenhum outro lugar. Não é copiado para a sessão.

**Rationale da não-cópia**: FR-017 exige que a sessão preserve os valores planejados **que servem de
base de comparação** — é disso que o portão 2 trata. O descanso não entra em comparação nenhuma, não
aparece no histórico e só faz sentido durante a execução, onde "agora" é o valor certo. Copiá-lo
seria carregar estado sem finalidade.

**A fronteira constitucional, explicitada**: a constituição veda o _cronômetro de descanso_. O que
entra aqui é um valor estático, da mesma natureza de repetições, carga e RIR — todos planejados e
exibidos. FR-151 proíbe por escrito contagem, aviso e interrupção.

A nota existe porque o próximo passo parecerá natural: com o campo lá, "só acrescentar o timer"
soará inofensivo. **Não é** — seria ampliação de escopo vedada, e exige emenda.

## Project Structure

Sem diretório novo. Os arquivos tocados:

```text
src/
├── domain/
│   ├── serie/
│   │   ├── validade.ts        ← comparação passa a usar intervalo
│   │   └── intervalo.ts       ← NOVO: a regra única de D1
│   ├── progressao/avaliar.ts  ← critério passa a usar o máximo do intervalo
│   ├── evolucao/agregar.ts    ← para de descartar série sem carga; devolve o modo
│   ├── sessao/
│   │   └── rascunho.ts        ← NOVO: regras de correção e remoção em sessão aberta
│   ├── tipos/treino.ts        ← repeticoesMax, descansoSegundos
│   └── treino/validar.ts      ← validação do intervalo (FR-143)
├── dados/
│   ├── migracoes/index.ts     ← esquema v2, aditivo
│   └── repositorios/
│       ├── treinos.ts         ← persistência dos campos novos
│       └── sessoes.ts         ← corrigir e remover série em sessão aberta
├── funcionalidades/
│   ├── execucao/
│   │   ├── TelaExecucao.tsx   ← paginação, estado de exercício completo
│   │   ├── NavegacaoExercicios.tsx  ← NOVO (D4)
│   │   ├── EditorSerieRegistrada.tsx ← NOVO (FR-133, FR-134)
│   │   └── useGestoLateral.ts ← NOVO (D3)
│   ├── treinos/EditorSeries.tsx ← entrada de intervalo e descanso
│   └── progressao/            ← evolução em repetições
└── ui/
```

## Complexity Tracking

**Nenhuma violação aberta.** Os três pontos que exigiram decisão estão em D1, D2 e D6, e cada um
resolve a tensão em vez de pedir dispensa.

### Risco: regressão silenciosa na avaliação de progressão

O critério de aumento de carga é o diferencial do produto e a regra mais protegida do projeto. Esta
feature mexe nele.

**Mitigação**: SC-040 exige que 100% dos planejamentos de valor único produzam a mesma avaliação de
antes. Na prática, os dez casos de fronteira do portão 4 rodam **inalterados**, e os casos de
intervalo entram como acréscimo. Se um único caso antigo mudar de resultado, o portão 4 quebra — que
é exatamente o alarme que se quer.
