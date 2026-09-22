/**
 * Regras de domínio de treino — FR-001, FR-007, FR-008, FR-009.
 *
 * TypeScript puro: sem React, sem Dexie, sem DOM, sem relógio. A regra de lint
 * T005 garante isso por ferramenta, e não por disciplina (Princípio V).
 */
import type { Abordagem } from '../tipos/treino'
import { validarIntervalo } from '../serie/intervalo'

export type ProblemaDeValidacao = {
  readonly campo: string
  readonly mensagem: string
}

export type Resultado<T> =
  | { readonly valido: true; readonly valor: T }
  | { readonly valido: false; readonly problemas: readonly ProblemaDeValidacao[] }

export function valido<T>(valor: T): Resultado<T> {
  return { valido: true, valor }
}

export function invalido<T>(problemas: readonly ProblemaDeValidacao[]): Resultado<T> {
  return { valido: false, problemas }
}

/* ------------------------------------------------------------------ *
 * Nome do treino — FR-001
 * ------------------------------------------------------------------ */

export const TAMANHO_MAXIMO_NOME = 80

export function normalizarNome(bruto: string): string {
  return bruto.trim().replace(/\s+/g, ' ')
}

export function validarNomeDeTreino(bruto: string): Resultado<string> {
  const nome = normalizarNome(bruto)
  if (nome.length === 0) {
    return invalido([{ campo: 'nome', mensagem: 'Dê um nome ao treino.' }])
  }
  if (nome.length > TAMANHO_MAXIMO_NOME) {
    return invalido([
      {
        campo: 'nome',
        mensagem: `O nome do treino tem no máximo ${TAMANHO_MAXIMO_NOME} caracteres.`,
      },
    ])
  }
  return valido(nome)
}

/* ------------------------------------------------------------------ *
 * Ordem dos itens — FR-007
 * ------------------------------------------------------------------ */

export type ComOrdem = { readonly ordem: number }

/**
 * A ordem é contígua e começa em 1. Um buraco na sequência não é defeito
 * cosmético: a execução percorre os exercícios por ela (FR-007), e um índice
 * ausente vira exercício pulado sem que ninguém tenha pulado.
 */
export function ordemEhContigua(itens: readonly ComOrdem[]): boolean {
  if (itens.length === 0) return true
  const ordens = itens.map((item) => item.ordem).sort((a, b) => a - b)
  return ordens.every((ordem, indice) => ordem === indice + 1)
}

export function validarOrdem<T extends ComOrdem>(itens: readonly T[]): Resultado<readonly T[]> {
  if (!ordemEhContigua(itens)) {
    return invalido([
      { campo: 'ordem', mensagem: 'A ordem dos exercícios precisa ser contígua a partir de 1.' },
    ])
  }
  return valido(itens)
}

/** Numera de 1 a N seguindo a posição no array, sem reordenar. Função pura. */
export function numerarPorPosicao<T extends ComOrdem>(itens: readonly T[]): T[] {
  return itens.map((item, indice) => ({ ...item, ordem: indice + 1 }))
}

/** Renumera de 1 a N preservando a sequência corrente de `ordem`. Função pura. */
export function renumerar<T extends ComOrdem>(itens: readonly T[]): T[] {
  return numerarPorPosicao([...itens].sort((a, b) => a.ordem - b.ordem))
}

/**
 * Move um item de posição e renumera. Índices de base zero.
 *
 * A renumeração final segue a **posição no array**, não o campo `ordem`: os
 * itens ainda carregam a numeração antiga depois do splice, e reordenar por ela
 * desfaria exatamente o movimento que acabou de ser feito.
 */
export function mover<T extends ComOrdem>(itens: readonly T[], de: number, para: number): T[] {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem)
  if (de < 0 || de >= ordenados.length || para < 0 || para >= ordenados.length) {
    return numerarPorPosicao(ordenados)
  }
  const [removido] = ordenados.splice(de, 1)
  if (removido) ordenados.splice(para, 0, removido)
  return numerarPorPosicao(ordenados)
}

/* ------------------------------------------------------------------ *
 * Série planejada — FR-008, FR-009
 * ------------------------------------------------------------------ */

export type ValoresPlanejados = {
  /** Mínimo do intervalo de repetições (FR-139, FR-140). */
  readonly repeticoes: number
  /** Máximo. `null` = ponta única. */
  readonly repeticoesMax?: number | null
  readonly cargaKg: number
  readonly rir: number | null
}

/** Menor incremento de carga que uma academia comum oferece. */
export const INCREMENTO_DE_CARGA = 0.5

export function validarSeriePlanejada(valores: ValoresPlanejados): Resultado<ValoresPlanejados> {
  const problemas: ProblemaDeValidacao[] = []

  // FR-143: a regra do intervalo vive num lugar só, e é a mesma que a
  // importação usa. Duplicá-la aqui abriria espaço para as duas divergirem.
  for (const problema of validarIntervalo({
    repeticoes: valores.repeticoes,
    repeticoesMax: valores.repeticoesMax ?? null,
  })) {
    problemas.push(problema)
  }

  // Zero é carga válida: peso corporal.
  if (!Number.isFinite(valores.cargaKg) || valores.cargaKg < 0) {
    problemas.push({ campo: 'cargaKg', mensagem: 'A carga é zero ou mais. Use 0 para peso corporal.' })
  }

  if (valores.rir !== null && (!Number.isInteger(valores.rir) || valores.rir < 0)) {
    problemas.push({ campo: 'rir', mensagem: 'O RIR é um número inteiro de 0 para cima.' })
  }

  return problemas.length > 0 ? invalido(problemas) : valido(valores)
}

/* ------------------------------------------------------------------ *
 * Item de treino
 * ------------------------------------------------------------------ */

export type ItemParaValidar = {
  readonly exercicioId: string
  readonly abordagem: Abordagem
  readonly series: readonly ValoresPlanejados[]
}

export function validarItemDeTreino(item: ItemParaValidar): Resultado<ItemParaValidar> {
  const problemas: ProblemaDeValidacao[] = []

  if (item.exercicioId.length === 0) {
    problemas.push({ campo: 'exercicioId', mensagem: 'Escolha um exercício.' })
  }
  if (item.series.length === 0) {
    problemas.push({ campo: 'series', mensagem: 'Planeje ao menos uma série.' })
  }

  item.series.forEach((serie, indice) => {
    const resultado = validarSeriePlanejada(serie)
    if (!resultado.valido) {
      for (const problema of resultado.problemas) {
        problemas.push({ campo: `series[${indice}].${problema.campo}`, mensagem: problema.mensagem })
      }
    }
  })

  return problemas.length > 0 ? invalido(problemas) : valido(item)
}

/* ------------------------------------------------------------------ *
 * Treino completo
 * ------------------------------------------------------------------ */

export type TreinoParaValidar = {
  readonly nome: string
  readonly itens: readonly (ItemParaValidar & ComOrdem)[]
}

export function validarTreino(treino: TreinoParaValidar): Resultado<TreinoParaValidar> {
  const problemas: ProblemaDeValidacao[] = []

  const nome = validarNomeDeTreino(treino.nome)
  if (!nome.valido) problemas.push(...nome.problemas)

  const ordem = validarOrdem(treino.itens)
  if (!ordem.valido) problemas.push(...ordem.problemas)

  treino.itens.forEach((item, indice) => {
    const resultado = validarItemDeTreino(item)
    if (!resultado.valido) {
      for (const problema of resultado.problemas) {
        problemas.push({ campo: `itens[${indice}].${problema.campo}`, mensagem: problema.mensagem })
      }
    }
  })

  return problemas.length > 0 ? invalido(problemas) : valido(treino)
}
