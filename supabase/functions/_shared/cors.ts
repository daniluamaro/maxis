import { erro, erroInterno } from './resposta.ts';

type Handler = (req: Request) => Promise<Response>;

/** Origens do app (`supabase/CLAUDE.md §8`): o domínio de produção e o Vite de desenvolvimento. */
const ORIGENS_PERMITIDAS: readonly string[] = [
  'https://maxis.performargestao.com.br',
  'http://localhost:5173',
];

/**
 * Cabeçalhos que o supabase-js 2.119.0 envia (`@supabase/supabase-js/cors`). Conferir a cada
 * atualização dele: cabeçalho novo fora da lista derruba o preflight no navegador.
 */
const CABECALHOS_PERMITIDOS =
  'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage';

/** As funções do Maxis são comandos: só POST. */
const METODOS_PERMITIDOS = 'POST, OPTIONS';

/** Teto do Chrome para guardar o preflight (o Firefox aceita mais). */
const VALIDADE_DO_PREFLIGHT_EM_SEGUNDOS = '7200';

/**
 * Envolve o handler de uma Edge Function: recusa origem fora da lista (antes de qualquer
 * trabalho), responde o preflight e devolve toda resposta — inclusive o 500 de uma exceção —
 * com os cabeçalhos que o navegador precisa para lê-la.
 */
export function comCors(handler: Handler): Handler {
  return async (req) => {
    const origem = req.headers.get('Origin');

    if (origem !== null && !ORIGENS_PERMITIDAS.includes(origem)) {
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

    let resposta: Response;
    try {
      resposta = await handler(req);
    } catch (falha) {
      console.error('Exceção não tratada na Edge Function:', falha);
      resposta = erroInterno();
    }
    return comCabecalhosCors(resposta, origem);
  };
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
