/**
 * Navegação entre exercícios da sessão — FR-127, FR-128, FR-131, D4.
 *
 * O defeito que este componente corrige não era de rolagem: a faixa de cartões
 * **funcionava** e ficava visível. Ninguém percebia que era tocável, e o
 * terceiro item aparecia cortado sem nenhuma pista de que havia mais.
 *
 * Por isso a correção não é "melhorar a pista de rolagem" — isso deixaria o
 * alcance dependendo de o usuário descobrir um gesto não anunciado. A tela
 * ganha **paginação explícita**: anterior, posição, próximo, sempre visíveis. O
 * alcance de qualquer exercício deixa de depender de descoberta, que é o que
 * SC-036 exige.
 *
 * A faixa continua, agora como salto direto — útil quando se sabe aonde ir.
 */
import { textoDoEstado, type EstadoExercicioSessao } from '../../domain/sessao/estadoExercicio'
import type { Id } from '../../domain/tipos'
import estilos from './execucao.module.css'

export type ExercicioNavegavel = {
  readonly id: Id
  readonly nome: string
  readonly estado: EstadoExercicioSessao
}

type Props = {
  exercicios: readonly ExercicioNavegavel[]
  emFocoId: Id
  aoFocar: (id: Id) => void
  aoAcrescentar: () => void
  /** Sinalização de limite (FR-131), quando o usuário tenta passar da ponta. */
  limiteAtingido: 'inicio' | 'fim' | null
}

export function NavegacaoExercicios({
  exercicios,
  emFocoId,
  aoFocar,
  aoAcrescentar,
  limiteAtingido,
}: Props) {
  const indice = exercicios.findIndex((exercicio) => exercicio.id === emFocoId)
  const anterior = indice > 0 ? exercicios[indice - 1] : undefined
  const proximo = indice < exercicios.length - 1 ? exercicios[indice + 1] : undefined

  return (
    <nav className={estilos.navegacao} aria-label="Exercícios do treino">
      <div className={estilos.paginador}>
        <button
          type="button"
          className={estilos.setaExercicio}
          onClick={() => anterior && aoFocar(anterior.id)}
          disabled={!anterior}
          aria-label={
            anterior ? `Exercício anterior: ${anterior.nome}` : 'Este é o primeiro exercício'
          }
        >
          <span aria-hidden="true">‹</span>
        </button>

        <span className={estilos.posicaoExercicio}>
          <span className="numerico">
            {indice + 1} de {exercicios.length}
          </span>
        </span>

        <button
          type="button"
          className={estilos.setaExercicio}
          onClick={() => proximo && aoFocar(proximo.id)}
          disabled={!proximo}
          aria-label={proximo ? `Próximo exercício: ${proximo.nome}` : 'Este é o último exercício'}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {limiteAtingido ? (
        <p className={estilos.avisoLimite} role="status">
          {limiteAtingido === 'fim'
            ? 'Este é o último exercício do treino.'
            : 'Este é o primeiro exercício do treino.'}
        </p>
      ) : null}

      {/*
        A faixa é salto direto, não a única via. `role="tablist"` também a
        exclui do gesto de arrastar, que pertence a ela (FR-130).
      */}
      <div className={estilos.tiras} role="tablist" aria-label="Ir direto a um exercício">
        {exercicios.map((exercicio, posicao) => {
          const ativa = exercicio.id === emFocoId
          return (
            <button
              key={exercicio.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              className={`${estilos.tira} ${ativa ? estilos.tiraAtiva : ''}`}
              onClick={() => aoFocar(exercicio.id)}
            >
              <span className={estilos.tiraOrdem}>
                <span className="numerico">{posicao + 1}</span>
              </span>
              <span className={estilos.tiraTexto}>
                <span className={estilos.tiraNome}>{exercicio.nome}</span>
                <span className={estilos.tiraEstado}>{textoDoEstado(exercicio.estado)}</span>
              </span>
            </button>
          )
        })}

        <button
          type="button"
          className={estilos.tiraAcrescentar}
          onClick={aoAcrescentar}
          aria-label="Acrescentar exercício fora do plano"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </nav>
  )
}
