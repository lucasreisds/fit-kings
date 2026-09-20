/**
 * Resumo ao concluir — FR-025, FR-020.
 *
 * Mostra planejado x realizado lado a lado. A comparação é densa em número: ela
 * leva marca e texto além da cor, para não depender de cor como único portador
 * de significado.
 */
import { Botao } from '../../ui/Botao'
import type { SessaoCompleta } from '../../dados/repositorios/sessoes'
import type { PlanoDaSessao } from './iniciarSessao'
import type { Exercicio, Id } from '../../domain/tipos'
import { compararSerie } from '../../domain/serie/validade'
import { estadoExercicioSessao, textoDoEstado } from '../../domain/sessao/estadoExercicio'
import { formatarCarga, formatarDataHora } from '../../plataforma/formato'
import estilos from './execucao.module.css'

type Props = {
  sessao: SessaoCompleta
  plano: PlanoDaSessao
  exercicios: ReadonlyMap<Id, Exercicio>
  aoSair: () => void
}

export function ResumoDaSessao({ sessao, plano, exercicios, aoSair }: Props) {
  const descartada = sessao.sessao.estado === 'descartada'

  return (
    <main className={estilos.tela}>
      <div className={estilos.corpo}>
        <div className={estilos.resumo}>
          <div>
            <h1 className={estilos.tituloResumo}>
              {descartada ? 'Treino descartado' : 'Treino concluído'}
            </h1>
            <p className={estilos.meta}>
              {sessao.sessao.nomeTreino}
              {sessao.sessao.concluidaEm
                ? `, ${formatarDataHora(sessao.sessao.concluidaEm)}`
                : ''}
            </p>
          </div>

          {descartada ? null : (
            sessao.exercicios.map((item) => {
              const metas = plano.porExercicioSessao.get(item.exercicio.id) ?? []
              const estado = estadoExercicioSessao({
                series: item.series,
                naoRealizado: item.exercicio.naoRealizado,
                seriesPlanejadas: metas.length,
              })

              return (
                <section key={item.exercicio.id} className={estilos.grupoResumo}>
                  <h2 className={estilos.numeroDaSerie}>
                    {exercicios.get(item.exercicio.exercicioId)?.nome ?? 'Exercício'}
                  </h2>
                  <span className={estilos.meta}>{textoDoEstado(estado)}</span>

                  <div className={estilos.razao}>
                    {item.series.length === 0 ? (
                      <span className={estilos.serieNaoRealizada}>Nenhuma série registrada.</span>
                    ) : (
                      item.series.map((serie) => {
                        const meta = metas[serie.ordem - 1]
                        const comparacao = compararSerie(
                          meta
                            ? {
                                repeticoes: meta.repeticoes,
                                cargaKg: meta.cargaKg,
                                rir: meta.rir,
                              }
                            : null,
                          serie,
                        )
                        return (
                          <div key={serie.id} className={estilos.linhaRazao}>
                            <span className={`${estilos.ordemRazao} numerico`}>{serie.ordem}</span>
                            <span className={`${estilos.rirRazao} numerico`}>
                              {meta
                                ? `meta ${meta.repeticoes} × ${formatarCarga(meta.cargaKg)} kg`
                                : 'série extra'}
                            </span>
                            {serie.naoRealizada ? (
                              <span className={estilos.serieNaoRealizada}>não realizada</span>
                            ) : (
                              <span className={`${estilos.valoresRazao} numerico`}>
                                {formatarCarga(serie.cargaKg)} kg × {serie.repeticoes ?? '—'}
                              </span>
                            )}
                            <span
                              className={
                                comparacao.repeticoes === 'acima'
                                  ? estilos.marcaAcima
                                  : comparacao.repeticoes === 'abaixo'
                                    ? estilos.marcaAbaixo
                                    : estilos.marcaIgual
                              }
                            >
                              {comparacao.repeticoes === 'acima'
                                ? '▲'
                                : comparacao.repeticoes === 'abaixo'
                                  ? '▼'
                                  : ''}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>

      <footer className={estilos.rodape}>
        <Botao principal onClick={aoSair}>
          {descartada ? 'Voltar aos treinos' : 'Ver no histórico'}
        </Botao>
      </footer>
    </main>
  )
}
