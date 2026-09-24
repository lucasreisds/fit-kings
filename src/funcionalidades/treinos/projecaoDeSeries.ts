/**
 * Projeção de séries planejadas para o formulário — FR-153, D1.
 *
 * **Este arquivo existe por causa de um defeito, e a forma dele é a correção.**
 *
 * O campo de máximo do intervalo foi entregue quebrado porque a tela
 * reconstruía cada série copiando campos **nomeados um a um**, e alguém
 * esqueceu de acrescentar `repeticoesMax` à lista. O campo ficava sempre vazio,
 * e o pior: gravava a cada tecla sem nunca mostrar o resultado.
 *
 * A causa, portanto, não é o campo esquecido — é **a existência de uma lista
 * que alguém precisa lembrar de atualizar**. Corrigi-la acrescentando mais uma
 * entrada consertaria hoje e reabriria o mesmo buraco no próximo campo.
 *
 * Aqui a projeção é derivada por **omissão** do que não pertence ao formulário,
 * em vez de enumeração do que pertence. Um campo novo em `SeriePlanejada`
 * aparece no formulário sem ninguém tocar neste arquivo; o que não deve
 * aparecer está listado, é curto e é estável.
 */
import type { SeriePlanejada } from '../../domain/tipos'
import type { ValoresPlanejados } from '../../domain/treino'

/**
 * O que pertence ao **registro** e não ao formulário.
 *
 * Identificador e carimbos são do repositório: levá-los ao formulário abriria
 * caminho para a tela reescrevê-los sem querer, e o Princípio IV trata o
 * identificador como imutável.
 */
const CAMPOS_DO_REGISTRO = [
  'id',
  'criadoEm',
  'alteradoEm',
  'deslocamentoLocal',
  'excluidoEm',
  'itemTreinoId',
  'ordem',
] as const

export function projetarSerie(serie: SeriePlanejada): ValoresPlanejados {
  const projetada: Record<string, unknown> = { ...serie }
  for (const campo of CAMPOS_DO_REGISTRO) delete projetada[campo]
  return projetada as unknown as ValoresPlanejados
}

export function projetarSeriesPlanejadas(
  series: readonly SeriePlanejada[],
): readonly ValoresPlanejados[] {
  return series.map(projetarSerie)
}
