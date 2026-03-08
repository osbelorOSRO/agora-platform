import { Schema, model, Document } from 'mongoose';

export interface Conversacion {
  contenido: string;
  tipo: 'texto' | 'imagen' | 'audio' | 'documento' | 'video' | 'otro';
  direccion: 'input' | 'output';
  fecha_envio: Date;
  usuario: string;
  url_archivo?: string;
}

export interface SubProceso {
  tipo: string;
  estado: string;
  payload?: Record<string, any>;
  resultado?: Record<string, any>;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface Contrato {
  orden: string;
  fecha: Date;
  tipo?: string[];
  plan?: string[];
  cod_plan?: string[];
  ciclo?: string[];
  biometria?: {
    run?: string;
    fecha?: Date;
    codigo?: string;
  };
  abonado?: {
    id_abonado?: number;
    numero?: number;
    sim_cards?: {
      iccid: number;
      estado: string;
    }[];
  }[];
  estado?: string;
  usuario?: string;
  envio?: {
    ot_id?: string;
    remitente?: Record<string, any>;
    destinatario?: Record<string, any>;
    estado?: string;
    sub_estado_envio?: string;
    fecha_subestado?: Date;
    fecha_creacion?: Date;
    fecha_envio?: Date;
    fecha_recibido?: Date;
    nombre_transportista?: string;
  };
}

export interface Proceso extends Document {
  cliente_id: string;
  proceso_id: string;
  tipo: string;
  estado: string;
  creado_en: Date;
  creado_por: string;

  conversaciones?: Conversacion[];
  subprocesos?: SubProceso[];
  contratos?: Contrato[];

  delegacion?: {
    iniciado_por: string;
    delegado_a: string;
    fecha_inicio: Date;
    origen: 'bot' | 'panel' | 'n8n';
    motivo?: string;
    re_asignado?: boolean;
  };
}

const conversacionSchema = new Schema<Conversacion>(
  {
    contenido: { type: String, required: true },
  tipo: {
    type: String,
    enum: ['texto', 'imagen', 'audio', 'documento', 'video', 'otro'],
    required: true,
  },

    direccion: { type: String, enum: ['input', 'output'], required: true },
    fecha_envio: { type: Date, required: true },
    usuario: { type: String, required: true },
    url_archivo: { type: String },
  },
  { _id: false }
);

const subProcesoSchema = new Schema<SubProceso>(
  {
    tipo: { type: String, required: true },
    estado: {
      type: String,
      required: true,
      enum: ['pendiente', 'procesando', 'completado', 'entregado', 'error'],
    },
    payload: { type: Schema.Types.Mixed },
    resultado: {
      type: new Schema(
        {
          respuesta: {
            type: String,
            enum: ['factible', 'no_factible', 'error'],
            required: true,
          },
          mensaje: { type: String },
          payload: { type: Schema.Types.Mixed },
        },
        { _id: false }
      ),
    },
    fecha_inicio: { type: Date },
    fecha_fin: { type: Date },
  },
  { _id: false }
);

const contratoSchema = new Schema<Contrato>(
  {
    orden: { type: String, required: true },
    fecha: { type: Date, required: true },
    tipo: [{ type: String }],
    plan: [{ type: String }],
    cod_plan: [{ type: String }],
    ciclo: [{ type: String }],
    biometria: {
      run: String,
      fecha: Date,
      codigo: String,
    },
    abonado: [
      {
        id_abonado: Number,
        numero: Number,
        sim_cards: [
          {
            iccid: Number,
            estado: String,
          },
        ],
      },
    ],
    estado: String,
    usuario: String,
    envio: {
      ot_id: String,
      remitente: Schema.Types.Mixed,
      destinatario: Schema.Types.Mixed,
      estado: String,
      sub_estado_envio: String,
      fecha_subestado: Date,
      fecha_creacion: { type: Date },
      fecha_envio: Date,
      fecha_recibido: Date,
      nombre_transportista: String,
    },
  },
  { _id: false }
);
const delegacionSchema = new Schema(
  {
    iniciado_por: { type: String, required: true },
    delegado_a: { type: String, required: true },
    fecha_inicio: { type: Date, required: true },
    origen: {
      type: String,
      enum: ['bot', 'panel', 'n8n'],
      required: true,
    },
    motivo: { type: String },
    re_asignado: { type: Boolean, default: false },
  },
  { _id: false }
);
const procesoSchema = new Schema<Proceso>(
  {
    cliente_id: { type: String, required: true },
    proceso_id: { type: String, required: true, unique: true },
    tipo: { type: String, required: true },
    estado: { type: String, required: true },
    creado_en: { type: Date, required: true },
    creado_por: { type: String, required: true },

    conversaciones: [conversacionSchema],
    subprocesos: [subProcesoSchema],
    contratos: [contratoSchema],

    delegacion: { type: delegacionSchema, default: null },
  },
  { timestamps: true, collection: 'procesos' }
);

export const ProcesoModel = model<Proceso>('Proceso', procesoSchema);
