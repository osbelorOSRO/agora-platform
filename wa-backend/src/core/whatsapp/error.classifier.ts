// src/core/whatsapp/error.classifier.ts

export enum ConnectionErrorType {
  RED_TEMPORAL = 'RED_TEMPORAL',
  SESION_INVALIDA = 'SESION_INVALIDA',
  CUENTA_BLOQUEADA = 'CUENTA_BLOQUEADA',
  ERROR_TECNICO = 'ERROR_TECNICO',
  DESCONOCIDO = 'DESCONOCIDO',
}

export interface ErrorInfo {
  tipo: ConnectionErrorType;
  codigo?: number;
}

export function classifyConnectionError(code?: number): ErrorInfo {
  if (!code) {
    return { tipo: ConnectionErrorType.DESCONOCIDO };
  }

  if ([428, 408, 500, 503].includes(code)) {
    return { tipo: ConnectionErrorType.RED_TEMPORAL, codigo: code };
  }

  if ([401, 440, 515].includes(code)) {
    return { tipo: ConnectionErrorType.SESION_INVALIDA, codigo: code };
  }

  if (code === 403) {
    return { tipo: ConnectionErrorType.CUENTA_BLOQUEADA, codigo: code };
  }

  if (code === 405) {
    return { tipo: ConnectionErrorType.ERROR_TECNICO, codigo: code };
  }

  return { tipo: ConnectionErrorType.DESCONOCIDO, codigo: code };
}
