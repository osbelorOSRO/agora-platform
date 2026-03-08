export interface Conversacion {
  contenido: string;
  tipo: 'texto' | 'imagen' | 'audio' | 'documento' | 'video' | 'otro';
  direccion: 'input' | 'output';
  fecha_envio: Date;
  usuario: string;
  url_archivo?: string;
}
