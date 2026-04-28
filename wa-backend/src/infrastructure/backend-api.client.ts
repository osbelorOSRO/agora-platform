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

    await axios.post(`${API_BACKEND_URL}/media/guardar`, form, {
      headers: form.getHeaders(),
    });

    return `${MEDIA_BASE_URL}/uploads/${filename}`;
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
