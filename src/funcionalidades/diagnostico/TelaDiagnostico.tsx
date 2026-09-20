/**
 * Tela de diagnóstico — FR-123.
 *
 * Mostra o estado da persistência e o espaço disponível. Existe porque o risco
 * R1 é condição de plataforma, não defeito: o usuário precisa poder ver se o
 * armazenamento deste aparelho está garantido antes de confiar nele.
 */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Carta } from '../../ui/Carta'
import { Botao } from '../../ui/Botao'
import { Faixa } from '../../ui/Faixa'
import {
  estimarArmazenamento,
  formatarBytes,
  solicitarPersistencia,
  type EstimativaArmazenamento,
} from '../../plataforma/persistencia'
import { repositorioMetaAplicacao } from '../../dados/repositorios/metaAplicacao'
import type { MetaAplicacao } from '../../domain/tipos'
import { formatarDataHora } from '../../plataforma/formato'
import type { EstadoPersistenciaUi } from '../../app/usePersistencia'
import estilos from './diagnostico.module.css'

type Props = { persistencia: EstadoPersistenciaUi }

export function TelaDiagnostico({ persistencia }: Props) {
  const [estimativa, definirEstimativa] = useState<EstimativaArmazenamento | null>(null)
  // Resultado de uma solicitação feita nesta tela. Enquanto for nulo, vale o
  // que a abertura do aplicativo já apurou — em vez de copiar a prop para o
  // estado e ter duas fontes para a mesma resposta.
  const [resolicitada, definirResolicitada] = useState<boolean | null>(null)
  const concedida = resolicitada ?? persistencia.concedida

  const meta = useLiveQuery<MetaAplicacao | undefined>(
    () => repositorioMetaAplicacao.obter(),
    [],
  )

  useEffect(() => {
    let ativo = true
    void estimarArmazenamento().then((valor) => {
      if (ativo) definirEstimativa(valor)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function solicitarDeNovo() {
    const resultado = await solicitarPersistencia()
    await repositorioMetaAplicacao.registrarVerificacaoDePersistencia(resultado.concedida)
    definirResolicitada(resultado.concedida)
  }

  const usado = estimativa?.usadoBytes ?? null
  const disponivel = estimativa?.disponivelBytes ?? null
  const total = usado !== null && disponivel !== null ? usado + disponivel : null
  const proporcao = total && total > 0 && usado !== null ? Math.min(1, usado / total) : null

  return (
    <>
      <section className={estilos.secao}>
        <h2 className={estilos.tituloSecao}>Armazenamento</h2>
        {concedida === true ? (
          <Faixa tom="positiva">
            Armazenamento garantido. O sistema não vai apagar seus dados para liberar espaço.
          </Faixa>
        ) : (
          <Faixa tom="atencao">
            Armazenamento não garantido. O sistema pode apagá-lo sob pressão de espaço. Mantenha
            backups em arquivo.
          </Faixa>
        )}
      </section>

      <Carta>
        <div className={estilos.lista}>
          <div className={estilos.linha}>
            <span className={estilos.chave}>Persistência</span>
            <span className={estilos.valor}>{descreverPersistencia(concedida, persistencia.suportada)}</span>
          </div>
          <div className={estilos.linha}>
            <span className={estilos.chave}>Última verificação</span>
            <span className={estilos.valor}>
              {meta?.persistenciaVerificadaEm ? formatarDataHora(meta.persistenciaVerificadaEm) : '—'}
            </span>
          </div>
          <div className={estilos.linha}>
            <span className={estilos.chave}>Último backup</span>
            <span className={estilos.valor}>
              {meta?.ultimoBackupEm ? formatarDataHora(meta.ultimoBackupEm) : 'nunca exportado'}
            </span>
          </div>
          <div className={estilos.linha}>
            <span className={estilos.chave}>Espaço usado</span>
            <span className={`${estilos.valor} numerico`}>{formatarBytes(usado)}</span>
          </div>
          <div className={estilos.linha}>
            <span className={estilos.chave}>Espaço disponível</span>
            <span className={`${estilos.valor} numerico`}>{formatarBytes(disponivel)}</span>
          </div>
        </div>

        {proporcao !== null ? (
          <div
            className={estilos.medidor}
            role="img"
            aria-label={`${formatarBytes(usado)} usados de ${formatarBytes(total)}`}
          >
            <div className={estilos.medidorPreenchido} style={{ width: `${proporcao * 100}%` }} />
          </div>
        ) : null}
      </Carta>

      {concedida !== true ? (
        <Botao variante="secundario" onClick={() => void solicitarDeNovo()}>
          Solicitar armazenamento garantido
        </Botao>
      ) : null}

      <p className={estilos.nota}>
        No iPhone, apagar o ícone da Tela de Início apaga também os dados do aplicativo. O backup em
        arquivo é a única forma de recuperá-los.
      </p>
    </>
  )
}

function descreverPersistencia(concedida: boolean | null, suportada: boolean): string {
  if (concedida === true) return 'garantida'
  if (!suportada) return 'não informada por este navegador'
  return 'não garantida'
}
