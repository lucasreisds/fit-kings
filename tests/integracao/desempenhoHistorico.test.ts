import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { semearHistorico } from '../apoio/historicoSintetico'
import { criarRepositorioHistorico } from '../../src/dados/repositorios/historico'

/**
 * SC-010 — listar 200 sessões em menos de 2 s e consultar o histórico de um
 * exercício em menos de 1 s.
 *
 * O teste roda sobre `fake-indexeddb`, que é mais lento que o IndexedDB real do
 * navegador. Passar aqui é, portanto, uma margem folgada — e falhar aqui é
 * sinal seguro de que alguma consulta virou varredura de tabela.
 */
describe('desempenho do histórico (SC-010)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('lista 200 sessões concluídas em menos de 2 s', async () => {
    await semearHistorico(db, { sessoes: 200, exerciciosPorSessao: 6, seriesPorExercicio: 3 })
    const historico = criarRepositorioHistorico(db)

    const inicio = performance.now()
    const sessoes = await historico.listarSessoes()
    const duracao = performance.now() - inicio

    expect(sessoes).toHaveLength(200)
    expect(duracao).toBeLessThan(2000)
  })

  it('devolve as sessões em ordem cronológica decrescente (FR-036)', async () => {
    await semearHistorico(db, { sessoes: 30, exerciciosPorSessao: 2, seriesPorExercicio: 2 })
    const sessoes = await criarRepositorioHistorico(db).listarSessoes()

    const datas = sessoes.map((resumo) => Date.parse(resumo.sessao.concluidaEm!))
    expect([...datas].sort((a, b) => b - a)).toEqual(datas)
  })

  it('consulta o histórico de um exercício em menos de 1 s', async () => {
    const { exercicios } = await semearHistorico(db, {
      sessoes: 200,
      exerciciosPorSessao: 6,
      seriesPorExercicio: 3,
    })
    const historico = criarRepositorioHistorico(db)

    const inicio = performance.now()
    const execucoes = await historico.execucoesDoExercicio(exercicios[0]!.id)
    const duracao = performance.now() - inicio

    expect(execucoes).toHaveLength(200)
    expect(duracao).toBeLessThan(1000)
  })

  it('a primeira página do histórico é barata (o limite corta cedo)', async () => {
    await semearHistorico(db, { sessoes: 200, exerciciosPorSessao: 6, seriesPorExercicio: 3 })
    const historico = criarRepositorioHistorico(db)

    const inicio = performance.now()
    const pagina = await historico.listarSessoes(20)
    const duracao = performance.now() - inicio

    expect(pagina).toHaveLength(20)
    expect(duracao).toBeLessThan(500)
  })
})
