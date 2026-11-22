# Fase 1 — Dados base & Segurança multi-tenant

> Plano detalhado da Fase 1. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§3, §4, §5).
> Convenções: `@supabase/CLAUDE.md` (migrations, RLS, testes, Edge Functions). Vale a partir daqui: **TDD** para lógica, RLS e Edge Functions (`CLAUDE.md §9`).
> **Revisado em 14/11/2026 para o Supabase só online** (pendência #10): sem ambiente local; migrations, testes, seed e integração no projeto de dev `maxis`; a produção (`maxis-producao`) só recebe pelo pipeline.

**Status:** 🔄 Em andamento (aberta em 14/11/2026) · **Depende de:** Fase 0 ✅ · **Libera:** Fase 2

---

## 1. Objetivo

Construir e **provar por testes** a fundação de segurança multi-tenant, antes de qualquer tela depender dela:
- `empresas`, `profiles` e `eventos_auditoria` com RLS por `tenant_id`;
- funções de apoio à RLS que cortam o acesso **na hora** quando o usuário ou a empresa estão inativos;
- provisionamento de usuário por Edge Function (cascata, senha provisória, `email_confirm: true`);
- troca da própria senha sem caminho de escape;
- primeiro `super_admin` em produção.

Nenhuma tela nesta fase — a Fase 2 consome o que for entregue aqui.

## 2. Pré-requisitos

- [x] Fase 0 ✅ em 14/11/2026 (pipeline com deploy em ordem, projeto de dev online com o MCP, teste guardião, base `_shared/`).
- [x] Pendência de governança #3 resolvida (formato das chaves), aplicada em 07/11/2026: as Edge Functions recebem `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` e `SUPABASE_JWKS` (`supabase/CLAUDE.md §9`).
- [x] Padrão de autenticação das Edge Functions decidido no STEP 0.11: `@supabase/server` com `createSupabaseContext({ auth: 'user' })` dentro do `comCors`, com `verify_jwt` ligado (`supabase/CLAUDE.md §8`). Antes do STEP 1.8, só conferir no Context7 a versão vigente e se a API mudou.
- [ ] 📋 Antes do STEP 1.7: o Danilo define no `.env.local` (fora do git) a senha dos usuários do seed do dev — aleatória e forte; o valor não passa pela conversa (decisão 12).
- [ ] 📋 Antes do STEP 1.9: o Danilo dá ao token do dev (`SUPABASE_ACCESS_TOKEN` do environment `development`) a escrita em Edge Functions e cadastra a mesma senha do seed como secret do `development`, pelo prompt do `gh` (decisão 11).

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Troca da própria senha pela **Edge Function `trocar-senha`**, numa chamada só — não existe caminho para desmarcar `senha_provisoria` sem trocar a senha. `profiles` fica **sem nenhuma escrita pelo cliente**. Exige ajuste no texto do `CLAUDE.md §5` (pendência de governança #5). | Danilo |
| 2 | Política de senha: **mínimo 8 caracteres, com letras e números** — no Auth do dev e da produção (pelo `config.toml`) e revalidada nas Edge Functions. | Danilo |
| 3 | Primeiro `super_admin` em produção por **procedimento manual documentado** (STEP 1.11). Nenhum endpoint de bootstrap no código. | Danilo |
| 4 | Senha provisória: 12 caracteres, gerador criptográfico, **sem caracteres ambíguos** (`0/O`, `1/l/I`), com ao menos uma letra e um número (atende a política). | proposta |
| 5 | Troca **voluntária** exige a senha atual; a troca **obrigatória** (senha provisória) não exige. Após trocar, as demais sessões do usuário são encerradas. | proposta |
| 6 | Estado de acesso para os gates da Fase 2 via RPC `obter_meu_acesso()` — `security definer` justificado: o usuário bloqueado precisa saber **que** está bloqueado, sem enxergar dado algum. *(No STEP 1.5, por decisão do Danilo: a parte `security definer` fica em `private.acesso_atual()`, e a RPC exposta é `security invoker`. O advisor acusa definer em `public` executável por `authenticated`, regra 0029.)* | proposta |
| 7 | Validação de entrada das Edge Functions com biblioteca de schema tipado (zod via `npm:`, versão fixada). | proposta |
| 8 | Cada STEP é um PR com **teste e implementação juntos**, escritos nessa ordem (Red → Green → Refactor). O PR só entra com o CI verde. | `§9` + Fase 0 |
| 9 | Repositório público: **nenhum e-mail real** (nem o do Danilo) em migration, seed, teste ou plano. | Fase 0 |
| 10 | **Supabase só online:** migrations aplicadas e testadas no dev pelo MCP; produção só pelo pipeline, no merge. Não há `db reset` nem Supabase local. | Danilo (pendência #10) |
| 11 | **Testes de integração das Edge Functions no CI, contra o dev:** um job `integracao` no PR publica no dev as funções da branch, reaplica o seed e roda a integração. Regressão de CORS, `verify_jwt` ou compensação aparece em todo PR. Exige ajuste no `supabase/CLAUDE.md §8/§10/§12` (pendência de governança #24). | Danilo (14/11/2026) |
| 12 | **Seed sem senha no repositório:** os usuários fictícios são criados direto em `auth.users` e `auth.identities` pelo `postgres` do dev (que tem a permissão, conferida em 14/11/2026), com o **hash bcrypt** de uma senha aleatória forte. O valor fica no `.env.local` e no secret do `development`. Uma senha só para todos os usuários do seed. | proposta |
| 13 | **O dev é compartilhado e não se limpa:** o trabalho pelo MCP, o `test db`, o job `integracao` e o seed usam o mesmo banco, e a auditoria imutável (que referencia `profiles` e `empresas`) prende no dev o que a integração criar. Por isso: seed idempotente (insere ou atualiza, nunca apaga e recria); pgTAP só com fixtures próprias, desfeitas no rollback; integração com identificadores únicos por execução; nenhuma asserção depende de banco limpo ou de contagem total. | proposta |
| 14 | **CNPJ numérico ou alfanumérico** (Receita, a partir de jul/2026): 12 caracteres `[0-9A-Z]` + 2 dígitos verificadores, guardado sem máscara e em maiúsculas; verificadores pelo cálculo oficial (código ASCII − 48, módulo 11), que mantém os CNPJs numéricos como estão. Muda o `modelo-dados.md` §4, §5.1 e §9.1. | Danilo (14/11/2026) |

## 4. STEPs (na ordem; não pular)

**Em todo STEP com migration** (checklist do `supabase/CLAUDE.md §11`): teste pgTAP antes; migration aplicada no dev pelo MCP (`apply_migration`, ou a reserva da pendência #19), com o nome do arquivo na versão registrada no dev; testes verdes pelo MCP e pelo `test db` do CI; advisors do dev sem alerta de segurança; `modelo-dados.md` e `frontend/src/types/database.ts` no mesmo commit. A produção recebe pelo pipeline, no merge.

### STEP 1.1 — Utilitários do banco e helpers de teste
**Entrega:** schema `private` e as funções utilitárias que as tabelas usam.
- [x] **Testes primeiro (pgTAP):** `private.cnpj_valido` aceita CNPJs válidos — numéricos e alfanuméricos (decisão 14) — e recusa dígito verificador errado, tamanho errado, caractere fora de `[0-9A-Z]` (minúscula, acento, máscara, espaço) e sequências repetidas (`00000000000000`, `11111111111111`…); `private.set_updated_at` atualiza `updated_at` num update *(`utilitarios_test.sql`, 42 asserções; casos gerados por um cálculo independente, que reproduz o exemplo da Receita)*
- [x] Migration `20261114171911_f01_cria_schema_private_e_utilitarios`: schema `private` (sem exposição na API), `private.set_updated_at()`, `private.cnpj_valido(text)` (`immutable`, `strict`); `execute` revogado de `PUBLIC` nas duas
- [x] Helpers de teste para **simular usuário** (papel `authenticated` + claims do JWT), definidos em `supabase/tests/` — **nunca** em migration — e carregados pelos dois caminhos *(mecanismo: `supabase/tests/helpers/ambiente.psql`, incluído por `\ir` em cada teste; a extensão `.psql` fica fora do `pg_prove`, e pelo MCP o conteúdo entra no lugar da linha `\ir`. Testes em `simulacao_de_usuario_test.sql`, 9 asserções)*. Os helpers de **fixture** (empresa, usuário) entram com as tabelas, no STEP 1.2
- [x] Fixtures com valores próprios (CNPJ, e-mail `@exemplo.test`) que não colidem com o seed (decisão 13) *(regra seguida no 1.1 — tabela temporária, nenhuma linha em tabela real — e válida para os próximos)*

**Verificação:** testes verdes no dev (MCP e CI); teste guardião verde; advisors sem alerta de segurança.

### STEP 1.2 — Núcleo de identidade: `empresas`, `profiles` e funções de RLS
**Entrega:** as duas tabelas centrais com isolamento por tenant provado.
- [x] **Testes primeiro (pgTAP)** — para `empresas` e `profiles`, os casos mínimos de `supabase/CLAUDE.md §7`, com asserções só sobre as fixtures do teste (o seed convive no mesmo banco) *(`nucleo_identidade_test.sql`, 72 asserções)*:
  - usuário do tenant A só enxerga a própria empresa e os profiles de A;
  - não insere, não atualiza, não exclui em nenhuma das duas tabelas (escrita só por Edge Function);
  - usuário inativo e usuário de empresa bloqueada enxergam **zero** linhas, exceto o próprio profile;
  - `anon` não acessa nada;
  - `super_admin` enxerga todas as empresas e só os profiles `master_admin` (não enxerga `admin`/`user`);
  - constraints: `tenant_id` nulo **se e somente se** `super_admin`; um único `master_admin` por empresa; `cnpj` único e válido; e-mail único e minúsculo
- [x] Migration `20261121125657_f01_cria_nucleo_identidade`: enum `papel_usuario`; `empresas`; `profiles` (colunas da Fase 1 de `modelo-dados.md §5.2`); constraints e índices; triggers de `updated_at`; funções `private.tenant_atual()`, `private.papel_atual()`, `private.is_super_admin()`; RLS, policies e grants *(mais a `20261121161220_f01_restringe_motivo_bloqueio`, do code-review: o motivo do bloqueio só existe com a empresa bloqueada)*
- [x] Policies (nomes conforme `supabase/CLAUDE.md §3`):

  | Tabela | Policy | Regra |
  |---|---|---|
  | `empresas` | `empresas_select_tenant` | `id` = `tenant_atual()` |
  | `empresas` | `empresas_select_super_admin` | `is_super_admin()` |
  | `profiles` | `profiles_select_proprio` | `id` = `auth.uid()` |
  | `profiles` | `profiles_select_tenant` | `tenant_id` = `tenant_atual()` |
  | `profiles` | `profiles_select_super_admin` | `is_super_admin()` e `papel = 'master_admin'` |

- [x] Grants: `select` a `authenticated` nas duas tabelas; nada a `anon`; nenhuma policy nem grant de escrita *(e `service_role` só com `select`, `insert` e `update`)*
- [x] Helpers de fixture (empresa e usuário de teste) no `supabase/tests/helpers/ambiente.psql`, testados como os de simulação (STEP 1.1) *(`fixtures_test.sql`, 9 asserções; mais `acessar_como_service_role`)*
- [x] `execute` do `private.cnpj_valido` a quem grava em `empresas` (a Edge Function, papel `service_role`): o Postgres confere a função do `check` no insert e em todo update, de qualquer coluna (provado no dev no STEP 1.1). Tabelas escritas pelo cliente com CNPJ (`modelo-dados.md §9.1`) concedem a `authenticated` quando chegarem
- [x] Lista das funções de policy na regra 4 do guardião (as que `authenticated` executa no `private`) *(pela assinatura exata, depois do code-review)*

**Verificação:** todos os casos verdes; teste guardião verde; advisors sem alerta de segurança.

### STEP 1.3 — Imutabilidade do `master_admin`
**Entrega:** o dono da empresa não pode ser rebaixado, movido nem desativado por engano.
- [x] **Testes primeiro:** alterar `papel`, `tenant_id` ou `ativo` de um `master_admin` falha; um update que não muda esses campos passa (o seed reaplica sem erro, STEP 1.7); o caminho do Admin SaaS (operação privilegiada explícita) continua possível; outros papéis não são afetados *(`master_admin_imutavel_test.sql`, 28 asserções, com a exclusão do code-review)*
- [x] Migration `20261122034817_f01_protege_master_admin`: trigger em `profiles` que bloqueia essas alterações fora do caminho privilegiado *(mais a `20261122042412_f01_protege_exclusao_master_admin`, do code-review: a exclusão, direta ou pela cascata do Auth, também passa pela autorização)*
- [x] **Mecanismo fixado (decisão do Danilo, 22/11/2026):** marca da transação. O trigger `trg_proteger_master_admin` (`before update`, com `when` que compara os três campos) e o `trg_proteger_exclusao_master_admin` (`before delete`) chamam `private.proteger_master_admin()`, que recusa (`42501`) sem a marca `maxis.alteracao_master_admin` igual ao id da transação corrente. A marca é gravada por `private.autorizar_alteracao_master_admin()`, que só o dono do banco executa. Vale para todo papel, inclusive `service_role` e `postgres`; uma marca fixa ou vazada de outra transação (conexão do pool) não vale. É proteção contra engano: quem roda SQL livre (na prática, só o dono do banco) pode gravar a marca sem a procedure. **Desvio do exemplo do plano:** a Edge Function (`service_role`) não autoriza sozinha — na v1 não há caminho no código; a troca do titular (backlog da Fase 4) chega por uma RPC própria, `security definer` e só para `service_role`, justificada no plano daquela fase

**Verificação:** testes verdes *(no dev, pelo MCP e pelo `test db`: 6 arquivos, 182 asserções; mutação com 22 mutantes, 21 pegos e o sobrevivente inofensivo)*.

### STEP 1.4 — `eventos_auditoria`
**Entrega:** rastro imutável das ações privilegiadas.
- [x] **Testes primeiro:** `super_admin` lê tudo; `master_admin` lê só eventos do próprio tenant; `admin`/`user` não leem; ninguém insere pelo cliente; `update` e `delete` falham **inclusive com `service_role`** (o papel da chave secreta) *(`eventos_auditoria_test.sql`, 49 asserções; também inativo, empresa bloqueada, `anon`, o dono do banco e o `truncate`)*
- [x] Migration `20261122122108_f01_cria_eventos_auditoria`: tabela conforme `modelo-dados.md §5.3`, `check` de formato da `acao`, índices, trigger que impede `update`/`delete`, RLS, policies (`eventos_auditoria_select_super_admin`, `eventos_auditoria_select_master_admin`), grant `select` a `authenticated` *(mais a `20261122124033_f01_ajusta_eventos_auditoria`, do code-review: `created_at` com `clock_timestamp()` e formato da ação mais estrito)*
- [x] **Grants da Edge Function (decisão do Danilo, 22/11/2026):** `service_role` só com `insert`, e só nas colunas do evento — sem `select`, sem escolher `id` nem `created_at`. O trigger (por comando) barra também o `truncate` e vale para o dono do banco

**Verificação:** testes verdes *(no dev, pelo MCP e pelo `test db`: 7 arquivos, 231 asserções; mutação com 31 mutantes, todos pegos)*.

### STEP 1.5 — RPC `obter_meu_acesso()`
**Entrega:** o estado de acesso que os gates da Fase 2 vão consultar.
- [x] **Testes primeiro:** retorna, só para o próprio usuário, `papel`, `nome`, `ativo`, `empresa_ativa` (nulo para `super_admin`) e `senha_provisoria`; funciona para usuário inativo e para empresa bloqueada **sem** expor nenhum outro dado; `anon` não executa *(`obter_meu_acesso_test.sql`, 18 asserções: cada caso compara o JSON exato que a API devolve; também a Edge Function não executa, o JWT sem profile recebe todos os campos nulos e o bloqueio vale na chamada seguinte)*
- [x] Migration `20261122133355_f01_cria_rpc_obter_meu_acesso`: `search_path` vazio, baseada em `auth.uid()`; `execute` só para `authenticated` *(por decisão do Danilo, 22/11/2026: a RPC `public.obter_meu_acesso()` é `security invoker` e só chama `private.acesso_atual()`, a parte `security definer` (justificativa na decisão 6); o retorno é o tipo composto `acesso_usuario`, um objeto na API e anulável nos tipos gerados)*
- [x] Campos que dependem de fases futuras (ex.: `tem_perfil`, Fase 5) entram na fase da tabela correspondente *(como atributo novo de `acesso_usuario`)*
- [x] Guardião: regra 5, nenhuma função `security definer` em `public`; na regra 4, `private.acesso_atual()` entra na lista do que `authenticated` executa *(e a correção da regra 4, que calava com uma função da lista ausente)*

**Verificação:** testes verdes; advisors sem alerta *(no dev, pelo `test db`: 8 arquivos, 253 asserções; mutação com 26 mutantes, todos pegos; advisor de segurança sem alerta, e a consulta da regra 0029 provada no ensaio: acusaria a RPC `security definer`)*.

### STEP 1.6 — Configuração do Auth e política de senha
**Entrega:** Auth endurecido, igual no dev e na produção.
- [x] `config.toml`: senha com mínimo 8 e letras + números; cadastro público desligado (já na Fase 0) — chaves de configuração conferidas com `--help`/docs da versão do CLI *(antecipado no STEP 0.10, 07/11/2026: `minimum_password_length = 8`, `password_requirements = "letters_digits"`)*
- [x] Produção igual ao `config.toml` (mesmo mecanismo definido no STEP 0.10) *(dev e produção com `config push --remote` e `config diff --exit-code` sem diferença, 07/11/2026)*
- [x] Registrar em `supabase/CLAUDE.md` *(sob autorização)* se o mecanismo de sincronização mudar algo da convenção *(nada a registrar: o `config.toml` aplicado com `config push --remote` e conferido com `config diff` já está no `supabase/CLAUDE.md §10/§12` — pendência #10 e comandos do STEP 0.14)*

**Verificação:** no dev, o cadastro público pela API (chave publishable) é recusado; na produção, `config diff --remote=<produção> --exit-code` sem diferença; a senha fraca recusada pelo Auth é provada no STEP 1.7, com um usuário do seed. *(22/11/2026: no dev, pela API, com a chave publishable: cadastro com e-mail e senha e código por e-mail criando usuário recusados com 422 `signup_disabled`; login anônimo com 422 `anonymous_provider_disabled`; nenhum usuário criado. A chave legada `anon` é recusada com 401 nos dois projetos. `config diff --exit-code` sem diferença no dev e na produção, e ele compara a política de senha (contraprova com uma mudança local); o CLI 3.0.0 deixa fora 11 propriedades, todas de recursos desligados ou sem efeito sem SMTP (log de 22/11/2026).)*

### STEP 1.7 — Seed do dev
**Entrega:** dados fictícios para desenvolver e testar à mão a partir da Fase 2, e os chamadores dos testes de integração.
- [ ] `seed.sql` (só do dev; aplicado pelo MCP e, a partir do STEP 1.9, pelo job `integracao`): 3 empresas fictícias com CNPJ válido — 2 ativas e 1 bloqueada; 1 `super_admin`; em cada empresa ativa, 1 `master_admin`, 1 `admin`, 1 `user`, 1 usuário inativo e 1 usuário com senha provisória; na empresa bloqueada, 1 `master_admin` e 1 `user`; e-mails em domínio reservado (`@exemplo.test`)
- [ ] Usuários criados direto em `auth.users` e `auth.identities`, com e-mail confirmado e ids fixos, + `profiles` correspondentes. As linhas seguem o formato que o GoTrue aceita no login (colunas de token como texto vazio, `instance_id`, `aud`/`role`, `provider_id`/`identity_data` da identidade), conferido no PR
- [ ] Senha: o seed traz só o hash bcrypt (decisão 12); o valor fica no `.env.local` e, a partir do STEP 1.9, no secret do `development`. Nunca em claro no repositório, no log ou na conversa. O hash sai de um script local que lê o `.env.local` e imprime **só** o hash (nenhum caminho, nem de erro, ecoa o valor); nunca por `execute_sql` com o valor no texto
- [ ] Idempotente (decisão 13): reaplicar insere o que falta e devolve os usuários do seed ao estado canônico do que muda no uso (senha, `senha_provisoria` e o `ativo` de quem não é `master_admin`), sem apagar nada. O que é imutável (`papel`, `tenant_id` e o `ativo` do `master_admin`, STEP 1.3) não é reescrito
- [ ] Teste à mão no dev: todo run do job `integracao` devolve os usuários do seed ao estado canônico. Um fluxo que muda estado (como a troca de senha) usa um usuário criado pela `provisionar-usuario`, ou é refeito depois do run
- [ ] Nunca em produção: o pipeline não usa `--include-seed`, e o MCP da produção é somente leitura

**Verificação:** aplicado duas vezes sem erro e sem duplicar; login no dev com cada usuário do seed pela API (chave publishable + senha do `.env.local`); usuário inativo e usuário de empresa bloqueada autenticam, e `obter_meu_acesso()` informa o motivo; troca para senha fora da política recusada pelo Auth, pelo caminho direto do Auth, que existe (fecha a verificação do 1.6; o caminho é tratado no STEP 1.10).

### STEP 1.8 — Código compartilhado das Edge Functions
**Entrega:** blocos reutilizáveis para toda função privilegiada.
- [ ] **Testes primeiro (`deno test`)** para cada módulo abaixo
- [ ] Identificação do chamador pelo JWT com `@supabase/server` (`createSupabaseContext({ auth: 'user' })`) dentro do `comCors`, com a versão exata fixada no `deno.json` da função (API conferida no Context7 antes de começar)
- [ ] Carga do profile do chamador com checagem de `ativo` e empresa ativa
- [ ] Cliente admin criado **por requisição** a partir de `SUPABASE_SECRET_KEYS` (chave `default`), nunca exportado como instância
- [ ] CORS do `_shared` (pendências do STEP 0.11): cabeçalhos permitidos vindos do `corsHeaders` do `@supabase/supabase-js`, no lugar da lista copiada à mão; localhost aceito **só no dev**, decidido pelo `SUPABASE_URL` que a plataforma injeta
- [ ] Validação de entrada com schema tipado → erro 400 com mensagem pt-BR por campo
- [ ] Política de senha (mínimo 8, letras + números) e gerador de senha provisória (decisão 4)
- [ ] Registro em `eventos_auditoria` (com garantia de nunca incluir senha/token em `detalhes`). Desde o STEP 1.4, a `service_role` só insere, e só as colunas do evento: insert simples, sem `.select()`, `upsert` nem `return=representation` (falham com `42501`), e sem mandar `id` nem `created_at`

**Verificação:** `deno fmt/lint/check/test` verdes; teste prova que o gerador nunca produz caractere ambíguo e sempre atende a política.

### STEP 1.9 — Edge Function `provisionar-usuario`
**Entrega:** criação de usuário em cascata, sem SMTP, e a integração rodando no CI.
- [ ] **Testes primeiro** — regras de cascata como módulo puro (`deno test`):

  | Chamador | Pode criar | Condições | Falha |
  |---|---|---|---|
  | `super_admin` | `master_admin` | `tenant_id` informado, empresa existe e está ativa, empresa ainda sem `master_admin` | 404 empresa inexistente · 409 já tem `master_admin` · 403 empresa bloqueada |
  | `master_admin` | `admin`, `user` | sempre no **próprio** tenant (`tenant_id` do input é recusado) | 403 papel não permitido |
  | `admin`, `user`, inativo, empresa bloqueada | nada | — | 403 |
  | qualquer | — | e-mail já existente | 409 |

- [ ] Handler fino: valida entrada (`papel`, `nome`, `email`, `telefone?`, `tenant_id?`) → aplica a cascata → cria no Auth com senha provisória e `email_confirm: true` → cria o profile (`senha_provisoria = true`, `created_by` = chamador) → **se o profile falhar, remove o usuário do Auth** → grava `usuario.criado` → responde `{ data: { profile_id, email, senha_provisoria } }`
- [ ] A senha provisória aparece **só** nessa resposta — nunca em log, banco ou auditoria
- [ ] `[functions.provisionar-usuario]` com `verify_jwt = true` explícito no `config.toml`
- [ ] **Teste de integração** contra a função publicada no dev, com os usuários do seed como chamadores: `super_admin` cria `master_admin` numa empresa sem dono (criada a cada execução, com CNPJ único: o `master_admin` criado fica no dev, decisão 13); `master_admin` da empresa A tenta criar na B → 403; segundo `master_admin` → 409; e-mail repetido → 409; usuário recém-criado consegue autenticar com a senha provisória; o cadastro público pela API (chave publishable) é recusado com `signup_disabled` *(aceito pelo Danilo no STEP 1.6: pega no PR uma mudança no `config.toml` antes de ela chegar ao Auth)*
- [ ] Teste de compensação: falha forçada na criação do profile não deixa usuário órfão no Auth (no módulo, com a falha injetada; na integração, com o conflito montado por fixture — ex.: o profile de outro usuário já com o e-mail pedido, já que `profiles.email` é só uma cópia: o Auth cria, o insert do profile falha no `unique`)
- [ ] No dev publicado: preflight com `verify_jwt` responde; o 401 da plataforma chega legível ao navegador; localhost aceito só no dev (pendências do STEP 0.11)
- [ ] Job `integracao` no pipeline (decisão 11): só em PR, environment `development`, depois de `banco` e `edge-functions`. Publica as funções da branch no dev (`functions deploy --remote=<dev> --use-api`), reaplica o seed (`db query --remote=<dev> --file`), cria as fixtures da execução e roda os testes de integração. Sem as variáveis do dev, falha — nunca pula em silêncio. Os testes de integração ficam fora do `deno test` do job `edge-functions`
- [ ] Concorrência **global** no job (um grupo fixo, sem cancelar no meio): runs de PRs diferentes nunca publicam funções nem reaplicam o seed no dev ao mesmo tempo. Cada run testa o código que ele mesmo publicou; depois dele, o dev fica com as funções do último PR que rodou
- [ ] Variáveis públicas do dev (URL e chave publishable) no environment `development`, cadastradas pelo Claude (como as de produção no STEP 0.12); token e senha do seed pelo 📋 do Danilo (§2)
- [ ] `integracao` nos checks obrigatórios do ruleset `main` *(com aprovação do Danilo)*
- [ ] Deploy: no dev pelo MCP (`deploy_edge_function`) durante o STEP e pelo job `integracao` no PR; na produção, pelo deploy-backend no merge (o token de produção já tem Edge Functions em leitura-escrita). Durante o STEP, a mesma suíte de integração roda daqui contra o dev: credenciais públicas e senha do seed pelo `.env.local`; as fixtures da execução pela mesma rotina do CI (`db query --remote=<dev>`, com o login do CLI e a aprovação do Danilo)
- [ ] Pendência de governança #24 aplicada no `supabase/CLAUDE.md` *(sob autorização)*
- [ ] Campos de perfil, unidade e setor entram no contrato nas Fases 5–7

**Verificação:** unidade + integração verdes no CI; logs da função no dev sem senha; depois do merge, a função publicada na produção com `verify_jwt`.

### STEP 1.10 — Edge Function `trocar-senha`
**Entrega:** a única forma de trocar a própria senha — e de sair da senha provisória.
- [ ] **Testes primeiro** (`deno test` + integração no dev, pelo job `integracao`; os usuários trocados são criados pela própria integração, nunca os do seed):
  - com `senha_provisoria = true`: troca sem exigir senha atual; desmarca `senha_provisoria` e grava `senha_alterada_em`;
  - com `senha_provisoria = false`: exige `senha_atual` correta (401 se errada);
  - nova senha fora da política → 400; igual à atual → 400;
  - usuário inativo ou de empresa bloqueada → 403;
  - não existe chamada que desmarque `senha_provisoria` sem trocar a senha
- [ ] Handler: identifica o chamador → valida → (se exigido) confere a senha atual → troca no Auth → atualiza o profile → encerra as demais sessões → grava `usuario.senha_alterada` → `{ data: { ok: true } }`
- [ ] `[functions.trocar-senha]` com `verify_jwt = true` explícito no `config.toml`
- [ ] Mecanismo de "encerrar as demais sessões" conferido na documentação atual do Auth e registrado no PR
- [ ] **Caminho direto do Auth** (`updateUser({ password })` com o token do próprio usuário): com `secure_password_change = false`, ele troca a senha sem a senha atual e sem login recente. No PR:
  - teste provando que esse caminho não desmarca `senha_provisoria` (o gate da Fase 2 continua exigindo a troca pela função) e não grava auditoria;
  - conferir na documentação atual do Auth se há como fechá-lo (configuração ou hook) e decidir com o Danilo o `secure_password_change` (exige login recente; sem SMTP, a reautenticação por código não chega);
  - registrar a decisão no risco da §8

**Verificação:** testes verdes no CI; tentativa de update direto em `profiles` pelo cliente continua negada (já coberta no 1.2); o caminho direto do Auth decidido e registrado.

### STEP 1.11 — Primeiro `super_admin` em produção 📋
**Entrega:** o dono do SaaS existe em produção, sem nenhum atalho no código.
- [ ] Pré-condição: as migrations dos STEPs 1.1–1.5 já estão na produção (aplicadas pelo pipeline nos merges)
- [ ] 📋 Danilo, uma única vez, no Dashboard do projeto de **produção** `maxis-producao` (nunca no `maxis`, que é o dev):
  1. Auth → criar usuário com o e-mail do Danilo, senha temporária forte, **e-mail confirmado**;
  2. SQL Editor → `insert` do profile com `papel = 'super_admin'`, `tenant_id` nulo, `nome`, `email`, `senha_provisoria = true` — o texto exato do comando fica no PR deste STEP (sem o e-mail);
  3. SQL Editor → `insert` em `eventos_auditoria` com `acao = 'usuario.criado'`, `ator_profile_id` nulo e `detalhes` indicando bootstrap
- [ ] Exceção documentada: é uma operação de **dados**, única; schema continua só por migration (`supabase/CLAUDE.md §2`)
- [ ] Conferência pelo MCP `supabase-prod` (somente leitura): exatamente 1 `super_admin`, com `tenant_id` nulo, e o evento registrado
- [ ] A troca da senha temporária acontece no primeiro login, quando a Fase 2 estiver no ar

**Verificação:** conferência via MCP registrada no log do `project_manager.md` (sem dados pessoais).

### STEP 1.12 — Fechamento da fase
- [ ] Advisors de segurança e performance do dev e da produção: zero alerta de segurança
- [ ] Tipos do frontend conferidos contra o schema final da fase (regenerados a cada migration, `supabase/CLAUDE.md §2`)
- [ ] `modelo-dados.md` conferido contra o banco real do dev e da produção (MCP; a produção somente leitura)
- [ ] Pendência de governança #5 aplicada no `CLAUDE.md §5` *(sob autorização)*
- [ ] `project_manager.md`: entregáveis ✅, Fase 1 ✅, progresso, log; fase ativa → Fase 2

**Verificação:** todos os critérios de aceite (§5) conferidos.

## 5. Critérios de aceite da fase

1. Testes pgTAP de `empresas`, `profiles` e `eventos_auditoria` cobrindo os casos mínimos de `supabase/CLAUDE.md §7` — verdes no dev, pelo MCP e pelo CI; teste guardião verde.
2. Usuário inativo ou de empresa bloqueada recebe **zero linhas** em qualquer tabela de tenant (exceto o próprio profile) e `obter_meu_acesso()` informa o motivo corretamente.
3. `super_admin` não enxerga dados de tenant além de `empresas` e dos `master_admin`.
4. Nenhuma escrita do cliente em `empresas`, `profiles` ou `eventos_auditoria` — provado por teste.
5. `eventos_auditoria` imutável, inclusive para `service_role`.
6. `provisionar-usuario`: matriz de cascata verde (unidade + integração no CI, contra o dev); compensação provada; senha provisória ausente de logs, banco e auditoria.
7. `trocar-senha`: impossível sair da senha provisória sem trocar a senha; política aplicada; troca voluntária exige a senha atual.
8. Auth do dev e da produção: cadastro público recusado (o dev pela API, a produção pelo `config diff`); política de senha ativa.
9. Advisors sem alerta de segurança.
10. Exatamente um `super_admin` em produção, com `tenant_id` nulo.
11. `modelo-dados.md` e tipos do frontend batem com o banco real (dev e produção).

## 6. Modelagem de dados afetada

Referência: `modelo-dados.md` §3 (`papel_usuario`), §4 (funções `private.*` e RPC `obter_meu_acesso`), §5.1 `empresas`, §5.2 `profiles` (colunas da Fase 1), §5.3 `eventos_auditoria`, §10 (matriz), §11 (ordem da Fase 1).
Atualizações feitas no `modelo-dados.md` junto com este plano: RPC `obter_meu_acesso()`; escrita em `profiles` só por Edge Function (inclusive a troca de senha); ação de auditoria `usuario.senha_alterada`.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Quem chama | Observação |
|---|---|---|---|
| Rota | — | — | nenhuma tela nesta fase |
| Edge Function | `provisionar-usuario` | `super_admin` (→ `master_admin`), `master_admin` (→ `admin`/`user`) | usada pelas telas das Fases 4 e 7 |
| Edge Function | `trocar-senha` | qualquer usuário autenticado ativo | usada pela Fase 2 (obrigatória) e pela Fase 3 (voluntária) |
| RPC | `obter_meu_acesso()` | qualquer usuário autenticado | usada pelos gates da Fase 2 |

## 8. Riscos e atenção

- **API das Edge Functions muda com frequência:** o padrão foi decidido no STEP 0.11 (`createSupabaseContext`); conferir no Context7 a versão vigente antes do STEP 1.8, sem confiar em exemplo antigo.
- **Sessões já emitidas:** encerrar sessões revoga a renovação, mas um token de acesso já emitido vale até expirar. O corte de **dados** é imediato pela RLS (`tenant_atual()` retorna nulo para inativo/bloqueado) — esse é o mecanismo de segurança; o encerramento de sessão é complementar.
- **`security definer`:** só em `private`. A RPC que precisa passar por cima da RLS é `security invoker` e chama a função do `private` (como `obter_meu_acesso()` → `private.acesso_atual()`, STEP 1.5); a regra 5 do guardião barra definer em `public`. Registrado no `supabase/CLAUDE.md §5/§6` (pendência de governança #26, aplicada em 22/11/2026).
- **Gate que fecha por padrão** (code-review do STEP 1.5): para um JWT sem profile, `obter_meu_acesso()` devolve um objeto com todos os campos nulos. O gate da Fase 2 libera só com `ativo === true` e, fora o `super_admin`, `empresa_ativa === true`; campo nulo nunca libera. Testar `=== false` deixaria passar o usuário sem profile.
- **Repositório público:** comandos do bootstrap e fixtures sem dados pessoais reais.
- **Dev compartilhado:** o MCP, o `test db`, o job `integracao` e o seed usam o mesmo banco. A proteção é a decisão 13 (nada depende de estado ou de contagem) e a concorrência global do job `integracao` (STEP 1.9). Mesmo serializado, o run de um PR sem mudança de função (docs, frontend) republica no dev as funções da `main`: durante o trabalho num STEP, o dev pode voltar à versão anterior até o próximo deploy pelo MCP.
- **Caminho direto do Auth para trocar a senha:** o GoTrue aceita a troca pelo token do próprio usuário, fora da `trocar-senha` (sem senha atual, sem auditoria e sem encerrar sessões). A `senha_provisoria` continua só na função, e o tratamento do resto é decidido no STEP 1.10.
- **Resíduo no dev:** a auditoria imutável prende no dev as empresas e os usuários criados pela integração. Ficam identificáveis (razão social e e-mail próprios de teste); a tela do Admin SaaS (Fase 4) vai listá-los no dev — tratar quando ela chegar.
- **Token do dev com escrita em Edge Functions:** o escopo continua só o projeto de dev, e o código publicado é o do PR, que passa pelos mesmos portões. PR de fork não recebe os secrets do `development` e fica barrado, como já acontece com o `banco`.
- **Promoção a `master_admin` fora da proteção** (decisão do Danilo no STEP 1.3): mudar outro papel para `master_admin` só é possível em empresa sem dono (o índice único barra o resto) e nenhuma Edge Function da v1 faz isso. Decidir junto com a troca do titular, no backlog da Fase 4.
- **Compensação do provisionamento × `master_admin`:** desde o STEP 1.3, o `master_admin` não sai do Auth sem a autorização da transação, nem recém-criado. A compensação do STEP 1.9 continua valendo porque apaga o usuário do Auth **antes** de o profile existir; um passo que falhe depois do profile não pode compensar apagando o usuário.
- **Hash da senha do seed no repositório público:** a senha é aleatória e forte (sem ataque de dicionário viável) e só vale no dev. Trocá-la exige hash novo no seed, `.env.local` e secret, juntos.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Schema `private`, utilitários e helpers de teste | 1.1 | ✅ |
| 2 | `empresas`, `profiles` e funções de RLS com isolamento provado | 1.2 | ✅ |
| 3 | Imutabilidade do `master_admin` | 1.3 | ✅ |
| 4 | `eventos_auditoria` imutável | 1.4 | ✅ |
| 5 | RPC `obter_meu_acesso()` | 1.5 | ✅ |
| 6 | Auth endurecido e política de senha (dev + produção) | 1.6 | ✅ |
| 7 | Seed do dev | 1.7 | ⬜ |
| 8 | Código compartilhado das Edge Functions | 1.8 | ⬜ |
| 9 | Edge Function `provisionar-usuario` e o job `integracao` do CI | 1.9 | ⬜ |
| 10 | Edge Function `trocar-senha` | 1.10 | ⬜ |
| 11 | Primeiro `super_admin` em produção | 1.11 | ⬜ |
| 12 | Fechamento da fase | 1.12 | ⬜ |
