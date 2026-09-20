/**
 * Estado da instalação — FR-109, FR-120, FR-121.
 *
 * Registro único. **Não é dado de domínio** e não entra no arquivo de backup
 * (contrato § O que o arquivo contém): ele descreve esta instalação, não o
 * histórico do usuário.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import { ID_META_APLICACAO, type MetaAplicacao } from '../../domain/tipos'
import { relogioDoSistema, type Relogio } from '../../plataforma/tempo'

const PADRAO: MetaAplicacao = {
  id: ID_META_APLICACAO,
  ultimoBackupEm: null,
  persistenciaConcedida: null,
  persistenciaVerificadaEm: null,
}

export type RepositorioMetaAplicacao = {
  obter(): Promise<MetaAplicacao>
  registrarVerificacaoDePersistencia(concedida: boolean | null): Promise<MetaAplicacao>
  /** FR-110: chamado **somente** após uma exportação concluir com sucesso. */
  registrarBackupBemSucedido(): Promise<MetaAplicacao>
}

export function criarRepositorioMetaAplicacao(
  db: BancoFitKings = bancoPadrao,
  relogio: Relogio = relogioDoSistema,
): RepositorioMetaAplicacao {
  async function gravar(alteracao: Partial<MetaAplicacao>): Promise<MetaAplicacao> {
    const atual = (await db.metaAplicacao.get(ID_META_APLICACAO)) ?? PADRAO
    const proximo: MetaAplicacao = { ...atual, ...alteracao, id: ID_META_APLICACAO }
    await db.metaAplicacao.put(proximo)
    return proximo
  }

  return {
    async obter() {
      return (await db.metaAplicacao.get(ID_META_APLICACAO)) ?? PADRAO
    },

    async registrarVerificacaoDePersistencia(concedida) {
      return gravar({
        persistenciaConcedida: concedida,
        persistenciaVerificadaEm: relogio.agora(),
      })
    },

    // Não existe `registrarInicioDeBackup`, e a ausência é deliberada: mover a
    // âncora ao iniciar faria uma exportação que falhou silenciar o lembrete
    // por sete dias, exatamente quando o usuário mais precisa dele (FR-110).
    async registrarBackupBemSucedido() {
      return gravar({ ultimoBackupEm: relogio.agora() })
    },
  }
}

export const repositorioMetaAplicacao = criarRepositorioMetaAplicacao()
