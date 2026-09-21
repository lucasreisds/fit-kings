/**
 * Correção de sessão concluída — FR-112, FR-113, FR-114, FR-116, FR-118.
 *
 * A tela só oferece os três campos corrigíveis — carga, repetições e RIR — de
 * séries que já existem. **Não há como acrescentar ou remover série ou
 * exercício, nem trocar a abordagem** (FR-113), e a ausência desses controles é
 * a forma mais confiável de garantir a regra: o que não existe na tela não
 * precisa ser validado depois.
 *
 * A confirmação é explícita (FR-118) e diz o que vai acontecer: uma versão nova,
 * com a anterior preservada.
 */
import { useState } from 'react'
import { Botao } from '../../ui/Botao'
import { Faixa } from '../../ui/Faixa'
import { repositorioSessoes, CorrecaoInvalidaError } from '../../dados/repositorios/sessoes'
import type { SessaoCompleta } from '../../dados/repositorios/sessoes'
import type { CorrecaoDeSerie } from '../../domain/sessao/versionar'
import type { PlanoDaSessao } from '../execucao/iniciarSessao'
import type { Exercicio, Id } from '../../domain/tipos'
import { formatarCarga } from '../../plataforma/formato'
import estilos from './historico.module.css'

type Props = {
  sessao: SessaoCompleta
  plano: PlanoDaSessao
  exercicios: ReadonlyMap<Id, Exercicio>
  aoConcluir: () => void
  aoCancelar: () => void
}

type Rascunho = Record<Id, { cargaKg: number | null; repeticoes: number | null; rir: number | null }>

export function CorrigirSessao({ sessao, plano, exercicios, aoConcluir, aoCancelar }: Props) {
  const [rascunho, definirRascunho] = useState<Rascunho>(() => partirDaSessao(sessao))
  const [confirmando, definirConfirmando] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)
  const [salvando, definirSalvando] = useState(false)

  const correcoes = montarCorrecoes(sessao, rascunho)

  function alterar(serieId: Id, campo: keyof Rascunho[Id], bruto: string) {
    const valor = bruto === '' ? null : Number(bruto)
    definirRascunho((atual) => ({
      ...atual,
      [serieId]: { ...atual[serieId]!, [campo]: Number.isFinite(valor) ? valor : null },
    }))
    definirErro(null)
  }

  async function confirmar() {
    definirSalvando(true)
    try {
      await repositorioSessoes.corrigir(sessao.sessao.id, correcoes)
      aoConcluir()
    } catch (falha) {
      definirErro(
        falha instanceof CorrecaoInvalidaError
          ? falha.message
          : 'Não foi possível salvar a correção. Nada foi alterado.',
      )
      definirConfirmando(false)
    } finally {
      definirSalvando(false)
    }
  }

  return (
    <div className={estilos.correcao}>
      <header className={estilos.cabecalhoDetalhe}>
        <h2 className={estilos.tituloDetalhe}>Corrigir {sessao.sessao.nomeTreino}</h2>
        <span className={estilos.vazioTexto}>
          Dá para ajustar carga, repetições e RIR das séries que você registrou. Séries e exercícios
          não podem ser acrescentados nem removidos.
        </span>
      </header>

      {erro ? (
        <Faixa tom="critica" papel="alert">
          {erro}
        </Faixa>
      ) : null}

      {sessao.exercicios.map((item) => {
        const metas = plano.porExercicioSessao.get(item.exercicio.id) ?? []
        if (item.series.length === 0) return null

        return (
          <section key={item.exercicio.id} className={estilos.exercicio}>
            <h3 className={estilos.nomeExercicio}>
              {exercicios.get(item.exercicio.exercicioId)?.nome ?? 'Exercício'}
            </h3>

            <div className={estilos.gradeCorrecao}>
              <span className={estilos.cabecalhoGrade} aria-hidden="true" />
              <span className={estilos.cabecalhoGrade}>Carga (kg)</span>
              <span className={estilos.cabecalhoGrade}>Repetições</span>
              <span className={estilos.cabecalhoGrade}>RIR</span>

              {item.series.map((serie) => {
                const meta = metas[serie.ordem - 1]
                const valores = rascunho[serie.id]!
                const nomeExercicio = exercicios.get(item.exercicio.exercicioId)?.nome ?? 'exercício'

                return (
                  <div key={serie.id} style={{ display: 'contents' }}>
                    <span className={`${estilos.ordem} numerico`} title={rotuloDaMeta(meta)}>
                      {serie.ordem}
                    </span>
                    <input
                      className={`${estilos.entradaCorrecao} ${
                        valores.cargaKg !== serie.cargaKg ? estilos.entradaAlterada : ''
                      } numerico`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={valores.cargaKg ?? ''}
                      aria-label={`Carga da série ${serie.ordem} de ${nomeExercicio}`}
                      onChange={(evento) => alterar(serie.id, 'cargaKg', evento.target.value)}
                    />
                    <input
                      className={`${estilos.entradaCorrecao} ${
                        valores.repeticoes !== serie.repeticoes ? estilos.entradaAlterada : ''
                      } numerico`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={valores.repeticoes ?? ''}
                      aria-label={`Repetições da série ${serie.ordem} de ${nomeExercicio}`}
                      onChange={(evento) => alterar(serie.id, 'repeticoes', evento.target.value)}
                    />
                    <input
                      className={`${estilos.entradaCorrecao} ${
                        valores.rir !== serie.rir ? estilos.entradaAlterada : ''
                      } numerico`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={valores.rir ?? ''}
                      aria-label={`RIR da série ${serie.ordem} de ${nomeExercicio}`}
                      onChange={(evento) => alterar(serie.id, 'rir', evento.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {confirmando ? (
        <Faixa tom="acento">
          <div>
            <strong>
              <span className="numerico">{correcoes.length}</span>{' '}
              {correcoes.length === 1 ? 'série será corrigida' : 'séries serão corrigidas'}.
            </strong>{' '}
            Isso cria uma versão nova desta sessão. A versão atual continua guardada neste aparelho,
            e a data do treino não muda.
          </div>
        </Faixa>
      ) : null}

      <div className={estilos.acoes}>
        <Botao variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>

        {confirmando ? (
          <Botao onClick={() => void confirmar()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Confirmar correção'}
          </Botao>
        ) : (
          <Botao onClick={() => definirConfirmando(true)} disabled={correcoes.length === 0}>
            {correcoes.length === 0 ? 'Nada mudou ainda' : 'Revisar correção'}
          </Botao>
        )}
      </div>
    </div>
  )
}

function partirDaSessao(sessao: SessaoCompleta): Rascunho {
  const rascunho: Rascunho = {}
  for (const item of sessao.exercicios) {
    for (const serie of item.series) {
      rascunho[serie.id] = {
        cargaKg: serie.cargaKg,
        repeticoes: serie.repeticoes,
        rir: serie.rir,
      }
    }
  }
  return rascunho
}

function montarCorrecoes(sessao: SessaoCompleta, rascunho: Rascunho): CorrecaoDeSerie[] {
  const correcoes: CorrecaoDeSerie[] = []

  for (const item of sessao.exercicios) {
    for (const serie of item.series) {
      const valores = rascunho[serie.id]
      if (!valores) continue

      const mudou =
        valores.cargaKg !== serie.cargaKg ||
        valores.repeticoes !== serie.repeticoes ||
        valores.rir !== serie.rir

      if (mudou) {
        correcoes.push({
          serieId: serie.id,
          cargaKg: valores.cargaKg,
          repeticoes: valores.repeticoes,
          rir: valores.rir,
        })
      }
    }
  }

  return correcoes
}

function rotuloDaMeta(meta: { repeticoes: number; cargaKg: number } | undefined): string {
  return meta ? `meta ${meta.repeticoes} × ${formatarCarga(meta.cargaKg)} kg` : 'série extra'
}
