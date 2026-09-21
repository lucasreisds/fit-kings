/**
 * Transições de estado da sessão — FR-025, FR-026, data-model.md.
 *
 * ```text
 *   em_andamento ──concluir──> concluida
 *        │
 *        └──descartar──────> descartada
 * ```
 *
 * **Não há transição de volta a `em_andamento`.** Uma sessão concluída que
 * pudesse reabrir seria uma sessão concluída que muda, e o Princípio I não
 * admite: a correção de valores existe para isso, e ela cria versão nova em vez
 * de reabrir o registro (FR-112 a FR-118).
 */
import type { EstadoSessao } from '../tipos/sessao'

export type Transicao = 'concluir' | 'descartar'

const PERMITIDAS: Record<Transicao, { de: EstadoSessao; para: EstadoSessao }> = {
  concluir: { de: 'em_andamento', para: 'concluida' },
  descartar: { de: 'em_andamento', para: 'descartada' },
}

export function podeTransicionar(atual: EstadoSessao, transicao: Transicao): boolean {
  return PERMITIDAS[transicao].de === atual
}

export function proximoEstado(atual: EstadoSessao, transicao: Transicao): EstadoSessao {
  if (!podeTransicionar(atual, transicao)) {
    throw new TransicaoInvalidaError(atual, transicao)
  }
  return PERMITIDAS[transicao].para
}

/** Entra no histórico e na exportação. As outras não (contrato). */
export function integraHistorico(estado: EstadoSessao): boolean {
  return estado === 'concluida'
}

export function estaEncerrada(estado: EstadoSessao): boolean {
  return estado !== 'em_andamento'
}

export class TransicaoInvalidaError extends Error {
  readonly atual: EstadoSessao
  readonly transicao: Transicao

  constructor(atual: EstadoSessao, transicao: Transicao) {
    super(`Não é possível ${transicao} uma sessão com estado "${atual}".`)
    this.name = 'TransicaoInvalidaError'
    this.atual = atual
    this.transicao = transicao
  }
}
