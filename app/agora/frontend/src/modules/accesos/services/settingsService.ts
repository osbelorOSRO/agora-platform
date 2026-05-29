import apiClient from "../../../lib/apiClient";
import type { TransitionRule, SignalScoringRule } from "../types/settings";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

import { env } from "@/lib/env";
const BASE = env.apiUrl;

export const obtenerTransitionRules = async (): Promise<TransitionRule[]> => {
  const res = await apiClient.get(`${BASE}/settings/transition-rules`, { headers: getAuthHeaders() });
  return res.data;
};

export const actualizarTransitionThreshold = async (id: string, score_threshold: number): Promise<TransitionRule> => {
  const res = await apiClient.patch(`${BASE}/settings/transition-rules/${id}`, { score_threshold }, { headers: getAuthHeaders() });
  return res.data;
};

export const obtenerSignalScoringRules = async (): Promise<SignalScoringRule[]> => {
  const res = await apiClient.get(`${BASE}/settings/signal-scoring-rules`, { headers: getAuthHeaders() });
  return res.data;
};

export const actualizarSignalDelta = async (id: string, delta: number): Promise<SignalScoringRule> => {
  const res = await apiClient.patch(`${BASE}/settings/signal-scoring-rules/${id}`, { delta }, { headers: getAuthHeaders() });
  return res.data;
};
