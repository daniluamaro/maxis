import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { JSX } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Só tema claro (§7). Cor, fonte e sombra ficam no index.css: o sonner injeta CSS próprio em
// runtime, que classe do Tailwind não vence. Ícones nas cores funcionais, que aqui têm significado.
function Toaster(props: ToasterProps): JSX.Element {
  return (
    <Sonner
      theme="light"
      containerAriaLabel="Notificações"
      icons={{
        success: <CircleCheckIcon className="size-4 text-green-text" />,
        info: <InfoIcon className="size-4 text-blue-text" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-text" />,
        error: <OctagonXIcon className="size-4 text-red-text" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{ closeButtonAriaLabel: 'Fechar notificação' }}
      {...props}
    />
  );
}

export { Toaster };
