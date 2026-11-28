import { z } from 'zod';

// O formato de `profiles.telefone` (modelo-dados.md §5.2): só dígitos, com o código do país, de 8 a
// 15 dígitos, sem zero no começo
const FORMATO_DO_TELEFONE = /^[1-9][0-9]{7,14}$/;

// A máscara que a pessoa digita (espaço, parênteses, hífen, ponto e o `+` do código do país)
const MASCARA_DO_TELEFONE = /[\s().+-]/g;

/** Nulo vale como não informado: o formulário manda `null` no campo opcional vazio. */
function opcional<T extends z.ZodType>(esquema: T): z.ZodPreprocess<z.ZodOptional<T>> {
  return z.preprocess((valor) => (valor === null ? undefined : valor), esquema.optional());
}

/**
 * A entrada da `provisionar-usuario` (plano da Fase 1, STEP 1.9). Fechada: campo fora do contrato
 * (`senha`, `ativo`, `senha_provisoria`…) é recusado, e a senha nasce só no servidor. A empresa só o
 * `super_admin` informa; quem pode o quê é a cascata.
 */
export const esquemaDaEntrada = z.strictObject({
  papel: z.enum(['master_admin', 'admin', 'user']),
  nome: z.string().trim().min(1).max(120),
  // O e-mail vira o login e a cópia de `profiles.email`, que o banco exige em minúsculas. A mensagem
  // do `z.email` vale para todo problema dele: o limite leva a própria
  email: z.string().trim().toLowerCase().pipe(
    z.email({ error: 'Informe um e-mail válido.' }).max(254, {
      error: 'Use no máximo 254 caracteres.',
    }),
  ),
  telefone: opcional(
    z.string().transform((telefone) => telefone.replace(MASCARA_DO_TELEFONE, '')).pipe(
      z.string().regex(FORMATO_DO_TELEFONE, {
        error: 'Use o telefone com o código do país, só com números (ex.: 5511987654321).',
      }),
    ),
  ),
  tenant_id: opcional(z.guid({ error: 'Empresa inválida.' })),
});

export type EntradaDoProvisionamento = z.infer<typeof esquemaDaEntrada>;
