/**
 * Cabeçalho do exercício na execução — FR-083, FR-084, SC-023.
 *
 * A carga da execução anterior é **exibida como referência** e aplicável por um
 * toque. Ela nunca preenche o campo sozinha: FR-082 e o Princípio II proíbem
 * pré-preenchimento de carga entre sessões, e a diferença entre oferecer e
 * preencher é quem decide a carga de hoje.
 */
import { formatarCarga, formatarTempoRelativo } from '../../plataforma/formato'
import type { InstanteUtc } from '../../domain/tipos'
import estilos from './execucao.module.css'

export type ExecucaoAnterior = {
  readonly cargaKg: number | null
  readonly quando: InstanteUtc
}

type Props = {
  nome: string
  anterior: ExecucaoAnterior | null
  agora: InstanteUtc
  aoAplicarCarga: (cargaKg: number) => void
}

export function CabecalhoExercicio({ nome, anterior, agora, aoAplicarCarga }: Props) {
  return (
    <header className={estilos.exercicio}>
      <h2 className={estilos.nomeDoExercicio}>{nome}</h2>

      {anterior && anterior.cargaKg !== null ? (
        <div className={estilos.linhaAnterior}>
          <span className={estilos.textoAnterior}>
            Última vez, {formatarTempoRelativo(anterior.quando, agora)}:{' '}
            <strong className="numerico">{formatarCarga(anterior.cargaKg)} kg</strong>
          </span>
          <button
            type="button"
            className={estilos.atalho}
            onClick={() => aoAplicarCarga(anterior.cargaKg!)}
          >
            Usar {formatarCarga(anterior.cargaKg)} kg
          </button>
        </div>
      ) : (
        <span className={estilos.textoAnterior}>Primeira vez que você registra este exercício.</span>
      )}
    </header>
  )
}
