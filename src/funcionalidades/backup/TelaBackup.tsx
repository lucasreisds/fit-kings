/**
 * Exportação e importação — FR-099, FR-100, FR-107 a FR-110.
 *
 * O ponto de atenção desta tela é **quando** `ultimoBackupEm` é escrito: só
 * depois de a entrega do arquivo concluir com sucesso. Nunca ao iniciar, nunca
 * após falha e nunca quando o usuário fecha a folha de compartilhamento
 * (FR-110). Mover a âncora cedo demais silenciaria o lembrete por sete dias sem
 * que backup nenhum existisse.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { Carta } from '../../ui/Carta'
import { Faixa } from '../../ui/Faixa'
import { criarRepositorioBackup } from '../../dados/repositorios/backup'
import { repositorioMetaAplicacao } from '../../dados/repositorios/metaAplicacao'
import { entregarArquivo } from '../../plataforma/compartilhar'
import { formatarDataHora } from '../../plataforma/formato'
import { agoraUtc } from '../../plataforma/tempo'
import { nomeDeArquivo } from '../../domain/backup/tipos'
import { validarTexto, type ProblemaDoArquivo } from '../../domain/backup/validar'
import type { PlanoDeImportacao, ResumoDaImportacao } from '../../domain/backup/mesclar'
import { SelecionarArquivo } from './SelecionarArquivo'
import { ResumoImportacao } from './ResumoImportacao'
import { RelatorioImportacao } from './RelatorioImportacao'
import estilos from './backup.module.css'

const repositorio = criarRepositorioBackup()

type EstadoDaTela =
  | { nome: 'inicial' }
  | { nome: 'conferindo'; plano: PlanoDeImportacao; nomeDoArquivo: string }
  | { nome: 'aplicando'; plano: PlanoDeImportacao; nomeDoArquivo: string }
  | { nome: 'concluido'; resumo: ResumoDaImportacao }
  | { nome: 'recusado'; problemas: readonly ProblemaDoArquivo[]; nomeDoArquivo: string }

export function TelaBackup() {
  const [estado, definirEstado] = useState<EstadoDaTela>({ nome: 'inicial' })
  const [exportando, definirExportando] = useState(false)
  const [aviso, definirAviso] = useState<string | null>(null)

  const meta = useLiveQuery(() => repositorioMetaAplicacao.obter(), [])

  async function exportar() {
    definirExportando(true)
    definirAviso(null)
    try {
      const texto = await repositorio.exportarTexto()
      const resultado = await entregarArquivo(nomeDeArquivo(agoraUtc()), texto)

      if (resultado.estado === 'entregue') {
        // Só aqui. Esta é a única linha do aplicativo que move a âncora.
        await repositorioMetaAplicacao.registrarBackupBemSucedido()
        definirAviso('Backup exportado. Guarde o arquivo onde você conseguir encontrá-lo depois.')
      } else if (resultado.estado === 'cancelado') {
        definirAviso('Exportação cancelada. Nada foi salvo, e o lembrete continua valendo.')
      } else {
        definirAviso(`Não foi possível exportar: ${resultado.mensagem}`)
      }
    } catch (erro) {
      definirAviso(
        erro instanceof Error
          ? `Não foi possível exportar: ${erro.message}`
          : 'Não foi possível exportar o backup.',
      )
    } finally {
      definirExportando(false)
    }
  }

  async function conferir(arquivo: File) {
    definirAviso(null)
    const validacao = validarTexto(await arquivo.text())

    if (!validacao.valido) {
      // Nenhuma escrita aconteceu: a validação roda inteira antes (FR-106).
      definirEstado({
        nome: 'recusado',
        problemas: validacao.problemas,
        nomeDoArquivo: arquivo.name,
      })
      return
    }

    definirEstado({
      nome: 'conferindo',
      plano: await repositorio.planejar(validacao.arquivo),
      nomeDoArquivo: arquivo.name,
    })
  }

  async function aplicar(plano: PlanoDeImportacao, nomeDoArquivo: string) {
    definirEstado({ nome: 'aplicando', plano, nomeDoArquivo })
    try {
      definirEstado({ nome: 'concluido', resumo: await repositorio.aplicar(plano) })
    } catch (erro) {
      definirEstado({ nome: 'inicial' })
      definirAviso(
        erro instanceof Error
          ? `A importação falhou e nada foi alterado: ${erro.message}`
          : 'A importação falhou e nada foi alterado.',
      )
    }
  }

  if (estado.nome === 'concluido') {
    return (
      <RelatorioImportacao
        resumo={estado.resumo}
        aoFechar={() => definirEstado({ nome: 'inicial' })}
      />
    )
  }

  if (estado.nome === 'conferindo' || estado.nome === 'aplicando') {
    return (
      <ResumoImportacao
        plano={estado.plano}
        nomeDoArquivo={estado.nomeDoArquivo}
        aplicando={estado.nome === 'aplicando'}
        aoConfirmar={() => void aplicar(estado.plano, estado.nomeDoArquivo)}
        aoCancelar={() => definirEstado({ nome: 'inicial' })}
      />
    )
  }

  return (
    <>
      {aviso ? <Faixa tom="acento">{aviso}</Faixa> : null}

      <section className={estilos.secao}>
        <h2 className={estilos.tituloSecao}>Exportar</h2>
        <p className={estilos.explicacao}>
          O arquivo leva todos os seus treinos, exercícios e treinos registrados. Ele não é
          criptografado — guarde-o onde só você tenha acesso.
        </p>

        <Carta>
          <div className={estilos.dataBackup}>
            <span className={estilos.rotuloData}>Último backup</span>
            <span className={estilos.valorData}>
              {meta?.ultimoBackupEm ? formatarDataHora(meta.ultimoBackupEm) : 'nunca exportado'}
            </span>
          </div>
        </Carta>

        <Botao onClick={() => void exportar()} disabled={exportando} principal>
          {exportando ? 'Preparando arquivo…' : 'Exportar backup'}
        </Botao>
      </section>

      <section className={estilos.secao}>
        <h2 className={estilos.tituloSecao}>Importar</h2>
        <p className={estilos.explicacao}>
          Você confere o que vai entrar antes de qualquer coisa ser gravada. Importar o mesmo
          arquivo duas vezes não duplica nada.
        </p>

        {estado.nome === 'recusado' ? (
          <Faixa tom="critica" papel="alert">
            <div>
              <strong>{estado.nomeDoArquivo} não foi importado.</strong> Nenhum dado deste aparelho
              foi alterado.
              <ul className={estilos.problemas}>
                {estado.problemas.slice(0, 5).map((problema, indice) => (
                  <li key={indice}>
                    {problema.mensagem}
                    {problema.caminho ? (
                      <div className={estilos.caminhoDoProblema}>em {problema.caminho}</div>
                    ) : null}
                  </li>
                ))}
                {estado.problemas.length > 5 ? (
                  <li>e mais {estado.problemas.length - 5} problemas.</li>
                ) : null}
              </ul>
            </div>
          </Faixa>
        ) : null}

        <SelecionarArquivo aoEscolher={(arquivo) => void conferir(arquivo)} />
      </section>
    </>
  )
}
