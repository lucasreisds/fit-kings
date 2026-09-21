/**
 * Progresso — ponto de entrada para a evolução por exercício (US6).
 *
 * Lista os exercícios que têm execução registrada. Um exercício sem histórico
 * não aparece: ele não tem nada a mostrar, e enchê-la com nomes vazios faria o
 * usuário caçar entre cinquenta itens os cinco que importam.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { navegar } from '../../app/rotas'
import { repositorioHistorico } from '../../dados/repositorios/historico'
import { agregarEvolucao } from '../../domain/evolucao/agregar'
import { formatarCarga, formatarData } from '../../plataforma/formato'
import estilos from './progressao.module.css'

export function TelaProgresso() {
  const linhas = useLiveQuery(async () => {
    const exercicios = await repositorioHistorico.exerciciosComHistorico()

    return Promise.all(
      exercicios.map(async (exercicio) => {
        const execucoes = await repositorioHistorico.execucoesDoExercicio(exercicio.id)
        const pontos = agregarEvolucao(
          execucoes.map((execucao) => ({
            sessaoId: execucao.sessaoId,
            concluidaEm: execucao.concluidaEm,
            series: execucao.series,
          })),
        )
        return { exercicio, pontos }
      }),
    )
  }, [])

  if (linhas === undefined) return null

  if (linhas.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>Nada para comparar ainda</h2>
        <p className={estilos.vazioTexto}>
          Depois do primeiro treino registrado, cada exercício ganha aqui a curva das cargas ao
          longo das semanas.
        </p>
      </div>
    )
  }

  return (
    <div className={estilos.lista}>
      {linhas.map(({ exercicio, pontos }) => {
        const ultimo = pontos[pontos.length - 1]
        const primeiro = pontos[0]
        const diferenca =
          ultimo && primeiro ? ultimo.cargaMaximaKg - primeiro.cargaMaximaKg : 0

        return (
          <button
            key={exercicio.id}
            type="button"
            className={estilos.linhaPonto}
            onClick={() => navegar({ nome: 'evolucaoExercicio', exercicioId: exercicio.id })}
          >
            <span>
              <span className={estilos.cargaPonto} style={{ display: 'block' }}>
                {exercicio.nome}
              </span>
              <span className={`${estilos.dataPonto} numerico`}>
                {pontos.length} {pontos.length === 1 ? 'execução' : 'execuções'}
                {ultimo ? `, última em ${formatarData(ultimo.quando)}` : ''}
              </span>
            </span>

            <span className={`${estilos.cargaPonto} numerico`}>
              {ultimo ? `${formatarCarga(ultimo.cargaMaximaKg)} kg` : '—'}
            </span>

            <span className={`${estilos.dataPonto} numerico`}>
              {diferenca !== 0 ? `${diferenca > 0 ? '+' : ''}${formatarCarga(diferenca)} kg` : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
