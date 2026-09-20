/**
 * Aviso de estado degradado de persistência — FR-122.
 *
 * Não bloqueia, não interrompe, não exige interação. O Princípio II admite uma
 * única interrupção durante a sessão — falha ao persistir um registro — e esta
 * não é ela. Enquanto o armazenamento não for declarado persistente, o aviso
 * fica visível e o lembrete de backup encurta de 7 para 2 dias.
 */
import { Faixa } from './Faixa'
import type { EstadoPersistenciaUi } from '../app/usePersistencia'
import estilos from './componentes.module.css'

type Props = {
  estado: EstadoPersistenciaUi
  aoAbrirDiagnostico?: () => void
}

export function AvisoPersistencia({ estado, aoAbrirDiagnostico }: Props) {
  if (estado.verificando || estado.concedida === true) return null

  const motivo = estado.suportada
    ? 'Armazenamento não garantido neste navegador.'
    : 'Este navegador não informa se o armazenamento é garantido.'

  return (
    <Faixa tom="atencao">
      <div className={estilos.conteudoDaFaixa}>
        <span>
          <strong>{motivo}</strong> O sistema pode apagar seus treinos para liberar espaço.
        </span>
        {aoAbrirDiagnostico ? (
          <button type="button" className={estilos.acaoDaFaixa} onClick={aoAbrirDiagnostico}>
            Ver diagnóstico
          </button>
        ) : null}
      </div>
    </Faixa>
  )
}
