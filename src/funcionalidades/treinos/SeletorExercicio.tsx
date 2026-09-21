/**
 * Seletor de exercício — FR-011, FR-075, SC-020.
 *
 * Meta de toques a partir da edição do treino: **3**. Abrir o seletor (1),
 * tocar o exercício (2), confirmar a adição (3). Por isso a busca já vem
 * focada e o toque no resultado adiciona direto, sem passo de confirmação
 * intermediário.
 */
import { useEffect, useMemo, useState } from 'react'
import { Botao } from '../../ui/Botao'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import type { Exercicio } from '../../domain/tipos'
import { NovoExercicio } from './NovoExercicio'
import estilos from './treinos.module.css'

type Props = {
  aoEscolher: (exercicio: Exercicio) => void
  aoFechar: () => void
}

export function SeletorExercicio({ aoEscolher, aoFechar }: Props) {
  const [busca, definirBusca] = useState('')
  const [grupo, definirGrupo] = useState<string | null>(null)
  const [grupos, definirGrupos] = useState<string[]>([])
  const [resultados, definirResultados] = useState<Exercicio[]>([])
  const [criando, definirCriando] = useState(false)

  useEffect(() => {
    void repositorioExercicios.gruposMusculares().then(definirGrupos)
  }, [])

  const filtro = useMemo(() => ({ busca, grupoMuscular: grupo }), [busca, grupo])

  useEffect(() => {
    let ativo = true
    void repositorioExercicios.buscar(filtro).then((lista) => {
      if (ativo) definirResultados(lista)
    })
    return () => {
      ativo = false
    }
  }, [filtro])

  if (criando) {
    return (
      <NovoExercicio
        nomeSugerido={busca}
        aoCriar={(exercicio) => aoEscolher(exercicio)}
        aoCancelar={() => definirCriando(false)}
      />
    )
  }

  return (
    <div className={estilos.painel} role="dialog" aria-modal="true" aria-label="Escolher exercício">
      <header className={estilos.painelCabecalho}>
        <h2 className={estilos.painelTitulo}>Escolher exercício</h2>
        <Botao variante="discreto" onClick={aoFechar}>
          Cancelar
        </Botao>
      </header>

      <div className={estilos.painelCorpo}>
        <input
          className="entradaBusca"
          type="search"
          value={busca}
          autoFocus
          placeholder="Buscar por nome, grupo ou equipamento"
          aria-label="Buscar exercício"
          onChange={(evento) => definirBusca(evento.target.value)}
          style={{
            minHeight: 'var(--alvo-toque)',
            padding: 'var(--espaco-x3) var(--espaco-x4)',
            border: '1px solid var(--cor-contorno)',
            borderRadius: 'var(--raio-campo)',
            background: 'var(--par-carta-primaria-fundo)',
            width: '100%',
          }}
        />

        <div className={estilos.filtros} role="group" aria-label="Filtrar por grupo muscular">
          <button
            type="button"
            className={`${estilos.filtro} ${grupo === null ? estilos.filtroAtivo : ''}`}
            onClick={() => definirGrupo(null)}
            aria-pressed={grupo === null}
          >
            Todos
          </button>
          {grupos.map((nome) => (
            <button
              key={nome}
              type="button"
              className={`${estilos.filtro} ${grupo === nome ? estilos.filtroAtivo : ''}`}
              onClick={() => definirGrupo(nome)}
              aria-pressed={grupo === nome}
            >
              {nome}
            </button>
          ))}
        </div>

        {resultados.length === 0 ? (
          <p className={estilos.resultadoMeta}>
            Nenhum exercício encontrado. Crie um exercício personalizado com esse nome.
          </p>
        ) : (
          <div className={estilos.resultados}>
            {resultados.map((exercicio) => (
              <button
                key={exercicio.id}
                type="button"
                className={estilos.resultado}
                onClick={() => aoEscolher(exercicio)}
              >
                <span className={estilos.resultadoNome}>{exercicio.nome}</span>
                <span className={estilos.resultadoMeta}>
                  {[
                    exercicio.grupoMuscular,
                    exercicio.equipamento,
                    exercicio.origem === 'personalizado' ? 'seu exercício' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </button>
            ))}
          </div>
        )}

        <Botao variante="secundario" onClick={() => definirCriando(true)}>
          Criar exercício
        </Botao>
      </div>
    </div>
  )
}
