/**
 * Cronômetro de descanso — FR-172 a FR-183.
 *
 * Ocupa a linha onde o descanso planejado já era exibido (FR-150), que é onde o
 * usuário já olha para saber quanto tem de descansar. Não abre diálogo, não
 * ganha lugar próprio na tela, não empurra nada para baixo ao mudar de estado.
 *
 * **Hierarquia.** A contagem usa o numeral médio, 40 px, contra os 72 px de
 * carga e repetições. A constituição manda que aqueles sejam os elementos de
 * maior peso da tela de execução, e um cronômetro que grite mais alto que o
 * campo onde se registra a série inverteria o produto.
 *
 * **A régua é informação, não enfeite.** Ela encurta na proporção do que falta,
 * e é o que se lê de pé, com o celular no chão, sem enxergar os dígitos.
 *
 * Sem transparência e sem blur, como toda esta tela: o custo de renderização
 * não pode depender do que está embaixo.
 */
import { formatarRestante } from '../../domain/descanso'
import { Botao } from '../../ui/Botao'
import type { Descanso as EstadoDescanso } from './useDescanso'
import estilos from './execucao.module.css'

type Props = {
  descanso: EstadoDescanso
  /** Descanso planejado do exercício em foco, em segundos. */
  planejadoSegundos: number | null
}

export function Descanso({ descanso, planejadoSegundos }: Props) {
  const { estado, iniciar, encerrar } = descanso

  if (estado.fase === 'parado') {
    const duracao = planejadoSegundos !== null && planejadoSegundos > 0 ? planejadoSegundos : 120
    return (
      <div className={estilos.descanso} data-descanso>
        <Botao variante="secundario" onClick={() => iniciar(planejadoSegundos)}>
          Descansar {formatarRestante(duracao)}
        </Botao>
      </div>
    )
  }

  if (estado.fase === 'correndo') {
    const fracao = estado.restante / estado.total
    return (
      <div className={estilos.descanso} data-descanso>
        <div className={estilos.contagem} role="timer" aria-live="off">
          <span className={`${estilos.numeralDescanso} numerico`}>
            {formatarRestante(estado.restante)}
          </span>
          <span className={estilos.rotuloDescanso}>de descanso</span>
        </div>
        <div className={estilos.reguaDescanso} aria-hidden="true">
          <div
            className={estilos.reguaDescansoPreenchida}
            style={{ transform: `scaleX(${fracao})` }}
          />
        </div>
        <Botao variante="secundario" onClick={encerrar}>
          Cancelar
        </Botao>
      </div>
    )
  }

  return (
    /*
      `role="status"` anuncia sem roubar o foco. FR-182: nada aqui exige que o
      usuário feche o aviso para seguir registrando séries.
    */
    <div className={`${estilos.descanso} ${estilos.descansoConcluido}`} role="status" data-descanso>
      <span className={estilos.tituloConcluido}>Descanso concluído</span>
      <Botao variante="secundario" onClick={encerrar}>
        Dispensar
      </Botao>
    </div>
  )
}
