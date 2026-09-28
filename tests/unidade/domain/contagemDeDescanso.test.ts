import { describe, expect, it } from 'vitest'
import {
  DESCANSO_PADRAO_SEGUNDOS,
  duracaoDoDescanso,
  formatarRestante,
  segundosRestantes,
  terminou,
  type DescansoEmAndamento,
} from '../../../src/domain/descanso'
import type { Id, InstanteUtc } from '../../../src/domain/tipos'

const SESSAO = 'a1b2c3d4-0000-4000-8000-000000000001' as Id
const INICIO = '2026-09-27T10:00:00.000Z' as InstanteUtc

function descansoDe(duracaoSegundos: number): DescansoEmAndamento {
  return { sessaoId: SESSAO, iniciadoEm: INICIO, duracaoSegundos }
}

/** Instante deslocado do início, em segundos. */
function passados(segundos: number): InstanteUtc {
  return new Date(Date.parse(INICIO) + segundos * 1000).toISOString() as InstanteUtc
}

describe('duração do descanso (FR-174)', () => {
  it('usa o tempo planejado quando existe', () => {
    expect(duracaoDoDescanso(90)).toBe(90)
  })

  it('sem planejamento, dois minutos', () => {
    expect(duracaoDoDescanso(null)).toBe(DESCANSO_PADRAO_SEGUNDOS)
    expect(DESCANSO_PADRAO_SEGUNDOS).toBe(120)
  })

  /**
   * Zero no editor é "não pensei nisso", e não uma instrução para o cronômetro
   * terminar no instante em que começa.
   */
  it('planejamento de zero vale como ausência', () => {
    expect(duracaoDoDescanso(0)).toBe(DESCANSO_PADRAO_SEGUNDOS)
  })

  it('planejamento negativo também', () => {
    expect(duracaoDoDescanso(-30)).toBe(DESCANSO_PADRAO_SEGUNDOS)
  })
})

describe('tempo restante (FR-177)', () => {
  const noventa = descansoDe(90)

  it('no instante do início, falta tudo', () => {
    expect(segundosRestantes(noventa, INICIO)).toBe(90)
  })

  it('conta para trás com o relógio', () => {
    expect(segundosRestantes(noventa, passados(30))).toBe(60)
  })

  it('no segundo exato do fim, já terminou', () => {
    expect(segundosRestantes(noventa, passados(90))).toBe(0)
    expect(terminou(noventa, passados(90))).toBe(true)
  })

  it('um segundo antes do fim, ainda não terminou', () => {
    expect(segundosRestantes(noventa, passados(89))).toBe(1)
    expect(terminou(noventa, passados(89))).toBe(false)
  })

  /**
   * É o caso do aparelho que congelou a aba: o usuário volta muito depois, e o
   * cronômetro precisa dizer que acabou — não recomeçar nem mostrar negativo.
   */
  it('muito depois do fim, continua em zero', () => {
    expect(segundosRestantes(noventa, passados(6000))).toBe(0)
    expect(terminou(noventa, passados(6000))).toBe(true)
  })

  /** Fuso alterado ou hora corrigida não pode esticar o descanso. */
  it('relógio que anda para trás não aumenta o restante', () => {
    expect(segundosRestantes(noventa, passados(-500))).toBe(90)
  })

  it('arredonda para cima, para não mostrar zero com tempo faltando', () => {
    expect(segundosRestantes(noventa, passados(89.4))).toBe(1)
  })
})

describe('leitura do tempo', () => {
  it.each([
    [120, '2:00'],
    [90, '1:30'],
    [61, '1:01'],
    [59, '0:59'],
    [5, '0:05'],
    [0, '0:00'],
  ])('%i segundos lê-se %s', (segundos, esperado) => {
    expect(formatarRestante(segundos)).toBe(esperado)
  })
})
