import { expect, type Page } from '@playwright/test'

/**
 * Apaga o armazenamento do navegador — o equivalente a um aparelho novo.
 *
 * `blocked` **não** é conclusão: significa que a exclusão ficou pendente atrás
 * de uma conexão aberta. Tratá-lo como sucesso — que era o que este apoio
 * fazia — devolve o controle enquanto o banco ainda existe, e o teste seguinte
 * começa com os treinos do anterior. Como quase todo apoio daqui escolhe pelo
 * primeiro botão da lista, sobra é o bastante para agir no treino errado.
 *
 * O aplicativo mantém a conexão do Dexie aberta o tempo todo, então `blocked`
 * é o caminho comum, não a exceção: o Dexie fecha a conexão ao ouvir o pedido
 * e a exclusão prossegue. Por isso esperar é obrigatório, e confirmar também.
 */
export async function limparArmazenamento(pagina: Page): Promise<void> {
  await pagina.evaluate(async () => {
    const apagar = (nome: string) =>
      new Promise<void>((resolver, rejeitar) => {
        const pedido = indexedDB.deleteDatabase(nome)
        pedido.onsuccess = () => resolver()
        pedido.onerror = () => rejeitar(new Error(`falha ao apagar ${nome}`))
        // Sem handler de `blocked`: a promessa continua pendente até que a
        // conexão se feche e o `success` chegue, que é o que se quer esperar.
      })

    const nomes = ((await indexedDB.databases?.()) ?? [])
      .map((banco) => banco.name)
      .filter((nome): nome is string => typeof nome === 'string')

    await Promise.all(nomes.map(apagar))

    // E confirma: um `success` por banco ainda deixa de fora o banco que
    // apareceu no meio do caminho, e o que interessa é a lista vazia.
    const limite = Date.now() + 5000
    for (;;) {
      const restantes = ((await indexedDB.databases?.()) ?? []).filter((banco) => banco.name)
      if (restantes.length === 0) break
      if (Date.now() > limite) {
        throw new Error(`armazenamento não ficou limpo: ${restantes.map((b) => b.name).join(', ')}`)
      }
      await Promise.all(restantes.map((banco) => apagar(banco.name as string)))
    }

    localStorage.clear()
    sessionStorage.clear()
  })
}

/** Abre o aplicativo com armazenamento limpo. */
export async function abrirLimpo(pagina: Page, rota = '#/treinos'): Promise<void> {
  await pagina.goto('/')
  await limparArmazenamento(pagina)
  await pagina.goto(`/${rota}`)
  await pagina.waitForLoadState('networkidle')
}

/** Monta um treino pela interface, como o usuário faria. */
export async function montarTreino(
  pagina: Page,
  nome: string,
  exercicios: readonly string[],
): Promise<void> {
  await pagina.getByRole('button', { name: 'Criar treino' }).first().click()
  await pagina.getByLabel('Nome do treino').fill(nome)
  await pagina.getByLabel('Nome do treino').blur()

  for (const exercicio of exercicios) {
    await pagina.getByRole('button', { name: 'Adicionar exercício' }).click()
    await pagina.getByLabel('Buscar exercício').fill(exercicio)
    await pagina.waitForTimeout(250)
    await pagina
      .getByRole('button', { name: new RegExp(exercicio.slice(0, 16)) })
      .first()
      .click()
    await pagina.waitForTimeout(250)
  }

  await pagina.getByRole('button', { name: 'Concluir' }).click()
  await pagina.waitForTimeout(400)
}

/** Inicia o treino montado e espera a tela de execução. */
export async function iniciarTreino(pagina: Page): Promise<void> {
  await pagina.goto('/#/treinos')
  await pagina.waitForLoadState('networkidle')
  await pagina.getByRole('button', { name: 'Iniciar treino' }).first().click()
  await pagina.getByRole('button', { name: 'Confirmar série' }).waitFor()
}

/**
 * Registra uma série pela interface, como o usuário faria: aplica as
 * repetições, ajusta a carga e confirma.
 */
export async function registrarSerie(
  pagina: Page,
  valores: { cargaKg?: number; repeticoes: number },
): Promise<void> {
  if (valores.cargaKg !== undefined) {
    await pagina.locator('input[aria-labelledby="rotulo-carga"]').fill(String(valores.cargaKg))
  }
  await pagina.locator('input[aria-labelledby="rotulo-reps"]').fill(String(valores.repeticoes))

  const antes = await pagina.locator('[data-serie-registrada]').count()
  await pagina.getByRole('button', { name: 'Confirmar série' }).click()
  // O retorno só aparece depois do commit: esperar por ele é esperar o commit.
  await expect(pagina.locator('[data-serie-registrada]')).toHaveCount(antes + 1)
}

/**
 * Conclui a sessão em andamento e volta ao histórico.
 *
 * O botão fica no cartão de exercício completo quando ele está visível no
 * último exercício, e no rodapé no resto do tempo — nunca nos dois ao mesmo
 * tempo, para não repetir a mesma ação na mesma tela.
 */
export async function concluirTreino(pagina: Page): Promise<void> {
  await pagina.getByRole('button', { name: 'Concluir treino' }).first().click()
  await pagina.getByRole('button', { name: 'Ver no histórico' }).click()
  await pagina.waitForLoadState('networkidle')
}

/** Abre o editor de um treino já salvo pelo nome. */
export async function abrirEditor(pagina: Page, _nome: string): Promise<void> {
  await pagina.goto('/#/treinos')
  await pagina.waitForLoadState('networkidle')
  await pagina.getByRole('button', { name: 'Editar' }).first().click()
  await pagina.getByLabel('Nome do treino').waitFor()
}

/** Arrasta horizontalmente sobre um elemento, simulando o gesto do polegar. */
export async function arrastar(
  pagina: Page,
  seletor: string,
  direcao: 'esquerda' | 'direita',
  opcoes: { distancia?: number } = {},
): Promise<void> {
  const caixa = await pagina.locator(seletor).first().boundingBox()
  if (!caixa) throw new Error(`elemento não encontrado: ${seletor}`)

  const distancia = opcoes.distancia ?? 120
  const y = caixa.y + caixa.height / 2
  const partida = caixa.x + caixa.width / 2
  const chegada = direcao === 'esquerda' ? partida - distancia : partida + distancia

  await pagina.mouse.move(partida, y)
  await pagina.mouse.down()
  await pagina.mouse.move(chegada, y, { steps: 10 })
  await pagina.mouse.up()
  await pagina.waitForTimeout(250)
}
