# Data Model: Campo de carga apagável e cronômetro de descanso

Nenhuma tabela nova, nenhuma migração, nenhum campo novo em registro gravado. Esta feature não
altera o modelo persistente do aplicativo.

## Campo de carga (estado de tela)

```ts
type CampoDeCarga =
  | { readonly origem: 'herdado' }
  | { readonly origem: 'usuario'; readonly valor: number | null }
```

| Estado | Significa | O campo mostra |
| --- | --- | --- |
| `{ origem: 'herdado' }` | O usuário não tocou no campo nesta série. | A carga da série anterior do mesmo exercício, ou vazio na primeira série. |
| `{ origem: 'usuario', valor: 47.5 }` | O usuário digitou. | `47,5` |
| `{ origem: 'usuario', valor: null }` | O usuário apagou. | Vazio, e assim permanece. |

**Regra de leitura** (`cargaEfetiva`): `herdado` devolve a carga herdada; `usuario` devolve o valor,
inclusive quando ele é `null`. É a mesma função para exibir e para gravar, e é isso que faz o
registro coincidir com a tela (FR-169).

**Transições**: qualquer digitação ou apagamento leva a `usuario`. Voltar a `herdado` só acontece ao
confirmar a série, ao trocar de exercício ou ao limpar o rascunho — nunca por apagar o campo.

## Descanso em andamento (estado de sessão)

```ts
type DescansoEmAndamento = {
  readonly sessaoId: Id
  readonly iniciadoEm: InstanteUtc
  readonly duracaoSegundos: number
}
```

| Campo | Regra |
| --- | --- |
| `sessaoId` | A sessão que o originou. Descanso de outra sessão é descartado na leitura (FR-183). |
| `iniciadoEm` | Instante do toque, em UTC. É fato registrado, não derivação. |
| `duracaoSegundos` | Descanso planejado do exercício em foco, ou 120 quando não houver ou quando for zero (FR-174). |

**Não é registro do usuário.** Vive em `localStorage`, fora do IndexedDB, e por isso não entra no
backup nem no histórico (FR-186, SC-061). Some quando a sessão termina.

**O tempo restante não é campo.** É `duracaoSegundos - (agora - iniciadoEm)`, calculado na leitura,
nunca gravado — o Princípio V proíbe persistir derivação como fonte de verdade.

**Estados derivados**:

| Condição | Estado |
| --- | --- |
| Sem registro, ou de outra sessão | Parado. O botão de iniciar aparece. |
| Restante > 0 | Correndo. A contagem aparece, com a ação de cancelar. |
| Restante ≤ 0 | Terminado. O aviso aparece até que o usuário inicie outro descanso ou o dispense. |
