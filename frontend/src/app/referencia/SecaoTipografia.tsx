import { useMemo } from 'react';
import type { JSX } from 'react';

import { Bloco } from '@/app/referencia/Bloco';
import { ESCALA_TIPOGRAFICA, FAMILIAS } from '@/app/referencia/catalogo';
import {
  ESTILO_DA_CELULA,
  ESTILO_DA_TABELA,
  ESTILO_DO_CABECALHO,
  ESTILO_DO_CORPO_DA_TABELA,
} from '@/app/referencia/estilos';
import { criarLeitorDeTokens } from '@/app/referencia/leitorDeTokens';
import { Secao } from '@/app/referencia/Secao';
import { ValorDoToken } from '@/app/referencia/ValorDoToken';
import { formatarNumero } from '@/lib/format';
import { cn } from '@/lib/utils';

function formatarPx(px: number): string {
  return `${formatarNumero(px, Number.isInteger(px) ? 0 : 1)}\u00a0px`;
}

export function SecaoTipografia(): JSX.Element {
  // Em px pelo tamanho de fonte da raiz, lido ao abrir a página: com a fonte do navegador maior,
  // os valores sobem junto
  const escala = useMemo(() => {
    const leitor = criarLeitorDeTokens();
    return ESCALA_TIPOGRAFICA.map((passo) => ({
      ...passo,
      px: leitor.px(`--font-size-${passo.passo}`),
    }));
  }, []);

  return (
    <Secao
      titulo="Tipografia"
      descricao="Manrope nos títulos, Inter no corpo e JetBrains Mono em todo número, com algarismos tabulares. Só existem os sete tamanhos da escala."
    >
      <Bloco titulo="Famílias">
        <ul className="grid gap-3 md:grid-cols-3">
          {FAMILIAS.map((familia) => (
            <li
              key={familia.nome}
              className="rounded-lg border border-border-soft px-4 pt-3.5 pb-4"
            >
              <p className={cn('text-lg font-bold', familia.classe)}>{familia.nome}</p>
              <p className="font-mono text-xs text-text-secondary">{familia.token}</p>
              <p className="text-xs text-text-secondary">{familia.uso}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {familia.pesos.map((peso) => (
                  <li key={peso.peso} className="flex items-baseline gap-3">
                    <span className="w-7 shrink-0 font-mono text-xs text-text-secondary">
                      {formatarNumero(peso.peso)}
                    </span>
                    <span className={cn('text-base', familia.classe, peso.classe)}>
                      {familia.amostra}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="Escala">
        {/* Tabela larga rola no próprio contêiner, nunca a página (frontend/CLAUDE.md §6) */}
        <div className="overflow-x-auto">
          <table className={cn(ESTILO_DA_TABELA, 'min-w-160')}>
            <thead>
              <tr>
                <th scope="col" className={ESTILO_DO_CABECALHO}>
                  Utilitário
                </th>
                <th scope="col" className={ESTILO_DO_CABECALHO}>
                  Tamanho
                </th>
                <th scope="col" className={ESTILO_DO_CABECALHO}>
                  Uso
                </th>
                <th scope="col" className={ESTILO_DO_CABECALHO}>
                  Amostra
                </th>
              </tr>
            </thead>
            <tbody className={ESTILO_DO_CORPO_DA_TABELA}>
              {escala.map((passo) => (
                <tr key={passo.passo}>
                  <td className={cn(ESTILO_DA_CELULA, 'font-mono font-medium whitespace-nowrap')}>
                    text-{passo.passo}
                  </td>
                  <td
                    className={cn(
                      ESTILO_DA_CELULA,
                      'font-mono whitespace-nowrap text-text-secondary',
                    )}
                  >
                    <ValorDoToken>{passo.px === null ? null : formatarPx(passo.px)}</ValorDoToken>
                  </td>
                  <td className={cn(ESTILO_DA_CELULA, 'text-text-secondary')}>{passo.uso}</td>
                  <td className={cn(ESTILO_DA_CELULA, passo.classe)}>{passo.amostra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>
    </Secao>
  );
}
