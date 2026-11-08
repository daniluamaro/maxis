import { assertEquals, assertMatch } from '@std/assert';
import { erro, erroInterno, sucesso } from './resposta.ts';

const MENSAGEM_DO_ERRO_INTERNO =
  'Não foi possível concluir a operação. Tente de novo em instantes.';

Deno.test('sucesso responde 200 com { data } em JSON', async () => {
  const resposta = sucesso({ id: 7, nome: 'Transportadora Alfa' });

  assertEquals(resposta.status, 200);
  assertMatch(resposta.headers.get('content-type') ?? '', /^application\/json\b/);
  assertEquals(await resposta.json(), { data: { id: 7, nome: 'Transportadora Alfa' } });
});

Deno.test('sucesso responde 201 quando a operação cria um registro', () => {
  assertEquals(sucesso({ id: 7 }, 201).status, 201);
});

Deno.test('erro responde { error: { codigo, mensagem } } em JSON, com o status pedido', async () => {
  const resposta = erro(409, 'email_em_uso', 'Já existe um usuário com este e-mail.');

  assertEquals(resposta.status, 409);
  assertMatch(resposta.headers.get('content-type') ?? '', /^application\/json\b/);
  assertEquals(await resposta.json(), {
    error: { codigo: 'email_em_uso', mensagem: 'Já existe um usuário com este e-mail.' },
  });
});

Deno.test('erroInterno responde 500 com a mensagem genérica', async () => {
  const resposta = erroInterno();

  assertEquals(resposta.status, 500);
  assertEquals(await resposta.json(), {
    error: { codigo: 'erro_interno', mensagem: MENSAGEM_DO_ERRO_INTERNO },
  });
});

Deno.test('nenhuma resposta padrão fica em cache (a senha provisória volta uma única vez)', () => {
  const respostas: Record<string, Response> = {
    sucesso: sucesso({ senhaProvisoria: 'Kq7mR2xa' }, 201),
    erro: erro(403, 'sem_permissao', 'Você não tem permissão para esta ação.'),
    erroInterno: erroInterno(),
  };

  for (const [nome, resposta] of Object.entries(respostas)) {
    assertEquals(resposta.headers.get('cache-control'), 'no-store', nome);
  }
});

Deno.test('erro com 500 não repassa o detalhe: o 500 sai só pela mensagem genérica', async () => {
  // @ts-expect-error: o tipo de erro() não aceita 500; o teste prova a barreira em execução
  const resposta = erro(500, 'falha_no_banco', 'duplicate key value violates unique constraint');

  assertEquals(resposta.status, 500);
  assertEquals(await resposta.json(), {
    error: { codigo: 'erro_interno', mensagem: MENSAGEM_DO_ERRO_INTERNO },
  });
});
