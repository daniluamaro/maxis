import { assert, assertEquals } from '@std/assert';
import type { Chamador } from '../_shared/chamador.ts';
import { capturandoConsoleError } from '../_shared/consoleDeTeste.ts';
import type { Resultado } from '../_shared/resposta.ts';
import { avaliarEmpresa, decidirCascata, type PapelProvisionavel } from './cascata.ts';

const TENANT_ALFA = '5eed0000-0000-4000-8000-00000000a000';
const TENANT_BETA = '5eed0000-0000-4000-8000-00000000b000';

const SUPER: Chamador = {
  id: '5eed0000-0000-4000-8000-000000000001',
  papel: 'super_admin',
  tenantId: null,
};
const MASTER: Chamador = {
  id: '5eed0000-0000-4000-8000-00000000a001',
  papel: 'master_admin',
  tenantId: TENANT_ALFA,
};
const ADMIN: Chamador = {
  id: '5eed0000-0000-4000-8000-00000000a002',
  papel: 'admin',
  tenantId: TENANT_ALFA,
};
const USER: Chamador = {
  id: '5eed0000-0000-4000-8000-00000000a003',
  papel: 'user',
  tenantId: TENANT_ALFA,
};

const TODOS_OS_PAPEIS: PapelProvisionavel[] = ['master_admin', 'admin', 'user'];

async function recusa(
  resultado: Resultado<unknown>,
): Promise<{ status: number; codigo: string; campos?: Record<string, string> }> {
  assert(!resultado.ok, 'era para recusar o pedido');
  const { error } = await resultado.resposta.json();
  return { status: resultado.resposta.status, codigo: error.codigo, campos: error.campos };
}

Deno.test('o super_admin cria o master_admin da empresa pedida, depois de conferir a empresa', () => {
  const decisao = decidirCascata(SUPER, { papel: 'master_admin', tenantId: TENANT_BETA });

  assertEquals(decisao, { ok: true, valor: { tenantId: TENANT_BETA, conferirEmpresa: true } });
});

Deno.test('o super_admin precisa dizer de que empresa é o master_admin', async () => {
  assertEquals(await recusa(decidirCascata(SUPER, { papel: 'master_admin' })), {
    status: 400,
    codigo: 'entrada_invalida',
    campos: { tenant_id: 'Informe a empresa do administrador master.' },
  });
});

Deno.test('o super_admin não cria admin nem user', async () => {
  for (const papel of ['admin', 'user'] as const) {
    assertEquals(
      await recusa(decidirCascata(SUPER, { papel, tenantId: TENANT_ALFA })),
      { status: 403, codigo: 'papel_nao_permitido', campos: undefined },
      papel,
    );
  }
});

Deno.test('o master_admin cria admin e user na própria empresa, sem conferir empresa', () => {
  for (const papel of ['admin', 'user'] as const) {
    assertEquals(
      decidirCascata(MASTER, { papel }),
      { ok: true, valor: { tenantId: TENANT_ALFA, conferirEmpresa: false } },
      papel,
    );
  }
});

Deno.test('o master_admin não cria outro master_admin', async () => {
  for (const tenantId of [undefined, TENANT_ALFA]) {
    assertEquals(
      await recusa(decidirCascata(MASTER, { papel: 'master_admin', tenantId })),
      { status: 403, codigo: 'papel_nao_permitido', campos: undefined },
      String(tenantId),
    );
  }
});

Deno.test('o master_admin não escolhe a empresa, nem informando a própria', async () => {
  for (const tenantId of [TENANT_BETA, TENANT_ALFA]) {
    assertEquals(
      await recusa(decidirCascata(MASTER, { papel: 'user', tenantId })),
      { status: 403, codigo: 'empresa_nao_permitida', campos: undefined },
      tenantId,
    );
  }
});

Deno.test('admin e user não criam ninguém', async () => {
  for (const chamador of [ADMIN, USER]) {
    for (const papel of TODOS_OS_PAPEIS) {
      assertEquals(
        await recusa(decidirCascata(chamador, { papel })),
        { status: 403, codigo: 'papel_nao_permitido', campos: undefined },
        `${chamador.papel} → ${papel}`,
      );
    }
  }
});

Deno.test('o master_admin sem tenant (fora da constraint do banco) não cria nada', async () => {
  const semTenant: Chamador = { ...MASTER, tenantId: null };

  const { resultado, registros } = await capturandoConsoleError(() =>
    Promise.resolve(decidirCascata(semTenant, { papel: 'user' }))
  );

  assertEquals(await recusa(resultado), { status: 500, codigo: 'erro_interno', campos: undefined });
  assertEquals(registros, ['master_admin sem tenant: o provisionamento foi recusado.']);
});

Deno.test('a empresa pedida precisa existir', async () => {
  assertEquals(await recusa(avaliarEmpresa(null)), {
    status: 404,
    codigo: 'empresa_inexistente',
    campos: undefined,
  });
});

Deno.test('a empresa bloqueada não recebe master_admin, tenha ou não dono', async () => {
  for (const temMasterAdmin of [false, true]) {
    assertEquals(
      await recusa(avaliarEmpresa({ ativa: false, temMasterAdmin })),
      { status: 403, codigo: 'empresa_bloqueada', campos: undefined },
      String(temMasterAdmin),
    );
  }
});

Deno.test('a empresa que já tem master_admin não recebe outro', async () => {
  assertEquals(await recusa(avaliarEmpresa({ ativa: true, temMasterAdmin: true })), {
    status: 409,
    codigo: 'empresa_com_master_admin',
    campos: undefined,
  });
});

Deno.test('a empresa ativa e sem dono recebe o master_admin', () => {
  assertEquals(avaliarEmpresa({ ativa: true, temMasterAdmin: false }), {
    ok: true,
    valor: undefined,
  });
});
