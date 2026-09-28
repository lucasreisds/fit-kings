# Quickstart: verificar a feature 005

## Pré-requisitos

```bash
npm ci
```

## Verificação automatizada

```bash
npx tsc -b            # tipos
npm run lint          # inclui os três guardas constitucionais
npm run test          # unidade e integração, inclui o Portão 4
npm run test:e2e      # Portões 1 a 3
```

O que cada suíte nova cobre:

| Arquivo | Cobre |
| --- | --- |
| `tests/unidade/domain/campoDeCarga.test.ts` | FR-167 a FR-169: os três estados e a leitura efetiva. |
| `tests/unidade/domain/contagemDeDescanso.test.ts` | FR-174, FR-177: duração padrão, restante, já terminado, tempo negativo. |
| `tests/integracao/descansoPersistido.test.ts` | FR-178, FR-183: sobrevive à recarga, descartado em outra sessão. |
| `tests/e2e/campoDeCarga.spec.ts` | SC-054 a SC-056: 45 vira 50 apagando dígito a dígito. |
| `tests/e2e/descanso.spec.ts` | SC-057 a SC-060: início só por toque, duração, recarga, não bloqueia. |

## Verificação manual no navegador

```bash
npm run dev
```

1. Crie um treino com um exercício e 60 segundos de descanso planejado.
2. Inicie o treino. Registre a série 1 com 45 kg e 10 repetições.
3. **Campo de carga**: na série 2, apague os dois dígitos um a um. O campo deve ficar vazio e
   permanecer vazio. Digite `50`.
4. **Cronômetro**: toque em descansar. A contagem começa em 60 segundos.
5. Recarregue a página (F5). A contagem deve continuar de onde estava, não do começo.
6. Com a contagem rodando, registre outra série e troque de exercício. Nada deve ser impedido.
7. Espere chegar a zero com a aba visível. Deve haver um som curto e um aviso na tela.
8. Conclua o treino. A contagem deve sumir.

## Verificação que exige aparelho

Continua pendente, como nas features anteriores — ver `docs/validacao.md`:

- O som toca no iPhone com o aplicativo instalado pela Tela de Início, depois do toque de início.
- Sair do aplicativo, esperar passar do tempo e voltar mostra o descanso já terminado.
- A contagem permanece legível sob luz forte e com brilho reduzido.
