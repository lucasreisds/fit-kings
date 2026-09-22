/**
 * Editar ou remover uma série já registrada, durante a sessão — FR-133, FR-134.
 *
 * Existe por causa de um treino real: sem conseguir trocar de exercício, o
 * usuário foi tentando os botões disponíveis e registrou uma série que não
 * existia no plano. Ela foi para o histórico e não havia como desfazer.
 *
 * O Princípio I existe para proteger o dado do usuário, e um registro errado
 * que não pode ser corrigido no ato envenena o histórico exatamente como um
 * dado perdido.
 */
import { useState } from 'react'
import { Botao } from '../../ui/Botao'
import { Campo } from '../../ui/Campo'
import { Faixa } from '../../ui/Faixa'
import {
  CorrecaoInvalidaError,
  repositorioSessoes,
} from '../../dados/repositorios/sessoes'
import type { SerieRealizada } from '../../domain/tipos'
import { formatarCarga } from '../../plataforma/formato'
import estilos from './execucao.module.css'

type Props = {
  serie: SerieRealizada
  aoFechar: () => void
}

export function EditorSerieRegistrada({ serie, aoFechar }: Props) {
  const [cargaKg, definirCarga] = useState<string>(serie.cargaKg?.toString() ?? '')
  const [repeticoes, definirRepeticoes] = useState<string>(serie.repeticoes?.toString() ?? '')
  const [rir, definirRir] = useState<string>(serie.rir?.toString() ?? '')
  const [confirmandoRemocao, definirConfirmandoRemocao] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)
  const [ocupado, definirOcupado] = useState(false)

  const paraNumero = (texto: string) => (texto.trim() === '' ? null : Number(texto))

  async function salvar() {
    definirOcupado(true)
    try {
      await repositorioSessoes.corrigirSerieEmAndamento(serie.id, {
        cargaKg: paraNumero(cargaKg),
        repeticoes: paraNumero(repeticoes),
        rir: paraNumero(rir),
      })
      aoFechar()
    } catch (falha) {
      definirErro(
        falha instanceof CorrecaoInvalidaError
          ? falha.message
          : 'Não foi possível salvar a correção. Nada foi alterado.',
      )
      definirOcupado(false)
    }
  }

  async function remover() {
    definirOcupado(true)
    try {
      await repositorioSessoes.removerSerieEmAndamento(serie.id)
      aoFechar()
    } catch {
      definirErro('Não foi possível remover a série. Nada foi alterado.')
      definirOcupado(false)
    }
  }

  return (
    <div
      className={estilos.painelSerie}
      role="dialog"
      aria-modal="true"
      aria-label={`Série ${serie.ordem}`}
      data-sem-gesto
    >
      <header className={estilos.cabecalhoPainel}>
        <h2 className={estilos.tituloDialogo}>
          Série <span className="numerico">{serie.ordem}</span>
        </h2>
        <Botao variante="discreto" onClick={aoFechar} disabled={ocupado}>
          Cancelar
        </Botao>
      </header>

      {erro ? (
        <Faixa tom="critica" papel="alert">
          {erro}
        </Faixa>
      ) : null}

      {confirmandoRemocao ? (
        <>
          <p>
            Remover a série <span className="numerico">{serie.ordem}</span>
            {serie.repeticoes !== null ? (
              <>
                , de{' '}
                <strong className="numerico">
                  {formatarCarga(serie.cargaKg)} kg × {serie.repeticoes}
                </strong>
              </>
            ) : null}
            ? As séries seguintes deste exercício são renumeradas.
          </p>
          <div className={estilos.acoesDialogo}>
            <Botao
              variante="secundario"
              onClick={() => definirConfirmandoRemocao(false)}
              disabled={ocupado}
            >
              Manter
            </Botao>
            <Botao variante="destrutivo" onClick={() => void remover()} disabled={ocupado}>
              Remover série
            </Botao>
          </div>
        </>
      ) : (
        <>
          <Campo
            rotulo="Carga (kg)"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={cargaKg}
            onChange={(evento) => definirCarga(evento.target.value)}
          />
          <Campo
            rotulo="Repetições"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={repeticoes}
            onChange={(evento) => definirRepeticoes(evento.target.value)}
          />
          <Campo
            rotulo="RIR"
            dica="Opcional."
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={rir}
            onChange={(evento) => definirRir(evento.target.value)}
          />

          <div className={estilos.acoesDialogo}>
            <Botao
              variante="secundario"
              onClick={() => definirConfirmandoRemocao(true)}
              disabled={ocupado}
            >
              Remover
            </Botao>
            <Botao onClick={() => void salvar()} disabled={ocupado}>
              {ocupado ? 'Salvando…' : 'Salvar'}
            </Botao>
          </div>
        </>
      )}
    </div>
  )
}
