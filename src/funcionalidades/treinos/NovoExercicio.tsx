/**
 * Criação de exercício personalizado — FR-072, FR-077.
 *
 * O exercício criado aqui é equivalente ao de catálogo em tudo: execução,
 * histórico, comparação e aviso de progressão. A origem só descreve de onde ele
 * veio.
 */
import { useState } from 'react'
import { Botao } from '../../ui/Botao'
import { Campo } from '../../ui/Campo'
import { repositorioExercicios } from '../../dados/repositorios/exercicios'
import type { Exercicio } from '../../domain/tipos'
import estilos from './treinos.module.css'

type Props = {
  nomeSugerido?: string
  aoCriar: (exercicio: Exercicio) => void
  aoCancelar: () => void
}

export function NovoExercicio({ nomeSugerido = '', aoCriar, aoCancelar }: Props) {
  const [nome, definirNome] = useState(nomeSugerido)
  const [grupoMuscular, definirGrupo] = useState('')
  const [equipamento, definirEquipamento] = useState('')
  const [erro, definirErro] = useState<string | null>(null)
  const [salvando, definirSalvando] = useState(false)

  async function salvar() {
    const limpo = nome.trim()
    if (limpo.length === 0) {
      definirErro('Dê um nome ao exercício.')
      return
    }
    definirSalvando(true)
    try {
      aoCriar(
        await repositorioExercicios.criar({
          nome: limpo,
          origem: 'personalizado',
          grupoMuscular: grupoMuscular.trim() || null,
          equipamento: equipamento.trim() || null,
        }),
      )
    } catch (falha) {
      definirErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o exercício.')
      definirSalvando(false)
    }
  }

  return (
    <div className={estilos.painel} role="dialog" aria-modal="true" aria-label="Criar exercício">
      <header className={estilos.painelCabecalho}>
        <h2 className={estilos.painelTitulo}>Criar exercício</h2>
        <Botao variante="discreto" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </header>

      <div className={estilos.painelCorpo}>
        <Campo
          rotulo="Nome"
          value={nome}
          autoFocus
          onChange={(evento) => {
            definirNome(evento.target.value)
            definirErro(null)
          }}
          erro={erro}
        />
        <Campo
          rotulo="Grupo muscular"
          value={grupoMuscular}
          dica="Opcional. Serve para filtrar na busca."
          onChange={(evento) => definirGrupo(evento.target.value)}
        />
        <Campo
          rotulo="Equipamento"
          value={equipamento}
          dica="Opcional. Barra, halteres, polia, máquina ou peso corporal."
          onChange={(evento) => definirEquipamento(evento.target.value)}
        />

        <Botao onClick={() => void salvar()} disabled={salvando} principal>
          Salvar exercício
        </Botao>
      </div>
    </div>
  )
}
