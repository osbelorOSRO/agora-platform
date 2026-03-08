import { Schema, model, Document } from 'mongoose';

export interface Cliente extends Document {
  cliente_id: string;
  nombre?: Record<string, string>;
  identificacion?: Record<string, string>;
  telefono?: Record<string, string>;
  direccion?: Record<string, string>;
  email?: Record<string, string>;
  foto_perfil?: string;
  contrato?: any[];
}

const clienteSchema = new Schema<Cliente>(
  {
    cliente_id: { type: String, required: true, unique: true },

    nombre: { type: Schema.Types.Mixed },
    identificacion: { type: Schema.Types.Mixed },
    telefono: { type: Schema.Types.Mixed },
    direccion: { type: Schema.Types.Mixed },
    email: { type: Schema.Types.Mixed },

    foto_perfil: {
      type: String,
      required: false,
      match: /^https?:\/\/.+/i,
    },

    contrato: [
      {
        contrato_id: { type: String, required: false },
        creado_por_id: { type: String, required: false },
        actualizado_por_id: { type: String, required: false },
        creado_en: { type: Date, required: false },
        actualizado_en: { type: Date, required: false },

        orden: { type: String, required: false },
        fecha: { type: String, required: false },

        tipo: { type: String, required: false },
        plan: { type: String, required: false },
        cod_plan: { type: String, required: false },
        cantidad_lineas: { type: Number, required: false },
        modo: { type: String, required: false },
        ciclo: { type: String, required: false },

        direccion: { type: String, required: false },
        email: { type: String, required: false },

        biometria: {
          rut_cliente: { type: String, required: false },
          nombre_cliente: { type: String, required: false },
          codigo_BO: { type: String, required: false },
        },

        abonados: [
          {
            id_abonado: { type: String, required: false },
            numero: { type: String, required: false },
            cap: { type: String, required: false },
            compania_donante: { type: String, required: false },

            sim_cards: [
              {
                iccid: { type: String, required: false },
                estado_sim: { type: String, required: false },
                orden_movistar: { type: String, required: false },
              },
            ],
          },
        ],

        estado: { type: String, required: false },
        nombre_ejecutivo: { type: String, required: false },
        rut_ejecutivo: { type: String, required: false },

        envio: {
          ot_id: { type: String, required: false },
          remitente: {
            usuario: { type: String, required: false },
            nombre: { type: String, required: false },
            apellido: { type: String, required: false },
            comuna: { type: String, required: false },
            sucursal: { type: String, required: false },
            email: { type: String, required: false },
            telefono: { type: String, required: false },
          },
          destinatario: {
            cliente_id: { type: String, required: false },
            nombre: { type: String, required: false },
            apellido: { type: String, required: false },
            comuna: { type: String, required: false },
            direccion: { type: String, required: false },
            sucursal: { type: String, required: false },
            email: { type: String, required: false },
            telefono: { type: String, required: false },
            orden: { type: String, required: false },
            abonado: { type: String, required: false },
          },
          estado: { type: String, required: false },
          sub_estado_envio: { type: String, required: false },
          fecha_subestado: { type: Date, required: false },
          fecha_creacion: { type: Date, default: Date.now },
          fecha_envio: { type: Date, required: false },
          fecha_recibido: { type: Date, required: false },
          nombre_transportista: { type: String, required: false },
        },
      },
    ],
  },
  { timestamps: true, collection: 'clientes' }
);

export const ClienteModel = model<Cliente>('Cliente', clienteSchema);
export { clienteSchema as ClienteSchema };
