# Implementation Plan: Gatilho de progressão na faixa de repetições

**Branch**: `task/dupla-progressao` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Constituição**: v1.4.0 | **Substitui**: FR-142 da [feature 002](../002-execution-fixes-rep-ranges/spec.md)

## Summary

Uma condição muda de `>` para `>=`, **e só quando o planejamento é uma faixa**. O resto do plano
existe para garantir que essa mudança não alcance mais nada.

## Constitution Check

| Princípio                       | Avaliação                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Integridade do Registro**  | ⚠️ → ✅ **É o ponto sensível.** A regra que muda é a que interpreta histórico já registrado. Por isso a mudança alcança **apenas** planejamentos em faixa, e FR-165 exige que o valor único produza resultado idêntico — verificado pelos dez casos do portão 4, que rodam inalterados |
| **II. A Academia é o Ambiente** | ✅ O aviso continua sem bloquear                                                                                                                                                                                                                                                       |
| **III. Autonomia Local**        | ✅ Nada muda                                                                                                                                                                                                                                                                           |
| **IV. Modelo de Dados Aditivo** | ✅ Nenhuma alteração de esquema. Nada é gravado                                                                                                                                                                                                                                        |
| **V. Domínio Determinístico**   | ✅ A regra continua pura, num lugar só, e fica **mais** explicável: o motivo apresentado passa a distinguir faixa dominada de meta superada                                                                                                                                            |
| **Portões de Qualidade**        | ✅ O portão 4 é o guardião desta mudança                                                                                                                                                                                                                                               |

**Resultado**: passa. O risco é de regressão silenciosa, e o portão 4 é a rede.

## Decisões

### D1 — O gatilho depende da forma da prescrição

**Decisão**: `superouIntervalo` passa a considerar superada a série que atinge `maximo` **quando há
faixa**, e mantém `> maximo` **quando a ponta é única**.

**Rationale**: faixa e valor único não são a mesma prescrição escrita de formas diferentes.

- Numa faixa, o máximo é a **meta a alcançar**: "trabalhe entre 6 e 8" significa que dominar 8 é o
  objetivo, e alcançá-lo é a conquista que o protocolo usa como gatilho.
- Num valor único, o número é a **expectativa**: "faça 8" é cumprido ao fazer 8. Cumprir não é
  superar, e indicar aumento aí contrariaria FR-081.

Uma regra uniforme — "atingir o máximo indica" — seria mais simples e mudaria a avaliação de **todo
o histórico de valor único**, que é o que o Princípio I proíbe.

**Alternativa descartada**: tratar toda faixa como `minimo` e indicar ao passar dele. Indicaria
aumento com 7 numa faixa de 6-8, quando ainda há faixa a percorrer.

### D2 — A comparação ganha "no topo"

**Decisão**: a classificação de FR-141 passa a distinguir, **em faixas**, alcançar o máximo de estar
entre as pontas.

**Rationale**: consequência direta de D1. Com o gatilho novo, fazer 8 numa faixa de 6-8 faz o aviso
aparecer — e a comparação ao lado diria "na meta", igual a ter feito 6. O usuário veria o aviso sem
conseguir ligá-lo ao que fez, e o Princípio V exige que ele consiga consultar o que fundamenta
qualquer indicação.

Em valor único nada muda: não há topo a alcançar que não seja o próprio valor.

### D3 — O texto do motivo passa a nomear o protocolo

**Decisão**: o motivo apresentado ao usuário distingue "superou a meta" de "dominou a faixa".

**Rationale**: são situações diferentes e o usuário reage a elas de forma diferente. Na faixa, o
passo seguinte é subir o peso e ver as repetições caírem para a base — é o ciclo. Dizer "você
superou" onde ele cumpriu exatamente o planejado seria impreciso.

## Project Structure

```text
src/domain/
├── serie/intervalo.ts       ← o gatilho (D1) e a classificação (D2)
├── serie/validade.ts        ← comparação passa a expor "no topo"
└── progressao/avaliar.ts    ← motivo distinto para faixa dominada (D3)

src/funcionalidades/
├── historico/ComparacaoSeries.tsx   ← marca de topo
└── execucao/TelaExecucao.tsx        ← idem, no livro-razão
```

## Complexity Tracking

**Nenhuma violação.** A mudança é de uma condição; o cuidado está em ela não vazar para o valor
único, e isso é verificado pelo portão 4 rodando inalterado.
