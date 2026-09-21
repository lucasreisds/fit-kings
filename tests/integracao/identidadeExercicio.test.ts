import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { criarRepositorioHistorico } from '../../src/dados/repositorios/historico'
import { agregarEvolucao } from '../../src/domain/evolucao/agregar'
import { avaliarProgressao } from '../../src/domain/progressao/avaliar'
import type { OrigemExercicio } from '../../src/domain/tipos'

/**
 * T131 — SC-019, FR-041, FR-073, FR-074.
 *
 * **Renomear um exercício preserva o histórico.** O vínculo é sempre o `id`
 * estável, nunca o nome de exibição — e o teste verifica os quatro consumidores
 * desse vínculo de uma vez: a consulta de FR-039, a evolução de cargas, a
 * avaliação de progressão e o próprio registro em `exerciciosSessao`.
 *
 * Vale igualmente para exercício de catálogo e personalizado, porque FR-077 os
 * trata como equivalentes — daí o teste rodar duas vezes.
 */
describe.each<OrigemExercicio>(['catalogo', 'personalizado'])(
  'identidade do exercício de origem "%s"',
  (origem) => {
    let db: BancoFitKings

    beforeEach(() => {
      db = bancoDeTeste()
    })

    afterEach(async () => {
      await descartar(db)
    })

    /** Três sessões concluídas com o mesmo exercício, cargas crescentes. */
    async function tresSessoes() {
      const cenario = await montarCenario(db, {
        exercicios: [
          {
            nome: 'Supino',
            series: [
              { repeticoes: 8, cargaKg: 40, rir: 2 },
              { repeticoes: 8, cargaKg: 40, rir: 2 },
            ],
          },
        ],
      })

      const item = cenario.itens[0]!
      await cenario.exercicios.atualizar(item.exercicio.id, { origem })

      for (const [indice, carga] of [40, 42.5, 45].entries()) {
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

        const exercicioSessaoId = sessao.exercicios[0]!.exercicio.id
        for (const ordem of [1, 2]) {
          await cenario.sessoes.registrarSerie(exercicioSessaoId, {
            ordem,
            cargaKg: carga,
            repeticoes: 9 + indice,
            rir: 2,
            seriePlanejadaId: null,
          })
        }
        await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
      }

      return { cenario, exercicio: item.exercicio }
    }

    it('renomear preserva as três execuções, a evolução e a progressão', async () => {
      const { cenario, exercicio } = await tresSessoes()
      const historico = criarRepositorioHistorico(db)

      // --- Antes da renomeação ---
      const execucoesAntes = await historico.execucoesDoExercicio(exercicio.id)
      const evolucaoAntes = agregarEvolucao(
        execucoesAntes.map((execucao) => ({
          sessaoId: execucao.sessaoId,
          concluidaEm: execucao.concluidaEm,
          series: execucao.series,
        })),
      )
      const planejadas = [
        { ordem: 1, repeticoes: 8, cargaKg: 45, rir: 2 },
        { ordem: 2, repeticoes: 8, cargaKg: 45, rir: 2 },
      ]
      const progressaoAntes = avaliarProgressao({
        planejadas,
        realizadas: execucoesAntes[0]!.series,
      })

      expect(execucoesAntes).toHaveLength(3)
      expect(evolucaoAntes).toHaveLength(3)

      // --- Renomear ---
      const renomeado = await cenario.exercicios.renomear(
        exercicio.id,
        'Supino reto com barra olímpica',
      )
      expect(renomeado.id).toBe(exercicio.id)
      expect(renomeado.nome).not.toBe(exercicio.nome)

      // --- Depois ---
      const execucoesDepois = await historico.execucoesDoExercicio(exercicio.id)

      // As três continuam vinculadas ao mesmo id (FR-073, FR-074).
      expect(execucoesDepois).toHaveLength(3)
      expect(
        execucoesDepois.every((execucao) => execucao.exercicioSessao.exercicioId === exercicio.id),
      ).toBe(true)

      // A consulta de FR-039 devolve as mesmas três, na mesma ordem.
      expect(execucoesDepois.map((e) => e.sessaoId)).toEqual(execucoesAntes.map((e) => e.sessaoId))

      // A evolução produz os mesmos pontos, valor a valor.
      const evolucaoDepois = agregarEvolucao(
        execucoesDepois.map((execucao) => ({
          sessaoId: execucao.sessaoId,
          concluidaEm: execucao.concluidaEm,
          series: execucao.series,
        })),
      )
      expect(evolucaoDepois).toEqual(evolucaoAntes)
      expect(evolucaoDepois.map((ponto) => ponto.cargaMaximaKg)).toEqual([40, 42.5, 45])

      // E a avaliação de progressão não muda.
      expect(
        avaliarProgressao({ planejadas, realizadas: execucoesDepois[0]!.series }),
      ).toEqual(progressaoAntes)
    })

    it('renomear não cria um segundo exercício', async () => {
      const { cenario, exercicio } = await tresSessoes()
      const antes = await db.exercicios.count()

      await cenario.exercicios.renomear(exercicio.id, 'Outro nome completamente diferente')

      expect(await db.exercicios.count()).toBe(antes)
      expect((await db.exercicios.get(exercicio.id))?.nome).toBe(
        'Outro nome completamente diferente',
      )
    })

    it('duas renomeações seguidas continuam preservando o histórico', async () => {
      const { cenario, exercicio } = await tresSessoes()
      const historico = criarRepositorioHistorico(db)

      await cenario.exercicios.renomear(exercicio.id, 'Nome intermediário')
      await cenario.exercicios.renomear(exercicio.id, 'Nome final')

      const execucoes = await historico.execucoesDoExercicio(exercicio.id)
      expect(execucoes).toHaveLength(3)
      expect((await db.exercicios.get(exercicio.id))?.nome).toBe('Nome final')
    })

    it('o exercício com histórico aparece na lista de consulta mesmo renomeado', async () => {
      const { cenario, exercicio } = await tresSessoes()
      const historico = criarRepositorioHistorico(db)

      await cenario.exercicios.renomear(exercicio.id, 'Renomeado')
      const comHistorico = await historico.exerciciosComHistorico()

      expect(comHistorico.map((e) => e.id)).toContain(exercicio.id)
      expect(comHistorico.find((e) => e.id === exercicio.id)?.nome).toBe('Renomeado')
    })
  },
)
