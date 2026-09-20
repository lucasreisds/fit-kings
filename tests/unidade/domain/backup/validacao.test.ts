import { describe, expect, it } from 'vitest'
import { validar, validarTexto } from '../../../../src/domain/backup/validar'
import { serializar } from '../../../../src/domain/backup/montar'
import {
  umArquivo,
  umArquivoCompleto,
  umExercicio,
  umItemTreino,
  umTreino,
} from '../../../apoio/fabricas'
import { novoId } from '../../../../src/plataforma/id'

/**
 * FR-106, contrato § 1 — validação completa antes de qualquer escrita.
 *
 * O ponto destes testes é que **cada modo de falha tem mensagem própria**. Um
 * arquivo truncado, um JSON de outro aplicativo e um backup de versão futura
 * são três situações diferentes, e tratá-las com um único "arquivo inválido"
 * faz o usuário apagar um backup que estava bom.
 */
describe('validação do arquivo de backup', () => {
  it('aceita um arquivo coerente', () => {
    expect(validar(umArquivoCompleto()).valido).toBe(true)
  })

  it('aceita um arquivo vazio mas bem formado — usuário sem dados ainda', () => {
    expect(validar(umArquivo()).valido).toBe(true)
  })

  it('aceita o que ele mesmo serializou', () => {
    const resultado = validarTexto(serializar(umArquivoCompleto()))
    expect(resultado.valido).toBe(true)
  })

  it('recusa JSON truncado com mensagem específica', () => {
    const texto = serializar(umArquivoCompleto()).slice(0, 200)
    const resultado = validarTexto(texto)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas[0]!.codigo).toBe('json_invalido')
      expect(resultado.problemas[0]!.mensagem).toMatch(/truncado/i)
    }
  })

  it('recusa JSON de outro aplicativo', () => {
    const resultado = validarTexto('{"usuarios":[],"pedidos":[]}')
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.problemas[0]!.codigo).toBe('format_version_ausente')
  })

  it.each([
    ['lista na raiz', '[]'],
    ['número na raiz', '42'],
    ['texto na raiz', '"backup"'],
    ['nulo na raiz', 'null'],
  ])('recusa %s', (_caso, texto) => {
    expect(validarTexto(texto).valido).toBe(false)
  })

  it('recusa formatVersion maior que o suportado, e diz que a versão é mais nova (FR-097)', () => {
    const resultado = validar(umArquivo({ formatVersion: 99 }))

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas[0]!.codigo).toBe('format_version_futuro')
      expect(resultado.problemas[0]!.mensagem).toMatch(/versão mais nova/i)
      // Não é um erro genérico de arquivo inválido — o contrato exige a
      // distinção, e é o único problema reportado.
      expect(resultado.problemas).toHaveLength(1)
    }
  })

  it.each(['exercicios', 'treinos', 'itensTreino', 'seriesPlanejadas', 'sessoes', 'exerciciosSessao', 'seriesRealizadas'])(
    'recusa arquivo sem a coleção "%s"',
    (colecao) => {
      const arquivo = { ...umArquivo() } as Record<string, unknown>
      delete arquivo[colecao]

      const resultado = validar(arquivo)
      expect(resultado.valido).toBe(false)
      if (!resultado.valido) {
        expect(resultado.problemas.some((p) => p.codigo === 'colecao_ausente')).toBe(true)
      }
    },
  )

  it('recusa coleção que não é lista', () => {
    const resultado = validar(umArquivo({ exercicios: {} as never }))
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.problemas[0]!.codigo).toBe('colecao_nao_e_lista')
  })

  it('recusa identificador que não é UUID', () => {
    const resultado = validar(
      umArquivo({ exercicios: [{ ...umExercicio(), id: 'exercicio-1' } as never] }),
    )
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.some((p) => p.codigo === 'id_invalido')).toBe(true)
    }
  })

  it('recusa identificador duplicado dentro da mesma coleção', () => {
    const id = novoId()
    const resultado = validar(
      umArquivo({ exercicios: [umExercicio({ id }), umExercicio({ id })] }),
    )

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.some((p) => p.codigo === 'id_duplicado')).toBe(true)
    }
  })

  it('aceita o mesmo identificador em coleções diferentes — a unicidade é por coleção', () => {
    const id = novoId()
    const exercicio = umExercicio({ id })
    const treino = umTreino({ id })
    expect(validar(umArquivo({ exercicios: [exercicio], treinos: [treino] })).valido).toBe(true)
  })

  it('recusa referência que não resolve dentro do arquivo', () => {
    const exercicio = umExercicio()
    const treino = umTreino()
    const item = umItemTreino({ treinoId: novoId(), exercicioId: exercicio.id })

    const resultado = validar(
      umArquivo({ exercicios: [exercicio], treinos: [treino], itensTreino: [item] }),
    )

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      const problema = resultado.problemas.find((p) => p.codigo === 'referencia_nao_resolvida')
      expect(problema?.caminho).toBe('itensTreino[0].treinoId')
    }
  })

  it('aceita referência opcional nula — sessão cujo treino foi excluído (FR-040)', () => {
    const arquivo = umArquivoCompleto()
    const sessoes = [{ ...arquivo.sessoes[0]!, treinoId: null }]
    expect(validar({ ...arquivo, sessoes }).valido).toBe(true)
  })

  it('recusa referência obrigatória nula', () => {
    const arquivo = umArquivoCompleto()
    const exerciciosSessao = [{ ...arquivo.exerciciosSessao[0]!, sessaoId: null as never }]
    const resultado = validar({ ...arquivo, exerciciosSessao })

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.some((p) => p.codigo === 'campo_obrigatorio_ausente')).toBe(true)
    }
  })

  it.each([
    ['criadoEm', 'ontem'],
    ['alteradoEm', '2026-13-45'],
    ['excluidoEm', 'nunca'],
  ])('recusa carimbo inválido em "%s"', (campo, valor) => {
    const resultado = validar(
      umArquivo({ exercicios: [{ ...umExercicio(), [campo]: valor } as never] }),
    )
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.some((p) => p.codigo === 'carimbo_invalido')).toBe(true)
    }
  })

  it('aceita excluidoEm nulo e preenchido — o registro excluído viaja (FR-098)', () => {
    expect(validar(umArquivo({ exercicios: [umExercicio({ excluidoEm: null })] })).valido).toBe(true)
    expect(
      validar(umArquivo({ exercicios: [umExercicio({ excluidoEm: '2026-05-01T00:00:00.000Z' })] }))
        .valido,
    ).toBe(true)
  })

  it('recusa sessão que não esteja concluída — o arquivo não carrega as outras', () => {
    const arquivo = umArquivoCompleto()
    for (const estado of ['em_andamento', 'descartada'] as const) {
      const sessoes = [{ ...arquivo.sessoes[0]!, estado }]
      const resultado = validar({ ...arquivo, sessoes })
      expect(resultado.valido).toBe(false)
    }
  })

  it('aceita abordagem que esta versão não conhece (FR-014, política de compatibilidade)', () => {
    const arquivo = umArquivoCompleto()
    const itensTreino = [{ ...arquivo.itensTreino[0]!, abordagem: 'rest-pause' }]
    const exerciciosSessao = [{ ...arquivo.exerciciosSessao[0]!, abordagem: 'rest-pause' }]
    expect(validar({ ...arquivo, itensTreino, exerciciosSessao }).valido).toBe(true)
  })

  it('aceita campo desconhecido — leitores antigos ignoram o que não conhecem', () => {
    const arquivo = umArquivoCompleto()
    const exercicios = [{ ...arquivo.exercicios[0]!, campoDoFuturo: 'algo' }]
    const comColecaoNova = { ...arquivo, exercicios, colecaoDoFuturo: [] }
    expect(validar(comColecaoNova).valido).toBe(true)
  })

  it('acumula os problemas em vez de parar no primeiro', () => {
    const resultado = validar(
      umArquivo({
        exercicios: [
          { ...umExercicio(), id: 'nao-e-uuid' } as never,
          { ...umExercicio(), criadoEm: 'ontem' } as never,
          { ...umExercicio(), nome: '' } as never,
        ],
      }),
    )

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.problemas.length).toBeGreaterThanOrEqual(3)
  })
})
