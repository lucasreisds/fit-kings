# Quickstart: validar a feature 006

## Pré-requisitos

```bash
npm install
```

## Testes automatizados

```bash
npm test                     # unidade + integração (Vitest)
npx playwright test tests/e2e/espelharSeries.spec.ts tests/e2e/referenciaAnterior.spec.ts
npm run test:e2e             # suíte e2e inteira — nada existente pode quebrar
npm run lint && npm run build
```

## Validação manual

```bash
npm run dev
```

### US1 — séries que acompanham a primeira

1. Treinos → criar "Treino A" → acrescentar "Supino reto".
2. Acrescentar séries até 4. Todas nascem iguais.
3. Na série 1, mudar carga para 40. **Esperado**: séries 2–4 mostram 40.
4. Na série 4, mudar carga para 35. **Esperado**: só a 4 muda.
5. Na série 1, mudar carga para 42,5. **Esperado**: 2 e 3 vão a 42,5; a 4 fica em 35.
6. Sair e reabrir o treino; mudar repetições da série 1. **Esperado**: 2 e 3 acompanham.

### US2 — referência da última vez no mesmo treino

1. Iniciar "Treino A", registrar no supino 10 × 40, 9 × 40, 8 × 40. Concluir.
2. Criar "Treino B" com supino, executar 12 × 30 e concluir.
3. Iniciar "Treino A" de novo. **Esperado**:
   - Série 1 mostra `anterior 40 kg × 10`; após confirmar, a série 2 mostra `anterior 40 kg × 9`.
   - Os campos de carga e repetições **não** vêm preenchidos pela referência.
   - Na lista de séries registradas, a série 1 mostra a referência ao lado.
   - A linha "Última vez" continua mostrando 30 kg (Treino B, qualquer treino).
4. Registrar uma 4ª série. **Esperado**: sem referência.
5. Acrescentar ao Treino A um exercício nunca feito nele. **Esperado**: sem referência.
