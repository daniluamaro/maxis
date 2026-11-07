import { afterEach, describe, expect, it } from 'vitest';

import { lerToken, lerTokenEmPx } from '@/theme/lerToken';

// O setupTests aplica o tokens.css de verdade ao documento
afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('lerToken', () => {
  it('lê o valor do token aplicado ao documento', () => {
    expect(lerToken('--gold')).toBe('#c79a2e');
  });

  // O jsdom já entrega sem espaço; há navegador que mantém o espaço depois dos dois-pontos
  it('tira o espaço que alguns navegadores deixam em volta do valor', () => {
    const estilo = { getPropertyValue: () => ' #c79a2e ' } as unknown as CSSStyleDeclaration;

    expect(lerToken('--gold', estilo)).toBe('#c79a2e');
  });

  it('falha com mensagem clara quando o token não existe', () => {
    expect(() => lerToken('--nao-existe')).toThrow(
      'Token --nao-existe ausente: o tokens.css não foi carregado.',
    );
  });
});

describe('lerTokenEmPx', () => {
  it('lê em px o token que já está em px', () => {
    expect(lerTokenEmPx('--radius')).toBe(10);
  });

  // Outra unidade daria um número errado em silêncio (`em` lido como px, `calc()` como NaN)
  it('falha com mensagem clara quando o token não está em px nem em rem', () => {
    document.documentElement.style.setProperty('--tamanho-de-teste', '1.2em');

    expect(() => lerTokenEmPx('--tamanho-de-teste')).toThrow(
      'Token --tamanho-de-teste em "1.2em": só px e rem são aceitos.',
    );
  });

  // A escala é em rem para respeitar o tamanho de fonte que a pessoa escolheu no navegador
  it('converte rem para px pelo tamanho de fonte da raiz', () => {
    expect(lerTokenEmPx('--font-size-2xs')).toBe(10.5);

    document.documentElement.style.fontSize = '20px';
    expect(lerTokenEmPx('--font-size-2xs')).toBe(13.125);
  });
});
