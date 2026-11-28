import type { Chamador } from '../_shared/chamador.ts';
import { erro, erroDeValidacao, erroInterno, type Resultado } from '../_shared/resposta.ts';

/** O que o provisionamento cria: o `super_admin` vem só do procedimento manual (decisão 3). */
export type PapelProvisionavel = 'master_admin' | 'admin' | 'user';

export interface PedidoDaCascata {
  readonly papel: PapelProvisionavel;
  /** A empresa do usuário novo, como veio na entrada; só o `super_admin` informa. */
  readonly tenantId?: string;
}

export interface DestinoDoUsuario {
  readonly tenantId: string;
  /** A empresa veio do pedido: antes de criar, conferir que existe, está ativa e não tem dono. */
  readonly conferirEmpresa: boolean;
}

/** A empresa pedida pelo `super_admin`, como ele a enxerga pela RLS. */
export interface SituacaoDaEmpresa {
  readonly ativa: boolean;
  readonly temMasterAdmin: boolean;
}

/**
 * A cascata de provisionamento (`supabase/CLAUDE.md §8`, plano da Fase 1, STEP 1.9): o
 * `super_admin` cria o `master_admin` da empresa que informar; o `master_admin` cria `admin` e
 * `user` só na própria empresa, sem escolhê-la; ninguém mais cria nada. O chamador já chega
 * conferido (ativo, de empresa ativa, sem senha provisória pendente).
 */
export function decidirCascata(
  chamador: Chamador,
  pedido: PedidoDaCascata,
): Resultado<DestinoDoUsuario> {
  if (chamador.papel === 'super_admin') {
    if (pedido.papel !== 'master_admin') return papelNaoPermitido();
    if (pedido.tenantId === undefined) {
      return {
        ok: false,
        resposta: erroDeValidacao({ tenant_id: 'Informe a empresa do administrador master.' }),
      };
    }
    return { ok: true, valor: { tenantId: pedido.tenantId, conferirEmpresa: true } };
  }

  if (chamador.papel === 'master_admin') {
    if (pedido.papel === 'master_admin') return papelNaoPermitido();
    if (pedido.tenantId !== undefined) {
      return {
        ok: false,
        resposta: erro(
          403,
          'empresa_nao_permitida',
          'Você cadastra usuários só da sua empresa: não informe a empresa.',
        ),
      };
    }
    // A constraint do banco garante o tenant do master_admin; sem ele, nada é criado
    if (chamador.tenantId === null) {
      console.error('master_admin sem tenant: o provisionamento foi recusado.');
      return { ok: false, resposta: erroInterno() };
    }
    return { ok: true, valor: { tenantId: chamador.tenantId, conferirEmpresa: false } };
  }

  return papelNaoPermitido();
}

/** A empresa pedida para o `master_admin` novo: existe, está ativa e ainda não tem dono. */
export function avaliarEmpresa(empresa: SituacaoDaEmpresa | null): Resultado<undefined> {
  if (empresa === null) {
    return { ok: false, resposta: erro(404, 'empresa_inexistente', 'Empresa não encontrada.') };
  }
  if (!empresa.ativa) {
    return {
      ok: false,
      resposta: erro(
        403,
        'empresa_bloqueada',
        'A empresa está bloqueada: desbloqueie antes de cadastrar o administrador master.',
      ),
    };
  }
  if (empresa.temMasterAdmin) {
    return {
      ok: false,
      resposta: erro(
        409,
        'empresa_com_master_admin',
        'Esta empresa já tem um administrador master.',
      ),
    };
  }
  return { ok: true, valor: undefined };
}

function papelNaoPermitido(): Resultado<never> {
  return {
    ok: false,
    resposta: erro(403, 'papel_nao_permitido', 'Seu papel não permite criar este tipo de usuário.'),
  };
}
