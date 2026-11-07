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
    formatador = new Intl.NumberFormat('pt-BR', opcoes);
    formatadoresNumericos.set(chave, formatador);
  }
  const texto = formatador.format(valor);
  // Valor que arredonda para zero sairia "-0,00". `signDisplay: 'negative'` resolveria, mas o
  // Firefox < 116 (dentro do alvo do build) o recusa com RangeError.
  return /[1-9]/.test(texto) ? texto : formatador.format(0);
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

/*
 * Compactos: rótulo de eixo de gráfico, onde o valor exato fica na dica e na tabela; nunca para
 * mostrar um valor isolado. Na unidade da escala (mil, mi, bi) sai inteiro, com uma casa só
 * abaixo de 10: 45.678 → "46 mil", 123.456 → "123 mil", 1.234 → "1,2 mil".
 */

/** "R$ 40 mil", "R$ 1,5 mi". */
export function formatarMoedaCompacta(valor: ValorNumerico): string {
  return formatarNumerico(valor, 'moeda-compacta', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  });
}

/** "40 mil", "1,5 mi". */
export function formatarNumeroCompacto(valor: ValorNumerico): string {
  return formatarNumerico(valor, 'numero-compacto', { notation: 'compact' });
}

type ValorData = string | Date | null | undefined;

const OPCOES_DATA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};
const OPCOES_DATA_HORA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

// `date` do Postgres ("2026-11-06") é um dia de calendário, não um instante: montado e formatado
// em UTC, não muda com o fuso de quem vê. `new Date("2026-11-06")` seria meia-noite UTC — em
// UTC−3, o dia anterior.
const DATA_DE_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_DATA_DE_CALENDARIO = new Intl.DateTimeFormat('pt-BR', {
  ...OPCOES_DATA,
  timeZone: 'UTC',
});

// Instante: ISO 8601 do JSON do Supabase ou texto do Postgres (espaço no lugar do T, offset
// "+00"), normalizado para ISO — o Safari recusa o texto cru. Outros formatos são recusados:
// o `Date` do JS leria "06/11/2026" como 11 de junho.
const INSTANTE = /^(\d{4})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}/;

// Fuso do navegador. Criar um Intl.DateTimeFormat custa ~15× usar um pronto: os locais são
// refeitos só quando o deslocamento do fuso muda (viagem com a aba aberta).
let formatadoresLocais:
  { deslocamento: number; data: Intl.DateTimeFormat; dataHora: Intl.DateTimeFormat } | undefined;

function locais(): { data: Intl.DateTimeFormat; dataHora: Intl.DateTimeFormat } {
  const deslocamento = new Date().getTimezoneOffset();
  if (formatadoresLocais?.deslocamento !== deslocamento) {
    formatadoresLocais = {
      deslocamento,
      data: new Intl.DateTimeFormat('pt-BR', OPCOES_DATA),
      dataHora: new Intl.DateTimeFormat('pt-BR', OPCOES_DATA_HORA),
    };
  }
  return formatadoresLocais;
}

// Dia real do calendário, ou null: Date.UTC aceitaria 30/02 (vira 02/03)
function diaDoCalendario(partes: RegExpExecArray): Date | null {
  const [ano, mes, dia] = partes.slice(1, 4).map(Number);
  if (ano === undefined || mes === undefined || dia === undefined) {
    return null;
  }
  const data = new Date(0);
  data.setUTCFullYear(ano, mes - 1, dia); // sem o "ano 26 → 1926" do Date.UTC
  const mesmoDia =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return mesmoDia ? data : null;
}

function paraInstante(valor: ValorData): Date | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  let data: Date;
  if (typeof valor === 'string') {
    const partes = INSTANTE.exec(valor);
    if (partes === null || diaDoCalendario(partes) === null) {
      return null;
    }
    data = new Date(valor.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  } else {
    data = valor;
  }
  return Number.isNaN(data.getTime()) ? null : data;
}

// Montado pelas partes do Intl: o pt-BR dele separa data e hora com ", " e escreve o ano 26 como
// "26"; o padrão do produto é "dd/mm/aaaa" e "dd/mm HH:mm"
function partesDe(
  formatador: Intl.DateTimeFormat,
  data: Date,
): (tipo: Intl.DateTimeFormatPartTypes) => string {
  const partes = formatador.formatToParts(data);
  return (tipo) => partes.find((p) => p.type === tipo)?.value ?? '';
}

function diaMesAno(formatador: Intl.DateTimeFormat, data: Date): string {
  const parte = partesDe(formatador, data);
  return `${parte('day')}/${parte('month')}/${parte('year').padStart(4, '0')}`;
}

/**
 * "06/11/2026". Data de calendário ("YYYY-MM-DD") sai como está; instante (ISO com hora ou
 * Date) sai como o dia no fuso de quem vê.
 */
export function formatarData(valor: ValorData): string {
  const calendario = typeof valor === 'string' ? DATA_DE_CALENDARIO.exec(valor) : null;
  if (calendario !== null) {
    const dia = diaDoCalendario(calendario);
    return dia === null ? VALOR_AUSENTE : diaMesAno(FORMATO_DATA_DE_CALENDARIO, dia);
  }
  const instante = paraInstante(valor);
  return instante === null ? VALOR_AUSENTE : diaMesAno(locais().data, instante);
}

/** "06/11 13:45", no fuso de quem vê. Recebe instante (ISO com hora ou Date); só a data dá "—". */
export function formatarDataHora(valor: ValorData): string {
  const instante = paraInstante(valor);
  if (instante === null) {
    return VALOR_AUSENTE;
  }
  const parte = partesDe(locais().dataHora, instante);
  return `${parte('day')}/${parte('month')} ${parte('hour')}:${parte('minute')}`;
}
