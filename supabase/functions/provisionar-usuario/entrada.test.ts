import { assert, assertEquals } from '@std/assert';
import type { Json } from '../_shared/resposta.ts';
import { lerEntrada } from '../_shared/validacao.ts';
import { type EntradaDoProvisionamento, esquemaDaEntrada } from './entrada.ts';

const TENANT_BETA = '5eed0000-0000-4000-8000-00000000b000';

function ler(corpo: Json): ReturnType<typeof lerEntrada<EntradaDoProvisionamento>> {
  return lerEntrada(
    new Request('https://exemplo.test', { method: 'POST', body: JSON.stringify(corpo) }),
    esquemaDaEntrada,
  );
}

async function camposRecusados(corpo: Json): Promise<Record<string, string>> {
  const resultado = await ler(corpo);
  assert(!resultado.ok, 'era para recusar a entrada');
  assertEquals(resultado.resposta.status, 400);
  const { error } = await resultado.resposta.json();
  assertEquals(error.codigo, 'entrada_invalida');
  return error.campos;
}

const VALIDA = { papel: 'user', nome: 'Ana Souza', email: 'ana.souza@exemplo.test' } as const;

Deno.test('a entrada mínima: papel, nome e e-mail', async () => {
  assertEquals(await ler(VALIDA), { ok: true, valor: VALIDA });
});

Deno.test('o nome perde os espaços das pontas, e o e-mail também, em minúsculas', async () => {
  const resultado = await ler({
    ...VALIDA,
    nome: '  Ana Souza ',
    email: ' Ana.Souza@Exemplo.TEST ',
  });

  assert(resultado.ok);
  assertEquals(resultado.valor.nome, 'Ana Souza');
  assertEquals(resultado.valor.email, 'ana.souza@exemplo.test');
});

Deno.test('o telefone chega com ou sem máscara e fica só com os dígitos', async () => {
  for (const telefone of ['+55 (11) 98765-4321', '55 11 98765.4321', '5511987654321']) {
    const resultado = await ler({ ...VALIDA, telefone });

    assert(resultado.ok, telefone);
    assertEquals(resultado.valor.telefone, '5511987654321', telefone);
  }
});

Deno.test('o telefone fora do formato do banco é recusado', async () => {
  // O banco exige o código do país e de 8 a 15 dígitos, sem zero no começo
  for (const telefone of ['0511987654321', '1234567', '5511987654321999', 'onze', '']) {
    assertEquals(
      await camposRecusados({ ...VALIDA, telefone }),
      { telefone: 'Use o telefone com o código do país, só com números (ex.: 5511987654321).' },
      telefone,
    );
  }
});

Deno.test('telefone e empresa nulos valem como não informados', async () => {
  const resultado = await ler({ ...VALIDA, telefone: null, tenant_id: null });

  assert(resultado.ok);
  assertEquals(resultado.valor.telefone, undefined);
  assertEquals(resultado.valor.tenant_id, undefined);
});

Deno.test('a empresa, quando informada, é um uuid', async () => {
  const resultado = await ler({ ...VALIDA, papel: 'master_admin', tenant_id: TENANT_BETA });
  assert(resultado.ok);
  assertEquals(resultado.valor.tenant_id, TENANT_BETA);

  assertEquals(await camposRecusados({ ...VALIDA, tenant_id: 'alfa' }), {
    tenant_id: 'Empresa inválida.',
  });
});

Deno.test('o papel é master_admin, admin ou user: o super_admin não se cria', async () => {
  for (const papel of ['super_admin', 'dono', '']) {
    assertEquals(await camposRecusados({ ...VALIDA, papel }), { papel: 'Opção inválida.' }, papel);
  }
});

Deno.test('o nome vai até 120 caracteres; vazio ou mais longo é recusado', async () => {
  assert((await ler({ ...VALIDA, nome: 'a'.repeat(120) })).ok);
  assertEquals(await camposRecusados({ ...VALIDA, nome: '   ' }), { nome: 'Campo obrigatório.' });
  assertEquals(await camposRecusados({ ...VALIDA, nome: 'a'.repeat(121) }), {
    nome: 'Use no máximo 120 caracteres.',
  });
});

Deno.test('e-mail fora do formato ou com mais de 254 caracteres é recusado', async () => {
  for (const email of ['ana', 'ana@', '@exemplo.test', 'ana souza@exemplo.test']) {
    assertEquals(
      await camposRecusados({ ...VALIDA, email }),
      { email: 'Informe um e-mail válido.' },
      email,
    );
  }
  // Formato válido (rótulos de até 63 caracteres), com 254 e com 255 caracteres
  const deTamanho = (total: number): string =>
    `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(total - 198)}.test`;
  assertEquals(deTamanho(254).length, 254);
  assert((await ler({ ...VALIDA, email: deTamanho(254) })).ok);
  assertEquals(await camposRecusados({ ...VALIDA, email: deTamanho(255) }), {
    email: 'Use no máximo 254 caracteres.',
  });
});

Deno.test('faltando papel, nome ou e-mail, cada um é apontado', async () => {
  assertEquals(await camposRecusados({}), {
    papel: 'Campo obrigatório.',
    nome: 'Campo obrigatório.',
    email: 'Campo obrigatório.',
  });
});

Deno.test('campo fora do contrato é recusado: nem senha, nem ativo, nem papel de outro jeito', async () => {
  assertEquals(
    await camposRecusados({
      ...VALIDA,
      senha: 'Escolhida1',
      ativo: false,
      senha_provisoria: false,
    }),
    {
      senha: 'Campo não permitido.',
      ativo: 'Campo não permitido.',
      senha_provisoria: 'Campo não permitido.',
    },
  );
});
