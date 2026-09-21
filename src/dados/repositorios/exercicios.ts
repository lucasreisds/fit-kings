/**
 * Repositório de exercícios — FR-071 a FR-077.
 *
 * Catálogo e personalizado são a mesma tabela e o mesmo tratamento (FR-077): a
 * origem é descritiva, não muda regra nenhuma de execução, histórico ou
 * progressão.
 *
 * `ocultoEm` e `excluidoEm` são campos distintos porque significam coisas
 * distintas: ocultar tira o exercício de **novas seleções** e preserva tudo o
 * que já foi registrado (FR-076); excluir é a exclusão lógica do Princípio IV,
 * e FR-076 a proíbe justamente para quem tem histórico.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type { Exercicio, Id, OrigemExercicio } from '../../domain/tipos'
import { criarRepositorio, RegistroNaoEncontradoError } from './base'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'

export type NovoExercicio = {
  readonly nome: string
  readonly origem: OrigemExercicio
  readonly grupoMuscular?: string | null
  readonly equipamento?: string | null
  readonly id?: Id
}

export class ExercicioComHistoricoError extends Error {
  readonly exercicioId: Id

  constructor(exercicioId: Id) {
    super(
      'Este exercício tem execuções no histórico e não pode ser excluído. Oculte-o para tirá-lo de novas seleções.',
    )
    this.name = 'ExercicioComHistoricoError'
    this.exercicioId = exercicioId
  }
}

export type FiltroDeExercicio = {
  readonly busca?: string
  readonly grupoMuscular?: string | null
  readonly incluirOcultos?: boolean
}

export type RepositorioExercicios = {
  criar(dados: NovoExercicio): Promise<Exercicio>
  obter(id: Id): Promise<Exercicio | undefined>
  obterVarios(ids: readonly Id[]): Promise<Map<Id, Exercicio>>
  /** Selecionáveis: ativos e não ocultos. */
  listarSelecionaveis(): Promise<Exercicio[]>
  listarTodos(): Promise<Exercicio[]>
  buscar(filtro: FiltroDeExercicio): Promise<Exercicio[]>
  gruposMusculares(): Promise<string[]>
  renomear(id: Id, nome: string): Promise<Exercicio>
  atualizar(id: Id, dados: Partial<Omit<NovoExercicio, 'id'>>): Promise<Exercicio>
  ocultar(id: Id): Promise<Exercicio>
  reexibir(id: Id): Promise<Exercicio>
  temHistorico(id: Id): Promise<boolean>
  /** Recusa se houver histórico; nesse caso o caminho é `ocultar` (FR-076). */
  excluir(id: Id): Promise<void>
}

export function criarRepositorioExercicios(
  db: BancoFitKings = bancoPadrao,
  relogio: Relogio = relogioDoSistema,
): RepositorioExercicios {
  const base = criarRepositorio<Exercicio>(db.exercicios, relogio)

  async function exigir(id: Id): Promise<Exercicio> {
    const exercicio = await db.exercicios.get(id)
    if (!exercicio) throw new RegistroNaoEncontradoError(id)
    return exercicio
  }

  async function temHistorico(id: Id): Promise<boolean> {
    const registro = await db.exerciciosSessao.where('exercicioId').equals(id).first()
    return registro !== undefined
  }

  return {
    async criar(dados) {
      return base.criar({
        nome: dados.nome.trim(),
        origem: dados.origem,
        grupoMuscular: dados.grupoMuscular ?? null,
        equipamento: dados.equipamento ?? null,
        ocultoEm: null,
        ...(dados.id ? { id: dados.id } : {}),
      } as never)
    },

    obter: (id) => db.exercicios.get(id),

    async obterVarios(ids) {
      if (ids.length === 0) return new Map()
      const encontrados = await db.exercicios.bulkGet([...new Set(ids)])
      const mapa = new Map<Id, Exercicio>()
      for (const exercicio of encontrados) {
        if (exercicio) mapa.set(exercicio.id, exercicio)
      }
      return mapa
    },

    async listarSelecionaveis() {
      const ativos = await base.listarAtivos()
      return ativos.filter((e) => e.ocultoEm === null).sort(porNome)
    },

    async listarTodos() {
      return (await base.listarAtivos()).sort(porNome)
    },

    async buscar(filtro) {
      const ativos = await base.listarAtivos()
      const termo = normalizar(filtro.busca ?? '')

      return ativos
        .filter((exercicio) => {
          if (!filtro.incluirOcultos && exercicio.ocultoEm !== null) return false
          if (filtro.grupoMuscular != null && exercicio.grupoMuscular !== filtro.grupoMuscular) {
            return false
          }
          if (termo.length === 0) return true
          return (
            normalizar(exercicio.nome).includes(termo) ||
            normalizar(exercicio.grupoMuscular ?? '').includes(termo) ||
            normalizar(exercicio.equipamento ?? '').includes(termo)
          )
        })
        .sort(porNome)
    },

    async gruposMusculares() {
      const ativos = await base.listarAtivos()
      const grupos = new Set<string>()
      for (const exercicio of ativos) {
        if (exercicio.grupoMuscular) grupos.add(exercicio.grupoMuscular)
      }
      return [...grupos].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    },

    // Renomear é alteração de exibição. O `id` não é tocado, e é por isso que
    // as execuções anteriores continuam vinculadas (FR-041, FR-073, FR-074).
    async renomear(id, nome) {
      return base.atualizar(id, { nome: nome.trim() } as never)
    },

    async atualizar(id, dados) {
      return base.atualizar(id, dados as never)
    },

    async ocultar(id) {
      await exigir(id)
      return base.atualizar(id, { ocultoEm: relogio.agora() } as never)
    },

    async reexibir(id) {
      await exigir(id)
      return base.atualizar(id, { ocultoEm: null } as never)
    },

    temHistorico,

    async excluir(id) {
      await exigir(id)
      if (await temHistorico(id)) throw new ExercicioComHistoricoError(id)
      await base.excluir(id)
    },
  }
}

function porNome(a: Exercicio, b: Exercicio): number {
  return a.nome.localeCompare(b.nome, 'pt-BR')
}

/** Busca sem acento e sem caixa — "supino" encontra "Supino inclinado". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export const repositorioExercicios = criarRepositorioExercicios()
