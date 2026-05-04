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
  const now = new Date();
  
  // 1. Encontramos la hora local exacta del país de la ruta
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (utcOffset * 3600000));

  const localStart = new Date(localTime);
  const localEnd = new Date(localTime);

  // TRUE = El cierre se hace al mediodía (12:00 PM)
  const corteAlMediodia = true; 

  if (corteAlMediodia) {
    if (localTime.getHours() < 12) {
      // Si es de mañana, el "día de cobro" empezó ayer al mediodía
      localStart.setDate(localStart.getDate() - 1);
      localStart.setHours(12, 0, 0, 0);
      localEnd.setHours(11, 59, 59, 999);
    } else {
      // Si es de tarde, el "día de cobro" empezó hoy al mediodía
      localStart.setHours(12, 0, 0, 0);
      localEnd.setDate(localEnd.getDate() + 1);
      localEnd.setHours(11, 59, 59, 999);
    }
  } else {
    // Corte tradicional a medianoche
    localStart.setHours(0, 0, 0, 0);
    localEnd.setHours(23, 59, 59, 999);
  }

  // 2. Convertimos las fechas de nuevo a UTC universal para que Prisma filtre correctamente en la BD
  return { 
    startOfDay: new Date(localStart.getTime() - (utcOffset * 3600000)), 
    endOfDay: new Date(localEnd.getTime() - (utcOffset * 3600000)) 
  };
};