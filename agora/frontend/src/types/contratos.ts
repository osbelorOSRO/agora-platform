// SimCard
export interface SimCard {
  iccid?: string;
  estado_sim?: string;
  // No va 'orden_movistar'
}

// Abonado
export interface Abonado {
  id_abonado?: string;
  numero?: string;
  cap?: string;
  compania_donante?: string;
  sim_cards?: SimCard[];
}

// Biometria
export interface Biometria {
  rut_cliente?: string;
  nombre_cliente?: string;
  codigo_BO?: string;
}

// Contrato
export interface Contrato {
  contrato_id?: string;
  creado_en?: string;
  actualizado_en?: string;
  // No va 'orden'
  fecha?: string;
  tipo?: string;
  plan?: string;         // Solo el nombre del plan
  cod_plan?: string;     // Solo el código del plan
  cantidad_lineas?: number;
  modo?: string;
  ciclo?: string;
  direccion?: string;
  email?: string;
  estado?: string;
  nombre_ejecutivo?: string;
  rut_ejecutivo?: string;
  biometria?: Biometria;
  abonados?: Abonado[];
}
