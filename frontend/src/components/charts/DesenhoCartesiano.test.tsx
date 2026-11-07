import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DesenhoCartesiano } from '@/components/charts/DesenhoCartesiano';
import type { DesenhoCartesianoProps } from '@/components/charts/DesenhoCartesiano';
import { echarts } from '@/components/charts/echarts';
import { EXEMPLO_FRETES } from '@/components/charts/exemplos';

const PROPS: DesenhoCartesianoProps = { ...EXEMPLO_FRETES, altura: 280 };

type Instancia = NonNullable<ReturnType<typeof echarts.getInstanceByDom>>;

// O echarts-for-react cria a instância, a recria com o tamanho final e só então aplica as opções
async function desenhar(
  props: DesenhoCartesianoProps,
): Promise<{ instancia: () => Instancia; rerender: (p: DesenhoCartesianoProps) => void }> {
  const { container, rerender } = render(<DesenhoCartesiano {...props} />);
  const instancia = (): Instancia => {
    const div = container.querySelector('.echarts-for-react');
    const atual = div instanceof HTMLElement ? echarts.getInstanceByDom(div) : undefined;
    if (atual === undefined) {
      throw new Error('Gráfico ainda não iniciado.');
    }
    return atual;
  };
  await waitFor(() => {
    expect(instancia().getOption().series).toHaveLength(props.series.length);
  });
  return {
    instancia,
    rerender: (p) => {
      rerender(<DesenhoCartesiano {...p} />);
    },
  };
}

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('DesenhoCartesiano', () => {
  // O pai recria os arrays a cada render (um .map sobre os dados): sem mudança de valor, o
  // gráfico não é refeito (a dica aberta não fecha, a animação não repete)
  it('não refaz o gráfico quando só a referência dos dados muda', async () => {
    const { instancia, rerender } = await desenhar(PROPS);
    const setOption = vi.spyOn(instancia(), 'setOption');

    rerender({
      ...PROPS,
      categorias: [...PROPS.categorias],
      series: PROPS.series.map((serie) => ({ ...serie, valores: [...serie.valores] })),
    });
    expect(setOption).not.toHaveBeenCalled();

    rerender({ ...PROPS, series: PROPS.series.slice(0, 1) });
    expect(setOption).toHaveBeenCalled();
  });

  // Cada gráfico lê os tokens ao montar: mudar o tamanho de fonte vale para o próximo
  it('usa o tamanho de fonte da raiz do momento em que monta', async () => {
    await desenhar(PROPS);
    document.documentElement.style.fontSize = '20px';
    const { instancia } = await desenhar(PROPS);

    // --font-size-xs = 0,71875rem → 14,375px com a raiz em 20px
    const estilos = [...instancia().getDom().querySelectorAll('svg text')].map(
      (texto) => texto.getAttribute('style') ?? '',
    );
    expect(estilos.every((estilo) => estilo.includes('font-size: 14.375px'))).toBe(true);
  });

  it('segue o "reduzir movimento" do sistema, inclusive quando muda com o gráfico aberto', async () => {
    let reduzir = false;
    const avisos = new Set<() => void>();
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      media: consulta,
      get matches(): boolean {
        return reduzir;
      },
      addEventListener: (_: string, aviso: () => void): void => {
        avisos.add(aviso);
      },
      removeEventListener: (_: string, aviso: () => void): void => {
        avisos.delete(aviso);
      },
    }));
    const { instancia } = await desenhar(PROPS);
    expect(instancia().getOption().animation).toBe(true);

    reduzir = true;
    act(() => {
      avisos.forEach((aviso) => {
        aviso();
      });
    });

    await waitFor(() => {
      expect(instancia().getOption().animation).toBe(false);
    });
  });
});
