/**
 * Planejamento de dropset — FR-013, FR-014.
 *
 * No dropset a série é uma sequência encadeada de degraus: carga cai, as
 * repetições saem até falhar. O planejamento aqui usa **as mesmas linhas de
 * `seriesPlanejadas`** de uma série tradicional, lidas como degraus — o modelo
 * não ganha campo novo, que é o que FR-014 e a política aditiva do Princípio IV
 * pedem. Os degraus **realizados**, com seus valores próprios, são registrados
 * na execução em `seriesRealizadas.degraus` (FR-015).
 */
import type { ValoresPlanejados } from '../../domain/treino'
import { Botao } from '../../ui/Botao'
import estilos from './treinos.module.css'

type Props = {
  degraus: readonly ValoresPlanejados[]
  /** Recebe **como alterar**. A razão está em `EditorSeries`. */
  aoMudar: (
    transformar: (atuais: readonly ValoresPlanejados[]) => readonly ValoresPlanejados[],
  ) => void
}

export function EditorDropset({ degraus, aoMudar }: Props) {
  function alterar(indice: number, campo: 'cargaKg' | 'repeticoes', bruto: string) {
    const valor = bruto === '' ? 0 : Number(bruto)
    aoMudar((atuais) =>
      atuais.map((degrau, i) => (i === indice ? { ...degrau, [campo]: valor } : degrau)),
    )
  }

  function acrescentar() {
    aoMudar((atuais) => {
      const ultimo = atuais[atuais.length - 1]
      return [
        ...atuais,
        {
          // O degrau seguinte começa mais leve: é o que dropset significa. O
          // valor é ponto de partida editável, não regra.
          cargaKg: ultimo ? Math.max(0, Math.round(ultimo.cargaKg * 0.8 * 2) / 2) : 0,
          repeticoes: ultimo?.repeticoes ?? 8,
          repeticoesMax: ultimo?.repeticoesMax ?? null,
          rir: ultimo?.rir ?? null,
        },
      ]
    })
  }

  function remover(indice: number) {
    aoMudar((atuais) => atuais.filter((_, i) => i !== indice))
  }

  return (
    <>
      <p className={estilos.grupoItem}>
        Cada degrau é uma queda de carga dentro da mesma série, sem descanso entre eles.
      </p>

      <div className={estilos.degraus}>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />
        <span className={estilos.cabecalhoColuna}>Carga (kg)</span>
        <span className={estilos.cabecalhoColuna}>Repetições</span>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />

        {degraus.map((degrau, indice) => (
          <FragmentoDeDegrau
            key={indice}
            indice={indice}
            degrau={degrau}
            podeRemover={degraus.length > 1}
            aoAlterar={alterar}
            aoRemover={() => remover(indice)}
          />
        ))}
      </div>

      <div className={estilos.acoesSeries}>
        <Botao variante="secundario" onClick={acrescentar}>
          Acrescentar degrau
        </Botao>
      </div>
    </>
  )
}

type PropsDegrau = {
  indice: number
  degrau: ValoresPlanejados
  podeRemover: boolean
  aoAlterar: (indice: number, campo: 'cargaKg' | 'repeticoes', valor: string) => void
  aoRemover: () => void
}

function FragmentoDeDegrau({ indice, degrau, podeRemover, aoAlterar, aoRemover }: PropsDegrau) {
  const numero = indice + 1
  return (
    <>
      <span className={`${estilos.setaDegrau} numerico`} aria-hidden="true">
        {indice === 0 ? '1' : '↓'}
      </span>
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={degrau.cargaKg}
        aria-label={`Carga do degrau ${numero} em quilos`}
        onChange={(evento) => aoAlterar(indice, 'cargaKg', evento.target.value)}
      />
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={degrau.repeticoes}
        aria-label={`Repetições do degrau ${numero}`}
        onChange={(evento) => aoAlterar(indice, 'repeticoes', evento.target.value)}
      />
      <button
        type="button"
        className={`${estilos.botaoIcone} ${estilos.botaoIconeSecundario}`}
        onClick={aoRemover}
        disabled={!podeRemover}
        aria-label={`Remover degrau ${numero}`}
      >
        ×
      </button>
    </>
  )
}
