/**
 * O campo de carga da série em digitação — FR-167 a FR-169.
 *
 * **Este arquivo existe por causa de um defeito, e a forma dele é a correção.**
 *
 * O rascunho guardava a carga como `number | null`, e `null` respondia a duas
 * perguntas diferentes: "o usuário não mexeu, mostre o valor herdado da série
 * anterior" e "o usuário apagou o campo". A tela exibia
 * `rascunho.cargaKg ?? cargaHerdada(...)`, então o instante em que o usuário
 * apagava o último dígito era exatamente o instante em que a herança voltava.
 *
 * Com 45 kg herdados, dava para chegar a 49 — apagando só o segundo dígito — e
 * não dava para chegar a 50 de jeito nenhum. Isso contraria o Princípio II, que
 * exige que a carga herdada permaneça **editável**, não editável pela metade.
 *
 * `undefined` não serviria como terceiro estado: `definirRascunho` recebe um
 * `Partial<Rascunho>`, onde `undefined` já significa "não altere este campo".
 * Um booleano ao lado do valor seria pior — dois campos que alguém precisa
 * lembrar de manter em sincronia, que é a causa dos defeitos das features 003
 * e 004, uma vez por lista de campos e outra por campo opcional.
 *
 * Aqui o valor carrega a própria origem, e o estado ambíguo não tem como ser
 * escrito.
 */

export type CampoDeCarga =
  /** O usuário não tocou no campo nesta série. */
  | { readonly origem: 'herdado' }
  /** O usuário digitou — ou apagou, e aí `valor` é `null`. */
  | { readonly origem: 'usuario'; readonly valor: number | null }

export const CARGA_HERDADA: CampoDeCarga = { origem: 'herdado' }

/** O que o usuário digitou, inclusive o vazio. */
export function cargaDigitada(valor: number | null): CampoDeCarga {
  return { origem: 'usuario', valor }
}

/**
 * A carga que vale para esta série.
 *
 * É a mesma função para exibir e para gravar. Ter uma conta só é o que faz o
 * registro coincidir com o que estava na tela: confirmar com o campo apagado
 * grava a série sem carga, porque é isso que o campo apagado quer dizer
 * (FR-169). Reaplicar a herança na confirmação gravaria um número que o usuário
 * acabou de apagar, que é o defeito da 0.2.2 por outro caminho.
 */
export function cargaEfetiva(campo: CampoDeCarga, herdada: number | null): number | null {
  return campo.origem === 'herdado' ? herdada : campo.valor
}
