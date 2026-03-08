export class CreateMensajeDto {
  contenido: string;
  tipo: 'texto' | 'imagen' | 'audio' | 'documento' | 'video';
  usuario: string;
  tipoId: string; // <-- AGREGA ESTA LÍNEA
}
