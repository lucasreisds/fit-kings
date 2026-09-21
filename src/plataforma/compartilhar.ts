/**
 * Entrega do arquivo ao sistema operacional — FR-099, D6.
 *
 * Caminho preferido: a folha de compartilhamento nativa (`navigator.share` com
 * `files`), que deixa o usuário escolher onde guardar — inclusive o iCloud
 * Drive. Onde ela não existe, o caminho alternativo é `Blob` + download.
 *
 * **Salvar no iCloud Drive não é sincronização.** O aplicativo entrega o
 * arquivo e perde contato com ele: não lê de volta, não observa alterações, não
 * mantém estado remoto e não exige conta. O destino é indiferente. O Princípio
 * III permanece intacto, e esta nota existe para que nenhuma revisão futura leia
 * "iCloud" como backup em nuvem no sentido proibido pelo escopo.
 */

export type ResultadoDaEntrega =
  | { readonly estado: 'entregue'; readonly via: 'compartilhamento' | 'download' }
  | { readonly estado: 'cancelado' }
  | { readonly estado: 'falhou'; readonly mensagem: string }

const TIPO = 'application/json'

export async function entregarArquivo(
  nome: string,
  conteudo: string,
): Promise<ResultadoDaEntrega> {
  const arquivo = new File([conteudo], nome, { type: TIPO })

  if (podeCompartilharArquivo(arquivo)) {
    try {
      await navigator.share({ files: [arquivo], title: nome })
      return { estado: 'entregue', via: 'compartilhamento' }
    } catch (erro) {
      // `AbortError` é o usuário fechando a folha. Não é falha, e tratá-la como
      // tal faria o aplicativo anunciar um erro que não houve — e, pior, poderia
      // levar a marcar como concluída uma exportação que não aconteceu.
      if (erro instanceof DOMException && erro.name === 'AbortError') {
        return { estado: 'cancelado' }
      }
      return baixar(nome, conteudo)
    }
  }

  return baixar(nome, conteudo)
}

function podeCompartilharArquivo(arquivo: File): boolean {
  const nav = globalThis.navigator as Navigator | undefined
  if (!nav || typeof nav.share !== 'function') return false
  if (typeof nav.canShare !== 'function') return false
  try {
    return nav.canShare({ files: [arquivo] })
  } catch {
    return false
  }
}

function baixar(nome: string, conteudo: string): ResultadoDaEntrega {
  try {
    const url = URL.createObjectURL(new Blob([conteudo], { type: TIPO }))
    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = nome
    document.body.appendChild(ancora)
    ancora.click()
    ancora.remove()
    // Revogar cedo demais cancela o download em alguns navegadores.
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    return { estado: 'entregue', via: 'download' }
  } catch (erro) {
    return {
      estado: 'falhou',
      mensagem: erro instanceof Error ? erro.message : 'Não foi possível salvar o arquivo.',
    }
  }
}

/** Lê o arquivo escolhido pelo usuário (FR-100). */
export async function lerArquivoEscolhido(arquivo: File): Promise<string> {
  return arquivo.text()
}
