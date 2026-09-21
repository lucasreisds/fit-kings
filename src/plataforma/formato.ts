/**
 * Formatação para exibição. Vive na plataforma, não no domínio: depende de
 * idioma e de fuso, e o Princípio V proíbe que regra de domínio dependa de
 * qualquer um dos dois.
 */
import type { InstanteUtc } from './tempo'

const LOCALIDADE = 'pt-BR'

const DATA_CURTA = new Intl.DateTimeFormat(LOCALIDADE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATA_HORA = new Intl.DateTimeFormat(LOCALIDADE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DIA_SEMANA = new Intl.DateTimeFormat(LOCALIDADE, { weekday: 'long' })

export function formatarData(instante: InstanteUtc): string {
  return DATA_CURTA.format(new Date(instante))
}

export function formatarDataHora(instante: InstanteUtc): string {
  return DATA_HORA.format(new Date(instante))
}

export function formatarDiaDaSemana(instante: InstanteUtc): string {
  return DIA_SEMANA.format(new Date(instante))
}

/** Carga em quilogramas. Fracionados aparecem só quando existem. */
export function formatarCarga(cargaKg: number | null): string {
  if (cargaKg === null) return '—'
  const inteiro = Number.isInteger(cargaKg)
  return `${cargaKg.toLocaleString(LOCALIDADE, {
    minimumFractionDigits: inteiro ? 0 : 1,
    maximumFractionDigits: 2,
  })}`
}

export function formatarDuracao(ms: number): string {
  const minutos = Math.floor(ms / 60000)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

/** "há 3 dias" — usado no lembrete de backup e na lista de histórico. */
export function formatarTempoRelativo(instante: InstanteUtc, agora: InstanteUtc): string {
  const dias = Math.floor((Date.parse(agora) - Date.parse(instante)) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}
