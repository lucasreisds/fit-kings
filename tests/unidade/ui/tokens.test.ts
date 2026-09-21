import { describe, expect, it } from 'vitest'
import {
  CONTORNOS,
  PARES,
  PISO_CONTRASTE_CONTROLE,
  PISO_CONTRASTE_TEXTO,
  contrasteDoPar,
  razaoDeContraste,
  variaveisDoTema,
} from '../../../src/ui/tokens'

/**
 * D9 critério 1 exige contraste "garantido por construção, e não verificado
 * caso a caso". Este teste é o que torna a garantia verificável: se alguém
 * acrescentar um par reprovado, a suíte falha antes de a tela existir.
 */
describe('tokens de tema — contraste por construção (D9 critério 1, SC-009)', () => {
  it.each(Object.entries(PARES))(
    'o par "%s" atinge o piso de 4,5:1 para texto',
    (_nome, par) => {
      expect(contrasteDoPar(par)).toBeGreaterThanOrEqual(PISO_CONTRASTE_TEXTO)
    },
  )

  it.each(Object.entries(CONTORNOS))(
    'o contorno de controle "%s" atinge o piso de 3:1',
    (_nome, contorno) => {
      expect(razaoDeContraste(contorno.traco, contorno.fundo)).toBeGreaterThanOrEqual(
        PISO_CONTRASTE_CONTROLE,
      )
    },
  )

  it('não expõe nenhum par vazio — a lista é o mecanismo, não a decoração', () => {
    expect(Object.keys(PARES).length).toBeGreaterThan(0)
  })
})

describe('cálculo de contraste', () => {
  it('reproduz os extremos conhecidos da WCAG', () => {
    expect(razaoDeContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(razaoDeContraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('é simétrico', () => {
    expect(razaoDeContraste('#101826', '#F7F7F5')).toBeCloseTo(
      razaoDeContraste('#F7F7F5', '#101826'),
      10,
    )
  })
})

describe('emissão do tema', () => {
  it('emite uma custom property de texto e de fundo para cada par', () => {
    const variaveis = variaveisDoTema()
    for (const nome of Object.keys(PARES)) {
      const kebab = nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)
      expect(variaveis[`--par-${kebab}-texto`]).toBeDefined()
      expect(variaveis[`--par-${kebab}-fundo`]).toBeDefined()
    }
  })
})
