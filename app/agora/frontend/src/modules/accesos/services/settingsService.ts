import axios from "axios";
import type { TransitionRule, SignalScoringRule } from "../types/settings";

const BASE = import.meta.env.VITE_API_URL as string;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export const obtenerTransitionRules = async (): Promise<TransitionRule[]> => {
  const { data } = await axios.get<TransitionRule[]>(`${BASE}/settings/transition-rules`, { headers: authHeaders() });
  return data;
};

export const actualizarTransitionThreshold = async (id: string, score_threshold: number): Promise<TransitionRule> => {
  const { data } = await axios.patch<TransitionRule>(`${BASE}/settings/transition-rules/${id}`, { score_threshold }, { headers: authHeaders() });
  return data;
};

export const obtenerSignalScoringRules = async (): Promise<SignalScoringRule[]> => {
  const { data } = await axios.get<SignalScoringRule[]>(`${BASE}/settings/signal-scoring-rules`, { headers: authHeaders() });
  return data;
};

export const actualizarSignalDelta = async (id: string, delta: number): Promise<SignalScoringRule> => {
  const { data } = await axios.patch<SignalScoringRule>(`${BASE}/settings/signal-scoring-rules/${id}`, { delta }, { headers: authHeaders() });
  return data;
};
