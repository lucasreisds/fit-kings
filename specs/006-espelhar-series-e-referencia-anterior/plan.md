# Implementation Plan: Séries que acompanham a primeira e referência da última vez no mesmo treino

**Branch**: `task/espelhar-series-e-referencia-anterior` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-espelhar-series-e-referencia-anterior/spec.md`

## Summary

Duas alterações independentes, nenhuma com mudança de esquema.

1. **Espelhamento no editor de séries planejadas** (FR-187 a FR-193). A edição de um campo da
   série 1 passa por uma função pura de domínio que aplica o mesmo valor às séries seguintes que
   estavam idênticas à série 1 antes da edição. A função roda dentro do `transformar` que o editor
   já entrega ao repositório e que já é aplicado sobre o gravado, dentro de uma transação — o que
   dá atomicidade (FR-191) sem caminho de gravação novo.
2. **Referência por série na execução** (FR-194 a FR-202). Uma consulta nova devolve a execução
   anterior do exercício **restrita às sessões do mesmo treino**, e uma função pura de domínio a
   converte em referência por número de série. A tela de execução exibe a referência na linha de
   identificação da série corrente e em cada série já registrada.

## Technical Context

**Language/Version**: TypeScript 5 (estrito), Node ≥ 24 para ferramental
**Primary Dependencies**: React 19, Dexie 4 + dexie-react-hooks, Zustand 5, Vite (PWA)
**Storage**: IndexedDB via Dexie — sem alteração de esquema nem migração
**Testing**: Vitest + Testing Library (unidade, integração com `fake-indexeddb`), Playwright (e2e)
**Target Platform**: PWA instalável, iPhone prioritário, Android, retrato, offline
**Project Type**: Aplicação web única (SPA/PWA), sem backend
**Performance Goals**: registrar série em ≤ 3 toques e < 5 s (SC-067); digitação no editor sem
atraso perceptível
**Constraints**: offline integral; nada pré-preenchido entre sessões; contraste ≥ 4,5:1; toque
≥ 44 × 44; sem transparência na tela de execução
**Scale/Scope**: um usuário; histórico de anos (centenas de sessões por exercício no pior caso)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Situação |
|-----------|-------------|----------|
| I. Integridade do Registro | Espelhamento altera apenas séries **planejadas**, pelo mesmo `transformarSeries` que já versiona a linha quando o item tem execução. Sessões em andamento e concluídas não são tocadas (FR-193). A referência é só leitura. | ✅ |
| II. Academia | Referência exibida, nunca aplicada ao campo (FR-198). Não acrescenta toque ao registro (SC-067). Texto secundário com contraste ≥ 4,5:1 por token, sem reduzir área de toque (FR-199). Nada bloqueia. | ✅ |
| III. Autonomia Local | Tudo local, IndexedDB. | ✅ |
| IV. Modelo Aditivo | Nenhum campo novo, nenhuma migração. "Acompanhar" é derivado por igualdade, não gravado (FR-190). | ✅ |
| V. Domínio Determinístico | Duas funções puras novas (`espelhar` e `referenciasPorSerie`), testadas sem interface, cada regra em um lugar. A referência é consultada, nunca persistida (FR-202). | ✅ |
| Estilo visual | A skill `frontend-design` será usada nas alterações de tela. | ✅ |
| Fluxo | `plan.md` e `tasks.md` antes de implementar; tarefas citam FR/SC. | ✅ |

Re-check pós-desenho (Phase 1): mantido — nenhum artefato introduziu estado persistido, rede ou
interação bloqueante.

## Project Structure

### Documentation (this feature)

```text
specs/006-espelhar-series-e-referencia-anterior/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── dominio.md        # assinaturas das funções puras e da consulta
│   └── interface.md      # contrato de tela: onde e como a referência aparece
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── treino/
│   │   ├── espelhar.ts            # NOVO — FR-187..FR-190 (função pura)
│   │   └── index.ts               # reexporta
│   └── serie/
│       └── referencia.ts          # NOVO — FR-194, FR-197 (função pura)
├── funcionalidades/
│   ├── treinos/
│   │   └── EditorSeries.tsx       # `alterar` passa a delegar a `espelhar`
│   └── execucao/
│       ├── consultas.ts           # NOVA consulta `execucaoAnteriorNoTreino`
│       ├── TelaExecucao.tsx       # carrega e exibe referências
│       └── execucao.module.css    # estilo do texto de referência
└── plataforma/
    └── formato.ts                 # `formatarReferencia`

tests/
├── unidade/
│   ├── domain/espelharSeries.test.ts
│   ├── domain/referenciaPorSerie.test.ts
│   └── funcionalidades/editorDeSeries.test.tsx   # casos de espelhamento
├── integracao/
│   └── execucaoAnteriorNoTreino.test.ts
└── e2e/
    ├── espelharSeries.spec.ts
    └── referenciaAnterior.spec.ts
```

**Structure Decision**: segue a organização existente — regra em `src/domain`, consulta junto da
funcionalidade que a usa (`execucao/consultas.ts`, como `execucaoAnterior`), tela em
`src/funcionalidades`.

## Complexity Tracking

Sem violações a justificar.
