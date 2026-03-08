export function formatChatListTime(timestamp: string | Date): string {
  const messageDate = new Date(timestamp);
  const now = new Date();

  // Normalizar a medianoche para comparar días
  const messageDayStart = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = todayStart.getTime() - messageDayStart.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Hoy: solo hora
  if (diffDays === 0) {
    return messageDate.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Santiago'
    });
  }

  // Ayer
  if (diffDays === 1) {
    return 'Ayer';
  }

  // Esta semana (últimos 7 días)
  if (diffDays < 7) {
    return messageDate.toLocaleDateString('es-CL', {
      weekday: 'long',
      timeZone: 'America/Santiago'
    });
  }

  // Más antiguo: fecha corta
  return messageDate.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Santiago'
  });
}

/**
 * Formatea un timestamp para mostrar dentro de un mensaje individual
 * Siempre retorna hora en formato 24h sin segundos (18:30)
 */
export function formatMessageTime(timestamp: string | Date): string {
  const messageDate = new Date(timestamp);
  return messageDate.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago'
  });
}

/**
 * Genera el texto del separador de día
 * - Hoy
 * - Ayer
 * - Lunes 3 de febrero
 * - 28 de enero de 2025
 */
export function getDaySeparatorLabel(timestamp: string | Date): string {
  const messageDate = new Date(timestamp);
  const now = new Date();

  const messageDayStart = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = todayStart.getTime() - messageDayStart.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays === 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return 'Ayer';
  }

  if (diffDays < 7) {
    // "Lunes 3 de febrero"
    return messageDate.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Santiago'
    });
  }

  // "28 de enero de 2025"
  return messageDate.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  });
}

/**
 * Agrupa mensajes por día
 * Retorna un array de { separator, mensajes }
 */
export function agruparMensajesPorDia<T extends { fecha_envio: string }>(
  mensajes: T[]
): Array<{ separator: string; mensajes: T[] }> {
  if (mensajes.length === 0) return [];

  const grupos: Array<{ separator: string; mensajes: T[] }> = [];
  let currentDay = '';
  let currentGroup: T[] = [];

  mensajes.forEach((msg) => {
    const msgDate = new Date(msg.fecha_envio);
    const dayKey = msgDate.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Santiago'
    });

    if (dayKey !== currentDay) {
      if (currentGroup.length > 0) {
        grupos.push({
          separator: getDaySeparatorLabel(currentGroup[0].fecha_envio),
          mensajes: currentGroup
        });
      }
      currentDay = dayKey;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  });

  // Agregar último grupo
  if (currentGroup.length > 0) {
    grupos.push({
      separator: getDaySeparatorLabel(currentGroup[0].fecha_envio),
      mensajes: currentGroup
    });
  }

  return grupos;
}
