import type { HTMLAttributes, ReactNode } from 'react'
import estilos from './componentes.module.css'

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode }

/**
 * Superfície elevada. A elevação vem da **luminância** — branco puro sobre
 * papel quase branco —, nunca de sombra, transparência ou blur. O custo de
 * renderização não depende do que está atrás (D9 critério 2).
 */
export function Carta({ className, children, ...resto }: Props) {
  return (
    <div className={[estilos.carta, className].filter(Boolean).join(' ')} {...resto}>
      {children}
    </div>
  )
}
