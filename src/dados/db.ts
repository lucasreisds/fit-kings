/**
 * Banco local — IndexedDB via Dexie. Esquema normativo em data-model.md.
 *
 * Este é o limite da camada de dados: `src/domain/` não importa este arquivo, e
 * a regra de lint T005 impede que o faça.
 */
import Dexie, { type EntityTable } from 'dexie'
import { aplicarMigracoes } from './migracoes'
import type {
  Exercicio,
  ExercicioSessao,
  ItemTreino,
  MetaAplicacao,
  SeriePlanejada,
  SerieRealizada,
  Sessao,
  SessaoVersao,
  Treino,
} from '../domain/tipos'

export type BancoFitKings = Dexie & {
  exercicios: EntityTable<Exercicio, 'id'>
  treinos: EntityTable<Treino, 'id'>
  itensTreino: EntityTable<ItemTreino, 'id'>
  seriesPlanejadas: EntityTable<SeriePlanejada, 'id'>
  sessoes: EntityTable<Sessao, 'id'>
  sessaoVersoes: EntityTable<SessaoVersao, 'id'>
  exerciciosSessao: EntityTable<ExercicioSessao, 'id'>
  seriesRealizadas: EntityTable<SerieRealizada, 'id'>
  metaAplicacao: EntityTable<MetaAplicacao, 'id'>
}

export const NOME_BANCO = 'fit-kings'

/** Toda tabela de domínio. `metaAplicacao` fica de fora: não é dado de domínio. */
export const TABELAS_DE_DOMINIO = [
  'exercicios',
  'treinos',
  'itensTreino',
  'seriesPlanejadas',
  'sessoes',
  'sessaoVersoes',
  'exerciciosSessao',
  'seriesRealizadas',
] as const

export function criarBanco(nome: string = NOME_BANCO): BancoFitKings {
  const db = new Dexie(nome) as BancoFitKings
  aplicarMigracoes(db)
  return db
}

export const db = criarBanco()
