import { expect, type Page } from '@playwright/test'

/** Apaga o armazenamento do navegador — o equivalente a um aparelho novo. */
export async function limparArmazenamento(pagina: Page): Promise<void> {
  await pagina.evaluate(async () => {
    const bancos = (await indexedDB.databases?.()) ?? []
    await Promise.all(
      bancos
        .map((banco) => banco.name)
        .filter((nome): nome is string => typeof nome === 'string')
        .map(
          (nome) =>
            new Promise<void>((resolver) => {
              const pedido = indexedDB.deleteDatabase(nome)
              pedido.onsuccess = () => resolver()
              pedido.onerror = () => resolver()
              pedido.onblocked = () => resolver()
            }),
        ),
    )
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
    await pagina.getByRole('button', { name: new RegExp(exercicio) }).first().click()
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

/** Conclui a sessão em andamento e volta ao histórico. */
export async function concluirTreino(pagina: Page): Promise<void> {
  await pagina.getByRole('button', { name: 'Concluir treino' }).click()
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
