import apiClient from "../../../lib/apiClient";
import type { TransitionRule, SignalScoringRule } from "../types/settings";

const BASE = import.meta.env.VITE_API_URL as string;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export const obtenerTransitionRules = async (): Promise<TransitionRule[]> => {
  const res = await apiClient.get(`${BASE}/settings/transition-rules`, { headers: authHeaders() });
  return res.data;
};

export const actualizarTransitionThreshold = async (id: string, score_threshold: number): Promise<TransitionRule> => {
  const res = await apiClient.patch(`${BASE}/settings/transition-rules/${id}`, { score_threshold }, { headers: authHeaders() });
  return res.data;
};

export const obtenerSignalScoringRules = async (): Promise<SignalScoringRule[]> => {
  const res = await apiClient.get(`${BASE}/settings/signal-scoring-rules`, { headers: authHeaders() });
  return res.data;
};

export const actualizarSignalDelta = async (id: string, delta: number): Promise<SignalScoringRule> => {
  const res = await apiClient.patch(`${BASE}/settings/signal-scoring-rules/${id}`, { delta }, { headers: authHeaders() });
  return res.data;
};
