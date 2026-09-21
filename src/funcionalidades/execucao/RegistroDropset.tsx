/**
 * Registro de dropset — FR-013, FR-015.
 *
 * A série de dropset é uma sequência encadeada de degraus, cada um com carga e
 * repetições próprias. O que fica no histórico é o que foi registrado aqui,
 * degrau a degrau, junto da abordagem usada (FR-015).
 */
import type { Degrau } from '../../domain/tipos'
import { Botao } from '../../ui/Botao'
import estilos from './execucao.module.css'
import estilosTreino from '../treinos/treinos.module.css'

type Props = {
  degraus: readonly Degrau[]
  aoMudar: (degraus: readonly Degrau[]) => void
}

export function RegistroDropset({ degraus, aoMudar }: Props) {
  function alterar(indice: number, campo: 'cargaKg' | 'repeticoes', bruto: string) {
    const valor = bruto === '' ? 0 : Number(bruto)
    aoMudar(degraus.map((degrau, i) => (i === indice ? { ...degrau, [campo]: valor } : degrau)))
  }

  function acrescentar() {
    const ultimo = degraus[degraus.length - 1]
    aoMudar([
      ...degraus,
      {
        ordem: degraus.length + 1,
        cargaKg: ultimo ? Math.max(0, Math.round(ultimo.cargaKg * 0.8 * 2) / 2) : 0,
        repeticoes: 0,
      },
    ])
  }

  function remover(indice: number) {
    aoMudar(degraus.filter((_, i) => i !== indice).map((degrau, i) => ({ ...degrau, ordem: i + 1 })))
  }

  return (
    <div className={estilos.grupoResumo}>
      <span className={estilos.rotuloNumeral}>Degraus desta série</span>

      <div className={estilosTreino.degraus}>
        <span className={estilosTreino.cabecalhoColuna} aria-hidden="true" />
        <span className={estilosTreino.cabecalhoColuna}>Carga (kg)</span>
        <span className={estilosTreino.cabecalhoColuna}>Repetições</span>
        <span className={estilosTreino.cabecalhoColuna} aria-hidden="true" />

        {degraus.map((degrau, indice) => (
          <div key={indice} style={{ display: 'contents' }}>
            <span className={`${estilosTreino.setaDegrau} numerico`} aria-hidden="true">
              {indice === 0 ? '1' : '↓'}
            </span>
            <input
              className={`${estilosTreino.entradaSerie} numerico`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={degrau.cargaKg}
              aria-label={`Carga do degrau ${indice + 1} em quilos`}
              onChange={(evento) => alterar(indice, 'cargaKg', evento.target.value)}
            />
            <input
              className={`${estilosTreino.entradaSerie} numerico`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={degrau.repeticoes}
              aria-label={`Repetições do degrau ${indice + 1}`}
              onChange={(evento) => alterar(indice, 'repeticoes', evento.target.value)}
            />
            <button
              type="button"
              className={`${estilosTreino.botaoIcone} ${estilosTreino.botaoIconeSecundario}`}
              onClick={() => remover(indice)}
              disabled={degraus.length <= 1}
              aria-label={`Remover degrau ${indice + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <Botao variante="secundario" onClick={acrescentar}>
        Acrescentar degrau
      </Botao>
    </div>
  )
}
