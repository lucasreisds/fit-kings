import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { criarRepositorioBackup } from '../../src/dados/repositorios/backup'
import { validar } from '../../src/domain/backup/validar'
import { FORMAT_VERSION_CORRENTE } from '../../src/domain/backup/tipos'

/**
 * T074 — o arquivo de backup ganha as coleções de sessão.
 *
 * Acrescentar coleção **não** incrementa `formatVersion`: é exatamente o caso
 * previsto pela política de compatibilidade do contrato. Leitores antigos
 * ignoram o que não conhecem; leitores novos aplicam padrão ao que falta.
 */
describe('backup com sessões (T074)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function cenarioComSessaoConcluida(estado: 'concluir' | 'descartar' | 'deixar' = 'concluir') {
    const cenario = await montarCenario(db)
    const item = cenario.itens[0]!
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [
        {
          exercicioId: item.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: item.item.item.id,
        },
      ],
    })

    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    if (estado !== 'deixar') await cenario.sessoes.encerrar(sessao.sessao.id, estado)
    return { cenario, sessao }
  }

  it('a sessão concluída entra no arquivo, achatada na versão vigente', async () => {
    await cenarioComSessaoConcluida('concluir')
    const arquivo = await criarRepositorioBackup(db).montar()

    expect(arquivo.sessoes).toHaveLength(1)
    expect(arquivo.exerciciosSessao).toHaveLength(1)
    expect(arquivo.seriesRealizadas).toHaveLength(1)

    // Achatamento: o exercício da sessão referencia `sessaoId` diretamente e a
    // estrutura interna de versões não é exportada.
    expect(arquivo.exerciciosSessao[0]!.sessaoId).toBe(arquivo.sessoes[0]!.id)
    expect(arquivo.exerciciosSessao[0]).not.toHaveProperty('sessaoVersaoId')
    expect(arquivo.sessoes[0]).not.toHaveProperty('versaoVigenteId')
  })

  it('acrescentar coleções não incrementa formatVersion', async () => {
    await cenarioComSessaoConcluida('concluir')
    const arquivo = await criarRepositorioBackup(db).montar()
    expect(arquivo.formatVersion).toBe(FORMAT_VERSION_CORRENTE)
    expect(arquivo.formatVersion).toBe(1)
  })

  it('o arquivo gerado passa na própria validação', async () => {
    await cenarioComSessaoConcluida('concluir')
    const arquivo = await criarRepositorioBackup(db).montar()
    const resultado = validar(arquivo)

    if (!resultado.valido) console.error(resultado.problemas)
    expect(resultado.valido).toBe(true)
  })

  it.each([
    ['em andamento', 'deixar'],
    ['descartada', 'descartar'],
  ] as const)('sessão %s não entra no arquivo', async (_caso, estado) => {
    await cenarioComSessaoConcluida(estado)
    const arquivo = await criarRepositorioBackup(db).montar()

    expect(arquivo.sessoes).toHaveLength(0)
    // E o conteúdo dela também não vaza.
    expect(arquivo.exerciciosSessao).toHaveLength(0)
    expect(arquivo.seriesRealizadas).toHaveLength(0)
  })

  it('exportar e importar num aparelho vazio reconstrói a sessão', async () => {
    await cenarioComSessaoConcluida('concluir')
    const arquivo = await criarRepositorioBackup(db).montar()

    const destino = bancoDeTeste()
    try {
      const backupDestino = criarRepositorioBackup(destino)
      const plano = await backupDestino.planejar(arquivo)
      const resumo = await backupDestino.aplicar(plano)

      expect(resumo.sessoesInseridas).toBe(1)
      expect(await destino.sessoes.count()).toBe(1)
      expect(await destino.seriesRealizadas.count()).toBe(1)

      const sessao = (await destino.sessoes.toArray())[0]!
      const versao = await destino.sessaoVersoes.get(sessao.versaoVigenteId)
      expect(versao).toBeDefined()
      expect(versao!.numero).toBe(1)
      expect(versao!.motivo).toBe('inicial')

      // Importar de novo é operação nula (FR-104).
      const segundo = await backupDestino.planejar(arquivo)
      const resumoSegundo = await backupDestino.aplicar(segundo)
      expect(resumoSegundo.sessoesInseridas).toBe(0)
      expect(resumoSegundo.sessoesComNovaVersao).toBe(0)
      expect(await destino.sessoes.count()).toBe(1)
      expect(await destino.seriesRealizadas.count()).toBe(1)
    } finally {
      await descartar(destino)
    }
  })

  it('o exercício mantém o mesmo identificador na volta (FR-105)', async () => {
    const { cenario } = await cenarioComSessaoConcluida('concluir')
    const arquivo = await criarRepositorioBackup(db).montar()
    const exercicioOriginal = cenario.itens[0]!.exercicio

    const destino = bancoDeTeste()
    try {
      const backupDestino = criarRepositorioBackup(destino)
      await backupDestino.aplicar(await backupDestino.planejar(arquivo))

      const noDestino = await destino.exercicios.get(exercicioOriginal.id)
      expect(noDestino).toBeDefined()
      expect(noDestino!.nome).toBe(exercicioOriginal.nome)

      const execucao = (await destino.exerciciosSessao.toArray())[0]!
      expect(execucao.exercicioId).toBe(exercicioOriginal.id)
    } finally {
      await descartar(destino)
    }
  })
})
