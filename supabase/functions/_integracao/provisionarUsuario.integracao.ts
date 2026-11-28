/**
 * Integração da `provisionar-usuario` (plano da Fase 1, STEP 1.9) contra a função publicada no
 * dev. Os chamadores são os usuários do seed, que o job reaplica antes. Tudo o que muda de estado é
 * criado aqui, com o id da execução: a empresa (CNPJ com o prefixo `INT`, reservado à integração),
 * o `master_admin` dela e os usuários que ele cria. Fica no dev (a auditoria imutável os prende,
 * decisão 13), identificável pelo nome e pelo e-mail. Nenhuma asserção depende de contagem total.
 */
import { assert, assertEquals, assertFalse, assertMatch } from '@std/assert';
import { problemasDaSenha } from '../_shared/senha.ts';
import {
  cadastrarPelaApi,
  chamar,
  entrar,
  lerAmbiente,
  literal,
  type Resposta,
  sql,
} from './apoio.ts';

const FUNCAO = 'provisionar-usuario';
const ambiente = lerAmbiente();
const execucao = crypto.randomUUID().slice(0, 8);

const SEED = {
  super: { id: '5eed0000-0000-4000-8000-000000000001', email: 'super.admin@exemplo.test' },
  masterAlfa: { id: '5eed0000-0000-4000-8000-00000000a001', email: 'master.alfa@exemplo.test' },
  adminAlfa: { id: '5eed0000-0000-4000-8000-00000000a002', email: 'admin.alfa@exemplo.test' },
  userAlfa: { id: '5eed0000-0000-4000-8000-00000000a003', email: 'user.alfa@exemplo.test' },
  inativoAlfa: { id: '5eed0000-0000-4000-8000-00000000a004', email: 'inativo.alfa@exemplo.test' },
  provisoriaAlfa: {
    id: '5eed0000-0000-4000-8000-00000000a005',
    email: 'provisoria.alfa@exemplo.test',
  },
  masterGama: { id: '5eed0000-0000-4000-8000-00000000c001', email: 'master.gama@exemplo.test' },
} as const;
const TENANT_BETA = '5eed0000-0000-4000-8000-00000000b000';
const TENANT_GAMA = '5eed0000-0000-4000-8000-00000000c000';

const ORIGEM_DO_VITE = 'http://localhost:5173';
const ORIGEM_DE_PRODUCAO = 'https://maxis.vemperformar.com.br';

function emailDaExecucao(nome: string): string {
  return `int-${execucao}-${nome}@exemplo.test`;
}

// O log do CI é público: a mensagem de uma falha leva só o erro, nunca o `data` (que traria a
// senha provisória de um usuário criado por engano)
function erroEsperado(resposta: Resposta, status: number, codigo: string): void {
  assertEquals(
    [resposta.status, resposta.corpo?.error?.codigo],
    [status, codigo],
    JSON.stringify(resposta.corpo?.error ?? { status: resposta.status }),
  );
}

interface Criado {
  readonly id: string;
  readonly email: string;
  readonly senha: string;
  readonly papel: string;
  readonly tenantId: string;
  readonly ator: string;
}

function criadoDe(
  resposta: Resposta,
  papel: string,
  tenantId: string,
  ator: string,
): Criado {
  assertEquals(resposta.status, 201, JSON.stringify(resposta.corpo?.error));
  const data = resposta.corpo?.data ?? {};
  const { profile_id, email, senha_provisoria } = data;
  assert(typeof profile_id === 'string' && typeof email === 'string');
  assert(typeof senha_provisoria === 'string');
  assertEquals(Object.keys(data).sort(), ['email', 'profile_id', 'senha_provisoria']);
  return { id: profile_id, email, senha: senha_provisoria, papel, tenantId, ator };
}

Deno.test('provisionar-usuario no dev', async (t) => {
  const tokens = Object.fromEntries(
    await Promise.all(
      Object.entries(SEED).map(async ([nome, { email }]) => [nome, await entrar(ambiente, email)]),
    ),
  ) as Record<keyof typeof SEED, string>;

  // A empresa da execução: ativa, sem dono, com CNPJ único (os verificadores pelo próprio banco)
  const [empresa] = await sql<{ id: string }>(`
    with base as (
      select 'INT' || upper(substr(md5(gen_random_uuid()::text), 1, 9)) as raiz
    ), cnpj as (
      select raiz || lpad(dv::text, 2, '0') as valor
      from base, generate_series(0, 99) as dv
      where private.cnpj_valido(raiz || lpad(dv::text, 2, '0'))
      limit 1
    )
    insert into public.empresas (razao_social, nome_fantasia, cnpj)
    select 'Integração ' || ${literal(execucao)}, 'Integração', valor from cnpj
    returning id::text
  `);
  assert(empresa, 'a empresa da execução não foi criada');
  const tenantDaExecucao = empresa.id;
  const criados: Criado[] = [];

  await t.step('o cadastro público pela API é recusado (config.toml do Auth)', async () => {
    const resposta = await cadastrarPelaApi(ambiente, emailDaExecucao('publico'), 'Publico1234');

    assertEquals(resposta.status, 422);
    assertEquals(resposta.corpo?.error_code ?? resposta.corpo?.code, 'signup_disabled');
  });

  await t.step('o preflight do navegador passa só pelas origens do app', async () => {
    for (const origem of [ORIGEM_DO_VITE, ORIGEM_DE_PRODUCAO]) {
      const resposta = await chamar(ambiente, FUNCAO, {
        metodo: 'OPTIONS',
        origem,
        semApikey: true,
        cabecalhos: {
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, apikey, content-type, x-client-info',
        },
      });
      assertEquals(resposta.status, 204, origem);
      assertEquals(resposta.cabecalhos.get('access-control-allow-origin'), origem);
      assertMatch(resposta.cabecalhos.get('access-control-allow-headers') ?? '', /authorization/);
    }
    const outra = await chamar(ambiente, FUNCAO, {
      metodo: 'OPTIONS',
      origem: 'https://outra.exemplo.test',
      semApikey: true,
    });
    assertEquals(outra.status, 403);
  });

  await t.step('sem sessão: 401 legível pelo navegador, da plataforma e da função', async () => {
    // Sem nada, quem recusa é a plataforma (verify_jwt), com CORS aberto
    const semNada = await chamar(ambiente, FUNCAO, {
      origem: ORIGEM_DO_VITE,
      semApikey: true,
      corpo: {},
    });
    assertEquals(semNada.status, 401);
    assertEquals(semNada.cabecalhos.get('access-control-allow-origin'), '*');
    // Só com a chave publishable, a plataforma deixa passar, e a função recusa
    const soApikey = await chamar(ambiente, FUNCAO, { origem: ORIGEM_DO_VITE, corpo: {} });
    erroEsperado(soApikey, 401, 'sessao_invalida');
    assertEquals(soApikey.cabecalhos.get('access-control-allow-origin'), ORIGEM_DO_VITE);
  });

  await t.step('quem não pode criar recebe 403, antes de qualquer gravação', async () => {
    const pedido = { papel: 'user', nome: 'Não criado', email: emailDaExecucao('recusado') };
    const casos: [keyof typeof SEED, unknown, string][] = [
      ['adminAlfa', pedido, 'papel_nao_permitido'],
      ['userAlfa', pedido, 'papel_nao_permitido'],
      ['inativoAlfa', pedido, 'usuario_inativo'],
      ['masterGama', pedido, 'empresa_bloqueada'],
      ['provisoriaAlfa', pedido, 'troca_de_senha_pendente'],
      ['masterAlfa', { ...pedido, tenant_id: TENANT_BETA }, 'empresa_nao_permitida'],
      ['masterAlfa', { ...pedido, papel: 'master_admin' }, 'papel_nao_permitido'],
      ['super', { ...pedido, tenant_id: tenantDaExecucao }, 'papel_nao_permitido'],
    ];
    for (const [quem, corpo, codigo] of casos) {
      erroEsperado(await chamar(ambiente, FUNCAO, { token: tokens[quem], corpo }), 403, codigo);
    }
    const [{ n }] = await sql<{ n: number }>(
      `select count(*)::int as n from auth.users where email = ${
        literal(emailDaExecucao('recusado'))
      }`,
    ) as [{ n: number }];
    assertEquals(n, 0);
  });

  let master: Criado | undefined;
  await t.step('o super_admin cria o master_admin da empresa da execução', async () => {
    const resposta = await chamar(ambiente, FUNCAO, {
      token: tokens.super,
      corpo: {
        papel: 'master_admin',
        nome: `Dono da integração ${execucao}`,
        email: emailDaExecucao('master').toUpperCase(),
        telefone: '+55 (11) 98765-4321',
        tenant_id: tenantDaExecucao,
      },
    });

    master = criadoDe(resposta, 'master_admin', tenantDaExecucao, SEED.super.id);
    criados.push(master);
    assertEquals(master.email, emailDaExecucao('master'));
    assertEquals(master.senha.length, 12);
    assertEquals(problemasDaSenha(master.senha), []);
  });

  await t.step('a empresa que já tem dono, a bloqueada e a inexistente são recusadas', async () => {
    const pedido = { papel: 'master_admin', nome: 'Outro dono', email: emailDaExecucao('outro') };
    const casos: [string, number, string][] = [
      [tenantDaExecucao, 409, 'empresa_com_master_admin'],
      [TENANT_GAMA, 403, 'empresa_bloqueada'],
      [crypto.randomUUID(), 404, 'empresa_inexistente'],
    ];
    for (const [tenant_id, status, codigo] of casos) {
      const resposta = await chamar(ambiente, FUNCAO, {
        token: tokens.super,
        corpo: { ...pedido, tenant_id },
      });
      erroEsperado(resposta, status, codigo);
    }
  });

  await t.step(
    'o master_admin novo entra com a senha provisória e ainda não cria ninguém',
    async () => {
      assert(master);
      const token = await entrar(ambiente, master.email, master.senha);

      const resposta = await chamar(ambiente, FUNCAO, {
        token,
        corpo: { papel: 'user', nome: 'Antes da troca', email: emailDaExecucao('antes') },
      });
      erroEsperado(resposta, 403, 'troca_de_senha_pendente');
    },
  );

  // A troca de senha é a `trocar-senha` (STEP 1.10): aqui, só a marca, no usuário da execução
  let tokenDoMaster = '';
  await t.step('com a senha provisória trocada, o master_admin cria admin e user', async () => {
    assert(master);
    await sql(
      `update public.profiles set senha_provisoria = false where id = ${literal(master.id)}`,
    );
    tokenDoMaster = await entrar(ambiente, master.email, master.senha);

    for (const papel of ['admin', 'user']) {
      const resposta = await chamar(ambiente, FUNCAO, {
        token: tokenDoMaster,
        corpo: { papel, nome: `${papel} da integração ${execucao}`, email: emailDaExecucao(papel) },
      });
      criados.push(criadoDe(resposta, papel, tenantDaExecucao, master.id));
    }
  });

  await t.step('o usuário recém-criado entra com a senha provisória', async () => {
    const user = criados.find((c) => c.papel === 'user');
    assert(user);
    assertMatch(await entrar(ambiente, user.email, user.senha), /^eyJ/);
  });

  await t.step('e-mail que já existe: 409, sem gravar nada', async () => {
    const resposta = await chamar(ambiente, FUNCAO, {
      token: tokenDoMaster,
      corpo: { papel: 'user', nome: 'Repetido', email: SEED.userAlfa.email },
    });
    erroEsperado(resposta, 409, 'email_em_uso');
  });

  await t.step('conflito no profile: o usuário não fica no Auth (compensação)', async () => {
    assert(master);
    // `profiles.email` é cópia: o profile de um usuário da execução fica com o e-mail que será
    // pedido. O Auth cria (não tem o e-mail), a RPC falha no `unique`, e a função compensa
    const ocupado = emailDaExecucao('ocupado');
    const resposta = await chamar(ambiente, FUNCAO, {
      token: tokenDoMaster,
      corpo: { papel: 'user', nome: 'Dono do e-mail', email: emailDaExecucao('dono') },
    });
    const dono = criadoDe(resposta, 'user', tenantDaExecucao, master.id);
    await sql(
      `update public.profiles set email = ${literal(ocupado)} where id = ${literal(dono.id)}`,
    );

    const conflito = await chamar(ambiente, FUNCAO, {
      token: tokenDoMaster,
      corpo: { papel: 'user', nome: 'Sem lugar', email: ocupado },
    });

    erroEsperado(conflito, 409, 'email_em_uso');
    const [{ n }] = await sql<{ n: number }>(
      `select count(*)::int as n from auth.users where email = ${literal(ocupado)}`,
    ) as [{ n: number }];
    assertEquals(n, 0, 'ficou usuário no Auth sem profile');
  });

  await t.step(
    'o banco tem o profile e o evento de cada criado, e nenhum guarda a senha',
    async () => {
      const ids = criados.map((c) => literal(c.id)).join(', ');
      const linhas = await sql<{
        id: string;
        profile: Record<string, unknown>;
        eventos: Record<string, unknown>[];
        confirmado: boolean;
      }>(`
      select p.id::text, to_jsonb(p) as profile,
        (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'created_at'), '[]'::jsonb)
         from public.eventos_auditoria as e where e.alvo_id = p.id) as eventos,
        (select u.email_confirmed_at is not null from auth.users as u where u.id = p.id) as confirmado
      from public.profiles as p where p.id in (${ids})
    `);

      assertEquals(linhas.length, criados.length);
      for (const criado of criados) {
        const linha = linhas.find((l) => l.id === criado.id);
        assert(linha, criado.email);
        assertEquals(
          {
            papel: linha.profile.papel,
            tenant_id: linha.profile.tenant_id,
            senha_provisoria: linha.profile.senha_provisoria,
            ativo: linha.profile.ativo,
            created_by: linha.profile.created_by,
          },
          {
            papel: criado.papel,
            tenant_id: criado.tenantId,
            senha_provisoria: criado.papel !== 'master_admin',
            ativo: true,
            created_by: criado.ator,
          },
          criado.email,
        );
        assertEquals(linha.eventos, [{
          tenant_id: criado.tenantId,
          ator_profile_id: criado.ator,
          acao: 'usuario.criado',
          alvo_tabela: 'profiles',
          alvo_id: criado.id,
          detalhes: { papel: criado.papel },
        }]);
        assert(linha.confirmado, `${criado.email} sem e-mail confirmado`);
        assertFalse(
          JSON.stringify(linha).includes(criado.senha),
          `senha no banco: ${criado.email}`,
        );
      }
    },
  );
});
