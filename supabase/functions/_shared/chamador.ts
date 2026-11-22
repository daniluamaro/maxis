import { createSupabaseContext, fromSupabaseUrl } from '@supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { erro, erroInterno, type Resultado } from './resposta.ts';

export type Papel = 'super_admin' | 'master_admin' | 'admin' | 'user';

/** Quem chama a função, já conferido: ativo, de empresa ativa e (por padrão) com a senha trocada. */
export interface Chamador {
  readonly id: string;
  readonly papel: Papel;
  /** Nulo só para o `super_admin`. */
  readonly tenantId: string | null;
}

export interface ContextoDoChamador {
  readonly chamador: Chamador;
  /** Cliente sob a RLS, com o token do chamador: toda leitura que ele resolve vai por aqui. */
  readonly cliente: SupabaseClient;
  /**
   * Cliente admin (chave secreta `default`), criado para esta requisição e nunca guardado: só para
   * a operação privilegiada, e sempre filtrando pelo tenant do chamador.
   */
  readonly admin: SupabaseClient;
}

/** O que a plataforma injeta (`supabase/CLAUDE.md §9`); os testes passam o deles. */
export interface AmbienteDoSupabase {
  url: string;
  publishableKeys: Record<string, string>;
  secretKeys: Record<string, string>;
  jwks: { keys: JsonWebKey[] };
}

export interface OpcoesDoChamador {
  /** Só a `trocar-senha`: é por ela que o usuário sai da senha provisória. */
  readonly aceitarSenhaProvisoria?: boolean;
  /** Testes: o ambiente e o `fetch` do SDK. Em produção, vêm da plataforma. */
  readonly ambiente?: AmbienteDoSupabase;
  readonly fetch?: typeof fetch;
}

// O retorno do `obter_meu_acesso()` (STEP 1.5): todo campo é anulável (o JWT sem profile devolve
// tudo nulo), e campo nulo nunca libera
const esquemaDoAcesso = z.object({
  papel: z.enum(['super_admin', 'master_admin', 'admin', 'user']).nullable(),
  ativo: z.boolean().nullable(),
  empresa_ativa: z.boolean().nullable(),
  senha_provisoria: z.boolean().nullable(),
});
// `guid`: só o formato. O `uuid` do zod exige versão e variante da RFC, e o Postgres aceita qualquer
const esquemaDosProfiles = z.array(z.object({ tenant_id: z.guid().nullable() }));

/**
 * Identifica quem chama pelo JWT (`createSupabaseContext`, com o emissor preso a este projeto) e
 * confere, dentro da função, que ele pode agir (`supabase/CLAUDE.md §8`, passos 2 e 3). O acesso
 * vem do `obter_meu_acesso()`, a mesma regra dos gates do app, que corta na hora o usuário
 * inativo e a empresa bloqueada.
 */
export async function identificarChamador(
  req: Request,
  opcoes: OpcoesDoChamador = {},
): Promise<Resultado<ContextoDoChamador>> {
  const urlDoProjeto = opcoes.ambiente?.url ?? Deno.env.get('SUPABASE_URL');
  if (!urlDoProjeto) {
    console.error('SUPABASE_URL ausente: a função não sabe em que projeto roda.');
    return { ok: false, resposta: erroInterno() };
  }

  const { data: contexto, error: falhaDaSessao } = await createSupabaseContext(req, {
    auth: 'user',
    issuer: fromSupabaseUrl(urlDoProjeto),
    env: opcoes.ambiente,
    supabaseOptions: opcoes.fetch ? { global: { fetch: opcoes.fetch } } : undefined,
  });
  if (falhaDaSessao) {
    if (falhaDaSessao.status === 401) {
      return {
        ok: false,
        resposta: erro(401, 'sessao_invalida', 'Sua sessão expirou. Entre de novo.'),
      };
    }
    // Configuração do projeto (JWKS, chaves): o código do SDK basta para o diagnóstico
    console.error('Falha ao montar o contexto do Supabase:', falhaDaSessao.code);
    return { ok: false, resposta: erroInterno() };
  }
  const id = contexto.userClaims?.id;
  if (!id) {
    console.error('Contexto de usuário sem o id do chamador.');
    return { ok: false, resposta: erroInterno() };
  }

  const [respostaDoAcesso, respostaDoProfile] = await Promise.all([
    contexto.supabase.rpc('obter_meu_acesso'),
    contexto.supabase.from('profiles').select('tenant_id').eq('id', id),
  ]);
  const falhaDoBanco = respostaDoAcesso.error ?? respostaDoProfile.error;
  if (falhaDoBanco) {
    // Só o código: a mensagem do PostgREST pode trazer dado da linha
    console.error('Falha ao ler o acesso do chamador:', falhaDoBanco.code);
    return { ok: false, resposta: erroInterno() };
  }
  const acesso = esquemaDoAcesso.safeParse(respostaDoAcesso.data);
  const profiles = esquemaDosProfiles.safeParse(respostaDoProfile.data);
  if (!acesso.success || !profiles.success) {
    console.error('O acesso do chamador veio fora do formato esperado.');
    return { ok: false, resposta: erroInterno() };
  }

  const { papel, ativo, empresa_ativa, senha_provisoria } = acesso.data;
  const [profile] = profiles.data;
  if (papel === null || profile === undefined) {
    return recusar(
      'sem_cadastro',
      'Seu usuário não tem cadastro no Maxis. Procure a equipe de tecnologia.',
    );
  }
  if (ativo !== true) {
    return recusar(
      'usuario_inativo',
      'Seu acesso está suspenso. Procure o administrador da sua empresa.',
    );
  }
  if (papel !== 'super_admin' && empresa_ativa !== true) {
    return recusar('empresa_bloqueada', 'O acesso da sua empresa está suspenso.');
  }
  if (!opcoes.aceitarSenhaProvisoria && senha_provisoria !== false) {
    return recusar('troca_de_senha_pendente', 'Troque a sua senha provisória antes de continuar.');
  }

  return {
    ok: true,
    valor: {
      chamador: { id, papel, tenantId: profile.tenant_id },
      cliente: contexto.supabase,
      admin: contexto.supabaseAdmin,
    },
  };
}

function recusar(codigo: string, mensagem: string): Resultado<never> {
  return { ok: false, resposta: erro(403, codigo, mensagem) };
}
