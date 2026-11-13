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

/**
 * FR-195 — a execução anterior **no mesmo treino**.
 *
 * Irmã de `execucaoAnterior`, e não um modo dela: aquela alimenta a linha
 * "Última vez" e a progressão, que olham qualquer treino, e mudar o critério
 * dela mudaria as duas (FR-201). Aqui o que vale é o treino da sessão em
 * andamento, porque é contra o mesmo treino que a comparação série a série faz
 * sentido — mesma ordem, mesmo cansaço acumulado.
 *
 * `ocorrencia` resolve o caso raro do mesmo exercício duas vezes no treino: a
 * primeira compara com a primeira, a segunda com a segunda.
 *
 * Sessão de treino excluído perde o vínculo (`treinoId` nulo) e, por isso,
 * nunca é referência — nem para um treino novo de mesmo nome.
 */
export async function execucaoAnteriorNoTreino(
  exercicioId: Id,
  treinoId: Id | null,
  ocorrencia: number,
  opcoes: { ignorarSessaoId?: Id } = {},
  db: BancoFitKings = bancoPadrao,
): Promise<ExecucaoAnteriorDoExercicio | null> {
  if (treinoId === null) return null

  const sessoes = (await db.sessoes.where('treinoId').equals(treinoId).toArray())
    .filter(
      (sessao) =>
        sessao.excluidoEm === null &&
        sessao.estado === 'concluida' &&
        sessao.concluidaEm !== null &&
        sessao.id !== opcoes.ignorarSessaoId,
    )
    .sort((a, b) => Date.parse(b.concluidaEm!) - Date.parse(a.concluidaEm!))

  for (const sessao of sessoes) {
    // Só a versão vigente conta, e a autoridade é o cabeçalho.
    const registro = (
      await db.exerciciosSessao
        .where('[exercicioId+sessaoVersaoId]')
        .equals([exercicioId, sessao.versaoVigenteId])
        .toArray()
    )
      .filter((exercicio) => exercicio.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)[ocorrencia]
    if (!registro) continue

    const series = (
      await db.seriesRealizadas.where('exercicioSessaoId').equals(registro.id).toArray()
    )
      .filter((serie) => serie.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)

    // Exercício pulado naquele dia não é execução (FR-093): segue para a
    // sessão anterior do mesmo treino.
    if (!temAlgumaSerieValida(series)) continue

    const validas = seriesValidas(series)
    return {
      sessaoId: sessao.id,
      concluidaEm: sessao.concluidaEm!,
      series,
      cargaKg: validas[validas.length - 1]?.cargaKg ?? null,
    }
  }

  return null
}
