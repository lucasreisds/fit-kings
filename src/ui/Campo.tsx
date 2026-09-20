import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import estilos from './componentes.module.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  rotulo: string
  dica?: ReactNode
  erro?: string | null
}

/** Campo de texto rotulado. O rótulo é sempre associado — nunca só placeholder. */
export function Campo({ rotulo, dica, erro, className, ...resto }: Props) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ')

  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo} htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className={[estilos.entrada, className].filter(Boolean).join(' ')}
        aria-describedby={descritores || undefined}
        aria-invalid={erro ? true : undefined}
        {...resto}
      />
      {dica ? (
        <span className={estilos.dica} id={idDica}>
          {dica}
        </span>
      ) : null}
      {erro ? (
        <span className={estilos.mensagemDeErro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  )
}
