# Maxis

SaaS multi-tenant por assinatura para empresas de transporte, logística e supply chain: DMS, TMS, WMS e YMS numa única plataforma web.

## Onde está cada coisa

| Assunto | Arquivo |
|---|---|
| Contrato do projeto: stack, regras e convenções | [CLAUDE.md](CLAUDE.md) |
| Fase ativa, progresso e log | [project_manager.md](project_manager.md) |
| Planos de fase | [docs/plans/](docs/plans/) |
| Modelo de dados (fonte única do schema) | [docs/plans/modelo-dados.md](docs/plans/modelo-dados.md) |
| Referência visual aprovada | [docs/design/](docs/design/) |
| Convenções do frontend | [frontend/CLAUDE.md](frontend/CLAUDE.md) |
| Convenções do backend (Supabase) | [supabase/CLAUDE.md](supabase/CLAUDE.md) |

## Desenvolvimento

Requisitos: Node 24.15 ou mais novo da linha 24 (`.nvmrc`; `nvm install`) e, para as Edge Functions, Deno 2.9.8. Não há Supabase local: o projeto usa dois projetos online (desenvolvimento e produção), e o Supabase CLI vem como dependência do repositório.

```bash
npm ci --ignore-scripts   # instalação limpa, sem scripts de instalação (como no CI)
npm run dev               # http://localhost:5173
npm run build             # build de produção em frontend/dist/
```

Portões, verdes antes de todo commit (o CI roda os mesmos, mais a auditoria das dependências e as varreduras de segurança):

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
(cd supabase/functions && deno fmt --check && deno lint && deno check && deno test)
```

Todos os comandos: [frontend/CLAUDE.md §15](frontend/CLAUDE.md) e [supabase/CLAUDE.md §12](supabase/CLAUDE.md). Variáveis do frontend: [frontend/.env.example](frontend/.env.example).

## Publicação

A `main` só recebe mudança por pull request, com os checks `frontend`, `banco` e `edge-functions` verdes. Cada merge passa pelo [pipeline](.github/workflows/pipeline.yml), que publica o backend em produção e, depois dele, o frontend em https://maxis.vemperformar.com.br.
