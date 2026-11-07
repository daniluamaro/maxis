/*
 * Dados fictícios do gráfico cartesiano, para testes e demonstração (nenhum dado de cliente).
 */
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';

/** Barras e linha na mesma unidade, num eixo só; um dia sem dado. */
export const EXEMPLO_FRETES = {
  categorias: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
  tipoCategoria: 'data',
  formato: 'moeda',
  series: [
    { nome: 'Realizado', tipo: 'barra', valores: [41250.5, 48320, null, 39870.25, 52110] },
    { nome: 'Meta', tipo: 'linha', valores: [45000, 45000, 45000, 45000, 45000] },
  ],
} as const satisfies DadosCartesianos;

/** As cinco cores do contrato, alternando barra e linha, sobre categorias de texto. */
export const EXEMPLO_CINCO_SERIES: DadosCartesianos = {
  categorias: ['Jan', 'Fev', 'Mar'],
  formato: 'numero',
  series: ['A', 'B', 'C', 'D', 'E'].map((nome, i) => ({
    nome,
    tipo: i % 2 === 0 ? 'barra' : 'linha',
    valores: [10 + i, 20 + i, 15 + i],
  })),
};
