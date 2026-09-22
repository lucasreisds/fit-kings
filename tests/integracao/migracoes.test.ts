import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  aplicarMigracoes,
  ESQUEMA_V1,
  MIGRACOES,
  MigracaoDestrutivaError,
  verificarAditividade,
  VERSAO_ESQUEMA,
  type Migracao,
} from '../../src/dados/migracoes'
import { novoId } from '../../src/plataforma/id'

/**
 * SC-014, Princípio IV — a evolução do esquema é aditiva.
 *
 * O teste tem duas metades, e a segunda é a que carrega o princípio: além de
 * provar que uma migração aditiva preserva registros, ele prova que uma
 * migração **destrutiva é recusada**. Sem essa metade, a política seria
 * documentação, e documentação não impede ninguém de apagar uma coluna.
 */

const abertos: Dexie[] = []

function abrir(nome: string, migracoes: readonly Migracao[]): Dexie {
  const db = new Dexie(nome)
  aplicarMigracoes(db, migracoes)
  abertos.push(db)
  return db
}

afterEach(async () => {
  while (abertos.length > 0) {
    const db = abertos.pop()!
    db.close()
    await db.delete().catch(() => undefined)
  }
})

describe('política de migração aditiva', () => {
  it('uma migração aditiva preserva os registros existentes (SC-014)', async () => {
    const nome = `migracao-${novoId()}`
    const v1: Migracao = { versao: 1, stores: ESQUEMA_V1, nota: 'inicial' }

    const antes = abrir(nome, [v1])
    await antes.table('treinos').add({
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Treino A',
      criadoEm: '2026-01-01T00:00:00.000Z',
      alteradoEm: '2026-01-01T00:00:00.000Z',
      deslocamentoLocal: '-03:00',
      excluidoEm: null,
    })
    antes.close()

    const v2: Migracao = {
      versao: 2,
      stores: { ...ESQUEMA_V1, treinos: 'id, nome, excluidoEm, observacao' },
      nota: 'acrescenta observacao',
      async preencher(tx) {
        await tx
          .table('treinos')
          .toCollection()
          .modify((registro: Record<string, unknown>) => {
            registro.observacao = registro.observacao ?? ''
          })
      },
    }

    const depois = abrir(nome, [v1, v2])
    const treino = await depois.table('treinos').get('11111111-1111-4111-8111-111111111111')

    expect(treino).toBeDefined()
    expect(treino.nome).toBe('Treino A')
    expect(treino.criadoEm).toBe('2026-01-01T00:00:00.000Z')
    // O campo novo entra com padrão, sem reescrever nada do que já existia.
    expect(treino.observacao).toBe('')
    expect(depois.verno).toBe(2)
  })

  it('uma abordagem nova de série não exige migração nenhuma (FR-014)', async () => {
    const db = abrir(`abordagem-${novoId()}`, [...MIGRACOES])
    await db.table('itensTreino').add({
      id: '22222222-2222-4222-8222-222222222222',
      treinoId: '11111111-1111-4111-8111-111111111111',
      exercicioId: '33333333-3333-4333-8333-333333333333',
      ordem: 1,
      // Valor que nenhuma versão conhece: o campo é aberto por FR-014.
      abordagem: 'rest-pause',
      criadoEm: '2026-01-01T00:00:00.000Z',
      alteradoEm: '2026-01-01T00:00:00.000Z',
      deslocamentoLocal: '-03:00',
      excluidoEm: null,
    })

    const item = await db.table('itensTreino').get('22222222-2222-4222-8222-222222222222')
    expect(item.abordagem).toBe('rest-pause')
  })

  it('recusa uma migração que remova tabela', () => {
    const { treinos: _removida, ...semTreinos } = ESQUEMA_V1
    expect(() =>
      verificarAditividade(ESQUEMA_V1, { versao: 2, stores: semTreinos, nota: 'destrutiva' }),
    ).toThrow(MigracaoDestrutivaError)
  })

  it('recusa uma migração que remova índice', () => {
    expect(() =>
      verificarAditividade(ESQUEMA_V1, {
        versao: 2,
        stores: { ...ESQUEMA_V1, sessoes: 'id, estado' },
        nota: 'destrutiva',
      }),
    ).toThrow(/remove os índices/)
  })

  it('aceita uma migração que apenas acrescenta índice ou tabela', () => {
    expect(() =>
      verificarAditividade(ESQUEMA_V1, {
        versao: 2,
        stores: { ...ESQUEMA_V1, sessoes: `${ESQUEMA_V1.sessoes}, iniciadaEm`, notas: 'id' },
        nota: 'aditiva',
      }),
    ).not.toThrow()
  })
})

describe('esquema versão 1', () => {
  it('declara as 9 tabelas de data-model.md', () => {
    expect(Object.keys(ESQUEMA_V1).sort()).toEqual(
      [
        'exercicios',
        'exerciciosSessao',
        'itensTreino',
        'metaAplicacao',
        'seriesPlanejadas',
        'seriesRealizadas',
        'sessaoVersoes',
        'sessoes',
        'treinos',
      ].sort(),
    )
    // A versão corrente avança a cada migração; o esquema v1 é que tem 9 tabelas.
    expect(VERSAO_ESQUEMA).toBeGreaterThanOrEqual(1)
  })

  it('declara os índices compostos que sustentam SC-010', () => {
    // Sem estes dois a listagem de histórico vira varredura de tabela.
    expect(ESQUEMA_V1.sessoes).toContain('[estado+concluidaEm]')
    expect(ESQUEMA_V1.exerciciosSessao).toContain('[exercicioId+sessaoVersaoId]')
  })

  it('indexa a versão vigente por sessão, para a rotina de reconstrução (T088)', () => {
    expect(ESQUEMA_V1.sessaoVersoes).toContain('[sessaoId+vigente]')
    expect(ESQUEMA_V1.sessaoVersoes).toContain('[sessaoId+numero]')
  })
})
