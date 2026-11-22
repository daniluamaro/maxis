/**
 * Hash bcrypt da senha dos usuários do seed do dev (Fase 1, STEP 1.7, decisão 12): o seed traz só
 * o hash, e o valor fica no `.env.local` da raiz (fora do git). Ferramenta local, fora do deploy
 * (a pasta começa por `_`). Nenhum caminho, nem o de erro, imprime o valor.
 *
 * Na pasta `supabase/functions`: `deno task hash-senha-seed`
 */
import bcrypt from 'bcryptjs';

const VARIAVEL = 'SENHA_SEED_DEV';

// O custo padrão do GoTrue (bcrypt.DefaultCost), o mesmo do hash que ele grava numa troca de senha
const CUSTO_DO_BCRYPT = 10;

// Aleatória e forte; letras e números para atender à política do Auth (decisão 2) e caber sem
// escape no `.env.local` e no secret do CI. O bcrypt ignora o que passa de 72 bytes.
const FORMATO = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{24,72}$/;

const NAO_ACHEI_O_ARQUIVO = 'Não achei o .env.local na raiz do repositório.';
const FALHA_INESPERADA = 'Falha inesperada ao gerar o hash; nenhum valor foi impresso.';

/** Erro com mensagem própria, que nunca contém o valor da senha. */
export class ErroDaSenhaDoSeed extends Error {}

export interface Saida {
  escrever(texto: string): void;
  escreverErro(texto: string): void;
}

/** A senha da linha `SENHA_SEED_DEV=<valor>` do conteúdo do `.env.local`. */
export function lerSenhaDoSeed(conteudoDoEnv: string): string {
  const prefixo = `${VARIAVEL}=`;
  const valores = conteudoDoEnv
    .split(/\r?\n/)
    .filter((linha) => linha.startsWith(prefixo))
    .map((linha) => linha.slice(prefixo.length));

  if (valores.length === 0) {
    throw new ErroDaSenhaDoSeed(`${VARIAVEL} não está no .env.local.`);
  }
  if (valores.length > 1) {
    throw new ErroDaSenhaDoSeed(`${VARIAVEL} aparece mais de uma vez no .env.local.`);
  }
  const [senha = ''] = valores;
  if (!FORMATO.test(senha)) {
    throw new ErroDaSenhaDoSeed(
      `${VARIAVEL} fora do formato: de 24 a 72 letras e números, com ao menos uma letra e um número.`,
    );
  }
  return senha;
}

export function gerarHashDaSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_DO_BCRYPT);
}

/** Lê o `.env.local`, escreve só o hash e devolve o código de saída do processo. */
export async function executar(lerEnv: () => Promise<string>, saida: Saida): Promise<number> {
  try {
    saida.escrever(await gerarHashDaSenha(lerSenhaDoSeed(await lerEnv())));
    return 0;
  } catch (erro) {
    if (erro instanceof ErroDaSenhaDoSeed) {
      saida.escreverErro(erro.message);
    } else if (erro instanceof Deno.errors.NotFound) {
      saida.escreverErro(NAO_ACHEI_O_ARQUIVO);
    } else {
      // A mensagem de uma falha qualquer pode carregar o conteúdo do arquivo: não sai
      saida.escreverErro(FALHA_INESPERADA);
    }
    return 1;
  }
}

if (import.meta.main) {
  const codigo = await executar(
    () => Deno.readTextFile(new URL('../../../.env.local', import.meta.url)),
    { escrever: (texto) => console.log(texto), escreverErro: (texto) => console.error(texto) },
  );
  Deno.exit(codigo);
}
