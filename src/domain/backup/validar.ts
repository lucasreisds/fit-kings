/**
 * Validação do arquivo de backup — FR-106, contrato § 1.
 *
 * **O arquivo inteiro é validado antes de a primeira linha ser gravada.** Falha
 * em qualquer ponto aborta tudo, sem alterar nenhum dado existente. Por isso
 * esta é uma função pura que devolve um relatório, e não uma rotina que grava
 * conforme valida: validar durante a escrita deixaria metade do arquivo dentro
 * do banco quando o erro aparecesse na outra metade.
 *
 * A função acumula os problemas em vez de parar no primeiro. Um arquivo com dez
 * referências quebradas deve dizer as dez.
 */
import {
  ehDeslocamentoValido,
  ehIdValido,
  ehInstanteValido,
} from '../tipos/validadores'
import {
  COLECOES,
  FORMAT_VERSIONS_SUPORTADAS,
  FORMAT_VERSION_CORRENTE,
  type ArquivoDeBackup,
  type NomeDeColecao,
} from './tipos'

export type CodigoDeProblema =
  | 'json_invalido'
  | 'raiz_invalida'
  | 'format_version_ausente'
  | 'format_version_futuro'
  | 'format_version_desconhecido'
  | 'colecao_ausente'
  | 'colecao_nao_e_lista'
  | 'registro_invalido'
  | 'id_invalido'
  | 'id_duplicado'
  | 'carimbo_invalido'
  | 'deslocamento_invalido'
  | 'referencia_nao_resolvida'
  | 'campo_obrigatorio_ausente'
  | 'valor_fora_do_dominio'

export type ProblemaDoArquivo = {
  readonly codigo: CodigoDeProblema
  readonly caminho: string
  readonly mensagem: string
}

export type ResultadoDaValidacao =
  | { readonly valido: true; readonly arquivo: ArquivoDeBackup }
  | { readonly valido: false; readonly problemas: readonly ProblemaDoArquivo[] }

function problema(
  codigo: CodigoDeProblema,
  caminho: string,
  mensagem: string,
): ProblemaDoArquivo {
  return { codigo, caminho, mensagem }
}

/** Interpreta o texto e valida. O erro de JSON é problema de arquivo, não exceção. */
export function validarTexto(texto: string): ResultadoDaValidacao {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return {
      valido: false,
      problemas: [
        problema(
          'json_invalido',
          '',
          'O arquivo não é um JSON válido. Ele pode ter sido truncado ou alterado.',
        ),
      ],
    }
  }
  return validar(bruto)
}

export function validar(bruto: unknown): ResultadoDaValidacao {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return {
      valido: false,
      problemas: [
        problema('raiz_invalida', '', 'O arquivo não tem a estrutura de um backup do fit-kings.'),
      ],
    }
  }

  const arquivo = bruto as Record<string, unknown>

  // 1. formatVersion — recusado primeiro e com mensagem própria. Um backup de
  //    versão futura não é "arquivo inválido": é um arquivo bom que esta build
  //    não sabe ler, e dizer a coisa errada aqui faz o usuário apagá-lo.
  const versaoProblema = validarFormatVersion(arquivo.formatVersion)
  if (versaoProblema) return { valido: false, problemas: [versaoProblema] }

  const problemas: ProblemaDoArquivo[] = []

  if (!ehInstanteValido(arquivo.geradoEm)) {
    problemas.push(
      problema('carimbo_invalido', 'geradoEm', 'A data de geração do arquivo é inválida.'),
    )
  }
  if (arquivo.deslocamentoLocal !== undefined && !ehDeslocamentoValido(arquivo.deslocamentoLocal)) {
    problemas.push(
      problema('deslocamento_invalido', 'deslocamentoLocal', 'O deslocamento local é inválido.'),
    )
  }

  // 2. Coleções presentes e do tipo esperado.
  const colecoes = new Map<NomeDeColecao, Record<string, unknown>[]>()
  for (const nome of COLECOES) {
    const valor = arquivo[nome]
    if (valor === undefined || valor === null) {
      problemas.push(problema('colecao_ausente', nome, `A coleção "${nome}" está ausente.`))
      continue
    }
    if (!Array.isArray(valor)) {
      problemas.push(problema('colecao_nao_e_lista', nome, `A coleção "${nome}" não é uma lista.`))
      continue
    }
    colecoes.set(nome, valor as Record<string, unknown>[])
  }
  if (problemas.length > 0) return { valido: false, problemas }

  // 3. Campos comuns, identificadores e unicidade dentro de cada coleção.
  const idsPorColecao = new Map<NomeDeColecao, Set<string>>()
  for (const [nome, registros] of colecoes) {
    const ids = new Set<string>()
    registros.forEach((registro, indice) => {
      const caminho = `${nome}[${indice}]`
      if (typeof registro !== 'object' || registro === null || Array.isArray(registro)) {
        problemas.push(problema('registro_invalido', caminho, 'O registro não é um objeto.'))
        return
      }
      if (!ehIdValido(registro.id)) {
        problemas.push(problema('id_invalido', `${caminho}.id`, 'O identificador não é um UUID.'))
      } else if (ids.has(registro.id)) {
        problemas.push(
          problema('id_duplicado', `${caminho}.id`, `O identificador ${registro.id} aparece duas vezes em "${nome}".`),
        )
      } else {
        ids.add(registro.id)
      }

      for (const campo of ['criadoEm', 'alteradoEm'] as const) {
        if (!ehInstanteValido(registro[campo])) {
          problemas.push(
            problema('carimbo_invalido', `${caminho}.${campo}`, `O campo "${campo}" não é uma data ISO 8601 válida.`),
          )
        }
      }
      if (registro.excluidoEm !== null && !ehInstanteValido(registro.excluidoEm)) {
        problemas.push(
          problema('carimbo_invalido', `${caminho}.excluidoEm`, 'O campo "excluidoEm" precisa ser nulo ou uma data válida.'),
        )
      }
      if (
        registro.deslocamentoLocal !== undefined &&
        !ehDeslocamentoValido(registro.deslocamentoLocal)
      ) {
        problemas.push(
          problema('deslocamento_invalido', `${caminho}.deslocamentoLocal`, 'O deslocamento local é inválido.'),
        )
      }
    })
    idsPorColecao.set(nome, ids)
  }

  // 4. Campos próprios de cada entidade.
  validarCamposProprios(colecoes, problemas)

  // 5. Referências. Toda uma resolve dentro do próprio arquivo — o backup é
  //    autossuficiente, e um `exercicioId` que aponta para fora dele produziria
  //    histórico órfão no aparelho de destino.
  const referencias: readonly [NomeDeColecao, string, NomeDeColecao, boolean][] = [
    ['itensTreino', 'treinoId', 'treinos', false],
    ['itensTreino', 'exercicioId', 'exercicios', false],
    ['seriesPlanejadas', 'itemTreinoId', 'itensTreino', false],
    ['sessoes', 'treinoId', 'treinos', true],
    ['exerciciosSessao', 'sessaoId', 'sessoes', false],
    ['exerciciosSessao', 'exercicioId', 'exercicios', false],
    ['exerciciosSessao', 'itemTreinoId', 'itensTreino', true],
    ['seriesRealizadas', 'exercicioSessaoId', 'exerciciosSessao', false],
    ['seriesRealizadas', 'seriePlanejadaId', 'seriesPlanejadas', true],
  ]

  for (const [origem, campo, destino, admiteNulo] of referencias) {
    const registros = colecoes.get(origem) ?? []
    const alvos = idsPorColecao.get(destino) ?? new Set<string>()

    registros.forEach((registro, indice) => {
      const valor = registro[campo]
      if (valor === null || valor === undefined) {
        if (!admiteNulo) {
          problemas.push(
            problema('campo_obrigatorio_ausente', `${origem}[${indice}].${campo}`, `O campo "${campo}" é obrigatório.`),
          )
        }
        return
      }
      if (typeof valor !== 'string' || !alvos.has(valor)) {
        problemas.push(
          problema('referencia_nao_resolvida', `${origem}[${indice}].${campo}`, `A referência "${campo}" não existe em "${destino}" dentro do arquivo.`),
        )
      }
    })
  }

  return problemas.length > 0
    ? { valido: false, problemas }
    : { valido: true, arquivo: bruto as ArquivoDeBackup }
}

function validarFormatVersion(valor: unknown): ProblemaDoArquivo | null {
  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    return problema(
      'format_version_ausente',
      'formatVersion',
      'O arquivo não declara a versão do formato. Ele pode não ser um backup do fit-kings.',
    )
  }
  if (valor > FORMAT_VERSION_CORRENTE) {
    return problema(
      'format_version_futuro',
      'formatVersion',
      'Este backup foi gerado por uma versão mais nova do aplicativo. Atualize o fit-kings para importá-lo.',
    )
  }
  if (!FORMAT_VERSIONS_SUPORTADAS.includes(valor)) {
    return problema(
      'format_version_desconhecido',
      'formatVersion',
      `Esta versão do aplicativo não sabe ler backups na versão de formato ${valor}.`,
    )
  }
  return null
}

function validarCamposProprios(
  colecoes: Map<NomeDeColecao, Record<string, unknown>[]>,
  problemas: ProblemaDoArquivo[],
): void {
  const exigirTexto = (
    nome: NomeDeColecao,
    campo: string,
    registro: Record<string, unknown>,
    indice: number,
  ) => {
    if (typeof registro[campo] !== 'string' || (registro[campo] as string).length === 0) {
      problemas.push(
        problema('campo_obrigatorio_ausente', `${nome}[${indice}].${campo}`, `O campo "${campo}" é obrigatório.`),
      )
    }
  }

  const exigirNumero = (
    nome: NomeDeColecao,
    campo: string,
    registro: Record<string, unknown>,
    indice: number,
    admiteNulo = false,
  ) => {
    const valor = registro[campo]
    if (admiteNulo && valor === null) return
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      problemas.push(
        problema('valor_fora_do_dominio', `${nome}[${indice}].${campo}`, `O campo "${campo}" precisa ser um número.`),
      )
    }
  }

  const exigirBooleano = (
    nome: NomeDeColecao,
    campo: string,
    registro: Record<string, unknown>,
    indice: number,
  ) => {
    if (typeof registro[campo] !== 'boolean') {
      problemas.push(
        problema('valor_fora_do_dominio', `${nome}[${indice}].${campo}`, `O campo "${campo}" precisa ser verdadeiro ou falso.`),
      )
    }
  }

  ;(colecoes.get('exercicios') ?? []).forEach((registro, indice) => {
    exigirTexto('exercicios', 'nome', registro, indice)
    if (registro.origem !== 'catalogo' && registro.origem !== 'personalizado') {
      problemas.push(
        problema('valor_fora_do_dominio', `exercicios[${indice}].origem`, 'A origem precisa ser "catalogo" ou "personalizado".'),
      )
    }
  })
  ;(colecoes.get('treinos') ?? []).forEach((registro, indice) => {
    exigirTexto('treinos', 'nome', registro, indice)
  })
  ;(colecoes.get('itensTreino') ?? []).forEach((registro, indice) => {
    exigirNumero('itensTreino', 'ordem', registro, indice)
    // `abordagem` é campo aberto por FR-014: qualquer texto é aceito, inclusive
    // um valor que esta versão não conhece. Recusá-lo quebraria a política de
    // compatibilidade do contrato.
    exigirTexto('itensTreino', 'abordagem', registro, indice)
  })
  ;(colecoes.get('seriesPlanejadas') ?? []).forEach((registro, indice) => {
    exigirNumero('seriesPlanejadas', 'ordem', registro, indice)
    exigirNumero('seriesPlanejadas', 'repeticoes', registro, indice)
    exigirNumero('seriesPlanejadas', 'cargaKg', registro, indice)
    exigirNumero('seriesPlanejadas', 'rir', registro, indice, true)
  })
  ;(colecoes.get('sessoes') ?? []).forEach((registro, indice) => {
    exigirTexto('sessoes', 'nomeTreino', registro, indice)
    exigirBooleano('sessoes', 'corrigida', registro, indice)
    if (!ehInstanteValido(registro.iniciadaEm)) {
      problemas.push(
        problema('carimbo_invalido', `sessoes[${indice}].iniciadaEm`, 'A data de início é inválida.'),
      )
    }
    if (registro.concluidaEm !== null && !ehInstanteValido(registro.concluidaEm)) {
      problemas.push(
        problema('carimbo_invalido', `sessoes[${indice}].concluidaEm`, 'A data de conclusão é inválida.'),
      )
    }
    // O arquivo só carrega sessões concluídas: em andamento e descartadas não
    // entram (contrato § O que o arquivo contém).
    if (registro.estado !== 'concluida') {
      problemas.push(
        problema('valor_fora_do_dominio', `sessoes[${indice}].estado`, 'O arquivo só pode conter sessões concluídas.'),
      )
    }
  })
  ;(colecoes.get('exerciciosSessao') ?? []).forEach((registro, indice) => {
    exigirNumero('exerciciosSessao', 'ordem', registro, indice)
    exigirTexto('exerciciosSessao', 'abordagem', registro, indice)
    exigirBooleano('exerciciosSessao', 'naoRealizado', registro, indice)
    if (registro.origem !== 'planejado' && registro.origem !== 'fora_do_plano') {
      problemas.push(
        problema('valor_fora_do_dominio', `exerciciosSessao[${indice}].origem`, 'A origem precisa ser "planejado" ou "fora_do_plano".'),
      )
    }
  })
  ;(colecoes.get('seriesRealizadas') ?? []).forEach((registro, indice) => {
    exigirNumero('seriesRealizadas', 'ordem', registro, indice)
    exigirNumero('seriesRealizadas', 'cargaKg', registro, indice, true)
    exigirNumero('seriesRealizadas', 'repeticoes', registro, indice, true)
    exigirNumero('seriesRealizadas', 'rir', registro, indice, true)
    exigirBooleano('seriesRealizadas', 'naoRealizada', registro, indice)
    if (registro.degraus !== null && !Array.isArray(registro.degraus)) {
      problemas.push(
        problema('valor_fora_do_dominio', `seriesRealizadas[${indice}].degraus`, 'Os degraus precisam ser uma lista ou nulos.'),
      )
    }
  })
}

/** Resumo legível dos problemas, para a tela de importação (FR-107). */
export function resumirProblemas(problemas: readonly ProblemaDoArquivo[]): string {
  if (problemas.length === 0) return ''
  const primeiro = problemas[0]!
  if (problemas.length === 1) return primeiro.mensagem
  return `${primeiro.mensagem} Há mais ${problemas.length - 1} ${
    problemas.length - 1 === 1 ? 'problema' : 'problemas'
  } no arquivo.`
}
