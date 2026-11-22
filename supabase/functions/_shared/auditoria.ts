import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json } from './resposta.ts';

/** As ações gravadas pelas Edge Functions da Fase 1 (`modelo-dados.md §5.3`); a lista cresce por fase. */
export type AcaoDeAuditoria = 'usuario.criado' | 'usuario.senha_alterada';

export interface EventoDeAuditoria {
  readonly acao: AcaoDeAuditoria;
  readonly tenantId: string | null;
  readonly atorProfileId: string | null;
  readonly alvoTabela: string;
  readonly alvoId: string;
  readonly detalhes?: { readonly [chave: string]: Json };
}

/** Falha ao gravar, ou dado sensível nos detalhes. A mensagem nunca leva o valor. */
export class ErroDeAuditoria extends Error {}

// Nome de campo de senha, token ou chave: em `detalhes`, só pode marcar (booleano) ou ser nulo
const NOME_SENSIVEL =
  /senha|password|passwd|token|secret|segredo|chave|key|jwt|authorization|credencia/i;

// Valor com cara de credencial, em qualquer campo: JWT, chave de API e token de acesso do Supabase
const VALOR_SENSIVEL = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /sb_(?:secret|publishable)_/,
  /sbp_[A-Za-z0-9]/,
  /\bBearer\s+\S/i,
];

/**
 * Grava um evento em `eventos_auditoria` com o cliente admin da requisição. É um insert simples:
 * a `service_role` só insere, e só as colunas do evento (STEP 1.4), então sem `.select()`, sem
 * `upsert` e sem `id` nem `created_at`, que vêm do banco. Senha, token ou chave nos detalhes é
 * recusado antes de qualquer gravação (`modelo-dados.md §5.3`).
 */
export async function registrarEvento(
  admin: SupabaseClient,
  evento: EventoDeAuditoria,
): Promise<void> {
  const sensivel = procurarSensivel(evento.detalhes ?? null, 'detalhes');
  if (sensivel) {
    throw new ErroDeAuditoria(
      `Dado sensível em ${sensivel}: o evento ${evento.acao} não foi gravado.`,
    );
  }

  const { error } = await admin.from('eventos_auditoria').insert({
    tenant_id: evento.tenantId,
    ator_profile_id: evento.atorProfileId,
    acao: evento.acao,
    alvo_tabela: evento.alvoTabela,
    alvo_id: evento.alvoId,
    detalhes: evento.detalhes ?? null,
  });
  if (error) {
    // Só o código: a mensagem do PostgREST pode trazer dado da linha
    throw new ErroDeAuditoria(`Falha ao gravar o evento ${evento.acao} (código ${error.code}).`);
  }
}

/** O caminho do primeiro dado sensível (`detalhes.novo.password`), ou nulo. */
function procurarSensivel(valor: Json | undefined, caminho: string): string | null {
  if (typeof valor === 'string') {
    return VALOR_SENSIVEL.some((padrao) => padrao.test(valor)) ? caminho : null;
  }
  if (Array.isArray(valor)) {
    for (const [indice, item] of valor.entries()) {
      const achado = procurarSensivel(item, `${caminho}[${indice}]`);
      if (achado) return achado;
    }
    return null;
  }
  if (valor !== null && typeof valor === 'object') {
    for (const [chave, item] of Object.entries(valor)) {
      const aqui = `${caminho}.${chave}`;
      const ehMarca = item === null || item === undefined || typeof item === 'boolean';
      if (NOME_SENSIVEL.test(chave) && !ehMarca) return aqui;
      const achado = procurarSensivel(item, aqui);
      if (achado) return achado;
    }
  }
  return null;
}
