export type EstadoPosteo = 'pendiente' | 'publicado' | 'error' | 'cancelado';

export interface Posteo {
  id: number;
  fecha: string;          // "YYYY-MM-DD"
  caption: string | null;
  url_imagen: string | null;
  imagen_id: number | null;
  estado: EstadoPosteo;
  red_social: string;
  id_red_social: string | null;
  id_post: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePosteoDto {
  fecha: string;
  caption?: string;
  url_imagen?: string;
  imagen_id?: number;
  estado?: EstadoPosteo;
  red_social?: string;
  id_red_social?: string;
}

export interface UpdatePosteoDto {
  caption?: string;
  url_imagen?: string;
  imagen_id?: number;
  estado?: EstadoPosteo;
}

export interface ImagenGaleria {
  id: number;
  nombre: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export type VistaCalendario = 'mes' | 'semana' | 'dia';
