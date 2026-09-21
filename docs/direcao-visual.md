# Direção visual — fit-kings

**Decidida em**: T042, fase de implementação, conforme D9 de
[research.md](../specs/001-workout-tracking-app/research.md).
**Constituição**: v1.4.0 — § Restrições de Produto e Plataforma › Estilo visual.

A constituição não obriga nenhum estilo. Ela reprova qualquer um que falhe em um dos cinco
critérios de D9. Este documento registra a direção escolhida e a avalia contra os cinco, um a um.

---

## A direção: "Caderno de carga"

O aplicativo substitui a anotação em papel. A direção leva isso ao pé da letra: a tela é uma
página de caderno de treino, e **os números são o desenho** — não o enfeite em volta deles.

Três decisões sustentam tudo o mais.

### 1. Interface clara, e isso é consequência do critério 4

Aplicativo de academia é quase sempre escuro com acento neon. Aqui é o contrário, e não por
gosto.

O critério 4 pede legibilidade **sob luz forte e com brilho de tela reduzido**, que é a condição
real: academia iluminada e celular em economia de bateria. As duas condições se combinam da pior
forma possível para uma interface escura — um painel que emite pouca luz, sob luz ambiente alta,
vira espelho preto. Uma interface clara emite a luminância máxima que o painel tem disponível na
maior parte da tela, e continua legível nas duas condições.

Uma interface escura satisfaz o brilho reduzido e falha na luz forte. Como o critério exige as
duas, ela está fora. **A escolha é da condição de uso, não da estética.**

Consequência: **não há modo escuro**. Um segundo tema dobraria a superfície onde o contraste pode
quebrar e entregaria, na tela que mais importa, exatamente a condição que o critério 4 recusa.

### 2. Elevação por luminância, nunca por sombra

A superfície ativa — o cartão da série corrente — é **branco puro** sobre um papel quase branco
(`#FFFFFF` sobre `#F7F7F5`). O elemento mais claro da tela é sempre onde o usuário digita.

Não há sombra, transparência nem blur em lugar nenhum do aplicativo. Isso atende ao critério 2 de
forma estrutural em vez de por disciplina: não existe efeito cujo custo dependa do conteúdo
embaixo, porque não existe efeito. O ganho não é só de desempenho — fundo de texto estável e
independente do que está atrás é literalmente o que o critério 1 pede.

### 3. Os numerais são a identidade

Carga e repetições da série corrente aparecem a **72 px**, na largura expandida da fonte, com
figuras tabulares. Nada mais na tela chega perto desse tamanho.

Isso resolve o critério 3 na origem: a constituição **exige** que carga, repetições e RIR sejam os
elementos de maior hierarquia da tela de execução. Fazer dos numerais a identidade visual alinha a
estética com a exigência em vez de disputá-la. As séries já concluídas descem para um livro-razão
de colunas alinhadas, que rima com a linha ampliada acima — a página do caderno, com a linha que
está sendo escrita em destaque.

---

## Tokens

### Cor

| Token | Valor | Papel |
|---|---|---|
| `papel` | `#F7F7F5` | Fundo da página |
| `carta` | `#FFFFFF` | Superfície ativa — elevação por luminância |
| `tinta` | `#101826` | Texto principal, escuro azulado aparentado ao acento |
| `tintaSecundaria` | `#5A6472` | Rótulos e metadados |
| `acento` | `#1449B8` | Acento **único** |
| `positivo` | `#146B3A` | Acima da meta, progressão possível |
| `atencao` | `#8A4B10` | Persistência não garantida (FR-122) |
| `critico` | `#A61B1B` | Falha ao persistir, ação destrutiva (FR-058) |
| `contorno` | `#737C8A` | Contorno de controle, piso de 3:1 (WCAG 1.4.11) |

**Sobre o acento**: `#1449B8` é o azul da anilha de 20 kg da federação internacional — a anilha mais
usada numa barra. A cor vem do assunto do produto, não de uma paleta escolhida à parte. É o
**único** acento: o vocabulário de cor tem uma cor de ação e três de estado, e nada mais.

**Cor nunca é o único portador de significado.** Progressão possível leva marca e texto além do
verde; a aba ativa leva peso tipográfico e uma régua além do azul; estado de exercício leva
palavra, não só tom.

### Tipografia

**Archivo variável**, servida de `public/fontes/` — não de CDN. FR-057 proíbe dependência de rede
depois da instalação, e uma família hospedada por terceiro é exatamente isso. São 176 KB, incluídos
no precache do service worker.

O **eixo de largura** (`wdth`, 62–125) é o recurso de exibição: os numerais da série corrente são
expandidos, o resto da interface é normal. É a própria tipografia fazendo a hierarquia que o
critério 3 exige, sem precisar de uma segunda família.

| Papel | Tamanho | Peso |
|---|---|---|
| Numeral da série corrente | 72 px | 700, expandido |
| Numeral médio | 40 px | 700 |
| Título | 24 px | 700 |
| Corpo | 17 px | 400 |
| Rótulo | 13 px | 500, **caixa de frase** |

Números de dados levam `font-variant-numeric: tabular-nums`. Não é preciosismo: uma coluna de
séries em 8/8/8 contra 9/9/9 precisa alinhar dígito a dígito para ser lida de relance, e figuras
proporcionais desalinham a coluna.

### Forma e espaço

Grade vertical de 4 px. Raios **diferenciados por função** — 12 px no cartão, 8 px no campo, 10 px
na ação, pílula só no seletor de filtro, zero nas réguas do livro-razão. Um raio único em tudo
apaga hierarquia.

Alvos de toque: 44 pt de piso em toda parte, 56 pt na ação primária da tela de execução, que é o
toque mais repetido do produto.

---

## Avaliação contra os cinco critérios de D9

| # | Critério | Como esta direção atende | Estado |
|---|---|---|---|
| 1 | Contraste 4,5:1 **garantido por construção** | As cores não são expostas soltas: `src/ui/tokens.ts` expõe **pares texto/fundo já validados**, e os componentes consomem pares. `tests/unidade/ui/tokens.test.ts` recalcula todos e falha abaixo do piso. Não existe API que permita montar uma combinação reprovada. | ✅ verificado por teste |
| 2 | Tela de execução sem transparência, blur ou efeito dependente do conteúdo embaixo | Não há nenhum desses efeitos em **nenhuma** tela. A elevação é luminância. | ✅ |
| 3 | Carga, repetições e RIR com a maior hierarquia visual | Numerais a 72 px na largura expandida; nada mais na tela passa de 24 px. | ✅ |
| 4 | Legível sob luz forte e com brilho reduzido | Interface clara de alta luminância, escolhida **por causa deste critério**. Ver a decisão 1 acima. | ⏳ confirmar em aparelho (T116) |
| 5 | Nenhum efeito compromete rolagem nem a meta de 5 s por série | Sem sombra, sem blur, sem transparência, sem animação de entrada. A única transição é a cor de fundo de botão ao toque, em 120 ms, e `prefers-reduced-motion` a anula. | ⏳ medir em aparelho (T117) |

Os critérios 4 e 5 têm componente que só um aparelho real responde, e é o que T116 e T117 fazem.
Os três primeiros são estruturais e já estão fechados.

---

## A tela de execução, avaliada (T124)

É a tela onde as restrições mais apertam, e a única que a constituição descreve item a item. A
avaliação dela contra os cinco critérios, separada da avaliação geral porque é a que decide se a
direção passa:

| # | Critério | Na tela de execução | Estado |
|---|---|---|---|
| 1 | Contraste por construção | Só pares de `PARES`. O cartão da série é `cartaPrimaria` (17,8:1); os rótulos, `cartaSecundaria` (6,0:1); as pílulas de atalho, `faixaAcento` (7,9:1). | ✅ |
| 2 | Sem transparência, blur ou efeito dependente do conteúdo embaixo | `execucao.module.css` não tem uma única declaração de `backdrop-filter`, `box-shadow` ou `opacity` sobre conteúdo. O cartão da série é branco puro sobre papel — elevação por luminância. | ✅ |
| 3 | Carga, repetições e RIR com a maior hierarquia | Carga e repetições a **72 px**, peso 800, largura 118%. O nome do exercício, que é o segundo elemento mais forte, fica a 24 px — um terço. O RIR é o terceiro, em controle de passo com alvos de 44 pt. | ✅ |
| 4 | Legível sob luz forte e brilho reduzido | Fundo claro de alta luminância; numerais em tinta quase preta sobre branco puro. | ⏳ aparelho (T116) |
| 5 | Sem efeito que comprometa a rolagem ou os 5 s por série | Só o corpo rola; cabeçalho e rodapé são fixos e não sobrepõem. Nenhuma animação de entrada. A única transição é a cor de fundo do botão ao toque, 120 ms. | ⏳ aparelho (T117) |

**Contagem de toques para registrar uma série** (SC-001), no caminho comum — a carga já vem herdada
da série anterior do mesmo exercício (FR-085):

1. tocar **Fiz as 10** ou **Fiz 11**, conforme o que aconteceu;
2. tocar **Confirmar série**.

São **2 toques**. Se as repetições não forem nem a meta nem a meta mais uma, o caminho é tocar o
campo, digitar e confirmar — 3 toques. O piso da constituição é 3; o caminho comum fica abaixo dele.

**A carga nunca é pré-preenchida entre sessões** (FR-082). A execução anterior aparece como
referência no cabeçalho do exercício, com um botão de um toque para aplicá-la (FR-084) — oferecer e
preencher são coisas diferentes, e a diferença é quem decide a carga de hoje. Dentro da sessão, a
carga herdada da série anterior é exibida **exatamente como um valor digitado**: mesmo tamanho,
mesmo peso, mesma cor, sem marca d'água nem estado provisório (FR-119).

**A comparação com a meta leva marca e palavra, não só cor**: `▲ acima da meta`, `= na meta`,
`▼ abaixo da meta`. Em preto e branco, ou para quem não distingue as cores, a informação continua
inteira.

### As telas de US3 (T125)

São três, e todas reaproveitam o vocabulário já estabelecido em vez de inventar um próprio:

- **Aviso de sessão em andamento** (T077, T081): faixa, nunca diálogo. Não bloqueia nenhuma tela
  (Princípio II). Muda de `acento` para `atencao` quando a sessão está aberta há mais de 12 horas, e
  só então oferece concluir e descartar ao lado de retomar — uma sessão de ontem que ninguém
  encerrou não é o treino de agora.
- **Diálogo de descarte** (T073): `<dialog>` modal, fundo opaco, ação destrutiva em `acaoDestrutiva`
  e a alternativa segura à esquerda. Diz o que se perde e o que fazer em vez disso.
- **Falha ao persistir** (T082): **a única coisa autorizada a interromper um treino.** É modal, não
  fecha no Esc sem escolha, e oferece as duas saídas de FR-058 — tentar de novo, ou continuar depois
  de anotar os valores. Sob as mesmas restrições visuais da tela de execução: sem transparência, sem
  blur, fundo opaco.

### As telas de US4 (T126)

A comparação planejado x realizado é o conteúdo mais denso em número do produto inteiro, e a
direção resolve isso com três decisões:

- **Colunas fixas e figuras tabulares.** A grade do detalhe da sessão tem quatro colunas de largura
  constante — ordem, planejado, realizado, comparação — e todo número leva `tabular-nums`. Ler uma
  coluna de cima para baixo é o que revela o padrão do dia; ela só se lê se os dígitos alinharem.
- **A comparação leva marca e palavra, não só cor.** `▲ acima`, `= na meta`, `▼ abaixo`. O verde
  reforça, nunca carrega sozinho — em preto e branco, sob luz forte, ou para quem não distingue as
  cores, a informação continua inteira.
- **A marca de correção informa sem competir.** É uma pílula pequena no cabeçalho, em tom de acento
  tênue, com a data da última alteração e a contagem de correções (FR-116). Um histórico que grita
  "corrigido" a cada tela faz o usuário evitar corrigir — e um erro de digitação não corrigido
  envenena toda a comparação de desempenho, que é justamente o que FR-112 existe para impedir.

Na tela de correção, o campo alterado ganha contorno de acento com 2 px enquanto difere do valor
gravado. É o único lugar do aplicativo onde um estado "sujo" é sinalizado, e ele importa: o usuário
precisa ver o que vai mudar antes de confirmar (FR-118).

### As telas de US5 e US6 (T112)

**Aviso de progressão.** Faixa `faixaPositiva` na tela de execução, com marca `▲` e a frase "Dá
para aumentar a carga". Não bloqueia, não interrompe, não exige interação — o Princípio II põe
avisos de progressão explicitamente entre as coisas que não podem parar um treino. Quando não há
indicação, **nada aparece**: um aviso dizendo "não dá para aumentar" seria ruído a cada série.

O "Ver por quê" leva ao detalhe que FR-047 exige — série a série, a meta, o que foi feito e se
aquela série superou. O texto vem da mesma função pura que decidiu o aviso, nunca de uma frase
escrita à parte: um aviso que não se explica corrói a confiança no produto inteiro.

**Evolução de cargas.** Um gráfico de linha, série única, em SVG:

- **Sem legenda**, porque há uma série só — o título nomeia o que está no gráfico.
- **Um eixo de valor.** Carga e volume têm escalas diferentes e nunca dividem o mesmo gráfico.
- **Marca fina**: linha de 2,5 px, pontos de 3,5 px, 4,5 px nas pontas. Eixo recessivo, sem grade.
- **Rótulo direto só nas pontas.** Um número em cada ponto viraria um amontoado de dígitos.
- **A tabela abaixo é a visão acessível do gráfico** e, ao mesmo tempo, o caminho de cada ponto
  para a sessão que o originou (US6, cenário 2). Uma coisa, duas funções.

Histórico insuficiente recebe uma mensagem que diz **quantas execuções faltam**, em vez de uma tela
vazia ou de um gráfico de um ponto só (US6, cenário 3).

---

## O que foi recusado

**Glassmorphism**, direção obrigatória até a constituição v1.3.0. O critério 2 a tornaria
inaplicável exatamente na tela onde o produto é mais usado, o que reduziria o estilo a decoração de
telas secundárias. A v1.4.0 removeu a obrigatoriedade; esta direção não a reintroduz por outro nome.

**Modo escuro.** Ver a decisão 1.

**Fonte de CDN.** Ver Tipografia.

**Cor de anilha por faixa de carga.** A ideia de colorir a carga conforme a anilha correspondente é
bonita e falha em dois pontos: faria da cor o portador de significado, e encheria a tela de matizes
concorrentes justamente onde os numerais precisam dominar. Um acento, e só.

---

## Aplicação por tela

| Fase | Tarefa | Telas |
|---|---|---|
| Phase 2 | T127 | app shell, aviso de persistência, diagnóstico |
| US3 | T125 | ver a nota abaixo |
| US4 | T126 | ver a nota abaixo |
| US5, US6 | T112 | ver a nota abaixo |
| US1 | T042 | **decide a direção** e aplica às telas de treino |
| US7 | T057 | seleção de arquivo, resumo, relatório, lembrete |
| US2 | T124 | **tela de execução** — o caso central |
| US3 | T125 | sessão pendente, retomada, falha ao persistir |
| US4 | T126 | histórico, detalhe, histórico por exercício, correção |
| US5, US6 | T112 | aviso de progressão, evolução de cargas |
| Phase 10 | T116 | valida a direção em aparelho real |
