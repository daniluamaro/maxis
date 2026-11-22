/**
 * Só para testes: um `fetch` que registra cada chamada do supabase-js e responde pelo roteador do
 * teste, no formato do PostgREST. A chamada sem rota vira 500, para o teste ver o desvio.
 */
export interface ChamadaVista {
  readonly metodo: string;
  /** Caminho e consulta, sem o host: `/rest/v1/profiles?select=tenant_id&id=eq.…`. */
  readonly caminho: string;
  readonly cabecalhos: Headers;
  readonly corpo: unknown;
}

export type Roteador = (chamada: ChamadaVista) => Response | undefined;

export function fetchDeTeste(
  roteador: Roteador,
): { fetch: typeof fetch; chamadas: ChamadaVista[] } {
  const chamadas: ChamadaVista[] = [];
  const falso: typeof fetch = async (entrada, init) => {
    const req = new Request(entrada, init);
    const url = new URL(req.url);
    const texto = await req.text();
    const chamada: ChamadaVista = {
      metodo: req.method,
      caminho: decodeURIComponent(`${url.pathname}${url.search}`),
      cabecalhos: req.headers,
      corpo: texto ? JSON.parse(texto) : undefined,
    };
    chamadas.push(chamada);
    return roteador(chamada) ??
      Response.json({ code: 'XX000', message: `sem rota no teste: ${chamada.caminho}` }, {
        status: 500,
      });
  };
  return { fetch: falso, chamadas };
}
