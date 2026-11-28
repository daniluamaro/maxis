/**
 * Só para os testes de integração (decisão 11 da Fase 1): chamam as funções publicadas no projeto
 * de dev, com os usuários do seed como chamadores, e montam as fixtures da execução pelo
 * `supabase db query` (o login do CLI aqui; o `SUPABASE_ACCESS_TOKEN` do `development` no CI).
 * Nunca rodam na produção: o ambiente que não for o do dev é recusado antes de qualquer chamada.
 * Rodam pelo `deno task integracao`, fora do `deno test` dos portões.
 */
export const REF_DEV = 'ddaqbcfrplzdywpgilbf';
const URL_DO_DEV = `https://${REF_DEV}.supabase.co`;

export interface AmbienteDeIntegracao {
  readonly url: string;
  readonly chavePublishable: string;
  /** A senha dos usuários do seed (`SENHA_SEED_DEV`): nunca vai para log, SQL ou mensagem. */
  readonly senhaDoSeed: string;
}

/** As variáveis do dev; sem elas, falha (nunca pula em silêncio). */
export function lerAmbiente(): AmbienteDeIntegracao {
  const nomes = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SENHA_SEED_DEV'] as const;
  const faltando = nomes.filter((nome) => !Deno.env.get(nome));
  if (faltando.length > 0) {
    throw new Error(`Faltam variáveis para a integração: ${faltando.join(', ')}.`);
  }
  const url = Deno.env.get('VITE_SUPABASE_URL') ?? '';
  const chavePublishable = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? '';
  if (url !== URL_DO_DEV) {
    throw new Error('A integração só roda contra o projeto de dev.');
  }
  if (!chavePublishable.startsWith('sb_publishable_')) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY não é uma chave publishable.');
  }
  return { url, chavePublishable, senhaDoSeed: Deno.env.get('SENHA_SEED_DEV') ?? '' };
}

/** O corpo das funções do Maxis (`supabase/CLAUDE.md §8`) ou o da plataforma (`code`, `message`). */
export interface CorpoDaResposta {
  readonly data?: Record<string, unknown>;
  readonly error?: {
    readonly codigo: string;
    readonly mensagem: string;
    readonly campos?: Record<string, string>;
  };
  readonly code?: string | number;
  readonly error_code?: string;
}

export interface Resposta {
  readonly status: number;
  readonly corpo: CorpoDaResposta | null;
  readonly cabecalhos: Headers;
}

async function lerResposta(resposta: Response): Promise<Resposta> {
  const texto = await resposta.text();
  return {
    status: resposta.status,
    corpo: texto ? JSON.parse(texto) as CorpoDaResposta : null,
    cabecalhos: resposta.headers,
  };
}

/** Login por e-mail e senha no Auth do dev; devolve o token de acesso. */
export async function entrar(
  ambiente: AmbienteDeIntegracao,
  email: string,
  senha: string = ambiente.senhaDoSeed,
): Promise<string> {
  const resposta = await fetch(`${ambiente.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ambiente.chavePublishable, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const corpo = await resposta.json();
  if (!resposta.ok || typeof corpo.access_token !== 'string') {
    // Nunca a senha: só quem tentou e o código do Auth
    throw new Error(`Login de ${email} recusado: ${resposta.status} ${corpo.error_code ?? ''}`);
  }
  return corpo.access_token;
}

/** O que o navegador mandaria (supabase-js `functions.invoke`), com cada parte opcional. */
export interface Chamada {
  readonly token?: string;
  readonly corpo?: unknown;
  readonly origem?: string;
  readonly metodo?: string;
  readonly semApikey?: boolean;
  readonly cabecalhos?: Record<string, string>;
}

export async function chamar(
  ambiente: AmbienteDeIntegracao,
  funcao: string,
  chamada: Chamada = {},
): Promise<Resposta> {
  const cabecalhos = new Headers(chamada.cabecalhos);
  if (!chamada.semApikey) cabecalhos.set('apikey', ambiente.chavePublishable);
  if (chamada.token) cabecalhos.set('authorization', `Bearer ${chamada.token}`);
  if (chamada.origem) cabecalhos.set('origin', chamada.origem);
  if (chamada.corpo !== undefined) cabecalhos.set('content-type', 'application/json');
  const resposta = await fetch(`${ambiente.url}/functions/v1/${funcao}`, {
    method: chamada.metodo ?? 'POST',
    headers: cabecalhos,
    body: chamada.corpo === undefined ? undefined : JSON.stringify(chamada.corpo),
  });
  return lerResposta(resposta);
}

/** O cadastro público pelo Auth, como um visitante tentaria com a chave publishable. */
export async function cadastrarPelaApi(
  ambiente: AmbienteDeIntegracao,
  email: string,
  senha: string,
): Promise<Resposta> {
  const resposta = await fetch(`${ambiente.url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ambiente.chavePublishable, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  return lerResposta(resposta);
}

/** Valor seguro para um literal SQL: só o que a própria suíte gerou (uuid, e-mail de teste). */
export function literal(valor: string): string {
  if (!/^[A-Za-z0-9@._ -]+$/.test(valor)) {
    throw new Error('Valor fora do esperado para um literal da integração.');
  }
  return `'${valor}'`;
}

/**
 * SQL no dev, como dono do banco, pelo `supabase db query` (o mesmo caminho do seed). Só para as
 * fixtures e as conferências da execução: nenhuma senha passa por aqui.
 */
export async function sql<T>(consulta: string): Promise<T[]> {
  const { code, stdout, stderr } = await new Deno.Command('npx', {
    args: [
      '--no',
      'supabase',
      'db',
      'query',
      `--remote=${REF_DEV}`,
      '--output-format',
      'json',
      // O formato da saída muda quando o CLI detecta um agente: fixo, igual no CI e aqui
      '--agent',
      'no',
      '--yes',
      consulta,
    ],
    stdout: 'piped',
    stderr: 'piped',
  }).output();
  const texto = new TextDecoder().decode(stdout).trim();
  const saida: unknown = texto.startsWith('[') || texto.startsWith('{') ? JSON.parse(texto) : null;
  if (code !== 0 || !Array.isArray(saida)) {
    // Com `--output-format json`, o erro do banco vem na saída (`error.message`); sem JSON, o fim
    // do stderr do CLI
    const erro = (saida as { error?: { message?: string } } | null)?.error?.message;
    const motivo = erro ?? new TextDecoder().decode(stderr).trim().slice(-300);
    throw new Error(`O db query falhou (saída ${code}): ${motivo}`);
  }
  return saida as T[];
}
