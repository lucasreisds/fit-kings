/**
 * Campos comuns a toda entidade — Princípio IV, data-model.md § Campos comuns.
 * Nenhuma tabela pode omiti-los.
 */

/** UUID gerado no cliente. Imutável após a criação. */
export type Id = string

/** ISO 8601 em UTC. */
export type InstanteUtc = string

/** Deslocamento do aparelho no momento do registro, ex.: `-03:00`. */
export type DeslocamentoLocal = string

export type Entidade = {
  readonly id: Id
  readonly criadoEm: InstanteUtc
  /** Atualizado a cada escrita. Base da precedência em FR-103 e FR-102. */
  readonly alteradoEm: InstanteUtc
  readonly deslocamentoLocal: DeslocamentoLocal
  /** Exclusão lógica. `null` = ativo. Remoção física é proibida. */
  readonly excluidoEm: InstanteUtc | null
}

/** Campos de uma entidade nova, antes de o repositório carimbar os comuns. */
export type Novo<T extends Entidade> = Omit<T, keyof Entidade> & Partial<Pick<T, 'id'>>

/** Campos alteráveis de uma entidade existente. */
export type Alteracao<T extends Entidade> = Partial<Omit<T, keyof Entidade>>

export function estaAtivo(entidade: Entidade): boolean {
  return entidade.excluidoEm === null
}

/** Precedência de FR-103: vence o `alteradoEm` mais recente; empate mantém o local. */
export function maisRecenteQue(candidato: Entidade, local: Entidade): boolean {
  return Date.parse(candidato.alteradoEm) > Date.parse(local.alteradoEm)
}
