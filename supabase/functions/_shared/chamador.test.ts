import { assert, assertEquals, assertNotStrictEquals, assertStringIncludes } from '@std/assert';
import { identificarChamador, type OpcoesDoChamador } from './chamador.ts';
import { capturandoConsoleError } from './consoleDeTeste.ts';
import { fetchDeTeste } from './fetchDeTeste.ts';
import {
  CHAVE_PUBLISHABLE_DE_TESTE,
  CHAVE_SECRETA_DE_TESTE,
  criarEmissorDeTeste,
} from './jwtDeTeste.ts';
import type { Resultado } from './resposta.ts';

const URL_DO_PROJETO = 'https://ddaqbcfrplzdywpgilbf.supabase.co';
const URL_DA_FUNCAO = `${URL_DO_PROJETO}/functions/v1/provisionar-usuario`;
const SUPER_ADMIN = '5eed0000-0000-4000-8000-000000000001';
const MASTER_ALFA = '5eed0000-0000-4000-8000-00000000a001';
const USER_ALFA = '5eed0000-0000-4000-8000-00000000a003';
const TENANT_ALFA = '5eed0000-0000-4000-8000-00000000a000';

const emissor = await criarEmissorDeTeste(URL_DO_PROJETO);

/** O que o `obter_meu_acesso()` devolve pela API: um objeto, com todos os campos anuláveis. */
interface Acesso {
  papel: string | null;
  nome: string | null;
  ativo: boolean | null;
  empresa_ativa: boolean | null;
  senha_provisoria: boolean | null;
}

const MASTER_ATIVO: Acesso = {
  papel: 'master_admin',
  nome: 'Marcos Alves',
  ativo: true,
  empresa_ativa: true,
  senha_provisoria: false,
};
const SEM_PROFILE: Acesso = {
  papel: null,
  nome: null,
  ativo: null,
  empresa_ativa: null,
  senha_provisoria: null,
};

/** O banco do teste: a RPC do acesso e o profile do chamador, como o PostgREST responde. */
function banco(
  acesso: unknown,
  profiles: unknown[] = [{ tenant_id: TENANT_ALFA }],
): ReturnType<typeof fetchDeTeste> {
  return fetchDeTeste((chamada) => {
    if (chamada.metodo === 'POST' && chamada.caminho === '/rest/v1/rpc/obter_meu_acesso') {
      return Response.json(acesso);
    }
    if (chamada.metodo === 'GET' && chamada.caminho.startsWith('/rest/v1/profiles?')) {
      return Response.json(profiles);
    }
    return undefined;
  });
}

function requisicao(token?: string): Request {
  return new Request(URL_DA_FUNCAO, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function identificar(
  token: string | undefined,
  banco: { fetch: typeof fetch },
  opcoes: OpcoesDoChamador = {},
): ReturnType<typeof identificarChamador> {
  return identificarChamador(requisicao(token), {
    ambiente: emissor.ambiente,
    fetch: banco.fetch,
    ...opcoes,
  });
}

async function recusa(
  resultado: Resultado<unknown>,
): Promise<{ status: number; codigo: string; mensagem: string }> {
  assert(!resultado.ok, 'era para recusar o chamador');
  const { error } = await resultado.resposta.json();
  return { status: resultado.resposta.status, codigo: error.codigo, mensagem: error.mensagem };
}

Deno.test('o chamador ativo de empresa ativa segue com id, papel e tenant', async () => {
  const resultado = await identificar(await emissor.assinar(MASTER_ALFA), banco(MASTER_ATIVO));

  assert(resultado.ok);
  assertEquals(resultado.valor.chamador, {
    id: MASTER_ALFA,
    papel: 'master_admin',
    tenantId: TENANT_ALFA,
  });
});

Deno.test('o acesso e o tenant são lidos com o token do chamador, sob a RLS', async () => {
  const token = await emissor.assinar(MASTER_ALFA);
  const doBanco = banco(MASTER_ATIVO);

  await identificar(token, doBanco);

  assertEquals(
    doBanco.chamadas.map((c) => `${c.metodo} ${c.caminho}`).sort(),
    [
      `GET /rest/v1/profiles?select=tenant_id&id=eq.${MASTER_ALFA}`,
      'POST /rest/v1/rpc/obter_meu_acesso',
    ],
  );
  for (const chamada of doBanco.chamadas) {
    assertEquals(chamada.cabecalhos.get('authorization'), `Bearer ${token}`, chamada.caminho);
    assertEquals(chamada.cabecalhos.get('apikey'), CHAVE_PUBLISHABLE_DE_TESTE, chamada.caminho);
  }
});

Deno.test('o super_admin segue sem tenant: a empresa_ativa nula não o barra', async () => {
  const acesso = { ...MASTER_ATIVO, papel: 'super_admin', empresa_ativa: null };

  const resultado = await identificar(
    await emissor.assinar(SUPER_ADMIN),
    banco(acesso, [{ tenant_id: null }]),
  );

  assert(resultado.ok);
  assertEquals(resultado.valor.chamador, { id: SUPER_ADMIN, papel: 'super_admin', tenantId: null });
});

Deno.test('sem sessão válida: 401 sessao_invalida, sem tocar no banco', async () => {
  const outroEmissor = await criarEmissorDeTeste(URL_DO_PROJETO);
  const agora = Math.floor(Date.now() / 1000);
  const tokens: Record<string, string | undefined> = {
    'sem token': undefined,
    'token que não é JWT': 'abc.def.ghi',
    'assinado por outra chave': await outroEmissor.assinar(MASTER_ALFA),
    'de outro projeto': await emissor.assinar(MASTER_ALFA, {
      iss: 'https://outro.supabase.co/auth/v1',
    }),
    'vencido': await emissor.assinar(MASTER_ALFA, { iat: agora - 7200, exp: agora - 3600 }),
  };

  for (const [caso, token] of Object.entries(tokens)) {
    const doBanco = banco(MASTER_ATIVO);

    const resultado = await identificar(token, doBanco);

    assertEquals(
      await recusa(resultado),
      { status: 401, codigo: 'sessao_invalida', mensagem: 'Sua sessão expirou. Entre de novo.' },
      caso,
    );
    assertEquals(doBanco.chamadas.length, 0, caso);
  }
});

Deno.test('usuário inativo e empresa bloqueada: 403 com o motivo', async () => {
  const casos: [string, Acesso, string][] = [
    ['user inativo', { ...MASTER_ATIVO, papel: 'user', ativo: false }, 'usuario_inativo'],
    [
      'super_admin inativo',
      { ...MASTER_ATIVO, papel: 'super_admin', ativo: false, empresa_ativa: null },
      'usuario_inativo',
    ],
    [
      'master_admin de empresa bloqueada',
      { ...MASTER_ATIVO, empresa_ativa: false },
      'empresa_bloqueada',
    ],
    [
      'user de empresa bloqueada',
      { ...MASTER_ATIVO, papel: 'user', empresa_ativa: false },
      'empresa_bloqueada',
    ],
  ];

  for (const [caso, acesso, codigo] of casos) {
    const resultado = await identificar(await emissor.assinar(USER_ALFA), banco(acesso));

    const { status, codigo: recebido } = await recusa(resultado);
    assertEquals([status, recebido], [403, codigo], caso);
  }
});

Deno.test('JWT válido sem profile: 403 sem_cadastro', async () => {
  const casos: [string, Acesso, unknown[]][] = [
    ['acesso todo nulo', SEM_PROFILE, []],
    ['profile que não se lê', MASTER_ATIVO, []],
  ];

  for (const [caso, acesso, profiles] of casos) {
    const resultado = await identificar(
      await emissor.assinar(MASTER_ALFA),
      banco(acesso, profiles),
    );

    assertEquals(
      await recusa(resultado),
      {
        status: 403,
        codigo: 'sem_cadastro',
        mensagem: 'Seu usuário não tem cadastro no Maxis. Procure a equipe de tecnologia.',
      },
      caso,
    );
  }
});

Deno.test('campo nulo nunca libera: o padrão fecha', async () => {
  const casos: [string, Acesso, string][] = [
    ['ativo nulo', { ...MASTER_ATIVO, ativo: null }, 'usuario_inativo'],
    [
      'empresa_ativa nula fora do super_admin',
      { ...MASTER_ATIVO, empresa_ativa: null },
      'empresa_bloqueada',
    ],
    [
      'senha_provisoria nula',
      { ...MASTER_ATIVO, senha_provisoria: null },
      'troca_de_senha_pendente',
    ],
  ];

  for (const [caso, acesso, codigo] of casos) {
    const resultado = await identificar(await emissor.assinar(MASTER_ALFA), banco(acesso));

    const { status, codigo: recebido } = await recusa(resultado);
    assertEquals([status, recebido], [403, codigo], caso);
  }
});

Deno.test('com senha provisória: 403 até trocar, exceto na função que aceita (trocar-senha)', async () => {
  const provisoria = { ...MASTER_ATIVO, senha_provisoria: true };
  const token = await emissor.assinar(MASTER_ALFA);

  const recusado = await identificar(token, banco(provisoria));
  const aceito = await identificar(token, banco(provisoria), { aceitarSenhaProvisoria: true });

  assertEquals(await recusa(recusado), {
    status: 403,
    codigo: 'troca_de_senha_pendente',
    mensagem: 'Troque a sua senha provisória antes de continuar.',
  });
  assert(aceito.ok);
  assertEquals(aceito.valor.chamador.id, MASTER_ALFA);
});

Deno.test('falha do banco: 500 genérico, com o código no log e sem o detalhe', async () => {
  const falhas: Record<string, ReturnType<typeof fetchDeTeste>> = {
    'na RPC do acesso': fetchDeTeste((chamada) =>
      chamada.caminho.startsWith('/rest/v1/rpc/')
        ? Response.json({ code: 'XX000', message: 'detalhe interno do banco' }, { status: 500 })
        : Response.json([{ tenant_id: TENANT_ALFA }])
    ),
    'no profile': fetchDeTeste((chamada) =>
      chamada.caminho.startsWith('/rest/v1/rpc/')
        ? Response.json(MASTER_ATIVO)
        : Response.json({ code: 'XX000', message: 'detalhe interno do banco' }, { status: 500 })
    ),
  };

  for (const [caso, doBanco] of Object.entries(falhas)) {
    const { resultado, registros } = await capturandoConsoleError(async () =>
      identificar(await emissor.assinar(MASTER_ALFA), doBanco)
    );

    const { status, codigo } = await recusa(resultado);
    assertEquals([status, codigo], [500, 'erro_interno'], caso);
    assertEquals(registros.length, 1, caso);
    assertStringIncludes(registros[0] ?? '', 'XX000', caso);
    assertEquals((registros[0] ?? '').includes('detalhe interno'), false, caso);
  }
});

Deno.test('resposta do banco fora do formato esperado: 500 genérico', async () => {
  const casos: [string, unknown, unknown[]][] = [
    ['acesso numa lista', [MASTER_ATIVO], [{ tenant_id: TENANT_ALFA }]],
    ['papel desconhecido', { ...MASTER_ATIVO, papel: 'dono' }, [{ tenant_id: TENANT_ALFA }]],
    ['ativo como texto', { ...MASTER_ATIVO, ativo: 'true' }, [{ tenant_id: TENANT_ALFA }]],
    ['tenant que não é uuid', MASTER_ATIVO, [{ tenant_id: 'tenant-alfa' }]],
  ];

  for (const [caso, acesso, profiles] of casos) {
    const { resultado } = await capturandoConsoleError(async () =>
      identificar(await emissor.assinar(MASTER_ALFA), banco(acesso, profiles))
    );

    const { status, codigo } = await recusa(resultado);
    assertEquals([status, codigo], [500, 'erro_interno'], caso);
  }
});

Deno.test('o admin é da chave secreta default e nasce a cada requisição', async () => {
  const token = await emissor.assinar(MASTER_ALFA);
  const doBanco = banco(MASTER_ATIVO);

  const primeira = await identificar(token, doBanco);
  const segunda = await identificar(token, doBanco);
  assert(primeira.ok && segunda.ok);
  await primeira.valor.admin.from('eventos_auditoria').select();

  assertNotStrictEquals(primeira.valor.admin, segunda.valor.admin);
  const doAdmin = doBanco.chamadas.at(-1);
  assertEquals(doAdmin?.caminho, '/rest/v1/eventos_auditoria?select=*');
  assertEquals(doAdmin?.cabecalhos.get('apikey'), CHAVE_SECRETA_DE_TESTE);
});

/** Troca variáveis de ambiente só durante `executar`, e devolve as de antes. */
async function comAmbiente<T>(
  variaveis: Record<string, string | undefined>,
  executar: () => Promise<T>,
): Promise<T> {
  const antes = Object.fromEntries(
    Object.keys(variaveis).map((nome) => [nome, Deno.env.get(nome)]),
  );
  const aplicar = (valores: Record<string, string | undefined>): void => {
    for (const [nome, valor] of Object.entries(valores)) {
      if (valor === undefined) Deno.env.delete(nome);
      else Deno.env.set(nome, valor);
    }
  };
  aplicar(variaveis);
  try {
    return await executar();
  } finally {
    aplicar(antes);
  }
}

const AMBIENTE_DA_PLATAFORMA = {
  SUPABASE_URL: emissor.ambiente.url,
  SUPABASE_PUBLISHABLE_KEYS: JSON.stringify(emissor.ambiente.publishableKeys),
  SUPABASE_SECRET_KEYS: JSON.stringify(emissor.ambiente.secretKeys),
  SUPABASE_JWKS: JSON.stringify(emissor.ambiente.jwks),
};

Deno.test('em produção, lê URL, chaves e JWKS do ambiente da plataforma', async () => {
  const token = await emissor.assinar(MASTER_ALFA);
  const doBanco = banco(MASTER_ATIVO);

  const resultado = await comAmbiente(
    AMBIENTE_DA_PLATAFORMA,
    () => identificarChamador(requisicao(token), { fetch: doBanco.fetch }),
  );

  assert(resultado.ok);
  assertEquals(resultado.valor.chamador.tenantId, TENANT_ALFA);
});

Deno.test('sem o SUPABASE_URL no ambiente: 500 genérico, sem tocar no banco', async () => {
  const token = await emissor.assinar(MASTER_ALFA);
  const doBanco = banco(MASTER_ATIVO);

  const { resultado, registros } = await comAmbiente(
    { ...AMBIENTE_DA_PLATAFORMA, SUPABASE_URL: undefined },
    () =>
      capturandoConsoleError(() =>
        identificarChamador(requisicao(token), { fetch: doBanco.fetch })
      ),
  );

  const { status, codigo } = await recusa(resultado);
  assertEquals([status, codigo], [500, 'erro_interno']);
  assertStringIncludes(registros.join('\n'), 'SUPABASE_URL');
  assertEquals(doBanco.chamadas.length, 0);
});
