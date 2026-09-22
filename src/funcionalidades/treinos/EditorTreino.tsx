/**
 * Editor de treino — FR-002, FR-005, FR-006, FR-007, FR-008, FR-009.
 *
 * As escritas vão ao banco assim que acontecem, exercício a exercício. Não há
 * botão de salvar que segure tudo em memória: o Princípio I vale para o treino
 * tanto quanto para a série, e um treino montado que se perde ao fechar o
 * aplicativo é exatamente o que FR-010 proíbe.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Botao } from '../../ui/Botao'
import { Campo } from '../../ui/Campo'
import { navegar } from '../../app/rotas'
import {
  NomeDeTreinoInvalidoError,
  repositorioTreinos,
  type ItemCompleto,
  type TreinoCompleto,
} from '../../dados/repositorios/treinos'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import type { Abordagem, Exercicio, Id } from '../../domain/tipos'
import type { ValoresPlanejados } from '../../domain/treino'
import { SeletorExercicio } from './SeletorExercicio'
import { EditorSeries } from './EditorSeries'
import { EditorDropset } from './EditorDropset'
import estilos from './treinos.module.css'

const SERIES_INICIAIS: readonly ValoresPlanejados[] = [
  { repeticoes: 10, cargaKg: 0, rir: 2 },
  { repeticoes: 10, cargaKg: 0, rir: 2 },
  { repeticoes: 10, cargaKg: 0, rir: 1 },
]

type Props = { treinoId: Id | null }

export function EditorTreino({ treinoId }: Props) {
  const [idAtual, definirIdAtual] = useState<Id | null>(treinoId)
  const [rascunhoDeNome, definirRascunhoDeNome] = useState<string | null>(
    treinoId === null ? '' : null,
  )
  const [selecionando, definirSelecionando] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)

  const completo = useLiveQuery<TreinoCompleto | undefined>(
    async () => (idAtual ? repositorioTreinos.obter(idAtual) : undefined),
    [idAtual],
  )

  const exercicios = useLiveQuery(
    async (): Promise<Map<Id, Exercicio>> =>
      completo
        ? repositorioExercicios.obterVarios(completo.itens.map((i) => i.item.exercicioId))
        : new Map<Id, Exercicio>(),
    [completo],
  )

  // O nome é o único campo com estado local: ele é editado letra a letra e só
  // vai ao banco ao sair do campo. Tudo o mais grava no ato.
  const nome = rascunhoDeNome ?? completo?.treino.nome ?? ''

  async function garantirTreino(): Promise<Id> {
    if (idAtual) return idAtual
    const criado = await repositorioTreinos.criar(nome.trim() || 'Treino sem nome')
    definirIdAtual(criado.id)
    definirRascunhoDeNome(null)
    return criado.id
  }

  async function salvarNome() {
    if (rascunhoDeNome === null) return
    try {
      if (idAtual) await repositorioTreinos.renomear(idAtual, rascunhoDeNome)
      else if (rascunhoDeNome.trim().length > 0) await garantirTreino()
      definirErro(null)
      definirRascunhoDeNome(null)
    } catch (falha) {
      definirErro(
        falha instanceof NomeDeTreinoInvalidoError
          ? falha.message
          : 'Não foi possível salvar o nome.',
      )
    }
  }

  async function adicionar(exercicio: Exercicio) {
    const id = await garantirTreino()
    definirSelecionando(false)
    await repositorioTreinos.adicionarItem(id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      series: SERIES_INICIAIS,
    })
  }

  async function remover(itemId: Id) {
    if (idAtual) await repositorioTreinos.removerItem(idAtual, itemId)
  }

  async function reordenar(de: number, para: number) {
    if (!idAtual || para < 0 || para >= (completo?.itens.length ?? 0)) return
    await repositorioTreinos.reordenarItens(idAtual, de, para)
  }

  async function definirSeries(itemId: Id, series: readonly ValoresPlanejados[]) {
    await repositorioTreinos.definirSeries(itemId, series)
  }

  async function definirAbordagem(itemId: Id, abordagem: Abordagem) {
    await repositorioTreinos.definirAbordagem(itemId, abordagem)
  }

  async function definirDescanso(itemId: Id, descansoSegundos: number | null) {
    await repositorioTreinos.definirDescanso(itemId, descansoSegundos)
  }

  const itens = completo?.itens ?? []

  return (
    <div className={estilos.editor}>
      <Campo
        rotulo="Nome do treino"
        value={nome}
        placeholder="Treino A, peito e tríceps"
        autoFocus={treinoId === null}
        onChange={(evento) => definirRascunhoDeNome(evento.target.value)}
        onBlur={() => void salvarNome()}
        erro={erro}
      />

      {itens.length === 0 ? (
        <p className={estilos.vazioTexto}>
          Adicione os exercícios na ordem em que você vai executá-los. Cada um leva suas próprias
          séries, com repetições, carga e RIR.
        </p>
      ) : (
        itens.map((item, indice) => (
          <ItemDoEditor
            key={item.item.id}
            item={item}
            indice={indice}
            total={itens.length}
            exercicio={exercicios?.get(item.item.exercicioId)}
            aoRemover={() => void remover(item.item.id)}
            aoSubir={() => void reordenar(indice, indice - 1)}
            aoDescer={() => void reordenar(indice, indice + 1)}
            aoDefinirSeries={(series) => void definirSeries(item.item.id, series)}
            aoDefinirAbordagem={(abordagem) => void definirAbordagem(item.item.id, abordagem)}
            aoDefinirDescanso={(segundos) => void definirDescanso(item.item.id, segundos)}
          />
        ))
      )}

      <Botao variante="secundario" onClick={() => definirSelecionando(true)}>
        Adicionar exercício
      </Botao>

      <div className={estilos.rodapeAcoes}>
        <Botao
          onClick={async () => {
            await salvarNome()
            navegar({ nome: 'treinos' })
          }}
        >
          Concluir
        </Botao>
      </div>

      {selecionando ? (
        <SeletorExercicio
          aoEscolher={(exercicio) => void adicionar(exercicio)}
          aoFechar={() => definirSelecionando(false)}
        />
      ) : null}
    </div>
  )
}

type PropsItem = {
  item: ItemCompleto
  indice: number
  total: number
  exercicio: Exercicio | undefined
  aoRemover: () => void
  aoSubir: () => void
  aoDescer: () => void
  aoDefinirSeries: (series: readonly ValoresPlanejados[]) => void
  aoDefinirAbordagem: (abordagem: Abordagem) => void
  aoDefinirDescanso: (descansoSegundos: number | null) => void
}

function ItemDoEditor({
  item,
  indice,
  total,
  exercicio,
  aoRemover,
  aoSubir,
  aoDescer,
  aoDefinirSeries,
  aoDefinirAbordagem,
  aoDefinirDescanso,
}: PropsItem) {
  const [aberto, definirAberto] = useState(false)

  const series: readonly ValoresPlanejados[] = item.series.map((serie) => ({
    repeticoes: serie.repeticoes,
    cargaKg: serie.cargaKg,
    rir: serie.rir,
  }))

  return (
    <section className={estilos.itemExercicio}>
      <div className={estilos.cabecalhoItem}>
        <span className={`${estilos.posicao} numerico`} aria-hidden="true">
          {indice + 1}
        </span>

        <button
          type="button"
          className={estilos.gatilhoItem}
          onClick={() => definirAberto((valor) => !valor)}
          aria-expanded={aberto}
        >
          <span className={estilos.nomeItem}>{exercicio?.nome ?? 'Exercício'}</span>
          <span className={estilos.grupoItem}>
            <span className="numerico">{item.series.length}</span>{' '}
            {item.series.length === 1 ? 'série' : 'séries'}
            {item.item.abordagem === 'dropset' ? ' em dropset' : ''}
          </span>
        </button>

        <div className={estilos.controlesItem}>
          <button
            type="button"
            className={estilos.botaoIcone}
            onClick={aoSubir}
            disabled={indice === 0}
            aria-label={`Mover ${exercicio?.nome ?? 'exercício'} para cima`}
          >
            ↑
          </button>
          <button
            type="button"
            className={estilos.botaoIcone}
            onClick={aoDescer}
            disabled={indice === total - 1}
            aria-label={`Mover ${exercicio?.nome ?? 'exercício'} para baixo`}
          >
            ↓
          </button>
          <button
            type="button"
            className={`${estilos.botaoIcone} ${estilos.botaoIconeDestrutivo}`}
            onClick={aoRemover}
            aria-label={`Remover ${exercicio?.nome ?? 'exercício'} do treino`}
          >
            ×
          </button>
        </div>
      </div>

      {aberto ? (
        <div className={estilos.corpoItem}>
          <div className={estilos.seletorAbordagem} role="group" aria-label="Abordagem da série">
            {(['tradicional', 'dropset'] as const).map((opcao) => {
              const ativa = item.item.abordagem === opcao
              return (
                <button
                  key={opcao}
                  type="button"
                  className={`${estilos.opcaoAbordagem} ${ativa ? estilos.opcaoAbordagemAtiva : ''}`}
                  aria-pressed={ativa}
                  onClick={() => aoDefinirAbordagem(opcao)}
                >
                  {opcao === 'tradicional' ? 'Tradicional' : 'Dropset'}
                </button>
              )
            })}
          </div>

          {item.item.abordagem === 'dropset' ? (
            <EditorDropset degraus={series} aoMudar={aoDefinirSeries} />
          ) : (
            <EditorSeries series={series} aoMudar={aoDefinirSeries} />
          )}

          {/*
            FR-148 — descanso planejado. É valor de referência, exibido na
            execução: o aplicativo não conta o tempo nem avisa (FR-151).
          */}
          <Campo
            rotulo="Descanso entre séries (segundos)"
            dica="Opcional. Aparece durante o treino, como referência — o aplicativo não cronometra."
            type="number"
            inputMode="numeric"
            min={0}
            step={15}
            defaultValue={item.item.descansoSegundos ?? ''}
            onBlur={(evento) => {
              const bruto = evento.target.value.trim()
              aoDefinirDescanso(bruto === '' ? null : Number(bruto))
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
