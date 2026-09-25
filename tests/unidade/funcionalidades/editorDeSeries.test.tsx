import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorSeries } from '../../../src/funcionalidades/treinos/EditorSeries'
import { projetarSeriesPlanejadas } from '../../../src/funcionalidades/treinos/projecaoDeSeries'
import type { ValoresPlanejados } from '../../../src/domain/treino'
import { umaSeriePlanejada } from '../../apoio/fabricas'
import type { SeriePlanejada } from '../../../src/domain/tipos'

/**
 * Aplica a alteração pedida sobre a base indicada.
 *
 * `aoMudar` passou a receber **como alterar** em vez do conjunto pronto, para
 * que a gravação parta do que está no banco e não do que a tela renderizou por
 * último — ver `EditorSeries`. Aqui a base é explícita, que é o que torna o
 * teste capaz de dizer se a alteração foi aplicada ao lugar certo.
 */
function aplicar(
  aoMudar: ReturnType<typeof vi.fn>,
  base: readonly ValoresPlanejados[],
  chamada = 0,
): readonly ValoresPlanejados[] {
  const transformar = aoMudar.mock.calls[chamada]![0] as (
    atuais: readonly ValoresPlanejados[],
  ) => readonly ValoresPlanejados[]
  return transformar(base)
}

/**
 * T001, T002 — FR-158, FR-159, SC-047, SC-048.
 *
 * **O teste que faltava, e a razão de ele faltar.**
 *
 * O campo de máximo do intervalo foi entregue quebrado e atravessou 554 testes.
 * Não por falta de cobertura — por *forma* de cobertura. Havia teste do
 * componente do campo, que recebia a série pronta e a exibia certo. Havia teste
 * da regra de domínio, que avaliava o intervalo certo. Nenhum percorria o
 * trecho entre os dois, e era exatamente ali que o valor se perdia.
 *
 * A lição, que vale além deste defeito: **testar as duas pontas de um caminho
 * não testa o caminho.**
 */

/** Todo valor editável de uma série planejada, e onde ele aparece na tela. */
const VALORES_EDITAVEIS = [
  { campo: 'repeticoes', valor: 6, rotulo: /^Repetições da série 1$/ },
  { campo: 'repeticoesMax', valor: 8, rotulo: /Máximo de repetições da série 1/ },
  { campo: 'cargaKg', valor: 42.5, rotulo: /Carga da série 1 em quilos/ },
  { campo: 'rir', valor: 2, rotulo: /RIR da série 1/ },
] as const

function serieGravadaComTudoPreenchido(): SeriePlanejada {
  return umaSeriePlanejada(
    Object.fromEntries(VALORES_EDITAVEIS.map(({ campo, valor }) => [campo, valor])),
  )
}

describe('o caminho do registro gravado até o campo da tela (FR-158)', () => {
  it.each(VALORES_EDITAVEIS)(
    'o valor de "$campo" gravado chega ao campo correspondente',
    ({ campo, valor, rotulo }) => {
      const gravada = serieGravadaComTudoPreenchido()

      // O caminho real: registro gravado → projeção → editor → campo.
      render(<EditorSeries series={projetarSeriesPlanejadas([gravada])} aoMudar={vi.fn()} />)

      const exibido = (screen.getByLabelText(rotulo) as HTMLInputElement).value

      expect(
        exibido,
        `o valor de "${campo}" não chegou ao campo: gravado ${valor}, exibido ${JSON.stringify(exibido)}`,
      ).toBe(String(valor))
    },
  )

  it('nenhum valor editável se perde no caminho (SC-047, SC-048)', () => {
    const gravada = serieGravadaComTudoPreenchido()
    const [projetada] = projetarSeriesPlanejadas([gravada])

    // Falhando, esta asserção **nomeia** o campo perdido — é o que FR-159 pede,
    // e o que faria a diferença se o defeito voltasse noutro campo.
    const perdidos = VALORES_EDITAVEIS.filter(
      ({ campo }) => (projetada as Record<string, unknown>)[campo] !== gravada[campo],
    ).map(({ campo }) => campo)

    expect(perdidos, `valores perdidos na projeção: ${perdidos.join(', ')}`).toEqual([])
  })

  it('a projeção leva apenas o que é editável, e nada do registro', () => {
    const gravada = serieGravadaComTudoPreenchido()
    const [projetada] = projetarSeriesPlanejadas([gravada])

    // Identificador e carimbos são do registro, não do formulário: levá-los
    // abriria caminho para a tela reescrevê-los sem querer.
    for (const campo of ['id', 'criadoEm', 'alteradoEm', 'excluidoEm', 'itemTreinoId']) {
      expect(projetada).not.toHaveProperty(campo)
    }
  })
})

describe('comportamentos que o defeito escondia', () => {
  it('série de valor único mostra o campo de máximo vazio (FR-152)', () => {
    const gravada = umaSeriePlanejada({ repeticoes: 8, repeticoesMax: null })
    render(<EditorSeries series={projetarSeriesPlanejadas([gravada])} aoMudar={vi.fn()} />)

    const maximo = screen.getByLabelText(/Máximo de repetições da série 1/) as HTMLInputElement
    // Vazio, e **não** preenchido com o valor de repetições: quem não usa
    // intervalo não precisa saber que o campo existe.
    expect(maximo.value).toBe('')
  })

  it('digitar um número de dois dígitos produz aquele número (FR-154, SC-045)', () => {
    const gravada = umaSeriePlanejada({ repeticoes: 6, repeticoesMax: null })
    const aoMudar = vi.fn()
    render(<EditorSeries series={projetarSeriesPlanejadas([gravada])} aoMudar={aoMudar} />)

    fireEvent.change(screen.getByLabelText(/Máximo de repetições da série 1/), {
      target: { value: '12' },
    })

    expect(aoMudar).toHaveBeenCalledTimes(1)
    expect(aplicar(aoMudar, projetarSeriesPlanejadas([gravada]))[0]).toMatchObject({
      repeticoes: 6,
      repeticoesMax: 12,
    })
  })

  it('esvaziar o campo devolve a série ao valor único (FR-155, SC-046)', () => {
    const gravada = umaSeriePlanejada({ repeticoes: 6, repeticoesMax: 8 })
    const aoMudar = vi.fn()
    render(<EditorSeries series={projetarSeriesPlanejadas([gravada])} aoMudar={aoMudar} />)

    fireEvent.change(screen.getByLabelText(/Máximo de repetições da série 1/), {
      target: { value: '' },
    })

    expect(aplicar(aoMudar, projetarSeriesPlanejadas([gravada]))[0]).toMatchObject({
      repeticoes: 6,
      repeticoesMax: null,
    })
  })

  it('alterar um máximo já gravado funciona (FR-156)', () => {
    // É o caminho de quem tem valor gravado sem intenção, durante o defeito.
    const gravada = umaSeriePlanejada({ repeticoes: 6, repeticoesMax: 9 })
    const aoMudar = vi.fn()
    render(<EditorSeries series={projetarSeriesPlanejadas([gravada])} aoMudar={aoMudar} />)

    const campo = screen.getByLabelText(/Máximo de repetições da série 1/) as HTMLInputElement
    expect(campo.value).toBe('9')

    fireEvent.change(campo, { target: { value: '10' } })
    expect(aplicar(aoMudar, projetarSeriesPlanejadas([gravada]))[0]).toMatchObject({
      repeticoes: 6,
      repeticoesMax: 10,
    })
  })

  /**
   * A alteração é aplicada sobre o que está gravado, não sobre o que a tela
   * renderizou. É esta a propriedade que faz a segunda tecla parar de desfazer
   * a primeira — o resto é consequência dela (FR-166).
   */
  it('a alteração parte do conjunto que receber, não do que foi renderizado', () => {
    const renderizada = umaSeriePlanejada({ repeticoes: 10, repeticoesMax: null })
    const aoMudar = vi.fn()
    render(<EditorSeries series={projetarSeriesPlanejadas([renderizada])} aoMudar={aoMudar} />)

    fireEvent.change(screen.getByLabelText(/Máximo de repetições da série 1/), {
      target: { value: '8' },
    })

    // Enquanto o "8" ia pelo ar, o "6" do mínimo já tinha sido gravado.
    const gravadaDesde = projetarSeriesPlanejadas([
      umaSeriePlanejada({ repeticoes: 6, repeticoesMax: null }),
    ])

    expect(aplicar(aoMudar, gravadaDesde)[0]).toMatchObject({
      repeticoes: 6,
      repeticoesMax: 8,
    })
  })
})
