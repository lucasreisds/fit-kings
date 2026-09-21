/**
 * Caminho único de geração de identificador — D11, FR-124, SC-034.
 *
 * Este é o **único** arquivo do projeto autorizado a chamar
 * `crypto.randomUUID()`. A regra de lint T006 em `eslint.config.js` impede a
 * chamada em qualquer outro lugar. Não há fallback aqui, e acrescentar um é
 * violação do Princípio IV, não conveniência de desenvolvimento.
 */
import { avaliarContextoSeguro, ContextoInseguroError } from './contextoSeguro'

export type Id = string

/** Gera o identificador de uma entidade. Recusa operar fora de contexto seguro. */
export function novoId(): Id {
  const diagnostico = avaliarContextoSeguro()
  if (!diagnostico.apto) throw new ContextoInseguroError(diagnostico)
  return crypto.randomUUID()
}

/**
 * Reconhecer um identificador é operação pura e mora no domínio — a validação
 * do arquivo de backup precisa dela e não pode importar desta camada (T005).
 */
export { ehIdValido } from '../domain/tipos/validadores'
