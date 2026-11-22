import { assert, assertEquals, assertMatch, assertThrows } from '@std/assert';
import { gerarSenhaProvisoria, problemasDaSenha, type Sorteio } from './senha.ts';

const CURTA = 'A senha precisa ter ao menos 8 caracteres.';
const SEM_LETRAS_E_NUMEROS = 'A senha precisa ter letras e números.';
const LONGA = 'A senha é longa demais: use até 72 caracteres (letra acentuada conta como dois).';

// O alfabeto da senha provisória (decisão 4 da Fase 1), escrito à mão: letras e números sem os
// que se confundem ao ditar ou ler no WhatsApp (0/O, 1/l/I)
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

Deno.test('a senha com 8 ou mais caracteres, letras e números atende à política', () => {
  for (const senha of ['abcdef12', 'Senha123', 'ção12345', 'a1'.repeat(36)]) {
    assertEquals(problemasDaSenha(senha), [], senha);
  }
});

Deno.test('a senha fora da política diz o que falta, em pt-BR', () => {
  const casos: [string, string[]][] = [
    ['abc1234', [CURTA]],
    ['', [CURTA, SEM_LETRAS_E_NUMEROS]],
    ['abcdefgh', [SEM_LETRAS_E_NUMEROS]],
    ['12345678', [SEM_LETRAS_E_NUMEROS]],
    // Letra acentuada não conta como letra: o Auth exige a-z ou A-Z
    ['çççç1234', [SEM_LETRAS_E_NUMEROS]],
    ['!@#$%^&*', [SEM_LETRAS_E_NUMEROS]],
    ['a1'.repeat(36) + 'b', [LONGA]],
  ];

  for (const [senha, esperado] of casos) {
    assertEquals(problemasDaSenha(senha), esperado, JSON.stringify(senha));
  }
});

Deno.test('o limite de 72 é em bytes, o que o bcrypt guarda: acento conta dois', () => {
  // 70 caracteres e 72 bytes passa; 71 caracteres e 74 bytes, não
  assertEquals(problemasDaSenha('a1' + 'é'.repeat(34) + 'xx'), []);
  assertEquals(problemasDaSenha('a1' + 'é'.repeat(35) + 'xx'), [LONGA]);
});

Deno.test('a senha provisória tem 12 caracteres do alfabeto sem ambíguos e atende à política', () => {
  const vistas = new Set<string>();

  for (let i = 0; i < 2000; i++) {
    const senha = gerarSenhaProvisoria();

    assertMatch(senha, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{12}$/);
    assertMatch(senha, /[0-9]/);
    assertMatch(senha, /[A-Za-z]/);
    assertEquals(problemasDaSenha(senha), [], senha);
    vistas.add(senha);
  }
  // Sorteio de verdade: nenhuma repetida em 2000
  assertEquals(vistas.size, 2000);
});

Deno.test('todo caractere do alfabeto aparece, e nenhum outro', () => {
  const caracteres = new Set<string>();
  for (let i = 0; i < 2000; i++) for (const c of gerarSenhaProvisoria()) caracteres.add(c);

  assertEquals([...caracteres].sort().join(''), [...ALFABETO].sort().join(''));
});

/** Sorteio de teste: devolve os bytes da fila, na ordem, e registra quantos foram pedidos. */
function sorteioDaFila(fila: number[]): { sortear: Sorteio; usados: () => number } {
  let posicao = 0;
  return {
    sortear: (bytes) => {
      for (let i = 0; i < bytes.length; i++) {
        const valor = fila[posicao++];
        assert(valor !== undefined, 'a fila de bytes do teste acabou');
        bytes[i] = valor;
      }
      return bytes;
    },
    usados: () => posicao,
  };
}

Deno.test('cada byte vira o caractere da sua posição no alfabeto (módulo o tamanho)', () => {
  // 57 letras e números: o byte 0 é "A", o 56 é "9", e o 57 volta a ser "A"
  const { sortear } = sorteioDaFila([0, 56, 57, 113, 23, 24, 48, 49, 2, 10, 30, 40]);

  assertEquals(gerarSenhaProvisoria(sortear), 'A9A9Zaz2CLgr');
});

Deno.test('byte do fim da faixa é descartado, para nenhum caractere sair mais que outro', () => {
  // 228 = 4 × 57: os bytes de 228 a 255 dariam vantagem aos 28 primeiros caracteres
  const { sortear, usados } = sorteioDaFila([
    228,
    255,
    0,
    56,
    57,
    113,
    23,
    24,
    48,
    49,
    2,
    10,
    30,
    40,
  ]);

  assertEquals(gerarSenhaProvisoria(sortear), 'A9A9Zaz2CLgr');
  assertEquals(usados(), 14);
});

Deno.test('sem número ou sem letra, sorteia de novo a senha inteira', () => {
  const soLetras = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const soNumeros = [49, 50, 51, 52, 53, 54, 55, 56, 49, 50, 51, 52];
  const valida = [0, 56, 57, 113, 23, 24, 48, 49, 2, 10, 30, 40];
  const { sortear } = sorteioDaFila([...soLetras, ...soNumeros, ...valida]);

  assertEquals(gerarSenhaProvisoria(sortear), 'A9A9Zaz2CLgr');
});

Deno.test('fonte de bytes que não devolve nada é erro, não laço sem fim', () => {
  let chamadas = 0;
  const vazia: Sorteio = () => {
    // Guarda do teste: sem ela, o laço sem fim travaria a execução em vez de falhar
    if (++chamadas > 1000) throw new Error('laço sem fim');
    return new Uint8Array(0);
  };

  assertThrows(
    () => gerarSenhaProvisoria(vazia),
    Error,
    'A fonte de bytes aleatórios não devolveu nenhum byte.',
  );
});
