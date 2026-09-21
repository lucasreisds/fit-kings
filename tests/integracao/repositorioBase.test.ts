import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { criarRepositorio, RegistroNaoEncontradoError } from '../../src/dados/repositorios/base'
import { relogioFixo } from '../../src/plataforma/tempo'
import type { Treino } from '../../src/domain/tipos'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'

/**
 * Princípio IV: a exclusão é lógica e `alteradoEm` é carimbado a cada escrita.
 *
 * O segundo ponto não é burocracia: `alteradoEm` é a chave da precedência em
 * FR-103 e FR-102. Um registro que não o atualize perde a comparação numa
 * importação e desaparece do aparelho do usuário sem nenhum aviso.
 */
describe('repositório base', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('carimba os campos comuns na criação', async () => {
    const relogio = relogioFixo('2026-03-01T10:00:00.000Z', '-03:00')
    const repositorio = criarRepositorio<Treino>(db.treinos, relogio)

    const treino = await repositorio.criar({ nome: 'Treino A' } as never)

    expect(treino.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(treino.criadoEm).toBe('2026-03-01T10:00:00.000Z')
    expect(treino.alteradoEm).toBe('2026-03-01T10:00:00.000Z')
    expect(treino.deslocamentoLocal).toBe('-03:00')
    expect(treino.excluidoEm).toBeNull()
  })

  it('atualiza alteradoEm a cada escrita e preserva criadoEm', async () => {
    const repositorio = criarRepositorio<Treino>(
      db.treinos,
      relogioFixo('2026-03-01T10:00:00.000Z'),
    )
    const treino = await repositorio.criar({ nome: 'Treino A' } as never)

    const depois = criarRepositorio<Treino>(db.treinos, relogioFixo('2026-03-05T08:30:00.000Z'))
    const atualizado = await depois.atualizar(treino.id, { nome: 'Treino A — peito' })

    expect(atualizado.nome).toBe('Treino A — peito')
    expect(atualizado.criadoEm).toBe('2026-03-01T10:00:00.000Z')
    expect(atualizado.alteradoEm).toBe('2026-03-05T08:30:00.000Z')
  })

  it('não permite alterar id nem criadoEm por atualizar()', async () => {
    const repositorio = criarRepositorio<Treino>(db.treinos)
    const treino = await repositorio.criar({ nome: 'Treino A' } as never)

    const atualizado = await repositorio.atualizar(treino.id, {
      id: 'outro-id',
      criadoEm: '1999-01-01T00:00:00.000Z',
      nome: 'Treino B',
    } as never)

    expect(atualizado.id).toBe(treino.id)
    expect(atualizado.criadoEm).toBe(treino.criadoEm)
    expect(atualizado.nome).toBe('Treino B')
  })

  it('marca excluidoEm sem remover fisicamente', async () => {
    const repositorio = criarRepositorio<Treino>(
      db.treinos,
      relogioFixo('2026-04-01T12:00:00.000Z'),
    )
    const treino = await repositorio.criar({ nome: 'Treino A' } as never)

    await repositorio.excluir(treino.id)

    const bruto = await db.treinos.get(treino.id)
    expect(bruto).toBeDefined()
    expect(bruto?.excluidoEm).toBe('2026-04-01T12:00:00.000Z')
    expect(await db.treinos.count()).toBe(1)
  })

  it('a exclusão também move alteradoEm — senão ela não se propaga na importação', async () => {
    const criacao = criarRepositorio<Treino>(db.treinos, relogioFixo('2026-04-01T12:00:00.000Z'))
    const treino = await criacao.criar({ nome: 'Treino A' } as never)

    const exclusao = criarRepositorio<Treino>(db.treinos, relogioFixo('2026-04-09T12:00:00.000Z'))
    await exclusao.excluir(treino.id)

    const bruto = await db.treinos.get(treino.id)
    expect(bruto?.alteradoEm).toBe('2026-04-09T12:00:00.000Z')
  })

  it('excluir duas vezes é operação nula — não reescreve a data original', async () => {
    const repositorio = criarRepositorio<Treino>(db.treinos, relogioFixo('2026-04-01T12:00:00.000Z'))
    const treino = await repositorio.criar({ nome: 'Treino A' } as never)
    await repositorio.excluir(treino.id)

    const depois = criarRepositorio<Treino>(db.treinos, relogioFixo('2026-05-01T12:00:00.000Z'))
    await depois.excluir(treino.id)

    expect((await db.treinos.get(treino.id))?.excluidoEm).toBe('2026-04-01T12:00:00.000Z')
  })

  it('listarAtivos omite excluídos; listarTodos os inclui, para a exportação (FR-098)', async () => {
    const repositorio = criarRepositorio<Treino>(db.treinos)
    const vivo = await repositorio.criar({ nome: 'Vivo' } as never)
    const morto = await repositorio.criar({ nome: 'Morto' } as never)
    await repositorio.excluir(morto.id)

    expect((await repositorio.listarAtivos()).map((t) => t.id)).toEqual([vivo.id])
    expect((await repositorio.listarTodos()).map((t) => t.id).sort()).toEqual(
      [vivo.id, morto.id].sort(),
    )
  })

  it('não expõe nenhuma via de remoção física', () => {
    const repositorio = criarRepositorio<Treino>(db.treinos)
    expect(Object.keys(repositorio)).not.toContain('remover')
    expect(Object.keys(repositorio)).not.toContain('apagar')
    expect(Object.keys(repositorio)).not.toContain('delete')
  })

  it('recusa atualizar ou excluir registro inexistente', async () => {
    const repositorio = criarRepositorio<Treino>(db.treinos)
    await expect(repositorio.atualizar('inexistente', {})).rejects.toThrow(
      RegistroNaoEncontradoError,
    )
    await expect(repositorio.excluir('inexistente')).rejects.toThrow(RegistroNaoEncontradoError)
  })

  it('inserirComoEsta preserva os carimbos do arquivo — a importação não os reescreve', async () => {
    const repositorio = criarRepositorio<Treino>(db.treinos)
    const doArquivo = {
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Importado',
      criadoEm: '2025-01-01T00:00:00.000Z',
      alteradoEm: '2025-06-01T00:00:00.000Z',
      deslocamentoLocal: '+02:00',
      excluidoEm: null,
    } as Treino

    await repositorio.inserirComoEsta(doArquivo)

    expect(await db.treinos.get(doArquivo.id)).toEqual(doArquivo)
  })
})
