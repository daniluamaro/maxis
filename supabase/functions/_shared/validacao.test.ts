import { assert, assertEquals } from '@std/assert';
import { z } from 'zod';
import { lerEntrada } from './validacao.ts';

const URL_DA_FUNCAO = 'https://exemplo.supabase.co/functions/v1/provisionar-usuario';

// Um schema como o das funções: mensagens próprias onde a tela pede, o padrão no resto
const esquema = z.strictObject({
  email: z.email({ error: 'Informe um e-mail válido.' }).transform((email) => email.toLowerCase()),
  nome: z.string().trim().min(1),
  apelido: z.string().min(3).max(10).optional(),
  papel: z.enum(['admin', 'user']),
  telefone: z.string().regex(/^[1-9][0-9]{7,14}$/).optional(),
  endereco: z.strictObject({ cep: z.string().length(8) }).optional(),
  codigo: z.string().min(3).regex(/^[A-Z]+$/).optional(),
});

function requisicao(corpo: string | null): Request {
  return new Request(URL_DA_FUNCAO, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: corpo,
  });
}

async function respostaDe(corpo: string | null): Promise<{ status: number; json: unknown }> {
  const resultado = await lerEntrada(requisicao(corpo), esquema);
  if (resultado.ok) throw new Error('era para recusar a entrada');
  return { status: resultado.resposta.status, json: await resultado.resposta.json() };
}

function camposRecusados(campos: Record<string, string>): unknown {
  return {
    error: { codigo: 'entrada_invalida', mensagem: 'Revise os campos destacados.', campos },
  };
}

Deno.test('entrada válida segue com os dados já transformados pelo schema', async () => {
  const resultado = await lerEntrada(
    requisicao(
      JSON.stringify({ email: 'Ana@Exemplo.Test', nome: '  Ana Ribeiro ', papel: 'user' }),
    ),
    esquema,
  );

  assertEquals(resultado, {
    ok: true,
    valor: { email: 'ana@exemplo.test', nome: 'Ana Ribeiro', papel: 'user' },
  });
});

Deno.test('corpo que não é um objeto JSON recebe 400 corpo_invalido', async () => {
  const esperado = {
    status: 400,
    json: {
      error: { codigo: 'corpo_invalido', mensagem: 'Envie os dados como um objeto JSON.' },
    },
  };

  for (const corpo of [null, '', '{"email": ', 'senha=Kq7mR2xa', '"texto"', 'null', '[]', '42']) {
    assertEquals(await respostaDe(corpo), esperado, JSON.stringify(corpo));
  }
});

Deno.test('cada campo recusado recebe a mensagem padrão em pt-BR do problema', async () => {
  const { status, json } = await respostaDe(JSON.stringify({
    nome: 7,
    apelido: 'ab',
    papel: 'super_admin',
    telefone: '+55 71',
    endereco: { cep: '4' },
  }));

  assertEquals(status, 400);
  assertEquals(
    json,
    camposRecusados({
      email: 'Informe um e-mail válido.',
      nome: 'Valor em formato inválido.',
      apelido: 'Use ao menos 3 caracteres.',
      papel: 'Opção inválida.',
      telefone: 'Formato inválido.',
      'endereco.cep': 'Use exatamente 8 caracteres.',
    }),
  );
});

Deno.test('campo ausente ou vazio é obrigatório; texto longo demais diz o limite', async () => {
  const { json } = await respostaDe(
    JSON.stringify({ email: 'ana@exemplo.test', nome: '   ', apelido: 'a'.repeat(11) }),
  );

  assertEquals(
    json,
    camposRecusados({
      nome: 'Campo obrigatório.',
      apelido: 'Use no máximo 10 caracteres.',
      papel: 'Campo obrigatório.',
    }),
  );
});

Deno.test('campo fora do schema é recusado, um a um, inclusive dentro de objeto', async () => {
  const { json } = await respostaDe(JSON.stringify({
    email: 'ana@exemplo.test',
    nome: 'Ana',
    papel: 'user',
    tenant_id: '5eed0000-0000-4000-8000-00000000b000',
    senha: 'Kq7mR2xa',
    endereco: { cep: '40000000', numero: '1' },
  }));

  assertEquals(
    json,
    camposRecusados({
      tenant_id: 'Campo não permitido.',
      senha: 'Campo não permitido.',
      'endereco.numero': 'Campo não permitido.',
    }),
  );
});

Deno.test('a resposta nunca repete o valor recebido', async () => {
  const valor = 'Kq7mR2xa-valor-sensivel';
  const { json } = await respostaDe(
    JSON.stringify({ email: valor, nome: valor, papel: valor, apelido: valor, extra: valor }),
  );

  assertEquals(JSON.stringify(json).includes(valor), false);
});

Deno.test('campo com mais de um problema mostra o primeiro', async () => {
  const { json } = await respostaDe(
    JSON.stringify({ email: 'ana@exemplo.test', nome: 'Ana', papel: 'user', codigo: 'a' }),
  );

  assertEquals(json, camposRecusados({ codigo: 'Use ao menos 3 caracteres.' }));
});

const esquemaDaTroca = z
  .strictObject({ senha: z.string(), confirmacao: z.string() })
  .refine((dados) => dados.senha === dados.confirmacao, { error: 'As senhas não conferem.' });

Deno.test('regra entre campos sem caminho vira a mensagem geral do 400', async () => {
  const resultado = await lerEntrada(
    requisicao(JSON.stringify({ senha: 'a1b2c3d4', confirmacao: 'a1b2c3d5' })),
    esquemaDaTroca,
  );

  assert(!resultado.ok);
  assertEquals(resultado.resposta.status, 400);
  assertEquals(await resultado.resposta.json(), {
    error: { codigo: 'entrada_invalida', mensagem: 'As senhas não conferem.', campos: {} },
  });
});

Deno.test('regra entre campos com caminho vai para o campo', async () => {
  const esquema = z
    .strictObject({ senha: z.string(), confirmacao: z.string() })
    .refine((dados) => dados.senha === dados.confirmacao, {
      error: 'Repita a mesma senha.',
      path: ['confirmacao'],
    });

  const resultado = await lerEntrada(
    requisicao(JSON.stringify({ senha: 'a1b2c3d4', confirmacao: 'x' })),
    esquema,
  );

  assert(!resultado.ok);
  assertEquals(
    await resultado.resposta.json(),
    camposRecusados({ confirmacao: 'Repita a mesma senha.' }),
  );
});
