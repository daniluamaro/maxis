import { assertEquals, assertStringIncludes } from '@std/assert';
import { corsHeaders } from '@supabase/supabase-js/cors';
import { capturandoConsoleError } from './consoleDeTeste.ts';
import { comCors } from './cors.ts';
import { sucesso } from './resposta.ts';

const PRODUCAO = 'https://maxis.vemperformar.com.br';
const DESENVOLVIMENTO = 'http://localhost:5173';
const URL_DA_FUNCAO = 'https://exemplo.supabase.co/functions/v1/provisionar-usuario';

// O SUPABASE_URL que a plataforma injeta em cada projeto (os refs estão no config.toml)
const PROJETO_DEV = 'https://ddaqbcfrplzdywpgilbf.supabase.co';
const PROJETO_PRODUCAO = 'https://ktcryodtgxpmgatihaic.supabase.co';

/** Origens parecidas com as permitidas, que um site de terceiro poderia usar. */
const ORIGENS_NEGADAS = [
  'https://maxis.vemperformar.com.br.evil.example',
  'http://maxis.vemperformar.com.br',
  'https://evil.vemperformar.com.br',
  'https://vemperformar.com.br',
  'http://localhost:4173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'null',
];

/** Cabeçalhos que o supabase-js 2.119 envia, escritos à mão: o mínimo que o app precisa. */
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

    const resposta = await comCors(handler, PROJETO_DEV)(requisicao('POST', { Origin: origem }));

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

    const resposta = await comCors(handler, PROJETO_DEV)(requisicao('POST', { Origin: origem }));

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

    const resposta = await comCors(handler, PROJETO_DEV)(preflight(origem));

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

    const resposta = await comCors(handler, PROJETO_DEV)(preflight(origem));

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

    const resposta = await comCors(handler, PROJETO_DEV)(requisicao(metodo, cabecalhos));

    assertEquals(chamadas.length, 0, rotulo);
    assertEquals(resposta.status, 405, rotulo);
    assertEquals((await resposta.json()).error.codigo, 'metodo_nao_permitido', rotulo);
    assertEquals(resposta.headers.get('allow'), 'POST, OPTIONS', rotulo);
    assertEquals(resposta.headers.get('access-control-allow-origin'), cabecalhos.Origin ?? null);
  }
});

Deno.test('chamada sem Origin (servidor a servidor) chega ao handler sem cabeçalhos CORS', async () => {
  const { handler, chamadas } = handlerEspiao();

  const resposta = await comCors(handler, PROJETO_DEV)(requisicao('POST', {}));

  assertEquals(chamadas.length, 1);
  assertEquals(resposta.status, 200);
  assertEquals(resposta.headers.get('access-control-allow-origin'), null);
  await resposta.body?.cancel();
});

Deno.test('exceção no handler vira 500 genérico com CORS, para o navegador conseguir ler', async () => {
  const handler: Handler = () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.12:5432'));

  const { resultado: resposta } = await capturandoConsoleError(() =>
    comCors(handler, PROJETO_DEV)(requisicao('POST', { Origin: PRODUCAO }))
  );

  assertEquals(resposta.status, 500);
  const corpo = await resposta.json();
  assertEquals(corpo.error.codigo, 'erro_interno');
  assertEquals(JSON.stringify(corpo).includes('ECONNREFUSED'), false);
  assertEquals(resposta.headers.get('access-control-allow-origin'), PRODUCAO);
});

Deno.test('exceção vai para o log só com tipo e pilha, sem a mensagem', async () => {
  // O JSON.parse do V8 cita a entrada na mensagem: um corpo malformado levaria a senha ao log.
  const casos: { rotulo: string; falha: unknown; noLog: string[] }[] = [
    {
      rotulo: 'Error',
      falha: new SyntaxError(`Unexpected token 's', "senha=Kq7mR2xa" is not valid JSON`),
      noLog: ['SyntaxError', 'cors.test.ts'],
    },
    { rotulo: 'valor lançado', falha: 'senha=Kq7mR2xa', noLog: ['string'] },
  ];

  for (const { rotulo, falha, noLog } of casos) {
    const handler: Handler = () => Promise.reject(falha);

    const { registros } = await capturandoConsoleError(async () => {
      const resposta = await comCors(handler, PROJETO_DEV)(
        requisicao('POST', { Origin: PRODUCAO }),
      );
      await resposta.body?.cancel();
    });

    assertEquals(registros.length, 1, rotulo);
    const registro = registros[0] ?? '';
    for (const trecho of noLog) assertStringIncludes(registro, trecho, rotulo);
    assertEquals(registro.includes('Kq7mR2xa'), false, rotulo);
  }
});

Deno.test('o preflight libera exatamente os cabeçalhos que o supabase-js declara', async () => {
  const resposta = await comCors(handlerEspiao().handler, PROJETO_DEV)(preflight(PRODUCAO));

  assertEquals(
    resposta.headers.get('access-control-allow-headers'),
    corsHeaders['Access-Control-Allow-Headers'],
  );
});

Deno.test('no projeto de produção, o localhost é recusado e o domínio segue aceito', async () => {
  const { handler, chamadas } = handlerEspiao();
  const naProducao = comCors(handler, PROJETO_PRODUCAO);

  const doLocalhost = await naProducao(requisicao('POST', { Origin: DESENVOLVIMENTO }));
  const preflightDoLocalhost = await naProducao(preflight(DESENVOLVIMENTO));
  const doDominio = await naProducao(requisicao('POST', { Origin: PRODUCAO }));

  assertEquals(doLocalhost.status, 403);
  assertEquals(doLocalhost.headers.get('access-control-allow-origin'), null);
  assertEquals(preflightDoLocalhost.status, 403);
  assertEquals(doDominio.status, 200);
  assertEquals(doDominio.headers.get('access-control-allow-origin'), PRODUCAO);
  assertEquals(chamadas.length, 1);
  await Promise.all([doLocalhost, preflightDoLocalhost, doDominio].map((r) => r.body?.cancel()));
});

Deno.test('sem o SUPABASE_URL do dev, o localhost é recusado (o padrão fecha)', async () => {
  const urlsQueNaoSaoODev = [
    undefined,
    '',
    'não é uma URL',
    'http://ddaqbcfrplzdywpgilbf.supabase.co',
    'https://ddaqbcfrplzdywpgilbf.supabase.co.evil.example',
    'https://evil.example/ddaqbcfrplzdywpgilbf.supabase.co',
    'https://outro.supabase.co',
  ];

  for (const url of urlsQueNaoSaoODev) {
    const { handler, chamadas } = handlerEspiao();

    const resposta = await comCors(handler, url)(requisicao('POST', { Origin: DESENVOLVIMENTO }));

    assertEquals(resposta.status, 403, String(url));
    assertEquals(chamadas.length, 0, String(url));
    await resposta.body?.cancel();
  }
});

Deno.test('o SUPABASE_URL do dev com barra no fim ainda é o dev', async () => {
  const resposta = await comCors(handlerEspiao().handler, `${PROJETO_DEV}/`)(
    requisicao('POST', { Origin: DESENVOLVIMENTO }),
  );

  assertEquals(resposta.status, 200);
  await resposta.body?.cancel();
});
