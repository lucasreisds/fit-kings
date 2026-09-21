/**
 * Detalhe da sessão — FR-037, FR-038, FR-116.
 *
 * A marca de correção fica visível com a data da última alteração, mas em tom
 * discreto: ela informa, não compete com os valores. Um histórico que grita
 * "corrigido" a cada tela faz o usuário evitar corrigir, e um erro de digitação
 * não corrigido envenena toda a comparação de desempenho.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { Faixa } from '../../ui/Faixa'
import { navegar } from '../../app/rotas'
import { repositorioSessoes } from '../../dados/repositorios/sessoes'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import { lerPlanoDaSessao } from '../execucao/iniciarSessao'
import { estadoExercicioSessao, textoDoEstado } from '../../domain/sessao/estadoExercicio'
import { formatarDataHora } from '../../plataforma/formato'
import type { Id } from '../../domain/tipos'
import { ComparacaoSeries } from './ComparacaoSeries'
import { CorrigirSessao } from './CorrigirSessao'
import estilos from './historico.module.css'

type Props = { sessaoId: Id }

export function DetalheSessao({ sessaoId }: Props) {
  const [corrigindo, definirCorrigindo] = useState(false)

  const dados = useLiveQuery(async () => {
    const sessao = await repositorioSessoes.obter(sessaoId)
    if (!sessao) return null

    const plano = await lerPlanoDaSessao(sessao)
    const exercicios = await repositorioExercicios.obterVarios(
      sessao.exercicios.map((item) => item.exercicio.exercicioId),
    )
    const versoes = await repositorioSessoes.versoesDe(sessaoId)

    return { sessao, plano, exercicios, versoes }
  }, [sessaoId])

  if (dados === undefined) return null
  if (dados === null) {
    return <Faixa tom="critica">Esta sessão não existe mais neste aparelho.</Faixa>
  }

  const { sessao, plano, exercicios, versoes } = dados

  if (corrigindo) {
    return (
      <CorrigirSessao
        sessao={sessao}
        plano={plano}
        exercicios={exercicios}
        aoConcluir={() => definirCorrigindo(false)}
        aoCancelar={() => definirCorrigindo(false)}
      />
    )
  }

  return (
    <div className={estilos.detalhe}>
      <header className={estilos.cabecalhoDetalhe}>
        <h2 className={estilos.tituloDetalhe}>{sessao.sessao.nomeTreino}</h2>
        <span className={estilos.dataSessao}>
          {sessao.sessao.concluidaEm ? formatarDataHora(sessao.sessao.concluidaEm) : 'em andamento'}
        </span>
        {sessao.sessao.corrigida ? (
          <span className={estilos.marcaCorrigida}>
            Corrigido em {formatarDataHora(sessao.sessao.alteradoEm)}
            {versoes.length > 1 ? (
              <>
                {' · '}
                <span className="numerico">{versoes.length - 1}</span>{' '}
                {versoes.length - 1 === 1 ? 'correção' : 'correções'}
              </>
            ) : null}
          </span>
        ) : null}
      </header>

      {sessao.exercicios.map((item) => {
        const metas = plano.porExercicioSessao.get(item.exercicio.id) ?? []
        const estado = estadoExercicioSessao({
          series: item.series,
          naoRealizado: item.exercicio.naoRealizado,
          seriesPlanejadas: metas.length,
        })

        return (
          <section key={item.exercicio.id} className={estilos.exercicio}>
            <h3 className={estilos.nomeExercicio}>
              {exercicios.get(item.exercicio.exercicioId)?.nome ?? 'Exercício'}
            </h3>
            <span className={estilos.estadoExercicio}>
              {textoDoEstado(estado)}
              {item.exercicio.origem === 'fora_do_plano' ? ', fora do plano' : ''}
            </span>

            {estado === 'inconsistente' ? (
              <Faixa tom="critica" papel="alert">
                Este exercício está marcado como não realizado e tem séries registradas. O
                aplicativo não escolhe entre os dois.
              </Faixa>
            ) : null}

            <ComparacaoSeries series={item.series} metas={metas} />

            <Botao
              variante="discreto"
              onClick={() =>
                navegar({
                  nome: 'historicoExercicio',
                  exercicioId: item.exercicio.exercicioId,
                })
              }
            >
              Ver este exercício ao longo do tempo
            </Botao>
          </section>
        )
      })}

      <div className={estilos.acoes}>
        <Botao variante="secundario" onClick={() => definirCorrigindo(true)}>
          Corrigir valores
        </Botao>
        <Botao variante="discreto" onClick={() => navegar({ nome: 'historico' })}>
          Voltar ao histórico
        </Botao>
      </div>
    </div>
  )
}
