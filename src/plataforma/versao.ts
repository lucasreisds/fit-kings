/**
 * Versão da aplicação, gravada no cabeçalho do arquivo de backup.
 * `__VERSAO_DA_APLICACAO__` é substituída em tempo de build por vite.config.ts.
 */
declare const __VERSAO_DA_APLICACAO__: string | undefined

export const VERSAO_DA_APLICACAO: string =
  typeof __VERSAO_DA_APLICACAO__ === 'string' ? __VERSAO_DA_APLICACAO__ : '0.1.0'
