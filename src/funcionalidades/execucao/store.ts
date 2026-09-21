/**
 * Estado da sessão em andamento — D5, FR-030.
 *
 * **A memória é cache de leitura; o banco é a fonte de verdade.** O que vive
 * aqui é apenas o *rascunho* da série que está sendo digitada — valores ainda
 * não confirmados — e qual exercício está em foco. Tudo o que foi confirmado
 * está no IndexedDB e é lido de lá.
 *
 * A divisão importa: numa PWA o navegador descarta abas em segundo plano sob
 * pressão de memória, e no iOS isso é frequente. Rascunho perdido numa recarga é
 * aceitável — o usuário ainda não confirmou. Série confirmada perdida seria
 * violação do Princípio I, e por isso ela nunca passa por aqui.
 *
 * O store sobrevive à navegação dentro do aplicativo, que é o que FR-030 pede:
 * ir ao histórico e voltar não apaga o que já estava preenchido na tela.
 */
import { create } from 'zustand'
import type { Id } from '../../domain/tipos'

export type Rascunho = {
  readonly cargaKg: number | null
  readonly repeticoes: number | null
  readonly rir: number | null
}

export const RASCUNHO_VAZIO: Rascunho = { cargaKg: null, repeticoes: null, rir: null }

type EstadoDaExecucao = {
  readonly sessaoId: Id | null
  readonly exercicioEmFoco: Id | null
  /** Um rascunho por exercício da sessão. */
  readonly rascunhos: Readonly<Record<Id, Rascunho>>

  abrir(sessaoId: Id): void
  focar(exercicioSessaoId: Id): void
  definirRascunho(exercicioSessaoId: Id, alteracao: Partial<Rascunho>): void
  limparRascunho(exercicioSessaoId: Id): void
  /**
   * Zera tudo ao encerrar a sessão. Sem isso, o rascunho de uma sessão
   * encerrada reapareceria na seguinte.
   */
  encerrar(): void
}

export const useExecucao = create<EstadoDaExecucao>((definir) => ({
  sessaoId: null,
  exercicioEmFoco: null,
  rascunhos: {},

  abrir(sessaoId) {
    definir((estado) =>
      estado.sessaoId === sessaoId
        ? estado
        : { ...estado, sessaoId, exercicioEmFoco: null, rascunhos: {} },
    )
  },

  focar(exercicioSessaoId) {
    definir({ exercicioEmFoco: exercicioSessaoId })
  },

  definirRascunho(exercicioSessaoId, alteracao) {
    definir((estado) => ({
      rascunhos: {
        ...estado.rascunhos,
        [exercicioSessaoId]: {
          ...(estado.rascunhos[exercicioSessaoId] ?? RASCUNHO_VAZIO),
          ...alteracao,
        },
      },
    }))
  },

  limparRascunho(exercicioSessaoId) {
    definir((estado) => {
      const { [exercicioSessaoId]: _removido, ...resto } = estado.rascunhos
      return { rascunhos: resto }
    })
  },

  encerrar() {
    definir({ sessaoId: null, exercicioEmFoco: null, rascunhos: {} })
  },
}))

export function rascunhoDe(rascunhos: Readonly<Record<Id, Rascunho>>, id: Id): Rascunho {
  return rascunhos[id] ?? RASCUNHO_VAZIO
}
