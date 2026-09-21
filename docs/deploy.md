# Publicar e atualizar o aplicativo

Como colocar o fit-kings no iPhone para uso diário, e o que fazer a cada melhoria.

---

## A regra que decide tudo: a origem é parte dos seus dados

O IndexedDB é preso à **origem** — o `https://host` de onde o aplicativo foi carregado. Mudou a
origem, é outro armazenamento: o aplicativo abre vazio e o histórico anterior fica inacessível.

Isso tem três consequências práticas, e elas valem mais do que qualquer detalhe de configuração
abaixo:

1. **Escolha o endereço uma vez e não mude.** Trocar `fit-kings.pages.dev` por um domínio próprio
   depois é, do ponto de vista dos dados, o mesmo que trocar de aparelho.
2. **Se você pretende ter um domínio próprio algum dia, comece com ele.** Migrar depois custa um
   ciclo de exportar e importar, feito na ordem certa — e feito errado, custa o histórico.
3. **Túnel de desenvolvimento não serve para uso real.** `cloudflared tunnel --url` gera um endereço
   aleatório a cada execução. Cada abertura seria um aplicativo novo e vazio.

O caminho de volta existe — exportar antes, importar depois —, mas depende de você lembrar de
exportar **antes** de a origem mudar. Depois, não há de onde exportar.

---

## Onde publicar

O aplicativo é um site estático: HTML, JS, CSS e alguns arquivos binários. Não há backend, não há
banco no servidor, não há variável de ambiente nem segredo. Qualquer hospedagem estática serve.

**Recomendado: Cloudflare Pages.** Dá um endereço de subdomínio raiz (`fit-kings.pages.dev`),
HTTPS por padrão, publicação automática a partir do GitHub e plano gratuito folgado. Netlify e
Vercel são equivalentes para este caso — escolha por preferência, não por capacidade.

**GitHub Pages tem uma desvantagem concreta aqui** e é a razão de não ser a recomendação: sem
domínio próprio, o endereço é `lucasreisds.github.io/fit-kings/`, um subcaminho. Isso exigiria
ajustar `base` no `vite.config.ts` e `start_url`/`scope` no manifesto — e, pior, faria o aplicativo
dividir a origem `lucasreisds.github.io` com todo outro projeto seu publicado lá.

### Primeira publicação, passo a passo

1. `git push origin main` (o repositório já está em `lucasreisds/fit-kings`).
2. No painel da Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, escolha o
   repositório.
3. Configuração de build:

   | Campo                  | Valor                                      |
   | ---------------------- | ------------------------------------------ |
   | Framework preset       | None                                       |
   | Build command          | `npm run build`                            |
   | Build output directory | `dist`                                     |
   | Root directory         | (vazio)                                    |
   | Node version           | `24` — variável de ambiente `NODE_VERSION` |

4. **Production branch**: `main`.
5. Salve. A primeira publicação leva um ou dois minutos.

Não há segredo nem token para configurar no repositório: a Cloudflare lê o GitHub por conta dela.

### Instalar no iPhone

1. Abra o endereço no **Safari** — não no Chrome nem dentro de outro aplicativo. Só o Safari
   instala PWA no iOS.
2. **Compartilhar → Adicionar à Tela de Início.**
3. Abra **pelo ícone**, nunca pela aba do Safari. São contextos de armazenamento distintos, e só o
   do ícone é o aplicativo.
4. Em **Ajustes → Diagnóstico**, confira o estado da persistência.

> Apagar o ícone da Tela de Início apaga os dados junto. Não é defeito, é como o iOS trata o
> armazenamento de PWA — e é exatamente o risco R1 do projeto.

---

## Fluxo de uma melhoria

```text
  branch  →  spec (se mudar escopo)  →  código + teste  →  verificação local
                                                                   ↓
       aparelho  ←  deploy automático  ←  merge na main  ←  PR com CI verde
```

### 1. Branch

```bash
git switch main && git pull
git switch -c task/nome-da-melhoria
```

### 2. Mudou o escopo? A especificação vem antes

Este projeto é dirigido por especificação, e a constituição é explícita: _"Mudança de escopo é
registrada na especificação antes de ser construída, nunca depois"_. Requisito novo, ou mudança de
comportamento visível ao usuário, passa por `/speckit-specify` e `/speckit-plan` antes do código.

Correção de defeito, ajuste de layout e melhoria interna não precisam disso — a ressalva de
rastreabilidade cobre infraestrutura e ferramental.

### 3. Código e teste

A constituição não considera concluída uma regra de domínio sem teste cobrindo seus casos de
fronteira. Na prática: se a alteração mexe em `src/domain/`, ela vem com teste.

### 4. Verificação local

```bash
npm run lint && npx tsc -b && npm run test && npm run test:e2e
```

Três regras de lint derrubam o build por violação constitucional, e isso é intencional:

- `src/domain/` não importa React, Dexie nem DOM;
- `crypto.randomUUID()` só é chamado em `src/plataforma/id.ts`;
- regra de domínio não lê o relógio do sistema.

Se uma delas reclamar, o caminho é mudar a abordagem — não silenciar a regra.

### 5. Versão e CHANGELOG

Se a melhoria é visível ao usuário, suba a versão em `package.json` e registre em `CHANGELOG.md`.

Isso não é burocracia: a versão viaja no cabeçalho de **todo arquivo de backup exportado**, por
exigência do contrato. Sem o registro, quem abrir um arquivo antigo não tem como saber o que o
gerou.

### 6. PR, CI e merge

```bash
git push -u origin task/nome-da-melhoria
gh pr create --fill
```

A CI (`.github/workflows/ci.yml`) roda lint, tipos, os 457 testes de unidade e integração, os
portões de ponta a ponta e o build. **Ela é a última coisa entre a sua alteração e o aplicativo
instalado no seu bolso** — a atualização do service worker é automática e não pede confirmação a
ninguém.

Merge na `main` dispara a publicação.

### 7. A atualização chegando no aparelho

O service worker está em `registerType: 'autoUpdate'`. Na prática:

1. Você abre o aplicativo. Ele roda a versão que já estava instalada e **baixa a nova em segundo
   plano**.
2. Na abertura seguinte, a versão nova assume.

Ou seja: **fechar e reabrir duas vezes** é o que garante ver a mudança. Se parecer que a atualização
não chegou, é quase sempre isso — não um deploy que falhou.

---

## O que sobrevive a uma atualização, e o que a quebraria

Os dados ficam no aparelho e **não são tocados** por uma publicação: a origem é a mesma, e o
IndexedDB persiste. O que muda é só o código.

O que quebraria — e o que o projeto já faz para impedir:

| Risco                            | Proteção                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Migração destrutiva de esquema   | `verificarAditividade` **recusa** migração que remova tabela ou índice, no instante em que o banco abre             |
| Campo removido ou ressignificado | Política aditiva em `src/dados/migracoes/` — campo descontinuado é marcado e deixa de ser escrito, nunca apagado    |
| Mudança no formato do backup     | `formatVersion` e a política de compatibilidade do contrato. Adicionar campo ou coleção **não** incrementa a versão |
| Código quebrado publicado        | A CI, e o hábito de exportar um backup antes de uma alteração arriscada                                             |

**Antes de publicar algo que mexa na camada de dados, exporte um backup pelo aplicativo.** É a
única coisa que independe de tudo o mais dar certo.

---

## Pendências antes de confiar no uso diário

Quatro verificações exigem um iPhone com o aplicativo instalado pela Tela de Início e não são
simuláveis — `T113`, `T114`, `T116` e `T117` em
[tasks.md](../specs/001-workout-tracking-app/tasks.md), detalhadas em [validacao.md](validacao.md).

**A mais importante é T113**: registrar dados, reiniciar o aparelho, deixar dias sem uso e conferir
se tudo continua lá. Ela é o risco R1 inteiro. Até ela passar, exporte um backup com frequência —
o aplicativo lembra a cada 7 dias, ou a cada 2 se o iOS não conceder armazenamento persistente.

O resultado de T113 é registrado em
[research.md § R1](../specs/001-workout-tracking-app/research.md).
