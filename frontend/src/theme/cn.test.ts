import { cn } from 'cn';
import { describe, expect, it } from 'vitest';

// O `cn` resolve conflitos por grupo de utilitário. Os nomes do tema do Maxis não são os padrão do
// Tailwind: se o `cn` classificar um deles errado, descarta uma classe em silêncio.
describe('cn com os utilitários do tema', () => {
  it('mantém tamanho e cor de texto juntos', () => {
    expect(cn('text-sm', 'text-text-secondary')).toBe('text-sm text-text-secondary');
    expect(cn('text-2xs', 'text-gold-strong')).toBe('text-2xs text-gold-strong');
  });

  it('resolve conflito dentro da escala tipográfica', () => {
    expect(cn('text-sm', 'text-2xs')).toBe('text-2xs');
    expect(cn('text-base', 'text-2xl')).toBe('text-2xl');
  });

  it('resolve conflito entre cores de token e nomes do shadcn', () => {
    expect(cn('text-text-secondary', 'text-gold-strong')).toBe('text-gold-strong');
    expect(cn('bg-card', 'bg-bg-hover')).toBe('bg-bg-hover');
    expect(cn('bg-red/10', 'bg-destructive')).toBe('bg-destructive');
  });

  it('mantém largura e cor de borda juntas', () => {
    expect(cn('border', 'border-border-soft')).toBe('border border-border-soft');
  });

  it('resolve conflito de sombra e de raio', () => {
    expect(cn('shadow-sm', 'shadow-md')).toBe('shadow-md');
    expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg');
  });

  it('separa família de peso e resolve conflito entre famílias', () => {
    expect(cn('font-display', 'font-extrabold')).toBe('font-display font-extrabold');
    expect(cn('font-heading', 'font-mono')).toBe('font-mono');
    expect(cn('font-sans', 'font-display')).toBe('font-display');
  });
});
