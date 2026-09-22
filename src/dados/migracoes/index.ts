/**
 * Política de migração aditiva — Princípio IV, data-model.md § Evolução de esquema.
 *
 * As regras, em ordem de importância:
 *
 * 1. Nova migração **nunca** remove coluna nem altera o significado de coluna
 *    existente. Campo descontinuado é marcado como tal e deixa de ser escrito.
 * 2. Novo campo entra com valor padrão, aplicado sobre os registros existentes
 *    sem reescrever o que já estava lá.
 * 3. Nova abordagem de série é valor novo no campo `abordagem`, sem alteração
 *    estrutural nenhuma (FR-014, SC-014) — não exige migração.
 * 4. Toda migração precisa continuar lendo arquivos de backup de
 *    `formatVersion` anteriores (contrato § Política de compatibilidade).
 *
 * Dexie expressa isso por `version(n).stores({...}).upgrade(tx => ...)`. Uma
 * entrada nova em `stores` acrescenta tabela ou índice; uma entrada com valor
 * `null` **apagaria** a tabela, e por isso é proibida aqui.
 */
import type Dexie from 'dexie'
import type { Transaction } from 'dexie'

export type Migracao = {
  readonly versao: number
  /** Esquema **completo** desta versão, no formato de `Dexie#stores`. */
  readonly stores: Record<string, string>
  /** Preenchimento de campo novo sobre registros existentes. Nunca destrutivo. */
  readonly preencher?: (tx: Transaction) => Promise<void>
  readonly nota: string
}

/**
 * Esquema da versão 1 — as 9 tabelas e todos os índices de data-model.md.
 *
 * Dois índices compostos carregam requisito de desempenho e não são decoração:
 * `sessoes.[estado+concluidaEm]` sustenta a listagem de 200 sessões em menos de
 * 2 s, e `exerciciosSessao.[exercicioId+sessaoVersaoId]` sustenta o histórico de
 * um exercício em menos de 1 s (SC-010).
 */
export const ESQUEMA_V1: Record<string, string> = {
  exercicios: 'id, nome, origem, ocultoEm, excluidoEm, [origem+ocultoEm]',
  treinos: 'id, nome, excluidoEm',
  itensTreino: 'id, treinoId, exercicioId, excluidoEm, [treinoId+ordem]',
  seriesPlanejadas: 'id, itemTreinoId, excluidoEm, [itemTreinoId+ordem]',
  sessoes: 'id, estado, concluidaEm, treinoId, excluidoEm, [estado+concluidaEm]',
  sessaoVersoes: 'id, sessaoId, excluidoEm, [sessaoId+numero], [sessaoId+vigente]',
  exerciciosSessao:
    'id, sessaoVersaoId, exercicioId, itemTreinoId, excluidoEm, [exercicioId+sessaoVersaoId], [sessaoVersaoId+ordem]',
  seriesRealizadas: 'id, exercicioSessaoId, seriePlanejadaId, excluidoEm, [exercicioSessaoId+ordem]',
  metaAplicacao: 'id',
}

/**
 * Versão 2 — feature 002.
 *
 * Dois campos opcionais: `repeticoesMax` em `seriesPlanejadas` e
 * `descansoSegundos` em `itensTreino`. Nenhum é indexado, então `stores` não
 * muda: Dexie só declara índices, e campo não indexado entra sem migração
 * estrutural. A entrada existe mesmo assim para que a versão do esquema
 * registre a mudança, e para que `preencher` deixe explícito o valor inicial.
 *
 * `null` **é** o valor correto para o que já existe: uma série planejada antiga
 * de fato tem ponta única, e um item antigo de fato não tem descanso planejado.
 * Não há retroação a fazer, e inventar um padrão diferente de `null` seria
 * escrever um dado que o usuário nunca informou.
 */
export const ESQUEMA_V2: Record<string, string> = { ...ESQUEMA_V1 }

export const MIGRACOES: readonly Migracao[] = [
  {
    versao: 1,
    stores: ESQUEMA_V1,
    nota: 'Esquema inicial: 9 tabelas de data-model.md.',
  },
  {
    versao: 2,
    stores: ESQUEMA_V2,
    nota: 'Feature 002: repeticoesMax em seriesPlanejadas, descansoSegundos em itensTreino.',
    async preencher(tx) {
      await tx
        .table('seriesPlanejadas')
        .toCollection()
        .modify((registro: Record<string, unknown>) => {
          registro.repeticoesMax = registro.repeticoesMax ?? null
        })
      await tx
        .table('itensTreino')
        .toCollection()
        .modify((registro: Record<string, unknown>) => {
          registro.descansoSegundos = registro.descansoSegundos ?? null
        })
    },
  },
]

/** Versão de esquema corrente. */
export const VERSAO_ESQUEMA = MIGRACOES[MIGRACOES.length - 1]!.versao

/**
 * Aplica as migrações a uma instância Dexie, em ordem.
 *
 * A verificação de aditividade roda aqui e não num teste isolado de propósito:
 * uma migração destrutiva precisa falhar no momento em que o banco abre, não
 * depois de já ter apagado dados do usuário.
 */
export function aplicarMigracoes(db: Dexie, migracoes: readonly Migracao[] = MIGRACOES): void {
  let anterior: Record<string, string> | null = null

  for (const migracao of migracoes) {
    verificarAditividade(anterior, migracao)
    const versao = db.version(migracao.versao).stores(migracao.stores)
    if (migracao.preencher) versao.upgrade(migracao.preencher)
    anterior = migracao.stores
  }
}

export class MigracaoDestrutivaError extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'MigracaoDestrutivaError'
  }
}

/**
 * Recusa uma migração que remova tabela ou índice. Índice removido é significado
 * de coluna alterado por outro nome, e a regra 1 não admite nenhum dos dois.
 */
export function verificarAditividade(
  anterior: Record<string, string> | null,
  migracao: Migracao,
): void {
  if (anterior === null) return

  for (const [tabela, definicaoAnterior] of Object.entries(anterior)) {
    const definicaoNova = migracao.stores[tabela]

    if (definicaoNova === undefined || definicaoNova === null) {
      throw new MigracaoDestrutivaError(
        `Migração v${migracao.versao} remove a tabela "${tabela}". A evolução do esquema é aditiva (Princípio IV).`,
      )
    }

    const indicesAnteriores = separarIndices(definicaoAnterior)
    const indicesNovos = new Set(separarIndices(definicaoNova))
    const perdidos = indicesAnteriores.filter((indice) => !indicesNovos.has(indice))

    if (perdidos.length > 0) {
      throw new MigracaoDestrutivaError(
        `Migração v${migracao.versao} remove os índices [${perdidos.join(', ')}] de "${tabela}". A evolução do esquema é aditiva (Princípio IV).`,
      )
    }
  }
}

function separarIndices(definicao: string): string[] {
  return definicao
    .split(',')
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0)
}
