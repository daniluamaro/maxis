/*
 * Formatadores pt-BR: os únicos permitidos na UI (frontend/CLAUDE.md §8). Todo valor ausente ou
 * inválido vira "—"; nunca `null`, `NaN` ou número cru na tela.
 */

/** O que a UI mostra no lugar de um valor ausente ou inválido. */
export const VALOR_AUSENTE = '—';

type ValorNumerico = number | null | undefined;

// Criar um Intl.NumberFormat custa ~10× usar um pronto: um por configuração, reaproveitado
const formatadoresNumericos = new Map<string, Intl.NumberFormat>();

function formatarNumerico(
  valor: ValorNumerico,
  chave: string,
  opcoes: Intl.NumberFormatOptions,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return VALOR_AUSENTE;
  }
  let formatador = formatadoresNumericos.get(chave);
  if (formatador === undefined) {
    // `negative`: valor que arredonda para zero não aparece como "-0,00"
    formatador = new Intl.NumberFormat('pt-BR', { signDisplay: 'negative', ...opcoes });
    formatadoresNumericos.set(chave, formatador);
  }
  return formatador.format(valor);
}

/** "R$ 1.234,50" (espaço inseparável depois do "R$"). */
export function formatarMoeda(valor: ValorNumerico): string {
  return formatarNumerico(valor, 'moeda', { style: 'currency', currency: 'BRL' });
}

/** "1.234" — inteiro por padrão; `casas` fixa as decimais ("1.234,50" com 2). */
export function formatarNumero(valor: ValorNumerico, casas = 0): string {
  return formatarNumerico(valor, `numero:${String(casas)}`, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Recebe fração: 0,125 → "12,5%". `casas` fixa as decimais (1 por padrão). */
export function formatarPercentual(valor: ValorNumerico, casas = 1): string {
  return formatarNumerico(valor, `percentual:${String(casas)}`, {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

type ValorData = string | Date | null | undefined;

const OPCOES_DATA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

// `date` do Postgres ("2026-11-06") é um dia de calendário, não um instante: montado e formatado
// em UTC, não muda com o fuso de quem vê. `new Date("2026-11-06")` seria meia-noite UTC — em
// UTC−3, o dia anterior.
const DATA_DE_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_DATA_DE_CALENDARIO = new Intl.DateTimeFormat('pt-BR', {
  ...OPCOES_DATA,
  timeZone: 'UTC',
});

// Instante (`timestamptz`, ou Date) sai no fuso do navegador, lido na primeira chamada.
// Só ISO 8601 com hora: o `Date` do JS leria "06/11/2026" como 11 de junho.
const INSTANTE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
let formatoDataLocal: Intl.DateTimeFormat | undefined;
let formatoDataHoraLocal: Intl.DateTimeFormat | undefined;

function paraDataDeCalendario(valor: string): Date | null {
  const [ano, mes, dia] = (DATA_DE_CALENDARIO.exec(valor) ?? []).slice(1).map(Number);
  if (ano === undefined || mes === undefined || dia === undefined) {
    return null;
  }
  // Date.UTC aceita 30/02 (vira 02/03): só vale se ano, mês e dia voltarem iguais
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const mesmoDia =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return mesmoDia ? data : null;
}

function paraInstante(valor: string | Date): Date | null {
  const data =
    typeof valor === 'string' ? (INSTANTE_ISO.test(valor) ? new Date(valor) : null) : valor;
  return data !== null && !Number.isNaN(data.getTime()) ? data : null;
}

/**
 * "06/11/2026". Data de calendário ("YYYY-MM-DD") sai como está; instante (ISO com hora ou
 * Date) sai como o dia no fuso de quem vê.
 */
export function formatarData(valor: ValorData): string {
  if (valor === null || valor === undefined) {
    return VALOR_AUSENTE;
  }
  if (typeof valor === 'string' && DATA_DE_CALENDARIO.test(valor)) {
    const data = paraDataDeCalendario(valor);
    return data === null ? VALOR_AUSENTE : FORMATO_DATA_DE_CALENDARIO.format(data);
  }
  const instante = paraInstante(valor);
  if (instante === null) {
    return VALOR_AUSENTE;
  }
  formatoDataLocal ??= new Intl.DateTimeFormat('pt-BR', OPCOES_DATA);
  return formatoDataLocal.format(instante);
}

/** "06/11 13:45", no fuso de quem vê. Recebe instante (ISO com hora ou Date); só a data dá "—". */
export function formatarDataHora(valor: ValorData): string {
  if (valor === null || valor === undefined) {
    return VALOR_AUSENTE;
  }
  const instante = paraInstante(valor);
  if (instante === null) {
    return VALOR_AUSENTE;
  }
  formatoDataHoraLocal ??= new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  // O pt-BR do Intl separa data e hora com ", "; o padrão do produto é só o espaço
  const partes = formatoDataHoraLocal.formatToParts(instante);
  const parte = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((p) => p.type === tipo)?.value ?? '';
  return `${parte('day')}/${parte('month')} ${parte('hour')}:${parte('minute')}`;
}
