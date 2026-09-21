/**
 * Herança de carga dentro da sessão — FR-085, FR-082, FR-119, Princípio II.
 *
 * A regra, e cada parte dela tem motivo:
 *
 * - A carga informada numa série é herdada pela série **seguinte do mesmo
 *   exercício**. Numa série reta de 4x10 o usuário digita a carga uma vez.
 * - A herança **não alcança a primeira série de um exercício**. Pré-preencher
 *   ali, a partir do plano ou do histórico, é proibido por FR-082: a carga de
 *   hoje é decisão de hoje, e um número já no campo é uma resposta que o
 *   aplicativo deu no lugar do usuário.
 * - A herança **não atravessa exercícios**. A carga do supino não diz nada sobre
 *   a da rosca direta.
 *
 * O valor herdado é **dado efetivo da série**, não sugestão (FR-119): quem
 * consome esta função não deve marcá-lo como provisório, nem como marca d'água,
 * nem em tom diferente.
 */

export type SerieComCarga = {
  readonly ordem: number
  readonly cargaKg: number | null
}

/**
 * Carga de partida da série de número `ordem` dentro de um exercício.
 * `null` significa campo vazio — e é o que a primeira série sempre recebe.
 */
export function cargaHerdada(
  seriesJaRegistradas: readonly SerieComCarga[],
  ordem: number,
): number | null {
  // FR-082: a primeira série de um exercício nunca vem preenchida.
  if (ordem <= 1) return null

  const anteriores = seriesJaRegistradas
    .filter((serie) => serie.ordem < ordem && serie.cargaKg !== null)
    .sort((a, b) => b.ordem - a.ordem)

  return anteriores[0]?.cargaKg ?? null
}
