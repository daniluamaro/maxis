import type { JSX } from 'react';

import { formatarDataHora, formatarMoeda, formatarNumero, formatarPercentual } from '@/lib/format';

// Dados fictícios. A nota é só texto: número fica no valor, em mono (frontend/CLAUDE.md §6)
const INDICADORES = [
  { rotulo: 'Fretes no mês', valor: formatarMoeda(1284530.9), nota: 'Acima da meta do mês' },
  { rotulo: 'Entregas', valor: formatarNumero(1248), nota: 'Desde o início do mês' },
  { rotulo: 'No prazo', valor: formatarPercentual(0.943), nota: 'Dentro do prazo combinado' },
  {
    rotulo: 'Atualizado em',
    valor: formatarDataHora('2026-11-07T17:30:00Z'),
    nota: 'No fuso de quem vê',
  },
];

/** A linha de KPIs do mockup (`.kpi-row`): direto sobre o fundo da página, com o fio de ouro. */
export function IndicadoresDeExemplo(): JSX.Element {
  return (
    <section
      aria-label="Indicadores de exemplo"
      className="mb-7.5 grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3.5"
    >
      {INDICADORES.map((indicador) => (
        <div
          key={indicador.rotulo}
          className="relative overflow-hidden rounded-lg border border-border-soft bg-bg-panel px-4.5 pt-4.5 pb-4 shadow-sm"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.75 bg-gold" />
          <dl>
            <dt className="text-2xs tracking-wider text-text-secondary uppercase">
              {indicador.rotulo}
            </dt>
            <dd className="mt-2.5 font-mono text-2xl font-bold">{indicador.valor}</dd>
            <dd className="mt-1.5 text-xs text-text-secondary">{indicador.nota}</dd>
          </dl>
        </div>
      ))}
    </section>
  );
}
