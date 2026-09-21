/**
 * Exportação e importação — FR-095 a FR-108.
 *
 * A importação inteira roda em **uma transação**. Nada é gravado se qualquer
 * etapa falhar, e a validação (FR-106) já aconteceu antes de esta camada ser
 * chamada. As duas garantias juntas são o que o contrato quer dizer com
 * "falha aborta tudo, sem alterar nenhum dado existente".
 *
 * Nenhuma regra mora aqui: a decisão do que inserir, atualizar ou ignorar é de
 * `src/domain/backup/mesclar.ts`, que é função pura. Esta camada executa o
 * plano.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type {
  Exercicio,
  ExercicioSessao,
  Id,
  ItemTreino,
  SeriePlanejada,
  SerieRealizada,
  Sessao,
  SessaoVersao,
  Treino,
} from '../../domain/tipos'
import type { EntityTable } from 'dexie'
import {
  planejarImportacao,
  type AcaoSobreEditavel,
  type EstadoLocal,
  type PlanoDeImportacao,
  type ResumoDaImportacao,
  type SessaoParaAplicar,
} from '../../domain/backup/mesclar'
import { montarArquivo, serializar } from '../../domain/backup/montar'
import type { ArquivoDeBackup } from '../../domain/backup/tipos'
import { novoId } from '../../plataforma/id'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'
import { VERSAO_DA_APLICACAO } from '../../plataforma/versao'

export type RepositorioBackup = {
  montar(): Promise<ArquivoDeBackup>
  exportarTexto(): Promise<string>
  planejar(arquivo: ArquivoDeBackup): Promise<PlanoDeImportacao>
  aplicar(plano: PlanoDeImportacao): Promise<ResumoDaImportacao>
}

export function criarRepositorioBackup(
  db: BancoFitKings = bancoPadrao,
  relogio: Relogio = relogioDoSistema,
): RepositorioBackup {
  async function lerEstadoLocal(): Promise<EstadoLocal> {
    const [exercicios, treinos, itensTreino, seriesPlanejadas, sessoes] = await Promise.all([
      db.exercicios.toArray(),
      db.treinos.toArray(),
      db.itensTreino.toArray(),
      db.seriesPlanejadas.toArray(),
      db.sessoes.toArray(),
    ])
    return {
      exercicios,
      treinos,
      itensTreino,
      seriesPlanejadas,
      sessoes: sessoes.map((sessao) => ({ id: sessao.id, alteradoEm: sessao.alteradoEm })),
    }
  }

  return {
    async montar() {
      // `toArray()` sem filtro é deliberado: o arquivo carrega também os
      // registros com `excluidoEm` preenchido, com sua marca (FR-098). Filtrar
      // aqui faria a importação ressuscitar o que o usuário apagou.
      const [exercicios, treinos, itensTreino, seriesPlanejadas, sessoes] = await Promise.all([
        db.exercicios.toArray(),
        db.treinos.toArray(),
        db.itensTreino.toArray(),
        db.seriesPlanejadas.toArray(),
        db.sessoes.toArray(),
      ])

      const concluidas = sessoes.filter((sessao) => sessao.estado === 'concluida')

      // Só a versão vigente de cada sessão atravessa (contrato § achatamento).
      const versaoPorSessao = new Map(
        concluidas.map((sessao) => [sessao.versaoVigenteId, sessao.id]),
      )

      const todosExerciciosSessao = await db.exerciciosSessao.toArray()
      const exerciciosSessao = todosExerciciosSessao
        .filter((exercicio) => versaoPorSessao.has(exercicio.sessaoVersaoId))
        .map((exercicio) => ({
          ...exercicio,
          sessaoId: versaoPorSessao.get(exercicio.sessaoVersaoId)!,
        }))

      const idsDeExercicioSessao = new Set(exerciciosSessao.map((e) => e.id))
      const todasSeries = await db.seriesRealizadas.toArray()
      const seriesRealizadas = todasSeries.filter((serie) =>
        idsDeExercicioSessao.has(serie.exercicioSessaoId),
      )

      return montarArquivo(
        {
          exercicios,
          treinos,
          itensTreino,
          seriesPlanejadas,
          sessoes: concluidas,
          exerciciosSessao,
          seriesRealizadas,
        },
        {
          geradoEm: relogio.agora(),
          deslocamentoLocal: relogio.deslocamentoLocal(),
          versaoDaAplicacao: VERSAO_DA_APLICACAO,
        },
      )
    },

    async exportarTexto() {
      return serializar(await this.montar())
    },

    async planejar(arquivo) {
      return planejarImportacao(arquivo, await lerEstadoLocal())
    },

    async aplicar(plano) {
      return db.transaction(
        'rw',
        [
          db.exercicios,
          db.treinos,
          db.itensTreino,
          db.seriesPlanejadas,
          db.sessoes,
          db.sessaoVersoes,
          db.exerciciosSessao,
          db.seriesRealizadas,
        ],
        async () => {
          await aplicarEditaveis(db.exercicios, plano.exercicios)
          await aplicarEditaveis(db.treinos, plano.treinos)
          await aplicarEditaveis(db.itensTreino, plano.itensTreino)
          await aplicarEditaveis(db.seriesPlanejadas, plano.seriesPlanejadas)

          for (const sessao of plano.sessoes) {
            await aplicarSessao(db, sessao, relogio)
          }

          return plano.resumo
        },
      )
    },
  }
}

async function aplicarEditaveis<T extends Exercicio | Treino | ItemTreino | SeriePlanejada>(
  tabela: EntityTable<T, 'id'>,
  acoes: readonly AcaoSobreEditavel<T>[],
): Promise<void> {
  const escrever = acoes.flatMap((acao) => (acao.tipo === 'ignorar' ? [] : [acao.registro]))

  // Os carimbos do arquivo são preservados como estão. Reescrever `alteradoEm`
  // aqui apagaria a informação que decide a próxima importação.
  if (escrever.length > 0) await (tabela as EntityTable<T, 'id'>).bulkPut(escrever as never)
}

/**
 * Aplica uma sessão do arquivo.
 *
 * Inserir cria a versão 1. Uma sessão que já existe **ganha uma versão nova**, e
 * a anterior permanece intacta: o Princípio I proíbe destruir qualquer versão de
 * sessão concluída, e a proibição alcança a importação. O que muda no cabeçalho
 * é apenas o ponteiro `versaoVigenteId`, que é justamente a autoridade sobre
 * qual versão vale.
 */
async function aplicarSessao(
  db: BancoFitKings,
  aplicacao: SessaoParaAplicar,
  relogio: Relogio,
): Promise<void> {
  const { sessao, exercicios, series } = aplicacao

  const anteriores = await db.sessaoVersoes.where('sessaoId').equals(sessao.id).toArray()
  const proximoNumero = anteriores.reduce((maior, v) => Math.max(maior, v.numero), 0) + 1

  const versao: SessaoVersao = {
    id: novoId(),
    sessaoId: sessao.id,
    numero: proximoNumero,
    motivo: aplicacao.tipo === 'inserir' ? 'inicial' : 'correcao',
    vigente: 1,
    criadoEm: sessao.criadoEm,
    alteradoEm: sessao.alteradoEm,
    deslocamentoLocal: sessao.deslocamentoLocal,
    excluidoEm: null,
  }

  // `vigente` é índice reconstruível, não autoridade — mas precisa ficar
  // coerente na mesma transação que cria a versão (data-model.md).
  for (const anterior of anteriores) {
    if (anterior.vigente === 1) {
      await db.sessaoVersoes.put({ ...anterior, vigente: 0 })
    }
  }
  await db.sessaoVersoes.put(versao)

  const cabecalho: Sessao = { ...sessao, versaoVigenteId: versao.id }
  await db.sessoes.put(cabecalho)

  const idsNovos = new Map<Id, Id>()

  const exerciciosLocais: ExercicioSessao[] = exercicios.map((exercicio) => {
    const { sessaoId: _sessaoId, ...resto } = exercicio
    // O identificador do exercício-da-sessão é regenerado porque ele passa a
    // pertencer a uma versão nova. O `exercicioId`, esse nunca — é a chave que
    // mantém o histórico comparável (FR-105).
    const id = aplicacao.tipo === 'inserir' ? exercicio.id : novoId()
    idsNovos.set(exercicio.id, id)
    return { ...resto, id, sessaoVersaoId: versao.id }
  })

  const seriesLocais: SerieRealizada[] = series.map((serie) => ({
    ...serie,
    id: aplicacao.tipo === 'inserir' ? serie.id : novoId(),
    exercicioSessaoId: idsNovos.get(serie.exercicioSessaoId) ?? serie.exercicioSessaoId,
  }))

  if (exerciciosLocais.length > 0) await db.exerciciosSessao.bulkPut(exerciciosLocais)
  if (seriesLocais.length > 0) await db.seriesRealizadas.bulkPut(seriesLocais)

  void relogio
}
