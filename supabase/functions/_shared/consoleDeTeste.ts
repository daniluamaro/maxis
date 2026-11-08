/**
 * Só para testes: troca o `console.error` enquanto `executar` roda e devolve cada chamada como o
 * log a mostraria (objetos pelo `Deno.inspect`, como o próprio console faz).
 */
export async function capturandoConsoleError<T>(
  executar: () => Promise<T>,
): Promise<{ resultado: T; registros: string[] }> {
  const registros: string[] = [];
  const original = console.error;
  console.error = (...argumentos: unknown[]): void => {
    registros.push(
      argumentos.map((item) => (typeof item === 'string' ? item : Deno.inspect(item))).join(' '),
    );
  };
  try {
    return { resultado: await executar(), registros };
  } finally {
    console.error = original;
  }
}
