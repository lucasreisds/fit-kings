# Contrato de domínio e consulta

## `espelhar` — `src/domain/treino/espelhar.ts`

```ts
export function espelhar(
  atuais: readonly ValoresPlanejados[],
  indice: number,
  campo: keyof ValoresPlanejados,
  valor: ValoresPlanejados[typeof campo],
): readonly ValoresPlanejados[]
```

- Pura; não muta `atuais`.
- `indice === 0`: altera a série 0 e toda série `i > 0` idêntica à série 0 **antes** da alteração
  (FR-187, FR-188).
- `indice > 0`: altera somente aquela série (FR-189).
- `indice` fora do intervalo: devolve `atuais` sem alteração.

## `referenciasPorSerie` — `src/domain/serie/referencia.ts`

```ts
export type ReferenciaDeSerie = { readonly repeticoes: number; readonly cargaKg: number | null }

export function referenciasPorSerie(
  series: readonly SerieRealizada[],
): ReadonlyMap<number, ReferenciaDeSerie>
```

- Pura. Chave = `ordem`. Só séries válidas (`serieEhValida`). Dropset usa `degraus[0]`.

## `execucaoAnteriorNoTreino` — `src/funcionalidades/execucao/consultas.ts`

```ts
export async function execucaoAnteriorNoTreino(
  exercicioId: Id,
  treinoId: Id | null,
  ocorrencia: number,
  opcoes?: { ignorarSessaoId?: Id },
  db?: BancoFitKings,
): Promise<ExecucaoAnteriorDoExercicio | null>
```

- `treinoId === null` → `null`.
- Candidatas: sessões `concluida`, versão vigente, `treinoId` igual, diferente de
  `ignorarSessaoId`.
- Em cada candidata, os `ExercicioSessao` de mesmo `exercicioId` não excluídos, ordenados por
  `ordem`; usa o de índice `ocorrencia`. Sem ele, ou sem série válida, a candidata é descartada.
- Devolve a candidata de `concluidaEm` mais recente (FR-195).

## `formatarReferencia` — `src/plataforma/formato.ts`

```ts
export function formatarReferencia(referencia: ReferenciaDeSerie): string
// { 10, 40 }   → "40 kg × 10"     (mesma ordem da série registrada)
// { 10, 42.5 } → "42,5 kg × 10"
// { 12, 0 }    → "12 reps"
// { 12, null } → "12 reps"
```
