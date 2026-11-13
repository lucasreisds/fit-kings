/**
 * Séries planejadas que acompanham a primeira — FR-187 a FR-190.
 *
 * Planejar 4x10 com 40 kg não deve custar quatro vezes a mesma digitação. A
 * série 1 comanda: alterar um campo dela altera o mesmo campo de toda série que
 * estava **idêntica** a ela imediatamente antes.
 *
 * **Acompanhar é estar igual, não uma marca.** Não há campo gravado dizendo
 * quem acompanha quem — a regra olha só os valores. Por isso ela vale do mesmo
 * jeito ao reabrir o treino amanhã ou em outro aparelho após importação, e não
 * acrescenta nada ao esquema nem ao backup (Princípio IV). O efeito colateral,
 * assumido: uma série que volta a ficar igual à primeira volta a acompanhá-la.
 */
import type { ValoresPlanejados } from './validar'

/**
 * `repeticoesMax` é opcional no tipo, e ausente vale o mesmo que nulo. Sem a
 * normalização, uma série criada antes do intervalo existir nunca seria igual a
 * uma criada depois.
 */
function iguais(a: ValoresPlanejados, b: ValoresPlanejados): boolean {
  return (
    a.repeticoes === b.repeticoes &&
    (a.repeticoesMax ?? null) === (b.repeticoesMax ?? null) &&
    a.cargaKg === b.cargaKg &&
    a.rir === b.rir
  )
}

export function espelhar<C extends keyof ValoresPlanejados>(
  atuais: readonly ValoresPlanejados[],
  indice: number,
  campo: C,
  valor: ValoresPlanejados[C],
): readonly ValoresPlanejados[] {
  const alvo = atuais[indice]
  if (!alvo) return atuais

  // FR-189: só a primeira comanda. Não existe cadeia da 2 para a 3.
  if (indice !== 0) {
    return atuais.map((serie, i) => (i === indice ? { ...serie, [campo]: valor } : serie))
  }

  // A igualdade é avaliada contra a primeira **antes** da alteração.
  return atuais.map((serie, i) =>
    i === 0 || iguais(serie, alvo) ? { ...serie, [campo]: valor } : serie,
  )
}
