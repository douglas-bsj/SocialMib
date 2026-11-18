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
   npx tsx scripts/create-admin.ts   # lê ADMIN_EMAIL/ADMIN_PASSWORD do ambiente
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
| `<REDE>_CLIENT_ID` / `_CLIENT_SECRET` | OAuth de cada rede (Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Threads, Reddit). Callback a cadastrar: `${NEXTAUTH_URL}/api/social/<rede>/callback` |

## Produção (servidor local 192.168.50.242)

- Stack **`socialpost`** no Portainer, criada a partir deste repositório
  (`docker-compose.portainer.yml`, branch `main`). O Portainer verifica o GitHub a cada
  **5 minutos** e refaz o deploy sozinho: **um `git push` na `main` é um deploy em produção**.
- O app responde na rede interna em `http://192.168.50.242:8090`.
- Segredos e variáveis ficam só no Env da stack no Portainer, nunca neste repositório.
- Migrações rodam sozinhas no start do container `app` (`prisma migrate deploy`).

## Publicar na internet pela Cloudflare (procedimento)

Segue o padrão `EXPOSICAO-PUBLICA-SERVIDOR-LOCAL.md` (pasta `C:\Projetos de IA`): um proxy Caddy
compartilhado (`autobem-public-proxy`, porta 2053) roteia por hostname; não é preciso mexer
no roteador.

1. Bloco no Caddyfile do proxy para `social.mibtecno.com.br:2053`, com certificado por DNS-01
   (`{env.CF_API_TOKEN_MIBTECNO}`) e `reverse_proxy socialpost-app-1:3000`. No bloco, repassar
   o IP real do visitante (`header_up X-Forwarded-For {http.request.header.CF-Connecting-IP}`)
   para o limite de tentativas por IP do app não tratar todos como o IP da Cloudflare.
2. Conectar o proxy à rede `socialpost_default` (externa) no compose do proxy.
3. DNS na zona `mibtecno.com.br`: `social` → IP público do servidor, **proxied**.
4. Origin Rule para o hostname reescrevendo a porta de destino para **2053**.
5. Na stack `socialpost`, definir `NEXTAUTH_URL=https://social.mibtecno.com.br`.
6. Recomendado: regra de rate limit na Cloudflare para `/api/auth/callback/credentials`
   (o login em si não limita tentativas).

## Cuidados conhecidos

- Arquivos `.sh` precisam de fim de linha LF (há `.gitattributes`); CRLF quebra o entrypoint no container.
- Prisma 7 lê a URL do banco pelo `prisma.config.ts`, não pelo `schema.prisma`.
- O `next build` avalia módulos de rota: o Dockerfile define variáveis dummy só na etapa de build.
