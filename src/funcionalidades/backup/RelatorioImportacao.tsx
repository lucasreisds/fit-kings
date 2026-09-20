/**
 * Relatório depois de aplicar — FR-108.
 *
 * Diz o que entrou, o que foi atualizado e o que foi ignorado por não ser mais
 * recente. O terceiro número é o que faz a idempotência ser visível: na segunda
 * importação do mesmo arquivo tudo aparece como ignorado, e isso é o resultado
 * correto, não uma falha.
 */
import { Botao } from '../../ui/Botao'
import { Carta } from '../../ui/Carta'
import { Faixa } from '../../ui/Faixa'
import type { ResumoDaImportacao } from '../../domain/backup/mesclar'
import estilos from './backup.module.css'

type Props = {
  resumo: ResumoDaImportacao
  aoFechar: () => void
}

export function RelatorioImportacao({ resumo, aoFechar }: Props) {
  const totalEntrou = resumo.inseridos + resumo.sessoesInseridas
  const totalAtualizou = resumo.atualizados + resumo.sessoesComNovaVersao
  const nadaMudou = totalEntrou === 0 && totalAtualizou === 0

  return (
    <section className={estilos.secao}>
      <h2 className={estilos.tituloSecao}>Importação concluída</h2>

      <Faixa tom={nadaMudou ? 'acento' : 'positiva'}>
        {nadaMudou
          ? 'Nada mudou: este aparelho já tinha tudo o que o arquivo contém, em versão igual ou mais recente.'
          : 'Os dados do arquivo foram aplicados. Nenhum registro deste aparelho foi apagado.'}
      </Faixa>

      <Carta>
        <div className={estilos.resumo}>
          <Linha rotulo="Entraram" valor={totalEntrou} destaque />
          <Linha rotulo="Foram atualizados" valor={totalAtualizou} />
          <Linha
            rotulo="Ignorados por não serem mais recentes"
            valor={resumo.ignorados + resumo.sessoesIgnoradas}
          />
        </div>
      </Carta>

      <Botao onClick={aoFechar}>Voltar</Botao>
    </section>
  )
}

function Linha({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string
  valor: number
  destaque?: boolean
}) {
  return (
    <div className={estilos.linhaResumo}>
      <span className={estilos.chaveResumo}>{rotulo}</span>
      <span className={`${destaque ? estilos.destaqueResumo : estilos.valorResumo} numerico`}>
        {valor}
      </span>
    </div>
  )
}
