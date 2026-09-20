/**
 * Regra do lembrete de backup — FR-110, FR-122, SC-028, SC-033.
 *
 * Determinística e sem campo próprio. Recebe o instante como parâmetro: o
 * Princípio V proíbe regra de domínio que leia o relógio do sistema, e a regra
 * de lint T005 impede.
 *
 * ```text
 * intervalo   = persistenciaConcedida === true ? 7 dias : 2 dias
 * ancora      = ultimoBackupEm ?? criadoEm do primeiro registro do usuário
 * vencido     = agora - ancora > intervalo
 * apresentar  = vencido && não há sessão em_andamento
 * ```
 *
 * **Não existe campo de "último lembrete exibido", e a ausência é deliberada.**
 * Exibir o lembrete não é evento que reinicie contagem nenhuma — só uma
 * exportação concluída com sucesso reinicia. Um campo de adiamento faria o
 * lembrete sumir por sete dias sem que backup nenhum tivesse acontecido, que é
 * exatamente a falha que ele existe para evitar.
 *
 * A supressão durante sessão `em_andamento` atende ao Princípio II sem precisar
 * de adiamento persistido: a condição volta a valer sozinha no encerramento.
 */
import type { InstanteUtc } from '../tipos/base'

export const UM_DIA_MS = 24 * 60 * 60 * 1000
export const INTERVALO_COM_PERSISTENCIA_DIAS = 7
export const INTERVALO_SEM_PERSISTENCIA_DIAS = 2

export type EntradaDoLembrete = {
  readonly agora: InstanteUtc
  /** `null` = nunca exportou. */
  readonly ultimoBackupEm: InstanteUtc | null
  /** `null` = a plataforma não respondeu; conta como não concedida. */
  readonly persistenciaConcedida: boolean | null
  /** Âncora quando nunca houve exportação. `null` = o usuário não tem dados. */
  readonly primeiroRegistroEm: InstanteUtc | null
  readonly haSessaoEmAndamento: boolean
}

export type AvaliacaoDoLembrete = {
  readonly apresentar: boolean
  readonly vencido: boolean
  readonly intervaloDias: number
  readonly diasDesdeAncora: number | null
  readonly motivo: MotivoDoLembrete
}

export type MotivoDoLembrete =
  | 'sem_dados'
  | 'dentro_do_intervalo'
  | 'vencido'
  | 'vencido_mas_em_treino'

export function intervaloEmDias(persistenciaConcedida: boolean | null): number {
  return persistenciaConcedida === true
    ? INTERVALO_COM_PERSISTENCIA_DIAS
    : INTERVALO_SEM_PERSISTENCIA_DIAS
}

export function avaliarLembrete(entrada: EntradaDoLembrete): AvaliacaoDoLembrete {
  const intervaloDias = intervaloEmDias(entrada.persistenciaConcedida)
  const ancora = entrada.ultimoBackupEm ?? entrada.primeiroRegistroEm

  // Sem âncora não há o que lembrar: o usuário ainda não tem nada a perder.
  if (ancora === null) {
    return {
      apresentar: false,
      vencido: false,
      intervaloDias,
      diasDesdeAncora: null,
      motivo: 'sem_dados',
    }
  }

  const decorridoMs = Date.parse(entrada.agora) - Date.parse(ancora)
  const diasDesdeAncora = Math.floor(decorridoMs / UM_DIA_MS)
  const vencido = decorridoMs > intervaloDias * UM_DIA_MS

  if (!vencido) {
    return {
      apresentar: false,
      vencido: false,
      intervaloDias,
      diasDesdeAncora,
      motivo: 'dentro_do_intervalo',
    }
  }

  // Vencido durante o treino: fica para o encerramento, por conclusão ou por
  // descarte. Nada interrompe uma sessão em andamento (Princípio II).
  if (entrada.haSessaoEmAndamento) {
    return {
      apresentar: false,
      vencido: true,
      intervaloDias,
      diasDesdeAncora,
      motivo: 'vencido_mas_em_treino',
    }
  }

  return { apresentar: true, vencido: true, intervaloDias, diasDesdeAncora, motivo: 'vencido' }
}

/** Texto do lembrete. Diz há quanto tempo, não "faça backup" no vazio. */
export function textoDoLembrete(avaliacao: AvaliacaoDoLembrete, nuncaExportou: boolean): string {
  if (nuncaExportou) {
    return 'Você ainda não exportou nenhum backup. Se este aparelho apagar os dados, não há como recuperá-los.'
  }
  const dias = avaliacao.diasDesdeAncora ?? 0
  return `O último backup foi há ${dias} ${dias === 1 ? 'dia' : 'dias'}. Exporte um novo para não perder o que registrou desde então.`
}
