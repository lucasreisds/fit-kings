/**
 * Catálogo inicial de exercícios — FR-071.
 *
 * Curado, não exaustivo: cobre os movimentos que aparecem na maioria dos
 * treinos de musculação. O que faltar, o usuário cria como personalizado
 * (FR-072), e o aplicativo trata os dois de forma equivalente (FR-077).
 *
 * Os identificadores são gerados na semeadura, não fixados aqui. Um `id`
 * constante no código pareceria conveniente para a importação, e seria o
 * contrário: dois aparelhos semeados em versões diferentes do catálogo teriam
 * o mesmo `id` para exercícios que o usuário editou de formas distintas. A
 * identidade do exercício vem do aparelho onde ele nasceu, e o arquivo de
 * backup a carrega (FR-105).
 */
import { repositorioExercicios } from '../repositorios/exercicios'
import { db as bancoPadrao, type BancoFitKings } from '../db'
import { criarRepositorioExercicios } from '../repositorios/exercicios'

export type ExercicioDoCatalogo = {
  readonly nome: string
  readonly grupoMuscular: string
  readonly equipamento: string
}

export const CATALOGO_INICIAL: readonly ExercicioDoCatalogo[] = [
  // Peito
  { nome: 'Supino reto com barra', grupoMuscular: 'Peito', equipamento: 'Barra' },
  { nome: 'Supino inclinado com halteres', grupoMuscular: 'Peito', equipamento: 'Halteres' },
  { nome: 'Supino declinado com barra', grupoMuscular: 'Peito', equipamento: 'Barra' },
  { nome: 'Crucifixo com halteres', grupoMuscular: 'Peito', equipamento: 'Halteres' },
  { nome: 'Crossover na polia', grupoMuscular: 'Peito', equipamento: 'Polia' },
  { nome: 'Peck deck', grupoMuscular: 'Peito', equipamento: 'Máquina' },
  { nome: 'Flexão de braço', grupoMuscular: 'Peito', equipamento: 'Peso corporal' },

  // Costas
  { nome: 'Barra fixa', grupoMuscular: 'Costas', equipamento: 'Peso corporal' },
  { nome: 'Puxada frontal na polia', grupoMuscular: 'Costas', equipamento: 'Polia' },
  { nome: 'Remada curvada com barra', grupoMuscular: 'Costas', equipamento: 'Barra' },
  { nome: 'Remada unilateral com halter', grupoMuscular: 'Costas', equipamento: 'Halteres' },
  { nome: 'Remada baixa na polia', grupoMuscular: 'Costas', equipamento: 'Polia' },
  { nome: 'Remada cavalinho', grupoMuscular: 'Costas', equipamento: 'Barra' },
  { nome: 'Pulldown com braços estendidos', grupoMuscular: 'Costas', equipamento: 'Polia' },
  { nome: 'Levantamento terra', grupoMuscular: 'Costas', equipamento: 'Barra' },

  // Pernas
  { nome: 'Agachamento livre', grupoMuscular: 'Pernas', equipamento: 'Barra' },
  { nome: 'Agachamento no smith', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Leg press 45°', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Cadeira extensora', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Mesa flexora', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Cadeira flexora', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Stiff com barra', grupoMuscular: 'Pernas', equipamento: 'Barra' },
  { nome: 'Afundo com halteres', grupoMuscular: 'Pernas', equipamento: 'Halteres' },
  { nome: 'Búlgaro com halteres', grupoMuscular: 'Pernas', equipamento: 'Halteres' },
  { nome: 'Cadeira adutora', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Cadeira abdutora', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Panturrilha em pé', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Panturrilha sentado', grupoMuscular: 'Pernas', equipamento: 'Máquina' },
  { nome: 'Elevação pélvica', grupoMuscular: 'Pernas', equipamento: 'Barra' },

  // Ombros
  { nome: 'Desenvolvimento com halteres', grupoMuscular: 'Ombros', equipamento: 'Halteres' },
  { nome: 'Desenvolvimento militar com barra', grupoMuscular: 'Ombros', equipamento: 'Barra' },
  { nome: 'Elevação lateral', grupoMuscular: 'Ombros', equipamento: 'Halteres' },
  { nome: 'Elevação frontal', grupoMuscular: 'Ombros', equipamento: 'Halteres' },
  { nome: 'Crucifixo inverso', grupoMuscular: 'Ombros', equipamento: 'Máquina' },
  { nome: 'Remada alta', grupoMuscular: 'Ombros', equipamento: 'Barra' },
  { nome: 'Encolhimento com halteres', grupoMuscular: 'Ombros', equipamento: 'Halteres' },

  // Bíceps
  { nome: 'Rosca direta com barra', grupoMuscular: 'Bíceps', equipamento: 'Barra' },
  { nome: 'Rosca alternada com halteres', grupoMuscular: 'Bíceps', equipamento: 'Halteres' },
  { nome: 'Rosca martelo', grupoMuscular: 'Bíceps', equipamento: 'Halteres' },
  { nome: 'Rosca scott', grupoMuscular: 'Bíceps', equipamento: 'Máquina' },
  { nome: 'Rosca concentrada', grupoMuscular: 'Bíceps', equipamento: 'Halteres' },
  { nome: 'Rosca na polia', grupoMuscular: 'Bíceps', equipamento: 'Polia' },

  // Tríceps
  { nome: 'Tríceps na polia com barra', grupoMuscular: 'Tríceps', equipamento: 'Polia' },
  { nome: 'Tríceps na polia com corda', grupoMuscular: 'Tríceps', equipamento: 'Polia' },
  { nome: 'Tríceps testa com barra W', grupoMuscular: 'Tríceps', equipamento: 'Barra' },
  { nome: 'Tríceps francês com halter', grupoMuscular: 'Tríceps', equipamento: 'Halteres' },
  { nome: 'Mergulho entre bancos', grupoMuscular: 'Tríceps', equipamento: 'Peso corporal' },
  { nome: 'Supino fechado', grupoMuscular: 'Tríceps', equipamento: 'Barra' },

  // Abdômen
  { nome: 'Abdominal supra', grupoMuscular: 'Abdômen', equipamento: 'Peso corporal' },
  { nome: 'Abdominal na polia', grupoMuscular: 'Abdômen', equipamento: 'Polia' },
  { nome: 'Elevação de pernas suspenso', grupoMuscular: 'Abdômen', equipamento: 'Peso corporal' },
  { nome: 'Prancha', grupoMuscular: 'Abdômen', equipamento: 'Peso corporal' },
  { nome: 'Abdominal infra no banco', grupoMuscular: 'Abdômen', equipamento: 'Peso corporal' },

  // Antebraço
  { nome: 'Rosca inversa', grupoMuscular: 'Antebraço', equipamento: 'Barra' },
  { nome: 'Rosca de punho', grupoMuscular: 'Antebraço', equipamento: 'Halteres' },
]

/**
 * Semeia o catálogo apenas quando a tabela está vazia. Idempotente: reabrir o
 * aplicativo não duplica nada, e não ressuscita o que o usuário ocultou.
 */
export async function semearCatalogoSeNecessario(
  db: BancoFitKings = bancoPadrao,
): Promise<number> {
  const jaExiste = await db.exercicios.count()
  if (jaExiste > 0) return 0

  const repositorio = db === bancoPadrao ? repositorioExercicios : criarRepositorioExercicios(db)

  for (const exercicio of CATALOGO_INICIAL) {
    await repositorio.criar({ ...exercicio, origem: 'catalogo' })
  }
  return CATALOGO_INICIAL.length
}
