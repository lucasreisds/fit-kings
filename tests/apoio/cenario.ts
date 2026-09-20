/**
 * Cenário de integração: um treino montado e pronto para ser executado.
 * Evita que cada teste repita quinze linhas de preparo.
 */
import type { BancoFitKings } from '../../src/dados/db'
import { criarRepositorioExercicios } from '../../src/dados/repositorios/exercicios'
import { criarRepositorioTreinos } from '../../src/dados/repositorios/treinos'
import { criarRepositorioSessoes } from '../../src/dados/repositorios/sessoes'
import type { Relogio } from '../../src/plataforma/tempo'
import type { ValoresPlanejados } from '../../src/domain/treino'

export const TRES_POR_OITO: ValoresPlanejados[] = [
  { repeticoes: 8, cargaKg: 40, rir: 2 },
  { repeticoes: 8, cargaKg: 40, rir: 2 },
  { repeticoes: 8, cargaKg: 40, rir: 1 },
]

export async function montarCenario(
  db: BancoFitKings,
  opcoes: {
    nomeTreino?: string
    exercicios?: readonly { nome: string; series?: ValoresPlanejados[] }[]
    relogio?: Relogio
  } = {},
) {
  const exercicios = criarRepositorioExercicios(db, opcoes.relogio)
  const treinos = criarRepositorioTreinos(db, opcoes.relogio)
  const sessoes = criarRepositorioSessoes(db, opcoes.relogio)

  const treino = await treinos.criar(opcoes.nomeTreino ?? 'Treino A')
  const definicoes = opcoes.exercicios ?? [{ nome: 'Supino reto' }]

  const itens = []
  for (const definicao of definicoes) {
    const exercicio = await exercicios.criar({ nome: definicao.nome, origem: 'catalogo' })
    const item = await treinos.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      series: definicao.series ?? TRES_POR_OITO,
    })
    itens.push({ exercicio, item })
  }

  return { exercicios, treinos, sessoes, treino, itens }
}
