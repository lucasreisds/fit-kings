/**
 * Falha ao persistir um registro — FR-058, Princípio I e II.
 *
 * **Esta é a única coisa autorizada a interromper um treino.** O Princípio II
 * proíbe bloquear, interromper ou exigir interação durante uma sessão, e abre
 * exatamente uma exceção: perder a série é pior do que interromper o treino.
 *
 * Por isso este diálogo é inconfundível e oferece alternativa de ação, como
 * FR-058 exige. Perda silenciosa de registro é proibida — sair sem escolher não
 * é uma opção que a tela ofereça em silêncio.
 */
import { useEffect, useRef } from 'react'
import { Botao } from '../../ui/Botao'
import { FalhaAoPersistirError } from '../../dados/repositorios/sessoes'
import estilos from './execucao.module.css'

type Props = {
  erro: unknown
  aoTentarDeNovo: () => void | Promise<void>
  aoDispensar: () => void
}

export function FalhaAoPersistir({ erro, aoTentarDeNovo, aoDispensar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  const detalhe =
    erro instanceof FalhaAoPersistirError
      ? 'O aparelho recusou a gravação. Pode ser falta de espaço.'
      : erro instanceof Error
        ? erro.message
        : 'Causa desconhecida.'

  return (
    <dialog
      ref={dialogo}
      className={estilos.dialogo}
      aria-labelledby="titulo-falha"
      onCancel={(evento) => {
        // Fechar com Esc sem escolher deixaria a série perdida em silêncio.
        evento.preventDefault()
      }}
    >
      <h2 id="titulo-falha" className={estilos.tituloDialogo}>
        A série não foi salva
      </h2>
      <p>
        {detalhe} Nada do que você já registrou antes foi perdido — só esta série ainda não entrou.
      </p>
      <p>
        Tente de novo. Se não funcionar, anote os valores desta série antes de continuar: carga,
        repetições e RIR.
      </p>

      <div className={estilos.acoesDialogo}>
        <Botao variante="secundario" onClick={aoDispensar}>
          Continuar sem salvar
        </Botao>
        <Botao onClick={() => void aoTentarDeNovo()}>Tentar de novo</Botao>
      </div>
    </dialog>
  )
}
