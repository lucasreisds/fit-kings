/**
 * Guarda de contexto seguro — D11, FR-124, SC-034.
 *
 * `crypto.randomUUID()` só existe em contexto seguro. Não há fallback, polyfill
 * nem caminho alternativo: dois caminhos de geração produziriam identificadores
 * de origens distintas entre ambientes e corromperiam sem alarde a identidade
 * estável que o Princípio IV existe para proteger.
 *
 * Por isso a verificação acontece na inicialização, antes de qualquer tela de
 * domínio carregar, e a recusa é explícita — nunca uma degradação silenciosa.
 */

export type DiagnosticoContextoSeguro =
  | { readonly apto: true }
  | { readonly apto: false; readonly motivo: MotivoRecusa; readonly mensagem: string }

export type MotivoRecusa = 'sem_contexto_seguro' | 'sem_crypto' | 'sem_random_uuid'

const MENSAGENS: Record<MotivoRecusa, string> = {
  sem_contexto_seguro:
    'O aplicativo está sendo servido fora de um contexto seguro. Abra-o por HTTPS ou por localhost. ' +
    'Sem contexto seguro não há geração de identificador nem instalação, e o aplicativo não opera por um caminho alternativo.',
  sem_crypto:
    'Este navegador não expõe a Web Crypto API. O aplicativo depende dela para gerar identificadores e não opera sem ela.',
  sem_random_uuid:
    'Este navegador não implementa crypto.randomUUID(). O aplicativo depende dela para gerar identificadores e não opera sem ela.',
}

/**
 * Avalia o ambiente. Função sem efeito — a decisão de recusar é de quem chama.
 */
export function avaliarContextoSeguro(): DiagnosticoContextoSeguro {
  if (typeof globalThis.isSecureContext !== 'undefined' && !globalThis.isSecureContext) {
    return recusa('sem_contexto_seguro')
  }
  const cripto = globalThis.crypto as Crypto | undefined
  if (!cripto) return recusa('sem_crypto')
  if (typeof cripto.randomUUID !== 'function') return recusa('sem_random_uuid')
  return { apto: true }
}

function recusa(motivo: MotivoRecusa): DiagnosticoContextoSeguro {
  return { apto: false, motivo, mensagem: MENSAGENS[motivo] }
}

/** Erro lançado quando o ambiente não pode executar o aplicativo. */
export class ContextoInseguroError extends Error {
  readonly motivo: MotivoRecusa

  constructor(diagnostico: Extract<DiagnosticoContextoSeguro, { apto: false }>) {
    super(diagnostico.mensagem)
    this.name = 'ContextoInseguroError'
    this.motivo = diagnostico.motivo
  }
}

/**
 * Exige contexto seguro. Chamado no bootstrap, antes de qualquer tela de
 * domínio — falhar ruidosamente na inicialização é preferível a falhar em
 * silêncio no primeiro registro.
 */
export function exigirContextoSeguro(): void {
  const diagnostico = avaliarContextoSeguro()
  if (!diagnostico.apto) throw new ContextoInseguroError(diagnostico)
}
