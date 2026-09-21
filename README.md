# fit-kings

Aplicativo para montar, executar e acompanhar treinos de musculação. Os dados vivem no aparelho —
não há conta, servidor nem sincronização. A continuidade entre aparelhos é feita por exportação e
importação de arquivo.

PWA instalável, escrita em TypeScript, React e Vite, com persistência em IndexedDB. Não há etapa de
compilação nativa em nenhum ponto: nem Xcode, nem simulador, nem conta de desenvolvedor.

---

## Pré-requisitos

| Item | Versão | Observação |
|---|---|---|
| Node.js | 24 LTS | Fixado em `.nvmrc`. No WSL: `nvm install` (sem `--lts`) e `nvm use` |
| npm | acompanha o Node | — |

O `.nvmrc` existe por uma razão de calendário: o Node 26 entra em LTS em outubro de 2026, e a
partir daí `nvm install --lts` passaria a instalar 26. Com o arquivo, subir de versão vira decisão
registrada em vez de efeito da data.

No WSL, mantenha o projeto no sistema de arquivos nativo (`~/codes/...`), nunca em `/mnt/c` — o
IndexedDB e o watcher do Vite ficam lentos ou instáveis sobre o sistema de arquivos montado.

## Executar

```bash
nvm use
npm install
npm run dev
```

Abre em `http://localhost:5173`. `localhost` é contexto seguro, então o service worker e
`crypto.randomUUID()` funcionam sem HTTPS.

## Testar

```bash
npm run test        # Vitest — domínio, repositórios e auditoria de tokens
npm run test:watch
npm run test:e2e    # Playwright — os portões constitucionais
npm run lint
npm run build
```

Os quatro portões de teste da constituição estão cobertos:

| Portão | O que garante | Onde |
|---|---|---|
| 1 | Séries confirmadas sobrevivem a encerramento inesperado | `tests/e2e/retomada.spec.ts` |
| 2 | Histórico imune à edição e à exclusão do treino de origem | `tests/e2e/imutabilidade.spec.ts` |
| 3 | Importação idempotente e recusa de arquivo inválido | `tests/e2e/backup.spec.ts` |
| 4 | Determinismo do critério de aumento de carga | `tests/unidade/domain/progressao.test.ts` |

---

## Instalar no iPhone

**O detalhe que trava**: `vite --host` expõe a aplicação por HTTP num IP de rede, e **HTTP em IP de
rede não é contexto seguro**. Sem contexto seguro, no iPhone:

- o service worker não registra — logo, não há instalação nem funcionamento offline;
- `crypto.randomUUID()` fica indisponível — logo, não há criação de registro.

O aplicativo simplesmente não roda, **e isso é deliberado**. Não existe caminho alternativo de
geração de identificador: o aplicativo verifica o contexto seguro na inicialização e recusa-se a
operar com uma mensagem explícita, em vez de gerar registros por outro meio. Se você vir essa
recusa, a causa é o HTTP, não um defeito.

Dois caminhos:

```bash
npm run dev:https      # Vite com mkcert. Exige confiar no certificado no iPhone, uma vez.
```

```bash
npx cloudflared tunnel --url http://localhost:5173    # Túnel HTTPS. Mais simples, exige rede.
```

Com a URL HTTPS aberta no Safari: **Compartilhar → Adicionar à Tela de Início**.

A validação real acontece pelo ícone da tela inicial, não pela aba do Safari — são contextos de
armazenamento distintos, e só o primeiro representa o produto.

> **Os dois caminhos acima servem para validar, não para usar.** O IndexedDB é preso à origem, e
> tanto o IP local quanto a URL do túnel mudam — cada mudança abre um aplicativo vazio. Para uso
> diário é preciso um endereço fixo: ver [docs/deploy.md](docs/deploy.md).

---

## Backup: leia isto antes de confiar no aparelho

O armazenamento do navegador **pode ser apagado pelo sistema operacional** sob pressão de espaço, e
no iOS apagar o ícone da Tela de Início apaga os dados junto. O aplicativo solicita armazenamento
persistente na abertura e mostra o estado em **Ajustes › Diagnóstico**, mas nenhum navegador promete
conceder.

Por isso o backup em arquivo não é conveniência, é a única rede de proteção que existe:

- **Ajustes › Exportar ou importar** gera um JSON com todos os treinos, exercícios e treinos
  registrados;
- o lembrete aparece a cada **7 dias**, ou a cada **2 dias** quando a persistência não foi
  concedida;
- importar o mesmo arquivo duas vezes não duplica nada;
- um arquivo inválido é recusado sem alterar nenhum dado existente.

O arquivo **não é criptografado**. Ele carrega o seu histórico de treinos em texto legível — guarde-o
onde só você tenha acesso.

---

## Estrutura

```text
src/
├── domain/           TypeScript puro: sem React, sem Dexie, sem DOM
│   ├── backup/       validação, mesclagem e montagem do arquivo
│   ├── evolucao/     agregação da curva de cargas
│   ├── progressao/   o critério de aumento de carga
│   ├── serie/        validade de série, herança de carga, comparação
│   ├── sessao/       transições de estado, estado derivado, versionamento
│   ├── tipos/        entidades e predicados de formato
│   └── treino/       validação de treino e ordenação
├── dados/            Dexie: esquema, migrações e repositórios
├── funcionalidades/  telas, por jornada
├── ui/               componentes e tokens de tema
├── plataforma/       identificador, tempo, persistência, compartilhamento
└── app/              casca, rotas e guarda de contexto seguro
```

A separação que carrega peso aqui **não** é cliente/servidor — não há servidor. É `domain/` contra
todo o resto: `domain/` não importa React nem Dexie, e uma regra de lint garante isso por
ferramenta, não por disciplina. É o que torna toda regra de domínio testável sem interface.

Outras duas regras de lint valem a pena conhecer antes de mexer no código:

- `crypto.randomUUID()` só pode ser chamado em `src/plataforma/id.ts`;
- `src/domain/` não pode ler o relógio do sistema — regra de domínio recebe o instante como
  parâmetro.

---

## Documentos

| Documento | O quê |
|---|---|
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Os princípios que prevalecem sobre qualquer decisão técnica |
| [`specs/001-workout-tracking-app/spec.md`](specs/001-workout-tracking-app/spec.md) | A especificação |
| [`specs/001-workout-tracking-app/plan.md`](specs/001-workout-tracking-app/plan.md) | O plano de implementação |
| [`specs/001-workout-tracking-app/data-model.md`](specs/001-workout-tracking-app/data-model.md) | O modelo de dados, normativo |
| [`specs/001-workout-tracking-app/contracts/backup-file.md`](specs/001-workout-tracking-app/contracts/backup-file.md) | O contrato do arquivo de backup |
| [`docs/direcao-visual.md`](docs/direcao-visual.md) | A direção visual e sua avaliação contra os critérios |
| [`CHANGELOG.md`](CHANGELOG.md) | O que mudou em cada versão |
| [`docs/deploy.md`](docs/deploy.md) | Publicar, instalar no iPhone e o fluxo de cada melhoria |
