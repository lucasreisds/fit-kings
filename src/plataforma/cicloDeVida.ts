/**
 * Ciclo de vida do aplicativo — FR-031.
 *
 * Numa PWA não existe "fechar o aplicativo": existe o navegador descartando a
 * aba em segundo plano, sem aviso e a qualquer momento. No iOS isso é
 * frequente. `pagehide` é o último evento confiável antes do descarte, e
 * `visibilitychange` cobre minimizar, trocar de aplicativo e bloquear a tela.
 *
 * **Nada de crítico depende destes eventos.** Cada série já foi gravada no
 * instante da confirmação, em transação própria (FR-033, D4). O que estes
 * ganchos fazem é consolidar o que ainda não é crítico — e essa ordem de
 * prioridades é deliberada: um aplicativo que só grava ao sair perde tudo
 * quando o sistema não lhe dá a chance de sair.
 */

export type AoSairDeVista = () => void | Promise<void>

/**
 * Registra o gancho e devolve a função que o remove.
 *
 * `beforeunload` é omitido de propósito: ele é ignorado no iOS e dispara
 * diálogos de confirmação que interromperiam o treino, o que o Princípio II
 * não admite.
 */
export function aoSairDeVista(consolidar: AoSairDeVista): () => void {
  function aoMudarVisibilidade() {
    if (document.visibilityState === 'hidden') void consolidar()
  }

  function aoEsconderPagina() {
    void consolidar()
  }

  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  globalThis.addEventListener('pagehide', aoEsconderPagina)

  return () => {
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    globalThis.removeEventListener('pagehide', aoEsconderPagina)
  }
}

/** Registra o retorno à visibilidade — usado para reler o banco ao voltar. */
export function aoVoltarAVista(reler: () => void): () => void {
  function aoMudarVisibilidade() {
    if (document.visibilityState === 'visible') reler()
  }

  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade)
}
