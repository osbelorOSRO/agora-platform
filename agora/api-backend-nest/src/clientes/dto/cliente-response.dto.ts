// src/clientes/dto/cliente-response.dto.ts

// DTO base de respuesta para cliente
export class ClienteResponseDto {
  cliente_id: string;
  tipo_id: string;
  nombre: string | null;
  estado_actual: number | null;
  etiqueta_actual: string | null; // 🔥 SIEMPRE incluido en respuestas
  intervenida: boolean;
  fecha_registro: Date | null;
  fecha_actual: Date | null;
  foto_perfil: string | null;
}

// DTO de respuesta con estado derivado
export class ClienteConEstadoResponseDto extends ClienteResponseDto {
  estado_derivado: 'ACTIVO' | 'CERRADO' | 'INACTIVO';
}

// 🔥 DTO de respuesta para actualizar etiqueta
export class ActualizarEtiquetaResponseDto {
  ok: boolean;
  estado_actual: number;
  etiqueta_actual: string;
}

// DTO de respuesta para crear cliente (con proceso)
export class CrearClienteConProcesoResponseDto {
  mensaje: string;
  cliente: ClienteResponseDto;
  proceso_id: number | null;
}
