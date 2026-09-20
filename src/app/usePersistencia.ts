/**
 * Estado da persistência do armazenamento — FR-120, FR-121, FR-122.
 *
 * Verifica e solicita uma vez na abertura, e registra o resultado em
 * `metaAplicacao`. O resultado importa além da tela: ele é o que reduz de 7
 * para 2 dias o intervalo do lembrete de backup (FR-110).
 */
import { useEffect, useState } from 'react'
import {
  consultarPersistencia,
  solicitarPersistencia,
  type EstadoPersistencia,
} from '../plataforma/persistencia'
import { repositorioMetaAplicacao } from '../dados/repositorios/metaAplicacao'

export type EstadoPersistenciaUi = EstadoPersistencia & { readonly verificando: boolean }

const INICIAL: EstadoPersistenciaUi = { concedida: null, suportada: true, verificando: true }

export function usePersistencia(): EstadoPersistenciaUi {
  const [estado, definirEstado] = useState<EstadoPersistenciaUi>(INICIAL)

  useEffect(() => {
    let ativo = true

    async function verificar() {
      const atual = await consultarPersistencia()
      // Solicitar só quando ainda não concedida. Pedir de novo a cada abertura
      // seria interromper sem necessidade, e o Princípio II não admite.
      const resultado = atual.concedida === true ? atual : await solicitarPersistencia()

      if (!ativo) return
      definirEstado({ ...resultado, verificando: false })
      await repositorioMetaAplicacao.registrarVerificacaoDePersistencia(resultado.concedida)
    }

    void verificar()
    return () => {
      ativo = false
    }
  }, [])

  return estado
}
