/**
 * Política de senha do Maxis (decisão 2 da Fase 1), a mesma do Auth no `config.toml`
 * (`minimum_password_length = 8`, `password_requirements = "letters_digits"`): as Edge Functions
 * revalidam antes de chamar o Auth, para responder em pt-BR. O mínimo conta caracteres, e o Auth
 * conta bytes: com acento, a revalidação é um pouco mais estrita, nunca mais frouxa.
 */
const TAMANHO_MINIMO = 8;

// O bcrypt do Auth só guarda os primeiros 72 bytes: o resto seria ignorado sem aviso
const BYTES_MAXIMOS = 72;

/** Letras e números sem os que se confundem ao ditar ou ler (decisão 4): 0/O e 1/l/I. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TAMANHO_DA_SENHA_PROVISORIA = 12;

// Maior múltiplo do alfabeto que cabe num byte: acima dele o módulo daria vantagem aos primeiros
const LIMITE_DO_BYTE = Math.floor(256 / ALFABETO.length) * ALFABETO.length;

/** Fonte de bytes aleatórios; os testes passam uma fila conhecida. */
export type Sorteio = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;

/** O que falta para a senha atender à política, em pt-BR; vazio quando atende. */
export function problemasDaSenha(senha: string): string[] {
  const problemas: string[] = [];
  if ([...senha].length < TAMANHO_MINIMO) {
    problemas.push(`A senha precisa ter ao menos ${TAMANHO_MINIMO} caracteres.`);
  }
  // Como o Auth: letra é de a a z (maiúscula ou minúscula); acentuada não conta
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
    problemas.push('A senha precisa ter letras e números.');
  }
  if (new TextEncoder().encode(senha).length > BYTES_MAXIMOS) {
    problemas.push(
      `A senha é longa demais: use até ${BYTES_MAXIMOS} caracteres (letra acentuada conta como dois).`,
    );
  }
  return problemas;
}

/**
 * Senha provisória de 12 caracteres, de gerador criptográfico, com ao menos uma letra e um número
 * (decisão 4). Sem letra ou sem número, sorteia de novo a senha inteira: assim todas as senhas
 * válidas têm a mesma chance.
 */
export function gerarSenhaProvisoria(
  sortear: Sorteio = (bytes) => crypto.getRandomValues(bytes),
): string {
  for (;;) {
    let senha = '';
    for (let i = 0; i < TAMANHO_DA_SENHA_PROVISORIA; i++) senha += sortearCaractere(sortear);
    if (/[A-Za-z]/.test(senha) && /[0-9]/.test(senha)) return senha;
  }
}

function sortearCaractere(sortear: Sorteio): string {
  const byte = new Uint8Array(1);
  for (;;) {
    const [valor] = sortear(byte);
    if (valor === undefined) {
      throw new Error('A fonte de bytes aleatórios não devolveu nenhum byte.');
    }
    if (valor < LIMITE_DO_BYTE) return ALFABETO.charAt(valor % ALFABETO.length);
  }
}
