/**
 * Carimbo de tempo — Princípio IV, D7.
 *
 * Gravamos ISO 8601 em UTC e, em campo separado, o deslocamento local vigente
 * no momento do registro. UTC preserva a ordenação correta; o deslocamento
 * preserva a informação de domínio "a que horas eu treinei", que se perde numa
 * conversão posterior porque o fuso do aparelho pode ter mudado desde então.
 */

/** ISO 8601 em UTC, ex.: `2026-09-19T14:32:05.000Z`. */
export type InstanteUtc = string

/** Deslocamento local, ex.: `-03:00`. */
export type DeslocamentoLocal = string

export type Relogio = {
  agora(): InstanteUtc
  deslocamentoLocal(): DeslocamentoLocal
}

export function agoraUtc(): InstanteUtc {
  return new Date().toISOString()
}

/** Deslocamento do aparelho agora. `Date#getTimezoneOffset` devolve invertido. */
export function deslocamentoLocalAtual(data: Date = new Date()): DeslocamentoLocal {
  return formatarDeslocamento(-data.getTimezoneOffset())
}

/** Converte minutos de deslocamento em `±HH:MM`. */
export function formatarDeslocamento(minutos: number): DeslocamentoLocal {
  const sinal = minutos < 0 ? '-' : '+'
  const absoluto = Math.abs(minutos)
  const horas = String(Math.floor(absoluto / 60)).padStart(2, '0')
  const restoMinutos = String(absoluto % 60).padStart(2, '0')
  return `${sinal}${horas}:${restoMinutos}`
}

/**
 * Relógio do sistema. As regras de domínio não o consultam — elas recebem o
 * instante como parâmetro, para permanecerem determinísticas (Princípio V).
 * A regra de lint T005 impede `Date.now()` e `new Date()` em `src/domain/`.
 */
export const relogioDoSistema: Relogio = {
  agora: agoraUtc,
  deslocamentoLocal: () => deslocamentoLocalAtual(),
}

/** Relógio fixo, para teste com tempo controlado (T132). */
export function relogioFixo(
  instante: InstanteUtc,
  deslocamento: DeslocamentoLocal = '+00:00',
): Relogio {
  return { agora: () => instante, deslocamentoLocal: () => deslocamento }
}

/**
 * Reconhecer um carimbo é operação pura e mora no domínio, pelo mesmo motivo de
 * `ehIdValido`: a validação do arquivo de backup precisa dela (T005).
 */
export { ehDeslocamentoValido, ehInstanteValido } from '../domain/tipos/validadores'

/** Milissegundos entre dois instantes. Entrada de regra de domínio, não relógio. */
export function diferencaMs(inicio: InstanteUtc, fim: InstanteUtc): number {
  return Date.parse(fim) - Date.parse(inicio)
}

export const UM_DIA_MS = 24 * 60 * 60 * 1000
