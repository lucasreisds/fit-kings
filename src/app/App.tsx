/**
 * App shell e navegação — T020.
 *
 * A navegação fica no rodapé porque o aparelho é usado de pé e com uma mão só;
 * o alcance do polegar é critério de projeto aqui, não preferência.
 */
import { useEffect } from 'react'
import { caminhoDe, navegar, useRota, type Rota } from './rotas'
import { usePersistencia } from './usePersistencia'
import { aoSairDeVista } from '../plataforma/cicloDeVida'
import { repositorioSessoes } from '../dados/repositorios/sessoes'
import { AvisoPersistencia } from '../ui/AvisoPersistencia'
import { Icone, type NomeDeIcone } from '../ui/Icone'
import { TelaDiagnostico } from '../funcionalidades/diagnostico/TelaDiagnostico'
import { ListaTreinos } from '../funcionalidades/treinos/ListaTreinos'
import { EditorTreino } from '../funcionalidades/treinos/EditorTreino'
import { TelaExecucao } from '../funcionalidades/execucao/TelaExecucao'
import { ListaHistorico } from '../funcionalidades/historico/ListaHistorico'
import { DetalheSessao } from '../funcionalidades/historico/DetalheSessao'
import { HistoricoExercicio } from '../funcionalidades/historico/HistoricoExercicio'
import { EvolucaoExercicio } from '../funcionalidades/progressao/EvolucaoExercicio'
import { TelaProgresso } from '../funcionalidades/progressao/TelaProgresso'
import { TelaAjustes } from './TelaAjustes'
import { TelaBackup } from '../funcionalidades/backup/TelaBackup'
import { AvisoSessaoEmAndamento } from '../funcionalidades/execucao/AvisoSessaoEmAndamento'
import { LembreteBackup } from '../funcionalidades/backup/LembreteBackup'
import estilos from './app.module.css'

type Aba = {
  rota: Rota
  icone: NomeDeIcone
  texto: string
  corresponde: readonly Rota['nome'][]
}

const ABAS: readonly Aba[] = [
  {
    rota: { nome: 'treinos' },
    icone: 'treinos',
    texto: 'Treinos',
    corresponde: ['treinos', 'editorTreino'],
  },
  {
    rota: { nome: 'historico' },
    icone: 'historico',
    texto: 'Histórico',
    corresponde: ['historico', 'detalheSessao', 'historicoExercicio'],
  },
  {
    rota: { nome: 'progresso' },
    icone: 'progresso',
    texto: 'Progresso',
    corresponde: ['progresso', 'evolucaoExercicio'],
  },
  {
    rota: { nome: 'ajustes' },
    icone: 'ajustes',
    texto: 'Ajustes',
    corresponde: ['ajustes', 'backup', 'diagnostico'],
  },
]

const TITULOS: Record<Rota['nome'], string> = {
  treinos: 'Treinos',
  editorTreino: 'Editar treino',
  execucao: 'Treino em andamento',
  historico: 'Histórico',
  detalheSessao: 'Sessão',
  historicoExercicio: 'Exercício',
  evolucaoExercicio: 'Evolução',
  progresso: 'Progresso',
  ajustes: 'Ajustes',
  backup: 'Backup',
  diagnostico: 'Diagnóstico',
}

export function App() {
  const rota = useRota()
  const persistencia = usePersistencia()

  useEffect(() => {
    if (globalThis.location.hash === '') navegar({ nome: 'treinos' })
  }, [])

  /**
   * FR-031 — minimizar, trocar de aplicativo ou bloquear a tela não pode custar
   * nada do que foi registrado.
   *
   * Na prática não há o que salvar aqui: cada série já foi gravada em
   * transação própria no instante da confirmação (FR-033). O gancho existe para
   * reconciliar o índice `vigente`, único cache do modelo, antes de o navegador
   * eventualmente descartar a aba — e a ordem importa: o aplicativo não depende
   * deste evento para não perder dados, ele apenas aproveita a oportunidade.
   */
  useEffect(
    () =>
      aoSairDeVista(async () => {
        await repositorioSessoes.reconstruirIndiceDeVigencia()
      }),
    [],
  )

  // A tela de execução ocupa a tela inteira: durante o treino nada compete com
  // carga, repetições e RIR, e nada além da falha ao persistir interrompe
  // (Princípio II, D9 critério 3).
  if (rota.nome === 'execucao') {
    return <TelaExecucao sessaoId={rota.sessaoId} />
  }

  return (
    <div className={estilos.aplicacao}>
      <main className={estilos.conteudo}>
        <header className={estilos.cabecalho}>
          <h1 className={estilos.titulo}>{TITULOS[rota.nome]}</h1>
        </header>

        <AvisoPersistencia
          estado={persistencia}
          aoAbrirDiagnostico={() => navegar({ nome: 'diagnostico' })}
        />
        <AvisoSessaoEmAndamento />
        <LembreteBackup persistenciaConcedida={persistencia.concedida} />

        {conteudoDaRota(rota, persistencia)}
      </main>

      <nav className={estilos.navegacao} aria-label="Seções do aplicativo">
        {ABAS.map((aba) => {
          const ativa = aba.corresponde.includes(rota.nome)
          return (
            <a
              key={aba.texto}
              href={caminhoDe(aba.rota)}
              className={`${estilos.abaLink} ${ativa ? estilos.abaAtiva : ''}`}
              aria-current={ativa ? 'page' : undefined}
            >
              <Icone nome={aba.icone} />
              {aba.texto}
            </a>
          )
        })}
      </nav>
    </div>
  )
}

function conteudoDaRota(rota: Rota, persistencia: ReturnType<typeof usePersistencia>) {
  switch (rota.nome) {
    case 'treinos':
      return <ListaTreinos />
    case 'editorTreino':
      return <EditorTreino treinoId={rota.treinoId} />
    case 'historico':
      return <ListaHistorico />
    case 'detalheSessao':
      return <DetalheSessao sessaoId={rota.sessaoId} />
    case 'historicoExercicio':
      return <HistoricoExercicio exercicioId={rota.exercicioId} />
    case 'evolucaoExercicio':
      return <EvolucaoExercicio exercicioId={rota.exercicioId} />
    case 'progresso':
      return <TelaProgresso />
    case 'ajustes':
      return <TelaAjustes />
    case 'backup':
      return <TelaBackup />
    case 'diagnostico':
      return <TelaDiagnostico persistencia={persistencia} />
    case 'execucao':
      return null
  }
}
