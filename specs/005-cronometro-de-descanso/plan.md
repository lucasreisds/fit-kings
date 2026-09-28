# Implementation Plan: Campo de carga apagável e cronômetro de descanso

**Branch**: `task/cronometro-de-descanso` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-cronometro-de-descanso/spec.md`

## Summary

Duas entregas independentes na mesma tela. A primeira desfaz uma ambiguidade no rascunho da série:
`null` significa hoje tanto "não mexi" quanto "apaguei", e por isso o campo de carga volta sozinho
ao valor herdado. A segunda acrescenta um cronômetro de descanso iniciado por toque, com a contagem
derivada do relógio a partir do instante de início.

As duas são feitas juntas porque tocam a mesma tela e o mesmo estado de sessão, e porque quem relatou
o defeito é quem pediu a melhoria, no mesmo treino.

## Technical Context

**Language/Version**: TypeScript 5.9 estrito
**Primary Dependencies**: React 19, Dexie 4, Zustand 5
**Storage**: IndexedDB para registros; `localStorage` para o descanso em andamento (ver D4)
**Testing**: Vitest 5 (unidade e integração), Playwright (portões de ponta a ponta)
**Target Platform**: PWA, iPhone em retrato como prioridade
**Project Type**: Single project
**Performance Goals**: registro de série em até 3 toques e menos de 5 s (Princípio II)
**Constraints**: offline integral; nada bloqueia a sessão; domínio puro e determinístico
**Scale/Scope**: um usuário, um aparelho

## Constitution Check

**Emenda necessária e feita.** A v1.4.0 listava "cronômetro de descanso" entre os itens fora de
escopo, e o texto exige emenda para ampliar esse escopo. A constituição foi emendada para **v1.5.0**
antes deste plano: o cronômetro passa a ser permitido **sob condição** de início explícito pelo
usuário, sem bloqueio e sem rede. A justificativa está registrada no histórico de emendas.

| Princípio | Verificação |
| --- | --- |
| I — Integridade do Registro | Nada muda na gravação de séries. O descanso não é registro do usuário e não entra no histórico (FR-186). A correção do campo de carga **aumenta** a fidelidade: o que é gravado passa a ser o que está na tela (FR-169). |
| II — A Academia é o Ambiente | FR-181 e FR-182 proíbem bloquear, interromper e exigir interação. O início por toque (FR-173) é a condição da emenda. O cronômetro não pode disputar hierarquia visual com carga, repetições e RIR. |
| III — Autonomia Local | Som e aviso são locais. Nenhuma notificação do sistema, nenhum servidor, nenhuma rede (FR-184). |
| IV — Modelo de Dados Aditivo | Nenhuma tabela nova, nenhuma migração, nenhum campo novo em registro gravado. O descanso vive fora do IndexedDB. |
| V — Domínio Determinístico | O tempo restante é função pura de (início, duração, agora), com `agora` recebido como parâmetro. Nada de relógio dentro de `src/domain/` — a regra de lint já impede. O restante **nunca** é persistido; o que se grava é o instante de início, que é fato, não derivação. |

**Portões de teste**: os quatro seguem valendo. O Portão 1 ganha cobertura adicional — o descanso
precisa sobreviver a uma recarga no meio da sessão, que é o mesmo cenário da retomada.

Nenhuma violação aberta.

## Project Structure

### Documentation (this feature)

```
specs/005-cronometro-de-descanso/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```
src/
├── domain/
│   ├── descanso/
│   │   └── contagem.ts          # NOVO — regra pura da contagem
│   └── serie/
│       └── campoDeCarga.ts      # NOVO — "herdado" vs "digitado pelo usuário"
├── plataforma/
│   ├── som.ts                   # NOVO — bipe curto, falha em silêncio
│   └── descansoPersistido.ts    # NOVO — leitura e escrita em localStorage
└── funcionalidades/execucao/
    ├── store.ts                 # rascunho passa a distinguir herdado de digitado
    ├── useDescanso.ts           # NOVO — liga a regra ao relógio e à tela
    ├── Descanso.tsx             # NOVO — botão, contagem e aviso de fim
    └── TelaExecucao.tsx         # usa os dois

tests/
├── unidade/domain/
│   ├── contagemDeDescanso.test.ts
│   └── campoDeCarga.test.ts
├── integracao/descansoPersistido.test.ts
└── e2e/
    ├── campoDeCarga.spec.ts
    └── descanso.spec.ts         # já existe; ganha o cronômetro
```

**Structure Decision**: Single project, como as quatro features anteriores. A separação entre
`domain` (puro), `plataforma` (efeitos) e `funcionalidades` (React) é a mesma de sempre e é
verificada por lint.

## Decisões

### D1 — O rascunho precisa de três estados, não dois

Hoje `Rascunho.cargaKg: number | null` carrega duas perguntas diferentes na mesma resposta. O campo
exibe `rascunho.cargaKg ?? cargaHerdada(...)`, então o instante em que o usuário apaga o último
dígito é exatamente o instante em que a herança volta.

`undefined` não serve como terceiro estado: `definirRascunho` recebe `Partial<Rascunho>`, onde
`undefined` já significa "não altere este campo". Usá-lo aqui tornaria "apaguei a carga"
indistinguível de "não falei nada sobre a carga".

Um par de campos — valor mais `cargaFoiTocada: boolean` — convida o defeito de volta pela porta da
frente: são dois campos que alguém precisa lembrar de atualizar juntos, que é a causa dos defeitos
das features 003 e 004.

**A escolha**: um único valor que carrega a própria origem.

```ts
type CampoDeCarga =
  | { readonly origem: 'herdado' }
  | { readonly origem: 'usuario'; readonly valor: number | null }
```

Não há como representar o estado ambíguo. Ler o valor efetivo é uma função pura, num lugar só, e é
a mesma função que a exibição e a confirmação usam — o que faz FR-169 sair de graça: o que está na
tela e o que é gravado vêm da mesma conta.

### D2 — A contagem é derivada, não contada

O tempo restante é `duração - (agora - início)`. O que se guarda é o instante de início, que é fato
registrado; o restante é derivação e o Princípio V proíbe persistir derivação como fonte de verdade.

Isso resolve de uma vez três coisas que um contador de tiques não resolve: recarregar a página, sair
do aplicativo e voltar, e o aparelho congelar a aba em segundo plano. Em todos os casos a conta é a
mesma e a resposta está certa, inclusive quando a resposta é "já acabou".

O `setInterval` de um segundo existe apenas para provocar o redesenho. Ele nunca é a fonte do valor.
Também redesenhamos ao voltar de segundo plano, porque o intervalo pode ter sido congelado.

### D3 — O aviso sonoro e o gesto que o libera

No iOS o áudio só toca depois de um gesto do usuário. O toque que inicia a contagem **é** esse
gesto, e é nele que o contexto de áudio é criado. Não há pedido de permissão separado, e não há
caminho em que o usuário ligue o cronômetro sem ter tocado em nada.

Se o áudio falhar — aparelho no mudo, política do navegador, contexto recusado — a falha é engolida.
FR-185 é explícito: o aviso visual carrega a informação por si, e um erro na tela por causa de um
bipe seria pior que o bipe faltando.

### D4 — Onde o descanso em andamento mora

Não no IndexedDB. As tabelas de lá são exportadas no backup, e FR-186 e SC-061 dizem que a contagem
não entra no histórico nem no arquivo. Pôr lá exigiria migração, exclusão da exportação e um campo
novo a manter para sempre — tudo isso para um dado que morre com a sessão.

Não na memória do Zustand, porque FR-178 exige sobreviver a recarregar a página.

**`localStorage`, uma chave, com `{ sessaoId, iniciadoEm, duracaoSegundos }`.** A chave é lida na
abertura da tela e descartada quando o `sessaoId` não bate com a sessão em andamento — o que faz
FR-183 valer mesmo se a limpeza ao concluir o treino falhar.

### D5 — Onde o cronômetro aparece

O descanso planejado já é exibido na tela de execução (FR-150). O botão de iniciar fica ali, junto
dele, onde o usuário já olha para saber quanto tem de descansar.

Com a contagem em andamento, ela permanece visível ao trocar de exercício — é um descanso por
pessoa, não por exercício (FR-180). Não pode ganhar hierarquia visual acima de carga, repetições e
RIR, que a constituição fixa como os elementos de maior peso da tela, e não pode usar transparência
nem blur, proibidos ali pelo mesmo motivo de sempre: custo de renderização que depende do que está
embaixo.

A skill `frontend-design` é obrigatória na implementação desta tela.

## Complexity Tracking

Nenhuma violação constitucional a justificar. A única ampliação de escopo — o cronômetro — foi
resolvida por emenda registrada, e não por exceção neste plano.
