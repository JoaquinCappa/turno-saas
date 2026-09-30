import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { addMinutes } from 'date-fns';

/**
 * Convierte una fecha y hora local (ej: "2026-10-15" y "14:00") en un Date UTC exacto
 * respetando el timezone del negocio.
 */
export function createBusinessDate(localDate: string, localTime: string, timeZone: string): Date {
  const dateTimeString = `${localDate}T${localTime}:00`;
  // fromZonedTime toma un string local (sin offset) y un timezone,
  // y devuelve la instancia Date exacta en UTC.
  return fromZonedTime(dateTimeString, timeZone);
}

/**
 * Obtiene el día de la semana y el minuto del día (0-1440) de un Date UTC
 * interpretado en el timezone del negocio.
 */
export function getBusinessDayAndMinute(date: Date, timeZone: string) {
  // Format to get weekday in english and hour/minute
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  
  const parts = formatter.formatToParts(date);
  
  let weekday = '';
  let hour = 0;
  let minute = 0;
  
  for (const p of parts) {
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }
  
  const map: Record<string, string> = {
    'Mon': 'MONDAY', 'Tue': 'TUESDAY', 'Wed': 'WEDNESDAY',
    'Thu': 'THURSDAY', 'Fri': 'FRIDAY', 'Sat': 'SATURDAY', 'Sun': 'SUNDAY'
  };
  
  return {
    dayOfWeek: map[weekday] as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
    minuteOfDay: hour * 60 + minute
  };
}

/**
 * Calcula el endAt exacto sumando los minutos de duración
 */
export function calculateEndAt(startAt: Date, durationMinutes: number): Date {
  return addMinutes(startAt, durationMinutes);
}

/**
 * Para formateo en la UI, formatea un Date UTC en el timezone del negocio
 */
export function formatBusinessDate(date: Date, timeZone: string, fmt: string = 'dd/MM/yyyy HH:mm') {
  return format(toZonedTime(date, timeZone), fmt, { timeZone });
}

/**
 * Obtiene los límites de un día específico en el timezone del negocio.
 */
export function getBusinessDayBounds(localDate: string, timeZone: string) {
  const startAt = fromZonedTime(`${localDate}T00:00:00`, timeZone);
  const endAt = fromZonedTime(`${localDate}T23:59:59.999`, timeZone);
  return { startAt, endAt };
}

/**
 * Obtiene los límites de la semana (Lunes a Domingo) en base a un día local en el timezone del negocio.
 */
export function getBusinessWeekBounds(localDate: string, timeZone: string) {
  // Convertimos a objeto de fecha zoned (la medianoche de ese día)
  const zonedTarget = toZonedTime(fromZonedTime(`${localDate}T00:00:00`, timeZone), timeZone);
  
  // getDay(): 0 = Sunday, 1 = Monday, etc.
  const dayOfWeek = zonedTarget.getDay(); 
  // Convertimos a Lunes=0, Domingo=6
  const jsToIso = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(zonedTarget);
  monday.setDate(monday.getDate() - jsToIso);
  
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  
  // Format YYYY-MM-DD
  const formatIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const startAt = fromZonedTime(`${formatIso(monday)}T00:00:00`, timeZone);
  const endAt = fromZonedTime(`${formatIso(sunday)}T23:59:59.999`, timeZone);
  
  return { startAt, endAt };
}
