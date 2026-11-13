# Contrato de interface

## Editor de séries planejadas (`EditorSeries`)

- Nenhum controle novo. A tabela de séries é a mesma.
- Alterar um campo da série 1 altera o mesmo campo das séries que estavam idênticas a ela.
- Rótulos acessíveis inalterados (`Repetições da série N`, `Carga da série N em quilos`, …) — os
  testes e2e existentes continuam válidos.

## Tela de execução

### Série corrente (cartão de série)

```
Série 2 de 4                      meta 8–10 reps, 40 kg
                                     anterior 40 kg × 9
```

- Elemento com `data-referencia-anterior`; texto visível `anterior <formatarReferencia>`
  (`aria-hidden`), e texto só para leitor de tela `Na última vez neste treino, série N: <texto>.`
- Ausente quando não há referência para aquele número de série.
- Não é botão, não é tocável, não altera nenhum campo.

### Série registrada (razão)

```
1   40 kg × 11 ▲ acima da meta          RIR 2
    anterior 40 kg × 10
```

- Segunda linha sob os valores, na mesma coluna e na mesma ordem: a comparação se lê na
  vertical. Dentro da linha `data-serie-registrada`, um `span` com `data-referencia-anterior`.
- O botão da linha mantém o nome acessível `Corrigir ou remover a série N` e recebe a referência
  por `aria-describedby`.
- Não altera a área de toque da linha (ela continua abrindo a correção).

### Estilo

- Tamanho e cor do texto secundário já existente (token de texto secundário, contraste ≥ 4,5:1
  garantido pelos tokens).
- Sem transparência, sem fundo próprio.
- Números com a classe `numerico` (tabulares).
