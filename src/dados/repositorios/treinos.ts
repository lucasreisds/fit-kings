/**
 * Repositório de treinos, itens e séries planejadas — FR-001 a FR-011.
 *
 * Um treino é três tabelas. Toda escrita que toca mais de uma roda em
 * transação: um item sem suas séries planejadas é um exercício sem meta, e a
 * tela de execução não tem como distinguir isso de um exercício deliberadamente
 * sem plano.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type {
  Abordagem,
  Id,
  InstanteUtc,
  ItemTreino,
  SeriePlanejada,
  Treino,
} from '../../domain/tipos'
import { criarRepositorio, RegistroNaoEncontradoError } from './base'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'
import {
  mover,
  numerarPorPosicao,
  validarNomeDeTreino,
  type ValoresPlanejados,
} from '../../domain/treino'

/** Um treino com seus itens e séries, na forma que as telas consomem. */
export type TreinoCompleto = {
  readonly treino: Treino
  readonly itens: readonly ItemCompleto[]
}

export type ItemCompleto = {
  readonly item: ItemTreino
  readonly series: readonly SeriePlanejada[]
}

export type EntradaDeItem = {
  readonly exercicioId: Id
  readonly abordagem: Abordagem
  readonly series: readonly ValoresPlanejados[]
  /** Descanso planejado, em segundos (FR-148). Exibido, nunca cronometrado. */
  readonly descansoSegundos?: number | null
}

export class NomeDeTreinoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'NomeDeTreinoInvalidoError'
  }
}

export type RepositorioTreinos = {
  criar(nome: string): Promise<Treino>
  renomear(treinoId: Id, nome: string): Promise<Treino>
  listar(): Promise<Treino[]>
  obter(treinoId: Id): Promise<TreinoCompleto | undefined>
  /** Inclui o treino excluído — o histórico ainda o referencia (FR-040). */
  obterMesmoExcluido(treinoId: Id): Promise<TreinoCompleto | undefined>
  /** O plano do item **como era** num instante. Ver a nota sobre FR-017. */
  seriesPlanejadasEm(itemTreinoId: Id, instante: InstanteUtc): Promise<SeriePlanejada[]>
  adicionarItem(treinoId: Id, entrada: EntradaDeItem): Promise<ItemCompleto>
  removerItem(treinoId: Id, itemId: Id): Promise<void>
  reordenarItens(treinoId: Id, de: number, para: number): Promise<void>
  /**
   * Substitui as séries do item por um conjunto já pronto.
   *
   * Use quando o conjunto não depende do que está gravado. Para uma alteração
   * — mexer num campo, acrescentar, remover — use `transformarSeries`.
   */
  definirSeries(itemTreinoId: Id, series: readonly ValoresPlanejados[]): Promise<SeriePlanejada[]>
  /**
   * Altera as séries do item a partir do que está gravado, dentro da transação.
   *
   * Existe porque o editor escreve a cada tecla e relê por `liveQuery`: entre a
   * escrita e o retorno há uma ida ao IndexedDB, e nessa janela a tela ainda
   * mostra o valor anterior. Mandar o conjunto inteiro montado sobre o que a
   * tela tinha em mãos faz a segunda tecla desfazer a primeira — preencher
   * "6" no mínimo e "8" no máximo em seguida gravava `{ 10, 8 }`, perdendo o 6
   * sem aviso. Num aparelho lento a janela é larga o bastante para acontecer
   * com um polegar comum.
   *
   * `transformar` recebe o que está gravado e devolve o que deve ficar, e a
   * leitura acontece aqui dentro — não há base velha para partir.
   */
  transformarSeries(
    itemTreinoId: Id,
    transformar: (atuais: readonly SeriePlanejada[]) => readonly ValoresPlanejados[],
  ): Promise<SeriePlanejada[]>
  definirAbordagem(itemTreinoId: Id, abordagem: Abordagem): Promise<ItemTreino>
  /** FR-148 — descanso planejado do item. Valor exibido, não temporizador. */
  definirDescanso(itemTreinoId: Id, descansoSegundos: number | null): Promise<ItemTreino>
  excluir(treinoId: Id): Promise<void>
}

export function criarRepositorioTreinos(
  db: BancoFitKings = bancoPadrao,
  relogio: Relogio = relogioDoSistema,
): RepositorioTreinos {
  const baseTreinos = criarRepositorio<Treino>(db.treinos, relogio)
  const baseItens = criarRepositorio<ItemTreino>(db.itensTreino, relogio)
  const baseSeries = criarRepositorio<SeriePlanejada>(db.seriesPlanejadas, relogio)

  async function itensDo(treinoId: Id): Promise<ItemTreino[]> {
    const itens = await db.itensTreino.where('treinoId').equals(treinoId).toArray()
    return itens.filter((item) => item.excluidoEm === null).sort((a, b) => a.ordem - b.ordem)
  }

  async function seriesDe(itemTreinoId: Id): Promise<SeriePlanejada[]> {
    const series = await db.seriesPlanejadas.where('itemTreinoId').equals(itemTreinoId).toArray()
    return series.filter((serie) => serie.excluidoEm === null).sort((a, b) => a.ordem - b.ordem)
  }

  async function transformarSeries(
    itemTreinoId: Id,
    transformar: (atuais: readonly SeriePlanejada[]) => readonly ValoresPlanejados[],
  ): Promise<SeriePlanejada[]> {
    return db.transaction('rw', [db.seriesPlanejadas, db.exerciciosSessao], async () => {
      const jaExecutado = await foiExecutado(itemTreinoId)
      const atuais = await seriesDe(itemTreinoId)

      // A base da alteração é o que está gravado **agora**, lido dentro da
      // transação — não o que a tela tem em mãos. Ver a interface.
      const series = transformar(atuais)

      for (let indice = 0; indice < series.length; indice += 1) {
        const valores = series[indice]!
        const atual = atuais[indice]
        const alteracao = {
          ordem: indice + 1,
          repeticoes: valores.repeticoes,
          repeticoesMax: valores.repeticoesMax ?? null,
          cargaKg: valores.cargaKg,
          rir: valores.rir,
        }

        if (!atual) {
          await baseSeries.criar({ itemTreinoId, ...alteracao } as never)
          continue
        }

        const mudou =
          atual.repeticoes !== valores.repeticoes ||
          atual.repeticoesMax !== (valores.repeticoesMax ?? null) ||
          atual.cargaKg !== valores.cargaKg ||
          atual.rir !== valores.rir ||
          atual.ordem !== indice + 1

        if (!mudou) continue

        if (jaExecutado) {
          await baseSeries.excluir(atual.id)
          await baseSeries.criar({ itemTreinoId, ...alteracao } as never)
        } else {
          await baseSeries.atualizar(atual.id, alteracao as never)
        }
      }

      for (const excedente of atuais.slice(series.length)) {
        await baseSeries.excluir(excedente.id)
      }

      return seriesDe(itemTreinoId)
    })
  }

  /** O item já foi levado para alguma sessão — em andamento ou concluída? */
  async function foiExecutado(itemTreinoId: Id): Promise<boolean> {
    const registro = await db.exerciciosSessao.where('itemTreinoId').equals(itemTreinoId).first()
    return registro !== undefined
  }

  async function montar(treino: Treino): Promise<TreinoCompleto> {
    const itens = await itensDo(treino.id)
    const completos = await Promise.all(
      itens.map(async (item) => ({ item, series: await seriesDe(item.id) })),
    )
    return { treino, itens: completos }
  }

  function exigirNome(bruto: string): string {
    const resultado = validarNomeDeTreino(bruto)
    if (!resultado.valido) {
      throw new NomeDeTreinoInvalidoError(resultado.problemas[0]?.mensagem ?? 'Nome inválido.')
    }
    return resultado.valor
  }

  return {
    async criar(nome) {
      return baseTreinos.criar({ nome: exigirNome(nome) } as never)
    },

    async renomear(treinoId, nome) {
      return baseTreinos.atualizar(treinoId, { nome: exigirNome(nome) } as never)
    },

    async listar() {
      const ativos = await baseTreinos.listarAtivos()
      return ativos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    async obter(treinoId) {
      const treino = await db.treinos.get(treinoId)
      if (!treino || treino.excluidoEm !== null) return undefined
      return montar(treino)
    },

    async obterMesmoExcluido(treinoId) {
      const treino = await db.treinos.get(treinoId)
      return treino ? montar(treino) : undefined
    },

    /**
     * O plano do item como ele era em `instante` — a cópia que FR-017 exige,
     * reconstruída em vez de duplicada.
     *
     * Funciona porque a tabela é aditiva e a exclusão é lógica (Princípio IV):
     * nenhuma linha some, e cada uma carrega quando nasceu e quando saiu. A
     * série planejada vigente num instante é a que já existia e ainda não tinha
     * saído. Uma sessão iniciada ontem enxerga o plano de ontem mesmo que o
     * treino tenha sido editado hoje — que é exatamente o portão de teste 2.
     */
    async seriesPlanejadasEm(itemTreinoId, instante) {
      const limite = Date.parse(instante)
      const todas = await db.seriesPlanejadas.where('itemTreinoId').equals(itemTreinoId).toArray()

      return todas
        .filter((serie) => {
          if (Date.parse(serie.criadoEm) > limite) return false
          return serie.excluidoEm === null || Date.parse(serie.excluidoEm) > limite
        })
        .sort((a, b) => a.ordem - b.ordem)
    },

    async adicionarItem(treinoId, entrada) {
      return db.transaction('rw', db.itensTreino, db.seriesPlanejadas, async () => {
        const existentes = await itensDo(treinoId)
        const item = await baseItens.criar({
          treinoId,
          exercicioId: entrada.exercicioId,
          abordagem: entrada.abordagem,
          ordem: existentes.length + 1,
          descansoSegundos: entrada.descansoSegundos ?? null,
        } as never)

        const series = await baseSeries.criarVarios(
          entrada.series.map((valores, indice) => ({
            itemTreinoId: item.id,
            ordem: indice + 1,
            repeticoes: valores.repeticoes,
            repeticoesMax: valores.repeticoesMax ?? null,
            cargaKg: valores.cargaKg,
            rir: valores.rir,
          })) as never,
        )

        return { item, series }
      })
    },

    async removerItem(treinoId, itemId) {
      await db.transaction('rw', db.itensTreino, db.seriesPlanejadas, async () => {
        const series = await seriesDe(itemId)
        for (const serie of series) await baseSeries.excluir(serie.id)
        await baseItens.excluir(itemId)

        // Renumera o que sobrou: FR-007 exige ordem contígua, e um buraco aqui
        // viraria exercício pulado na execução.
        const restantes = await itensDo(treinoId)
        for (const renumerado of numerarPorPosicao(restantes)) {
          const original = restantes.find((item) => item.id === renumerado.id)
          if (original && original.ordem !== renumerado.ordem) {
            await baseItens.atualizar(renumerado.id, { ordem: renumerado.ordem } as never)
          }
        }
      })
    },

    async reordenarItens(treinoId, de, para) {
      await db.transaction('rw', db.itensTreino, async () => {
        const itens = await itensDo(treinoId)
        for (const movido of mover(itens, de, para)) {
          const original = itens.find((item) => item.id === movido.id)
          if (original && original.ordem !== movido.ordem) {
            await baseItens.atualizar(movido.id, { ordem: movido.ordem } as never)
          }
        }
      })
    },

    /**
     * Substitui o conjunto de séries planejadas do item.
     *
     * **Cópia na escrita, e é o que sustenta FR-017.** Uma série planejada que
     * já foi executada é imutável: alterar seus valores mudaria, à distância, a
     * meta que uma sessão registrada exibe como comparação — e o Princípio I
     * proíbe que edição do treino alcance sessão iniciada ou concluída. Editá-la
     * exclui logicamente a linha antiga e cria uma sucessora; a sessão continua
     * apontando para a antiga, com os valores daquele dia.
     *
     * Enquanto o item nunca foi executado, não há a quem mentir, e a linha é
     * alterada no lugar — evitando uma geração de registros a cada tecla.
     *
     * As que saem também são apenas marcadas, nunca removidas fisicamente.
     */
    async definirSeries(itemTreinoId, series) {
      return transformarSeries(itemTreinoId, () => series)
    },

    transformarSeries,

    async definirAbordagem(itemTreinoId, abordagem) {
      return baseItens.atualizar(itemTreinoId, { abordagem } as never)
    },

    async definirDescanso(itemTreinoId, descansoSegundos) {
      return baseItens.atualizar(itemTreinoId, { descansoSegundos } as never)
    },

    async excluir(treinoId) {
      const treino = await db.treinos.get(treinoId)
      if (!treino) throw new RegistroNaoEncontradoError(treinoId)

      // Exclusão lógica em cascata. As sessões concluídas não são tocadas: elas
      // carregam sua própria cópia do plano e sobrevivem à exclusão do treino
      // que as originou (FR-040, Princípio I).
      await db.transaction('rw', db.treinos, db.itensTreino, db.seriesPlanejadas, async () => {
        for (const item of await itensDo(treinoId)) {
          for (const serie of await seriesDe(item.id)) await baseSeries.excluir(serie.id)
          await baseItens.excluir(item.id)
        }
        await baseTreinos.excluir(treinoId)
      })
    },
  }
}

export const repositorioTreinos = criarRepositorioTreinos()
