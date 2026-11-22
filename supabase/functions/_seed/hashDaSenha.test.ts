import { assert, assertEquals, assertMatch, assertNotEquals, assertThrows } from '@std/assert';
import bcrypt from 'bcryptjs';
import {
  ErroDaSenhaDoSeed,
  executar,
  gerarHashDaSenha,
  lerSenhaDoSeed,
  type Saida,
} from './hashDaSenha.ts';

// Valores fictícios, só deste arquivo: nenhum é a senha do seed
const SENHA = 'Qx7mK2pR9vTb4LwN8zHc3dFs6YjA1gEu';
const OUTRA_SENHA = 'Zw3nB8kD5tGy2QsV7hMx4cLp9RfJ6aTe';
const BCRYPT_CUSTO_10 = /^\$2[ab]\$10\$[./A-Za-z0-9]{53}$/;

function saidaCapturada(): Saida & { saidas: string[]; erros: string[] } {
  const saidas: string[] = [];
  const erros: string[] = [];
  return {
    saidas,
    erros,
    escrever: (texto) => saidas.push(texto),
    escreverErro: (texto) => erros.push(texto),
  };
}

Deno.test('lê a senha entre outras variáveis, linhas vazias e comentários', () => {
  const env = [
    '# Segredos locais do Maxis',
    'VITE_SUPABASE_URL=https://exemplo.supabase.co',
    `SENHA_SEED_DEV_ANTIGA=${OUTRA_SENHA}`,
    '',
    `SENHA_SEED_DEV=${SENHA}`,
    'OUTRA=1',
  ].join('\n');

  assertEquals(lerSenhaDoSeed(env), SENHA);
});

Deno.test('lê o arquivo salvo com a quebra de linha do Windows', () => {
  const env = ['# Segredos locais', `SENHA_SEED_DEV=${SENHA}`, 'OUTRA=1', ''].join('\r\n');

  assertEquals(lerSenhaDoSeed(env), SENHA);
});

Deno.test('recusa o arquivo sem a variável (a comentada e a de nome parecido não contam)', () => {
  const env = [`# SENHA_SEED_DEV=${SENHA}`, `SENHA_SEED_DEV_ANTIGA=${SENHA}`].join('\n');

  const erro = assertThrows(() => lerSenhaDoSeed(env), ErroDaSenhaDoSeed);
  assertEquals(erro.message, 'SENHA_SEED_DEV não está no .env.local.');
});

Deno.test('recusa a variável repetida, mesmo com o mesmo valor', () => {
  const env = [`SENHA_SEED_DEV=${SENHA}`, `SENHA_SEED_DEV=${SENHA}`].join('\n');

  const erro = assertThrows(() => lerSenhaDoSeed(env), ErroDaSenhaDoSeed);
  assertEquals(erro.message, 'SENHA_SEED_DEV aparece mais de uma vez no .env.local.');
});

Deno.test('aceita de 24 a 72 letras e números, com ao menos uma letra e um número', () => {
  const com24 = SENHA.slice(0, 24);
  const com72 = SENHA + OUTRA_SENHA + SENHA.slice(0, 8);

  assertEquals(lerSenhaDoSeed(`SENHA_SEED_DEV=${com24}`), com24);
  assertEquals(lerSenhaDoSeed(`SENHA_SEED_DEV=${com72}`), com72);
});

Deno.test('recusa o valor fora do formato sem repeti-lo na mensagem', () => {
  const invalidos: Record<string, string> = {
    'com 23 caracteres': SENHA.slice(0, 23),
    'com 73 caracteres': SENHA + OUTRA_SENHA + SENHA.slice(0, 9),
    'só letras': 'QxmKpRvTbLwNzHcdFsYjAgEuQxmK',
    'só números': '7294018365729401836572940',
    'com símbolo': SENHA.slice(0, 31) + '!',
    'com espaço no fim': SENHA + ' ',
    'entre aspas': `"${SENHA}"`,
    'com acento': SENHA.slice(0, 31) + 'é',
  };

  for (const [caso, valor] of Object.entries(invalidos)) {
    const erro = assertThrows(
      () => lerSenhaDoSeed(`SENHA_SEED_DEV=${valor}`),
      ErroDaSenhaDoSeed,
      undefined,
      caso,
    );
    assertEquals(
      erro.message,
      'SENHA_SEED_DEV fora do formato: de 24 a 72 letras e números, com ao menos uma letra e um número.',
      caso,
    );
  }
});

Deno.test('recusa o valor vazio', () => {
  const erro = assertThrows(() => lerSenhaDoSeed('SENHA_SEED_DEV='), ErroDaSenhaDoSeed);
  assertMatch(erro.message, /^SENHA_SEED_DEV fora do formato/);
});

Deno.test('o hash é um bcrypt de custo 10 (o do GoTrue), com sal aleatório, que confere com a senha', async () => {
  const hash = await gerarHashDaSenha(SENHA);

  assertMatch(hash, BCRYPT_CUSTO_10);
  assertEquals(await bcrypt.compare(SENHA, hash), true);
  assertEquals(await bcrypt.compare(OUTRA_SENHA, hash), false);
  assertNotEquals(await gerarHashDaSenha(SENHA), hash);
});

Deno.test('executar imprime só o hash da senha do .env.local e sai com 0', async () => {
  const saida = saidaCapturada();

  const codigo = await executar(() => Promise.resolve(`OUTRA=1\nSENHA_SEED_DEV=${SENHA}\n`), saida);

  assertEquals(codigo, 0);
  assertEquals(saida.erros, []);
  assertEquals(saida.saidas.length, 1);
  const [hash = ''] = saida.saidas;
  assertMatch(hash, BCRYPT_CUSTO_10);
  assertEquals(await bcrypt.compare(SENHA, hash), true);
});

Deno.test('executar sem o .env.local avisa no erro e sai com 1', async () => {
  const saida = saidaCapturada();

  const codigo = await executar(
    () => Promise.reject(new Deno.errors.NotFound('No such file or directory (os error 2)')),
    saida,
  );

  assertEquals(codigo, 1);
  assertEquals(saida.saidas, []);
  assertEquals(saida.erros, ['Não achei o .env.local na raiz do repositório.']);
});

Deno.test('executar com o valor fora do formato avisa sem repetir o valor e sai com 1', async () => {
  const saida = saidaCapturada();
  const curta = 'Qx7mK2pR9v';

  const codigo = await executar(() => Promise.resolve(`SENHA_SEED_DEV=${curta}\n`), saida);

  assertEquals(codigo, 1);
  assertEquals(saida.saidas, []);
  assertEquals(saida.erros.length, 1);
  assertMatch(saida.erros[0] ?? '', /^SENHA_SEED_DEV fora do formato/);
  assert(!(saida.erros[0] ?? '').includes(curta));
});

Deno.test('executar numa falha inesperada não repassa a mensagem dela (pode conter o valor)', async () => {
  const saida = saidaCapturada();

  const codigo = await executar(
    () => Promise.reject(new Error(`falha ao ler a linha SENHA_SEED_DEV=${SENHA}`)),
    saida,
  );

  assertEquals(codigo, 1);
  assertEquals(saida.saidas, []);
  assertEquals(saida.erros, ['Falha inesperada ao gerar o hash; nenhum valor foi impresso.']);
});
