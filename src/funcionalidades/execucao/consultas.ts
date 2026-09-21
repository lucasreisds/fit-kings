/**
 * Consultas de apoio à execução.
 *
 * A execução anterior de um exercício é obtida **por consulta, nunca por campo
 * persistido** (Princípio V, FR-094): é a sessão concluída mais recente em que
 * aquele exercício teve ao menos uma série válida registrada.
 */
import { db as bancoPadrao, type BancoFitKings } from '../../dados/db'
import type { Id, InstanteUtc, SerieRealizada } from '../../domain/tipos'
import { temAlgumaSerieValida, seriesValidas } from '../../domain/serie/validade'

export type ExecucaoAnteriorDoExercicio = {
  readonly sessaoId: Id
  readonly concluidaEm: InstanteUtc
  readonly series: readonly SerieRealizada[]
  /** Carga da última série válida daquela execução (FR-083). */
  readonly cargaKg: number | null
}

/**
 * FR-094. `antesDe` permite excluir a própria sessão corrente da busca — sem
 * isso, o exercício em andamento seria sua própria "execução anterior".
 */
export async function execucaoAnterior(
  exercicioId: Id,
  opcoes: { antesDe?: InstanteUtc; ignorarSessaoId?: Id } = {},
  db: BancoFitKings = bancoPadrao,
): Promise<ExecucaoAnteriorDoExercicio | null> {
  const registros = await db.exerciciosSessao.where('exercicioId').equals(exercicioId).toArray()
  if (registros.length === 0) return null

  const candidatos: ExecucaoAnteriorDoExercicio[] = []

  for (const registro of registros) {
    if (registro.excluidoEm !== null) continue

    const versao = await db.sessaoVersoes.get(registro.sessaoVersaoId)
    if (!versao) continue

    const sessao = await db.sessoes.get(versao.sessaoId)
    if (!sessao || sessao.estado !== 'concluida' || sessao.concluidaEm === null) continue
    // Só a versão vigente conta. A autoridade é o cabeçalho, não `vigente`.
    if (sessao.versaoVigenteId !== versao.id) continue
    if (opcoes.ignorarSessaoId && sessao.id === opcoes.ignorarSessaoId) continue
    if (opcoes.antesDe && Date.parse(sessao.concluidaEm) >= Date.parse(opcoes.antesDe)) continue

    const series = (
      await db.seriesRealizadas.where('exercicioSessaoId').equals(registro.id).toArray()
    )
      .filter((serie) => serie.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)

    // "Execução anterior" exige ao menos uma série válida (FR-094). Um exercício
    // planejado e totalmente pulado não conta como execução (FR-093).
    if (!temAlgumaSerieValida(series)) continue

    const validas = seriesValidas(series)
    candidatos.push({
      sessaoId: sessao.id,
      concluidaEm: sessao.concluidaEm,
      series,
      cargaKg: validas[validas.length - 1]?.cargaKg ?? null,
    })
  }

  if (candidatos.length === 0) return null

  candidatos.sort((a, b) => Date.parse(b.concluidaEm) - Date.parse(a.concluidaEm))
  return candidatos[0]!
}
