// src/infrastructure/backend-api.client.ts

import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env.js';

const API_BACKEND_URL = env.apiBackendUrl;
const MEDIA_BASE_URL = env.mediaBaseUrl;

export class BackendApiClient {

  // ==========================
  // CLIENTES
  // ==========================

  async verificarCliente(cliente_id: string, tipo_id: string): Promise<boolean> {
    try {
      await axios.post(`${API_BACKEND_URL}/clientes/verificar`, {
        cliente_id,
        tipo_id,
      });
      return true;
    } catch {
      return false;
    }
  }

  async crearClienteBot(
    cliente_id: string,
    tipo_id: string,
    nombre: string,
    foto_perfil: string
  ): Promise<void> {
    await axios.post(`${API_BACKEND_URL}/clientes/bot/crear`, {
      cliente_id,
      tipo_id,
      nombre,
      foto_perfil,
    });
  }

  // ==========================
  // PROCESOS PG
  // ==========================

  async obtenerProcesoPorCliente(cliente_id: string): Promise<number | null> {
    try {
      const res = await axios.get(
        `${API_BACKEND_URL}/procesos-pg/cliente/${cliente_id}`
      );
      return res?.data?.id ?? null;
    } catch {
      return null;
    }
  }

  async crearProceso(cliente_id: string): Promise<number> {
    const bodyProceso = {
      cliente_id,
      iniciado_por_id: 20,
      tipo_proceso: 'consulta general',
    };

    const res = await axios.post(
      `${API_BACKEND_URL}/procesos-pg`,
      bodyProceso,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return res.data.id;
  }

  // ==========================
  // MONGO CONVERSACIÓN
  // ==========================

  async guardarConversacion(
    proceso_id: number,
    bodyConversacion: any
  ): Promise<void> {
    await axios.post(
      `${API_BACKEND_URL}/mongo/procesos/${proceso_id}/conversacion`,
      bodyConversacion
    );
  }

  // ==========================
  // MEDIA
  // ==========================

  async guardarMedia(
    buffer: Buffer,
    filename: string,
    cliente_id: string,
    tipo: string,
    tipo_id: string
  ): Promise<string> {

    const form = new FormData();
    form.append('archivo', buffer, filename);
    form.append('cliente_id', cliente_id);
    form.append('tipo', tipo);
    form.append('tipo_id', tipo_id);

    await axios.post(`${API_BACKEND_URL}/media/guardar`, form, {
      headers: form.getHeaders(),
    });

    return `${MEDIA_BASE_URL}/uploads/${filename}`;
  }

  // ==========================
  // MODO PILOTO
  // ==========================

  async obtenerEstadoModoPiloto(
    cliente_id: string,
    msg_mode: 'audio' | 'no_audio',
  ): Promise<{
    usar_piloto: boolean;
    saludar: boolean;
    session_mode: 'audio' | 'no_audio' | null;
  }> {
    const res = await axios.post(
      `${API_BACKEND_URL}/clientes/modo-piloto/estado`,
      { cliente_id, msg_mode }
    );

    return res.data;
  }
}
export const backendApiClient = new BackendApiClient();
