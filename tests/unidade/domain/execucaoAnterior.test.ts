import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../../apoio/banco'
import type { BancoFitKings } from '../../../src/dados/db'
import { montarCenario } from '../../apoio/cenario'
import { execucaoAnterior } from '../../../src/funcionalidades/execucao/consultas'

/**
 * FR-094 — "execução anterior" é a sessão concluída mais recente em que o
 * exercício teve **ao menos uma série válida** registrada.
 *
 * Cada palavra dessa frase é um caso aqui: concluída (não em andamento nem
 * descartada), mais recente (não a primeira), e com série válida (uma sessão
 * onde o exercício foi pulado não conta).
 */
describe('execução anterior de um exercício (FR-094)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function cenario() {
    const montado = await montarCenario(db)
    return { ...montado, item: montado.itens[0]! }
  }

  async function registrar(
    montado: Awaited<ReturnType<typeof cenario>>,
    opcoes: {
      repeticoes: number | null
      cargaKg?: number
      naoRealizada?: boolean
      encerrar?: 'concluir' | 'descartar' | 'deixar'
    },
  ) {
    const sessao = await montado.sessoes.criar({
      treinoId: montado.treino.id,
      nomeTreino: montado.treino.nome,
      exercicios: [
        {
          exercicioId: montado.item.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: montado.item.item.item.id,
        },
      ],
    })

    await montado.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: opcoes.cargaKg ?? 40,
      repeticoes: opcoes.repeticoes,
      rir: 1,
      naoRealizada: opcoes.naoRealizada ?? false,
      seriePlanejadaId: null,
    })

    const encerrar = opcoes.encerrar ?? 'concluir'
    if (encerrar !== 'deixar') await montado.sessoes.encerrar(sessao.sessao.id, encerrar)
    // Espaça os carimbos para que "mais recente" seja inequívoco.
    await new Promise((resolver) => setTimeout(resolver, 3))
    return sessao
  }

  it('devolve nulo quando não há execução nenhuma', async () => {
    const montado = await cenario()
    expect(await execucaoAnterior(montado.item.exercicio.id, {}, db)).toBeNull()
  })

  it('devolve a sessão concluída mais recente', async () => {
    const montado = await cenario()
    await registrar(montado, { repeticoes: 8, cargaKg: 40 })
    await registrar(montado, { repeticoes: 9, cargaKg: 42.5 })

    const anterior = await execucaoAnterior(montado.item.exercicio.id, {}, db)
    expect(anterior?.cargaKg).toBe(42.5)
    expect(anterior?.series[0]!.repeticoes).toBe(9)
  })

  it('ignora sessão em andamento', async () => {
    const montado = await cenario()
    await registrar(montado, { repeticoes: 8, cargaKg: 40 })
    await registrar(montado, { repeticoes: 12, cargaKg: 99, encerrar: 'deixar' })

    const anterior = await execucaoAnterior(montado.item.exercicio.id, {}, db)
    expect(anterior?.cargaKg).toBe(40)
  })

  it('ignora sessão descartada', async () => {
    const montado = await cenario()
    await registrar(montado, { repeticoes: 8, cargaKg: 40 })
    await registrar(montado, { repeticoes: 12, cargaKg: 99, encerrar: 'descartar' })

    const anterior = await execucaoAnterior(montado.item.exercicio.id, {}, db)
    expect(anterior?.cargaKg).toBe(40)
  })

  it('ignora sessão sem nenhuma série válida — exercício pulado (FR-093)', async () => {
    const montado = await cenario()
    await registrar(montado, { repeticoes: 8, cargaKg: 40 })
    await registrar(montado, { repeticoes: null, cargaKg: 99, naoRealizada: true })

    // A execução de 40 kg continua sendo a anterior: pular não apaga a
    // indicação que já valia (SC-024).
    const anterior = await execucaoAnterior(montado.item.exercicio.id, {}, db)
    expect(anterior?.cargaKg).toBe(40)
  })

  it('ignora a própria sessão corrente quando pedido', async () => {
    const montado = await cenario()
    await registrar(montado, { repeticoes: 8, cargaKg: 40 })
    const corrente = await registrar(montado, { repeticoes: 9, cargaKg: 45, encerrar: 'deixar' })

    const anterior = await execucaoAnterior(
      montado.item.exercicio.id,
      { ignorarSessaoId: corrente.sessao.id },
      db,
    )
    expect(anterior?.cargaKg).toBe(40)
  })

  it('a carga devolvida é a da última série válida da execução', async () => {
    const montado = await cenario()
    const sessao = await montado.sessoes.criar({
      treinoId: montado.treino.id,
      nomeTreino: 'T',
      exercicios: [
        {
          exercicioId: montado.item.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: montado.item.item.item.id,
        },
      ],
    })

    for (const [ordem, carga] of [
      [1, 40],
      [2, 42.5],
      [3, 45],
    ] as const) {
      await montado.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
        ordem,
        cargaKg: carga,
        repeticoes: 8,
        rir: 1,
        seriePlanejadaId: null,
      })
    }
    await montado.sessoes.encerrar(sessao.sessao.id, 'concluir')

    expect((await execucaoAnterior(montado.item.exercicio.id, {}, db))?.cargaKg).toBe(45)
  })
})
