/**
 * Versionamento de sessão na correção — FR-112 a FR-118, D8, Princípio I.
 *
 * A correção **nunca sobrescreve**. Ela grava uma versão nova e preserva
 * integralmente a anterior; toda leitura passa a usar a vigente. O Princípio I
 * é explícito: nenhuma operação sobrescreve, mescla ou remove uma sessão já
 * concluída, qualquer que seja a origem.
 *
 * O que a correção pode mudar é fechado e curto — `cargaKg`, `repeticoes` e
 * `rir` de séries que já existem (FR-112). **Não pode** acrescentar nem remover
 * série ou exercício, nem trocar a abordagem (FR-113): isso não seria corrigir
 * um erro de digitação, seria reescrever o que aconteceu.
 *
 * Este módulo é função pura: decide o que a versão nova contém. Quem grava é o
 * repositório, em transação.
 */
import type { Id } from '../tipos/base'
import type { SerieRealizada } from '../tipos/sessao'

/** Os três campos corrigíveis, e nada além deles (FR-112). */
export type CorrecaoDeSerie = {
  readonly serieId: Id
  readonly cargaKg?: number | null
  readonly repeticoes?: number | null
  readonly rir?: number | null
}

export type ProblemaDaCorrecao = {
  readonly codigo:
    | 'serie_inexistente'
    | 'sem_alteracao'
    | 'valor_invalido'
    | 'serie_duplicada'
  readonly mensagem: string
  readonly serieId?: Id
}

export type ResultadoDaCorrecao =
  | { readonly valido: true; readonly correcoes: readonly CorrecaoDeSerie[] }
  | { readonly valido: false; readonly problemas: readonly ProblemaDaCorrecao[] }

/**
 * Valida um conjunto de correções contra as séries da versão vigente.
 *
 * Recusa qualquer `serieId` que não exista nela — é o que impede, por
 * construção, acrescentar série por meio da correção (FR-113).
 */
export function validarCorrecao(
  seriesVigentes: readonly SerieRealizada[],
  correcoes: readonly CorrecaoDeSerie[],
): ResultadoDaCorrecao {
  const problemas: ProblemaDaCorrecao[] = []
  const porId = new Map(seriesVigentes.map((serie) => [serie.id, serie]))
  const vistos = new Set<Id>()

  for (const correcao of correcoes) {
    const original = porId.get(correcao.serieId)

    if (!original) {
      problemas.push({
        codigo: 'serie_inexistente',
        serieId: correcao.serieId,
        mensagem: 'A correção só alcança séries que já existem nesta sessão.',
      })
      continue
    }

    if (vistos.has(correcao.serieId)) {
      problemas.push({
        codigo: 'serie_duplicada',
        serieId: correcao.serieId,
        mensagem: 'A mesma série aparece duas vezes na correção.',
      })
      continue
    }
    vistos.add(correcao.serieId)

    if (correcao.repeticoes !== undefined && correcao.repeticoes !== null) {
      if (!Number.isInteger(correcao.repeticoes) || correcao.repeticoes < 0) {
        problemas.push({
          codigo: 'valor_invalido',
          serieId: correcao.serieId,
          mensagem: 'As repetições são um número inteiro de 0 para cima.',
        })
      }
    }
    if (correcao.cargaKg !== undefined && correcao.cargaKg !== null) {
      if (!Number.isFinite(correcao.cargaKg) || correcao.cargaKg < 0) {
        problemas.push({
          codigo: 'valor_invalido',
          serieId: correcao.serieId,
          mensagem: 'A carga é zero ou mais.',
        })
      }
    }
    if (correcao.rir !== undefined && correcao.rir !== null) {
      if (!Number.isInteger(correcao.rir) || correcao.rir < 0) {
        problemas.push({
          codigo: 'valor_invalido',
          serieId: correcao.serieId,
          mensagem: 'O RIR é um número inteiro de 0 para cima.',
        })
      }
    }
  }

  const efetivas = correcoes.filter((correcao) => {
    const original = porId.get(correcao.serieId)
    if (!original) return false
    return (
      (correcao.cargaKg !== undefined && correcao.cargaKg !== original.cargaKg) ||
      (correcao.repeticoes !== undefined && correcao.repeticoes !== original.repeticoes) ||
      (correcao.rir !== undefined && correcao.rir !== original.rir)
    )
  })

  if (problemas.length > 0) return { valido: false, problemas }

  if (efetivas.length === 0) {
    return {
      valido: false,
      problemas: [
        {
          codigo: 'sem_alteracao',
          mensagem: 'Nenhum valor mudou. Uma versão nova só é criada quando há o que corrigir.',
        },
      ],
    }
  }

  return { valido: true, correcoes: efetivas }
}

/**
 * Aplica as correções sobre as séries da versão vigente, produzindo as séries
 * da versão nova.
 *
 * O conjunto de séries é o mesmo — mesma quantidade, mesma ordem, mesmo vínculo
 * com a série planejada. Só os três valores corrigíveis mudam. `naoRealizada`,
 * `degraus` e `seriePlanejadaId` atravessam intactos.
 */
export function aplicarCorrecao(
  seriesVigentes: readonly SerieRealizada[],
  correcoes: readonly CorrecaoDeSerie[],
): SerieRealizada[] {
  const porId = new Map(correcoes.map((correcao) => [correcao.serieId, correcao]))

  return seriesVigentes.map((serie) => {
    const correcao = porId.get(serie.id)
    if (!correcao) return serie

    return {
      ...serie,
      cargaKg: correcao.cargaKg !== undefined ? correcao.cargaKg : serie.cargaKg,
      repeticoes: correcao.repeticoes !== undefined ? correcao.repeticoes : serie.repeticoes,
      rir: correcao.rir !== undefined ? correcao.rir : serie.rir,
    }
  })
}

/** O número da versão nova. Sequencial dentro da sessão, começando em 1. */
export function proximoNumeroDeVersao(numerosExistentes: readonly number[]): number {
  return numerosExistentes.reduce((maior, numero) => Math.max(maior, numero), 0) + 1
}
