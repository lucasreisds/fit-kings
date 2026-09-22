/**
 * Sessões, versões, exercícios da sessão e séries realizadas — FR-016 a FR-034.
 *
 * Duas coisas aqui carregam o Princípio I inteiro:
 *
 * 1. **Cada série confirmada grava em transação própria** (D4, FR-033). Sem
 *    lote e sem débito diferido: a unidade de perda é uma série, nunca um
 *    exercício ou uma sessão. Quem chama só recebe o retorno depois do commit.
 * 2. **`exerciciosSessao` persiste `naoRealizado` e nunca um campo de estado.**
 *    O estado apresentado é sempre derivado por `estadoExercicioSessao()`
 *    (FR-125). Um campo de estado aqui seria um cache que não fecha.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type {
  Degrau,
  ExercicioSessao,
  Id,
  SerieRealizada,
  Sessao,
  SessaoVersao,
} from '../../domain/tipos'
import { criarRepositorio, RegistroNaoEncontradoError } from './base'
import { novoId } from '../../plataforma/id'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'
import { proximoEstado, type Transicao } from '../../domain/sessao/estado'
import {
  aplicarCorrecao,
  proximoNumeroDeVersao,
  validarCorrecao,
  type CorrecaoDeSerie,
} from '../../domain/sessao/versionar'
import {
  renumerarAposRemocao,
  validarCorrecaoDeRascunho,
  type CorrecaoDeRascunho,
  type MetaPorPosicao,
} from '../../domain/sessao/rascunho'

/** Uma sessão com seu conteúdo resolvido na versão vigente. */
export type SessaoCompleta = {
  readonly sessao: Sessao
  readonly versao: SessaoVersao
  readonly exercicios: readonly ExercicioSessaoCompleto[]
}

export type ExercicioSessaoCompleto = {
  readonly exercicio: ExercicioSessao
  readonly series: readonly SerieRealizada[]
}

export type EntradaDeExercicioSessao = {
  readonly exercicioId: Id
  readonly ordem: number
  readonly abordagem: string
  readonly origem: 'planejado' | 'fora_do_plano'
  readonly itemTreinoId: Id | null
}

export type EntradaDeSerie = {
  readonly ordem: number
  readonly cargaKg: number | null
  readonly repeticoes: number | null
  readonly rir: number | null
  readonly naoRealizada?: boolean
  readonly seriePlanejadaId: Id | null
  readonly degraus?: readonly Degrau[] | null
}

export class SessaoJaEmAndamentoError extends Error {
  readonly sessaoId: Id

  constructor(sessaoId: Id) {
    super('Já existe um treino em andamento. Retome, conclua ou descarte antes de iniciar outro.')
    this.name = 'SessaoJaEmAndamentoError'
    this.sessaoId = sessaoId
  }
}

/**
 * A operação pedida só vale com a sessão em andamento.
 *
 * A verificação vive na camada de dados, não na tela: uma tela pode esquecer de
 * checar, e o que está em jogo é a imutabilidade do histórico (FR-113, FR-114).
 */
export class SessaoNaoEstaEmAndamentoError extends Error {
  constructor(estado: string) {
    super(
      `Esta operação só vale durante o treino. A sessão está "${estado}" — ` +
        'para alterar valores de uma sessão concluída, use a correção, que cria uma versão nova.',
    )
    this.name = 'SessaoNaoEstaEmAndamentoError'
  }
}

export class SessaoNaoCorrigivelError extends Error {
  constructor(estado: string) {
    super(`Só uma sessão concluída pode ser corrigida. Esta está "${estado}".`)
    this.name = 'SessaoNaoCorrigivelError'
  }
}

export class CorrecaoInvalidaError extends Error {
  readonly problemas: readonly { codigo: string; mensagem: string }[]

  constructor(problemas: readonly { codigo: string; mensagem: string }[]) {
    super(problemas[0]?.mensagem ?? 'Correção inválida.')
    this.name = 'CorrecaoInvalidaError'
    this.problemas = problemas
  }
}

export class FalhaAoPersistirError extends Error {
  readonly causa: unknown

  constructor(causa: unknown) {
    super('Não foi possível salvar o registro neste aparelho.')
    this.name = 'FalhaAoPersistirError'
    this.causa = causa
  }
}

export type RepositorioSessoes = {
  sessaoEmAndamento(): Promise<Sessao | undefined>
  criar(dados: {
    treinoId: Id | null
    nomeTreino: string
    exercicios: readonly EntradaDeExercicioSessao[]
  }): Promise<SessaoCompleta>
  obter(sessaoId: Id): Promise<SessaoCompleta | undefined>
  /** Grava uma série em transação própria. Só retorna depois do commit (FR-033). */
  registrarSerie(exercicioSessaoId: Id, entrada: EntradaDeSerie): Promise<SerieRealizada>
  atualizarSerie(serieId: Id, entrada: Partial<EntradaDeSerie>): Promise<SerieRealizada>
  marcarExercicioNaoRealizado(exercicioSessaoId: Id, naoRealizado: boolean): Promise<ExercicioSessao>
  acrescentarExercicio(
    sessaoId: Id,
    entrada: Omit<EntradaDeExercicioSessao, 'ordem'>,
  ): Promise<ExercicioSessaoCompleto>
  encerrar(sessaoId: Id, transicao: Transicao): Promise<Sessao>
  /** Correção de sessão concluída: cria versão nova, preserva a anterior. */
  corrigir(sessaoId: Id, correcoes: readonly CorrecaoDeSerie[]): Promise<SessaoCompleta>
  /** Correção em sessão **em andamento**: escrita direta, sem versionar (FR-133, FR-136). */
  corrigirSerieEmAndamento(serieId: Id, correcao: CorrecaoDeRascunho): Promise<SerieRealizada>
  /** Remoção em sessão **em andamento**: exclusão lógica e renumeração (FR-134, FR-135). */
  removerSerieEmAndamento(serieId: Id): Promise<void>
  /** Todas as versões de uma sessão, da mais antiga para a mais nova. */
  versoesDe(sessaoId: Id): Promise<SessaoVersao[]>
  /** Reconstrói o índice `vigente` a partir de `sessoes.versaoVigenteId` (T088). */
  reconstruirIndiceDeVigencia(): Promise<number>
}

export function criarRepositorioSessoes(
  db: BancoFitKings = bancoPadrao,
  relogio: Relogio = relogioDoSistema,
): RepositorioSessoes {
  const baseSessoes = criarRepositorio<Sessao>(db.sessoes, relogio)
  const baseVersoes = criarRepositorio<SessaoVersao>(db.sessaoVersoes, relogio)
  const baseExercicios = criarRepositorio<ExercicioSessao>(db.exerciciosSessao, relogio)
  const baseSeries = criarRepositorio<SerieRealizada>(db.seriesRealizadas, relogio)

  async function versaoVigenteDe(sessao: Sessao): Promise<SessaoVersao | undefined> {
    // A autoridade é `sessoes.versaoVigenteId`, nunca o índice `vigente`.
    return db.sessaoVersoes.get(sessao.versaoVigenteId)
  }

  /**
   * Localiza a série e **exige** que ela pertença a uma sessão em andamento.
   * O caminho é série → exercício da sessão → versão → sessão.
   */
  async function exigirSerieDeSessaoAberta(serieId: Id) {
    const serie = await db.seriesRealizadas.get(serieId)
    if (!serie || serie.excluidoEm !== null) throw new RegistroNaoEncontradoError(serieId)

    const exercicio = await db.exerciciosSessao.get(serie.exercicioSessaoId)
    if (!exercicio) throw new RegistroNaoEncontradoError(serie.exercicioSessaoId)

    const versao = await db.sessaoVersoes.get(exercicio.sessaoVersaoId)
    if (!versao) throw new RegistroNaoEncontradoError(exercicio.sessaoVersaoId)

    const sessao = await db.sessoes.get(versao.sessaoId)
    if (!sessao) throw new RegistroNaoEncontradoError(versao.sessaoId)
    if (sessao.estado !== 'em_andamento') {
      throw new SessaoNaoEstaEmAndamentoError(sessao.estado)
    }

    return { serie, exercicio, sessao }
  }

  /** Metas planejadas do item, por posição, para a re-vinculação de FR-135. */
  async function metasDoExercicioSessao(itemTreinoId: Id | null): Promise<MetaPorPosicao[]> {
    if (itemTreinoId === null) return []

    const planejadas = await db.seriesPlanejadas.where('itemTreinoId').equals(itemTreinoId).toArray()
    return planejadas
      .filter((serie) => serie.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)
      .map((serie) => ({ ordem: serie.ordem, seriePlanejadaId: serie.id }))
  }

  async function montar(sessao: Sessao): Promise<SessaoCompleta | undefined> {
    const versao = await versaoVigenteDe(sessao)
    if (!versao) return undefined

    const exercicios = (
      await db.exerciciosSessao.where('sessaoVersaoId').equals(versao.id).toArray()
    )
      .filter((exercicio) => exercicio.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)

    const completos = await Promise.all(
      exercicios.map(async (exercicio) => ({
        exercicio,
        series: (
          await db.seriesRealizadas.where('exercicioSessaoId').equals(exercicio.id).toArray()
        )
          .filter((serie) => serie.excluidoEm === null)
          .sort((a, b) => a.ordem - b.ordem),
      })),
    )

    return { sessao, versao, exercicios: completos }
  }

  return {
    async sessaoEmAndamento() {
      const sessao = await db.sessoes.where('estado').equals('em_andamento').first()
      return sessao?.excluidoEm === null ? sessao : undefined
    },

    async criar(dados) {
      return db.transaction(
        'rw',
        [db.sessoes, db.sessaoVersoes, db.exerciciosSessao],
        async () => {
          // FR-028: no máximo uma em andamento. Verificado **dentro** da
          // transação — fora dela, duas aberturas simultâneas passariam as duas.
          const pendente = await db.sessoes.where('estado').equals('em_andamento').first()
          if (pendente && pendente.excluidoEm === null) {
            throw new SessaoJaEmAndamentoError(pendente.id)
          }

          const agora = relogio.agora()
          const versaoId = novoId()
          const sessaoId = novoId()

          const sessao = await baseSessoes.criar({
            id: sessaoId,
            treinoId: dados.treinoId,
            nomeTreino: dados.nomeTreino,
            iniciadaEm: agora,
            concluidaEm: null,
            estado: 'em_andamento',
            versaoVigenteId: versaoId,
            corrigida: false,
          } as never)

          const versao = await baseVersoes.criar({
            id: versaoId,
            sessaoId: sessao.id,
            numero: 1,
            motivo: 'inicial',
            vigente: 1,
          } as never)

          const exercicios = await baseExercicios.criarVarios(
            dados.exercicios.map((entrada) => ({
              sessaoVersaoId: versao.id,
              exercicioId: entrada.exercicioId,
              ordem: entrada.ordem,
              abordagem: entrada.abordagem,
              origem: entrada.origem,
              itemTreinoId: entrada.itemTreinoId,
              // Nunca um campo de estado: o estado é derivado (FR-125).
              naoRealizado: false,
            })) as never,
          )

          return {
            sessao,
            versao,
            exercicios: exercicios.map((exercicio) => ({ exercicio, series: [] })),
          }
        },
      )
    },

    async obter(sessaoId) {
      const sessao = await db.sessoes.get(sessaoId)
      return sessao ? montar(sessao) : undefined
    },

    /**
     * Transação própria por série (D4). A promessa só resolve depois do commit,
     * e é isso que autoriza a interface a dar o retorno visual de sucesso —
     * o Princípio I proíbe dá-lo antes.
     */
    async registrarSerie(exercicioSessaoId, entrada) {
      try {
        return await db.transaction(
          'rw',
          [db.seriesRealizadas, db.exerciciosSessao],
          async () => {
            const serie = await baseSeries.criar({
              exercicioSessaoId,
              ordem: entrada.ordem,
              cargaKg: entrada.cargaKg,
              repeticoes: entrada.repeticoes,
              rir: entrada.rir,
              naoRealizada: entrada.naoRealizada ?? false,
              seriePlanejadaId: entrada.seriePlanejadaId,
              degraus: entrada.degraus ?? null,
            } as never)

            // FR-126, invariante 2: registrar uma série limpa `naoRealizado`,
            // **na mesma transação**. Fora dela existiria um instante em que o
            // exercício teria marcação ativa e série válida — exatamente o
            // estado inconsistente que a regra existe para tornar inalcançável.
            const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
            if (exercicio?.naoRealizado === true) {
              await baseExercicios.atualizar(exercicioSessaoId, { naoRealizado: false } as never)
            }

            return serie
          },
        )
      } catch (erro) {
        if (erro instanceof RegistroNaoEncontradoError) throw erro
        throw new FalhaAoPersistirError(erro)
      }
    },

    async atualizarSerie(serieId, entrada) {
      try {
        return await db.transaction(
          'rw',
          [db.seriesRealizadas, db.exerciciosSessao],
          async () => {
            const atualizada = await baseSeries.atualizar(serieId, entrada as never)
            const exercicio = await db.exerciciosSessao.get(atualizada.exercicioSessaoId)
            if (exercicio?.naoRealizado === true && atualizada.repeticoes !== null) {
              await baseExercicios.atualizar(exercicio.id, { naoRealizado: false } as never)
            }
            return atualizada
          },
        )
      } catch (erro) {
        if (erro instanceof RegistroNaoEncontradoError) throw erro
        throw new FalhaAoPersistirError(erro)
      }
    },

    /**
     * FR-126, invariante 1: marcar como não realizado **não apaga** as séries já
     * registradas. Apagá-las seria destruir registro do usuário para manter a
     * coerência de um estado que nem sequer é persistido.
     */
    async marcarExercicioNaoRealizado(exercicioSessaoId, naoRealizado) {
      return baseExercicios.atualizar(exercicioSessaoId, { naoRealizado } as never)
    },

    async acrescentarExercicio(sessaoId, entrada) {
      return db.transaction('rw', [db.sessoes, db.exerciciosSessao], async () => {
        const sessao = await db.sessoes.get(sessaoId)
        if (!sessao) throw new RegistroNaoEncontradoError(sessaoId)

        const existentes = await db.exerciciosSessao
          .where('sessaoVersaoId')
          .equals(sessao.versaoVigenteId)
          .toArray()

        const exercicio = await baseExercicios.criar({
          sessaoVersaoId: sessao.versaoVigenteId,
          exercicioId: entrada.exercicioId,
          ordem: existentes.length + 1,
          abordagem: entrada.abordagem,
          origem: entrada.origem,
          itemTreinoId: entrada.itemTreinoId,
          naoRealizado: false,
        } as never)

        return { exercicio, series: [] }
      })
    },

    async encerrar(sessaoId, transicao) {
      const sessao = await db.sessoes.get(sessaoId)
      if (!sessao) throw new RegistroNaoEncontradoError(sessaoId)

      const estado = proximoEstado(sessao.estado, transicao)
      return baseSessoes.atualizar(sessaoId, {
        estado,
        // `concluidaEm` é imutável depois de definida (FR-115).
        concluidaEm: estado === 'concluida' ? relogio.agora() : sessao.concluidaEm,
      } as never)
    },

    async versoesDe(sessaoId) {
      const versoes = await db.sessaoVersoes.where('sessaoId').equals(sessaoId).toArray()
      return versoes.sort((a, b) => a.numero - b.numero)
    },

    /**
     * Correção de sessão concluída — FR-112 a FR-118, D8, Princípio I.
     *
     * Grava uma versão nova com o conteúdo corrigido e **preserva integralmente
     * a anterior**. O cabeçalho da sessão só tem dois campos tocados:
     * `versaoVigenteId`, que passa a apontar para a nova, e `corrigida`. Nem
     * `iniciadaEm` nem `concluidaEm` mudam — FR-115 os torna imutáveis, e é
     * isso que mantém a sessão na mesma posição da ordem cronológica.
     */
    async corrigir(sessaoId, correcoes) {
      const resultado = await db.transaction(
        'rw',
        [db.sessoes, db.sessaoVersoes, db.exerciciosSessao, db.seriesRealizadas],
        async () => {
          const sessao = await db.sessoes.get(sessaoId)
          if (!sessao) throw new RegistroNaoEncontradoError(sessaoId)
          if (sessao.estado !== 'concluida') throw new SessaoNaoCorrigivelError(sessao.estado)

          const exerciciosVigentes = (
            await db.exerciciosSessao.where('sessaoVersaoId').equals(sessao.versaoVigenteId).toArray()
          )
            .filter((exercicio) => exercicio.excluidoEm === null)
            .sort((a, b) => a.ordem - b.ordem)

          const seriesPorExercicio = new Map<Id, SerieRealizada[]>()
          const todasAsSeries: SerieRealizada[] = []
          for (const exercicio of exerciciosVigentes) {
            const series = (
              await db.seriesRealizadas.where('exercicioSessaoId').equals(exercicio.id).toArray()
            )
              .filter((serie) => serie.excluidoEm === null)
              .sort((a, b) => a.ordem - b.ordem)
            seriesPorExercicio.set(exercicio.id, series)
            todasAsSeries.push(...series)
          }

          const validacao = validarCorrecao(todasAsSeries, correcoes)
          if (!validacao.valido) throw new CorrecaoInvalidaError(validacao.problemas)

          const versoes = await db.sessaoVersoes.where('sessaoId').equals(sessaoId).toArray()
          const numero = proximoNumeroDeVersao(versoes.map((versao) => versao.numero))

          const novaVersao = await baseVersoes.criar({
            sessaoId,
            numero,
            motivo: 'correcao',
            vigente: 1,
          } as never)

          // O índice `vigente` das anteriores é atualizado na mesma transação.
          // Elas continuam existindo: nenhuma versão é destruída.
          for (const anterior of versoes) {
            if (anterior.vigente === 1) {
              await db.sessaoVersoes.put({ ...anterior, vigente: 0 })
            }
          }

          // O conjunto de exercícios e de séries é copiado inteiro para a versão
          // nova — mesma quantidade, mesma ordem, mesmos vínculos. Só os três
          // valores corrigíveis mudam (FR-113).
          for (const exercicio of exerciciosVigentes) {
            const copiaDoExercicio = await baseExercicios.criar({
              sessaoVersaoId: novaVersao.id,
              exercicioId: exercicio.exercicioId,
              ordem: exercicio.ordem,
              abordagem: exercicio.abordagem,
              origem: exercicio.origem,
              itemTreinoId: exercicio.itemTreinoId,
              naoRealizado: exercicio.naoRealizado,
            } as never)

            const corrigidas = aplicarCorrecao(
              seriesPorExercicio.get(exercicio.id) ?? [],
              validacao.correcoes,
            )

            for (const serie of corrigidas) {
              await baseSeries.criar({
                exercicioSessaoId: copiaDoExercicio.id,
                ordem: serie.ordem,
                cargaKg: serie.cargaKg,
                repeticoes: serie.repeticoes,
                rir: serie.rir,
                naoRealizada: serie.naoRealizada,
                seriePlanejadaId: serie.seriePlanejadaId,
                degraus: serie.degraus,
              } as never)
            }
          }

          await baseSessoes.atualizar(sessaoId, {
            versaoVigenteId: novaVersao.id,
            corrigida: true,
          } as never)

          return sessaoId
        },
      )

      const completa = await this.obter(resultado)
      if (!completa) throw new RegistroNaoEncontradoError(resultado)
      return completa
    },

    /**
     * FR-133, FR-136 — correção durante a sessão, **sem** criar versão.
     *
     * Ver D2: a sessão em andamento é rascunho, não registro histórico. O
     * versionamento de FR-114 alcança apenas a concluída.
     */
    async corrigirSerieEmAndamento(serieId, correcao) {
      return db.transaction(
        'rw',
        [db.seriesRealizadas, db.exerciciosSessao, db.sessaoVersoes, db.sessoes],
        async () => {
          const { serie } = await exigirSerieDeSessaoAberta(serieId)

          const problemas = validarCorrecaoDeRascunho(correcao)
          if (problemas.length > 0) throw new CorrecaoInvalidaError(problemas)

          const atualizada = await baseSeries.atualizar(serie.id, correcao as never)

          // FR-126 continua valendo: registrar repetições limpa a marcação de
          // não realizado do exercício, e corrigir é registrar.
          if (atualizada.repeticoes !== null && !atualizada.naoRealizada) {
            const exercicio = await db.exerciciosSessao.get(atualizada.exercicioSessaoId)
            if (exercicio?.naoRealizado === true) {
              await baseExercicios.atualizar(exercicio.id, { naoRealizado: false } as never)
            }
          }

          return atualizada
        },
      )
    },

    /**
     * FR-134, FR-135 — remoção durante a sessão.
     *
     * A remoção é lógica, como toda remoção no projeto: a linha permanece na
     * tabela com `excluidoEm` carimbado. As restantes são renumeradas e
     * re-vinculadas à meta da nova posição.
     */
    async removerSerieEmAndamento(serieId) {
      await db.transaction(
        'rw',
        [db.seriesRealizadas, db.exerciciosSessao, db.sessaoVersoes, db.sessoes, db.seriesPlanejadas, db.itensTreino],
        async () => {
          const { serie, exercicio } = await exigirSerieDeSessaoAberta(serieId)

          await baseSeries.excluir(serie.id)

          const restantes = (
            await db.seriesRealizadas.where('exercicioSessaoId').equals(exercicio.id).toArray()
          )
            .filter((candidata) => candidata.excluidoEm === null)
            .sort((a, b) => a.ordem - b.ordem)

          const metas = await metasDoExercicioSessao(exercicio.itemTreinoId)

          for (const renumerada of renumerarAposRemocao(restantes, metas)) {
            const original = restantes.find((candidata) => candidata.id === renumerada.id)
            if (
              original &&
              (original.ordem !== renumerada.ordem ||
                original.seriePlanejadaId !== renumerada.seriePlanejadaId)
            ) {
              await baseSeries.atualizar(renumerada.id, {
                ordem: renumerada.ordem,
                seriePlanejadaId: renumerada.seriePlanejadaId,
              } as never)
            }
          }
        },
      )
    },

    /**
     * Rotina de reconstrução exigida pela ressalva de cache do Princípio V.
     *
     * `sessaoVersoes.vigente` é o **único** cache do modelo, e portanto esta é a
     * única rotina de reconstrução que o projeto precisa ter. Qualquer campo
     * futuro que exija uma segunda é sinal de que ele deveria ser derivação, e
     * não coluna.
     */
    async reconstruirIndiceDeVigencia() {
      return db.transaction('rw', [db.sessoes, db.sessaoVersoes], async () => {
        const sessoes = await db.sessoes.toArray()
        const vigentes = new Set(sessoes.map((sessao) => sessao.versaoVigenteId))
        const versoes = await db.sessaoVersoes.toArray()

        let corrigidas = 0
        for (const versao of versoes) {
          const deveria: 0 | 1 = vigentes.has(versao.id) ? 1 : 0
          if (versao.vigente !== deveria) {
            await db.sessaoVersoes.put({ ...versao, vigente: deveria })
            corrigidas += 1
          }
        }
        return corrigidas
      })
    },
  }
}

export const repositorioSessoes = criarRepositorioSessoes()
