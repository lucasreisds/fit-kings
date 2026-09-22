/**
 * Correção e remoção de série na sessão **em andamento** — FR-133 a FR-136, D2.
 *
 * A fronteira com FR-113 e FR-114 é o **estado da sessão**, e ela não é
 * arbitrária: uma sessão concluída é registro histórico, e alterá-la sem rastro
 * violaria o Princípio I — daí o versionamento. Uma sessão em andamento é o
 * rascunho que o usuário está escrevendo agora, e cada série já foi gravada de
 * forma durável no ato da confirmação.
 *
 * Versionar cada toque de correção numa sessão aberta produziria dezenas de
 * versões descartáveis e nenhuma garantia nova.
 *
 * Funções puras: decidem o resultado, não gravam. Quem grava é o repositório.
 */
import type { Id } from '../tipos/base'
import type { SerieRealizada } from '../tipos/sessao'

/** Meta planejada, reduzida ao que a re-vinculação precisa saber. */
export type MetaPorPosicao = {
  readonly ordem: number
  readonly seriePlanejadaId: Id
}

/**
 * Renumera as séries restantes depois de uma remoção e **re-vincula cada uma à
 * meta da sua nova posição** (FR-135).
 *
 * A re-vinculação é o ponto sutil. Se o usuário fez três séries e apaga a
 * segunda, sobram duas — e elas cumprem a primeira e a segunda meta. Manter o
 * vínculo antigo faria a segunda série restante comparar-se com a terceira
 * meta, e `estadoExercicioSessao()` ficaria incoerente: duas séries válidas de
 * três planejadas continuariam "parcial", mas a comparação apontaria para a
 * meta errada.
 *
 * Série que não tinha meta — extra ou de exercício fora do plano — permanece
 * sem meta, mesmo que a renumeração a coloque dentro do intervalo planejado.
 * Ela foi registrada como extra, e reescrever isso seria inventar história.
 */
export function renumerarAposRemocao(
  restantes: readonly SerieRealizada[],
  metas: readonly MetaPorPosicao[],
): SerieRealizada[] {
  const ordenadas = [...restantes].sort((a, b) => a.ordem - b.ordem)

  return ordenadas.map((serie, indice) => {
    const novaOrdem = indice + 1
    const meta = metas[indice]

    return {
      ...serie,
      ordem: novaOrdem,
      // Sem meta antes, sem meta depois.
      seriePlanejadaId: serie.seriePlanejadaId === null ? null : (meta?.seriePlanejadaId ?? null),
    }
  })
}

export type ProblemaDoRascunho = {
  readonly codigo: 'sessao_nao_esta_em_andamento' | 'serie_inexistente' | 'valor_invalido'
  readonly mensagem: string
}

export type CorrecaoDeRascunho = {
  readonly cargaKg?: number | null
  readonly repeticoes?: number | null
  readonly rir?: number | null
}

/**
 * Valida uma correção de rascunho. Mais permissiva que a de sessão concluída,
 * de propósito: aqui o usuário está registrando, e travar a digitação seria
 * pior do que aceitar um valor que ele vai corrigir em seguida.
 */
export function validarCorrecaoDeRascunho(
  correcao: CorrecaoDeRascunho,
): readonly ProblemaDoRascunho[] {
  const problemas: ProblemaDoRascunho[] = []

  if (correcao.repeticoes !== undefined && correcao.repeticoes !== null) {
    if (!Number.isInteger(correcao.repeticoes) || correcao.repeticoes < 0) {
      problemas.push({
        codigo: 'valor_invalido',
        mensagem: 'As repetições são um número inteiro de 0 para cima.',
      })
    }
  }
  if (correcao.cargaKg !== undefined && correcao.cargaKg !== null) {
    if (!Number.isFinite(correcao.cargaKg) || correcao.cargaKg < 0) {
      problemas.push({ codigo: 'valor_invalido', mensagem: 'A carga é zero ou mais.' })
    }
  }
  if (correcao.rir !== undefined && correcao.rir !== null) {
    if (!Number.isInteger(correcao.rir) || correcao.rir < 0) {
      problemas.push({
        codigo: 'valor_invalido',
        mensagem: 'O RIR é um número inteiro de 0 para cima.',
      })
    }
  }

  return problemas
}
