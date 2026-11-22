import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ErroDeAuditoria, type EventoDeAuditoria, registrarEvento } from './auditoria.ts';
import { type ChamadaVista, fetchDeTeste } from './fetchDeTeste.ts';
import { CHAVE_SECRETA_DE_TESTE } from './jwtDeTeste.ts';
import type { Json } from './resposta.ts';

const URL_DO_PROJETO = 'https://ddaqbcfrplzdywpgilbf.supabase.co';
const MASTER_ALFA = '5eed0000-0000-4000-8000-00000000a001';
const TENANT_ALFA = '5eed0000-0000-4000-8000-00000000a000';
const NOVO_USUARIO = '0b6f3a52-7d1e-4c8a-9f2b-5e4d3c2b1a09';

const EVENTO: EventoDeAuditoria = {
  acao: 'usuario.criado',
  tenantId: TENANT_ALFA,
  atorProfileId: MASTER_ALFA,
  alvoTabela: 'profiles',
  alvoId: NOVO_USUARIO,
  detalhes: { papel: 'user', email: 'novo@exemplo.test', senha_provisoria: true },
};

/** O cliente admin como a Edge Function o recebe do SDK, com o banco do teste por trás. */
function adminComBanco(
  resposta: () => Response = () => new Response(null, { status: 201 }),
): { admin: SupabaseClient; chamadas: ChamadaVista[] } {
  const banco = fetchDeTeste((chamada) =>
    chamada.caminho.startsWith('/rest/v1/eventos_auditoria') ? resposta() : undefined
  );
  const admin = createClient(URL_DO_PROJETO, CHAVE_SECRETA_DE_TESTE, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: banco.fetch },
  });
  return { admin, chamadas: banco.chamadas };
}

Deno.test('grava o evento num insert simples, só com as colunas do evento', async () => {
  const { admin, chamadas } = adminComBanco();

  await registrarEvento(admin, EVENTO);

  assertEquals(chamadas.length, 1);
  const [chamada] = chamadas;
  assertEquals(chamada?.metodo, 'POST');
  // Sem `?select` nem `?columns`: a service_role não tem select na tabela (STEP 1.4)
  assertEquals(chamada?.caminho, '/rest/v1/eventos_auditoria');
  // Sem `return=representation` (pediria a linha de volta) nem `resolution` (seria upsert)
  assertEquals(chamada?.cabecalhos.get('prefer'), null);
  // Sem `id` nem `created_at`: os dois vêm sempre do banco
  assertEquals(chamada?.corpo, {
    tenant_id: TENANT_ALFA,
    ator_profile_id: MASTER_ALFA,
    acao: 'usuario.criado',
    alvo_tabela: 'profiles',
    alvo_id: NOVO_USUARIO,
    detalhes: { papel: 'user', email: 'novo@exemplo.test', senha_provisoria: true },
  });
});

Deno.test('o evento sem detalhes vai com detalhes nulo', async () => {
  const { admin, chamadas } = adminComBanco();
  const { detalhes: _, ...semDetalhes } = EVENTO;

  await registrarEvento(admin, semDetalhes);

  assertEquals((chamadas[0]?.corpo as Record<string, unknown>).detalhes, null);
});

Deno.test('falha ao gravar vira ErroDeAuditoria com o código, sem a mensagem do banco', async () => {
  const { admin } = adminComBanco(() =>
    Response.json(
      { code: '42501', message: 'permission denied: novo@exemplo.test', details: null, hint: null },
      { status: 403 },
    )
  );

  const falha = await assertRejects(() => registrarEvento(admin, EVENTO), ErroDeAuditoria);

  assertStringIncludes(falha.message, '42501');
  assertEquals(falha.message.includes('novo@exemplo.test'), false);
});

Deno.test('senha, token ou chave em detalhes: recusa antes de gravar, sem repetir o valor', async () => {
  const valor = 'Kq7mR2xa';
  const jwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlLWZhbHNh';
  const proibidos: Record<string, { [chave: string]: Json }> = {
    'chave senha': { senha: valor },
    'senha provisória em texto': { senha_provisoria: valor },
    'password aninhado': { novo: { password: valor } },
    'token dentro de lista': { tentativas: [{ access_token: valor }] },
    'refresh token': { refreshToken: valor },
    'chave de API': { apiKey: valor },
    'segredo': { segredo: valor },
    'chave em pt-BR': { chave: valor },
    'secret': { client_secret: valor },
    'cabeçalho de autorização': { Authorization: `Bearer ${valor}` },
    'JWT em campo comum': { observacao: jwt },
    'chave secreta em campo comum': { observacao: `sb_secret_${valor}` },
    'chave publishable em campo comum': { observacao: `sb_publishable_${valor}` },
    'token de acesso do Supabase em lista': { lista: ['ok', `sbp_${valor}abc`] },
  };

  for (const [caso, detalhes] of Object.entries(proibidos)) {
    const { admin, chamadas } = adminComBanco();

    const falha = await assertRejects(
      () => registrarEvento(admin, { ...EVENTO, detalhes }),
      ErroDeAuditoria,
      undefined,
      caso,
    );

    assertEquals(chamadas.length, 0, caso);
    assertEquals(falha.message.includes(valor), false, caso);
  }
});

Deno.test('marca booleana com nome sensível e dados comuns passam', async () => {
  const { admin, chamadas } = adminComBanco();
  const detalhes = {
    senha_provisoria: true,
    token_revogado: false,
    chave_publica: null,
    papel: 'admin',
    nome: 'Ana Ribeiro',
    tentativas: [1, 2],
  };

  await registrarEvento(admin, { ...EVENTO, detalhes });

  assertEquals((chamadas[0]?.corpo as Record<string, unknown>).detalhes, detalhes);
});
