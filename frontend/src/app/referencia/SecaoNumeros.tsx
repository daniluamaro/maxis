import type { JSX } from 'react';

import {
  ESTILO_DA_CELULA,
  ESTILO_DA_TABELA,
  ESTILO_DO_CABECALHO,
  ESTILO_DO_CORPO_DA_TABELA,
} from '@/app/referencia/estilos';
import { Secao } from '@/app/referencia/Secao';
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarNumeroCompacto,
  formatarPercentual,
} from '@/lib/format';
import { cn } from '@/lib/utils';

// A chamada vai escrita à mão ao lado do resultado de verdade: a tabela mostra o que o código faz
const EXEMPLOS = [
  { chamada: 'formatarMoeda(1284530.9)', resultado: formatarMoeda(1284530.9) },
  { chamada: 'formatarMoeda(-89.5)', resultado: formatarMoeda(-89.5) },
  { chamada: 'formatarMoedaCompacta(45678)', resultado: formatarMoedaCompacta(45678) },
  { chamada: 'formatarNumero(1248)', resultado: formatarNumero(1248) },
  { chamada: 'formatarNumero(3.14159, 2)', resultado: formatarNumero(3.14159, 2) },
  { chamada: 'formatarNumeroCompacto(1500000)', resultado: formatarNumeroCompacto(1500000) },
  { chamada: 'formatarPercentual(0.943)', resultado: formatarPercentual(0.943) },
  { chamada: "formatarData('2026-11-07')", resultado: formatarData('2026-11-07') },
  {
    chamada: "formatarDataHora('2026-11-07T17:30:00Z')",
    resultado: formatarDataHora('2026-11-07T17:30:00Z'),
  },
  { chamada: 'formatarMoeda(null)', resultado: formatarMoeda(null) },
];

export function SecaoNumeros(): JSX.Element {
  return (
    <Secao
      titulo="Números"
      descricao="Todo número, moeda, percentual e data sai de lib/format, em JetBrains Mono. Valor ausente vira travessão; a data com hora sai no fuso de quem vê."
    >
      <div className="overflow-x-auto">
        <table className={ESTILO_DA_TABELA}>
          <thead>
            <tr>
              <th scope="col" className={ESTILO_DO_CABECALHO}>
                Chamada
              </th>
              <th scope="col" className={ESTILO_DO_CABECALHO}>
                Resultado
              </th>
            </tr>
          </thead>
          <tbody className={ESTILO_DO_CORPO_DA_TABELA}>
            {EXEMPLOS.map((exemplo) => (
              <tr key={exemplo.chamada}>
                <td className={cn(ESTILO_DA_CELULA, 'font-mono wrap-anywhere text-text-secondary')}>
                  <code>{exemplo.chamada}</code>
                </td>
                <td className={cn(ESTILO_DA_CELULA, 'font-mono font-medium whitespace-nowrap')}>
                  {exemplo.resultado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Secao>
  );
}
