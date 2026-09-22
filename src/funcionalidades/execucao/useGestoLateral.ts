/**
 * Gesto de arrastar para trocar de exercício — FR-129, FR-130, D3.
 *
 * Eventos de ponteiro, sem biblioteca: o Princípio III desaconselha dependência
 * sem valor correspondente, e uma biblioteca de gestos custaria dezenas de
 * quilobytes precachados para resolver o que cabe aqui.
 *
 * **A parte difícil não é detectar o gesto, é não disparar** (FR-130). Sem as
 * guardas abaixo, arrastar dentro do campo de carga trocaria de exercício, e
 * rolar a faixa de exercícios faria o mesmo — dois jeitos de o aplicativo fazer
 * algo que o usuário não pediu, no meio de um treino.
 */
import { useRef, type PointerEvent as PointerEventoReact } from 'react'

/** Deslocamento mínimo para o gesto valer. Abaixo disso é toque, não arraste. */
export const LIMIAR_PX = 60

export type OpcoesDoGesto = {
  aoAvancar: () => void
  aoRecuar: () => void
  /** Desliga o gesto — usado quando um diálogo está aberto. */
  desabilitado?: boolean
}

type Origem = { x: number; y: number; valido: boolean }

/**
 * O gancho guarda apenas a origem do toque e devolve uma **fábrica** de
 * handlers, em vez de recebê-los na chamada.
 *
 * A forma é assim por causa das Regras dos Hooks: a tela de execução tem
 * retornos antecipados enquanto os dados carregam, e as funções de navegação só
 * existem depois disso. Chamando o gancho no topo e montando os handlers no
 * render, o `useRef` roda sempre — e não é preciso escrever em ref durante o
 * render para levar os callbacks até ele.
 */
export function useGestoLateral() {
  const origem = useRef<Origem | null>(null)

  return function handlers({ aoAvancar, aoRecuar, desabilitado = false }: OpcoesDoGesto) {
    function aoPressionar(evento: PointerEventoReact<HTMLElement>) {
      if (desabilitado) return
      origem.current = {
        x: evento.clientX,
        y: evento.clientY,
        valido: podeIniciarGesto(evento.target),
      }
    }

    function aoSoltar(evento: PointerEventoReact<HTMLElement>) {
      const inicio = origem.current
      origem.current = null
      if (!inicio || !inicio.valido || desabilitado) return

      const deslocamentoX = evento.clientX - inicio.x
      const deslocamentoY = evento.clientY - inicio.y

      if (Math.abs(deslocamentoX) < LIMIAR_PX) return
      // O movimento tem de ser mais horizontal que vertical, senão o gesto
      // competiria com a rolagem da página.
      if (Math.abs(deslocamentoX) <= Math.abs(deslocamentoY)) return

      if (deslocamentoX < 0) aoAvancar()
      else aoRecuar()
    }

    function aoCancelar() {
      origem.current = null
    }

    return {
      onPointerDown: aoPressionar,
      onPointerUp: aoSoltar,
      onPointerCancel: aoCancelar,
    }
  }
}

/**
 * FR-130 — o gesto não começa sobre campo de entrada nem sobre área que rola na
 * horizontal por conta própria.
 *
 * A verificação sobe a árvore a partir do alvo do toque. Verificar só o alvo
 * direto não bastaria: o toque pode cair num elemento interno de um controle.
 */
export function podeIniciarGesto(alvo: EventTarget | null): boolean {
  let elemento = alvo instanceof Element ? alvo : null

  while (elemento) {
    const etiqueta = elemento.tagName.toLowerCase()
    if (etiqueta === 'input' || etiqueta === 'textarea' || etiqueta === 'select') return false
    if (elemento.getAttribute('role') === 'tab' || elemento.getAttribute('role') === 'tablist') {
      return false
    }
    if (elemento.hasAttribute('data-sem-gesto')) return false

    // Área com rolagem horizontal própria: o arraste pertence a ela.
    if (elemento.scrollWidth > elemento.clientWidth + 1) {
      const estilo = globalThis.getComputedStyle?.(elemento)
      const overflow = estilo?.overflowX
      if (overflow === 'auto' || overflow === 'scroll') return false
    }

    elemento = elemento.parentElement
  }

  return true
}
