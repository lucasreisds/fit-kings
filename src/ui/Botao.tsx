import type { ButtonHTMLAttributes, ReactNode } from 'react'
import estilos from './componentes.module.css'

export type VarianteBotao = 'primario' | 'secundario' | 'discreto' | 'destrutivo'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao
  /** Largura total e alvo de 56 pt — a ação mais repetida da tela (SC-001). */
  principal?: boolean
  children: ReactNode
}

/** Alvo de toque de 44 x 44 pt garantido pela folha, não pelo chamador (FR-054). */
export function Botao({
  variante = 'primario',
  principal = false,
  className,
  type = 'button',
  children,
  ...resto
}: Props) {
  const classes = [
    estilos.botao,
    estilos[variante],
    principal ? estilos.acaoPrincipal : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...resto}>
      {children}
    </button>
  )
}
