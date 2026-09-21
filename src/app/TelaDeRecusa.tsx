/**
 * Recusa explícita na inicialização — D11, FR-124, SC-034.
 *
 * O aplicativo não gera identificador por caminho alternativo. Fora de contexto
 * seguro ele não opera, e diz por quê: a causa real é o ambiente, e um erro
 * genérico na hora de salvar a primeira série apontaria para o lugar errado.
 */
import type { ContextoInseguroError } from '../plataforma/contextoSeguro'
import estilos from './app.module.css'

export function TelaDeRecusa({ erro }: { erro: ContextoInseguroError }) {
  return (
    <main className={estilos.telaDeRecusa}>
      <p className={estilos.marcaAplicacao}>fit&#8209;kings</p>
      <h1 className={estilos.recusaTitulo}>O aplicativo não pode ser executado aqui.</h1>
      <p>{erro.message}</p>
      <p className={estilos.recusaDetalhe}>
        Em desenvolvimento, abra por <code>http://localhost:5173</code>. Para testar no celular, use{' '}
        <code>npm run dev:https</code> ou um túnel HTTPS — <code>http://</code> em um IP de rede não
        é contexto seguro.
      </p>
    </main>
  )
}
