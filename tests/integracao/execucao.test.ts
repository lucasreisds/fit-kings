import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { criarBanco, type BancoFitKings } from '../../src/dados/db'
import {
  criarRepositorioSessoes,
  SessaoJaEmAndamentoError,
} from '../../src/dados/repositorios/sessoes'
import { descartar } from '../apoio/banco'
import { montarCenario } from '../apoio/cenario'
import { novoId } from '../../src/plataforma/id'
import { estadoExercicioSessao } from '../../src/domain/sessao/estadoExercicio'

/**
 * FR-033, Princípio I, D4 — cada série confirmada grava em transação própria e
 * sobrevive à recarga.
 *
 * "Sobrevive à recarga" é testado **reabrindo o banco**, não relendo o objeto em
 * memória. Reler a memória provaria apenas que a memória existe, que é
 * exatamente o que o Princípio I não pergunta.
 */
describe('execução da sessão', () => {
  let nomeDoBanco: string
  let db: BancoFitKings

  beforeEach(() => {
    nomeDoBanco = `execucao-${novoId()}`
    db = criarBanco(nomeDoBanco)
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('cada série confirmada sobrevive a fechar e reabrir o banco (FR-033)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [
        {
          exercicioId: cenario.itens[0]!.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: cenario.itens[0]!.item.item.id,
        },
      ],
    })

    const exercicioSessaoId = sessao.exercicios[0]!.exercicio.id

    for (const ordem of [1, 2, 3, 4]) {
      await cenario.sessoes.registrarSerie(exercicioSessaoId, {
        ordem,
        cargaKg: 40,
        repeticoes: 8 + ordem,
        rir: 1,
        seriePlanejadaId: null,
      })
    }

    // Encerramento abrupto: o banco fecha sem que nada tenha sido "salvo".
    db.close()

    const reaberto = criarBanco(nomeDoBanco)
    const recuperada = await criarRepositorioSessoes(reaberto).obter(sessao.sessao.id)

    expect(recuperada).toBeDefined()
    expect(recuperada!.sessao.estado).toBe('em_andamento')
    expect(recuperada!.exercicios[0]!.series).toHaveLength(4)
    expect(recuperada!.exercicios[0]!.series.map((s) => s.repeticoes)).toEqual([9, 10, 11, 12])

    reaberto.close()
    db = reaberto
  })

  it('registrar uma série só resolve depois do commit (Princípio I)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [
        {
          exercicioId: cenario.itens[0]!.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: cenario.itens[0]!.item.item.id,
        },
      ],
    })

    const serie = await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    // No instante em que a promessa resolve, o registro já está legível no banco.
    expect(await db.seriesRealizadas.get(serie.id)).toBeDefined()
  })

  it('impede duas sessões em andamento (FR-028)', async () => {
    const cenario = await montarCenario(db)
    const dados = {
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [],
    }

    const primeira = await cenario.sessoes.criar(dados)
    await expect(cenario.sessoes.criar(dados)).rejects.toThrow(SessaoJaEmAndamentoError)

    // Encerrada a pendente, a próxima pode começar.
    await cenario.sessoes.encerrar(primeira.sessao.id, 'concluir')
    await expect(cenario.sessoes.criar(dados)).resolves.toBeDefined()
  })

  it('descartar também libera para iniciar outra (FR-026, FR-028)', async () => {
    const cenario = await montarCenario(db)
    const dados = { treinoId: cenario.treino.id, nomeTreino: 'Treino A', exercicios: [] }

    const primeira = await cenario.sessoes.criar(dados)
    await cenario.sessoes.encerrar(primeira.sessao.id, 'descartar')

    expect(await cenario.sessoes.sessaoEmAndamento()).toBeUndefined()
    await expect(cenario.sessoes.criar(dados)).resolves.toBeDefined()
  })

  it('concluir registra a data e não a reescreve (FR-027, FR-115)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })

    expect(sessao.sessao.iniciadaEm).toBeTruthy()
    expect(sessao.sessao.concluidaEm).toBeNull()

    const concluida = await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
    expect(concluida.concluidaEm).toBeTruthy()
    expect(concluida.iniciadaEm).toBe(sessao.sessao.iniciadaEm)
  })

  it('não há transição de volta para em andamento', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })
    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')

    await expect(cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')).rejects.toThrow()
    await expect(cenario.sessoes.encerrar(sessao.sessao.id, 'descartar')).rejects.toThrow()
  })

  it('exerciciosSessao não guarda campo de estado — ele é derivado (FR-125)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [
        {
          exercicioId: cenario.itens[0]!.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: cenario.itens[0]!.item.item.id,
        },
      ],
    })

    const bruto = await db.exerciciosSessao.get(sessao.exercicios[0]!.exercicio.id)

    expect(bruto).toBeDefined()
    expect(bruto).toHaveProperty('naoRealizado')
    expect(bruto).not.toHaveProperty('estado')
    // O estado só existe como derivação.
    expect(
      estadoExercicioSessao({ series: [], naoRealizado: false, seriesPlanejadas: 3 }),
    ).toBe('nao_alcancado')
  })

  it('a versão inicial nasce com motivo "inicial" e número 1', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })

    expect(sessao.versao.numero).toBe(1)
    expect(sessao.versao.motivo).toBe('inicial')
    expect(sessao.versao.vigente).toBe(1)
    // A autoridade é o ponteiro no cabeçalho, não o índice.
    expect(sessao.sessao.versaoVigenteId).toBe(sessao.versao.id)
  })

  it('reconstrói o índice de vigência a partir do cabeçalho (T088, Princípio V)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })

    // Corrompe o cache de propósito.
    await db.sessaoVersoes.put({ ...sessao.versao, vigente: 0 })
    expect((await db.sessaoVersoes.get(sessao.versao.id))?.vigente).toBe(0)

    const corrigidas = await cenario.sessoes.reconstruirIndiceDeVigencia()

    expect(corrigidas).toBe(1)
    expect((await db.sessaoVersoes.get(sessao.versao.id))?.vigente).toBe(1)
    // Rodar de novo não muda nada: o cache já está coerente.
    expect(await cenario.sessoes.reconstruirIndiceDeVigencia()).toBe(0)
  })

  it('acrescenta exercício fora do plano durante a sessão (FR-087, FR-088)', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })

    const extra = await cenario.exercicios.criar({ nome: 'Rosca martelo', origem: 'catalogo' })
    const acrescentado = await cenario.sessoes.acrescentarExercicio(sessao.sessao.id, {
      exercicioId: extra.id,
      abordagem: 'tradicional',
      origem: 'fora_do_plano',
      itemTreinoId: null,
    })

    expect(acrescentado.exercicio.origem).toBe('fora_do_plano')
    // Sem plano associado: é o que impede indicação de progressão (FR-089).
    expect(acrescentado.exercicio.itemTreinoId).toBeNull()
  })
})
