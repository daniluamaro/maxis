/** Valor que sobrevive ao `JSON.stringify` (o mesmo formato do `Json` gerado pelo Supabase). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [chave: string]: Json | undefined }
  | Json[];

/**
 * Status dos erros previstos (`supabase/CLAUDE.md §8`, mais o 405 do método recusado pelo
 * `comCors`); o 500 só sai por `erroInterno`.
 */
const STATUS_DE_ERRO = [400, 401, 403, 404, 405, 409] as const;
type StatusDeErro = (typeof STATUS_DE_ERRO)[number];

const MENSAGEM_DO_ERRO_INTERNO =
  'Não foi possível concluir a operação. Tente de novo em instantes.';

export function sucesso(data: Json, status: 200 | 201 = 200): Response {
  return respostaJson({ data }, status);
}

/** Erro previsto — validação, sessão, permissão, ausência ou conflito —, com mensagem para a tela. */
export function erro(status: StatusDeErro, codigo: string, mensagem: string): Response {
  // O tipo já barra o 500; a checagem cobre o status que chegue por conversão de tipo.
  if (!STATUS_DE_ERRO.includes(status)) {
    console.error(`erro() recebeu o status ${status}, fora dos previstos: virou erro interno.`);
    return erroInterno();
  }
  return corpoDeErro(status, codigo, mensagem);
}

/** Falha inesperada: quem chamou nunca recebe o detalhe (stack, mensagem do Postgres). */
export function erroInterno(): Response {
  return corpoDeErro(500, 'erro_interno', MENSAGEM_DO_ERRO_INTERNO);
}

function corpoDeErro(status: number, codigo: string, mensagem: string): Response {
  return respostaJson({ error: { codigo, mensagem } }, status);
}

function respostaJson(corpo: Json, status: number): Response {
  // A resposta pode levar senha provisória ou dado de outro usuário: nenhum cache guarda.
  return Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } });
}
