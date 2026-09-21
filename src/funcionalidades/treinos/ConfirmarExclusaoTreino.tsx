/**
 * Confirmação de exclusão de treino — FR-003.
 *
 * A confirmação diz o que **não** é apagado. Excluir um treino não toca em
 * nenhuma sessão já concluída: elas carregam sua própria cópia do plano
 * (FR-040, Princípio I). Sem essa frase, a ação parece mais destrutiva do que é
 * e o usuário deixa de limpar treinos velhos por medo.
 */
import { useEffect, useRef } from 'react'
import { Botao } from '../../ui/Botao'
import type { TreinoCompleto } from '../../dados/repositorios/treinos'
import estilos from './treinos.module.css'

type Props = {
  treino: TreinoCompleto
  aoConfirmar: () => void | Promise<void>
  aoCancelar: () => void
}

export function ConfirmarExclusaoTreino({ treino, aoConfirmar, aoCancelar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogo}
      className={estilos.confirmacao}
      onCancel={(evento) => {
        evento.preventDefault()
        aoCancelar()
      }}
      aria-labelledby="titulo-exclusao"
    >
      <h2 id="titulo-exclusao" className={estilos.nomeTreino}>
        Excluir {treino.treino.nome}?
      </h2>
      <p>
        O treino sai da lista e não pode mais ser iniciado. Os treinos que você já registrou
        continuam no histórico, com as cargas daquele dia.
      </p>
      <div className={estilos.acoesConfirmacao}>
        <Botao variante="secundario" onClick={aoCancelar}>
          Manter
        </Botao>
        <Botao variante="destrutivo" onClick={() => void aoConfirmar()}>
          Excluir treino
        </Botao>
      </div>
    </dialog>
  )
}
