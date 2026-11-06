import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type { ReactElement } from 'react';

// Selo do mockup: raio 6px, preenchimento translúcido da cor viva, texto na variante -text (AA)
const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 py-0.5 text-2xs font-semibold tracking-wide whitespace-nowrap transition-all outline-hidden focus-visible:ring-2 focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/85',
        secondary: 'border-border bg-secondary text-muted-foreground [a]:hover:bg-accent',
        success: 'border-green/26 bg-green/10 text-green-text',
        warning: 'border-amber/32 bg-amber/12 text-amber-text',
        destructive: 'border-red/28 bg-red/10 text-red-text',
        info: 'border-blue/28 bg-blue/10 text-blue-text',
        outline:
          'border-border text-foreground [a]:hover:bg-accent [a]:hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>): ReactElement {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
