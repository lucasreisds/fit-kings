import { afterEach, describe, expect, it } from 'vitest'
import { ehIdValido, novoId } from '../../../src/plataforma/id'
import {
  ContextoInseguroError,
  avaliarContextoSeguro,
  exigirContextoSeguro,
} from '../../../src/plataforma/contextoSeguro'

/**
 * SC-034, FR-124, D11 — caminho único de geração de identificador.
 *
 * O que estes testes protegem não é a geração em si: é a **ausência de um
 * segundo caminho**. Um fallback só aparece quando alguém tenta rodar fora de
 * contexto seguro e prefere contornar a recusa a corrigir o ambiente.
 */

const descritorOriginal = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext')
const criptoOriginal = globalThis.crypto

function forjarAmbiente(contexto: { seguro?: boolean; crypto?: unknown }) {
  if (contexto.seguro !== undefined) {
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: contexto.seguro,
      configurable: true,
    })
  }
  if ('crypto' in contexto) {
    Object.defineProperty(globalThis, 'crypto', { value: contexto.crypto, configurable: true })
  }
}

afterEach(() => {
  if (descritorOriginal) Object.defineProperty(globalThis, 'isSecureContext', descritorOriginal)
  Object.defineProperty(globalThis, 'crypto', { value: criptoOriginal, configurable: true })
})

describe('novoId', () => {
  it('gera um UUID válido', () => {
    expect(ehIdValido(novoId())).toBe(true)
  })

  it('não repete', () => {
    const gerados = new Set(Array.from({ length: 2000 }, () => novoId()))
    expect(gerados.size).toBe(2000)
  })

  it('gera a versão 4, com a variante correta', () => {
    const id = novoId()
    expect(id[14]).toBe('4')
    expect('89ab').toContain(id[19]!.toLowerCase())
  })
})

describe('guarda de contexto seguro (SC-034)', () => {
  it('recusa operar fora de contexto seguro, em vez de gerar por outro caminho', () => {
    forjarAmbiente({ seguro: false })
    expect(() => novoId()).toThrow(ContextoInseguroError)
    expect(() => exigirContextoSeguro()).toThrow(ContextoInseguroError)
  })

  it('aponta a causa real no motivo da recusa', () => {
    forjarAmbiente({ seguro: false })
    const diagnostico = avaliarContextoSeguro()
    expect(diagnostico.apto).toBe(false)
    if (!diagnostico.apto) {
      expect(diagnostico.motivo).toBe('sem_contexto_seguro')
      expect(diagnostico.mensagem).toMatch(/HTTPS|localhost/i)
    }
  })

  it('recusa quando a Web Crypto API não existe', () => {
    forjarAmbiente({ seguro: true, crypto: undefined })
    expect(() => novoId()).toThrow(ContextoInseguroError)
    const diagnostico = avaliarContextoSeguro()
    expect(diagnostico.apto).toBe(false)
    if (!diagnostico.apto) expect(diagnostico.motivo).toBe('sem_crypto')
  })

  it('recusa quando randomUUID não existe, mesmo com crypto presente', () => {
    forjarAmbiente({ seguro: true, crypto: { getRandomValues: () => undefined } })
    expect(() => novoId()).toThrow(ContextoInseguroError)
    const diagnostico = avaliarContextoSeguro()
    expect(diagnostico.apto).toBe(false)
    if (!diagnostico.apto) expect(diagnostico.motivo).toBe('sem_random_uuid')
  })

  it('aceita o ambiente apto sem alarde', () => {
    forjarAmbiente({ seguro: true })
    expect(avaliarContextoSeguro()).toEqual({ apto: true })
    expect(() => exigirContextoSeguro()).not.toThrow()
  })
})

describe('ehIdValido', () => {
  it.each([
    ['vazio', ''],
    ['não-UUID', 'abc'],
    ['número', 42],
    ['nulo', null],
    ['UUID truncado', '0b7f1d2e-1a3b-4c5d-8e9f'],
    ['variante inválida', '0b7f1d2e-1a3b-4c5d-0e9f-a1b2c3d4e5f6'],
  ])('recusa %s', (_caso, valor) => {
    expect(ehIdValido(valor)).toBe(false)
  })
})
