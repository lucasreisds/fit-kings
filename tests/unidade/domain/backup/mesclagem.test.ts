import { describe, expect, it } from 'vitest'
import {
  planejarImportacao,
  planoEhVazio,
  type EstadoLocal,
} from '../../../../src/domain/backup/mesclar'
import {
  umArquivo,
  umArquivoCompleto,
  umExercicio,
  umTreino,
} from '../../../apoio/fabricas'

/** FR-101 a FR-105, contrato §§ 2 a 6. */

const VAZIO: EstadoLocal = {
  exercicios: [],
  treinos: [],
  itensTreino: [],
  seriesPlanejadas: [],
  sessoes: [],
}

describe('mesclagem por identificador (FR-101)', () => {
  it('insere o que não existe no aparelho', () => {
    const arquivo = umArquivoCompleto()
    const plano = planejarImportacao(arquivo, VAZIO)

    expect(plano.exercicios[0]!.tipo).toBe('inserir')
    expect(plano.resumo.inseridos).toBe(4)
    expect(plano.resumo.sessoesInseridas).toBe(1)
  })

  it('localiza pelo identificador, nunca pelo nome (FR-105)', () => {
    const local = umExercicio({ nome: 'Supino reto', alteradoEm: '2026-01-01T00:00:00.000Z' })
    // Mesmo `id`, nome diferente: foi renomeado no outro aparelho.
    const doArquivo = umExercicio({
      id: local.id,
      nome: 'Supino reto com barra',
      alteradoEm: '2026-03-01T00:00:00.000Z',
    })

    const plano = planejarImportacao(umArquivo({ exercicios: [doArquivo] }), {
      ...VAZIO,
      exercicios: [local],
    })

    expect(plano.exercicios[0]!.tipo).toBe('atualizar')
    // Um segundo registro aqui fragmentaria a série histórica do usuário.
    expect(plano.exercicios).toHaveLength(1)
  })

  it('um exercício de mesmo nome e identificador diferente é outro exercício', () => {
    const local = umExercicio({ nome: 'Supino reto' })
    const doArquivo = umExercicio({ nome: 'Supino reto' })

    const plano = planejarImportacao(umArquivo({ exercicios: [doArquivo] }), {
      ...VAZIO,
      exercicios: [local],
    })

    expect(plano.exercicios[0]!.tipo).toBe('inserir')
  })
})

describe('precedência de registros editáveis (FR-103)', () => {
  const local = umTreino({ alteradoEm: '2026-05-10T00:00:00.000Z' })

  it('o arquivo mais recente prevalece', () => {
    const doArquivo = umTreino({ id: local.id, alteradoEm: '2026-05-11T00:00:00.000Z' })
    const plano = planejarImportacao(umArquivo({ treinos: [doArquivo] }), {
      ...VAZIO,
      treinos: [local],
    })

    expect(plano.treinos[0]!.tipo).toBe('atualizar')
  })

  it('o local mais recente é mantido', () => {
    const doArquivo = umTreino({ id: local.id, alteradoEm: '2026-05-09T00:00:00.000Z' })
    const plano = planejarImportacao(umArquivo({ treinos: [doArquivo] }), {
      ...VAZIO,
      treinos: [local],
    })

    const acao = plano.treinos[0]!
    expect(acao.tipo).toBe('ignorar')
    if (acao.tipo === 'ignorar') expect(acao.motivo).toBe('local_mais_recente')
  })

  it('empate mantém o local — é a base da idempotência (FR-104)', () => {
    const doArquivo = umTreino({ id: local.id, alteradoEm: local.alteradoEm })
    const plano = planejarImportacao(umArquivo({ treinos: [doArquivo] }), {
      ...VAZIO,
      treinos: [local],
    })

    const acao = plano.treinos[0]!
    expect(acao.tipo).toBe('ignorar')
    if (acao.tipo === 'ignorar') expect(acao.motivo).toBe('empate_mantem_local')
  })
})

describe('sessões concluídas (FR-102)', () => {
  it('sessão ausente no aparelho é inserida', () => {
    const arquivo = umArquivoCompleto()
    const plano = planejarImportacao(arquivo, VAZIO)

    expect(plano.sessoes).toHaveLength(1)
    expect(plano.sessoes[0]!.tipo).toBe('inserir')
    // O conteúdo da sessão viaja junto.
    expect(plano.sessoes[0]!.exercicios).toHaveLength(1)
    expect(plano.sessoes[0]!.series).toHaveLength(1)
  })

  it('arquivo mais recente entra como nova versão, sem destruir a anterior', () => {
    const arquivo = umArquivoCompleto('2026-06-01T00:00:00.000Z')
    const sessao = arquivo.sessoes[0]!

    const plano = planejarImportacao(arquivo, {
      ...VAZIO,
      sessoes: [{ id: sessao.id, alteradoEm: '2026-05-01T00:00:00.000Z' }],
    })

    expect(plano.sessoes[0]!.tipo).toBe('nova_versao')
    expect(plano.resumo.sessoesComNovaVersao).toBe(1)
    // Nenhuma ação do plano remove versão: o Princípio I proíbe, inclusive por
    // importação. O plano só sabe inserir e criar versão nova.
    expect(plano.sessoes.every((s) => s.tipo === 'inserir' || s.tipo === 'nova_versao')).toBe(true)
  })

  it.each([
    ['igual', '2026-06-01T00:00:00.000Z', 'empate_mantem_local'],
    ['anterior', '2026-07-01T00:00:00.000Z', 'local_mais_recente'],
  ])('arquivo %s ao local é operação nula', (_caso, localEm, motivo) => {
    const arquivo = umArquivoCompleto('2026-06-01T00:00:00.000Z')
    const sessao = arquivo.sessoes[0]!

    const plano = planejarImportacao(arquivo, {
      ...VAZIO,
      sessoes: [{ id: sessao.id, alteradoEm: localEm }],
    })

    expect(plano.sessoes).toHaveLength(0)
    expect(plano.sessoesIgnoradas[0]!.motivo).toBe(motivo)
    expect(plano.resumo.sessoesIgnoradas).toBe(1)
  })
})

describe('idempotência (FR-104)', () => {
  it('a segunda importação do mesmo arquivo não produz efeito algum', () => {
    const arquivo = umArquivoCompleto()

    // Primeira importação, aparelho vazio.
    const primeira = planejarImportacao(arquivo, VAZIO)
    expect(planoEhVazio(primeira)).toBe(false)

    // Estado do aparelho depois dela: exatamente o que o arquivo trouxe.
    const depois: EstadoLocal = {
      exercicios: arquivo.exercicios,
      treinos: arquivo.treinos,
      itensTreino: arquivo.itensTreino,
      seriesPlanejadas: arquivo.seriesPlanejadas,
      sessoes: arquivo.sessoes.map((s) => ({ id: s.id, alteradoEm: s.alteradoEm })),
    }

    const segunda = planejarImportacao(arquivo, depois)

    expect(planoEhVazio(segunda)).toBe(true)
    expect(segunda.resumo.inseridos).toBe(0)
    expect(segunda.resumo.atualizados).toBe(0)
    expect(segunda.resumo.sessoesInseridas).toBe(0)
    expect(segunda.resumo.sessoesComNovaVersao).toBe(0)
    expect(segunda.resumo.ignorados).toBe(4)
    expect(segunda.resumo.sessoesIgnoradas).toBe(1)
  })

  it('a terceira importação continua nula', () => {
    const arquivo = umArquivoCompleto()
    const depois: EstadoLocal = {
      exercicios: arquivo.exercicios,
      treinos: arquivo.treinos,
      itensTreino: arquivo.itensTreino,
      seriesPlanejadas: arquivo.seriesPlanejadas,
      sessoes: arquivo.sessoes.map((s) => ({ id: s.id, alteradoEm: s.alteradoEm })),
    }

    expect(planoEhVazio(planejarImportacao(arquivo, depois))).toBe(true)
    expect(planoEhVazio(planejarImportacao(arquivo, depois))).toBe(true)
  })

  it('é função pura: o mesmo par de entradas produz o mesmo plano', () => {
    const arquivo = umArquivoCompleto()
    expect(planejarImportacao(arquivo, VAZIO)).toEqual(planejarImportacao(arquivo, VAZIO))
  })

  it('não altera o arquivo nem o estado local recebidos', () => {
    const arquivo = umArquivoCompleto()
    const copia = structuredClone(arquivo)
    planejarImportacao(arquivo, VAZIO)
    expect(arquivo).toEqual(copia)
  })
})

describe('relatório da importação (FR-108)', () => {
  it('conta o que entrou, o que foi atualizado e o que foi ignorado', () => {
    const inalterado = umExercicio({ alteradoEm: '2026-01-01T00:00:00.000Z' })
    const atualizado = umExercicio({ alteradoEm: '2026-01-01T00:00:00.000Z' })
    const novo = umExercicio()

    const plano = planejarImportacao(
      umArquivo({
        exercicios: [
          inalterado,
          { ...atualizado, alteradoEm: '2026-02-01T00:00:00.000Z' },
          novo,
        ],
      }),
      { ...VAZIO, exercicios: [inalterado, atualizado] },
    )

    expect(plano.resumo).toMatchObject({ inseridos: 1, atualizados: 1, ignorados: 1 })
  })
})
