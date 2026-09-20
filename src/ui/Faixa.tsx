import type { ReactNode } from 'react'
import estilos from './componentes.module.css'

export type TomDaFaixa = 'atencao' | 'critica' | 'positiva' | 'acento'

const CLASSES: Record<TomDaFaixa, string> = {
  atencao: estilos.faixaAtencao!,
  critica: estilos.faixaCritica!,
  positiva: estilos.faixaPositiva!,
  acento: estilos.faixaAcento!,
}

type Props = {
  tom: TomDaFaixa
  children: ReactNode
  /** `status` não interrompe leitor de tela; `alert` interrompe. */
  papel?: 'status' | 'alert'
}

/**
 * Faixa informativa. O tom nunca é o único portador do significado — o texto
 * diz o que houve, e a cor apenas reforça.
 */
export function Faixa({ tom, children, papel = 'status' }: Props) {
  return (
    <div className={`${estilos.faixa} ${CLASSES[tom]}`} role={papel}>
      {children}
    </div>
  )
}
