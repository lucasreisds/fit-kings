import { describe, expect, it } from 'vitest'
import {
  avaliarLembrete,
  intervaloEmDias,
  textoDoLembrete,
  UM_DIA_MS,
  type EntradaDoLembrete,
} from '../../../src/domain/backup/lembrete'

/**
 * T132 — FR-110, FR-122, SC-028, SC-033.
 *
 * Relógio controlado, sem interface. Todo instante é parâmetro: a regra não lê
 * o relógio do sistema, e é por isso que ela é testável assim (Princípio V).
 */

const ANCORA = '2026-06-01T12:00:00.000Z'

function emDias(dias: number): string {
  return new Date(Date.parse(ANCORA) + dias * UM_DIA_MS).toISOString()
}

function entrada(parcial: Partial<EntradaDoLembrete> = {}): EntradaDoLembrete {
  return {
    agora: ANCORA,
    ultimoBackupEm: ANCORA,
    persistenciaConcedida: true,
    primeiroRegistroEm: ANCORA,
    haSessaoEmAndamento: false,
    ...parcial,
  }
}

describe('intervalo (FR-122, SC-033)', () => {
  it('é de 7 dias com persistência concedida', () => {
    expect(intervaloEmDias(true)).toBe(7)
  })

  it('cai para 2 dias sem persistência concedida', () => {
    expect(intervaloEmDias(false)).toBe(2)
  })

  it('cai para 2 dias quando a plataforma não responde — a dúvida conta como não concedida', () => {
    expect(intervaloEmDias(null)).toBe(2)
  })
})

describe('com persistência concedida — intervalo de 7 dias', () => {
  it('6 dias não apresenta', () => {
    const resultado = avaliarLembrete(entrada({ agora: emDias(6) }))
    expect(resultado.apresentar).toBe(false)
    expect(resultado.motivo).toBe('dentro_do_intervalo')
  })

  it('8 dias apresenta', () => {
    const resultado = avaliarLembrete(entrada({ agora: emDias(8) }))
    expect(resultado.apresentar).toBe(true)
    expect(resultado.diasDesdeAncora).toBe(8)
  })

  it('exatamente 7 dias ainda não apresenta — o vencimento é estrito', () => {
    expect(avaliarLembrete(entrada({ agora: emDias(7) })).apresentar).toBe(false)
  })
})

describe('sem persistência concedida — intervalo de 2 dias', () => {
  it('1 dia não apresenta', () => {
    const resultado = avaliarLembrete(
      entrada({ agora: emDias(1), persistenciaConcedida: false }),
    )
    expect(resultado.apresentar).toBe(false)
    expect(resultado.intervaloDias).toBe(2)
  })

  it('3 dias apresenta', () => {
    expect(
      avaliarLembrete(entrada({ agora: emDias(3), persistenciaConcedida: false })).apresentar,
    ).toBe(true)
  })

  it('o mesmo intervalo de 3 dias não apresenta se a persistência tiver sido concedida', () => {
    expect(
      avaliarLembrete(entrada({ agora: emDias(3), persistenciaConcedida: true })).apresentar,
    ).toBe(false)
  })
})

describe('âncora', () => {
  it('ultimoBackupEm nulo ancora no primeiro registro do usuário', () => {
    const resultado = avaliarLembrete(
      entrada({ agora: emDias(9), ultimoBackupEm: null, primeiroRegistroEm: ANCORA }),
    )
    expect(resultado.apresentar).toBe(true)
    expect(resultado.diasDesdeAncora).toBe(9)
  })

  it('sem backup e sem nenhum registro não apresenta — não há o que perder', () => {
    const resultado = avaliarLembrete(
      entrada({ agora: emDias(30), ultimoBackupEm: null, primeiroRegistroEm: null }),
    )
    expect(resultado.apresentar).toBe(false)
    expect(resultado.motivo).toBe('sem_dados')
  })

  it('ultimoBackupEm prevalece sobre o primeiro registro', () => {
    const resultado = avaliarLembrete(
      entrada({
        agora: emDias(9),
        primeiroRegistroEm: '2020-01-01T00:00:00.000Z',
        ultimoBackupEm: emDias(8),
      }),
    )
    expect(resultado.apresentar).toBe(false)
    expect(resultado.diasDesdeAncora).toBe(1)
  })
})

describe('a âncora só se move com exportação bem-sucedida (FR-110)', () => {
  it('exportação que falha não move a âncora — continua vencido', () => {
    // Uma exportação que falhou não escreve `ultimoBackupEm`. A entrada da
    // avaliação seguinte é, por isso, idêntica à anterior.
    const antes = entrada({ agora: emDias(10) })
    const depoisDaFalha = entrada({ agora: emDias(10) })

    expect(avaliarLembrete(antes).apresentar).toBe(true)
    expect(avaliarLembrete(depoisDaFalha).apresentar).toBe(true)
    expect(depoisDaFalha.ultimoBackupEm).toBe(antes.ultimoBackupEm)
  })

  it('lembrete exibido não move a âncora — continua vencido na avaliação seguinte', () => {
    const exibicao = entrada({ agora: emDias(10) })
    expect(avaliarLembrete(exibicao).apresentar).toBe(true)

    // Uma hora depois, sem exportação nenhuma: continua vencido.
    const maisTarde = entrada({ agora: emDias(10.04) })
    expect(avaliarLembrete(maisTarde).apresentar).toBe(true)
  })

  it('exportação bem-sucedida reinicia a contagem', () => {
    const depois = entrada({ agora: emDias(10), ultimoBackupEm: emDias(10) })
    expect(avaliarLembrete(depois).apresentar).toBe(false)
  })

  it('a avaliação é pura: não existe campo de "último lembrete exibido" para escrever', () => {
    const mesma = entrada({ agora: emDias(10) })
    expect(avaliarLembrete(mesma)).toEqual(avaliarLembrete(mesma))
    expect(avaliarLembrete(mesma)).toEqual(avaliarLembrete({ ...mesma }))
  })
})

describe('supressão durante a sessão (Princípio II, SC-028)', () => {
  it('intervalo vencido com sessão em andamento não apresenta', () => {
    const resultado = avaliarLembrete(entrada({ agora: emDias(10), haSessaoEmAndamento: true }))

    expect(resultado.apresentar).toBe(false)
    // Continua vencido: a supressão não é adiamento, e nada foi persistido.
    expect(resultado.vencido).toBe(true)
    expect(resultado.motivo).toBe('vencido_mas_em_treino')
  })

  it('passa a apresentar ao concluir a sessão', () => {
    const durante = entrada({ agora: emDias(10), haSessaoEmAndamento: true })
    expect(avaliarLembrete(durante).apresentar).toBe(false)

    const aoConcluir = entrada({ agora: emDias(10), haSessaoEmAndamento: false })
    expect(avaliarLembrete(aoConcluir).apresentar).toBe(true)
  })

  it('passa a apresentar ao descartar a sessão', () => {
    // Descartar encerra a sessão do mesmo jeito: a condição volta a valer sem
    // que nada tenha sido gravado a respeito do lembrete.
    const aoDescartar = entrada({ agora: emDias(10), haSessaoEmAndamento: false })
    expect(avaliarLembrete(aoDescartar).apresentar).toBe(true)
  })

  it('sessão em andamento dentro do intervalo continua sem apresentar', () => {
    const resultado = avaliarLembrete(entrada({ agora: emDias(3), haSessaoEmAndamento: true }))
    expect(resultado.apresentar).toBe(false)
    expect(resultado.vencido).toBe(false)
  })
})

describe('texto', () => {
  it('diz há quantos dias foi o último backup', () => {
    const avaliacao = avaliarLembrete(entrada({ agora: emDias(9) }))
    expect(textoDoLembrete(avaliacao, false)).toMatch(/há 9 dias/)
  })

  it('tem texto próprio para quem nunca exportou', () => {
    const avaliacao = avaliarLembrete(entrada({ agora: emDias(9), ultimoBackupEm: null }))
    expect(textoDoLembrete(avaliacao, true)).toMatch(/ainda não exportou/)
  })
})
