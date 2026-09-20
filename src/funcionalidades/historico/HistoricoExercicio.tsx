/**
 * Histórico de um exercício — FR-039, FR-041.
 *
 * Todas as execuções ao longo do tempo, comparáveis entre si. O vínculo é o
 * identificador estável do exercício, nunca o nome — renomear não quebra nada
 * do que está nesta tela.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { navegar } from '../../app/rotas'
import { repositorioHistorico } from '../../dados/repositorios/historico'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import { seriesValidas } from '../../domain/serie/validade'
import { formatarCarga, formatarData } from '../../plataforma/formato'
import type { Id } from '../../domain/tipos'
import estilos from './historico.module.css'

type Props = { exercicioId: Id }

export function HistoricoExercicio({ exercicioId }: Props) {
  const dados = useLiveQuery(async () => {
    const [exercicio, execucoes] = await Promise.all([
      repositorioExercicios.obter(exercicioId),
      repositorioHistorico.execucoesDoExercicio(exercicioId),
    ])
    return { exercicio, execucoes }
  }, [exercicioId])

  if (dados === undefined) return null

  const { exercicio, execucoes } = dados

  if (execucoes.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>{exercicio?.nome ?? 'Exercício'}</h2>
        <p className={estilos.vazioTexto}>
          Você ainda não registrou nenhuma execução deste exercício. Depois do primeiro treino com
          ele, as execuções aparecem aqui lado a lado.
        </p>
      </div>
    )
  }

  return (
    <div className={estilos.detalhe}>
      <header className={estilos.cabecalhoDetalhe}>
        <h2 className={estilos.tituloDetalhe}>{exercicio?.nome ?? 'Exercício'}</h2>
        <span className={estilos.dataSessao}>
          <span className="numerico">{execucoes.length}</span>{' '}
          {execucoes.length === 1 ? 'execução registrada' : 'execuções registradas'}
        </span>
      </header>

      <Botao
        variante="secundario"
        onClick={() => navegar({ nome: 'evolucaoExercicio', exercicioId })}
      >
        Ver a evolução das cargas
      </Botao>

      <div className={estilos.lista}>
        {execucoes.map((execucao) => {
          const validas = seriesValidas(execucao.series)
          const cargas = validas.map((serie) => serie.cargaKg ?? 0)
          const maior = cargas.length > 0 ? Math.max(...cargas) : null

          return (
            <button
              key={`${execucao.sessaoId}-${execucao.exercicioSessao.id}`}
              type="button"
              className={estilos.linhaSessao}
              onClick={() => navegar({ nome: 'detalheSessao', sessaoId: execucao.sessaoId })}
            >
              <span>
                <span className={estilos.dataSessao}>
                  <span className="numerico">{formatarData(execucao.concluidaEm)}</span>
                  {execucao.corrigida ? ' · corrigido' : ''}
                </span>
                <span className={estilos.nomeSessao} style={{ display: 'block' }}>
                  {execucao.nomeTreino}
                </span>
                <span className={`${estilos.metaSessao} numerico`}>
                  {validas.length > 0
                    ? validas
                        .map((serie) => `${serie.repeticoes} × ${formatarCarga(serie.cargaKg)} kg`)
                        .join('   ')
                    : 'sem série válida'}
                </span>
              </span>

              <span className={`${estilos.volume} numerico`}>
                {maior !== null ? formatarCarga(maior) : '—'}
                <span className={estilos.unidadeVolume}>kg máx.</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
