/**
 * Repositório base — Princípio IV.
 *
 * Duas garantias que nenhum chamador precisa lembrar de aplicar:
 *
 * - **Exclusão é lógica.** `excluir()` carimba `excluidoEm`. Remoção física de
 *   registro do usuário é proibida, e por isso não existe método que a faça.
 * - **`alteradoEm` é carimbado a cada escrita**, porque é a base da precedência
 *   de FR-103 e FR-102 — um registro que esqueça de atualizá-lo perde a
 *   comparação numa importação e desaparece do aparelho do usuário.
 */
import type { EntityTable } from 'dexie'
import type { Alteracao, Entidade, Id, Novo } from '../../domain/tipos'
import { novoId } from '../../plataforma/id'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'

export type RepositorioBase<T extends Entidade> = {
  criar(dados: Novo<T>): Promise<T>
  criarVarios(dados: readonly Novo<T>[]): Promise<T[]>
  obter(id: Id): Promise<T | undefined>
  /** Apenas ativos. Leitura de uso corrente filtra `excluidoEm === null`. */
  listarAtivos(): Promise<T[]>
  /** Inclui excluídos. Usado pela exportação, que precisa deles (FR-098). */
  listarTodos(): Promise<T[]>
  atualizar(id: Id, alteracao: Alteracao<T>): Promise<T>
  excluir(id: Id): Promise<void>
  /** Insere um registro já carimbado, sem tocar nos campos comuns (importação). */
  inserirComoEsta(registro: T): Promise<void>
}

export function criarRepositorio<T extends Entidade>(
  tabela: EntityTable<T, 'id'>,
  relogio: Relogio = relogioDoSistema,
): RepositorioBase<T> {
  // `EntityTable<T, 'id'>` resolve a chave a partir de `T['id']`, que o
  // TypeScript não consegue estreitar para `string` enquanto `T` é genérico.
  // A restrição `T extends Entidade` já garante que é string.
  const porId = tabela as unknown as {
    get(id: Id): Promise<T | undefined>
  }

  function carimbarNovo(dados: Novo<T>): T {
    const agora = relogio.agora()
    return {
      ...(dados as object),
      id: dados.id ?? novoId(),
      criadoEm: agora,
      alteradoEm: agora,
      deslocamentoLocal: relogio.deslocamentoLocal(),
      excluidoEm: null,
    } as T
  }

  return {
    async criar(dados) {
      const registro = carimbarNovo(dados)
      await tabela.add(registro)
      return registro
    },

    async criarVarios(dados) {
      const registros = dados.map(carimbarNovo)
      if (registros.length > 0) await tabela.bulkAdd(registros)
      return registros
    },

    async obter(id) {
      return porId.get(id)
    },

    async listarAtivos() {
      return tabela.filter((registro) => registro.excluidoEm === null).toArray()
    },

    async listarTodos() {
      return tabela.toArray()
    },

    async atualizar(id, alteracao) {
      const atual = await porId.get(id)
      if (!atual) throw new RegistroNaoEncontradoError(id)

      // `id`, `criadoEm` e `excluidoEm` não são alteráveis por esta via:
      // identificador é imutável (Princípio IV) e exclusão tem método próprio.
      const { id: _id, criadoEm: _criadoEm, excluidoEm: _excluidoEm, ...alteravel } =
        alteracao as Record<string, unknown>

      const atualizado = {
        ...atual,
        ...alteravel,
        alteradoEm: relogio.agora(),
      } as T

      await tabela.put(atualizado)
      return atualizado
    },

    async excluir(id) {
      const atual = await porId.get(id)
      if (!atual) throw new RegistroNaoEncontradoError(id)
      if (atual.excluidoEm !== null) return // já excluído: operação nula

      const agora = relogio.agora()
      await tabela.put({ ...atual, excluidoEm: agora, alteradoEm: agora } as T)
    },

    async inserirComoEsta(registro) {
      await tabela.put(registro)
    },
  }
}

export class RegistroNaoEncontradoError extends Error {
  readonly id: Id

  constructor(id: Id) {
    super(`Registro ${id} não encontrado.`)
    this.name = 'RegistroNaoEncontradoError'
    this.id = id
  }
}
