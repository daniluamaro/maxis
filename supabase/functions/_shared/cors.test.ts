import { assertEquals, assertStringIncludes } from '@std/assert';
import { comCors } from './cors.ts';
import { sucesso } from './resposta.ts';

const PRODUCAO = 'https://maxis.performargestao.com.br';
const DESENVOLVIMENTO = 'http://localhost:5173';
const URL_DA_FUNCAO = 'https://exemplo.supabase.co/functions/v1/provisionar-usuario';

/** Origens parecidas com as permitidas, que um site de terceiro poderia usar. */
const ORIGENS_NEGADAS = [
  'https://maxis.performargestao.com.br.evil.example',
  'http://maxis.performargestao.com.br',
  'https://evil.performargestao.com.br',
  'https://performargestao.com.br',
  'http://localhost:4173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'null',
];

/** Cabeçalhos que o supabase-js 2.119.0 envia (`@supabase/supabase-js/cors`), copiados à mão. */
const CABECALHOS_DO_SUPABASE_JS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-retry-count',
  'traceparent',
  'tracestate',
  'baggage',
];

type Handler = (req: Request) => Promise<Response>;

function handlerEspiao(): { handler: Handler; chamadas: Request[] } {
  const chamadas: Request[] = [];
  const handler: Handler = (req) => {
    chamadas.push(req);
    return Promise.resolve(sucesso({ ok: true }));
  };
  return { handler, chamadas };
}

function requisicao(metodo: string, cabecalhos: Record<string, string>): Request {
  return new Request(URL_DA_FUNCAO, { method: metodo, headers: cabecalhos });
}

function preflight(origem: string): Request {
  return requisicao('OPTIONS', {
    Origin: origem,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type',
  });
}

function listaDoCabecalho(resposta: Response, nome: string): string[] {
  return (resposta.headers.get(nome) ?? '').split(',').map((item) => item.trim().toLowerCase());
}

Deno.test('origem permitida recebe a resposta do handler com o Allow-Origin dela', async () => {
  for (const origem of [PRODUCAO, DESENVOLVIMENTO]) {
    const { handler, chamadas } = handlerEspiao();

    const resposta = await comCors(handler)(requisicao('POST', { Origin: origem }));

    assertEquals(chamadas.length, 1, origem);
    assertEquals(resposta.status, 200, origem);
    assertEquals(await resposta.json(), { data: { ok: true } }, origem);
    assertEquals(resposta.headers.get('access-control-allow-origin'), origem);
    assertEquals(listaDoCabecalho(resposta, 'vary').includes('origin'), true, origem);
  }
});

Deno.test('origem negada recebe 403 sem Allow-Origin, e o handler não roda', async () => {
  for (const origem of ORIGENS_NEGADAS) {
    const { handler, chamadas } = handlerEspiao();

    const resposta = await comCors(handler)(requisicao('POST', { Origin: origem }));

    assertEquals(chamadas.length, 0, origem);
    assertEquals(resposta.status, 403, origem);
    assertEquals((await resposta.json()).error.codigo, 'origem_nao_permitida', origem);
    assertEquals(resposta.headers.get('access-control-allow-origin'), null, origem);
    assertEquals(listaDoCabecalho(resposta, 'vary').includes('origin'), true, origem);
  }
});

Deno.test('preflight de origem permitida responde 204 com o que o supabase-js envia', async () => {
  for (const origem of [PRODUCAO, DESENVOLVIMENTO]) {
    const { handler, chamadas } = handlerEspiao();

    const resposta = await comCors(handler)(preflight(origem));

    assertEquals(chamadas.length, 0, origem);
    assertEquals(resposta.status, 204, origem);
    assertEquals(await resposta.text(), '', origem);
    assertEquals(resposta.headers.get('access-control-allow-origin'), origem);
    assertEquals(listaDoCabecalho(resposta, 'access-control-allow-methods').includes('post'), true);
    const cabecalhosPermitidos = listaDoCabecalho(resposta, 'access-control-allow-headers');
    for (const cabecalho of CABECALHOS_DO_SUPABASE_JS) {
      assertEquals(cabecalhosPermitidos.includes(cabecalho), true, cabecalho);
    }
    assertEquals(resposta.headers.get('access-control-max-age'), '7200', origem);
    assertEquals(listaDoCabecalho(resposta, 'vary').includes('origin'), true, origem);
  }
});

Deno.test('preflight de origem negada responde 403 sem cabeçalhos CORS', async () => {
  for (const origem of ORIGENS_NEGADAS) {
    const { handler, chamadas } = handlerEspiao();

    const resposta = await comCors(handler)(preflight(origem));

    assertEquals(chamadas.length, 0, origem);
    assertEquals(resposta.status, 403, origem);
    assertEquals(resposta.headers.get('access-control-allow-origin'), null, origem);
    assertEquals(resposta.headers.get('access-control-allow-headers'), null, origem);
    await resposta.body?.cancel();
  }
});

Deno.test('método fora de POST recebe 405 com Allow, e o handler não roda', async () => {
  const casos: [string, Record<string, string>][] = [
    ['GET', { Origin: PRODUCAO }],
    ['PUT', { Origin: PRODUCAO }],
    ['PATCH', { Origin: DESENVOLVIMENTO }],
    ['DELETE', { Origin: DESENVOLVIMENTO }],
    ['GET', {}],
  ];

  for (const [metodo, cabecalhos] of casos) {
    const { handler, chamadas } = handlerEspiao();
    const rotulo = `${metodo} ${cabecalhos.Origin ?? 'sem Origin'}`;

    const resposta = await comCors(handler)(requisicao(metodo, cabecalhos));

    assertEquals(chamadas.length, 0, rotulo);
    assertEquals(resposta.status, 405, rotulo);
    assertEquals((await resposta.json()).error.codigo, 'metodo_nao_permitido', rotulo);
    assertEquals(resposta.headers.get('allow'), 'POST, OPTIONS', rotulo);
    assertEquals(resposta.headers.get('access-control-allow-origin'), cabecalhos.Origin ?? null);
  }
});

Deno.test('chamada sem Origin (servidor a servidor) chega ao handler sem cabeçalhos CORS', async () => {
  const { handler, chamadas } = handlerEspiao();

  const resposta = await comCors(handler)(requisicao('POST', {}));

  assertEquals(chamadas.length, 1);
  assertEquals(resposta.status, 200);
  assertEquals(resposta.headers.get('access-control-allow-origin'), null);
  await resposta.body?.cancel();
});

Deno.test('exceção no handler vira 500 genérico com CORS, para o navegador conseguir ler', async () => {
  const falha = new Error('connect ECONNREFUSED 10.0.0.12:5432');
  const handler: Handler = () => Promise.reject(falha);
  const registrados: unknown[][] = [];
  const consoleErrorOriginal = console.error;
  console.error = (...argumentos: unknown[]): void => {
    registrados.push(argumentos);
  };

  try {
    const resposta = await comCors(handler)(requisicao('POST', { Origin: PRODUCAO }));

    assertEquals(resposta.status, 500);
    const corpo = await resposta.json();
    assertEquals(corpo.error.codigo, 'erro_interno');
    assertEquals(JSON.stringify(corpo).includes('ECONNREFUSED'), false);
    assertEquals(resposta.headers.get('access-control-allow-origin'), PRODUCAO);
    assertEquals(registrados.length, 1);
    assertStringIncludes(String(registrados[0]?.at(-1)), 'ECONNREFUSED');
  } finally {
    console.error = consoleErrorOriginal;
  }
});
