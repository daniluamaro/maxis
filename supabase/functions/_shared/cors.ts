import { corsHeaders } from '@supabase/supabase-js/cors';
import { erro, erroInterno } from './resposta.ts';

type Handler = (req: Request) => Promise<Response>;

/** Origens do app (`supabase/CLAUDE.md §8`): o domínio de produção e o Vite de desenvolvimento. */
const DOMINIO_DE_PRODUCAO = 'https://maxis.vemperformar.com.br';
const LOCALHOST_DO_VITE = 'http://localhost:5173';

/**
 * O projeto de dev (`[remotes.dev]` do `config.toml`), o único que aceita o localhost, como o
 * redirect do Auth. Decidido pelo `SUPABASE_URL` que a plataforma injeta: sem ele, ou com outro
 * projeto, só o domínio de produção.
 */
const PROJETO_DEV = 'https://ddaqbcfrplzdywpgilbf.supabase.co';

/**
 * Os cabeçalhos que o supabase-js envia, da própria biblioteca, na versão fixada no deno.json. Quem
 * envia é o supabase-js do navegador: o frontend usa a mesma versão. Cabeçalho fora da lista
 * derruba o preflight.
 */
const CABECALHOS_PERMITIDOS = lerCabecalhosDoSupabaseJs();

function lerCabecalhosDoSupabaseJs(): string {
  const cabecalhos = corsHeaders['Access-Control-Allow-Headers'];
  // Sem a lista, todo preflight cairia: melhor quebrar ao carregar, nos testes da atualização
  if (!cabecalhos) throw new Error('O supabase-js não declarou os cabeçalhos de CORS.');
  return cabecalhos;
}

/** As funções do Maxis são comandos: só POST. */
const METODOS_PERMITIDOS = 'POST, OPTIONS';

/** Teto do Chrome para guardar o preflight (o Firefox aceita mais). */
const VALIDADE_DO_PREFLIGHT_EM_SEGUNDOS = '7200';

/**
 * Envolve o handler de uma Edge Function: recusa origem fora da lista (antes de qualquer
 * trabalho), responde o preflight e devolve toda resposta — inclusive o 500 de uma exceção —
 * com os cabeçalhos que o navegador precisa para lê-la.
 */
export function comCors(
  handler: Handler,
  urlDoProjeto: string | undefined = Deno.env.get('SUPABASE_URL'),
): Handler {
  const origensPermitidas = ehOProjetoDev(urlDoProjeto)
    ? [DOMINIO_DE_PRODUCAO, LOCALHOST_DO_VITE]
    : [DOMINIO_DE_PRODUCAO];

  return async (req) => {
    const origem = req.headers.get('Origin');

    if (origem !== null && !origensPermitidas.includes(origem)) {
      return comVaryOrigin(
        erro(403, 'origem_nao_permitida', 'Esta origem não tem permissão para chamar o Maxis.'),
      );
    }

    if (req.method === 'OPTIONS') {
      const resposta = new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Methods': METODOS_PERMITIDOS,
          'Access-Control-Allow-Headers': CABECALHOS_PERMITIDOS,
          'Access-Control-Max-Age': VALIDADE_DO_PREFLIGHT_EM_SEGUNDOS,
        },
      });
      return comCabecalhosCors(resposta, origem);
    }

    if (req.method !== 'POST') {
      const resposta = erro(405, 'metodo_nao_permitido', 'Esta operação só aceita POST.');
      resposta.headers.set('Allow', METODOS_PERMITIDOS);
      return comCabecalhosCors(resposta, origem);
    }

    let resposta: Response;
    try {
      resposta = await handler(req);
    } catch (falha) {
      console.error('Exceção não tratada na Edge Function:', tipoEPilha(falha));
      resposta = erroInterno();
    }
    return comCabecalhosCors(resposta, origem);
  };
}

function ehOProjetoDev(urlDoProjeto: string | undefined): boolean {
  if (!urlDoProjeto || !URL.canParse(urlDoProjeto)) return false;
  // A origem da URL ignora caminho e barra final, e compara esquema e host inteiros
  return new URL(urlDoProjeto).origin === PROJETO_DEV;
}

/**
 * O log leva o tipo e a pilha, nunca a mensagem: ela pode trazer dado pessoal ou segredo (o
 * `JSON.parse` do V8, por exemplo, cita o trecho da entrada que recusou).
 */
function tipoEPilha(falha: unknown): string {
  if (!(falha instanceof Error)) return `valor lançado do tipo ${typeof falha}`;
  const quadros = (falha.stack ?? '').split('\n').filter((linha) => /^\s+at /.test(linha));
  return [falha.name, ...quadros].join('\n');
}

function comCabecalhosCors(resposta: Response, origem: string | null): Response {
  const copia = comVaryOrigin(resposta);
  if (origem !== null) copia.headers.set('Access-Control-Allow-Origin', origem);
  return copia;
}

/** A resposta muda com a origem: cache intermediário não pode servi-la para outra. */
function comVaryOrigin(resposta: Response): Response {
  // Cópia: a resposta de um fetch tem cabeçalhos imutáveis.
  const copia = new Response(resposta.body, resposta);
  copia.headers.append('Vary', 'Origin');
  return copia;
}
