import axios from 'axios';
import { env } from '../config/env';

const client = axios.create({
  baseURL: env.nestjsInternalUrl,
  headers: { 'x-internal-token': env.fcaInternalToken },
  timeout: 10000,
});

export async function fetchFcaConfig(): Promise<{
  app_state: string | null;
  enabled: string;
  fb_backend_url: string | null;
}> {
  const res = await client.get('/internal/fca/config');
  return res.data;
}

export async function postFcaStatus(data: {
  fb_user_id: string;
  fb_user_name: string;
  mqtt_connected: boolean;
  mqtt_event: 'connected' | 'disconnected' | 'cycling';
}): Promise<void> {
  await client.post('/internal/fca/status', data);
}

export async function postIncomingEvent(envelope: unknown): Promise<void> {
  await client.post('/internal/fca/events', envelope);
}
