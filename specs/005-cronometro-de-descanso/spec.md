# Feature Specification: Campo de carga apagável e cronômetro de descanso

**Feature Branch**: `task/cronometro-de-descanso`
**Created**: 2026-09-27
**Status**: Draft
**Input**: Defeito relatado no uso — o campo de carga não permite apagar o último dígito — e pedido
de um cronômetro de descanso iniciado pelo usuário.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trocar 45 kg por 50 kg (Priority: P1)

Na série 1 da puxada frontal o usuário registrou 45 kg. Na série 2 o campo já vem com 45, herdado
da série anterior. Ele quer subir para 50: apaga o "5", apaga o "4", digita "50".

**Why this priority**: É um defeito no caminho mais comum do aplicativo. Subir a carga entre séries
é o gesto central da progressão — o aplicativo existe para isso — e hoje ele só funciona por acaso,
quando o número novo compartilha o primeiro dígito com o velho.

**Independent Test**: Registrar uma série com carga, ir para a seguinte, apagar os dígitos um a um e
digitar um valor novo com primeiro dígito diferente.

**Acceptance Scenarios**:

1. **Given** a série 1 registrada com 45 kg e a série 2 em branco, **When** o usuário apaga os dois
   dígitos um de cada vez, **Then** o campo fica vazio e permanece vazio.
2. **Given** o campo de carga vazio depois de apagado, **When** o usuário digita "50", **Then** o
   campo mostra 50.
3. **Given** a série 2 nunca tocada, **When** a tela é aberta, **Then** o campo mostra 45, herdado
   da série anterior, como hoje.
4. **Given** o campo de carga apagado de propósito, **When** o usuário confirma a série, **Then** a
   série é registrada sem carga — o que ficou gravado é o que estava na tela.

---

### User Story 2 - Descansar entre séries sem olhar o relógio (Priority: P1)

O usuário termina uma série, registra, e quer descansar o tempo que planejou. Ele toca um botão, faz
o que tiver de fazer, e o aplicativo avisa quando o tempo acabou.

**Why this priority**: É o pedido. Contar o descanso no relógio da parede ou no cronômetro do
celular tira o usuário do aplicativo no meio da sessão.

**Independent Test**: Iniciar o descanso num exercício com tempo planejado e conferir que ele conta
para trás a partir do valor planejado e avisa ao chegar a zero.

**Acceptance Scenarios**:

1. **Given** um exercício com 90 segundos de descanso planejado, **When** o usuário toca o botão de
   descansar, **Then** a contagem começa em 90 segundos.
2. **Given** um exercício sem descanso planejado, **When** o usuário toca o botão de descansar,
   **Then** a contagem começa em 2 minutos.
3. **Given** uma contagem em andamento, **When** ela chega a zero, **Then** o aplicativo emite um som
   curto e mostra um aviso visível de que o descanso terminou.
4. **Given** uma série recém-confirmada, **When** o usuário não toca em nada, **Then** nenhuma
   contagem começa.

---

### User Story 3 - O treino não para por causa do cronômetro (Priority: P1)

Com a contagem rodando, o usuário registra uma série, troca de exercício, corrige um valor e conclui
o treino. Nada disso é impedido, atrasado ou interrompido.

**Why this priority**: O Princípio II põe avisos de descanso na mesma categoria de tudo que não pode
parar um treino. Um cronômetro que exige um toque para sair do caminho é pior que não ter cronômetro.

**Independent Test**: Iniciar a contagem e percorrer a sessão inteira com ela rodando.

**Acceptance Scenarios**:

1. **Given** uma contagem em andamento, **When** o usuário confirma uma série, **Then** a série é
   registrada e a contagem segue.
2. **Given** uma contagem em andamento, **When** o usuário troca de exercício, **Then** a contagem
   segue e continua visível.
3. **Given** o aviso de fim de descanso na tela, **When** o usuário faz qualquer outra coisa,
   **Then** a ação acontece sem que ele precise fechar o aviso antes.
4. **Given** uma contagem em andamento, **When** o usuário conclui o treino, **Then** o treino é
   concluído e a contagem termina junto.

---

### User Story 4 - Sair do aplicativo e voltar (Priority: P2)

O usuário inicia o descanso, troca para outro aplicativo ou bloqueia a tela, e volta depois.

**Why this priority**: É o uso real na academia. Um cronômetro que zera ou congela ao sair da tela
não serve para nada, e o Princípio I não admite que o aplicativo minta sobre o que aconteceu.

**Independent Test**: Iniciar a contagem, recarregar a página, conferir o tempo restante.

**Acceptance Scenarios**:

1. **Given** uma contagem de 90 segundos iniciada há 30, **When** o usuário recarrega a página,
   **Then** a contagem mostra aproximadamente 60 segundos restantes.
2. **Given** uma contagem de 90 segundos iniciada há 120, **When** o usuário volta ao aplicativo,
   **Then** o descanso aparece como terminado, e não como recém-começado.
3. **Given** o usuário fora do aplicativo quando o tempo acaba, **When** ele volta, **Then** o aviso
   visual está lá. O som não terá tocado, porque o aparelho congela o aplicativo em segundo plano.

---

### Edge Cases

- Iniciar o descanso com uma contagem já em andamento reinicia a contagem, em vez de criar uma
  segunda. O usuário tem um descanso por vez, porque tem um corpo só.
- Descanso planejado de zero segundos é tratado como ausência de descanso planejado: a contagem usa
  o padrão de 2 minutos.
- Cancelar o descanso o remove por inteiro, sem som e sem aviso.
- Concluir ou descartar o treino encerra a contagem; ela não sobrevive à sessão que a originou.
- O som falha em silêncio. Nenhum erro é exibido se o aparelho estiver no mudo ou recusar o áudio —
  o aviso visual continua valendo por si.

## Requirements *(mandatory)*

### Functional Requirements

#### Campo de carga

- **FR-167**: O campo de carga DEVE distinguir "o usuário não tocou no campo", quando o valor
  herdado da série anterior é exibido, de "o usuário apagou o campo", quando ele fica vazio.
- **FR-168**: Apagar todo o conteúdo do campo de carga DEVE deixá-lo vazio e assim mantê-lo até que
  o usuário digite algo ou confirme a série.
- **FR-169**: Confirmar uma série com o campo de carga apagado de propósito DEVE registrar a série
  sem carga, e não com o valor herdado que estava lá antes.
- **FR-170**: O comportamento do campo de repetições NÃO DEVE mudar.
- **FR-171**: A herança de carga da série anterior (FR-085) NÃO DEVE mudar para quem não toca no
  campo.

#### Cronômetro de descanso

- **FR-172**: O sistema DEVE oferecer, na tela de execução, uma ação explícita para iniciar o
  descanso.
- **FR-173**: O sistema NÃO DEVE iniciar o descanso por conta própria em nenhuma circunstância,
  inclusive ao confirmar uma série.
- **FR-174**: A duração do descanso DEVE ser o tempo planejado do exercício em foco (FR-148) quando
  houver, e 2 minutos quando não houver.
- **FR-175**: O sistema DEVE apresentar o tempo restante enquanto a contagem estiver em andamento.
- **FR-176**: O sistema DEVE emitir um som curto e apresentar um aviso visível quando a contagem
  chegar a zero.
- **FR-177**: O tempo restante DEVE ser calculado a partir do instante em que a contagem foi
  iniciada, e não por acúmulo de tiques, de modo que sair do aplicativo e voltar mostre o tempo
  correto, inclusive já terminado.
- **FR-178**: A contagem DEVE sobreviver a recarregar a página e a fechar e reabrir o aplicativo,
  enquanto a sessão que a originou estiver em andamento.
- **FR-179**: O sistema DEVE permitir cancelar o descanso em andamento.
- **FR-180**: O sistema DEVE manter no máximo uma contagem por vez; iniciar uma nova substitui a
  anterior.
- **FR-181**: A contagem NÃO DEVE bloquear, interromper, atrasar ou exigir interação para que o
  usuário registre séries, corrija valores, troque de exercício ou conclua o treino.
- **FR-182**: O aviso de fim de descanso NÃO DEVE exigir que o usuário o feche para seguir usando o
  aplicativo.
- **FR-183**: A contagem DEVE encerrar quando a sessão for concluída ou descartada.
- **FR-184**: O sistema NÃO DEVE usar notificação do sistema operacional, servidor externo ou
  qualquer recurso que exija rede para avisar o fim do descanso.
- **FR-185**: A falha em emitir som NÃO DEVE produzir erro visível nem impedir o aviso visual.
- **FR-186**: A contagem NÃO DEVE ser gravada no histórico do treino. Ela é estado da sessão em
  andamento, não registro do que foi executado.

**FR-151 é substituído por FR-172 a FR-186.** A proibição de contar o tempo existia porque contar
tempo sem que o usuário peça é o aplicativo impondo ritmo. A condição de o usuário iniciar por
vontade própria é o que torna a contagem compatível com o Princípio II, e é ela que FR-173 fixa.

### Key Entities

- **Descanso em andamento**: pertence a uma sessão em andamento. Guarda o instante de início e a
  duração em segundos. Não pertence ao histórico e desaparece com a sessão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-054**: Partindo de um campo de carga com 45, o usuário chega a 50 apagando dígito a dígito em
  100% das tentativas.
- **SC-055**: O campo de carga apagado permanece vazio por tempo indeterminado, em 100% dos casos.
- **SC-056**: Quem não toca no campo de carga vê o valor herdado da série anterior em 100% das
  séries a partir da segunda, igual a antes desta alteração.
- **SC-057**: A contagem de descanso nunca começa sem um toque do usuário, em 100% das sessões.
- **SC-058**: Num exercício com descanso planejado, a contagem começa nesse valor em 100% das vezes;
  sem descanso planejado, começa em 120 segundos em 100% das vezes.
- **SC-059**: Recarregar a página durante a contagem preserva o tempo restante com erro menor que 2
  segundos.
- **SC-060**: Com a contagem em andamento, registrar uma série, trocar de exercício e concluir o
  treino funcionam em 100% das tentativas, sem toque adicional para dispensar o cronômetro.
- **SC-061**: Nenhum dado de contagem aparece no histórico nem no arquivo de backup.

## Assumptions

- O descanso é um só por sessão, não um por exercício. Quem descansa é a pessoa.
- Ajustar a duração na hora fica de fora: quem quer outro tempo altera o descanso planejado do
  exercício. Manter o cronômetro sem controles de mais ou menos o mantém utilizável com uma mão só.
- O som é curto e discreto. Academia é ambiente barulhento e compartilhado; o aviso visual é o que
  carrega a informação, e o som é o que traz o olho de volta.
- O áudio é liberado pelo próprio toque que inicia a contagem, que é um gesto do usuário — não há
  pedido de permissão separado.
- O aviso de fim permanece até que o usuário inicie outro descanso ou o dispense.

## Out of Scope

- Ajustar a duração do descanso durante a contagem.
- Notificação com o aplicativo fechado ou a tela bloqueada.
- Registrar no histórico quanto tempo o usuário de fato descansou.
- Descanso diferente entre séries do mesmo exercício.
- Cronômetro para a série em si, ou para o treino inteiro.
