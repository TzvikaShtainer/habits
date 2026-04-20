export function getSundayDate(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function formatDDMMYYYY(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

export function formatDDMM(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}.${month}`;
}

export function getWeekLabel(weekId: string): string {
  const sat = new Date(weekId + 'T12:00:00');
  sat.setDate(sat.getDate() + 6);
  const satId = sat.toISOString().split('T')[0];
  return `${formatDDMMYYYY(weekId)} - ${formatDDMMYYYY(satId)}`;
}

export function getWeekDayDates(weekId: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(weekId + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  });
}

export function nextSundayFrom(weekId: string): string {
  const d = new Date(weekId + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export function prevSundayFrom(weekId: string): string {
  const d = new Date(weekId + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
