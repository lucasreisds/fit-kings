import { describe, expect, it } from 'vitest'
import { validar } from '../../../../src/domain/backup/validar'
import {
  FORMAT_VERSIONS_SUPORTADAS,
  FORMAT_VERSION_CORRENTE,
} from '../../../../src/domain/backup/tipos'
import { umArquivo, umArquivoCompleto } from '../../../apoio/fabricas'

/**
 * T119 — FR-097, contrato § Política de compatibilidade.
 *
 * **Toda versão do aplicativo lê os backups gerados pelas versões anteriores.**
 * É exigência do Princípio IV, e é o que permite ao usuário restaurar em 2030
 * um arquivo gerado hoje.
 *
 * A outra metade é igualmente importante: um arquivo de versão **superior** é
 * recusado com mensagem específica — "gerado por uma versão mais nova" —, e não
 * com erro genérico de arquivo inválido. A diferença decide se o usuário
 * atualiza o aplicativo ou apaga um backup que estava perfeito.
 */
describe('compatibilidade de formatVersion (FR-097)', () => {
  it('a versão corrente é 1 e está entre as suportadas', () => {
    expect(FORMAT_VERSION_CORRENTE).toBe(1)
    expect(FORMAT_VERSIONS_SUPORTADAS).toContain(FORMAT_VERSION_CORRENTE)
  })

  it.each(FORMAT_VERSIONS_SUPORTADAS)('lê um arquivo de formatVersion %i', (versao) => {
    const arquivo = { ...umArquivoCompleto(), formatVersion: versao }
    expect(validar(arquivo).valido).toBe(true)
  })

  it('recusa formatVersion superior com mensagem própria, não erro genérico', () => {
    const resultado = validar(umArquivo({ formatVersion: FORMAT_VERSION_CORRENTE + 1 }))

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas).toHaveLength(1)
      expect(resultado.problemas[0]!.codigo).toBe('format_version_futuro')
      expect(resultado.problemas[0]!.mensagem).toMatch(/versão mais nova/i)
      expect(resultado.problemas[0]!.mensagem).not.toMatch(/inválido/i)
    }
  })

  it('a recusa por versão futura não reporta mais nenhum problema', () => {
    // Um arquivo de versão futura tem estrutura que esta build não conhece.
    // Listar "coleção ausente" para cada coisa que ela não entende seria ruído
    // sobre um arquivo que não tem defeito nenhum.
    const doFuturo = {
      formatVersion: 99,
      geradoEm: 'não é data',
      exercicios: 'nem lista',
    }
    const resultado = validar(doFuturo)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas).toHaveLength(1)
      expect(resultado.problemas[0]!.codigo).toBe('format_version_futuro')
    }
  })

  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['texto', '1'],
    ['fracionado', 1.5],
  ])('recusa formatVersion %s como arquivo não reconhecido', (_caso, valor) => {
    const resultado = validar({ ...umArquivo(), formatVersion: valor })

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.problemas[0]!.codigo).toBe('format_version_ausente')
  })

  it('campo novo desconhecido não impede a leitura — leitor antigo ignora', () => {
    const arquivo = umArquivoCompleto()
    const comCampoNovo = {
      ...arquivo,
      exercicios: [{ ...arquivo.exercicios[0]!, atributoDeUmaVersaoFutura: 42 }],
      colecaoDeUmaVersaoFutura: [{ id: 'qualquer' }],
    }
    expect(validar(comCampoNovo).valido).toBe(true)
  })

  it('valor novo em campo aberto não incrementa a versão (FR-014, SC-014)', () => {
    // Uma abordagem de série que esta build não conhece é dado válido: o campo
    // é aberto por FR-014, e recusá-lo quebraria a política de compatibilidade.
    const arquivo = umArquivoCompleto()
    const comAbordagemNova = {
      ...arquivo,
      formatVersion: 1,
      itensTreino: [{ ...arquivo.itensTreino[0]!, abordagem: 'cluster-set' }],
      exerciciosSessao: [{ ...arquivo.exerciciosSessao[0]!, abordagem: 'cluster-set' }],
    }

    expect(validar(comAbordagemNova).valido).toBe(true)
  })

  it('coleção obrigatória ausente num arquivo de versão conhecida é recusada', () => {
    // O oposto do caso anterior: dentro de uma versão que a build conhece, o
    // contrato é exigido por inteiro.
    const { exercicios: _removida, ...semExercicios } = umArquivo()
    const resultado = validar(semExercicios)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.some((p) => p.codigo === 'colecao_ausente')).toBe(true)
    }
  })
})
