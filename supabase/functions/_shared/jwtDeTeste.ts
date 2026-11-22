/**
 * Só para testes: um emissor de JWT como o Auth do Supabase (ES256, com `kid`), e o ambiente que
 * o `@supabase/server` leria da plataforma, com o JWKS dele. Assim os testes passam pela
 * verificação real do SDK, sem rede.
 */
export interface EmissorDeTeste {
  readonly ambiente: {
    url: string;
    publishableKeys: Record<string, string>;
    secretKeys: Record<string, string>;
    jwks: { keys: JsonWebKey[] };
  };
  /** JWT de sessão de usuário; `carga` acrescenta ou troca claims (ex.: `exp`, `iss`). */
  assinar(sub: string, carga?: Record<string, unknown>): Promise<string>;
}

export const CHAVE_PUBLISHABLE_DE_TESTE = 'sb_publishable_teste';
export const CHAVE_SECRETA_DE_TESTE = 'sb_secret_teste';

export async function criarEmissorDeTeste(url: string): Promise<EmissorDeTeste> {
  const kid = crypto.randomUUID();
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const publica = await crypto.subtle.exportKey('jwk', par.publicKey);

  return {
    ambiente: {
      url,
      publishableKeys: { default: CHAVE_PUBLISHABLE_DE_TESTE },
      secretKeys: { default: CHAVE_SECRETA_DE_TESTE },
      jwks: { keys: [{ ...publica, alg: 'ES256', use: 'sig', kid } as JsonWebKey] },
    },
    assinar: async (sub, carga = {}) => {
      const agora = Math.floor(Date.now() / 1000);
      const cabecalho = base64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }));
      const corpo = base64url(JSON.stringify({
        sub,
        role: 'authenticated',
        aud: 'authenticated',
        iss: `${url}/auth/v1`,
        iat: agora,
        exp: agora + 3600,
        session_id: crypto.randomUUID(),
        ...carga,
      }));
      const assinatura = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        par.privateKey,
        new TextEncoder().encode(`${cabecalho}.${corpo}`),
      );
      return `${cabecalho}.${corpo}.${base64url(new Uint8Array(assinatura))}`;
    },
  };
}

function base64url(dado: string | Uint8Array): string {
  const bytes = typeof dado === 'string' ? new TextEncoder().encode(dado) : dado;
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(
    /=+$/,
    '',
  );
}
