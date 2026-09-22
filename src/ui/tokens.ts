/**
 * Tokens de tema — D9 critério 1, SC-009, T021.
 *
 * O contraste de 4,5:1 é **garantido por construção, não verificado caso a
 * caso**. O mecanismo é este arquivo: as cores não são expostas soltas, e sim
 * em **pares texto/fundo já validados**. Um componente consome um par; não
 * existe API aqui que permita montar uma combinação reprovada por descuido.
 *
 * O teste em `tests/unidade/ui/tokens.test.ts` recalcula todos os pares e falha
 * se algum cair abaixo do piso — o que transforma a garantia de promessa em
 * verificação de máquina.
 *
 * Direção visual: ver `docs/direcao-visual.md`.
 */

/* ------------------------------------------------------------------ *
 * Paleta base
 * ------------------------------------------------------------------ */

export const CORES = {
  /** Fundo da página. Quase branco: alta luminância sem o brilho do branco puro. */
  papel: '#F7F7F5',
  /**
   * Superfície elevada. Branco puro — a elevação nesta interface é expressa por
   * **luminância**, nunca por sombra, transparência ou blur (D9 critério 2). O
   * elemento mais claro da tela é sempre onde o usuário digita.
   */
  carta: '#FFFFFF',
  /** Tinta principal. Escuro azulado, aparentado ao acento. */
  tinta: '#101826',
  /** Tinta secundária: rótulos e metadados. */
  tintaSecundaria: '#5A6472',
  /** Acento único: o azul da anilha de 20 kg. */
  acento: '#1449B8',
  /** O mesmo azul sob o dedo. Token, e não literal na folha: todo par de cor
      do produto passa pela validação de contraste, inclusive os de estado. */
  acentoPressionado: '#0F3A93',
  /** Fundo tênue do acento, para faixas e marcadores. */
  acentoTenue: '#EAF0FC',
  /** Acima da meta / progressão possível. */
  positivo: '#146B3A',
  positivoTenue: '#E8F3EC',
  /** Estado degradado de persistência (FR-122). */
  atencao: '#8A4B10',
  atencaoTenue: '#FBF0E4',
  /** Falha ao persistir, ação destrutiva (FR-058). */
  critico: '#A61B1B',
  criticoTenue: '#FBEBEB',
  /** Régua do livro-razão. Decorativa, não delimita controle. */
  linha: '#E2E4E8',
  /**
   * Fundo de controle indisponível. Opacidade resolveria em uma linha e
   * derrubaria o contraste abaixo do piso — o critério 1 de D9 exige que ele
   * seja garantido por construção, inclusive nos estados.
   */
  desabilitadoFundo: '#EDEFF2',
  /** Contorno de controle — piso de 3:1 (WCAG 1.4.11). */
  contorno: '#737C8A',
  branco: '#FFFFFF',
} as const

export type NomeCor = keyof typeof CORES

/* ------------------------------------------------------------------ *
 * Pares validados — a unidade que os componentes consomem
 * ------------------------------------------------------------------ */

export type ParDeCor = {
  readonly texto: string
  readonly fundo: string
}

/** Todo par aqui é texto sobre fundo, com piso de 4,5:1. */
export const PARES = {
  paginaPrimaria: { texto: CORES.tinta, fundo: CORES.papel },
  paginaSecundaria: { texto: CORES.tintaSecundaria, fundo: CORES.papel },
  paginaAcento: { texto: CORES.acento, fundo: CORES.papel },

  cartaPrimaria: { texto: CORES.tinta, fundo: CORES.carta },
  cartaSecundaria: { texto: CORES.tintaSecundaria, fundo: CORES.carta },
  cartaAcento: { texto: CORES.acento, fundo: CORES.carta },

  acaoPrimaria: { texto: CORES.branco, fundo: CORES.acento },
  acaoPrimariaPressionada: { texto: CORES.branco, fundo: CORES.acentoPressionado },
  acaoDestrutiva: { texto: CORES.branco, fundo: CORES.critico },

  faixaAcento: { texto: CORES.acento, fundo: CORES.acentoTenue },
  faixaPositiva: { texto: CORES.positivo, fundo: CORES.positivoTenue },
  faixaAtencao: { texto: CORES.atencao, fundo: CORES.atencaoTenue },
  faixaCritica: { texto: CORES.critico, fundo: CORES.criticoTenue },

  positivoEmCarta: { texto: CORES.positivo, fundo: CORES.carta },
  controleDesabilitado: { texto: CORES.tintaSecundaria, fundo: CORES.desabilitadoFundo },
  atencaoEmPagina: { texto: CORES.atencao, fundo: CORES.papel },
  criticoEmCarta: { texto: CORES.critico, fundo: CORES.carta },
} as const satisfies Record<string, ParDeCor>

export type NomeDePar = keyof typeof PARES

/** Pares de contorno de controle — piso de 3:1, não 4,5:1: não são texto. */
export const CONTORNOS = {
  controleEmCarta: { traco: CORES.contorno, fundo: CORES.carta },
  controleEmPagina: { traco: CORES.contorno, fundo: CORES.papel },
} as const

/* ------------------------------------------------------------------ *
 * Cálculo de contraste — WCAG 2.1
 * ------------------------------------------------------------------ */

export const PISO_CONTRASTE_TEXTO = 4.5
export const PISO_CONTRASTE_CONTROLE = 3

function canalLinear(valor: number): number {
  const normalizado = valor / 255
  return normalizado <= 0.04045
    ? normalizado / 12.92
    : Math.pow((normalizado + 0.055) / 1.055, 2.4)
}

export function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '')
  const r = canalLinear(parseInt(limpo.slice(0, 2), 16))
  const g = canalLinear(parseInt(limpo.slice(2, 4), 16))
  const b = canalLinear(parseInt(limpo.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function razaoDeContraste(corA: string, corB: string): number {
  const a = luminanciaRelativa(corA)
  const b = luminanciaRelativa(corB)
  const claro = Math.max(a, b)
  const escuro = Math.min(a, b)
  return (claro + 0.05) / (escuro + 0.05)
}

export function contrasteDoPar(par: ParDeCor): number {
  return razaoDeContraste(par.texto, par.fundo)
}

/* ------------------------------------------------------------------ *
 * Escala tipográfica, espaçamento e alvos de toque
 * ------------------------------------------------------------------ */

/**
 * Archivo variável, servida localmente em `public/fontes/`. Não há fonte de
 * CDN: FR-057 proíbe dependência de rede depois da instalação, e uma família
 * hospedada por terceiro é exatamente isso.
 *
 * O eixo de largura (`wdth`) é o recurso de exibição: os numerais da série
 * corrente são expandidos, o resto da interface é normal. É a própria tipografia
 * fazendo a hierarquia que D9 critério 3 exige, sem uma segunda família.
 */
export const TIPOGRAFIA = {
  familia: "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  escala: {
    numeral: '4.5rem', // 72px — carga e repetições da série corrente
    numeralMedio: '2.5rem', // 40px
    titulo: '1.5rem', // 24px
    subtitulo: '1.25rem', // 20px
    corpo: '1.0625rem', // 17px
    apoio: '0.9375rem', // 15px
    rotulo: '0.8125rem', // 13px
    micro: '0.6875rem', // 11px
  },
  peso: { normal: 400, medio: 500, forte: 600, maximo: 800 },
  largura: { estreita: 88, normal: 100, expandida: 118 },
} as const

/** Ritmo vertical em grade de 4 px. */
export const ESPACO = {
  x0: '0',
  x1: '0.25rem',
  x2: '0.5rem',
  x3: '0.75rem',
  x4: '1rem',
  x5: '1.25rem',
  x6: '1.5rem',
  x8: '2rem',
  x10: '2.5rem',
  x12: '3rem',
} as const

/**
 * Raios diferenciados por função. Um raio único em tudo apaga hierarquia — o
 * cartão da série corrente precisa se distinguir do campo dentro dele.
 */
export const RAIO = {
  nenhum: '0',
  campo: '0.5rem',
  carta: '0.75rem',
  acao: '0.625rem',
  pilula: '999px',
} as const

/** Piso constitucional de área de toque: 44 x 44 pontos (FR-054, SC-009). */
export const ALVO_DE_TOQUE_MINIMO = '44px'
/** Ação primária da tela de execução, onde o toque precisa ser barato. */
export const ALVO_DE_TOQUE_PRIMARIO = '56px'

/* ------------------------------------------------------------------ *
 * Emissão como custom properties
 * ------------------------------------------------------------------ */

/** Nome da custom property de um par: `--par-<nome>-texto` / `-fundo`. */
export function variaveisDoTema(): Record<string, string> {
  const variaveis: Record<string, string> = {}

  for (const [nome, valor] of Object.entries(CORES)) {
    variaveis[`--cor-${paraKebab(nome)}`] = valor
  }
  for (const [nome, par] of Object.entries(PARES)) {
    variaveis[`--par-${paraKebab(nome)}-texto`] = par.texto
    variaveis[`--par-${paraKebab(nome)}-fundo`] = par.fundo
  }
  for (const [nome, valor] of Object.entries(TIPOGRAFIA.escala)) {
    variaveis[`--texto-${paraKebab(nome)}`] = valor
  }
  for (const [nome, valor] of Object.entries(ESPACO)) {
    variaveis[`--espaco-${nome}`] = valor
  }
  for (const [nome, valor] of Object.entries(RAIO)) {
    variaveis[`--raio-${paraKebab(nome)}`] = valor
  }

  variaveis['--fonte-familia'] = TIPOGRAFIA.familia
  variaveis['--alvo-toque'] = ALVO_DE_TOQUE_MINIMO
  variaveis['--alvo-toque-primario'] = ALVO_DE_TOQUE_PRIMARIO
  return variaveis
}

function paraKebab(valor: string): string {
  return valor.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)
}

/** Estilo inline de um par validado, para componentes. */
export function estiloDoPar(nome: NomeDePar): { color: string; backgroundColor: string } {
  const par = PARES[nome]
  return { color: par.texto, backgroundColor: par.fundo }
}
