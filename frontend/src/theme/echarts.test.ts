import { afterEach, describe, expect, it } from 'vitest';

import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';

// O setupTests aplica o tokens.css de verdade: se um token for renomeado lá, o teste quebra aqui
afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('lerTokensDoGrafico', () => {
  it('lê as cores das séries na ordem do contrato: navy, ouro, verde, azul, âmbar, cinza', () => {
    expect(lerTokensDoGrafico().series).toEqual([
      '#14294d',
      '#c79a2e',
      '#1f9d57',
      '#2563c4',
      '#e0a106',
      '#8a94a9',
    ]);
  });

  it('lê superfície, bordas e textos dos tokens', () => {
    expect(lerTokensDoGrafico()).toMatchObject({
      superficie: '#ffffff',
      borda: '#dde3ee',
      bordaSuave: '#e8ecf3',
      realce: '#e8ecf4',
      textoPrimario: '#0f1a2e',
      textoSecundario: '#52607a',
      textoTerciario: '#8a94a9',
    });
  });

  it('lê as famílias do corpo e dos números', () => {
    const tokens = lerTokensDoGrafico();

    expect(tokens.fonteCorpo).toMatch(/^["']?Inter["']?,/);
    expect(tokens.fonteMono).toMatch(/^["']?JetBrains Mono["']?,/);
  });

  // O ECharts só aceita px; a escala é em rem para respeitar o tamanho de fonte do navegador
  it('converte a escala tipográfica para px pelo tamanho de fonte da raiz', () => {
    expect(lerTokensDoGrafico()).toMatchObject({ tamanhoRotulo: 11.5, tamanhoTexto: 12.5 });

    document.documentElement.style.fontSize = '20px';
    expect(lerTokensDoGrafico()).toMatchObject({ tamanhoRotulo: 14.375, tamanhoTexto: 15.625 });
  });

  it('lê o raio em px', () => {
    expect(lerTokensDoGrafico().raio).toBe(10);
  });

  // O ECharts estima a altura do texto pela largura de um ideograma ("国"), que a JetBrains Mono
  // não tem: a altura da linha vem do token, não da fonte reserva da máquina
  it('lê a entrelinha do corpo', () => {
    expect(lerTokensDoGrafico().entrelinha).toBe(1.5);
  });

  // Sem o tokens.css, o ECharts cairia nas próprias cores em silêncio
  it('falha com mensagem clara quando um token não existe', () => {
    document.getElementById('tokens-css')?.remove();

    expect(() => lerTokensDoGrafico()).toThrow('Token --navy ausente');
  });
});

describe('criarTemaECharts', () => {
  it('usa as séries dos tokens como paleta, sem cores do ECharts', () => {
    const tokens = lerTokensDoGrafico();

    expect(criarTemaECharts(tokens).color).toEqual(tokens.series);
  });
});
