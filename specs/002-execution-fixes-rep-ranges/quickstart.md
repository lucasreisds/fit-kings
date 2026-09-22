# Quickstart — Validação da feature 002

**Feature**: `002-execution-fixes-rep-ranges` | **Date**: 2026-09-21

Complementa o [quickstart da 001](../001-workout-tracking-app/quickstart.md), que continua valendo
para execução local, testes e instalação no iPhone.

```bash
npm run test          # domínio, integração, tokens
npm run test:e2e      # portões constitucionais
```

---

## Cenários obrigatórios

### C1 — Alcançar o quinto exercício (SC-035, SC-036)

1. Montar um treino com **5** exercícios.
2. Iniciar a sessão, em tela de 430 px.
3. **Esperado**: fica evidente que há mais exercícios além dos visíveis.
4. Alcançar o quinto exercício em no máximo 2 toques ou 1 gesto.
5. Arrastar para o lado sobre a área do exercício corrente muda de exercício.
6. No último, arrastar para avançar não sai da sessão e sinaliza que é o último.

Cobre FR-127 a FR-132.

### C2 — O gesto não dispara onde não deve (FR-130)

1. Na tela de execução, arrastar horizontalmente **começando dentro do campo de carga**.
2. **Esperado**: o exercício **não** muda.
3. Arrastar horizontalmente sobre a faixa de exercícios.
4. **Esperado**: a faixa rola e o exercício **não** muda por causa disso.

### C3 — Corrigir e remover série na sessão aberta (SC-037, SC-038)

1. Registrar três séries; errar o valor de uma delas de propósito.
2. Corrigir a série errada **sem concluir a sessão**, em menos de 10 s.
3. Registrar uma quarta série por engano e removê-la.
4. **Esperado**: a numeração das restantes continua contígua, e cada uma compara com a meta da sua
   posição.
5. Concluir a sessão.
6. **Esperado**: a série removida **não** aparece no histórico; os valores corrigidos aparecem.
7. **Esperado**: a sessão tem **uma** versão — correção em sessão aberta não versiona (FR-136).

### C4 — Exercício completo não oferece série extra em silêncio (FR-137, FR-138)

1. Registrar todas as séries planejadas de um exercício.
2. **Esperado**: o aplicativo sinaliza que o exercício está completo e oferece o próximo.
3. **Esperado**: registrar uma série além das planejadas exige ação explícita e distinta.

### C5 — Intervalo de repetições (SC-039, SC-040)

Executado em Vitest, sem interface, junto do portão 4.

| Planejado    | Realizado | Esperado                                       |
| ------------ | --------- | ---------------------------------------------- |
| 3x 6-8       | 9 / 9 / 9 | **Indica** aumento                             |
| 3x 6-8       | 8 / 8 / 8 | Não indica — no topo, não acima                |
| 3x 6-8       | 9 / 9 / 8 | Não indica — a terceira não superou            |
| 3x 6-8       | 7 / 7 / 7 | Não indica — dentro do intervalo               |
| 3x 6-8       | 5 / 5 / 5 | Não indica — abaixo                            |
| 3x 8 (único) | 9 / 9 / 9 | **Indica** — comportamento de hoje, inalterado |
| 3x 8 (único) | 8 / 8 / 8 | Não indica — comportamento de hoje, inalterado |

**Os dez casos de fronteira do portão 4 rodam inalterados.** Se um único mudar de resultado, a
feature quebrou SC-040 e o portão acusa.

Na comparação planejado x realizado, com 6-8: 5 é _abaixo_, 7 é _dentro_, 9 é _acima_.

### C6 — Intervalo inválido (FR-143)

1. Planejar uma série com mínimo 8 e máximo 6.
2. **Esperado**: recusado, com mensagem compreensível.
3. Mínimo e máximo iguais são aceitos — é a forma explícita do valor único.

### C7 — Exercício de peso corporal (SC-041)

1. Registrar duas sessões de barra fixa **sem informar carga**.
2. Abrir o Progresso.
3. **Esperado**: **2 execuções**, não zero.
4. Abrir a evolução do exercício.
5. **Esperado**: apresentada em **repetições**, não em carga.
6. Repetir com carga zero informada: mesmo comportamento (FR-147).

### C8 — Descanso exibido, nunca cronometrado (SC-043)

1. Planejar um exercício com 90 segundos de descanso.
2. Iniciar a sessão.
3. **Esperado**: o valor aparece junto da meta, sem toque adicional.
4. **Esperado**: nenhuma contagem, nenhum aviso, nenhuma interrupção — em momento algum.
5. Exercício sem descanso planejado não exibe nada a respeito, e nenhum valor é inventado.

### C9 — Compatibilidade (SC-042, SC-040)

1. Importar um arquivo de backup gerado **antes** desta feature.
2. **Esperado**: importado sem perda; séries planejadas ficam de ponta única, itens sem descanso.
3. **Esperado**: a avaliação de progressão sobre os treinos importados é **idêntica** à de antes.
4. Migração v1 → v2 sobre um banco com dados: nenhum registro perdido ou alterado.

---

## Regressão obrigatória

Os quatro portões da constituição continuam valendo e **devem passar inalterados**:

| Portão | O que continua garantindo                                 |
| ------ | --------------------------------------------------------- |
| 1      | Séries confirmadas sobrevivem a encerramento inesperado   |
| 2      | Histórico imune à edição e à exclusão do treino de origem |
| 3      | Importação idempotente e recusa de arquivo inválido       |
| 4      | Determinismo do critério de aumento de carga              |

O portão 4 é o mais sensível a esta feature. Ele ganha casos, mas **nenhum dos dez existentes pode
mudar de resultado**.
