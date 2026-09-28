import { beforeEach, describe, expect, it } from 'vitest'
import {
  apagarDescanso,
  gravarDescanso,
  lerDescanso,
} from '../../src/plataforma/descansoPersistido'
import type { DescansoEmAndamento } from '../../src/domain/descanso'
import type { Id, InstanteUtc } from '../../src/domain/tipos'

const SESSAO = '11111111-1111-4111-8111-111111111111' as Id
const OUTRA_SESSAO = '22222222-2222-4222-8222-222222222222' as Id

const DESCANSO: DescansoEmAndamento = {
  sessaoId: SESSAO,
  iniciadoEm: '2026-09-27T10:00:00.000Z' as InstanteUtc,
  duracaoSegundos: 90,
}

/**
 * T017 — FR-178, FR-183, FR-186.
 *
 * O descanso precisa sobreviver a uma recarga e precisa morrer com a sessão. A
 * segunda metade é a que protege o usuário de encontrar, no treino de amanhã,
 * um cronômetro que ele iniciou hoje.
 */
describe('descanso em andamento, entre recargas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sem nada gravado, não há descanso', () => {
    expect(lerDescanso(SESSAO)).toBeNull()
  })

  it('o que foi gravado é lido de volta inteiro (FR-178)', () => {
    gravarDescanso(DESCANSO)
    expect(lerDescanso(SESSAO)).toEqual(DESCANSO)
  })

  /** FR-183, e a rede de segurança para quando a limpeza ao concluir falhar. */
  it('descanso de outra sessão é descartado', () => {
    gravarDescanso(DESCANSO)
    expect(lerDescanso(OUTRA_SESSAO)).toBeNull()
  })

  it('apagar remove de verdade', () => {
    gravarDescanso(DESCANSO)
    apagarDescanso()
    expect(lerDescanso(SESSAO)).toBeNull()
  })

  it('iniciar outro descanso substitui o anterior (FR-180)', () => {
    gravarDescanso(DESCANSO)
    const novo = { ...DESCANSO, duracaoSegundos: 120 }
    gravarDescanso(novo)
    expect(lerDescanso(SESSAO)).toEqual(novo)
  })

  /**
   * Estado descartável merece leitura desconfiada: recusá-lo custa ao usuário
   * um toque para reiniciar o descanso, e aceitar lixo custaria um cronômetro
   * que mente.
   */
  describe('leitura desconfiada', () => {
    it.each([
      ['JSON quebrado', 'isto não é json'],
      ['tipo errado', '"uma string"'],
      ['sem sessão', JSON.stringify({ iniciadoEm: DESCANSO.iniciadoEm, duracaoSegundos: 90 })],
      ['sessão inválida', JSON.stringify({ ...DESCANSO, sessaoId: 'não é um id' })],
      ['instante inválido', JSON.stringify({ ...DESCANSO, iniciadoEm: 'ontem' })],
      ['duração zero', JSON.stringify({ ...DESCANSO, duracaoSegundos: 0 })],
      ['duração negativa', JSON.stringify({ ...DESCANSO, duracaoSegundos: -5 })],
      ['duração não numérica', JSON.stringify({ ...DESCANSO, duracaoSegundos: '90' })],
    ])('recusa %s', (_caso, bruto) => {
      localStorage.setItem('fit-kings:descanso', bruto)
      expect(lerDescanso(SESSAO)).toBeNull()
    })
  })
})
