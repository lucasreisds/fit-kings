/**
 * Lista de treinos — FR-004, FR-003.
 *
 * A leitura é `useLiveQuery`: o Dexie reobserva as tabelas e a tela se atualiza
 * sozinha quando um treino muda em outro lugar do aplicativo. Sem isso, cada
 * escrita precisaria avisar cada tela, e uma tela esquecida mostraria dado
 * velho — que num aplicativo de registro é pior do que não mostrar nada.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { navegar } from '../../app/rotas'
import { repositorioTreinos, type TreinoCompleto } from '../../dados/repositorios/treinos'
import { repositorioSessoes } from '../../dados/repositorios/sessoes'
import { iniciarSessao } from '../execucao/iniciarSessao'
import { Faixa } from '../../ui/Faixa'
import { ConfirmarExclusaoTreino } from './ConfirmarExclusaoTreino'
import estilos from './treinos.module.css'

export function ListaTreinos() {
  const [paraExcluir, definirParaExcluir] = useState<TreinoCompleto | null>(null)
  const [erro, definirErro] = useState<string | null>(null)

  /**
   * FR-028: uma sessão por vez. Havendo uma pendente, o usuário vai para ela —
   * é lá que estão as opções de retomar, concluir e descartar, e decidir o
   * destino dela num diálogo aqui esconderia o que já foi registrado.
   */
  async function comecar(completo: TreinoCompleto) {
    definirErro(null)
    try {
      const pendente = await repositorioSessoes.sessaoEmAndamento()
      if (pendente) {
        navegar({ nome: 'execucao', sessaoId: pendente.id })
        return
      }
      const sessao = await iniciarSessao(completo.treino.id)
      navegar({ nome: 'execucao', sessaoId: sessao.sessao.id })
    } catch (falha) {
      definirErro(
        falha instanceof Error ? falha.message : 'Não foi possível iniciar o treino.',
      )
    }
  }

  const treinos = useLiveQuery(async () => {
    const lista = await repositorioTreinos.listar()
    const completos = await Promise.all(lista.map((treino) => repositorioTreinos.obter(treino.id)))
    return completos.filter((treino): treino is TreinoCompleto => treino !== undefined)
  }, [])

  if (treinos === undefined) return null

  if (treinos.length === 0) {
    return (
      <div className={estilos.vazio}>
        <h2 className={estilos.vazioTitulo}>Nenhum treino ainda</h2>
        <p className={estilos.vazioTexto}>
          Monte o primeiro treino com seus exercícios, séries e cargas. Ele fica salvo neste
          aparelho e está pronto para a próxima ida à academia.
        </p>
        <Botao onClick={() => navegar({ nome: 'editorTreino', treinoId: null })}>
          Criar treino
        </Botao>
      </div>
    )
  }

  return (
    <>
      {erro ? (
        <Faixa tom="critica" papel="alert">
          {erro}
        </Faixa>
      ) : null}

      <div className={estilos.lista}>
        {treinos.map((completo) => {
          const series = completo.itens.reduce((total, item) => total + item.series.length, 0)
          return (
            <article key={completo.treino.id} className={estilos.linhaTreino}>
              <div>
                <h2 className={estilos.nomeTreino}>{completo.treino.nome}</h2>
                <p className={estilos.metaTreino}>
                  <span className="numerico">
                    {completo.itens.length}{' '}
                    {completo.itens.length === 1 ? 'exercício' : 'exercícios'}
                  </span>
                  <span className="numerico">
                    {series} {series === 1 ? 'série' : 'séries'}
                  </span>
                </p>
              </div>

              <div className={estilos.acoesTreino}>
                <Botao
                  onClick={() => void comecar(completo)}
                  disabled={completo.itens.length === 0}
                >
                  Iniciar treino
                </Botao>
                <Botao
                  variante="discreto"
                  onClick={() => navegar({ nome: 'editorTreino', treinoId: completo.treino.id })}
                >
                  Editar
                </Botao>
                <button
                  type="button"
                  className={`${estilos.botaoIcone} ${estilos.botaoIconeDestrutivo}`}
                  onClick={() => definirParaExcluir(completo)}
                  aria-label={`Excluir ${completo.treino.nome}`}
                >
                  ×
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <Botao variante="secundario" onClick={() => navegar({ nome: 'editorTreino', treinoId: null })}>
        Criar treino
      </Botao>

      {paraExcluir ? (
        <ConfirmarExclusaoTreino
          treino={paraExcluir}
          aoCancelar={() => definirParaExcluir(null)}
          aoConfirmar={async () => {
            await repositorioTreinos.excluir(paraExcluir.treino.id)
            definirParaExcluir(null)
          }}
        />
      ) : null}
    </>
  )
}
