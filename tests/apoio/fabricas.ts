/**
 * Fábricas de registro para teste. Valores explícitos e sobrescrevíveis: um
 * teste de precedência precisa dizer exatamente qual `alteradoEm` está em jogo.
 */
import { novoId } from '../../src/plataforma/id'
import type {
  Exercicio,
  ExercicioSessao,
  ItemTreino,
  SeriePlanejada,
  SerieRealizada,
  Sessao,
  Treino,
} from '../../src/domain/tipos'
import type {
  ArquivoDeBackup,
  ExercicioSessaoExportado,
  SerieRealizadaExportada,
  SessaoExportada,
} from '../../src/domain/backup/tipos'

const EM = '2026-01-01T00:00:00.000Z'

function comuns(alteradoEm = EM) {
  return {
    id: novoId(),
    criadoEm: EM,
    alteradoEm,
    deslocamentoLocal: '-03:00',
    excluidoEm: null,
  }
}

export function umExercicio(parcial: Partial<Exercicio> = {}): Exercicio {
  return {
    ...comuns(),
    nome: 'Supino reto',
    origem: 'catalogo',
    grupoMuscular: 'Peito',
    equipamento: 'Barra',
    ocultoEm: null,
    ...parcial,
  }
}

export function umTreino(parcial: Partial<Treino> = {}): Treino {
  return { ...comuns(), nome: 'Treino A', ...parcial }
}

export function umItemTreino(parcial: Partial<ItemTreino> = {}): ItemTreino {
  return {
    ...comuns(),
    treinoId: novoId(),
    exercicioId: novoId(),
    ordem: 1,
    abordagem: 'tradicional',
    descansoSegundos: null,
    ...parcial,
  }
}

export function umaSeriePlanejada(parcial: Partial<SeriePlanejada> = {}): SeriePlanejada {
  return {
    ...comuns(),
    itemTreinoId: novoId(),
    ordem: 1,
    repeticoes: 8,
    repeticoesMax: null,
    cargaKg: 40,
    rir: 2,
    ...parcial,
  }
}

export function umaSessao(parcial: Partial<Sessao> = {}): Sessao {
  return {
    ...comuns(),
    treinoId: novoId(),
    nomeTreino: 'Treino A',
    iniciadaEm: '2026-01-01T10:00:00.000Z',
    concluidaEm: '2026-01-01T11:00:00.000Z',
    estado: 'concluida',
    versaoVigenteId: novoId(),
    corrigida: false,
    ...parcial,
  }
}

export function umExercicioSessao(parcial: Partial<ExercicioSessao> = {}): ExercicioSessao {
  return {
    ...comuns(),
    sessaoVersaoId: novoId(),
    exercicioId: novoId(),
    ordem: 1,
    abordagem: 'tradicional',
    origem: 'planejado',
    itemTreinoId: null,
    naoRealizado: false,
    ...parcial,
  }
}

export function umaSerieRealizada(parcial: Partial<SerieRealizada> = {}): SerieRealizada {
  return {
    ...comuns(),
    exercicioSessaoId: novoId(),
    ordem: 1,
    cargaKg: 40,
    repeticoes: 8,
    rir: 2,
    naoRealizada: false,
    seriePlanejadaId: null,
    degraus: null,
    ...parcial,
  }
}

export function umaSessaoExportada(parcial: Partial<SessaoExportada> = {}): SessaoExportada {
  const { versaoVigenteId: _v, ...sessao } = umaSessao()
  return { ...sessao, ...parcial }
}

export function umExercicioSessaoExportado(
  parcial: Partial<ExercicioSessaoExportado> = {},
): ExercicioSessaoExportado {
  const { sessaoVersaoId: _s, ...exercicio } = umExercicioSessao()
  return { ...exercicio, sessaoId: novoId(), ...parcial }
}

export function umaSerieRealizadaExportada(
  parcial: Partial<SerieRealizadaExportada> = {},
): SerieRealizadaExportada {
  return { ...umaSerieRealizada(), ...parcial }
}

/** Arquivo mínimo, válido e internamente consistente. */
export function umArquivo(parcial: Partial<ArquivoDeBackup> = {}): ArquivoDeBackup {
  return {
    formatVersion: 1,
    geradoEm: '2026-06-01T12:00:00.000Z',
    deslocamentoLocal: '-03:00',
    aplicacao: { nome: 'fit-kings', versao: '0.1.0' },
    exercicios: [],
    treinos: [],
    itensTreino: [],
    seriesPlanejadas: [],
    sessoes: [],
    exerciciosSessao: [],
    seriesRealizadas: [],
    ...parcial,
  }
}

/**
 * Arquivo coerente com um treino, uma sessão e suas séries. As referências
 * resolvem todas dentro dele.
 */
export function umArquivoCompleto(alteradoEm = EM): ArquivoDeBackup {
  const exercicio = umExercicio({ alteradoEm })
  const treino = umTreino({ alteradoEm })
  const item = umItemTreino({ treinoId: treino.id, exercicioId: exercicio.id, alteradoEm })
  const seriePlanejada = umaSeriePlanejada({ itemTreinoId: item.id, alteradoEm })
  const sessao = umaSessaoExportada({ treinoId: treino.id, alteradoEm })
  const exercicioSessao = umExercicioSessaoExportado({
    sessaoId: sessao.id,
    exercicioId: exercicio.id,
    itemTreinoId: item.id,
    alteradoEm,
  })
  const serie = umaSerieRealizadaExportada({
    exercicioSessaoId: exercicioSessao.id,
    seriePlanejadaId: seriePlanejada.id,
    alteradoEm,
  })

  return umArquivo({
    exercicios: [exercicio],
    treinos: [treino],
    itensTreino: [item],
    seriesPlanejadas: [seriePlanejada],
    sessoes: [sessao],
    exerciciosSessao: [exercicioSessao],
    seriesRealizadas: [serie],
  })
}
