import { cn } from 'cn';
import type { ComponentProps, JSX } from 'react';

// --bg-hover aparece tanto no painel branco quanto no fundo da página
function Skeleton({ className, ...props }: ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
