/**
 * Lista do histórico — FR-035, FR-036.
 *
 * Ordem cronológica decrescente: o treino mais recente primeiro, que é o que o
 * usuário procura em 9 de 10 aberturas. A consulta usa o índice composto
 * `[estado+concluidaEm]` e não varre a tabela (SC-010).
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { navegar } from '../../app/rotas'
import { repositorioHistorico } from '../../dados/repositorios/historico'
import { formatarCarga, formatarData, formatarDiaDaSemana } from '../../plataforma/formato'
import estilos from './historico.module.css'

export function ListaHistorico() {
  const sessoes = useLiveQuery(() => repositorioHistorico.listarSessoes(), [])

  if (sessoes === undefined) return null

  if (sessoes.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>Nenhum treino registrado ainda</h2>
        <p className={estilos.vazioTexto}>
          Quando você concluir um treino, ele aparece aqui com tudo o que registrou — e fica
          guardado sem prazo para sumir.
        </p>
      </div>
    )
  }

  return (
    <div className={estilos.lista}>
      {sessoes.map((resumo) => (
        <button
          key={resumo.sessao.id}
          type="button"
          className={estilos.linhaSessao}
          onClick={() => navegar({ nome: 'detalheSessao', sessaoId: resumo.sessao.id })}
        >
          <span>
            <span className={estilos.dataSessao}>
              {formatarDiaDaSemana(resumo.sessao.concluidaEm!)},{' '}
              <span className="numerico">{formatarData(resumo.sessao.concluidaEm!)}</span>
            </span>
            <span className={estilos.nomeSessao} style={{ display: 'block' }}>
              {resumo.sessao.nomeTreino}
              {resumo.sessao.corrigida ? ' (corrigido)' : ''}
            </span>
            <span className={estilos.metaSessao}>
              <span className="numerico">
                {resumo.exercicios} {resumo.exercicios === 1 ? 'exercício' : 'exercícios'}
              </span>
              <span className="numerico">
                {resumo.seriesValidas} {resumo.seriesValidas === 1 ? 'série' : 'séries'}
              </span>
            </span>
          </span>

          <span className={`${estilos.volume} numerico`}>
            {formatarCarga(Math.round(resumo.cargaTotalKg))}
            <span className={estilos.unidadeVolume}>kg levantados</span>
          </span>
        </button>
      ))}
    </div>
  )
}
