/**
 * Tela de execução — FR-021, FR-022, FR-023, FR-024, FR-029, FR-055, SC-001.
 *
 * É a tela onde o produto é usado de verdade, e por isso é a que mais
 * restrições carrega:
 *
 * - **Registrar uma série não troca de tela** (FR-021) e custa no máximo 3
 *   toques: aplicar as repetições da meta, ajustar, confirmar. A carga já vem
 *   herdada da série anterior do mesmo exercício (FR-085).
 * - **O retorno visual de sucesso só ocorre depois do commit** (FR-033,
 *   Princípio I). Não há estado otimista aqui.
 * - **Nada interrompe** (Princípio II). A única exceção admitida é a falha ao
 *   persistir, que aparece como diálogo com alternativa de ação (FR-058).
 * - Sem transparência, sem blur, sem sombra (D9 critério 2). Carga e repetições
 *   são os elementos de maior hierarquia (D9 critério 3).
 */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { Faixa } from '../../ui/Faixa'
import { PassoNumerico } from '../../ui/PassoNumerico'
import { navegar } from '../../app/rotas'
import { repositorioSessoes } from '../../dados/repositorios/sessoes'
import { db } from '../../dados/db'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import { lerPlanoDaSessao, type MetaDaSerie } from './iniciarSessao'
import { pontoDeRetomada } from './retomar'
import { execucaoAnterior } from './consultas'
import { cargaHerdada } from '../../domain/serie/heranca'
import { compararSerie } from '../../domain/serie/validade'
import { formatarIntervalo, intervaloDe } from '../../domain/serie/intervalo'
import { estadoExercicioSessao, textoDoEstado } from '../../domain/sessao/estadoExercicio'
import type { Degrau, Id } from '../../domain/tipos'
import { agoraUtc } from '../../plataforma/tempo'
import { formatarCarga } from '../../plataforma/formato'
import { rascunhoDe, useExecucao } from './store'
import { CabecalhoExercicio } from './CabecalhoExercicio'
import { NavegacaoExercicios } from './NavegacaoExercicios'
import { EditorSerieRegistrada } from './EditorSerieRegistrada'
import { useGestoLateral } from './useGestoLateral'
import { AvisoProgressao } from '../progressao/AvisoProgressao'
import { repositorioProgressao } from '../../dados/repositorios/progressao'
import { RegistroDropset } from './RegistroDropset'
import { FalhaAoPersistir } from './FalhaAoPersistir'
import { ConfirmarDescarte } from './ConfirmarDescarte'
import { ResumoDaSessao } from './ResumoDaSessao'
import { SeletorExercicio } from '../treinos/SeletorExercicio'
import estilos from './execucao.module.css'

type Props = { sessaoId: Id }

export function TelaExecucao({ sessaoId }: Props) {
  const abrir = useExecucao((estado) => estado.abrir)
  const focar = useExecucao((estado) => estado.focar)
  const definirRascunho = useExecucao((estado) => estado.definirRascunho)
  const limparRascunho = useExecucao((estado) => estado.limparRascunho)
  const encerrarStore = useExecucao((estado) => estado.encerrar)
  const exercicioEmFoco = useExecucao((estado) => estado.exercicioEmFoco)
  const rascunhos = useExecucao((estado) => estado.rascunhos)

  const [falha, definirFalha] = useState<unknown>(null)
  const [confirmandoDescarte, definirConfirmandoDescarte] = useState(false)
  const [acrescentando, definirAcrescentando] = useState(false)
  const [gravando, definirGravando] = useState(false)
  const [degraus, definirDegraus] = useState<readonly Degrau[]>([
    { ordem: 1, cargaKg: 0, repeticoes: 0 },
  ])
  const [limiteAtingido, definirLimiteAtingido] = useState<'inicio' | 'fim' | null>(null)
  const [serieEmEdicao, definirSerieEmEdicao] = useState<Id | null>(null)
  const [registrandoExtra, definirRegistrandoExtra] = useState(false)

  const montarGesto = useGestoLateral()

  useEffect(() => {
    abrir(sessaoId)
  }, [sessaoId, abrir])

  const dados = useLiveQuery(async () => {
    const sessao = await repositorioSessoes.obter(sessaoId)
    if (!sessao) return null

    const plano = await lerPlanoDaSessao(sessao)
    const exercicios = await repositorioExercicios.obterVarios(
      sessao.exercicios.map((item) => item.exercicio.exercicioId),
    )

    // FR-150 — o descanso planejado do item do treino. Não é copiado para a
    // sessão porque não entra em comparação nenhuma e só faz sentido durante a
    // execução, onde "agora" é o valor certo (ver D6 no plano).
    const descansos = new Map<Id, number | null>()
    for (const item of sessao.exercicios) {
      if (item.exercicio.itemTreinoId === null) continue
      const itemTreino = await db.itensTreino.get(item.exercicio.itemTreinoId)
      descansos.set(item.exercicio.id, itemTreino?.descansoSegundos ?? null)
    }

    const anteriores = new Map(
      await Promise.all(
        sessao.exercicios.map(
          async (item) =>
            [
              item.exercicio.id,
              await execucaoAnterior(item.exercicio.exercicioId, {
                ignorarSessaoId: sessao.sessao.id,
              }),
            ] as const,
        ),
      ),
    )

    // A indicação é **consultada**, nunca lida de campo persistido (FR-094,
    // Princípio V). Exercício fora do plano não tem meta, e por isso nunca
    // gera indicação na sessão em que foi acrescentado (FR-089, T106): a lista
    // de metas dele é vazia, e a regra devolve `sem_plano`.
    const indicacoes = new Map(
      await Promise.all(
        sessao.exercicios.map(async (item) => {
          const metas = plano.porExercicioSessao.get(item.exercicio.id) ?? []
          return [
            item.exercicio.id,
            await repositorioProgressao.indicacaoPara(
              item.exercicio.exercicioId,
              metas.map((meta) => ({
                ordem: meta.ordem,
                repeticoes: meta.repeticoes,
                cargaKg: meta.cargaKg,
                rir: meta.rir,
              })),
              { ignorarSessaoId: sessao.sessao.id },
            ),
          ] as const
        }),
      ),
    )

    return {
      sessao,
      plano,
      exercicios,
      anteriores,
      indicacoes,
      descansos,
      ponto: pontoDeRetomada(sessao, plano),
    }
  }, [sessaoId])

  if (dados === undefined) return null

  if (dados === null) {
    return (
      <main className={estilos.tela}>
        <div className={estilos.corpo}>
          <Faixa tom="critica" papel="alert">
            Esta sessão não existe mais neste aparelho.
          </Faixa>
          <Botao onClick={() => navegar({ nome: 'treinos' })}>Voltar aos treinos</Botao>
        </div>
      </main>
    )
  }

  const { sessao, plano, exercicios, anteriores, indicacoes, descansos, ponto } = dados

  if (sessao.sessao.estado !== 'em_andamento') {
    return (
      <ResumoDaSessao
        sessao={sessao}
        plano={plano}
        exercicios={exercicios}
        aoSair={() => {
          encerrarStore()
          navegar({ nome: 'historico' })
        }}
      />
    )
  }

  const itens = sessao.exercicios

  /**
   * FR-032 — retomar exatamente no ponto em que parou.
   *
   * O foco explícito do usuário vence; na ausência dele, o ponto de retomada é
   * **derivado** das séries já registradas, e não lido de um campo. Reabrir o
   * aplicativo no meio de uma sessão cai direto no exercício e na série
   * seguintes, sem o usuário precisar procurar onde estava.
   */
  const emFoco =
    itens.find((item) => item.exercicio.id === exercicioEmFoco) ??
    itens.find((item) => item.exercicio.id === ponto.exercicioSessaoId) ??
    itens[0]

  if (!emFoco) {
    return (
      <main className={estilos.tela}>
        <div className={estilos.corpo}>
          <p>Este treino não tem exercícios. Acrescente um ou encerre a sessão.</p>
          <Botao variante="secundario" onClick={() => definirAcrescentando(true)}>
            Acrescentar exercício
          </Botao>
          <Botao onClick={() => void encerrar('concluir')}>Concluir treino</Botao>
          {acrescentando ? (
            <SeletorExercicio
              aoEscolher={(exercicio) => void acrescentar(exercicio.id)}
              aoFechar={() => definirAcrescentando(false)}
            />
          ) : null}
        </div>
      </main>
    )
  }

  const metas = plano.porExercicioSessao.get(emFoco.exercicio.id) ?? []
  const seriesRegistradas = emFoco.series
  const proximaOrdem = seriesRegistradas.length + 1
  const metaDaVez: MetaDaSerie | undefined = metas[proximaOrdem - 1]
  const rascunho = rascunhoDe(rascunhos, emFoco.exercicio.id)
  const ehDropset = emFoco.exercicio.abordagem === 'dropset'

  /**
   * FR-137 — todas as séries planejadas registradas.
   *
   * Antes desta verificação, a tela oferecia "Série 4 de 4 — série extra" como
   * o passo natural assim que a terceira era confirmada, com o botão primário
   * ativo. Foi o que levou o usuário a registrar uma série que não existia no
   * plano: o aplicativo conduziu para lá.
   */
  const exercicioCompleto =
    metas.length > 0 && seriesRegistradas.filter((s) => !s.naoRealizada).length >= metas.length

  // FR-085: a carga vem da série anterior **do mesmo exercício**, e nunca na
  // primeira série. O valor herdado é dado efetivo, não sugestão (FR-119) — e
  // por isso é exibido igual a um digitado, sem marca d'água nem tom próprio.
  const cargaDeBase =
    rascunho.cargaKg ?? cargaHerdada(seriesRegistradas, proximaOrdem)

  const agora = agoraUtc()
  const indiceAtual = itens.findIndex((item) => item.exercicio.id === emFoco.exercicio.id)
  const serieDeEdicao =
    serieEmEdicao === null
      ? undefined
      : seriesRegistradas.find((serie) => serie.id === serieEmEdicao)

  // O cabeçalho mostrava a posição do exercício, que o paginador agora anuncia
  // melhor. No lugar dela vai o total de séries da sessão — informação que não
  // estava em lugar nenhum e que é o que o usuário quer saber de relance.
  const seriesConcluidasNaSessao = itens.reduce(
    (total, item) => total + item.series.filter((serie) => !serie.naoRealizada).length,
    0,
  )

  /** FR-131: na ponta, sinaliza o limite sem encerrar nem interromper a sessão. */
  function irPara(passo: 1 | -1) {
    const destino = itens[indiceAtual + passo]
    if (!destino) {
      definirLimiteAtingido(passo === 1 ? 'fim' : 'inicio')
      return
    }
    definirLimiteAtingido(null)
    definirRegistrandoExtra(false)
    definirSerieEmEdicao(null)
    focar(destino.exercicio.id)
  }

  const gesto = montarGesto({
    aoAvancar: () => irPara(1),
    aoRecuar: () => irPara(-1),
    // O gesto não compete com um diálogo aberto.
    desabilitado:
      acrescentando || confirmandoDescarte || falha !== null || serieEmEdicao !== null,
  })

  const estado = estadoExercicioSessao({
    series: seriesRegistradas,
    naoRealizado: emFoco.exercicio.naoRealizado,
    seriesPlanejadas: metas.length,
  })

  async function confirmarSerie() {
    if (!emFoco) return
    definirGravando(true)
    try {
      await repositorioSessoes.registrarSerie(emFoco.exercicio.id, {
        ordem: proximaOrdem,
        cargaKg: ehDropset ? (degraus[0]?.cargaKg ?? null) : cargaDeBase,
        repeticoes: ehDropset
          ? degraus.reduce((total, degrau) => total + degrau.repeticoes, 0)
          : rascunho.repeticoes,
        rir: rascunho.rir,
        seriePlanejadaId: metaDaVez?.seriePlanejadaId ?? null,
        degraus: ehDropset ? degraus : null,
      })

      // Só aqui, depois do commit. O rascunho mantém a carga para a série
      // seguinte herdar; repetições e RIR voltam a vazio.
      definirRascunho(emFoco.exercicio.id, { repeticoes: null, rir: null })
      definirRegistrandoExtra(false)

      // Fixa o foco no exercício corrente. Sem isto, completar a última série
      // planejada faria a derivação de retomada saltar para o exercício
      // seguinte no mesmo instante da confirmação — e o usuário perderia de
      // vista justamente a série que acabou de registrar. A derivação continua
      // valendo para **abrir** a sessão (FR-032); ela não decide a navegação
      // durante o treino.
      focar(emFoco.exercicio.id)
      if (ehDropset) definirDegraus([{ ordem: 1, cargaKg: degraus[0]?.cargaKg ?? 0, repeticoes: 0 }])
    } catch (erro) {
      definirFalha(erro)
    } finally {
      definirGravando(false)
    }
  }

  async function marcarSerieNaoRealizada() {
    if (!emFoco) return
    definirGravando(true)
    try {
      await repositorioSessoes.registrarSerie(emFoco.exercicio.id, {
        ordem: proximaOrdem,
        cargaKg: null,
        repeticoes: null,
        rir: null,
        naoRealizada: true,
        seriePlanejadaId: metaDaVez?.seriePlanejadaId ?? null,
      })
      focar(emFoco.exercicio.id)
    } catch (erro) {
      definirFalha(erro)
    } finally {
      definirGravando(false)
    }
  }

  async function alternarExercicioNaoRealizado() {
    if (!emFoco) return
    try {
      const marcando = !emFoco.exercicio.naoRealizado
      // FR-126: marcar não apaga série nenhuma já registrada. O rascunho, sim —
      // ele não é registro, e manter valores digitados num exercício que o
      // usuário acabou de pular seria confuso ao voltar.
      await repositorioSessoes.marcarExercicioNaoRealizado(emFoco.exercicio.id, marcando)
      if (marcando) limparRascunho(emFoco.exercicio.id)
    } catch (erro) {
      definirFalha(erro)
    }
  }

  async function acrescentar(exercicioId: Id) {
    definirAcrescentando(false)
    try {
      // FR-087, FR-088: entra sem plano associado, e por isso não gera
      // indicação de progressão nesta sessão (FR-089).
      const novo = await repositorioSessoes.acrescentarExercicio(sessaoId, {
        exercicioId,
        abordagem: 'tradicional',
        origem: 'fora_do_plano',
        itemTreinoId: null,
      })
      focar(novo.exercicio.id)
    } catch (erro) {
      definirFalha(erro)
    }
  }

  async function encerrar(transicao: 'concluir' | 'descartar') {
    try {
      await repositorioSessoes.encerrar(sessaoId, transicao)
      definirConfirmandoDescarte(false)
      if (transicao === 'descartar') {
        encerrarStore()
        navegar({ nome: 'treinos' })
      }
    } catch (erro) {
      definirFalha(erro)
    }
  }

  const podeConfirmar = ehDropset
    ? degraus.some((degrau) => degrau.repeticoes > 0)
    : rascunho.repeticoes !== null

  return (
    <main className={estilos.tela}>
      <header className={estilos.cabecalho}>
        <span className={estilos.nomeDoTreino}>{sessao.sessao.nomeTreino}</span>
        <span className={`${estilos.progresso} numerico`}>
          {seriesConcluidasNaSessao} {seriesConcluidasNaSessao === 1 ? 'série' : 'séries'}
        </span>
        <Botao variante="discreto" onClick={() => navegar({ nome: 'treinos' })}>
          Sair
        </Botao>
      </header>

      <div className={estilos.corpo} {...gesto}>
        <NavegacaoExercicios
          exercicios={itens.map((item) => {
            const metasDele = plano.porExercicioSessao.get(item.exercicio.id) ?? []
            return {
              id: item.exercicio.id,
              nome: exercicios.get(item.exercicio.exercicioId)?.nome ?? 'Exercício',
              estado: estadoExercicioSessao({
                series: item.series,
                naoRealizado: item.exercicio.naoRealizado,
                seriesPlanejadas: metasDele.length,
              }),
            }
          })}
          emFocoId={emFoco.exercicio.id}
          aoFocar={(id) => {
            definirLimiteAtingido(null)
            definirRegistrandoExtra(false)
            definirSerieEmEdicao(null)
            focar(id)
          }}
          aoAcrescentar={() => definirAcrescentando(true)}
          limiteAtingido={limiteAtingido}
        />

        {estado === 'inconsistente' ? (
          <Faixa tom="critica" papel="alert">
            <div className={estilos.avisoInconsistente}>
              Este exercício está marcado como não realizado e mesmo assim tem séries registradas.
              O aplicativo não escolhe entre os dois. Desmarque-o ou remova as séries para resolver.
            </div>
          </Faixa>
        ) : null}

        <CabecalhoExercicio
          nome={exercicios.get(emFoco.exercicio.exercicioId)?.nome ?? 'Exercício'}
          anterior={
            anteriores.get(emFoco.exercicio.id)
              ? {
                  cargaKg: anteriores.get(emFoco.exercicio.id)!.cargaKg,
                  quando: anteriores.get(emFoco.exercicio.id)!.concluidaEm,
                }
              : null
          }
          agora={agora}
          aoAplicarCarga={(cargaKg) => definirRascunho(emFoco.exercicio.id, { cargaKg })}
        />

        {indicacoes.get(emFoco.exercicio.id) ? (
          <AvisoProgressao
            indicacao={indicacoes.get(emFoco.exercicio.id)!}
            nomeDoExercicio={exercicios.get(emFoco.exercicio.exercicioId)?.nome ?? 'Exercício'}
            agora={agora}
          />
        ) : null}

        {exercicioCompleto && !registrandoExtra ? (
          <section className={estilos.cartaoConcluido}>
            <p className={estilos.tituloConcluido}>
              <span aria-hidden="true">✓</span> Exercício completo
            </p>
            <p className={estilos.textoConcluido}>
              As <span className="numerico">{metas.length}</span>{' '}
              {metas.length === 1 ? 'série planejada foi registrada' : 'séries planejadas foram registradas'}.
            </p>

            <div className={estilos.acoesConcluido}>
              {indiceAtual < itens.length - 1 ? (
                <Botao principal onClick={() => irPara(1)}>
                  Próximo exercício
                </Botao>
              ) : (
                <Botao principal onClick={() => void encerrar('concluir')}>
                  Concluir treino
                </Botao>
              )}

              {/*
                FR-138 — a série além das planejadas exige ação explícita e
                distinta de confirmar a seguinte. É deliberadamente discreta:
                ela é a exceção, não o passo natural.
              */}
              <Botao variante="discreto" onClick={() => definirRegistrandoExtra(true)}>
                Registrar série a mais
              </Botao>
            </div>
          </section>
        ) : (
        <section className={estilos.cartaoSerie}>
          <div className={estilos.identificacaoSerie}>
            <span className={estilos.numeroDaSerie}>
              Série <span className="numerico">{proximaOrdem}</span>
              {metas.length > 0 ? (
                <span className="numerico"> de {Math.max(metas.length, proximaOrdem)}</span>
              ) : null}
            </span>
            <span className={estilos.meta}>
              {metaDaVez ? (
                <>
                  meta{' '}
                  <span className="numerico">
                    {formatarIntervalo(intervaloDe(metaDaVez))} reps,{' '}
                    {formatarCarga(metaDaVez.cargaKg)} kg
                    {metaDaVez.rir !== null ? `, RIR ${metaDaVez.rir}` : ''}
                  </span>
                </>
              ) : (
                'série extra'
              )}
            </span>
          </div>

          {descansos.get(emFoco.exercicio.id) !== null &&
          descansos.get(emFoco.exercicio.id) !== undefined ? (
            <p className={estilos.descanso} data-descanso>
              descanso{' '}
              <span className="numerico">{descansos.get(emFoco.exercicio.id)} s</span>
            </p>
          ) : null}

          {ehDropset ? (
            <RegistroDropset degraus={degraus} aoMudar={definirDegraus} />
          ) : (
            <>
              <div className={estilos.numerais}>
                <div className={estilos.campoNumeral}>
                  <span className={estilos.rotuloNumeral} id="rotulo-carga">
                    carga
                  </span>
                  <input
                    className={`${estilos.entradaNumeral} numerico`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={cargaDeBase ?? ''}
                    aria-labelledby="rotulo-carga"
                    onChange={(evento) =>
                      definirRascunho(emFoco.exercicio.id, {
                        cargaKg: evento.target.value === '' ? null : Number(evento.target.value),
                      })
                    }
                  />
                  <div className={estilos.reguaNumeral} />
                  <span className={estilos.unidade}>kg</span>
                </div>

                <div className={estilos.campoNumeral}>
                  <span className={estilos.rotuloNumeral} id="rotulo-reps">
                    repetições
                  </span>
                  <input
                    className={`${estilos.entradaNumeral} numerico`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={rascunho.repeticoes ?? ''}
                    aria-labelledby="rotulo-reps"
                    onChange={(evento) =>
                      definirRascunho(emFoco.exercicio.id, {
                        repeticoes:
                          evento.target.value === '' ? null : Number(evento.target.value),
                      })
                    }
                  />
                  <div className={estilos.reguaNumeral} />
                  <span className={estilos.unidade}>reps</span>
                </div>
              </div>

              {metaDaVez ? (
                <div className={estilos.atalhos}>
                  {/*
                    Com intervalo, os atalhos que importam são o topo da faixa —
                    o alvo cumprido — e um a mais, que é o que indica progressão
                    (FR-142). Com ponta única, os dois são os de sempre.
                  */}
                  <button
                    type="button"
                    className={estilos.atalho}
                    onClick={() =>
                      definirRascunho(emFoco.exercicio.id, {
                        repeticoes: intervaloDe(metaDaVez).maximo,
                      })
                    }
                  >
                    Fiz {intervaloDe(metaDaVez).maximo}
                  </button>
                  <button
                    type="button"
                    className={estilos.atalho}
                    onClick={() =>
                      definirRascunho(emFoco.exercicio.id, {
                        repeticoes: intervaloDe(metaDaVez).maximo + 1,
                      })
                    }
                  >
                    Fiz {intervaloDe(metaDaVez).maximo + 1}
                  </button>
                </div>
              ) : null}

              {/* RIR é opcional: a série é registrável sem ele (FR-029). */}
              <div className={estilos.linhaRir}>
                <PassoNumerico
                  rotulo="RIR"
                  sufixo="opcional"
                  valor={rascunho.rir}
                  aoMudar={(rir) => definirRascunho(emFoco.exercicio.id, { rir })}
                  minimo={0}
                  maximo={10}
                />
              </div>
            </>
          )}
        </section>
        )}

        {seriesRegistradas.length > 0 ? (
          <div className={estilos.razao}>
            <p className={estilos.dicaEditar}>Toque numa série para corrigir ou remover.</p>
            {seriesRegistradas.map((serie) => {
              const meta = metas[serie.ordem - 1]
              const comparacao = compararSerie(
                meta
                  ? { repeticoes: meta.repeticoes, cargaKg: meta.cargaKg, rir: meta.rir }
                  : null,
                serie,
              )
              return (
                <button
                  key={serie.id}
                  type="button"
                  className={estilos.linhaRazaoEditavel}
                  data-serie-registrada={serie.ordem}
                  onClick={() => definirSerieEmEdicao(serie.id)}
                  aria-label={`Corrigir ou remover a série ${serie.ordem}`}
                >
                  <span className={`${estilos.ordemRazao} numerico`}>{serie.ordem}</span>
                  {serie.naoRealizada ? (
                    <span className={estilos.serieNaoRealizada}>não realizada</span>
                  ) : (
                    <span className={`${estilos.valoresRazao} numerico`}>
                      {formatarCarga(serie.cargaKg)} kg × {serie.repeticoes ?? '—'}
                        <span className={classeDaMarca(comparacao.repeticoes)}>
                        {' '}
                        {marca(comparacao.repeticoes)}
                      </span>
                    </span>
                  )}
                  <span className={`${estilos.rirRazao} numerico`}>
                    {serie.rir !== null ? `RIR ${serie.rir}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <footer className={estilos.rodape}>
        {exercicioCompleto && !registrandoExtra ? null : (
          <Botao
            principal
            onClick={() => void confirmarSerie()}
            disabled={!podeConfirmar || gravando}
          >
            {gravando ? 'Salvando…' : 'Confirmar série'}
          </Botao>
        )}

        <div className={estilos.acoesSecundarias}>
          <Botao
            variante="secundario"
            onClick={() => void marcarSerieNaoRealizada()}
            disabled={exercicioCompleto && !registrandoExtra}
          >
            Não fiz esta série
          </Botao>
          <Botao variante="secundario" onClick={() => void alternarExercicioNaoRealizado()}>
            {emFoco.exercicio.naoRealizado ? 'Voltar ao exercício' : 'Pular exercício'}
          </Botao>
        </div>

        <div className={estilos.acoesSecundarias}>
          <Botao variante="discreto" onClick={() => definirConfirmandoDescarte(true)}>
            Descartar treino
          </Botao>
          {/*
            Enquanto o cartão de exercício completo já oferece "Concluir
            treino", o rodapé não repete: a mesma ação em dois lugares da mesma
            tela faz o usuário hesitar sobre se são a mesma coisa.
          */}
          {exercicioCompleto && !registrandoExtra && indiceAtual === itens.length - 1 ? null : (
            <Botao variante="discreto" onClick={() => void encerrar('concluir')}>
              Concluir treino
            </Botao>
          )}
        </div>
      </footer>

      {acrescentando ? (
        <SeletorExercicio
          aoEscolher={(exercicio) => void acrescentar(exercicio.id)}
          aoFechar={() => definirAcrescentando(false)}
        />
      ) : null}

      {confirmandoDescarte ? (
        <ConfirmarDescarte
          aoConfirmar={() => void encerrar('descartar')}
          aoCancelar={() => definirConfirmandoDescarte(false)}
        />
      ) : null}

      {/*
        A série some da lista assim que é removida, e o `useLiveQuery` reflete
        isso antes de o painel fechar. Procurar sem verificar deixaria um
        instante em que o painel tenta renderizar uma série que não existe mais.
      */}
      {serieDeEdicao ? (
        <EditorSerieRegistrada serie={serieDeEdicao} aoFechar={() => definirSerieEmEdicao(null)} />
      ) : null}

      {falha !== null ? (
        <FalhaAoPersistir
          erro={falha}
          aoTentarDeNovo={async () => {
            definirFalha(null)
            await confirmarSerie()
          }}
          aoDispensar={() => definirFalha(null)}
        />
      ) : null}

      {/* O estado do exercício é anunciado a leitor de tela sem interromper. */}
      <span className="apenasLeitorDeTela" aria-live="polite">
        {textoDoEstado(estado)}
      </span>
    </main>
  )
}

type Marca = ReturnType<typeof compararSerie>['repeticoes']

function classeDaMarca(comparacao: Marca): string {
  if (comparacao === 'acima') return estilos.marcaAcima!
  if (comparacao === 'abaixo') return estilos.marcaAbaixo!
  return estilos.marcaIgual!
}

function marca(comparacao: Marca): string {
  // Marca textual, nunca só cor: a comparação precisa ser legível em preto e
  // branco e por leitor de tela.
  switch (comparacao) {
    case 'acima':
      return '▲ acima da meta'
    case 'abaixo':
      return '▼ abaixo da meta'
    case 'igual':
      return '= na meta'
    default:
      return ''
  }
}
