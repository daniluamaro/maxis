import { comCors } from '../_shared/cors.ts';
import { provisionarUsuario } from './provisionar.ts';

// Só recebe e delega (supabase/CLAUDE.md §8): a regra está em `provisionar.ts` e `cascata.ts`
Deno.serve(comCors((req) => provisionarUsuario(req)));
