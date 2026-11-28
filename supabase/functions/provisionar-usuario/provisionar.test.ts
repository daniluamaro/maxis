import { assert, assertEquals, assertFalse, assertMatch } from '@std/assert';
import { capturandoConsoleError } from '../_shared/consoleDeTeste.ts';
import { type ChamadaVista, fetchDeTeste } from '../_shared/fetchDeTeste.ts';
import {
  CHAVE_PUBLISHABLE_DE_TESTE,
  CHAVE_SECRETA_DE_TESTE,
  criarEmissorDeTeste,
} from '../_shared/jwtDeTeste.ts';
import type { Json } from '../_shared/resposta.ts';
import { problemasDaSenha } from '../_shared/senha.ts';
import { provisionarUsuario } from './provisionar.ts';

const URL_DO_PROJETO = 'https://ddaqbcfrplzdywpgilbf.supabase.co';
const URL_DA_FUNCAO = `${URL_DO_PROJETO}/functions/v1/provisionar-usuario`;

const SUPER_ADMIN = '5eed0000-0000-4000-8000-000000000001';
const MASTER_ALFA = '5eed0000-0000-4000-8000-00000000a001';
const ADMIN_ALFA = '5eed0000-0000-4000-8000-00000000a002';
const TENANT_ALFA = '5eed0000-0000-4000-8000-00000000a000';
const TENANT_NOVO = '0b5e7a1c-2d3f-4a5b-8c6d-7e8f9a0b1c2d';
const ID_NOVO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

const emissor = await criarEmissorDeTeste(URL_DO_PROJETO);

/** O `obter_meu_acesso()` de um chamador ativo, de empresa ativa, que já trocou a senha. */
function acessoDe(papel: string): Json {
  return {
    papel,
    nome: 'Chamador',
    ativo: true,
    empresa_ativa: papel === 'super_admin' ? null : true,
    senha_provisoria: false,
  };
}

/** A resposta do Auth atual (com a versão da API no cabeçalho) para um erro com código. */
function erroDoAuth(status: number, codigo: string): Response {
  return Response.json({ code: codigo, message: `mensagem do Auth (${codigo})` }, {
    status,
    headers: { 'x-supabase-api-version': '2024-01-01' },
  });
}

/** A resposta do PostgREST para um erro do Postgres. */
function erroDoBanco(status: number, codigo: string, mensagem: string): Response {
  return Response.json(
    { code: codigo, message: mensagem, details: 'Key (email)=(…)', hint: null },
    {
      status,
    },
  );
}

interface Cenario {
  readonly papel: string;
  readonly tenantDoChamador: string | null;
  /** As linhas de `empresas` que o super_admin enxerga para a empresa pedida. */
  readonly empresa?: Json[];
  /** Os `master_admin` que ele enxerga nela. */
  readonly masters?: Json[];
  readonly leituraDaEmpresa?: Response;
  readonly criarUsuario?: Response;
  readonly registrar?: Response;
  /** O `deleteUser` do SDK busca o usuário antes de apagar (supabase-js, issue 2751). */
  readonly buscarUsuario?: Response;
  readonly apagarUsuario?: Response;
}

/** O projeto do teste: PostgREST e Auth, como respondem pela API. */
function projeto(cenario: Cenario): ReturnType<typeof fetchDeTeste> {
  return fetchDeTeste(({ metodo, caminho }) => {
    if (metodo === 'POST' && caminho === '/rest/v1/rpc/obter_meu_acesso') {
      return Response.json(acessoDe(cenario.papel));
    }
    if (metodo === 'GET' && caminho.startsWith('/rest/v1/profiles?select=tenant_id&')) {
      return Response.json([{ tenant_id: cenario.tenantDoChamador }]);
    }
    if (metodo === 'GET' && caminho.startsWith('/rest/v1/empresas?')) {
      return cenario.leituraDaEmpresa?.clone() ?? Response.json(cenario.empresa ?? []);
    }
    if (metodo === 'GET' && caminho.startsWith('/rest/v1/profiles?select=id&')) {
      return Response.json(cenario.masters ?? []);
    }
    if (metodo === 'POST' && caminho === '/auth/v1/admin/users') {
      return cenario.criarUsuario ??
        Response.json({ id: ID_NOVO, aud: 'authenticated', email: 'novo@exemplo.test' });
    }
    if (metodo === 'POST' && caminho === '/rest/v1/rpc/registrar_usuario_provisionado') {
      return cenario.registrar ?? new Response(null, { status: 204 });
    }
    if (metodo === 'GET' && caminho === `/auth/v1/admin/users/${ID_NOVO}`) {
      return cenario.buscarUsuario ??
        Response.json({ id: ID_NOVO, aud: 'authenticated', email: 'novo@exemplo.test' });
    }
    if (metodo === 'DELETE' && caminho === `/auth/v1/admin/users/${ID_NOVO}`) {
      return cenario.apagarUsuario ?? Response.json({});
    }
    return undefined;
  });
}

const PEDIDO_DO_MASTER = {
  papel: 'user',
  nome: 'Ana Souza',
  email: 'Ana.Souza@Exemplo.test',
  telefone: '+55 (11) 98765-4321',
};
const PEDIDO_DO_SUPER = {
  papel: 'master_admin',
  nome: 'Bruno Dono',
  email: 'bruno.dono@exemplo.test',
  tenant_id: TENANT_NOVO,
};

async function provisionar(
  chamador: string,
  corpo: Json,
  doProjeto: { fetch: typeof fetch },
): Promise<
  { status: number; corpo: Record<string, Record<string, unknown>>; cache: string | null }
> {
  const req = new Request(URL_DA_FUNCAO, {
    method: 'POST',
    headers: { authorization: `Bearer ${await emissor.assinar(chamador)}` },
    body: JSON.stringify(corpo),
  });
  const resposta = await provisionarUsuario(req, {
    ambiente: emissor.ambiente,
    fetch: doProjeto.fetch,
  });
  return {
    status: resposta.status,
    corpo: await resposta.json(),
    cache: resposta.headers.get('cache-control'),
  };
}

function chamada(
  doProjeto: { chamadas: ChamadaVista[] },
  metodo: string,
  caminho: string,
): ChamadaVista | undefined {
  return doProjeto.chamadas.find((c) => c.metodo === metodo && c.caminho.startsWith(caminho));
}

function criouNoAuth(doProjeto: { chamadas: ChamadaVista[] }): boolean {
  return chamada(doProjeto, 'POST', '/auth/v1/admin/users') !== undefined;
}

function senhaEnviadaAoAuth(doProjeto: { chamadas: ChamadaVista[] }): string {
  const corpo = chamada(doProjeto, 'POST', '/auth/v1/admin/users')?.corpo as { password: string };
  return corpo.password;
}

Deno.test('o master_admin cria um user na própria empresa: 201 com a senha provisória', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });

  const { status, corpo, cache } = await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

  assertEquals(status, 201);
  assertEquals(corpo, {
    data: {
      profile_id: ID_NOVO,
      email: 'ana.souza@exemplo.test',
      senha_provisoria: senhaEnviadaAoAuth(doProjeto),
    },
  });
  assertEquals(cache, 'no-store');
});

Deno.test('o usuário nasce no Auth com e-mail confirmado e a senha provisória, pela chave secreta', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });

  await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

  const noAuth = chamada(doProjeto, 'POST', '/auth/v1/admin/users');
  assertEquals(noAuth?.cabecalhos.get('apikey'), CHAVE_SECRETA_DE_TESTE);
  // Só isto: nada de metadados, que o cliente poderia confundir com autorização
  assertEquals(noAuth?.corpo, {
    email: 'ana.souza@exemplo.test',
    password: senhaEnviadaAoAuth(doProjeto),
    email_confirm: true,
  });
  const senha = senhaEnviadaAoAuth(doProjeto);
  assertEquals(senha.length, 12);
  assertEquals(problemasDaSenha(senha), []);
  assertMatch(senha, /^[A-HJ-NP-Za-km-z2-9]+$/);
});

Deno.test('o profile e o evento vão pela RPC, com a chave secreta, o tenant do chamador e sem a senha', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });

  await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

  const rpc = chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado');
  assertEquals(rpc?.cabecalhos.get('apikey'), CHAVE_SECRETA_DE_TESTE);
  assertEquals(rpc?.corpo, {
    usuario_id: ID_NOVO,
    tenant_id: TENANT_ALFA,
    papel: 'user',
    nome: 'Ana Souza',
    email: 'ana.souza@exemplo.test',
    ator_profile_id: MASTER_ALFA,
    telefone: '5511987654321',
  });
  assertFalse(JSON.stringify(rpc?.corpo).includes(senhaEnviadaAoAuth(doProjeto)));
  assertEquals(chamada(doProjeto, 'DELETE', '/auth/v1/admin/users/'), undefined);
});

Deno.test('sem telefone, a RPC não recebe telefone', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });
  const { telefone: _, ...semTelefone } = PEDIDO_DO_MASTER;

  const { status } = await provisionar(MASTER_ALFA, semTelefone, doProjeto);

  assertEquals(status, 201);
  const rpc = chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado');
  assertFalse(Object.hasOwn(rpc?.corpo as object, 'telefone'));
});

Deno.test('o super_admin cria o master_admin de uma empresa ativa e sem dono', async () => {
  const doProjeto = projeto({
    papel: 'super_admin',
    tenantDoChamador: null,
    empresa: [{ ativo: true }],
    masters: [],
  });

  const { status, corpo } = await provisionar(SUPER_ADMIN, PEDIDO_DO_SUPER, doProjeto);

  assertEquals(status, 201);
  assertEquals(corpo.data?.profile_id, ID_NOVO);
  const rpc = chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado');
  assertEquals(rpc?.corpo, {
    usuario_id: ID_NOVO,
    tenant_id: TENANT_NOVO,
    papel: 'master_admin',
    nome: 'Bruno Dono',
    email: 'bruno.dono@exemplo.test',
    ator_profile_id: SUPER_ADMIN,
  });
});

Deno.test('a empresa pedida é lida com o token do super_admin, sob a RLS', async () => {
  const doProjeto = projeto({
    papel: 'super_admin',
    tenantDoChamador: null,
    empresa: [{ ativo: true }],
    masters: [],
  });

  await provisionar(SUPER_ADMIN, PEDIDO_DO_SUPER, doProjeto);

  const leituras = [
    chamada(doProjeto, 'GET', '/rest/v1/empresas?'),
    chamada(doProjeto, 'GET', '/rest/v1/profiles?select=id&'),
  ];
  assertEquals(leituras.map((c) => c?.caminho), [
    `/rest/v1/empresas?select=ativo&id=eq.${TENANT_NOVO}`,
    `/rest/v1/profiles?select=id&tenant_id=eq.${TENANT_NOVO}&papel=eq.master_admin`,
  ]);
  for (const leitura of leituras) {
    assertEquals(leitura?.cabecalhos.get('apikey'), CHAVE_PUBLISHABLE_DE_TESTE);
    assertMatch(leitura?.cabecalhos.get('authorization') ?? '', /^Bearer eyJ/);
  }
});

Deno.test('empresa inexistente, bloqueada ou com dono: nada é criado no Auth', async () => {
  const casos: [Cenario['empresa'], Cenario['masters'], number, string][] = [
    [[], [], 404, 'empresa_inexistente'],
    [[{ ativo: false }], [], 403, 'empresa_bloqueada'],
    [[{ ativo: true }], [{ id: MASTER_ALFA }], 409, 'empresa_com_master_admin'],
  ];
  for (const [empresa, masters, statusEsperado, codigo] of casos) {
    const doProjeto = projeto({ papel: 'super_admin', tenantDoChamador: null, empresa, masters });

    const { status, corpo } = await provisionar(SUPER_ADMIN, PEDIDO_DO_SUPER, doProjeto);

    assertEquals([status, corpo.error?.codigo], [statusEsperado, codigo]);
    assertFalse(criouNoAuth(doProjeto), codigo);
  }
});

Deno.test('falha ao ler a empresa pedida: 500, sem criar no Auth e sem a mensagem do banco no log', async () => {
  const doProjeto = projeto({
    papel: 'super_admin',
    tenantDoChamador: null,
    leituraDaEmpresa: erroDoBanco(500, 'XX000', 'detalhe interno do banco'),
  });

  const { resultado, registros } = await capturandoConsoleError(() =>
    provisionar(SUPER_ADMIN, PEDIDO_DO_SUPER, doProjeto)
  );

  assertEquals([resultado.status, resultado.corpo.error?.codigo], [500, 'erro_interno']);
  assertFalse(criouNoAuth(doProjeto));
  assertEquals(registros, ['Falha ao ler a empresa pedida: XX000']);
});

Deno.test('a cascata recusa antes de criar no Auth', async () => {
  const casos: [string, string, string | null, Json, string][] = [
    [ADMIN_ALFA, 'admin', TENANT_ALFA, PEDIDO_DO_MASTER, 'papel_nao_permitido'],
    [MASTER_ALFA, 'master_admin', TENANT_ALFA, PEDIDO_DO_SUPER, 'papel_nao_permitido'],
    [
      MASTER_ALFA,
      'master_admin',
      TENANT_ALFA,
      { ...PEDIDO_DO_MASTER, tenant_id: TENANT_NOVO },
      'empresa_nao_permitida',
    ],
  ];
  for (const [chamador, papel, tenantDoChamador, pedido, codigo] of casos) {
    const doProjeto = projeto({ papel, tenantDoChamador });

    const { status, corpo } = await provisionar(chamador, pedido, doProjeto);

    assertEquals([status, corpo.error?.codigo], [403, codigo]);
    assertFalse(criouNoAuth(doProjeto), codigo);
  }
});

Deno.test('entrada inválida: 400 por campo, antes de criar no Auth', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });

  const { status, corpo } = await provisionar(
    MASTER_ALFA,
    { ...PEDIDO_DO_MASTER, senha: 'EscolhidaPorMim1' },
    doProjeto,
  );

  assertEquals(status, 400);
  assertEquals(corpo.error?.campos, { senha: 'Campo não permitido.' });
  assertFalse(criouNoAuth(doProjeto));
});

Deno.test('sem sessão: 401, sem ler a entrada nem chegar ao banco', async () => {
  const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA });
  const req = new Request(URL_DA_FUNCAO, {
    method: 'POST',
    body: JSON.stringify(PEDIDO_DO_MASTER),
  });

  const resposta = await provisionarUsuario(req, {
    ambiente: emissor.ambiente,
    fetch: doProjeto.fetch,
  });

  assertEquals(resposta.status, 401);
  assertEquals(doProjeto.chamadas, []);
  assertFalse(req.bodyUsed);
});

Deno.test('e-mail que já existe no Auth: 409, sem gravar nada', async () => {
  const doProjeto = projeto({
    papel: 'master_admin',
    tenantDoChamador: TENANT_ALFA,
    criarUsuario: erroDoAuth(422, 'email_exists'),
  });

  const { status, corpo } = await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

  assertEquals([status, corpo.error?.codigo], [409, 'email_em_uso']);
  assertEquals(
    chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado'),
    undefined,
  );
});

Deno.test('e-mail que o Auth recusa pelo formato: 400 no campo do e-mail', async () => {
  const doProjeto = projeto({
    papel: 'master_admin',
    tenantDoChamador: TENANT_ALFA,
    criarUsuario: erroDoAuth(400, 'email_address_invalid'),
  });

  const { status, corpo } = await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

  assertEquals(status, 400);
  assertEquals(corpo.error?.campos, { email: 'Informe um e-mail válido.' });
  assertEquals(
    chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado'),
    undefined,
  );
});

Deno.test('outra falha do Auth: 500, sem gravar nada, com só o código no log', async () => {
  for (
    const [criarUsuario, codigoNoLog] of [
      [erroDoAuth(422, 'weak_password'), 'weak_password'],
      [Response.json({ message: 'fora do ar' }, { status: 503 }), 'sem código'],
    ] as const
  ) {
    const doProjeto = projeto({
      papel: 'master_admin',
      tenantDoChamador: TENANT_ALFA,
      criarUsuario,
    });

    const { resultado, registros } = await capturandoConsoleError(() =>
      provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto)
    );

    assertEquals([resultado.status, resultado.corpo.error?.codigo], [500, 'erro_interno']);
    assertEquals(
      chamada(doProjeto, 'POST', '/rest/v1/rpc/registrar_usuario_provisionado'),
      undefined,
    );
    assertEquals(registros, [`Falha ao criar o usuário no Auth: ${codigoNoLog}`]);
  }
});

Deno.test('conflito na RPC: o usuário sai do Auth e a resposta é 409', async () => {
  const casos = [
    ['profiles_email_key', 'email_em_uso'],
    ['profiles_tenant_id_master_admin_key', 'empresa_com_master_admin'],
  ] as const;
  for (const [constraint, codigo] of casos) {
    const doProjeto = projeto({
      papel: 'master_admin',
      tenantDoChamador: TENANT_ALFA,
      registrar: erroDoBanco(
        409,
        '23505',
        `duplicate key value violates unique constraint "${constraint}"`,
      ),
    });

    const { status, corpo } = await provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto);

    assertEquals([status, corpo.error?.codigo], [409, codigo]);
    const apagou = chamada(doProjeto, 'DELETE', `/auth/v1/admin/users/${ID_NOVO}`);
    assertEquals(apagou?.cabecalhos.get('apikey'), CHAVE_SECRETA_DE_TESTE, codigo);
  }
});

Deno.test('outra falha na RPC: o usuário sai do Auth, 500 e só o código no log', async () => {
  for (
    const registrar of [
      erroDoBanco(409, '23505', 'duplicate key value violates unique constraint "profiles_pkey"'),
      erroDoBanco(403, '42501', 'permission denied for table eventos_auditoria'),
      // Só a violação de unicidade (23505) é conflito, mesmo que outro erro cite a constraint
      erroDoBanco(
        400,
        'P0001',
        'duplicate key value violates unique constraint "profiles_email_key"',
      ),
    ]
  ) {
    const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA, registrar });

    const { resultado, registros } = await capturandoConsoleError(() =>
      provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto)
    );

    assertEquals([resultado.status, resultado.corpo.error?.codigo], [500, 'erro_interno']);
    assert(chamada(doProjeto, 'DELETE', `/auth/v1/admin/users/${ID_NOVO}`));
    assertEquals(registros.length, 1);
    assertMatch(registros[0] ?? '', /^Falha ao gravar o profile e o evento: (23505|42501|P0001)$/);
  }
});

Deno.test('a compensação que falha deixa no log o id do usuário que ficou no Auth', async () => {
  const doProjeto = projeto({
    papel: 'master_admin',
    tenantDoChamador: TENANT_ALFA,
    registrar: erroDoBanco(
      409,
      '23505',
      'duplicate key value violates unique constraint "profiles_email_key"',
    ),
    buscarUsuario: erroDoAuth(404, 'user_not_found'),
  });

  const { resultado, registros } = await capturandoConsoleError(() =>
    provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto)
  );

  assertEquals([resultado.status, resultado.corpo.error?.codigo], [500, 'erro_interno']);
  assertEquals(registros, [
    'Falha ao gravar o profile e o evento: 23505',
    `Compensação falhou (user_not_found): o usuário ${ID_NOVO} ficou no Auth sem profile.`,
  ]);
});

Deno.test('a senha provisória não aparece em nenhum log, em nenhuma falha', async () => {
  const falhas: Partial<Cenario>[] = [
    { criarUsuario: erroDoAuth(422, 'weak_password') },
    { registrar: erroDoBanco(403, '42501', 'permission denied') },
    {
      registrar: erroDoBanco(409, '23505', 'duplicate key value violates unique constraint "x"'),
      apagarUsuario: erroDoAuth(500, 'unexpected_failure'),
    },
  ];
  for (const falha of falhas) {
    const doProjeto = projeto({ papel: 'master_admin', tenantDoChamador: TENANT_ALFA, ...falha });

    const { registros } = await capturandoConsoleError(() =>
      provisionar(MASTER_ALFA, PEDIDO_DO_MASTER, doProjeto)
    );

    const senha = senhaEnviadaAoAuth(doProjeto);
    assert(registros.length > 0);
    assertFalse(registros.some((linha) => linha.includes(senha)), registros.join('\n'));
    assertFalse(registros.some((linha) => linha.includes('ana.souza')), registros.join('\n'));
  }
});
