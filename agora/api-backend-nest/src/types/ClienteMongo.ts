// Interfaz de Cliente en Mongo
export interface ClienteMongo {
  cliente_id: string;

  nombre?: Record<string, string>; // { scraping: "...", manual: "..." }
  identificacion?: Record<string, string>; // { rut: "...", origen: "scraping" }
  telefono?: Record<string, string>; // { whatsapp: "...", contacto: "..." }
  direccion?: Record<string, string>; // { rutificador: "...", manual: "..." }
  email?: Record<string, string>;
  foto_perfil?: string;
  contrato?: Contrato[];
}

// Contrato completo
export interface Contrato {
  orden: string;
  fecha: string; // usarás Date en backend, string en frontend (por JSON)
  tipo: string[];
  plan: string[];
  cod_plan: string[];
  ciclo: string[];
  biometria?: {
    run?: string;
    fecha?: string;
    codigo?: string;
  };
  abonado: Abonado[];
  estado?: string;
  usuario?: string;
  envio?: Envio;
}

export interface Abonado {
  id_abonado: number;
  numero: number;
  sim_cards: SimCard[];
}

export interface SimCard {
  iccid: number;
  estado: string;
}

export interface Envio {
  ot_id?: string;
  remitente: PersonaEnvio;
  destinatario: PersonaEnvio;
  estado?: string;
  sub_estado_envio?: string;
  fecha_subestado?: string;
  fecha_creacion?: string;
  fecha_envio?: string;
  fecha_recibido?: string;
  nombre_transportista?: string;
}

export interface PersonaEnvio {
  cliente_id?: string;
  nombre?: string;
  apellido?: string;
  comuna?: string;
  sucursal?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  usuario?: string;
  orden?: string;
  abonado?: string;
}
export interface ClienteCampoClave {
  cliente_id: string;
  campo: keyof ClienteMongo;
  valor: any;
}
