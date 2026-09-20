import { variaveisDoTema } from './tokens'

/** Injeta os pares validados como custom properties em `:root`. */
export function aplicarTema(elemento: HTMLElement): void {
  for (const [nome, valor] of Object.entries(variaveisDoTema())) {
    elemento.style.setProperty(nome, valor)
  }
}
