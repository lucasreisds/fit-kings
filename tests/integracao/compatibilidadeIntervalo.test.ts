import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { criarRepositorioTreinos } from '../../src/dados/repositorios/treinos'
import { criarRepositorioExercicios } from '../../src/dados/repositorios/exercicios'
import { criarRepositorioBackup } from '../../src/dados/repositorios/backup'
import { avaliarProgressao } from '../../src/domain/progressao/avaliar'
import { validar } from '../../src/domain/backup/validar'
import { novoId } from '../../src/plataforma/id'
import { umArquivoCompleto } from '../apoio/fabricas'

/**
 * T031, T032 — FR-144, SC-040, SC-042.
 *
 * O aplicativo já está publicado, com treinos e histórico gravados. Esta
 * feature generaliza a regra de repetições, e a generalização **não pode**
 * mudar o resultado de nada que já existe.
 */
describe('compatibilidade do intervalo (FR-144)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('treino de valor único continua válido e avalia igual (SC-040)', async () => {
    const treinos = criarRepositorioTreinos(db)
    const treino = await treinos.criar('Treino antigo')
    const exercicioId = novoId()

    // Planejado antes da feature: só `repeticoes`, sem máximo.
    const item = await treinos.adicionarItem(treino.id, {
      exercicioId,
      abordagem: 'tradicional',
      series: [
        { repeticoes: 8, cargaKg: 40, rir: 2 },
        { repeticoes: 8, cargaKg: 40, rir: 2 },
      ],
    })

    expect(item.series.every((serie) => serie.repeticoesMax === null)).toBe(true)

    const planejadas = item.series.map((serie) => ({
      ordem: serie.ordem,
      repeticoes: serie.repeticoes,
      repeticoesMax: serie.repeticoesMax,
      cargaKg: serie.cargaKg,
      rir: serie.rir,
    }))

    const realizadas = (reps: readonly number[]) =>
      reps.map((repeticoes, i) => ({ ordem: i + 1, repeticoes, rir: 2, naoRealizada: false }))

    // O comportamento de sempre, verificado item a item.
    expect(avaliarProgressao({ planejadas, realizadas: realizadas([9, 9]) }).indica).toBe(true)
    expect(avaliarProgressao({ planejadas, realizadas: realizadas([8, 8]) }).indica).toBe(false)
    expect(avaliarProgressao({ planejadas, realizadas: realizadas([9, 8]) }).indica).toBe(false)
  })

  it('série de valor único pode ganhar intervalo sem perder o histórico', async () => {
    const treinos = criarRepositorioTreinos(db)
    const treino = await treinos.criar('Treino A')
    const item = await treinos.adicionarItem(treino.id, {
      exercicioId: novoId(),
      abordagem: 'tradicional',
      series: [{ repeticoes: 8, cargaKg: 40, rir: null }],
    })

    await treinos.definirSeries(item.item.id, [
      { repeticoes: 6, repeticoesMax: 8, cargaKg: 40, rir: null },
    ])

    const completo = await treinos.obter(treino.id)
    expect(completo!.itens[0]!.series[0]).toMatchObject({ repeticoes: 6, repeticoesMax: 8 })
  })

  it('arquivo de backup sem repeticoesMax é aceito (SC-042)', () => {
    const arquivo = umArquivoCompleto()
    const semCampoNovo = {
      ...arquivo,
      seriesPlanejadas: arquivo.seriesPlanejadas.map((serie) => {
        const { repeticoesMax: _removido, ...resto } = serie as Record<string, unknown>
        return resto
      }),
      itensTreino: arquivo.itensTreino.map((item) => {
        const { descansoSegundos: _removido, ...resto } = item as Record<string, unknown>
        return resto
      }),
    }

    expect(validar(semCampoNovo).valido).toBe(true)
  })

  it('arquivo com intervalo invertido é recusado', () => {
    const arquivo = umArquivoCompleto()
    const invertido = {
      ...arquivo,
      seriesPlanejadas: [{ ...arquivo.seriesPlanejadas[0]!, repeticoes: 8, repeticoesMax: 6 }],
    }

    const resultado = validar(invertido)
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas[0]!.mensagem).toMatch(/não pode ser menor que o mínimo/)
    }
  })

  it('o arquivo exportado carrega os campos novos sem incrementar a versão', async () => {
    const treinos = criarRepositorioTreinos(db)
    // O exercício precisa existir: a validação do arquivo exige que toda
    // referência resolva dentro dele.
    const exercicio = await criarRepositorioExercicios(db).criar({
      nome: 'Supino',
      origem: 'catalogo',
    })
    const treino = await treinos.criar('Treino A')
    await treinos.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      descansoSegundos: 90,
      series: [{ repeticoes: 6, repeticoesMax: 8, cargaKg: 40, rir: null }],
    })

    const arquivo = await criarRepositorioBackup(db).montar()

    expect(arquivo.formatVersion).toBe(1)
    expect(arquivo.seriesPlanejadas[0]).toMatchObject({ repeticoes: 6, repeticoesMax: 8 })
    expect(arquivo.itensTreino[0]).toMatchObject({ descansoSegundos: 90 })
    expect(validar(arquivo).valido).toBe(true)
  })

  it('exportar e importar preserva intervalo e descanso', async () => {
    const treinos = criarRepositorioTreinos(db)
    const exercicio = await criarRepositorioExercicios(db).criar({
      nome: 'Supino',
      origem: 'catalogo',
    })
    const treino = await treinos.criar('Treino A')
    await treinos.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      descansoSegundos: 120,
      series: [{ repeticoes: 6, repeticoesMax: 10, cargaKg: 40, rir: null }],
    })
    const arquivo = await criarRepositorioBackup(db).montar()

    const destino = bancoDeTeste()
    try {
      const backup = criarRepositorioBackup(destino)
      await backup.aplicar(await backup.planejar(arquivo))

      const serie = (await destino.seriesPlanejadas.toArray())[0]!
      const item = (await destino.itensTreino.toArray())[0]!
      expect(serie.repeticoesMax).toBe(10)
      expect(item.descansoSegundos).toBe(120)
    } finally {
      await descartar(destino)
    }
  })
})
