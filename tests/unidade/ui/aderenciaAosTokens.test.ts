import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CORES } from '../../../src/ui/tokens'

/**
 * T115 — SC-008, SC-009, D9 critério 1.
 *
 * O contraste é garantido **por construção** pelos pares de `src/ui/tokens.ts`,
 * e `tokens.test.ts` prova que todo par passa no piso. Esta auditoria verifica a
 * outra metade: que as telas realmente **consomem os tokens**, em vez de
 * escrever cores à mão.
 *
 * É a diferença entre "as cores certas existem" e "só as cores certas são
 * usadas". Uma cor literal numa folha de estilo escapa da validação inteira, e
 * é exatamente assim que uma combinação reprovada entra sem ninguém notar.
 */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src')

function arquivos(diretorio: string, extensoes: readonly string[]): string[] {
  const encontrados: string[] = []
  for (const entrada of readdirSync(diretorio)) {
    const caminho = join(diretorio, entrada)
    if (statSync(caminho).isDirectory()) {
      encontrados.push(...arquivos(caminho, extensoes))
    } else if (extensoes.some((extensao) => entrada.endsWith(extensao))) {
      encontrados.push(caminho)
    }
  }
  return encontrados
}

const CORES_CONHECIDAS = new Set(Object.values(CORES).map((cor) => cor.toLowerCase()))

/** `src/ui/tokens.ts` é onde as cores nascem; `tema.css` só as emite. */
const ISENTOS = ['ui/tokens.ts']

const PADRAO_HEX = /#[0-9a-fA-F]{3,8}\b/g
const PADRAO_FUNCAO_DE_COR = /\b(rgba?|hsla?|oklch|color-mix)\s*\(/g

/**
 * Comentários são removidos antes de auditar. Sem isso, a própria nota que
 * explica *por que* a tela de execução não usa `backdrop-filter` faria a
 * auditoria acusar `backdrop-filter`.
 */
function semComentarios(conteudo: string): string {
  return conteudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** `&#8209;` é hífen não separável, não cor. */
function semEntidadesHtml(conteudo: string): string {
  return conteudo.replace(/&#\d+;/g, '')
}

describe('aderência aos tokens de cor (D9 critério 1)', () => {
  const folhas = arquivos(RAIZ, ['.css'])
  const fontes = arquivos(RAIZ, ['.ts', '.tsx'])

  it('encontra as folhas de estilo do projeto', () => {
    expect(folhas.length).toBeGreaterThan(3)
  })

  it.each(folhas.map((caminho) => [relative(RAIZ, caminho), caminho]))(
    'a folha %s não usa cor literal fora dos tokens',
    (_nome, caminho) => {
      const conteudo = semComentarios(readFileSync(caminho, 'utf8'))
      const hexes = [...conteudo.matchAll(PADRAO_HEX)].map((achado) => achado[0].toLowerCase())
      const forasteiras = hexes.filter((hex) => !CORES_CONHECIDAS.has(hex))

      expect(forasteiras).toEqual([])
    },
  )

  it.each(folhas.map((caminho) => [relative(RAIZ, caminho), caminho]))(
    'a folha %s não monta cor por função, que escaparia da validação',
    (_nome, caminho) => {
      const conteudo = semComentarios(readFileSync(caminho, 'utf8'))
      expect([...conteudo.matchAll(PADRAO_FUNCAO_DE_COR)].map((a) => a[0])).toEqual([])
    },
  )

  it.each(
    fontes
      .filter((caminho) => !ISENTOS.some((isento) => caminho.endsWith(isento)))
      .map((caminho) => [relative(RAIZ, caminho), caminho]),
  )('o arquivo %s não escreve cor literal', (_nome, caminho) => {
    const conteudo = semEntidadesHtml(semComentarios(readFileSync(caminho, 'utf8')))
    const hexes = [...conteudo.matchAll(PADRAO_HEX)].map((achado) => achado[0].toLowerCase())
    const forasteiras = hexes.filter((hex) => !CORES_CONHECIDAS.has(hex))

    expect(forasteiras).toEqual([])
  })
})

/**
 * SC-009 — alvo de toque de no mínimo 44 x 44 pt.
 *
 * A verificação é estrutural: todo controle interativo das folhas declara
 * `min-height` ligado ao token de alvo de toque, e nenhum declara altura fixa
 * menor que ele.
 */
describe('alvos de toque (SC-009, FR-054)', () => {
  const folhas = arquivos(RAIZ, ['.css'])

  it('nenhuma folha fixa altura de controle abaixo de 44 px', () => {
    const problemas: string[] = []

    for (const caminho of folhas) {
      const conteudo = semComentarios(readFileSync(caminho, 'utf8'))
      // `min-height` e `height` com valor em px abaixo de 44 em regras que
      // também declaram `cursor: pointer` são o caso suspeito.
      const regras = conteudo.split('}')

      for (const regra of regras) {
        if (!regra.includes('cursor: pointer')) continue
        const alturas = [...regra.matchAll(/(?:min-)?height:\s*(\d+(?:\.\d+)?)px/g)]
        for (const altura of alturas) {
          if (Number(altura[1]) < 44) {
            problemas.push(`${relative(RAIZ, caminho)}: ${altura[0]}`)
          }
        }
      }
    }

    expect(problemas).toEqual([])
  })

  it('os componentes de interação declaram o token de alvo de toque', () => {
    const componentes = semComentarios(readFileSync(join(RAIZ, 'ui/componentes.module.css'), 'utf8'))
    for (const classe of ['.botao', '.entrada', '.passoBotao', '.pilula']) {
      const bloco = componentes.slice(componentes.indexOf(classe))
      const corpo = bloco.slice(0, bloco.indexOf('}'))
      // `height` fixo vale para o botão quadrado; `min-height` para os demais.
      expect(corpo).toMatch(/(?:min-)?height:\s*var\(--alvo-toque/)
    }
  })

  it('a ação primária da execução usa o alvo maior', () => {
    const componentes = readFileSync(join(RAIZ, 'ui/componentes.module.css'), 'utf8')
    expect(componentes).toMatch(/--alvo-toque-primario/)
  })
})

/**
 * D9 critério 2 — a tela de execução não usa transparência, blur nem efeito
 * cujo custo de renderização dependa do conteúdo sob o elemento.
 *
 * Verificado por ferramenta, porque "eu não usei" não é garantia contra a
 * próxima alteração.
 */
describe('restrições visuais da execução (D9 critério 2)', () => {
  const PROIBIDOS = [
    /backdrop-filter/,
    /filter:\s*blur/,
    /box-shadow/,
    /\bopacity:\s*0?\.\d/,
    /rgba\(/,
    /mix-blend-mode/,
  ]

  it.each(PROIBIDOS.map((padrao) => [String(padrao), padrao]))(
    'a folha da execução não contém %s',
    (_nome, padrao) => {
      const conteudo = semComentarios(
        readFileSync(join(RAIZ, 'funcionalidades/execucao/execucao.module.css'), 'utf8'),
      )
      expect(padrao.test(conteudo)).toBe(false)
    },
  )

  it('nenhuma folha do projeto usa blur de fundo', () => {
    for (const caminho of arquivos(RAIZ, ['.css'])) {
      expect(semComentarios(readFileSync(caminho, 'utf8'))).not.toMatch(/backdrop-filter/)
    }
  })

  /**
   * Opacidade sobre conteúdo derruba o contraste abaixo do piso, e o piso vale
   * também para o estado indisponível. A verificação vale para **todas** as
   * folhas: antes ela cobria só a da execução, e o mesmo problema estava em
   * `componentes.module.css` sem ninguém acusar.
   */
  it('nenhuma folha usa opacidade fracionária sobre conteúdo', () => {
    for (const caminho of arquivos(RAIZ, ['.css'])) {
      const conteudo = semComentarios(readFileSync(caminho, 'utf8'))
      expect(
        [...conteudo.matchAll(/\bopacity:\s*0?\.\d+/g)].map((a) => a[0]),
        relative(RAIZ, caminho),
      ).toEqual([])
    }
  })
})
