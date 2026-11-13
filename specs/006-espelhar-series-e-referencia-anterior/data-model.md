# Data Model: Séries que acompanham a primeira e referência da última vez no mesmo treino

**Nenhuma alteração de esquema, nenhuma migração, nenhuma alteração no formato de backup.**

## Entidades existentes usadas

| Entidade | Campos relevantes | Uso |
|----------|-------------------|-----|
| `SeriePlanejada` | `itemTreinoId`, `ordem`, `repeticoes`, `repeticoesMax`, `cargaKg`, `rir` | Alvo do espelhamento (via projeção `ValoresPlanejados`). |
| `Sessao` | `treinoId` (nulo se o treino foi excluído), `estado`, `concluidaEm`, `versaoVigenteId` | Filtro "mesmo treino" e "concluída, versão vigente". |
| `ExercicioSessao` | `sessaoVersaoId`, `exercicioId`, `ordem` | Localiza o exercício e sua ocorrência dentro da sessão. |
| `SerieRealizada` | `ordem`, `repeticoes`, `cargaKg`, `naoRealizada`, `degraus` | Fonte da referência por série. |

## Tipos derivados (não persistidos)

### `ReferenciaDeSerie`

```ts
type ReferenciaDeSerie = {
  readonly repeticoes: number        // > 0 não é exigido; vem de série válida (repeticoes !== null)
  readonly cargaKg: number | null    // null ou 0 → exibir só repetições
}
```

Derivação (`referenciasPorSerie`):

- Para cada série com `serieEhValida(serie)`:
  - se `degraus` não nulo e não vazio → `{ repeticoes: degraus[0].repeticoes, cargaKg: degraus[0].cargaKg }`
  - senão → `{ repeticoes: serie.repeticoes, cargaKg: serie.cargaKg }`
- Chave: `serie.ordem`. Séries inválidas não geram entrada (FR-197).

### Regra "acompanha a primeira"

Para `atuais: ValoresPlanejados[]`, uma edição `(indice = 0, campo, valor)` produz:

```
para cada i:
  i == 0                        → atuais[0] com campo = valor
  i > 0 e iguais(atuais[i], atuais[0]) → atuais[i] com campo = valor
  caso contrário                → atuais[i] inalterada
```

`iguais` compara `repeticoes`, `repeticoesMax`, `cargaKg`, `rir`. Edição com `indice > 0` altera só
`atuais[indice]` (FR-189). Nenhuma transição de estado: o "acompanhar" é recalculado a cada edição.
