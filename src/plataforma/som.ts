/**
 * Bipe de fim de descanso — FR-176, FR-185.
 *
 * **O áudio precisa nascer de um gesto.** No iOS o Safari recusa um
 * `AudioContext` criado fora da interação do usuário, e um criado antes dela
 * nasce suspenso. Como a contagem só começa por toque (FR-173), o toque é o
 * gesto — e é nele que o contexto é criado. Não existe caminho em que o som
 * seja necessário sem que o gesto tenha acontecido.
 *
 * **E precisa falhar em silêncio.** Aparelho no mudo, política do navegador,
 * contexto recusado: nada disso é erro que o usuário possa resolver no meio de
 * uma série. O aviso visual carrega a informação por si, e uma mensagem de erro
 * por causa de um bipe seria pior que o bipe faltando.
 *
 * Um oscilador em vez de um arquivo: não pesa nada, não precisa entrar no cache
 * do service worker e não depende de rede — o Princípio III de graça.
 */

type ContextoDeAudio = AudioContext & { state: AudioContextState }

let contexto: ContextoDeAudio | null = null

function construtorDeAudio(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const janela = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return janela.AudioContext ?? janela.webkitAudioContext ?? null
}

/**
 * Prepara o áudio. Chamar **dentro** do gesto do usuário, e nunca fora dele.
 *
 * Devolve nada e não lança: quem chama não tem o que fazer com a falha.
 */
export function prepararSom(): void {
  try {
    const Construtor = construtorDeAudio()
    if (!Construtor) return
    contexto ??= new Construtor() as ContextoDeAudio
    if (contexto.state === 'suspended') void contexto.resume()
  } catch {
    // Silêncio de propósito — ver o cabeçalho.
  }
}

/**
 * Dois toques curtos e graves. Academia é ambiente compartilhado: o som traz o
 * olho de volta para a tela, e quem carrega a informação é o aviso visual.
 */
export function tocarFimDeDescanso(): void {
  try {
    if (!contexto || contexto.state !== 'running') return

    const inicio = contexto.currentTime
    for (const atraso of [0, 0.22]) {
      const oscilador = contexto.createOscillator()
      const volume = contexto.createGain()

      oscilador.type = 'sine'
      oscilador.frequency.value = 880

      // Entrada e saída suaves: um oscilador ligado e desligado a seco estala.
      volume.gain.setValueAtTime(0.0001, inicio + atraso)
      volume.gain.exponentialRampToValueAtTime(0.25, inicio + atraso + 0.01)
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.16)

      oscilador.connect(volume)
      volume.connect(contexto.destination)
      oscilador.start(inicio + atraso)
      oscilador.stop(inicio + atraso + 0.18)
    }
  } catch {
    // Idem.
  }
}
