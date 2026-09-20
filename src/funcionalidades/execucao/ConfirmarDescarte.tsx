/**
 * Confirmação de descarte — FR-026.
 *
 * Descartar é a única ação da execução que joga registro fora, e por isso pede
 * confirmação explícita. A sessão descartada não entra no histórico nem na
 * exportação, e não há volta: não existe transição de `descartada` para
 * qualquer outro estado.
 */
import { useEffect, useRef } from 'react'
import { Botao } from '../../ui/Botao'
import estilos from './execucao.module.css'

type Props = {
  aoConfirmar: () => void
  aoCancelar: () => void
}

export function ConfirmarDescarte({ aoConfirmar, aoCancelar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogo}
      className={estilos.dialogo}
      aria-labelledby="titulo-descarte"
      onCancel={(evento) => {
        evento.preventDefault()
        aoCancelar()
      }}
    >
      <h2 id="titulo-descarte" className={estilos.tituloDialogo}>
        Descartar este treino?
      </h2>
      <p>
        As séries que você registrou hoje somem e não entram no histórico. Não dá para voltar atrás.
      </p>
      <p>Se quiser guardar o que já fez, conclua o treino em vez de descartar.</p>

      <div className={estilos.acoesDialogo}>
        <Botao variante="secundario" onClick={aoCancelar}>
          Continuar treinando
        </Botao>
        <Botao variante="destrutivo" onClick={aoConfirmar}>
          Descartar
        </Botao>
      </div>
    </dialog>
  )
}
