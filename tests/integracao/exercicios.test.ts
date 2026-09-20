import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  criarRepositorioExercicios,
  ExercicioComHistoricoError,
} from '../../src/dados/repositorios/exercicios'
import { semearCatalogoSeNecessario, CATALOGO_INICIAL } from '../../src/dados/seed/catalogo'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { novoId } from '../../src/plataforma/id'

/**
 * FR-071 a FR-077 — catálogo, personalizados e a distinção entre ocultar e
 * excluir.
 */
describe('repositório de exercícios', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  /** Simula uma execução registrada, sem depender do repositório de sessões. */
  async function registrarExecucao(exercicioId: string) {
    await db.exerciciosSessao.add({
      id: novoId(),
      sessaoVersaoId: novoId(),
      exercicioId,
      ordem: 1,
      abordagem: 'tradicional',
      origem: 'planejado',
      itemTreinoId: null,
      naoRealizado: false,
      criadoEm: '2026-05-01T10:00:00.000Z',
      alteradoEm: '2026-05-01T10:00:00.000Z',
      deslocamentoLocal: '-03:00',
      excluidoEm: null,
    })
  }

  it('exercício com execução no histórico não pode ser excluído, só ocultado (FR-076)', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const exercicio = await repositorio.criar({ nome: 'Supino reto', origem: 'catalogo' })
    await registrarExecucao(exercicio.id)

    await expect(repositorio.excluir(exercicio.id)).rejects.toThrow(ExercicioComHistoricoError)

    // O registro continua intacto: a recusa não pode ter efeito colateral.
    expect((await repositorio.obter(exercicio.id))?.excluidoEm).toBeNull()

    await repositorio.ocultar(exercicio.id)
    expect((await repositorio.obter(exercicio.id))?.ocultoEm).not.toBeNull()
    // Ocultar tira de novas seleções e preserva o registro.
    expect((await repositorio.obter(exercicio.id))?.excluidoEm).toBeNull()
    expect(await repositorio.listarSelecionaveis()).toHaveLength(0)
  })

  it('exercício sem histórico pode ser excluído logicamente', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const exercicio = await repositorio.criar({ nome: 'Exercício avulso', origem: 'personalizado' })

    await repositorio.excluir(exercicio.id)

    expect((await repositorio.obter(exercicio.id))?.excluidoEm).not.toBeNull()
    expect(await db.exercicios.count()).toBe(1)
  })

  it('ocultar e reexibir são reversíveis e não tocam em excluidoEm', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const exercicio = await repositorio.criar({ nome: 'Crucifixo', origem: 'catalogo' })

    await repositorio.ocultar(exercicio.id)
    expect(await repositorio.listarSelecionaveis()).toHaveLength(0)

    await repositorio.reexibir(exercicio.id)
    expect(await repositorio.listarSelecionaveis()).toHaveLength(1)
    expect((await repositorio.obter(exercicio.id))?.excluidoEm).toBeNull()
  })

  it('renomear preserva o identificador — é o que mantém o histórico (FR-073, FR-074)', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const exercicio = await repositorio.criar({ nome: 'Supino', origem: 'catalogo' })
    await registrarExecucao(exercicio.id)

    const renomeado = await repositorio.renomear(exercicio.id, 'Supino reto com barra')

    expect(renomeado.id).toBe(exercicio.id)
    expect(renomeado.nome).toBe('Supino reto com barra')
    expect(renomeado.criadoEm).toBe(exercicio.criadoEm)
    const execucoes = await db.exerciciosSessao.where('exercicioId').equals(exercicio.id).toArray()
    expect(execucoes).toHaveLength(1)
  })

  it('trata catálogo e personalizado de forma equivalente (FR-077)', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const doCatalogo = await repositorio.criar({ nome: 'Agachamento', origem: 'catalogo' })
    const personalizado = await repositorio.criar({ nome: 'Agachamento sumô', origem: 'personalizado' })

    await registrarExecucao(doCatalogo.id)
    await registrarExecucao(personalizado.id)

    // A mesma regra vale para os dois: nenhum é excluível com histórico.
    await expect(repositorio.excluir(doCatalogo.id)).rejects.toThrow(ExercicioComHistoricoError)
    await expect(repositorio.excluir(personalizado.id)).rejects.toThrow(ExercicioComHistoricoError)
    expect(await repositorio.listarSelecionaveis()).toHaveLength(2)
  })

  it('busca ignora acento e caixa (FR-075)', async () => {
    const repositorio = criarRepositorioExercicios(db)
    await repositorio.criar({
      nome: 'Elevação lateral',
      origem: 'catalogo',
      grupoMuscular: 'Ombros',
    })
    await repositorio.criar({ nome: 'Rosca direta', origem: 'catalogo', grupoMuscular: 'Bíceps' })

    expect((await repositorio.buscar({ busca: 'elevacao' })).map((e) => e.nome)).toEqual([
      'Elevação lateral',
    ])
    expect((await repositorio.buscar({ busca: 'OMBROS' })).map((e) => e.nome)).toEqual([
      'Elevação lateral',
    ])
    expect(await repositorio.buscar({ grupoMuscular: 'Bíceps' })).toHaveLength(1)
  })

  it('a busca não devolve ocultos, a menos que sejam pedidos', async () => {
    const repositorio = criarRepositorioExercicios(db)
    const exercicio = await repositorio.criar({ nome: 'Peck deck', origem: 'catalogo' })
    await repositorio.ocultar(exercicio.id)

    expect(await repositorio.buscar({ busca: 'peck' })).toHaveLength(0)
    expect(await repositorio.buscar({ busca: 'peck', incluirOcultos: true })).toHaveLength(1)
  })
})

describe('catálogo inicial (FR-071)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('semeia o catálogo quando o banco está vazio', async () => {
    const semeados = await semearCatalogoSeNecessario(db)

    expect(semeados).toBe(CATALOGO_INICIAL.length)
    expect(await db.exercicios.count()).toBe(CATALOGO_INICIAL.length)
    const todos = await criarRepositorioExercicios(db).listarSelecionaveis()
    expect(todos.every((e) => e.origem === 'catalogo')).toBe(true)
    expect(todos.every((e) => e.id.length === 36)).toBe(true)
  })

  it('é idempotente: reabrir o aplicativo não duplica nem ressuscita ocultos', async () => {
    await semearCatalogoSeNecessario(db)
    const repositorio = criarRepositorioExercicios(db)
    const primeiro = (await repositorio.listarSelecionaveis())[0]!
    await repositorio.ocultar(primeiro.id)

    const segundaVez = await semearCatalogoSeNecessario(db)

    expect(segundaVez).toBe(0)
    expect(await db.exercicios.count()).toBe(CATALOGO_INICIAL.length)
    expect((await repositorio.obter(primeiro.id))?.ocultoEm).not.toBeNull()
  })

  it('não tem nome repetido', () => {
    const nomes = CATALOGO_INICIAL.map((e) => e.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })
})
