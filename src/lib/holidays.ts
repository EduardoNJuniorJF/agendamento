import { addDays, isWeekend, isSameDay, parseISO } from "date-fns";

// Feriados Nacionais (fixos)
const nationalHolidays = [
  { month: 1, day: 1, name: "Confraternização Universal" },
  { month: 4, day: 21, name: "Tiradentes" },
  { month: 5, day: 1, name: "Dia do Trabalho" },
  { month: 9, day: 7, name: "Independência do Brasil" },
  { month: 10, day: 12, name: "Nossa Senhora Aparecida" },
  { month: 11, day: 2, name: "Finados" },
  { month: 11, day: 15, name: "Proclamação da República" },
  { month: 11, day: 20, name: "Consciência Negra" },
  { month: 12, day: 25, name: "Natal" },
];

// Feriados do Estado do Rio de Janeiro
const rjStateHolidays = [
  { month: 4, day: 23, name: "Dia de São Jorge" },
  { month: 11, day: 20, name: "Dia da Consciência Negra" },
];

// Feriados de Três Rios
const tresRiosHolidays = [
  { month: 1, day: 20, name: "Dia de São Sebastião" },
  { month: 7, day: 5, name: "Aniversário de Três Rios" },
];

// Feriados móveis (Carnaval, Páscoa, Corpus Christi) - precisam ser calculados por ano
// Para simplificar, vou adicionar os de 2025 e permitir expansão futura
const movableHolidays2025 = [
  { date: "2025-03-03", name: "Carnaval" },
  { date: "2025-03-04", name: "Carnaval" },
  { date: "2025-04-18", name: "Sexta-feira Santa" },
  { date: "2025-06-19", name: "Corpus Christi" },
];

const movableHolidays2026 = [
  { date: "2026-02-16", name: "Carnaval" },
  { date: "2026-02-17", name: "Carnaval" },
  { date: "2026-04-03", name: "Sexta-feira Santa" },
  { date: "2026-06-04", name: "Corpus Christi" },
];

export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Verifica feriados fixos nacionais
  if (nationalHolidays.some((h) => h.month === month && h.day === day)) {
    return true;
  }

  // Verifica feriados do RJ
  if (rjStateHolidays.some((h) => h.month === month && h.day === day)) {
    return true;
  }

  // Verifica feriados de Três Rios
  if (tresRiosHolidays.some((h) => h.month === month && h.day === day)) {
    return true;
  }

  // Verifica feriados móveis
  const dateStr = date.toISOString().split("T")[0];
  if (year === 2025 && movableHolidays2025.some((h) => h.date === dateStr)) {
    return true;
  }
  if (year === 2026 && movableHolidays2026.some((h) => h.date === dateStr)) {
    return true;
  }

  return false;
}

export function isWeekendOrHoliday(date: Date): boolean {
  // Verifica se é fim de semana (domingo)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 7) {
    return true;
  }

  // Verifica se é feriado
  return isHoliday(date);
}

export function isBeforeWeekendOrHoliday(date: Date): boolean {
  // Verifica se é sexta-feira (dia antes do fim de semana)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 5) {
    // Sexta-feira
    return true;
  }

  // Verifica se o dia seguinte é feriado
  const nextDay = addDays(date, 1);
  if (isHoliday(nextDay)) {
    return true;
  }

  return false;
}

export function isTwoDaysBeforeWeekendOrHoliday(date: Date): boolean {
  // Conforme legislação trabalhista, férias não podem começar nos 2 dias que antecedem
  // feriados ou dia de descanso semanal remunerado (DSR - sábado/domingo)

  // Exemplos práticos:
  // - Se data é QUINTA e SÁBADO é fim de semana → bloqueia (2 dias antes do DSR)
  // - Se data é QUINTA e SEXTA é feriado → bloqueia (1 dia antes do feriado)
  // - Se data é QUARTA e SEXTA é feriado → bloqueia (2 dias antes do feriado)
  // - Se data é QUARTA e QUINTA é feriado → bloqueia (1 dia antes do feriado)

  // Verifica se 1 dia depois (amanhã) é feriado ou fim de semana
  const nextDay = addDays(date, 1);
  if (isWeekendOrHoliday(nextDay)) {
    return true; // Está 1 dia antes de feriado/fim de semana
  }

  // Verifica se 2 dias depois é feriado ou fim de semana
  const twoDaysAfter = addDays(date, 2);
  if (isWeekendOrHoliday(twoDaysAfter)) {
    return true; // Está 2 dias antes de feriado/fim de semana
  }

  return false;
}

export function calculateReturnDate(startDate: string, vacationDays: number): string {
  // Calcula a data de volta usando dias corridos
  const start = parseISO(startDate);
  const returnDate = addDays(start, vacationDays);
  return returnDate.toISOString().split("T")[0];
}

export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Verifica feriados fixos nacionais
  const national = nationalHolidays.find((h) => h.month === month && h.day === day);
  if (national) return national.name;

  // Verifica feriados do RJ
  const rj = rjStateHolidays.find((h) => h.month === month && h.day === day);
  if (rj) return rj.name;

  // Verifica feriados de Três Rios
  const tr = tresRiosHolidays.find((h) => h.month === month && h.day === day);
  if (tr) return tr.name;

  // Verifica feriados móveis
  const dateStr = date.toISOString().split("T")[0];
  if (year === 2025) {
    const movable = movableHolidays2025.find((h) => h.date === dateStr);
    if (movable) return movable.name;
  }
  if (year === 2026) {
    const movable = movableHolidays2026.find((h) => h.date === dateStr);
    if (movable) return movable.name;
  }

  return null;
}
