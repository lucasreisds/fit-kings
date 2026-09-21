/**
 * Resumo antes de aplicar — FR-107.
 *
 * O usuário vê o que vai acontecer **antes** de acontecer. A tela também diz o
 * que a importação não faz: ela nunca apaga uma sessão do aparelho. Sem essa
 * frase, importar parece uma operação de substituição, e o usuário evita fazer
 * justamente quando mais precisa.
 */
import { Botao } from '../../ui/Botao'
import { Carta } from '../../ui/Carta'
import type { PlanoDeImportacao } from '../../domain/backup/mesclar'
import { planoEhVazio } from '../../domain/backup/mesclar'
import estilos from './backup.module.css'

type Props = {
  plano: PlanoDeImportacao
  nomeDoArquivo: string
  aoConfirmar: () => void
  aoCancelar: () => void
  aplicando: boolean
}

export function ResumoImportacao({
  plano,
  nomeDoArquivo,
  aoConfirmar,
  aoCancelar,
  aplicando,
}: Props) {
  const { resumo } = plano
  const nadaMuda = planoEhVazio(plano)

  return (
    <section className={estilos.secao}>
      <h2 className={estilos.tituloSecao}>Conferir antes de importar</h2>
      <p className={estilos.explicacao}>
        Arquivo <strong>{nomeDoArquivo}</strong>.{' '}
        {nadaMuda
          ? 'Tudo o que ele contém já está neste aparelho, em versão igual ou mais recente. Importar não vai mudar nada.'
          : 'Nada é gravado até você confirmar. Nenhum treino registrado neste aparelho é apagado.'}
      </p>

      <Carta>
        <div className={estilos.resumo}>
          <Linha rotulo="Registros novos" valor={resumo.inseridos} destaque />
          <Linha rotulo="Registros atualizados" valor={resumo.atualizados} />
          <Linha rotulo="Ignorados por já estarem atualizados" valor={resumo.ignorados} />
          <Linha rotulo="Treinos registrados novos" valor={resumo.sessoesInseridas} />
          <Linha
            rotulo="Treinos registrados com correção vinda do arquivo"
            valor={resumo.sessoesComNovaVersao}
          />
        </div>
      </Carta>

      {resumo.sessoesComNovaVersao > 0 ? (
        <p className={estilos.explicacao}>
          As correções entram como uma versão nova. A versão que está neste aparelho continua
          guardada.
        </p>
      ) : null}

      <div className={estilos.acoes}>
        <Botao variante="secundario" onClick={aoCancelar} disabled={aplicando}>
          Cancelar
        </Botao>
        <Botao onClick={aoConfirmar} disabled={aplicando || nadaMuda}>
          {aplicando ? 'Importando…' : 'Importar'}
        </Botao>
      </div>
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
      <span
        className={`${destaque ? estilos.destaqueResumo : estilos.valorResumo} numerico`}
      >
        {valor}
      </span>
    </div>
  )
}
