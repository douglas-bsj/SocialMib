# Mib Social

Gerenciador de redes sociais da **mibtecno**: agenda e publica posts em várias redes, centraliza
comentários/mensagens (Inbox), mostra métricas (Analytics) e pode ser operado por agentes de IA
via servidor MCP. Repositório: <https://github.com/douglas-bsj/SocialMib> (**público** — nunca
versione senhas, tokens ou chaves).

**Stack:** Next.js 16 (standalone) · Prisma 7 + PostgreSQL · NextAuth v5 (login por e-mail/senha) ·
BullMQ + Redis (worker de publicação) · SMTP (e-mails) · OpenAI (geração de texto, opcional).

## Telas e rotas

| Rota | O que é |
|------|---------|
| `/` | Redireciona: sem sessão → `/login`; com sessão → `/dashboard` |
| `/login`, `/forgot-password`, `/reset-password` | Acesso e recuperação de senha |
| `/register` | Cadastro público — **desligado por padrão** (ver abaixo) |
| `/dashboard`, `/accounts`, `/publish`, `/schedule`, `/inbox`, `/analytics` | Uso diário |
| `/ajuda` | O que cada rede social exige para conectar |
| `/settings/*` | Perfil, Workspace, Membros, API e IA |
| `/privacidade`, `/termos`, `/contato` | Páginas públicas (LGPD) |
| `/api/mcp` | Servidor MCP (autenticação por chave de API criada em Configurações → API e IA) |
| `/api/health` | Saúde do app (usado pelos healthchecks) |

## Situação de cada rede

| Rede | Publicar | Inbox |
|------|----------|-------|
| Twitter/X, Threads, Instagram, Facebook | sim | sim |
| Bluesky, Reddit, Pinterest | sim | — |
| TikTok | sim — vídeo ou fotos (ver abaixo) | — |
| YouTube | sim — vídeo, com título, visibilidade e "feito para crianças" | — |
| LinkedIn | **retirado do site** — conexão bloqueada em `api/social/[platform]/connect`; o publicador (`src/lib/publishers/linkedin.ts`) continua no código. Para voltar, desfaça o commit que o retirou. | — |

Instagram exige imagem em todo post. Bluesky não usa OAuth: conecta com o handle e uma
*app password* criada no próprio Bluesky. As demais só ficam conectáveis depois que as chaves
OAuth delas estiverem no Env da stack (veja [Variáveis de ambiente](#variáveis-de-ambiente)).

**Vídeo:** o upload aceita MP4/MOV/WebM até 95 MB (limite de 100 MB da Cloudflare). Um post com
vídeo leva só o vídeo e, por enquanto, só pode ir para o TikTok e o YouTube — as outras redes
recusam vídeo com mensagem clara.

### TikTok

- Código: `src/lib/publishers/tiktok.ts` (publicação), `src/lib/social/tiktok.ts` (API, token),
  `src/lib/tiktok-options.ts` (opções do post, guardadas em `Post.platformOptions.tiktok`).
- **Vídeo** vai por `FILE_UPLOAD`: o worker baixa o vídeo e envia em partes ao TikTok.
- **Fotos** (JPG/WebP) vão por `PULL_FROM_URL`: o TikTok baixa do nosso site, o que exige
  **verificar o domínio** (`social.mibtecno.com.br`) em TikTok Developers → app → URL properties.
- **Token:** o access token dura poucas horas; o worker e a tela renovam com o refresh token
  (cada renovação troca o refresh token). Por isso o worker também recebe `TIKTOK_CLIENT_KEY` e
  `TIKTOK_CLIENT_SECRET`.
- **Regras do TikTok na tela** (exigidas para a auditoria): mostrar a conta (creator_info),
  privacidade escolhida manualmente sem padrão, Comentário/Dueto/Costura desligados por padrão,
  aviso de Confirmação de Uso de Música.
- **App não auditado:** só publica em contas TikTok **privadas** e o post sai como "Só eu"
  (até 5 usuários por dia). Para posts públicos, pedir a auditoria em
  <https://developers.tiktok.com/application/content-posting-api>.
- Limite do TikTok: cerca de 15 posts por dia por conta.

### YouTube

- Código: `src/lib/publishers/youtube.ts` (upload resumable da Data API v3),
  `src/lib/social/youtube.ts` (renovação do token). Opções em `Post.platformOptions.youtube`:
  título (obrigatório, até 100 caracteres), visibilidade (público / não listado / privado) e
  "feito para crianças" (declaração obrigatória do YouTube). O texto do post vira a descrição.
- **Token:** o access token do Google dura 1 hora; o worker renova com o refresh token, por isso
  também recebe `YOUTUBE_CLIENT_ID` e `YOUTUBE_CLIENT_SECRET`.
- **Google Cloud:** projeto com a *YouTube Data API v3* ativada, cliente OAuth do tipo
  "Aplicativo da Web" com o redirect `https://social.mibtecno.com.br/api/social/youtube/callback`.
  Em modo **Teste**, só os usuários de teste cadastrados conectam e o acesso vence em 7 dias;
  publique o app (tela de consentimento → "Publicar app") para isso não acontecer. O escopo
  `youtube.upload` é sensível: sem a verificação do Google, o login mostra o aviso
  "app não verificado" e o app fica limitado a 100 usuários.
- Cota: por padrão, 100 envios de vídeo por dia por projeto do Google Cloud.

## Contas de usuário e cadastro público

Por padrão **não existe cadastro público**: `/register` redireciona para `/login` e
`POST /api/auth/register` responde 403. Quem cria contas é o **dono ou um admin do workspace**,
em Configurações → Membros (se o e-mail não tiver conta, o sistema cria uma com senha temporária
exibida uma única vez). Dono/admin também redefinem a senha de outros membros.

Para reabrir o cadastro (ex.: ambiente de testes), defina `ALLOW_PUBLIC_REGISTER=true`.
Qualquer outro valor, ou variável ausente, mantém o cadastro fechado.

O primeiro administrador é criado pelo serviço `seed` (`scripts/create-admin.ts`) a partir de
`ADMIN_EMAIL` e `ADMIN_PASSWORD`. Se o usuário já existir, a senha dele **não** é alterada
(para forçar, use `ADMIN_RESET_PASSWORD=true` uma única vez). Sem `ADMIN_PASSWORD`, uma senha
aleatória é gerada e mostrada uma vez no log do container.

## Rodar localmente

Pré-requisitos: Node 22+ e Docker.

1. Subir Postgres e Redis de desenvolvimento (use portas livres na sua máquina; troque os
   `<...>` por valores seus):
   ```powershell
   docker run -d --name socialmib-dev-pg -e POSTGRES_USER=socialpost -e POSTGRES_PASSWORD=<senha-pg> -e POSTGRES_DB=socialpost -p 127.0.0.1:5434:5432 -v socialmib_dev_pg:/var/lib/postgresql/data postgres:16-alpine
   docker run -d --name socialmib-dev-redis -p 127.0.0.1:6381:6379 redis:7-alpine redis-server --requirepass <senha-redis>
   ```
2. Criar o `.env` na raiz (já ignorado pelo git):
   ```
   DATABASE_URL=postgresql://socialpost:<senha-pg>@127.0.0.1:5434/socialpost
   REDIS_URL=redis://:<senha-redis>@127.0.0.1:6381
   AUTH_SECRET=<texto-aleatorio-longo>
   AUTH_TRUST_HOST=true
   NEXTAUTH_URL=http://localhost:3000
   ADMIN_EMAIL=admin@socialmib.local
   ADMIN_PASSWORD=<senha-do-admin>
   ```
3. Instalar, preparar o banco e criar o admin:
   ```powershell
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npx tsx --env-file=.env scripts/create-admin.ts   # o script não carrega o .env sozinho
   ```
4. Subir: `npm run dev` (app em <http://localhost:3000>) e, para os agendamentos,
   `npm run worker` em outro terminal.

## Variáveis de ambiente

| Variável | Para quê |
|----------|----------|
| `DATABASE_URL`, `REDIS_URL` | Conexões (obrigatórias) |
| `AUTH_SECRET` | Segredo da sessão (obrigatória) |
| `AUTH_TRUST_HOST` | `true` quando o app é acessado por IP/porta ou atrás de proxy |
| `NEXTAUTH_URL` | URL pública do app (links de e-mail, callbacks OAuth) |
| `ALLOW_PUBLIC_REGISTER` | `true` reabre o cadastro público (padrão: fechado) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_RESET_PASSWORD` | Criação/recuperação do primeiro admin |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM` | E-mails (recuperação de senha, convites) |
| `OPENAI_API_KEY` | Geração de texto por IA (opcional) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_PUBLIC_URL` | Guardar imagens e vídeos num storage S3 (opcional; sem isso vão para o volume `uploads` — ver Cuidados) |
| `UPLOAD_DIR` | Pasta dos uploads locais (padrão `public/uploads`; na stack, `/app/uploads`) |
| `<REDE>_CLIENT_ID` / `_CLIENT_SECRET` | OAuth de cada rede (Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Threads, Reddit). Callback a cadastrar: `${NEXTAUTH_URL}/api/social/<rede>/callback` |

## Produção (servidor local 192.168.50.242)

- Stack **`socialpost`** no Portainer, criada a partir deste repositório
  (`docker-compose.portainer.yml`, branch `main`). O Portainer verifica o GitHub a cada
  **5 minutos** e refaz o deploy sozinho: **um `git push` na `main` é um deploy em produção**.
- O app responde na rede interna em `http://192.168.50.242:8090`.
- Segredos e variáveis ficam só no Env da stack no Portainer, nunca neste repositório.
- Migrações rodam sozinhas no start do container `app` (`prisma migrate deploy`).
- As imagens `mibsocial-app` e `mibsocial-worker` são geradas no servidor (`pull_policy: build`);
  não existem no Docker Hub. Sem isso, "Pull and redeploy" com re-pull falha com
  `pull access denied`.
- O serviço `seed` cria/atualiza o admin e termina: ficar `exited (0)` é normal.
- `subir-atualizacao.bat`: para quem recebe mudanças como arquivos `.patch` — coloque-os na pasta
  do projeto e dê dois cliques; o script aplica, envia à `main` (= deploy) e apaga os `.patch`.

## Conectar agentes de IA (MCP)

1. Em **Configurações → API e IA**, crie uma chave (começa com `msk_`).
2. No agente, adicione um servidor MCP HTTP com URL `${NEXTAUTH_URL}/api/mcp` e o cabeçalho
   `Authorization: Bearer msk_...` (também aceita `X-API-Key` ou `?key=`).

Ferramentas: `get_workspace`, `list_accounts`, `set_account_active`, `list_posts`, `get_post`,
`create_post`, `update_post`, `retry_post`, `delete_post`, `upload_image_from_url`, `list_inbox`,
`mark_inbox_read`, `sync_inbox`, `get_analytics` (definidas em `src/lib/mcp/tools.ts`).

## Acesso pela internet (Cloudflare)

O app está publicado em **https://social.mibtecno.com.br**. Caminho de uma requisição:

```
visitante → Cloudflare (HTTPS, zona mibtecno.com.br) → IP público do servidor, porta 2053
          → proxy Caddy compartilhado `autobem-public-proxy` → container `socialpost-app-1:3000`
```

Peças que fazem isso funcionar (todas já criadas):

| Peça | Onde | Detalhe |
|------|------|---------|
| DNS | Cloudflare, zona `mibtecno.com.br` | registro `social` (A, **proxied**) |
| Origin Rule | Cloudflare, zona `mibtecno.com.br` | host `social.mibtecno.com.br` → porta de origem **2053** |
| Bloco do Caddy | stack `autobem-public-proxy` (Portainer) | certificado Let's Encrypt por DNS-01 com `CF_API_TOKEN_MIBTECNO`; `reverse_proxy socialpost-app-1:3000`; repassa `CF-Connecting-IP` como IP do visitante, para o limite por IP do app não tratar todos como o IP da Cloudflare |
| Rede | stack `autobem-public-proxy` | rede externa `socialpost_default` conectada ao proxy |
| `NEXTAUTH_URL` | Env da stack `socialpost` | `https://social.mibtecno.com.br` (links de e-mail e callbacks OAuth) |

Padrão geral para publicar outros apps: `EXPOSICAO-PUBLICA-SERVIDOR-LOCAL.md` (pasta
`C:\Projetos de IA`).

### Manutenção (para quem assumir)

- **Certificados:** o Caddy renova sozinho, mas depende do token da Cloudflare da zona
  (`CF_API_TOKEN_MIBTECNO`, Env da stack do proxy; token `caddy-dns01-mibtecno`, **sem
  expiração**, só na zona `mibtecno.com.br`, com DNS Write, Zone Read e Origin Write). Se uma
  renovação falhar, o log do container `autobem_public_proxy` mostra `will retry`: confira se o
  token ainda é válido. Em 2026 o token anterior expirou em 31/08 e os certificados de origem
  venceram sem ninguém perceber, porque a Cloudflare aceita certificado de origem vencido no
  modo SSL atual.
- **Cuidado ao reiniciar o proxy:** a stack `autobem-public-proxy` serve vários sistemas. Um
  processo em execução continua servindo um certificado vencido que já esteja na memória, mas
  **depois de um reinício** o site cujo certificado esteja vencido (e cujo token não consiga
  renovar) passa a responder **HTTP 525**. Antes de reiniciar, confirme que todos os tokens
  usados pelo Caddyfile são válidos.
- **Falta (recomendado):** regra de limite de tentativas na Cloudflare para
  `POST /api/auth/callback/credentials` (o login do app não limita tentativas).

## Cuidados conhecidos

- Arquivos `.sh` precisam de fim de linha LF (há `.gitattributes`); CRLF quebra o entrypoint no container.
- Prisma 7 lê a URL do banco pelo `prisma.config.ts`, não pelo `schema.prisma`.
- O `next build` avalia módulos de rota: o Dockerfile define variáveis dummy só na etapa de build.
- **Imagens enviadas (sem S3):** ficam no volume `uploads` (`UPLOAD_DIR=/app/uploads`) e são
  servidas por `/api/uploads/[file]` — `/uploads/<arquivo>` é reescrito para lá no
  `next.config.ts`, porque o Next só serve de `public/` o que existia no build. Essa rota é
  pública de propósito: as redes baixam a imagem por ela. O worker transforma `/uploads/...` em
  URL completa com `NEXTAUTH_URL`, então essa variável precisa estar no worker também.
  Imagens enviadas antes do volume existir (até 23/11/2026) se perderam nos redeploys anteriores.
