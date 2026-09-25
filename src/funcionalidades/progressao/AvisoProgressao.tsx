/**
 * Aviso de aumento de carga — FR-045, FR-046, FR-047.
 *
 * **Não bloqueia, não interrompe, não exige interação.** O Princípio II é
 * explícito a respeito de avisos de progressão: eles estão entre as coisas que
 * não podem parar um treino. Por isso é uma faixa na tela de execução, e não um
 * diálogo — o usuário lê se quiser, no tempo dele.
 *
 * O detalhe que fundamenta a indicação fica a um toque (FR-047): o Princípio V
 * exige que o usuário consiga consultar os dados por trás de qualquer indicação
 * apresentada.
 */
import { useState } from 'react'
import type { IndicacaoDeProgressao } from '../../dados/repositorios/progressao'
import { formatarCarga, formatarTempoRelativo } from '../../plataforma/formato'
import type { InstanteUtc } from '../../domain/tipos'
import { DetalheAviso } from './DetalheAviso'
import estilos from './progressao.module.css'
import estilosBase from '../../ui/componentes.module.css'

type Props = {
  indicacao: IndicacaoDeProgressao
  nomeDoExercicio: string
  agora: InstanteUtc
}

export function AvisoProgressao({ indicacao, nomeDoExercicio, agora }: Props) {
  const [mostrandoDetalhe, definirMostrandoDetalhe] = useState(false)

  // Sem indicação, nada é exibido. Um aviso que aparece dizendo "não dá para
  // aumentar" seria ruído a cada série.
  if (!indicacao.avaliacao.indica) return null

  return (
    <>
      <div className={estilos.aviso} role="status">
        <span className={estilos.tituloAviso}>
          <span aria-hidden="true">▲</span>
          Dá para aumentar a carga
        </span>
        <span className={estilos.corpoAviso}>
          {/*
            Faixa dominada e meta superada são situações diferentes, e o usuário
            reage a elas de forma diferente: na faixa, o passo seguinte é subir
            o peso e ver as repetições caírem para a base (D3).
          */}
          {indicacao.avaliacao.motivo === 'dominou_a_faixa'
            ? indicacao.baseadaEm
              ? `Você alcançou o topo da faixa em todas as séries ${formatarTempoRelativo(
                  indicacao.baseadaEm.concluidaEm,
                  agora,
                )}`
              : 'Você alcançou o topo da faixa em todas as séries'
            : indicacao.baseadaEm
              ? `Você superou a meta em todas as séries ${formatarTempoRelativo(
                  indicacao.baseadaEm.concluidaEm,
                  agora,
                )}`
              : 'Você superou a meta em todas as séries'}
          {indicacao.cargaAnteriorKg !== null ? (
            <>
              , com{' '}
              <strong className="numerico">{formatarCarga(indicacao.cargaAnteriorKg)} kg</strong>.
            </>
          ) : (
            '.'
          )}
        </span>
        <button
          type="button"
          className={estilosBase.acaoDaFaixa}
          onClick={() => definirMostrandoDetalhe(true)}
        >
          Ver por quê
        </button>
      </div>

      {mostrandoDetalhe ? (
        <DetalheAviso
          indicacao={indicacao}
          nomeDoExercicio={nomeDoExercicio}
          aoFechar={() => definirMostrandoDetalhe(false)}
        />
      ) : null}
    </>
  )
}
