/**
 * Persistência do armazenamento — FR-120, FR-121, risco R1.
 *
 * IndexedDB pode ser limpo pelo sistema operacional sob pressão de disco. O
 * aplicativo verifica e solicita a persistência, e **recusa-se a operar como se
 * o armazenamento fosse confiável sem confirmação**: sem ela, opera em estado
 * degradado declarado (FR-122) e reduz de 7 para 2 dias o intervalo do lembrete
 * de backup.
 *
 * Solicitar não é garantir. Nenhum navegador promete conceder, e no iOS o
 * armazenamento some junto com o ícone da Tela de Início. Por isso o backup em
 * arquivo (US7) é rede de proteção, não conveniência.
 */

export type EstadoPersistencia = {
  /** `null` = a plataforma não expõe a API, logo não há o que afirmar. */
  readonly concedida: boolean | null
  readonly suportada: boolean
}

export type EstimativaArmazenamento = {
  readonly usadoBytes: number | null
  readonly disponivelBytes: number | null
}

function apiStorage(): StorageManager | null {
  const nav = globalThis.navigator as Navigator | undefined
  return nav?.storage ?? null
}

/** Consulta sem solicitar. `navigator.storage.persisted()`. */
export async function consultarPersistencia(): Promise<EstadoPersistencia> {
  const storage = apiStorage()
  if (!storage || typeof storage.persisted !== 'function') {
    return { concedida: null, suportada: false }
  }
  try {
    return { concedida: await storage.persisted(), suportada: true }
  } catch {
    return { concedida: null, suportada: true }
  }
}

/**
 * Solicita a persistência. Idempotente: se já concedida, não pergunta de novo.
 * Alguns navegadores concedem em silêncio conforme o engajamento; outros
 * mostram diálogo; o iOS costuma recusar. Nenhum desses casos é erro.
 */
export async function solicitarPersistencia(): Promise<EstadoPersistencia> {
  const storage = apiStorage()
  if (!storage || typeof storage.persist !== 'function') {
    return { concedida: null, suportada: false }
  }

  const atual = await consultarPersistencia()
  if (atual.concedida === true) return atual

  try {
    return { concedida: await storage.persist(), suportada: true }
  } catch {
    return { concedida: null, suportada: true }
  }
}

/** Espaço usado e disponível, para a tela de diagnóstico (FR-123). */
export async function estimarArmazenamento(): Promise<EstimativaArmazenamento> {
  const storage = apiStorage()
  if (!storage || typeof storage.estimate !== 'function') {
    return { usadoBytes: null, disponivelBytes: null }
  }
  try {
    const estimativa = await storage.estimate()
    const usado = estimativa.usage ?? null
    const cota = estimativa.quota ?? null
    return {
      usadoBytes: usado,
      disponivelBytes: cota !== null && usado !== null ? cota - usado : cota,
    }
  } catch {
    return { usadoBytes: null, disponivelBytes: null }
  }
}

export function formatarBytes(bytes: number | null): string {
  if (bytes === null) return 'indisponível'
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let indice = 0
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice += 1
  }
  const casas = valor < 10 && indice > 0 ? 1 : 0
  return `${valor.toFixed(casas)} ${unidades[indice]}`
}
