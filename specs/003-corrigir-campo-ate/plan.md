# Implementation Plan: Corrigir o campo "até" do intervalo de repetições

**Branch**: `task/corrigir-campo-ate` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Constituição**: v1.4.0 | **Feature de origem**: [002](../002-execution-fixes-rep-ranges/plan.md)

## Summary

Um defeito de apresentação, com causa localizada e correção de uma linha — e uma lacuna de teste que
é o que importa de verdade neste plano.

**A causa**: `ItemDoEditor`, em `src/funcionalidades/treinos/EditorTreino.tsx`, reconstrói cada série
para entregá-la ao editor copiando três campos — `repeticoes`, `cargaKg` e `rir` — e omite
`repeticoesMax`. O campo recebe sempre `undefined` e renderiza vazio.

Verificado por teste de componente antes deste plano: com `repeticoesMax` presente, o campo exibe o
valor corretamente. O componente nunca esteve errado.

**A consequência que agrava**: o campo é controlado e grava a cada tecla. Como o valor gravado é
descartado na releitura, o campo volta a vazio entre uma tecla e outra — e cada dígito substitui o
anterior. Digitar "12" grava 1, depois 2.

## Technical Context

Sem dependência nova, sem alteração de esquema, sem alteração de regra de domínio. A feature 002
entregou a regra do intervalo testada e correta; nada aqui a toca.

## Constitution Check

| Princípio                       | Avaliação                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Integridade do Registro**  | ✅ **É o princípio violado pelo defeito.** Escrita que o usuário não vê é o oposto do que ele exige. FR-157 o registra como requisito. Nenhuma migração automática: apagar os valores gravados sem intenção removeria junto os gravados de propósito, e não há como distinguir — a decisão fica com o usuário |
| **II. A Academia é o Ambiente** | ✅ O campo passa a funcionar; nada interrompe                                                                                                                                                                                                                                                                 |
| **III. Autonomia Local**        | ✅ Nada muda                                                                                                                                                                                                                                                                                                  |
| **IV. Modelo de Dados Aditivo** | ✅ Nenhuma alteração de esquema. Os dados gravados durante o defeito permanecem e ficam visíveis                                                                                                                                                                                                              |
| **V. Domínio Determinístico**   | ✅ A regra do intervalo não é tocada. O defeito é de apresentação                                                                                                                                                                                                                                             |
| **Portões de Qualidade**        | ⚠️ → ✅ **A lacuna é aqui.** Ver D2                                                                                                                                                                                                                                                                           |

**Resultado**: passa. O ponto que exige decisão é o portão de teste, não a correção.

## Decisões

### D1 — A correção: preservar a série inteira, em vez de listar campos

**Decisão**: `ItemDoEditor` para de enumerar campos ao reconstruir a série. Em vez de copiar três
campos nomeados, passa a derivar o objeto de forma que **um campo novo no modelo apareça sem
ninguém precisar lembrar de acrescentá-lo aqui**.

**Rationale**: acrescentar `repeticoesMax` à lista corrigiria o sintoma e deixaria a causa de pé. A
causa não é o campo esquecido — é **a existência de uma lista de campos que alguém precisa lembrar
de atualizar**. Enquanto ela existir, o próximo campo será esquecido do mesmo jeito, com a mesma
invisibilidade.

A forma concreta é a projeção explícita dos valores planejados a partir do registro, num único
lugar, que tanto a tela quanto o teste consomem.

**Alternativa descartada**: acrescentar `repeticoesMax: serie.repeticoesMax` à lista. Uma linha,
corrige hoje, e reabre o mesmo buraco amanhã.

### D2 — O teste que faltava: o caminho de ida e volta

**Decisão**: acrescentar verificação de que **cada valor editável de uma série planejada percorre o
caminho do registro gravado até o campo da tela e de volta** (FR-158, FR-159).

**Rationale**: o defeito atravessou 554 testes. Não por descuido de cobertura — por **forma** de
cobertura. Havia teste do componente do campo, que recebia a série pronta e a exibia certo. Havia
teste da regra de domínio, que avaliava o intervalo certo. Nenhum teste percorria o trecho entre os
dois, que é exatamente onde o valor se perdia.

É a lição que vale além deste defeito: testar as duas pontas de um caminho não testa o caminho.

**Forma**: um teste que grava uma série com **todos** os valores preenchidos, monta a tela, e
verifica campo a campo que cada valor chegou. Falhando, ele aponta qual valor se perdeu — que é o
que FR-159 pede.

### D3 — Digitação de múltiplos dígitos

**Decisão**: o campo continua controlado e continua gravando a cada alteração. Nada muda nesse
desenho.

**Rationale**: o problema dos dígitos **não é do desenho do campo** — é consequência do valor não
voltar. Resolvido D1, o valor gravado volta a cada releitura, o campo mostra o que tem, e digitar
"12" compõe 12 normalmente. Não há nada a corrigir aqui além de D1, e mexer no desenho do campo
seria tratar um sintoma cuja causa já está resolvida.

O teste de FR-154 existe para provar isso, não para guiar uma mudança.

## Project Structure

```text
src/funcionalidades/treinos/
├── EditorTreino.tsx        ← a correção (D1)
└── projecaoDeSeries.ts     ← NOVO: a projeção única que tela e teste consomem

tests/unidade/funcionalidades/
└── editorDeSeries.test.tsx ← NOVO: o caminho de ida e volta (D2)
```

## Complexity Tracking

**Nenhuma violação.** A correção é menor que o teste que a acompanha, e essa proporção é adequada:
o defeito custou pouco para corrigir e existiu porque nada o impedia.
