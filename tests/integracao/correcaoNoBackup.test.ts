import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { criarRepositorioBackup } from '../../src/dados/repositorios/backup'
import { validar } from '../../src/domain/backup/validar'

/**
 * T095, T096 — FR-102, SC-031, contrato § achatamento e § 4.
 *
 * O arquivo carrega a sessão **achatada na versão vigente**, com `corrigida` e
 * `alteradoEm`. Na volta, `alteradoEm` é a chave da comparação: mais recente
 * entra como versão nova preservando a anterior; igual ou anterior é operação
 * nula.
 *
 * Esta é a propagação de correção admitida pelo Princípio I — a importação não
 * inventa alteração, apenas propaga a que o próprio usuário fez em outro
 * aparelho.
 */
describe('correção atravessando o arquivo de backup', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function sessaoConcluida(banco: BancoFitKings) {
    const cenario = await montarCenario(banco)
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

    for (const ordem of [1, 2]) {
      await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
        ordem,
        cargaKg: 40,
        repeticoes: 8,
        rir: 1,
        seriePlanejadaId: null,
      })
    }
    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
    return { cenario, sessao: (await cenario.sessoes.obter(sessao.sessao.id))! }
  }

  it('o arquivo carrega a versão vigente, com corrigida e alteradoEm (§ achatamento)', async () => {
    const { cenario, sessao } = await sessaoConcluida(db)
    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 10 },
    ])

    const arquivo = await criarRepositorioBackup(db).montar()

    expect(arquivo.sessoes).toHaveLength(1)
    expect(arquivo.sessoes[0]!.corrigida).toBe(true)
    expect(arquivo.sessoes[0]!.alteradoEm).toBeTruthy()

    // Só a versão vigente atravessa: 2 séries, com o valor corrigido.
    expect(arquivo.seriesRealizadas).toHaveLength(2)
    expect(arquivo.seriesRealizadas.map((s) => s.repeticoes).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([8, 10])

    // As versões anteriores não são exportadas (decisão do proprietário, D8).
    expect(arquivo).not.toHaveProperty('sessaoVersoes')
    expect(validar(arquivo).valido).toBe(true)
  })

  it('arquivo mais recente entra como nova versão local, preservando a anterior (FR-102)', async () => {
    // Aparelho A: registra e corrige.
    const { cenario: cenarioA, sessao: sessaoA } = await sessaoConcluida(db)

    const destino = bancoDeTeste()
    try {
      // Aparelho B recebe a versão original.
      const original = await criarRepositorioBackup(db).montar()
      const backupB = criarRepositorioBackup(destino)
      await backupB.aplicar(await backupB.planejar(original))
      expect(await destino.sessoes.count()).toBe(1)

      // Aparelho A corrige depois.
      await new Promise((resolver) => setTimeout(resolver, 5))
      await cenarioA.sessoes.corrigir(sessaoA.sessao.id, [
        { serieId: sessaoA.exercicios[0]!.series[0]!.id, repeticoes: 10 },
      ])

      const corrigido = await criarRepositorioBackup(db).montar()
      const plano = await backupB.planejar(corrigido)

      expect(plano.sessoes).toHaveLength(1)
      expect(plano.sessoes[0]!.tipo).toBe('nova_versao')

      const resumo = await backupB.aplicar(plano)
      expect(resumo.sessoesComNovaVersao).toBe(1)

      // Uma sessão, duas versões: a anterior foi preservada (Princípio I).
      expect(await destino.sessoes.count()).toBe(1)
      const versoes = await destino.sessaoVersoes.toArray()
      expect(versoes).toHaveLength(2)
      expect(versoes.filter((v) => v.vigente === 1)).toHaveLength(1)

      // A leitura corrente traz os valores corrigidos.
      const sessaoNoDestino = (await destino.sessoes.toArray())[0]!
      const exerciciosVigentes = await destino.exerciciosSessao
        .where('sessaoVersaoId')
        .equals(sessaoNoDestino.versaoVigenteId)
        .toArray()
      const seriesVigentes = await destino.seriesRealizadas
        .where('exercicioSessaoId')
        .equals(exerciciosVigentes[0]!.id)
        .toArray()

      expect(seriesVigentes.map((s) => s.repeticoes).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([8, 10])
      expect(sessaoNoDestino.corrigida).toBe(true)
    } finally {
      await descartar(destino)
    }
  })

  it('arquivo igual ou anterior ao local é operação nula (FR-102, SC-031)', async () => {
    const { cenario, sessao } = await sessaoConcluida(db)
    const arquivoOriginal = await criarRepositorioBackup(db).montar()

    // O local corrige — passa a ser mais recente que o arquivo.
    await new Promise((resolver) => setTimeout(resolver, 5))
    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 12 },
    ])

    const backup = criarRepositorioBackup(db)
    const plano = await backup.planejar(arquivoOriginal)

    expect(plano.sessoes).toHaveLength(0)
    expect(plano.sessoesIgnoradas[0]!.motivo).toBe('local_mais_recente')

    const versoesAntes = await db.sessaoVersoes.count()
    await backup.aplicar(plano)

    // Nada mudou: a correção local não foi desfeita pelo arquivo antigo.
    expect(await db.sessaoVersoes.count()).toBe(versoesAntes)
    const lida = await cenario.sessoes.obter(sessao.sessao.id)
    expect(lida!.exercicios[0]!.series.map((s) => s.repeticoes).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([8, 12])
  })

  it('reimportar o arquivo corrigido não cria uma terceira versão (FR-104)', async () => {
    const { cenario, sessao } = await sessaoConcluida(db)
    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 10 },
    ])
    const arquivo = await criarRepositorioBackup(db).montar()

    const destino = bancoDeTeste()
    try {
      const backupB = criarRepositorioBackup(destino)
      await backupB.aplicar(await backupB.planejar(arquivo))
      const versoesDepoisDaPrimeira = await destino.sessaoVersoes.count()

      await backupB.aplicar(await backupB.planejar(arquivo))

      expect(await destino.sessaoVersoes.count()).toBe(versoesDepoisDaPrimeira)
      expect(await destino.sessoes.count()).toBe(1)
    } finally {
      await descartar(destino)
    }
  })
})
