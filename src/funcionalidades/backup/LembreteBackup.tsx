/**
 * Lembrete de backup — FR-110, FR-122, SC-028, SC-033.
 *
 * Não bloqueia, não interrompe, não exige interação, e **não aparece durante uma
 * sessão em andamento** (Princípio II). A regra é pura e vive em
 * `src/domain/backup/lembrete.ts`; aqui só se reúne a entrada dela e se desenha
 * o resultado.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { Faixa } from '../../ui/Faixa'
import { navegar } from '../../app/rotas'
import { db } from '../../dados/db'
import { repositorioMetaAplicacao } from '../../dados/repositorios/metaAplicacao'
import { avaliarLembrete, textoDoLembrete } from '../../domain/backup/lembrete'
import { agoraUtc } from '../../plataforma/tempo'
import estilos from '../../ui/componentes.module.css'

type Props = { persistenciaConcedida: boolean | null }

export function LembreteBackup({ persistenciaConcedida }: Props) {
  const entrada = useLiveQuery(async () => {
    const [meta, primeiroExercicio, primeiroTreino, sessaoAberta] = await Promise.all([
      repositorioMetaAplicacao.obter(),
      db.exercicios.where('origem').equals('personalizado').first(),
      db.treinos.toCollection().first(),
      db.sessoes.where('estado').equals('em_andamento').first(),
    ])

    // Âncora de quem nunca exportou: o primeiro registro que o próprio usuário
    // criou. O catálogo semeado não conta — ele não é dado do usuário, e
    // ancorar nele faria o lembrete vencer antes de existir o que salvar.
    const candidatos = [primeiroExercicio?.criadoEm, primeiroTreino?.criadoEm].filter(
      (valor): valor is string => typeof valor === 'string',
    )

    return {
      ultimoBackupEm: meta.ultimoBackupEm,
      primeiroRegistroEm: candidatos.length > 0 ? candidatos.sort()[0]! : null,
      haSessaoEmAndamento: sessaoAberta !== undefined,
    }
  }, [])

  if (!entrada) return null

  const avaliacao = avaliarLembrete({
    agora: agoraUtc(),
    persistenciaConcedida,
    ...entrada,
  })

  if (!avaliacao.apresentar) return null

  return (
    <Faixa tom="atencao">
      <div className={estilos.conteudoDaFaixa}>
        <span>{textoDoLembrete(avaliacao, entrada.ultimoBackupEm === null)}</span>
        <button
          type="button"
          className={estilos.acaoDaFaixa}
          onClick={() => navegar({ nome: 'backup' })}
        >
          Exportar agora
        </button>
      </div>
    </Faixa>
  )
}
