/**
 * Os dados que fundamentam a indicação — FR-047, Princípio V.
 *
 * "O usuário DEVE conseguir consultar os dados que fundamentam qualquer
 * indicação apresentada." Esta tela é o cumprimento literal disso: série a
 * série, o que era a meta, o que foi feito, e se aquela série superou.
 *
 * Um aviso de progressão que não se explica corrói a confiança no produto
 * inteiro — e é por isso que o detalhe vem da mesma função pura que decidiu o
 * aviso, e não de um texto escrito à parte.
 */
import { useEffect, useRef } from 'react'
import { Botao } from '../../ui/Botao'
import { navegar } from '../../app/rotas'
import type { IndicacaoDeProgressao } from '../../dados/repositorios/progressao'
import { textoDoMotivo } from '../../domain/progressao/avaliar'
import { formatarData } from '../../plataforma/formato'
import estilos from './progressao.module.css'

type Props = {
  indicacao: IndicacaoDeProgressao
  nomeDoExercicio: string
  aoFechar: () => void
}

export function DetalheAviso({ indicacao, nomeDoExercicio, aoFechar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  const { avaliacao, baseadaEm } = indicacao

  return (
    <dialog
      ref={dialogo}
      className={estilos.detalhe}
      aria-labelledby="titulo-detalhe-progressao"
      onCancel={(evento) => {
        evento.preventDefault()
        aoFechar()
      }}
    >
      <h2 id="titulo-detalhe-progressao" className={estilos.tituloAviso}>
        {nomeDoExercicio}
      </h2>

      <p className={estilos.corpoAviso}>
        {textoDoMotivo(avaliacao.motivo)}
        {baseadaEm ? (
          <>
            {' '}
            Comparação feita com o treino de{' '}
            <span className="numerico">{formatarData(baseadaEm.concluidaEm)}</span>.
          </>
        ) : null}
      </p>

      <div className={estilos.gradeDetalhe}>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />
        <span className={estilos.cabecalhoColuna}>Meta</span>
        <span className={estilos.cabecalhoColuna}>Você fez</span>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />

        {avaliacao.detalhePorSerie.map((detalhe) => (
          <div key={detalhe.ordem} style={{ display: 'contents' }}>
            <span className={`${estilos.ordem} numerico`}>{detalhe.ordem}</span>
            <span className={`${estilos.planejado} numerico`}>
              {/*
                Numa faixa, mostrar só o mínimo esconde o critério: o aviso fala
                em topo, e a meta ao lado diria "6". A faixa inteira é a meta.
              */}
              {detalhe.repeticoesMaximas > detalhe.repeticoesPlanejadas
                ? `${detalhe.repeticoesPlanejadas}-${detalhe.repeticoesMaximas}`
                : detalhe.repeticoesPlanejadas}{' '}
              reps
              {detalhe.rirPlanejado !== null ? `, RIR ${detalhe.rirPlanejado}` : ''}
            </span>
            <span className={`${estilos.realizado} numerico`}>
              {detalhe.repeticoesRealizadas ?? '—'} reps
              {detalhe.rirRealizado !== null ? `, RIR ${detalhe.rirRealizado}` : ''}
            </span>
            <span className={detalhe.superou ? estilos.superou : estilos.naoSuperou}>
              {detalhe.superou
                ? detalhe.repeticoesMaximas > detalhe.repeticoesPlanejadas
                  ? '▲ topo'
                  : '▲ superou'
                : '— não superou'}
            </span>
          </div>
        ))}
      </div>

      {!avaliacao.rirConsiderado ? (
        <p className={estilos.corpoAviso}>
          O RIR não entrou na conta: ele não foi informado nas duas pontas da comparação.
        </p>
      ) : null}

      <div className={estilos.acoesDetalhe}>
        {baseadaEm ? (
          <Botao
            variante="secundario"
            onClick={() => {
              aoFechar()
              navegar({ nome: 'detalheSessao', sessaoId: baseadaEm.sessaoId })
            }}
          >
            Ver aquele treino
          </Botao>
        ) : null}
        <Botao onClick={aoFechar}>Fechar</Botao>
      </div>
    </dialog>
  )
}
