import type { InstanteUtc } from './base'

/**
 * Registro único de estado da instalação. **Não é dado de domínio** e não entra
 * no arquivo de backup (contrato § O que o arquivo contém).
 */
export type MetaAplicacao = {
  readonly id: 'unico'
  /**
   * FR-109. Escrito **apenas** após exportação concluída com sucesso — nunca ao
   * iniciar uma exportação, nunca após falha, nunca ao exibir o lembrete.
   * `null` = nunca exportou.
   */
  readonly ultimoBackupEm: InstanteUtc | null
  /** Resultado de `navigator.storage.persist()`. `null` = ainda não consultado. */
  readonly persistenciaConcedida: boolean | null
  readonly persistenciaVerificadaEm: InstanteUtc | null
}

export const ID_META_APLICACAO = 'unico' as const
