import type { JSX } from 'react';

import { IndicadoresDeExemplo } from '@/app/referencia/IndicadoresDeExemplo';
import { Secao } from '@/app/referencia/Secao';
import { SecaoComponentes } from '@/app/referencia/SecaoComponentes';
import { SecaoCores } from '@/app/referencia/SecaoCores';
import { SecaoNumeros } from '@/app/referencia/SecaoNumeros';
import { SecaoTipografia } from '@/app/referencia/SecaoTipografia';
import { EXEMPLO_FRETES } from '@/components/charts/exemplos';
import { GraficoCartesiano } from '@/components/charts/GraficoCartesiano';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';

/**
 * Referência do tema (só em desenvolvimento): tokens, tipografia e componentes, na estrutura do
 * mockup aprovado (`docs/design/maxis-tema-claro.html`) para conferir os dois lado a lado.
 */
export function ReferenciaDoTema(): JSX.Element {
  return (
    <main className="min-h-dvh bg-workspace">
      <title>Referência do tema | Maxis</title>
      <div className="mx-auto max-w-7xl px-4 pt-6.5 pb-15 sm:px-8.5">
        <header className="mb-5.5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="font-display text-xl font-extrabold">Referência do tema</h1>
            <p className="mt-1 text-base text-text-secondary">
              Tokens, tipografia e componentes do Maxis, para conferir com o mockup aprovado.
            </p>
          </div>
          <Badge variant="warning">Só em desenvolvimento</Badge>
        </header>

        <IndicadoresDeExemplo />
        <SecaoCores />
        <SecaoTipografia />
        <SecaoComponentes />
        <SecaoNumeros />
        <Secao
          titulo="Gráfico"
          descricao="Barras e linha num eixo só, pelo wrapper de components/charts, com o tema criado a partir dos tokens. Dados fictícios; a quarta-feira fica sem valor de propósito."
        >
          <div>
            <h3 className="mb-4 text-sm font-semibold">Fretes da semana</h3>
            <GraficoCartesiano
              {...EXEMPLO_FRETES}
              titulo="Fretes da semana"
              rotuloDaCategoria="Dia"
            />
          </div>
        </Secao>
      </div>
      <Toaster />
    </main>
  );
}
