import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';
import type { ComponentProps, JSX } from 'react';

// Branco com sombra suave, como os filtros do mockup; placeholder em --text-secondary (AA).
// Abaixo de `md` o tamanho vem da base (16px, contra o zoom do iOS); daí para cima, `text-sm`.
// Campo inválido focado: o anel de foco vence o de erro (senão o foco não muda nada na tela).
function Input({ className, type, ...props }: ComponentProps<'input'>): JSX.Element {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 shadow-sm transition-colors outline-hidden file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-2 aria-invalid:focus-visible:ring-ring md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
