// utils/time.utils.ts

// Diccionario base de países y sus UTC offsets
export const COUNTRY_TIMEZONES: Record<string, number> = {
  'Colombia': -5,
  'Peru': -5,
  'Ecuador': -5,
  'Panama': -5,
  'Mexico': -6, // Base: CDMX
  'Costa Rica': -6,
  'Guatemala': -6,
  'Honduras': -6,
  'El Salvador': -6,
  'Nicaragua': -6,
  'Chile': -4,
  'Bolivia': -4,
  'Venezuela': -4,
  'Paraguay': -4,
  'República Dominicana': -4,
  'Argentina': -3,
  'Uruguay': -3,
  'Brasil': -3, // Base: Brasilia
  'España': +1,
  'USA': -5 // Base: EST
};

export const getDayLimitsByOffset = (utcOffset: number) => {
  // now.getTime() SIEMPRE devuelve milisegundos en UTC absoluto, sin importar dónde estés
  const nowUtcEpoch = new Date().getTime();
  
  // 1. Proyectamos el tiempo UTC absoluto hacia la hora local del país destino
  const localTime = new Date(nowUtcEpoch + (utcOffset * 3600000));

  // 2. CORTE A LA MEDIANOCHE ESTRICTA (00:00:00 a 23:59:59)
  // CRÍTICO: Usamos setUTCHours para que Node.js no aplique la zona horaria del servidor
  const localStart = new Date(localTime);
  localStart.setUTCHours(0, 0, 0, 0);

  const localEnd = new Date(localTime);
  localEnd.setUTCHours(23, 59, 59, 999);

  // 3. Convertimos las fechas de nuevo a UTC universal para que Prisma filtre correctamente en la BD
  return { 
    startOfDay: new Date(localStart.getTime() - (utcOffset * 3600000)), 
    endOfDay: new Date(localEnd.getTime() - (utcOffset * 3600000)) 
  };
};