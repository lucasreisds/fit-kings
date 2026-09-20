/**
 * Banco isolado por teste. `fake-indexeddb` é carregado em tests/setup.ts.
 *
 * Cada suíte abre um banco com nome próprio para que uma não enxergue o estado
 * da outra — importa especialmente nos testes de migração, que precisam
 * controlar a versão do esquema.
 */
import { criarBanco, type BancoFitKings } from '../../src/dados/db'
import { novoId } from '../../src/plataforma/id'

export function bancoDeTeste(): BancoFitKings {
  return criarBanco(`fit-kings-teste-${novoId()}`)
}

export async function descartar(db: BancoFitKings): Promise<void> {
  db.close()
  await db.delete()
}
