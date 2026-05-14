// src/infrastructure/backend-api.client.ts

import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env.js';

const API_BACKEND_URL = env.apiBackendUrl;
const MEDIA_BASE_URL = env.mediaBaseUrl;

export class BackendApiClient {
  // ==========================
  // MEDIA
  // ==========================

  async guardarMedia(
    buffer: Buffer,
    filename: string,
    actorId: string,
    tipo: string,
    tipo_id: string
  ): Promise<string> {

    const form = new FormData();
    form.append('archivo', buffer, filename);
    form.append('actorId', actorId);
    form.append('tipo', tipo);
    form.append('tipo_id', tipo_id);

    const response = await axios.post(`${API_BACKEND_URL}/media/guardar`, form, {
      headers: {
        ...form.getHeaders(),
        'x-internal-token': env.baileysInternalToken,
      },
      timeout: env.proxyTimeoutMs,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
    });

    // url es la URL completa retornada por MinIO; ruta es legacy disco local
    if (response.data?.url) return response.data.url as string;
    const savedPath = response.data?.ruta || `/uploads/${filename}`;
    return `${MEDIA_BASE_URL}${savedPath}`;
  }

  async enviarEventoBaileys(envelope: any): Promise<void> {
    await axios.post(`${API_BACKEND_URL}/internal/baileys/events`, envelope, {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': env.baileysInternalToken,
      },
      timeout: env.proxyTimeoutMs,
    });
  }
}
export const backendApiClient = new BackendApiClient();
