import { PlusIcon, RefreshCwIcon } from 'lucide-react';
import { useId } from 'react';
import type { JSX } from 'react';
import { toast } from 'sonner';

import { Bloco } from '@/app/referencia/Bloco';
import { Secao } from '@/app/referencia/Secao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SecaoComponentes(): JSX.Element {
  const id = useId();
  const idDaPlaca = `${id}-placa`;
  const idDoEmail = `${id}-email`;
  const idDoErro = `${id}-erro`;
  const idDaUnidade = `${id}-unidade`;

  return (
    <Secao
      titulo="Componentes"
      descricao="Os primitivos do shadcn vestidos com os tokens: alvo de clique confortável, anel de foco em --gold-strong e textos em pt-BR."
    >
      <Bloco titulo="Botões">
        <div className="flex flex-wrap items-center gap-3">
          {/* A confirmação repete o verbo do botão (frontend/CLAUDE.md §7) */}
          <Button onClick={() => toast.success('Alterações salvas')}>Salvar alterações</Button>
          <Button variant="outline">Exportar planilha</Button>
          <Button variant="secondary">Filtrar</Button>
          <Button variant="ghost">Ver detalhes</Button>
          <Button variant="link">Ver histórico</Button>
          <Button size="lg">
            <PlusIcon data-icon="inline-start" />
            Novo frete
          </Button>
          <Button variant="outline" size="icon" aria-label="Atualizar">
            <RefreshCwIcon />
          </Button>
          <Button disabled>Aprovar frete</Button>
        </div>
      </Bloco>

      <Bloco titulo="Campos">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={idDaPlaca}>Placa do veículo</Label>
            <Input id={idDaPlaca} placeholder="ABC1D23" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={idDoEmail}>E-mail</Label>
            <Input
              id={idDoEmail}
              type="email"
              defaultValue="nome@empresa"
              aria-invalid="true"
              aria-describedby={idDoErro}
            />
            <p id={idDoErro} className="text-xs text-red-text">
              Informe um e-mail válido, como nome@empresa.com.br.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={idDaUnidade}>Unidade gerencial</Label>
            <Input id={idDaUnidade} defaultValue="Matriz" disabled />
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Selos">
        {/* Cor funcional só com significado: cada status de entrega tem a sua */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Entregue</Badge>
          <Badge variant="info">Em rota</Badge>
          <Badge variant="warning">Atrasado</Badge>
          <Badge variant="destructive">Cancelado</Badge>
          <Badge variant="secondary">Rascunho</Badge>
          <Badge>Prioritário</Badge>
        </div>
      </Bloco>

      <Bloco titulo="Abas">
        <p className="mb-3 text-xs text-text-secondary">
          No app, cada aba é um segmento da rota; aqui, só o visual.
        </p>
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="pedidos">
            <TabsList>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="entregas">Entregas</TabsTrigger>
              <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            </TabsList>
            <TabsContent value="pedidos" className="text-text-secondary">
              Pedidos abertos aparecem aqui.
            </TabsContent>
            <TabsContent value="entregas" className="text-text-secondary">
              Entregas do dia aparecem aqui.
            </TabsContent>
            <TabsContent value="ocorrencias" className="text-text-secondary">
              Ocorrências registradas aparecem aqui.
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="resumo">
            <TabsList variant="line">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="resumo" className="text-text-secondary">
              Resumo do frete.
            </TabsContent>
            <TabsContent value="historico" className="text-text-secondary">
              Histórico de alterações do frete.
            </TabsContent>
          </Tabs>
        </div>
      </Bloco>

      <Bloco titulo="Diálogo">
        <Dialog>
          <DialogTrigger render={<Button variant="destructive" />}>
            Descartar alterações
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Descartar as alterações?</DialogTitle>
              <DialogDescription>
                O que foi preenchido neste cadastro será perdido. Não é possível desfazer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Continuar editando</DialogClose>
              <DialogClose render={<Button variant="destructive" />}>
                Descartar alterações
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Bloco>

      <Bloco titulo="Carregando">
        {/* Skeleton com o formato do conteúdo final, nunca spinner central (frontend/CLAUDE.md §7) */}
        <div aria-hidden="true" className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-lg border border-border-soft px-4.5 pt-4.5 pb-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3.5 h-7 w-40" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border-soft px-4.5 py-4">
            {[0, 1, 2].map((linha) => (
              <div key={linha} className="flex items-center gap-4">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </Bloco>
    </Secao>
  );
}
