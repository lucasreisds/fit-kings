/**
 * Evolução das cargas de um exercício — FR-049, US6.
 *
 * A agregação é **calculada sob demanda** a cada abertura, nunca lida de campo
 * persistido (Princípio V). Cada ponto leva à sessão que o originou (cenário 2),
 * e histórico insuficiente recebe uma mensagem que diz o que falta, em vez de
 * uma tela vazia (cenário 3).
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { navegar } from '../../app/rotas'
import { repositorioHistorico } from '../../dados/repositorios/historico'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import {
  agregarEvolucao,
  PONTOS_MINIMOS_PARA_CURVA,
  temHistoricoSuficiente,
  unidadeDoModo,
  valorDoPonto,
} from '../../domain/evolucao/agregar'
import { formatarCarga, formatarData } from '../../plataforma/formato'
import type { Id } from '../../domain/tipos'
import { GraficoEvolucao } from './GraficoEvolucao'
import estilos from './progressao.module.css'

type Props = { exercicioId: Id }

export function EvolucaoExercicio({ exercicioId }: Props) {
  const dados = useLiveQuery(async () => {
    const [exercicio, execucoes] = await Promise.all([
      repositorioExercicios.obter(exercicioId),
      repositorioHistorico.execucoesDoExercicio(exercicioId),
    ])

    const evolucao = agregarEvolucao(
      execucoes.map((execucao) => ({
        sessaoId: execucao.sessaoId,
        concluidaEm: execucao.concluidaEm,
        series: execucao.series,
      })),
    )

    return { exercicio, evolucao }
  }, [exercicioId])

  if (dados === undefined) return null

  const { exercicio, evolucao } = dados
  const { pontos, modo } = evolucao
  const unidade = unidadeDoModo(modo)
  const nome = exercicio?.nome ?? 'Exercício'

  if (!temHistoricoSuficiente(pontos)) {
    const faltam = PONTOS_MINIMOS_PARA_CURVA - pontos.length
    return (
      <div className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>{nome}</h2>
        <p className={estilos.vazioTexto}>
          {pontos.length === 0
            ? 'Ainda não há execução registrada deste exercício. A curva aparece depois de dois treinos com ele.'
            : `Há uma execução registrada. Falta${faltam === 1 ? '' : 'm'} ${faltam} para a curva fazer sentido.`}
        </p>
        <Botao
          variante="secundario"
          onClick={() => navegar({ nome: 'historicoExercicio', exercicioId })}
        >
          Ver as execuções
        </Botao>
      </div>
    )
  }

  const primeiro = pontos[0]!
  const ultimo = pontos[pontos.length - 1]!
  const valorInicial = valorDoPonto(primeiro, modo)
  const valorFinal = valorDoPonto(ultimo, modo)
  const diferenca = valorFinal - valorInicial

  return (
    <div className={estilos.evolucao}>
      <h2 className={estilos.vazioTitulo}>{nome}</h2>

      <GraficoEvolucao pontos={pontos} modo={modo} nomeDoExercicio={nome} />

      <div className={estilos.legenda}>
        <span className="numerico">{formatarData(primeiro.quando)}</span>
        <span className="numerico">{formatarData(ultimo.quando)}</span>
      </div>

      <div className={estilos.resumoEvolucao}>
        <div className={estilos.medida}>
          <span className={`${estilos.valorMedida} numerico`}>{formatarCarga(valorFinal)}</span>
          <span className={estilos.rotuloMedida}>{unidade} na última</span>
        </div>
        <div className={estilos.medida}>
          <span className={`${estilos.valorMedida} numerico`}>
            {diferenca > 0 ? '+' : ''}
            {formatarCarga(diferenca)}
          </span>
          <span className={estilos.rotuloMedida}>{unidade} desde a primeira</span>
        </div>
        <div className={estilos.medida}>
          <span className={`${estilos.valorMedida} numerico`}>{pontos.length}</span>
          <span className={estilos.rotuloMedida}>execuções</span>
        </div>
      </div>

      {/*
        A tabela é a visão acessível do gráfico e, ao mesmo tempo, o caminho de
        cada ponto para a sessão que o originou (US6, cenário 2).
      */}
      <div className={estilos.tabelaPontos}>
        {[...pontos].reverse().map((ponto) => (
          <button
            key={ponto.sessaoId}
            type="button"
            className={estilos.linhaPonto}
            onClick={() => navegar({ nome: 'detalheSessao', sessaoId: ponto.sessaoId })}
          >
            <span className={`${estilos.dataPonto} numerico`}>{formatarData(ponto.quando)}</span>
            <span className={`${estilos.cargaPonto} numerico`}>
              {formatarCarga(valorDoPonto(ponto, modo))} {unidade}
            </span>
            <span className={`${estilos.dataPonto} numerico`}>
              {ponto.seriesValidas} {ponto.seriesValidas === 1 ? 'série' : 'séries'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
