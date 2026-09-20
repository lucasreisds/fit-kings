import { useId } from 'react'
import estilos from './componentes.module.css'

type Props = {
  rotulo: string
  valor: number | null
  aoMudar: (valor: number | null) => void
  passo?: number
  minimo?: number
  maximo?: number
  /** Repetições e carga são inteiros ou fracionados conforme o caso. */
  decimais?: boolean
  sufixo?: string
  autoFocus?: boolean
}

/**
 * Ajuste de número sem abrir o teclado do sistema — dois alvos de 44 pt
 * ladeando o valor. É o que mantém o registro de série em 3 toques quando só as
 * repetições mudam (SC-001, FR-021).
 */
export function PassoNumerico({
  rotulo,
  valor,
  aoMudar,
  passo = 1,
  minimo = 0,
  maximo,
  decimais = false,
  sufixo,
  autoFocus = false,
}: Props) {
  const id = useId()

  function ajustar(delta: number) {
    const base = valor ?? minimo
    const bruto = base + delta
    const limitado = Math.min(maximo ?? Number.POSITIVE_INFINITY, Math.max(minimo, bruto))
    aoMudar(decimais ? Math.round(limitado * 100) / 100 : Math.round(limitado))
  }

  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo} htmlFor={id}>
        {rotulo}
        {sufixo ? ` (${sufixo})` : null}
      </label>
      <div className={estilos.passo}>
        <button
          type="button"
          className={estilos.passoBotao}
          onClick={() => ajustar(-passo)}
          disabled={valor !== null && valor <= minimo}
          aria-label={`Diminuir ${rotulo}`}
        >
          −
        </button>
        <input
          id={id}
          className={`${estilos.passoValor} numerico`}
          type="number"
          inputMode={decimais ? 'decimal' : 'numeric'}
          step={passo}
          min={minimo}
          max={maximo}
          value={valor ?? ''}
          placeholder="—"
          autoFocus={autoFocus}
          onChange={(evento) => {
            const texto = evento.target.value
            if (texto === '') return aoMudar(null)
            const numero = Number(texto)
            aoMudar(Number.isFinite(numero) ? numero : null)
          }}
        />
        <button
          type="button"
          className={estilos.passoBotao}
          onClick={() => ajustar(passo)}
          disabled={maximo !== undefined && valor !== null && valor >= maximo}
          aria-label={`Aumentar ${rotulo}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
