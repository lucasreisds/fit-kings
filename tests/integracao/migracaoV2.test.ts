import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  aplicarMigracoes,
  ESQUEMA_V1,
  MIGRACOES,
  verificarAditividade,
  VERSAO_ESQUEMA,
} from '../../src/dados/migracoes'
import { novoId } from '../../src/plataforma/id'

/**
 * T003 — SC-042, Princípio IV.
 *
 * O aplicativo já está publicado e há histórico gravado no aparelho do usuário.
 * A migração v1 → v2 precisa passar por cima disso sem tocar em nada — e é isso
 * que este teste prova, escrevendo dados na v1 e reabrindo na v2.
 */

const abertos: Dexie[] = []

afterEach(async () => {
  while (abertos.length > 0) {
    const db = abertos.pop()!
    db.close()
    await db.delete().catch(() => undefined)
  }
})

function abrir(nome: string, ateVersao: number): Dexie {
  const db = new Dexie(nome)
  aplicarMigracoes(
    db,
    MIGRACOES.filter((m) => m.versao <= ateVersao),
  )
  abertos.push(db)
  return db
}

const COMUNS = {
  criadoEm: '2026-05-01T10:00:00.000Z',
  alteradoEm: '2026-05-01T10:00:00.000Z',
  deslocamentoLocal: '-03:00',
  excluidoEm: null,
}

describe('migração v1 → v2 (SC-042)', () => {
  it('é a versão corrente do esquema', () => {
    expect(VERSAO_ESQUEMA).toBe(2)
  })

  it('preserva os registros existentes e acrescenta os campos com null', async () => {
    const nome = `migracao-v2-${novoId()}`
    const itemId = '11111111-1111-4111-8111-111111111111'
    const serieId = '22222222-2222-4222-8222-222222222222'

    // --- Grava na v1, como um aparelho já em uso ---
    const v1 = abrir(nome, 1)
    await v1.table('itensTreino').add({
      ...COMUNS,
      id: itemId,
      treinoId: '33333333-3333-4333-8333-333333333333',
      exercicioId: '44444444-4444-4444-8444-444444444444',
      ordem: 1,
      abordagem: 'tradicional',
    })
    await v1.table('seriesPlanejadas').add({
      ...COMUNS,
      id: serieId,
      itemTreinoId: itemId,
      ordem: 1,
      repeticoes: 8,
      cargaKg: 40,
      rir: 2,
    })
    v1.close()

    // --- Reabre na v2 ---
    const v2 = abrir(nome, 2)
    const item = await v2.table('itensTreino').get(itemId)
    const serie = await v2.table('seriesPlanejadas').get(serieId)

    // Nada do que existia foi tocado.
    expect(item.abordagem).toBe('tradicional')
    expect(item.ordem).toBe(1)
    expect(serie.repeticoes).toBe(8)
    expect(serie.cargaKg).toBe(40)
    expect(serie.rir).toBe(2)
    expect(serie.criadoEm).toBe(COMUNS.criadoEm)

    // E os campos novos entram com null, que é o valor correto: a série de fato
    // tem ponta única, e o item de fato não tem descanso planejado.
    expect(item.descansoSegundos).toBeNull()
    expect(serie.repeticoesMax).toBeNull()
    expect(v2.verno).toBe(2)
  })

  it('a v2 continua sendo aditiva — nenhum índice ou tabela some', () => {
    const v2 = MIGRACOES.find((m) => m.versao === 2)!
    expect(() => verificarAditividade(ESQUEMA_V1, v2)).not.toThrow()
  })

  it('um banco novo já nasce na v2 com os campos disponíveis', async () => {
    const db = abrir(`novo-${novoId()}`, 2)
    const id = novoId()

    await db.table('seriesPlanejadas').add({
      ...COMUNS,
      id,
      itemTreinoId: novoId(),
      ordem: 1,
      repeticoes: 6,
      repeticoesMax: 8,
      cargaKg: 40,
      rir: null,
    })

    const serie = await db.table('seriesPlanejadas').get(id)
    expect(serie.repeticoes).toBe(6)
    expect(serie.repeticoesMax).toBe(8)
  })
})
