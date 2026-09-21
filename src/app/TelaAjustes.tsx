/**
 * Ajustes — ponto de entrada para backup e diagnóstico.
 *
 * O backup vem primeiro e com a explicação mais direta: sobre armazenamento
 * despejável pelo sistema (risco R1), ele é a única rede de proteção que
 * existe, e não pode parecer um item de configuração entre outros.
 */
import { Botao } from '../ui/Botao'
import { navegar } from './rotas'
import { VERSAO_DA_APLICACAO } from '../plataforma/versao'
import estilos from './app.module.css'

export function TelaAjustes() {
  return (
    <>
      <section className={estilos.secaoAjustes}>
        <h2 className={estilos.tituloAjustes}>Backup em arquivo</h2>
        <p className={estilos.textoAjustes}>
          Seus dados ficam neste aparelho e não vão para nenhum servidor. Exportar um arquivo é a
          única forma de levá-los para outro aparelho — ou de recuperá-los se este apagar.
        </p>
        <Botao onClick={() => navegar({ nome: 'backup' })}>Exportar ou importar</Botao>
      </section>

      <section className={estilos.secaoAjustes}>
        <h2 className={estilos.tituloAjustes}>Diagnóstico</h2>
        <p className={estilos.textoAjustes}>
          Estado do armazenamento deste aparelho e espaço disponível.
        </p>
        <Botao variante="secundario" onClick={() => navegar({ nome: 'diagnostico' })}>
          Ver diagnóstico
        </Botao>
      </section>

      <p className={estilos.versao}>
        fit-kings <span className="numerico">{VERSAO_DA_APLICACAO}</span>
      </p>
    </>
  )
}
