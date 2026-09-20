/**
 * Ícones da navegação. Inline, sem biblioteca: são quatro, e uma dependência
 * para quatro formas custaria mais bytes offline do que desenhar.
 *
 * Cada um é o objeto da seção, não um símbolo abstrato — a anilha para treinos,
 * a grade do caderno para o histórico, a linha ascendente para o progresso.
 */
type Props = { nome: NomeDeIcone; className?: string }

export type NomeDeIcone = 'treinos' | 'historico' | 'progresso' | 'ajustes'

export function Icone({ nome, className }: Props) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {desenho(nome)}
    </svg>
  )
}

function desenho(nome: NomeDeIcone) {
  switch (nome) {
    // Barra com anilhas: o treino montado.
    case 'treinos':
      return (
        <>
          <path d="M4 9v6M7 7v10M20 9v6M17 7v10" />
          <path d="M7 12h10" />
        </>
      )
    // Páginas do caderno de registro, empilhadas.
    case 'historico':
      return (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M9 9.5V19M14.5 9.5V19" />
        </>
      )
    // A linha de carga subindo ao longo das semanas.
    case 'progresso':
      return (
        <>
          <path d="M4 19h16" />
          <path d="M5 15.5l4.5-5 3.5 3 5.5-7" />
        </>
      )
    case 'ajustes':
      return (
        <>
          <path d="M6 5v14M12 5v14M18 5v14" />
          <circle cx="6" cy="9" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="8" r="2" fill="currentColor" stroke="none" />
        </>
      )
  }
}
