/**
 * O cronômetro de descanso, ligado ao relógio — FR-172 a FR-183.
 *
 * A regra é pura e mora em `src/domain/descanso`. Aqui ficam as três coisas que
 * ela não pode ter: o relógio, o armazenamento e o som.
 *
 * **O intervalo de um segundo não é a contagem.** Ele só provoca o redesenho; o
 * valor vem sempre de `segundosRestantes`, calculado do relógio. A diferença
 * aparece quando o iOS congela a aba em segundo plano: o intervalo para, mas a
 * conta não — ao voltar, o `visibilitychange` força um recálculo e o tempo está
 * certo, inclusive quando já acabou.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  duracaoDoDescanso,
  segundosRestantes,
  type DescansoEmAndamento,
} from '../../domain/descanso'
import type { Id } from '../../domain/tipos'
import { agoraUtc } from '../../plataforma/tempo'
import { apagarDescanso, gravarDescanso, lerDescanso } from '../../plataforma/descansoPersistido'
import { prepararSom, tocarFimDeDescanso } from '../../plataforma/som'

export type EstadoDoDescanso =
  | { readonly fase: 'parado' }
  | { readonly fase: 'correndo'; readonly restante: number; readonly total: number }
  | { readonly fase: 'terminado'; readonly total: number }

export type Descanso = {
  readonly estado: EstadoDoDescanso
  /** FR-172: só isto inicia a contagem. Nada mais no aplicativo a chama. */
  iniciar(planejadoSegundos: number | null): void
  /** FR-179 e FR-182: cancelar em andamento, dispensar o aviso de fim. */
  encerrar(): void
}

export function useDescanso(sessaoId: Id | null): Descanso {
  const [descanso, definirDescanso] = useState<DescansoEmAndamento | null>(null)
  const [agora, definirAgora] = useState(agoraUtc)
  const [sessaoLida, definirSessaoLida] = useState<Id | null>(null)

  // Retomada: a contagem sobrevive a recarregar a página (FR-178), e um
  // descanso de outra sessão é descartado na leitura (FR-183).
  //
  // O ajuste acontece **na renderização**, não num efeito. É o caminho que o
  // React indica para acertar estado quando uma entrada muda, e aqui evita o
  // piscar em que a tela mostra "parado" por um quadro antes de o descanso
  // guardado aparecer.
  if (sessaoId !== sessaoLida) {
    definirSessaoLida(sessaoId)
    definirDescanso(sessaoId === null ? null : lerDescanso(sessaoId))
  }

  const atualizarAgora = useCallback(() => definirAgora(agoraUtc()), [])

  useEffect(() => {
    if (descanso === null) return

    const id = setInterval(atualizarAgora, 1000)
    // O intervalo pode ter sido congelado junto com a aba; ao voltar, recalcula
    // antes de esperar o próximo tique.
    document.addEventListener('visibilitychange', atualizarAgora)
    window.addEventListener('focus', atualizarAgora)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', atualizarAgora)
      window.removeEventListener('focus', atualizarAgora)
    }
  }, [descanso, atualizarAgora])

  const restante = descanso === null ? 0 : segundosRestantes(descanso, agora)

  /**
   * O som toca na **borda** de correndo para terminado, observada por este
   * componente — e só nela.
   *
   * Isso resolve de uma vez os dois casos difíceis, sem nenhuma bandeira a
   * manter: o descanso que termina com a tela aberta teve um restante positivo
   * antes, e toca; o descanso restaurado já terminado nunca teve, e não toca.
   * O instante dele passou enquanto o aparelho mantinha a aba congelada, e um
   * bipe atrasado seria pior que nenhum.
   */
  const restanteAnterior = useRef<number | null>(null)

  useEffect(() => {
    const anterior = restanteAnterior.current
    restanteAnterior.current = descanso === null ? null : restante
    if (descanso === null) return
    if (anterior !== null && anterior > 0 && restante === 0) tocarFimDeDescanso()
  }, [descanso, restante])

  const iniciar = useCallback(
    (planejadoSegundos: number | null) => {
      if (sessaoId === null) return

      // O áudio nasce aqui, dentro do gesto do usuário — é a única janela em
      // que o iOS permite. Ver `plataforma/som.ts`.
      prepararSom()

      const novo: DescansoEmAndamento = {
        sessaoId,
        iniciadoEm: agoraUtc(),
        duracaoSegundos: duracaoDoDescanso(planejadoSegundos),
      }
      definirDescanso(novo)
      definirAgora(novo.iniciadoEm)
      gravarDescanso(novo)
    },
    [sessaoId],
  )

  const encerrar = useCallback(() => {
    definirDescanso(null)
    apagarDescanso()
  }, [])

  const estado: EstadoDoDescanso =
    descanso === null
      ? { fase: 'parado' }
      : restante > 0
        ? { fase: 'correndo', restante, total: descanso.duracaoSegundos }
        : { fase: 'terminado', total: descanso.duracaoSegundos }

  return { estado, iniciar, encerrar }
}
