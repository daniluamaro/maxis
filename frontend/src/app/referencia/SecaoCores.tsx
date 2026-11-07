import { useMemo } from 'react';
import type { JSX } from 'react';

import { Bloco } from '@/app/referencia/Bloco';
import { GRUPOS_DE_CORES } from '@/app/referencia/catalogo';
import { criarLeitorDeTokens } from '@/app/referencia/leitorDeTokens';
import { Secao } from '@/app/referencia/Secao';
import { ValorDoToken } from '@/app/referencia/ValorDoToken';
import { Marca } from '@/components/shell/Marca';
import { cn } from '@/lib/utils';

const SOMBRAS = [
  { token: '--shadow-sm', classe: 'shadow-sm', uso: 'Painel' },
  { token: '--shadow-md', classe: 'shadow-md', uso: 'Só flutuante: popover, menu e diálogo' },
] as const;

const RAIOS = [
  { classe: 'rounded-sm', uso: 'Selo' },
  { classe: 'rounded-md', uso: 'Campo e botão' },
  { classe: 'rounded-lg', uso: 'KPI e painel interno' },
  { classe: 'rounded-xl', uso: 'Seção e diálogo' },
] as const;

export function SecaoCores(): JSX.Element {
  // Valor lido do tokens.css aplicado à página: o que aparece aqui é o que o app usa
  const leitor = useMemo(() => criarLeitorDeTokens(), []);

  return (
    <Secao
      titulo="Cores"
      descricao="Os tokens do CLAUDE.md §7 com o valor aplicado à página. Fora desta lista, nenhuma cor existe no app."
    >
      <Bloco titulo="Logo sobre a navy">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-5 rounded-lg bg-sidebar-bg px-6 py-5">
          <Marca />
          <Marca tamanho="destaque" />
        </div>
      </Bloco>

      {GRUPOS_DE_CORES.map((grupo) => (
        <Bloco key={grupo.nome} titulo={grupo.nome}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
            {grupo.cores.map((cor) => (
              <li key={cor.token} className="overflow-hidden rounded-lg border border-border-soft">
                <div className={cn('h-12 border-b border-border-soft', cor.classe)} />
                <div className="px-3 pt-2 pb-2.5 text-xs">
                  <p className="font-mono font-medium">{cor.token}</p>
                  <p className="font-mono text-text-secondary">
                    <ValorDoToken>{leitor.valor(cor.token)}</ValorDoToken>
                  </p>
                  <p className="mt-1 text-text-secondary">{cor.uso}</p>
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      ))}

      <Bloco titulo="Sombra e raio">
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOMBRAS.map((sombra) => (
            <li key={sombra.token} className="overflow-hidden rounded-lg border border-border-soft">
              {/* Sobre o fundo da página, onde a sombra trabalha */}
              <div className="bg-bg-base p-5">
                <div className={cn('h-12 rounded-lg bg-bg-panel', sombra.classe)} />
              </div>
              <div className="border-t border-border-soft px-3 pt-2 pb-2.5 text-xs">
                <p className="font-mono font-medium">{sombra.token}</p>
                <p className="font-mono text-text-secondary">
                  <ValorDoToken>{leitor.valor(sombra.token)}</ValorDoToken>
                </p>
                <p className="mt-1 text-text-secondary">{sombra.uso}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-text-secondary">
          Raios derivados de <span className="font-mono">--radius</span>, que vale{' '}
          <span className="font-mono">
            <ValorDoToken>{leitor.valor('--radius')}</ValorDoToken>
          </span>
          :
        </p>
        <ul className="mt-2 flex flex-wrap gap-5">
          {RAIOS.map((raio) => (
            <li key={raio.classe} className="flex items-center gap-3 text-xs">
              <span
                aria-hidden="true"
                className={cn('size-10 border border-border bg-bg-panel-alt', raio.classe)}
              />
              <span>
                <span className="block font-mono font-medium">{raio.classe}</span>
                <span className="text-text-secondary">{raio.uso}</span>
              </span>
            </li>
          ))}
        </ul>
      </Bloco>
    </Secao>
  );
}
