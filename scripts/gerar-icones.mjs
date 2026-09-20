/**
 * Gera os ícones da PWA sem dependência de ferramenta externa.
 *
 * A marca é uma anilha vista de frente com a barra atravessando — o objeto
 * central do assunto do produto. Fundo no azul da anilha de 20 kg, o mesmo
 * acento único da interface.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DESTINO = resolve(AQUI, '..', 'public', 'icons')

const AZUL = [0x14, 0x49, 0xb8]
const PAPEL = [0xf7, 0xf7, 0xf5]

function crc32(buf) {
  let c
  const tabela = []
  for (let n = 0; n < 256; n += 1) {
    c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pedaco(tipo, dados) {
  const comprimento = Buffer.alloc(4)
  comprimento.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([comprimento, corpo, crc])
}

function png(largura, altura, pixels) {
  const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  const linhas = []
  for (let y = 0; y < altura; y += 1) {
    linhas.push(Buffer.from([0]))
    linhas.push(pixels.subarray(y * largura * 4, (y + 1) * largura * 4))
  }
  return Buffer.concat([
    assinatura,
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

/** Cobertura de um pixel por amostragem 4x4 — bordas suaves sem biblioteca. */
function cobertura(x, y, dentro) {
  let acertos = 0
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) {
      if (dentro(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) acertos += 1
    }
  }
  return acertos / 16
}

function desenhar(tamanho, { margem }) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4)
  const centro = tamanho / 2
  const raioExterno = (tamanho / 2) * (1 - margem)
  const raioInterno = raioExterno * 0.44

  // Uma anilha vista de frente, e nada mais. A barra atravessando some a 40 px
  // no iPhone, que é o tamanho em que o ícone precisa funcionar.
  const naMarca = (x, y) => {
    const distancia = Math.hypot(x - centro, y - centro)
    return distancia <= raioExterno && distancia >= raioInterno
  }

  for (let y = 0; y < tamanho; y += 1) {
    for (let x = 0; x < tamanho; x += 1) {
      const alfa = cobertura(x, y, naMarca)
      const i = (y * tamanho + x) * 4
      const cor = [
        Math.round(AZUL[0] + (PAPEL[0] - AZUL[0]) * alfa),
        Math.round(AZUL[1] + (PAPEL[1] - AZUL[1]) * alfa),
        Math.round(AZUL[2] + (PAPEL[2] - AZUL[2]) * alfa),
      ]
      pixels[i] = cor[0]
      pixels[i + 1] = cor[1]
      pixels[i + 2] = cor[2]
      pixels[i + 3] = 255
    }
  }
  return png(tamanho, tamanho, pixels)
}

mkdirSync(DESTINO, { recursive: true })

const saidas = [
  ['icone-180.png', 180, 0.16],
  ['icone-192.png', 192, 0.16],
  ['icone-512.png', 512, 0.16],
  // `maskable` precisa de zona segura: a marca ocupa o círculo interno de 80%.
  ['icone-mascara-512.png', 512, 0.28],
]

for (const [nome, tamanho, margem] of saidas) {
  writeFileSync(resolve(DESTINO, nome), desenhar(tamanho, { margem }))
  console.log(`gerado ${nome} (${tamanho}x${tamanho})`)
}
