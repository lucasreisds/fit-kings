/**
 * Predicados de formato. Puros e sem dependência nenhuma — por isso vivem no
 * domínio e não na plataforma: a validação do arquivo de backup precisa deles e
 * `src/domain/` não pode importar de `src/plataforma/` (Princípio V, T005).
 *
 * `crypto` e o relógio ficam na plataforma; **reconhecer** um UUID ou uma data
 * ISO não precisa de nenhum dos dois.
 */

const PADRAO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ehIdValido(valor: unknown): valor is string {
  return typeof valor === 'string' && PADRAO_UUID.test(valor)
}

const PADRAO_ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

export function ehInstanteValido(valor: unknown): valor is string {
  return (
    typeof valor === 'string' && PADRAO_ISO_UTC.test(valor) && !Number.isNaN(Date.parse(valor))
  )
}

const PADRAO_DESLOCAMENTO = /^[+-]\d{2}:\d{2}$/

export function ehDeslocamentoValido(valor: unknown): valor is string {
  return typeof valor === 'string' && PADRAO_DESLOCAMENTO.test(valor)
}
