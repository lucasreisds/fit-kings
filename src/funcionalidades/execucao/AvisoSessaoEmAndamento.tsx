/**
 * Aviso de sessão em andamento na abertura — FR-034, FR-028.
 *
 * Aparece em qualquer tela do aplicativo enquanto houver uma sessão aberta,
 * porque é a única forma de o usuário descobrir que ela existe sem ir procurar.
 * **Não bloqueia**: é faixa, não diálogo. O Princípio II reserva a interrupção
 * para a falha ao persistir, e nada mais.
 *
 * Quando a sessão está aberta há muito tempo, o aviso muda de tom e oferece as
 * três saídas de FR-028 — retomar, concluir ou descartar — porque uma sessão de
 * ontem que ninguém encerrou não é o treino de agora.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Faixa } from '../../ui/Faixa'
import { Botao } from '../../ui/Botao'
import { navegar } from '../../app/rotas'
import { repositorioSessoes } from '../../dados/repositorios/sessoes'
import { lerPlanoDaSessao } from './iniciarSessao'
import { pareceAbandonada, pontoDeRetomada } from './retomar'
import { agoraUtc } from '../../plataforma/tempo'
import { formatarTempoRelativo } from '../../plataforma/formato'
import estilos from './execucao.module.css'

export function AvisoSessaoEmAndamento() {
  const [encerrando, definirEncerrando] = useState(false)

  const pendente = useLiveQuery(async () => {
    const sessao = await repositorioSessoes.sessaoEmAndamento()
    if (!sessao) return null

    const completa = await repositorioSessoes.obter(sessao.id)
    if (!completa) return null

    const plano = await lerPlanoDaSessao(completa)
    return { completa, ponto: pontoDeRetomada(completa, plano) }
  }, [])

  if (!pendente) return null

  const agora = agoraUtc()
  const { completa, ponto } = pendente
  const antiga = pareceAbandonada(completa, agora)

  async function encerrar(transicao: 'concluir' | 'descartar') {
    definirEncerrando(true)
    try {
      await repositorioSessoes.encerrar(completa.sessao.id, transicao)
    } finally {
      definirEncerrando(false)
    }
  }

  return (
    <Faixa tom={antiga ? 'atencao' : 'acento'}>
      <div className={estilos.grupoResumo}>
        <span>
          <strong>{completa.sessao.nomeTreino}</strong> está em andamento
          {antiga ? ` desde ${formatarTempoRelativo(completa.sessao.iniciadaEm, agora)}` : ''}.{' '}
          <span className="numerico">{ponto.seriesRegistradas}</span>{' '}
          {ponto.seriesRegistradas === 1 ? 'série registrada' : 'séries registradas'}.
          {antiga ? ' Se você esqueceu de encerrá-lo, escolha o que fazer com ele.' : ''}
        </span>

        <div className={estilos.acoesSecundarias}>
          <Botao
            onClick={() => navegar({ nome: 'execucao', sessaoId: completa.sessao.id })}
            disabled={encerrando}
          >
            Retomar
          </Botao>
          {antiga ? (
            <>
              <Botao
                variante="secundario"
                onClick={() => void encerrar('concluir')}
                disabled={encerrando}
              >
                Concluir
              </Botao>
              <Botao
                variante="secundario"
                onClick={() => void encerrar('descartar')}
                disabled={encerrando}
              >
                Descartar
              </Botao>
            </>
          ) : null}
        </div>
      </div>
    </Faixa>
  )
}
