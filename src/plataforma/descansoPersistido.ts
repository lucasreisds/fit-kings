/**
 * O descanso em andamento, entre recargas — FR-178, FR-183, FR-186.
 *
 * **Não fica no IndexedDB de propósito.** As tabelas de lá são exportadas
 * inteiras no backup, e FR-186 diz que a contagem não entra no histórico nem no
 * arquivo. Guardá-la ali exigiria uma tabela nova, uma migração e uma exclusão
 * explícita na exportação — mais uma regra para alguém lembrar, que é a forma
 * exata dos defeitos das features 003 e 004.
 *
 * Também não fica só na memória: FR-178 exige sobreviver a recarregar a página,
 * e no iOS o navegador descarta abas em segundo plano com frequência.
 *
 * `localStorage`, uma chave. O `sessaoId` viaja junto e é conferido na leitura,
 * de modo que um descanso órfão de uma sessão anterior é descartado mesmo que a
 * limpeza ao concluir o treino tenha falhado.
 */
import type { DescansoEmAndamento } from '../domain/descanso'
import { ehIdValido, ehInstanteValido } from '../domain/tipos/validadores'
import type { Id } from '../domain/tipos'

const CHAVE = 'fit-kings:descanso'

function ehDescanso(valor: unknown): valor is DescansoEmAndamento {
  if (typeof valor !== 'object' || valor === null) return false
  const candidato = valor as Record<string, unknown>
  return (
    typeof candidato.sessaoId === 'string' &&
    ehIdValido(candidato.sessaoId) &&
    typeof candidato.iniciadoEm === 'string' &&
    ehInstanteValido(candidato.iniciadoEm) &&
    typeof candidato.duracaoSegundos === 'number' &&
    Number.isFinite(candidato.duracaoSegundos) &&
    candidato.duracaoSegundos > 0
  )
}

/**
 * O descanso da sessão indicada, se houver.
 *
 * Qualquer coisa fora do esperado — chave ausente, JSON quebrado, sessão
 * diferente — devolve `null`. Este é estado descartável: recusá-lo custa ao
 * usuário um toque para reiniciar o descanso, e nada mais.
 */
export function lerDescanso(sessaoId: Id): DescansoEmAndamento | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto === null) return null

    const valor: unknown = JSON.parse(bruto)
    if (!ehDescanso(valor)) return null
    if (valor.sessaoId !== sessaoId) return null

    return valor
  } catch {
    return null
  }
}

export function gravarDescanso(descanso: DescansoEmAndamento): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(descanso))
  } catch {
    // Armazenamento cheio ou bloqueado: o cronômetro segue valendo nesta
    // sessão de tela e só não sobrevive à recarga. Não é motivo para
    // interromper o treino (Princípio II).
  }
}

export function apagarDescanso(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // Idem.
  }
}
