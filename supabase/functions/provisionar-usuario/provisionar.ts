import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { identificarChamador, type OpcoesDoChamador } from '../_shared/chamador.ts';
import {
  erro,
  erroDeValidacao,
  erroInterno,
  type Resultado,
  sucesso,
} from '../_shared/resposta.ts';
import { gerarSenhaProvisoria } from '../_shared/senha.ts';
import { lerEntrada } from '../_shared/validacao.ts';
import { avaliarEmpresa, decidirCascata } from './cascata.ts';
import { esquemaDaEntrada } from './entrada.ts';

// O que o super_admin enxerga da empresa pedida, pela RLS
const esquemaDaEmpresa = z.array(z.object({ ativo: z.boolean() }));
const esquemaDosMasters = z.array(z.object({ id: z.guid() }));

// Os conflitos que a RPC devolve com o nome da constraint (STEP 1.9, migration da RPC)
const CONFLITOS: Readonly<Record<string, { codigo: string; mensagem: string }>> = {
  profiles_email_key: {
    codigo: 'email_em_uso',
    mensagem: 'Já existe um usuário com este e-mail.',
  },
  profiles_tenant_id_master_admin_key: {
    codigo: 'empresa_com_master_admin',
    mensagem: 'Esta empresa já tem um administrador master.',
  },
};
const CONSTRAINT_DO_CONFLITO = /unique constraint "([a-z0-9_]+)"/;

/**
 * A Edge Function `provisionar-usuario` (plano da Fase 1, STEP 1.9), no fluxo do
 * `supabase/CLAUDE.md §8`: identifica e confere o chamador, valida a entrada, aplica a cascata,
 * cria o usuário no Auth com a senha provisória e o e-mail confirmado (sem SMTP, ele não entraria)
 * e grava o profile e o evento `usuario.criado` numa transação, pela RPC. Se a RPC falha, o usuário
 * sai do Auth: nunca fica usuário sem profile. A senha provisória sai só na resposta.
 */
export async function provisionarUsuario(
  req: Request,
  opcoes: OpcoesDoChamador = {},
): Promise<Response> {
  const identificado = await identificarChamador(req, opcoes);
  if (!identificado.ok) return identificado.resposta;
  const { chamador, cliente, admin } = identificado.valor;

  const entrada = await lerEntrada(req, esquemaDaEntrada);
  if (!entrada.ok) return entrada.resposta;
  const pedido = entrada.valor;

  const destino = decidirCascata(chamador, { papel: pedido.papel, tenantId: pedido.tenant_id });
  if (!destino.ok) return destino.resposta;
  const { tenantId, conferirEmpresa } = destino.valor;

  if (conferirEmpresa) {
    const empresa = await conferirEmpresaPedida(cliente, tenantId);
    if (!empresa.ok) return empresa.resposta;
  }

  const senha = gerarSenhaProvisoria();
  const criado = await criarNoAuth(admin, pedido.email, senha);
  if (!criado.ok) return criado.resposta;
  const usuarioId = criado.valor;

  const { error: falhaDaGravacao } = await admin.rpc('registrar_usuario_provisionado', {
    usuario_id: usuarioId,
    tenant_id: tenantId,
    papel: pedido.papel,
    nome: pedido.nome,
    email: pedido.email,
    ator_profile_id: chamador.id,
    telefone: pedido.telefone,
  });
  if (falhaDaGravacao) {
    // Só o código: a mensagem e o detalhe do PostgREST trazem o e-mail
    console.error('Falha ao gravar o profile e o evento:', falhaDaGravacao.code);
    if (!(await compensar(admin, usuarioId))) return erroInterno();
    const conflito = falhaDaGravacao.code === '23505'
      ? CONFLITOS[CONSTRAINT_DO_CONFLITO.exec(falhaDaGravacao.message)?.[1] ?? '']
      : undefined;
    return conflito ? erro(409, conflito.codigo, conflito.mensagem) : erroInterno();
  }

  return sucesso({ profile_id: usuarioId, email: pedido.email, senha_provisoria: senha }, 201);
}

/** A empresa pedida pelo super_admin, lida com o token dele: existe, está ativa e sem dono. */
async function conferirEmpresaPedida(
  cliente: SupabaseClient,
  tenantId: string,
): Promise<Resultado<undefined>> {
  const [respostaDaEmpresa, respostaDosMasters] = await Promise.all([
    cliente.from('empresas').select('ativo').eq('id', tenantId),
    cliente.from('profiles').select('id').eq('tenant_id', tenantId).eq('papel', 'master_admin'),
  ]);
  const falha = respostaDaEmpresa.error ?? respostaDosMasters.error;
  if (falha) {
    console.error('Falha ao ler a empresa pedida:', falha.code);
    return { ok: false, resposta: erroInterno() };
  }
  const empresas = esquemaDaEmpresa.safeParse(respostaDaEmpresa.data);
  const masters = esquemaDosMasters.safeParse(respostaDosMasters.data);
  if (!empresas.success || !masters.success) {
    console.error('A empresa pedida veio fora do formato esperado.');
    return { ok: false, resposta: erroInterno() };
  }
  const [empresa] = empresas.data;
  return avaliarEmpresa(
    empresa ? { ativa: empresa.ativo, temMasterAdmin: masters.data.length > 0 } : null,
  );
}

/** Cria o usuário no Auth e devolve o id; o e-mail repetido é o 409 da tabela da cascata. */
async function criarNoAuth(
  admin: SupabaseClient,
  email: string,
  senha: string,
): Promise<Resultado<string>> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists') {
      return {
        ok: false,
        resposta: erro(409, 'email_em_uso', 'Já existe um usuário com este e-mail.'),
      };
    }
    if (error.code === 'email_address_invalid') {
      return { ok: false, resposta: erroDeValidacao({ email: 'Informe um e-mail válido.' }) };
    }
    // Só o código: a mensagem do Auth pode repetir o e-mail
    console.error('Falha ao criar o usuário no Auth:', error.code ?? 'sem código');
    return { ok: false, resposta: erroInterno() };
  }
  return { ok: true, valor: data.user.id };
}

/**
 * Tira do Auth o usuário recém-criado, quando o profile não chegou a existir (a RPC grava os dois
 * ou nenhum). Sem profile, nada o prende, nem a proteção do `master_admin` (STEP 1.3).
 */
async function compensar(admin: SupabaseClient, usuarioId: string): Promise<boolean> {
  const { error } = await admin.auth.admin.deleteUser(usuarioId);
  if (error) {
    console.error(
      `Compensação falhou (${
        error.code ?? 'sem código'
      }): o usuário ${usuarioId} ficou no Auth sem profile.`,
    );
    return false;
  }
  return true;
}
