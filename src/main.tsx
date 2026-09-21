/**
 * Bootstrap.
 *
 * A guarda de contexto seguro roda **antes** de qualquer tela de domínio
 * carregar (D11, FR-124). Falhar ruidosamente aqui é preferível a falhar em
 * silêncio no primeiro registro.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { TelaDeRecusa } from './app/TelaDeRecusa'
import { ContextoInseguroError, exigirContextoSeguro } from './plataforma/contextoSeguro'
import { aplicarTema } from './ui/aplicarTema'
import { semearCatalogoSeNecessario } from './dados/seed/catalogo'
import './ui/tema.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Elemento #raiz não encontrado em index.html.')

aplicarTema(document.documentElement)

try {
  exigirContextoSeguro()
  void semearCatalogoSeNecessario()
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (erro) {
  if (erro instanceof ContextoInseguroError) {
    createRoot(raiz).render(<TelaDeRecusa erro={erro} />)
  } else {
    throw erro
  }
}
