# supabase/CLAUDE.md — Convenções do backend (Supabase)

> Complementa `@CLAUDE.md` (em conflito, o raiz prevalece). Referência de convenções — **não** é runbook e não contém código.
> O schema é desenhado em `@docs/plans/modelo-dados.md`; aqui fica **como** ele vira migration, policy, teste e Edge Function.
> Comandos: §12. Editar só com autorização explícita do Danilo (`CLAUDE.md §10`).

---

## 1. Estrutura de pastas

```
supabase/
  config.toml              ← configuração versionada (Auth, funções) dos dois projetos online
  migrations/              ← migrations imperativas; a ordem dos arquivos é o histórico
  functions/
    _shared/               ← código comum: respostas padrão, validação, regras de cascata, CORS
    <nome-da-funcao>/      ← handler fino + lógica testável + testes + deno.json
  tests/database/          ← testes pgTAP (RLS, constraints, funções)
  seed.sql                 ← dados fictícios só para o projeto de dev
```

## 2. Fluxo de mudança de schema

- **Sem Supabase local.** Desenvolvimento direto no projeto online de **dev** (`maxis`), pelo Supabase MCP; **produção** (projeto separado, São Paulo) só recebe o que está versionado, pelo CI.
- **Ordem:** desenhar em `modelo-dados.md` → escrever o teste (pgTAP) → escrever a migration → aplicar no dev pelo MCP (`apply_migration`) → testes e advisors no dev → commit único com modelo + migration + testes + tipos regenerados → PR → merge na `main` → o CI aplica em produção (`db push`).
- **Migrations imperativas, escritas à mão.** O arquivo em `migrations/` é a fonte: o MCP aplica exatamente o SQL do arquivo, e o nome do arquivo leva a **versão registrada no dev** (`list_migrations`) — nunca inventar timestamp. Não usar schemas declarativos (a ferramenta de diff ainda é alpha).
- **Reserva:** se o `apply_migration` voltar "declined" (o servidor pede confirmação de instrução destrutiva e ela não chega à sessão), criar o arquivo com `npx supabase migration new <nome>` e aplicar no dev com `npx supabase db push --remote=<ref do dev> --skip-vault` (dry-run antes). A versão do arquivo é a que o dev registra: conferir no `list_migrations`.
- **MCP escreve só no dev:** schema só por `apply_migration`; `execute_sql` só para leitura, testes em transação com rollback e o seed do dev. **Nunca** alterar schema pelo Dashboard, pelo SQL Editor ou por `execute_sql`, em nenhum dos dois projetos. Em produção, o MCP é **somente leitura**.
- Repositório e dev sempre alinhados: migration no dev sem arquivo, ou arquivo sem aplicação no dev, é falha (o CI confere com `migration list`).
- Migration já aplicada — no dev ou em produção — é **imutável**. Correção = nova migration.
- Antes do commit: rodar os advisors de segurança e performance no dev — **zero** alerta de segurança.
- Depois de toda migration: regenerar `frontend/src/types/database.ts` a partir do dev, no mesmo commit.
- CLI sempre com o projeto explícito (`--remote=<ref>`), nunca `link`: com dois projetos na conta, nenhum comando pode cair no projeto errado por padrão.

## 3. Nomenclatura

| Objeto | Padrão | Exemplo |
|---|---|---|
| Migration | `<versão registrada no dev>_f<NN>_<descricao_snake_case>.sql` | `…_f01_cria_empresas_profiles.sql` |
| Policy | `<tabela>_<operacao>_<escopo>` | `veiculos_select_tenant`, `perfis_acesso_update_master_admin` |
| Índice / único / check | `<tabela>_<colunas>_idx` · `_key` · `<tabela>_<regra>_check` | `profiles_tenant_id_papel_idx` |
| Função / RPC | `snake_case`, verbo em pt-BR | `tenant_atual`, `marcar_notificacoes_lidas` |
| Trigger | `trg_<acao>` | `trg_set_updated_at` |
| Edge Function | `kebab-case`, verbo-objeto em pt-BR | `provisionar-usuario`, `resetar-senha`, `gerenciar-empresa` |

Tabelas, colunas, tipos e FKs seguem `modelo-dados.md §1`.

## 4. Anatomia de uma migration

- **Ordem interna:** tipos → tabelas (com constraints) → índices → funções → triggers → habilitar RLS → policies → grants → comentários (`comment on`, em pt-BR).
- Tabela nova nasce **completa na mesma migration**: RLS habilitada, policies, índices de FK e de colunas usadas em policy, trigger de `updated_at`, grants explícitos, comentário.
- Uma unidade de mudança por migration, alinhada a um STEP do plano de fase.
- Extensões no schema `extensions`, **sem fixar versão** (versão explícita é ignorada pela plataforma).
- Nada é criado nos schemas `auth`, `storage` ou `realtime` (restritos pela plataforma).

## 5. Exposição na API e grants

- Tabelas novas **não** ficam expostas automaticamente na Data API: todo acesso é concedido por `grant` explícito e mínimo.
- **`anon` não recebe grant algum** em tabela, view ou função do Maxis — o app inteiro exige login.
- `authenticated` recebe só as operações que a matriz de RLS permite (`modelo-dados.md §10`). Tabela escrita apenas por Edge Function recebe só `select`.
- Schema `private` nunca é exposto na API. `authenticated` recebe `usage` nele e `execute` apenas nas funções usadas em policies; `public` e `anon` têm `execute` revogado.

## 6. Padrões de RLS

- Toda tabela com RLS habilitada. Policy sempre `to authenticated`. Nunca `auth.role()`. Nunca `user_metadata`/`raw_user_meta_data` em decisão de autorização.
- Uma policy por operação e escopo — sem `for all`.
- Funções em policy sempre envolvidas em `(select …)` (avaliadas uma vez por query).
- **Leitura de tenant:** `tenant_id` igual a `private.tenant_atual()`. Isso já devolve zero linhas para usuário inativo ou empresa bloqueada.
- **Inserção:** `with check` de tenant **e** de permissão `…edit` (`private.tem_permissao`). O `tenant_id` vem do default da coluna (`private.tenant_atual()`) — o cliente não envia, e se enviar outro valor o `with check` rejeita.
- **Atualização:** `using` **e** `with check` com a mesma regra (impede mover a linha para outro tenant). Exige uma policy de `select` válida — sem ela o update afeta 0 linhas em silêncio.
- **Exclusão física:** só onde o modelo prevê (ex.: perfil sem usuários).
- **Tabelas escritas só por Edge Function** (`empresas`, `profiles`, `eventos_auditoria`, criação de `notificacoes`): nenhuma policy de escrita e nenhum grant de escrita.
- **Views:** sempre `security_invoker = true` (sem isso, a view ignora a RLS).
- **`security definer`:** só no schema `private` (ou RPC pública com justificativa no plano da fase), com `search_path` vazio, nomes totalmente qualificados e verificação de `auth.uid()` no corpo. **Nunca** usar `security definer` para contornar erro de permissão.
- **RPC pública:** `security invoker` por padrão (a RLS continua valendo).

## 7. Testes de banco (pgTAP) — TDD a partir da Fase 1

- Teste escrito **antes** da policy ou função (Red → Green → Refactor).
- **Mínimo obrigatório por tabela de tenant:**
  - usuário do tenant A só enxerga linhas de A;
  - não insere nem atualiza linhas no tenant B;
  - não move uma linha de A para B (update de `tenant_id`);
  - usuário inativo e empresa bloqueada enxergam zero linhas;
  - `anon` não acessa nada;
  - sem permissão `…edit`, não escreve.
- Simular o usuário pelo papel `authenticated` + claims do JWT dentro da transação; cada teste roda em transação com rollback.
- Fixtures próprias dos testes — não depender do `seed.sql`.
- Rodam no projeto de **dev**: pelo MCP durante o trabalho e pelo CLI (`test db --remote`) no CI. Cada arquivo em transação com rollback — fixtures e dados de teste não deixam resíduo. **Nunca** contra produção.

## 8. Edge Functions (Deno)

- **Uma função por capacidade privilegiada.** O `index.ts` só recebe a requisição e delega; a regra de negócio fica em módulo puro, testável sem rede.
- **Autenticação:** usar o padrão oficial vigente (`@supabase/server` com `createSupabaseContext` e modo `auth` explícito — `'user'` nas funções chamadas pelo app), dentro do `comCors` do `_shared`. Não usar o `withSupabase`: o CORS dele é fixo (sem allowlist por origem) e o erro sai no formato do SDK, não na resposta padrão. `verify_jwt` ligado nas funções de usuário — são duas camadas. Essa API muda com frequência: confirmar na documentação (Context7) ao implementar.
- **Fluxo obrigatório de toda função:**
  1. CORS liberado só para o domínio de produção e o localhost de desenvolvimento;
  2. identificar quem chama a partir do JWT;
  3. carregar o profile do chamador e checar papel, `ativo` e tenant **dentro da função**. Cascata: `super_admin` → `master_admin`; `master_admin` → `admin`/`user` do **próprio** tenant;
  4. validar a entrada com schema tipado;
  5. executar a operação privilegiada;
  6. gravar em `eventos_auditoria`;
  7. responder no formato padrão.
- **Cliente admin (chave secreta):** criado por requisição, nunca exportado de `_shared`, nunca usado para leitura que o cliente sob RLS resolveria. Toda consulta feita com ele filtra explicitamente pelo tenant do chamador.
- **Criação de usuário:** `email_confirm: true` sempre. Se a criação do profile falhar, remover o usuário recém-criado do Auth (compensação) — nunca deixar usuário de Auth sem profile.
- **Senha provisória:** gerada no servidor com gerador criptográfico; devolvida **uma única vez** ao chamador para repasse; nunca logada, persistida em claro nem gravada em auditoria. Reset de senha e desativação **encerram as sessões ativas** do usuário afetado.
- **Resposta padrão:** sucesso `{ data }`; erro `{ error: { codigo, mensagem } }` com mensagem pt-BR amigável e status HTTP correto (400 validação, 401 sem sessão, 403 sem permissão, 404, 405 método fora de POST — recusado pelo `comCors` —, 409 conflito, 500). Nunca stack trace, mensagem do Postgres ou detalhe interno.
- TypeScript strict, sem `any`, retorno explícito. Dependências `npm:`/`jsr:` com **versão fixada** no `deno.json` da função; lockfile versionado.
- Logs sem senha, token, chave ou dado pessoal desnecessário.
- `deno test` para a lógica (regras de cascata, validação, geração de senha) — TDD a partir da Fase 1.
- Testes de integração contra as funções publicadas no **dev**. Deploy: no dev pelo MCP (`deploy_edge_function`); em produção só pelo CI, a partir do código versionado.

## 9. Chaves e segredos

- A **chave secreta** (`sb_secret_…`) existe **só** no ambiente das Edge Functions. Nunca em migration, seed, teste versionado, `config.toml` ou log.
- As Edge Functions recebem URL e chaves pelo ambiente da plataforma: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` e `SUPABASE_JWKS`. As duas de chaves são JSON por nome (a chave padrão é `default`). Os dois projetos usam as chaves novas; as legadas (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ficam desativadas. O `verify_jwt` confere o JWT de sessão do usuário, que continua sendo JWT; as chaves novas não são JWT e vão só no cabeçalho `apikey`. O `@supabase/server` exige JWT assinado pela chave assimétrica (ES256), que os dois projetos publicam no JWKS.
- Segredos adicionais só via gerenciamento de secrets do Supabase — nunca em arquivo versionado.
- Dev e produção têm chaves próprias; chave de um projeto nunca é usada no outro.

## 10. Seed e ambientes

- `seed.sql` é **só do dev** (aplicado pelo MCP): no mínimo 2 empresas fictícias (para testar isolamento) e um usuário de cada papel. Nunca dado real; nunca aplicado em produção.
- **Repositório público:** o seed não traz senha em claro; as senhas dos usuários fictícios do dev ficam fora do git (`.env.local`).
- O **catálogo de permissões** (`modulos`, `funcionalidades`, `abas`, `permissoes`) é **migration**, não seed — precisa existir em produção. Gerado a partir do objeto de menu.
- **Primeiro `super_admin` em produção:** procedimento manual documentado no plano da Fase 1 — nunca seed ou migration com credencial.
- **Ambientes:** dev = projeto online `maxis` (us-west-2) — MCP com escrita, testes e seed; produção = projeto online em São Paulo (`sa-east-1`) — escrita só pelo CI, MCP somente leitura. Mesma versão major do Postgres nos dois. Sem Supabase local e sem staging (raiz §9).
- **Auth no `config.toml`:** fonte única do Auth dos dois projetos, aplicada com `config push --remote=<ref>`: cadastro público desligado; `site_url` e redirects = domínio de produção (o dev aceita também o localhost de desenvolvimento).

## 11. Checklist de migration pronta

- [ ] `modelo-dados.md` atualizado no mesmo commit
- [ ] RLS habilitada, policies por operação, grants mínimos a `authenticated`, nada a `anon`
- [ ] FKs e colunas usadas em policy indexadas
- [ ] Views com `security_invoker`; `security definer` só em `private`, com `search_path` vazio
- [ ] Migration aplicada no dev pelo MCP; nome do arquivo = versão registrada no dev
- [ ] Testes pgTAP escritos antes e passando no dev
- [ ] Advisors do dev sem alerta de segurança
- [ ] Tipos do frontend regenerados

## 12. Comandos

**Supabase CLI:** o da devDependency da raiz (`npx supabase …`), sempre com o projeto explícito (`--remote=<ref>`): o ref do dev é o `project_id` do `[remotes.dev]` no `config.toml`; o da produção, o `REF_PRODUCAO` do pipeline. Mudança em projeto hospedado exige `--yes`. Toda escrita passa pela aprovação do Danilo; a produção recebe pelo pipeline (§2).

| Comando | O que faz |
|---|---|
| `npx supabase migration list --remote=<dev>` | Migrations do repositório × dev (o CI barra diferença) |
| `npx supabase test db --remote=<dev> --yes` | Testes pgTAP no dev, como o CI roda (o `pg_prove` num contêiner Docker do runner). No trabalho local, os testes rodam pelo MCP (§7) |
| `npx supabase config diff --remote=<ref> --exit-code` | `config.toml` × projeto (dev ou produção); só lê, e diferença sai 2 |
| `npx supabase config push --remote=<dev> --yes` | Aplica o `config.toml` no dev (a produção recebe pelo deploy-backend) |
| `npx supabase db push --remote=<dev> --skip-vault --yes` | Reserva para aplicar migration no dev (§2); antes, o mesmo com `--dry-run` |

**Edge Functions:** em `supabase/functions/`, com o Deno 2.9.8.

| Comando | O que faz |
|---|---|
| `deno fmt --check` · `deno fmt` | Formatação: confere · grava |
| `deno lint` | Lint |
| `deno check` | Tipos |
| `deno test` | Testes |

- **Portões** (os do job `edge-functions` do CI): os quatro verdes antes de todo commit. O CI também barra `deno-lint-ignore`, `@ts-ignore` e `@ts-nocheck` em `supabase/functions/`. O `deno.lock` é congelado: dependência nova só entra com `--frozen=false`, de propósito.
- O job `banco` do CI roda o `migration list`, o `config diff` e o `test db` contra o dev.
