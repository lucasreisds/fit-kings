/**
 * Roteador mínimo por hash.
 *
 * Não há dependência de roteador porque plan.md não prevê nenhuma, e porque o
 * hash resolve sozinho o caso que mais importa aqui: numa PWA servida como
 * arquivo estático, `#/historico` nunca chega ao servidor, então recarregar em
 * qualquer tela funciona offline sem configuração de fallback.
 */
import { useSyncExternalStore } from 'react'

export type Rota =
  | { readonly nome: 'treinos' }
  | { readonly nome: 'editorTreino'; readonly treinoId: string | null }
  | { readonly nome: 'execucao'; readonly sessaoId: string }
  | { readonly nome: 'historico' }
  | { readonly nome: 'detalheSessao'; readonly sessaoId: string }
  | { readonly nome: 'historicoExercicio'; readonly exercicioId: string }
  | { readonly nome: 'evolucaoExercicio'; readonly exercicioId: string }
  | { readonly nome: 'progresso' }
  | { readonly nome: 'ajustes' }
  | { readonly nome: 'backup' }
  | { readonly nome: 'diagnostico' }

export const ROTA_INICIAL: Rota = { nome: 'treinos' }

export function caminhoDe(rota: Rota): string {
  switch (rota.nome) {
    case 'treinos':
      return '#/treinos'
    case 'editorTreino':
      return rota.treinoId ? `#/treinos/${rota.treinoId}` : '#/treinos/novo'
    case 'execucao':
      return `#/execucao/${rota.sessaoId}`
    case 'historico':
      return '#/historico'
    case 'detalheSessao':
      return `#/historico/${rota.sessaoId}`
    case 'historicoExercicio':
      return `#/exercicio/${rota.exercicioId}`
    case 'evolucaoExercicio':
      return `#/exercicio/${rota.exercicioId}/evolucao`
    case 'progresso':
      return '#/progresso'
    case 'ajustes':
      return '#/ajustes'
    case 'backup':
      return '#/backup'
    case 'diagnostico':
      return '#/diagnostico'
  }
}

export function interpretar(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [primeira, segunda, terceira] = partes

  switch (primeira) {
    case undefined:
    case 'treinos':
      if (segunda === 'novo') return { nome: 'editorTreino', treinoId: null }
      if (segunda) return { nome: 'editorTreino', treinoId: segunda }
      return { nome: 'treinos' }
    case 'execucao':
      return segunda ? { nome: 'execucao', sessaoId: segunda } : ROTA_INICIAL
    case 'historico':
      return segunda ? { nome: 'detalheSessao', sessaoId: segunda } : { nome: 'historico' }
    case 'exercicio':
      if (!segunda) return ROTA_INICIAL
      return terceira === 'evolucao'
        ? { nome: 'evolucaoExercicio', exercicioId: segunda }
        : { nome: 'historicoExercicio', exercicioId: segunda }
    case 'progresso':
      return { nome: 'progresso' }
    case 'ajustes':
      return { nome: 'ajustes' }
    case 'backup':
      return { nome: 'backup' }
    case 'diagnostico':
      return { nome: 'diagnostico' }
    default:
      return ROTA_INICIAL
  }
}

export function navegar(rota: Rota): void {
  globalThis.location.hash = caminhoDe(rota)
}

export function voltar(): void {
  globalThis.history.back()
}

function assinar(aoMudar: () => void): () => void {
  globalThis.addEventListener('hashchange', aoMudar)
  return () => globalThis.removeEventListener('hashchange', aoMudar)
}

function hashAtual(): string {
  return globalThis.location.hash
}

export function useRota(): Rota {
  const hash = useSyncExternalStore(assinar, hashAtual, () => '#/treinos')
  return interpretar(hash)
}
