import { describe, expect, it, vi } from 'vitest';

import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarNumeroCompacto,
  formatarPercentual,
} from '@/lib/format';

// O Intl separa "R$" do valor com espaço inseparável (U+00A0), não com espaço comum
const R$ = 'R$ ';
const AUSENTES = [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

describe('formatarMoeda', () => {
  it.each([
    [1234.5, `${R$}1.234,50`],
    [1234567.891, `${R$}1.234.567,89`],
    [0, `${R$}0,00`],
    [-1234.5, `-${R$}1.234,50`],
    // Meio arredonda para longe do zero, sobre o valor decimal escrito
    [0.005, `${R$}0,01`],
    [1.005, `${R$}1,01`],
    // Negativo que arredonda para zero não vira "-R$ 0,00"
    [-0.001, `${R$}0,00`],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarMoeda(valor)).toBe(esperado);
  });

  it.each(AUSENTES)('%s → —', (valor) => {
    expect(formatarMoeda(valor)).toBe('—');
  });
});

describe('formatarNumero', () => {
  it.each([
    [1234, '1.234'],
    [1234567, '1.234.567'],
    [0, '0'],
    [-0, '0'],
    [-1234, '-1.234'],
    // Inteiro por padrão: arredonda, meio para longe do zero
    [1234.5, '1.235'],
    [-2.5, '-3'],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarNumero(valor)).toBe(esperado);
  });

  it.each([
    [1234.5, 2, '1.234,50'],
    [0.1, 3, '0,100'],
    // toFixed daria "1.00": o arredondamento é sobre o decimal escrito, não sobre o binário
    [1.005, 2, '1,01'],
    [-0.001, 2, '0,00'],
  ])('%s com %s casas → %s', (valor, casas, esperado) => {
    expect(formatarNumero(valor, casas)).toBe(esperado);
  });

  it.each(AUSENTES)('%s → —', (valor) => {
    expect(formatarNumero(valor)).toBe('—');
  });
});

describe('formatarPercentual', () => {
  // Recebe fração: 0,125 é 12,5%
  it.each([
    [0.125, '12,5%'],
    [1, '100,0%'],
    [0, '0,0%'],
    [-0.034, '-3,4%'],
    [12.345, '1.234,5%'],
    [-0.0001, '0,0%'],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarPercentual(valor)).toBe(esperado);
  });

  it.each([
    [0.5, 0, '50%'],
    [0.08, 2, '8,00%'],
  ])('%s com %s casas → %s', (valor, casas, esperado) => {
    expect(formatarPercentual(valor, casas)).toBe(esperado);
  });

  it.each(AUSENTES)('%s → —', (valor) => {
    expect(formatarPercentual(valor)).toBe('—');
  });
});

// Também entre o número e a escala ("40 mil"): espaço inseparável
const NBSP = ' ';

describe('formatarMoedaCompacta', () => {
  it.each([
    [40000, `${R$}40${NBSP}mil`],
    [1500, `${R$}1,5${NBSP}mil`],
    // Inteiro na unidade da escala (uma casa abaixo de 10): é rótulo de eixo, não valor exato
    [45678, `${R$}46${NBSP}mil`],
    [1500000, `${R$}1,5${NBSP}mi`],
    [1234567890, `${R$}1,2${NBSP}bi`],
    [999, `${R$}999`],
    [0, `${R$}0`],
    [-0, `${R$}0`],
    [-45000, `-${R$}45${NBSP}mil`],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarMoedaCompacta(valor)).toBe(esperado);
  });

  it.each(AUSENTES)('%s → —', (valor) => {
    expect(formatarMoedaCompacta(valor)).toBe('—');
  });
});

describe('formatarNumeroCompacto', () => {
  it.each([
    [40000, `40${NBSP}mil`],
    [1234, `1,2${NBSP}mil`],
    [1500000, `1,5${NBSP}mi`],
    [999, '999'],
    [0.5, '0,5'],
    [0, '0'],
    [-0, '0'],
    [-45000, `-45${NBSP}mil`],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarNumeroCompacto(valor)).toBe(esperado);
  });

  it.each(AUSENTES)('%s → —', (valor) => {
    expect(formatarNumeroCompacto(valor)).toBe('—');
  });
});

// Os testes rodam em America/Sao_Paulo (UTC−3), fixado no vite.config.ts
describe('formatarData', () => {
  // Data do banco (YYYY-MM-DD) é dia de calendário: não muda com o fuso de quem vê
  it.each([
    'America/Sao_Paulo',
    'America/Rio_Branco',
    'Pacific/Pago_Pago',
    'UTC',
    'Asia/Tokyo',
    'Pacific/Kiritimati',
  ])('2026-11-06 é 06/11/2026 em %s', (fuso) => {
    vi.stubEnv('TZ', fuso);
    expect(formatarData('2026-11-06')).toBe('06/11/2026');
  });

  it('1º de janeiro não volta para o ano anterior', () => {
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
  });

  // Instante (data com hora) mostra o dia no fuso de quem vê
  it.each([
    ['2026-11-06T02:00:00Z', '05/11/2026'],
    ['2026-11-06T02:00:00-03:00', '06/11/2026'],
  ])('instante %s → %s', (valor, esperado) => {
    expect(formatarData(valor)).toBe(esperado);
  });

  it('Date mostra o dia local', () => {
    expect(formatarData(new Date(2026, 10, 6, 23, 30))).toBe('06/11/2026');
  });

  it.each([
    null,
    undefined,
    '',
    'abc',
    '2026-02-30',
    '2026-13-01',
    // Formato brasileiro na entrada: o Date do JS leria como 11 de junho
    '06/11/2026',
    new Date('inválida'),
  ])('%s → —', (valor) => {
    expect(formatarData(valor)).toBe('—');
  });
});

describe('formatarDataHora', () => {
  it.each([
    ['2026-11-06T16:45:00Z', '06/11 13:45'],
    ['2026-11-06T13:45:00-03:00', '06/11 13:45'],
    // Meia-noite é 00, não 24
    ['2026-11-06T03:05:00Z', '06/11 00:05'],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarDataHora(valor)).toBe(esperado);
  });

  it('Date mostra a hora local', () => {
    expect(formatarDataHora(new Date(2026, 0, 2, 9, 7))).toBe('02/01 09:07');
  });

  it.each([
    null,
    undefined,
    '',
    'abc',
    // Só a data: não há hora para mostrar
    '2026-11-06',
    '06/11/2026 13:45',
    new Date('inválida'),
  ])('%s → —', (valor) => {
    expect(formatarDataHora(valor)).toBe('—');
  });
});

describe('formatos de instante que chegam do banco', () => {
  it.each([
    // JSON do Supabase (PostgREST): microssegundos e offset com dois-pontos
    ['2026-11-06T16:45:00.123456+00:00', '06/11 13:45'],
    // Texto do Postgres (`::text`): espaço no lugar do T e offset curto
    ['2026-11-06 16:45:00.123456+00', '06/11 13:45'],
    ['2026-11-06 13:45:00-03', '06/11 13:45'],
  ])('%s → %s', (valor, esperado) => {
    expect(formatarDataHora(valor)).toBe(esperado);
  });

  it('dia impossível com hora também é inválido', () => {
    expect(formatarData('2026-02-30T10:00:00Z')).toBe('—');
    expect(formatarDataHora('2026-02-30T10:00:00Z')).toBe('—');
  });
});

describe('fuso de quem vê', () => {
  // O mesmo instante, visto de três fusos — e de volta, para o formatador não ficar preso
  it.each([
    ['America/Rio_Branco', '06/11 11:45', '06/11/2026'],
    ['Asia/Tokyo', '07/11 01:45', '07/11/2026'],
    ['America/Sao_Paulo', '06/11 13:45', '06/11/2026'],
  ])('em %s, 2026-11-06T16:45Z é %s', (fuso, dataHora, data) => {
    vi.stubEnv('TZ', fuso);
    expect(formatarDataHora('2026-11-06T16:45:00Z')).toBe(dataHora);
    expect(formatarData('2026-11-06T16:45:00Z')).toBe(data);
  });
});

it('ano com menos de 4 dígitos significativos aparece como está', () => {
  expect(formatarData('0026-01-01')).toBe('01/01/0026');
});

// Firefox < 116 (o alvo do build vai até o 114) recusa `signDisplay: 'negative'` com RangeError
it('formata sem "-0" num navegador sem `signDisplay: "negative"`', async () => {
  const Original = Intl.NumberFormat;
  class SemSinalNegativo extends Original {
    constructor(locales?: Intl.LocalesArgument, opcoes?: Intl.NumberFormatOptions) {
      if (opcoes?.signDisplay === 'negative') {
        throw new RangeError('signDisplay inválido');
      }
      super(locales, opcoes);
    }
  }
  vi.stubGlobal(
    'Intl',
    Object.assign(Object.create(Intl) as typeof Intl, { NumberFormat: SemSinalNegativo }),
  );
  vi.resetModules();
  const formato = await import('@/lib/format');

  expect(formato.formatarNumero(-0.001, 2)).toBe('0,00');
  expect(formato.formatarMoeda(-0.001)).toBe('R$ 0,00');
  expect(formato.formatarPercentual(-0.0001)).toBe('0,0%');
  expect(formato.formatarNumero(-1234.5, 1)).toBe('-1.234,5');
});
