import type { z } from 'zod';
import { erro, erroDeValidacao, type Resultado } from './resposta.ts';

/**
 * Lê o corpo JSON da requisição e o valida com o schema da função. Recusada, a entrada volta como
 * 400 com a mensagem de cada campo, em pt-BR; nenhuma mensagem repete o valor recebido.
 */
export async function lerEntrada<T>(req: Request, esquema: z.ZodType<T>): Promise<Resultado<T>> {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return { ok: false, resposta: corpoInvalido() };
  }

  // A mensagem definida no schema vence; o mapa só dá o padrão de cada tipo de problema
  const validado = esquema.safeParse(corpo, { error: mensagemPadrao });
  if (validado.success) return { ok: true, valor: validado.data };

  const campos: Record<string, string> = {};
  for (const problema of validado.error.issues) {
    if (problema.code === 'unrecognized_keys') {
      for (const chave of problema.keys) {
        campos[[...problema.path, chave].join('.')] ??= problema.message;
      }
    } else if (problema.path.length === 0) {
      // O problema é o corpo inteiro (texto, número, lista, null), não um campo
      return { ok: false, resposta: corpoInvalido() };
    } else {
      campos[problema.path.join('.')] ??= problema.message;
    }
  }
  return { ok: false, resposta: erroDeValidacao(campos) };
}

function corpoInvalido(): Response {
  return erro(400, 'corpo_invalido', 'Envie os dados como um objeto JSON.');
}

function mensagemPadrao(problema: z.core.$ZodRawIssue): string {
  if (problema.input === undefined) return 'Campo obrigatório.';
  switch (problema.code) {
    case 'too_small':
      if (problema.origin !== 'string') return 'Valor fora do permitido.';
      if (problema.exact) return `Use exatamente ${problema.minimum} caracteres.`;
      return Number(problema.minimum) <= 1
        ? 'Campo obrigatório.'
        : `Use ao menos ${problema.minimum} caracteres.`;
    case 'too_big':
      if (problema.origin !== 'string') return 'Valor fora do permitido.';
      if (problema.exact) return `Use exatamente ${problema.maximum} caracteres.`;
      return `Use no máximo ${problema.maximum} caracteres.`;
    case 'invalid_value':
      return 'Opção inválida.';
    case 'invalid_format':
      return 'Formato inválido.';
    case 'unrecognized_keys':
      return 'Campo não permitido.';
    default:
      return 'Valor em formato inválido.';
  }
}
