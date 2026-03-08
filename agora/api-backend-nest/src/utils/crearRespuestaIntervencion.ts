interface RespuestaIntervencion {
  success: boolean;
  cliente_id: string;
  proceso_id?: number;
  ya_intervenido: boolean;
  intervenida: boolean;
  origen?: 'bot' | 'panel' | 'n8n';
  motivo?: string;
  delegado_a?: number;
  iniciado_por?: number;
  registrar_cliente?: boolean;
  saludar?: boolean;
  tratar_como_nuevo?: boolean;
  usar_piloto?: boolean;
  mensaje: string;
}

export function crearRespuestaIntervencion(params: RespuestaIntervencion) {
  return {
    success: true,
    ...params,
  };
}
